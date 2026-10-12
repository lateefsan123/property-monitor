import { randomUUID } from 'node:crypto';
import { OUTREACH_SENDER, OUTREACH_TEMPLATES, prepareEmailContacts, renderOutreach, nextOutreachContact, outreachSummary } from '../shared/email-outreach.js';

export function createOutreachService({ store, gmail, now = Date.now }) {
  async function mutate(userId, change) {
    for (let i=0;i<4;i++) {
      const row = await store.read(userId);
      const next = await change(row?.state ? structuredClone(row.state) : null);
      if (await store.save(userId,row?.revision ?? -1,next)) return next;
    }
    throw new Error('Campaign changed; refresh and try again');
  }
  const settle = (userId,email,claimId,change) => mutate(userId,state => {
    const c = state?.contacts.find(c => c.email === email && c.claimId === claimId);
    if (!c) throw new Error('Campaign reservation changed');
    change(c,state); delete c.claimId;
    return state;
  });
  return {
    async status(userId) { return outreachSummary((await store.read(userId))?.state); },
    async import(userId, rows) {
      if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw new Error('Import 1 to 500 contacts per batch');
      let errors;
      const state = await mutate(userId,state => {
        state ||= {sender:OUTREACH_SENDER,status:'paused',templates:OUTREACH_TEMPLATES,contacts:[],attempts:[]};
        if (state.status === 'active' || state.contacts.some(c=>['sending','held'].includes(c.status))) throw new Error('Pause and resolve pending sends before importing');
        const prepared = prepareEmailContacts(rows,state.contacts);
        errors = prepared.errors;
        state.contacts.push(...prepared.contacts);
        if (state.contacts.length > 15000) throw new Error('Campaign contact limit reached');
        return state;
      });
      return {...outreachSummary(state),errors};
    },
    async templates(userId, templates) {
      if (!Array.isArray(templates) || templates.length !== 3) throw new Error('Use exactly three emails');
      for (const t of templates) renderOutreach(t,{name:'Example Broker',first_name:'Example',agency:'Example Agency'});
      return outreachSummary(await mutate(userId,state => {
        if (!state || state.attempts.length || state.status !== 'paused') throw new Error('Templates can only change before the first send');
        state.templates = templates.map(t=>({subject:t.subject,body:t.body})); return state;
      }));
    },
    async configure(userId, active) {
      if (typeof active !== 'boolean') throw new Error('Choose start or pause');
      if (active) await gmail.verify(userId,OUTREACH_SENDER);
      return outreachSummary(await mutate(userId,state => {
        if (!state) throw new Error('Import contacts first');
        if (active && (!state.contacts.length || state.contacts.some(c=>['held','sending'].includes(c.status)))) throw new Error('Resolve unconfirmed sends before starting');
        state.status = active ? 'active' : 'paused';
        if (active) { state.rampStartedAt ||= now(); state.issue = null; }
        return state;
      }));
    },
    async exclude(userId, emails) {
      if (!Array.isArray(emails) || emails.length > 500) throw new Error('Invalid exclusions');
      return outreachSummary(await mutate(userId,state => {
        if (!state || state.status !== 'paused') throw new Error('Pause before excluding contacts');
        for (const c of state.contacts) if (emails.includes(c.email) && c.status !== 'sending') c.status = 'excluded';
        return state;
      }));
    },
    async run(userId) {
      const row = await store.read(userId);
      if (!row) return {reason:'no_campaign'};
      if (row.state.contacts.some(c=>c.status==='sending' && now()-(c.claimedAt || 0)>10*60000)) {
        await mutate(userId,s=>{
          for(const c of s.contacts) if(c.status==='sending' && now()-(c.claimedAt || 0)>10*60000) {c.status='held';delete c.claimId;}
          s.status='paused';s.issue='A worker stopped before its outcome was saved. Review Gmail Sent; this contact will not be retried.';return s;
        });
        return {reason:'manual_review'};
      }
      const pick = nextOutreachContact(row.state,now());
      if (!pick.contact) return {reason:pick.reason};
      const state = structuredClone(row.state), c = state.contacts.find(c=>c.email === pick.contact.email);
      const claimId = randomUUID(); c.status = 'sending'; c.claimId = claimId; c.claimedAt=now();
      if (!await store.save(userId,row.revision,state)) return {reason:'claimed_elsewhere'};
      try {
        const check = await gmail.inspect(userId,c,state.sender);
        if (check.status) {
          await settle(userId,c.email,claimId,(contact,s) => {
            contact.status = check.status;
            if (check.status === 'bounced') { s.status='paused'; s.issue='A bounce was detected. Review the contact list before continuing.'; }
          });
          return {reason:check.status};
        }
        // Persist the exact attempt BEFORE send. Pause checked after preflight.
        let attempted = false;
        await mutate(userId,s => {
          attempted = false;
          const contact = s.contacts.find(x=>x.email === c.email && x.claimId === claimId);
          if (!contact) throw new Error('Reservation changed');
          if (s.status !== 'active') { contact.status = contact.step ? 'sent' : 'pending'; delete contact.claimId; return s; }
          attempted = true; contact.attemptedAt=now(); s.lastAttemptAt=now();
          s.attempts.push({email:c.email,step:c.step,at:now(),claimId});
          return s;
        });
        if (!attempted) return {reason:'paused'};
        const sent = await gmail.send(userId,state.sender,c,renderOutreach(state.templates[c.step],c));
        await settle(userId,c.email,claimId,contact => {
          contact.step++; contact.status=contact.step===3 ? 'done' : 'sent';
          contact.nextAt=now()+(contact.step===1 ? 3 : 7)*86400000;
          contact.threadId=sent.threadId; contact.internetId=sent.internetId; contact.messageId=sent.messageId;
        });
        return {status:'accepted',email:c.email}; // Provider acceptance, not delivery.
      } catch {
        await settle(userId,c.email,claimId,(contact,s) => {contact.status='held';s.status='paused';s.issue='Sending or mailbox checks could not be confirmed. Check Gmail Sent and connection before resolving; no automatic retry.';});
        return {reason:'manual_review'};
      }
    },
  };
}
