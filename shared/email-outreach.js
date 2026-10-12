export const OUTREACH_SENDER = 'lateef@getrepeatai.com';
export const OUTREACH_TEMPLATES = [
  { subject: 'Seller follow-ups at {agency}', body: "Hi {first_name},\n\nI'm Lateef from Repeat AI. We help brokers follow up with sellers on WhatsApp using personalised messages and recent sales in their building.\n\nWould this be useful for your team at {agency}? There's a short demo at https://repeatai.org. I'm happy to help you get set up.\n\nLateef\nRepeat AI" },
  { subject: 'Seller follow-ups at {agency}', body: "Hi {first_name},\n\nFollowing up on Repeat AI. It helps keep seller conversations moving when there are recent sales in their building.\n\nWould you like a quick walkthrough for {agency}?\n\nLateef\nRepeat AI" },
  { subject: 'Seller follow-ups at {agency}', body: "Hi {first_name},\n\nOne last note about Repeat AI. If seller follow-ups are something you'd like help with, you can see it at https://repeatai.org.\n\nI'll leave it here if the timing isn't right.\n\nLateef\nRepeat AI" },
];

export function emailAddress(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email)) throw new Error('Invalid email address');
  return email;
}

export function renderOutreach(template, contact) {
  const values = { name: contact.name, first_name: contact.first_name || contact.name.split(' ')[0], agency: contact.agency };
  const render = value => String(value || '').replace(/\{([^}]+)\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown template field: ${key}`);
    return values[key];
  }).trim();
  const subject = render(template.subject), body = render(template.body);
  if (!subject || subject.length > 300 || [...subject].some(c=>c.charCodeAt(0)<32) || !body || body.length > 6000) throw new Error('Invalid email template');
  return { subject, body };
}

export function prepareEmailContacts(rows, existing = [], exclusions = []) {
  const seen = new Set(existing.map(c => c.email));
  const blocked = new Set(exclusions.map(v => emailAddress(v)));
  const contacts = [], errors = [];
  rows.forEach((row, index) => {
    try {
      const email = emailAddress(row.email || row.Email);
      if (seen.has(email)) return;
      const name = String(row.name || row.Name || '').trim();
      const agency = String(row.agency || row.Agency || '').trim();
      if (!name || name.length > 120 || !agency || agency.length > 200) throw new Error('Name and agency required');
      seen.add(email);
      contacts.push({ email, name, agency, first_name: String(row.first_name || name.split(' ')[0]).trim(),
        phone: String(row.phone || row.Phone || '').replace(/\D/g, ''), source: String(row.source || row.Source || '').slice(0,500),
        status: blocked.has(email) ? 'excluded' : 'pending', step: 0, nextAt: 0 });
    } catch (error) { errors.push({ row: index + 2, error: error.message }); }
  });
  return { contacts, errors };
}

export function outreachWindow(now) {
  const date = new Date(now + 4 * 3600000); // Asia/Dubai has no DST.
  return { day: date.toISOString().slice(0,10), open: date.getUTCDay() >= 1 && date.getUTCDay() <= 5 && date.getUTCHours() >= 9 && date.getUTCHours() < 17 };
}

export function outreachDailyLimit(startedAt, now) {
  const days = Math.max(0, Math.floor((now - startedAt) / 86400000));
  return days < 7 ? 5 : days < 14 ? 10 : days < 21 ? 20 : 30;
}

export function nextOutreachContact(state, now) {
  if (state.status !== 'active') return { reason: 'paused' };
  if (state.contacts.some(c => c.status === 'sending' || c.status === 'held')) return { reason: 'manual_review' };
  const window = outreachWindow(now);
  if (!window.open) return { reason: 'outside_dubai_hours' };
  if (state.lastAttemptAt && now - state.lastAttemptAt < 30 * 60000) return { reason: 'spacing' };
  const attempts = (state.attempts || []).filter(a => outreachWindow(a.at).day === window.day);
  if (attempts.length >= outreachDailyLimit(state.rampStartedAt, now)) return { reason: 'daily_limit' };
  const contact = state.contacts.filter(c => ['pending','sent'].includes(c.status) && c.step < 3 && c.nextAt <= now)
    .sort((a,b) => a.nextAt - b.nextAt)[0];
  return contact ? { contact } : { reason: 'no_due_contacts' };
}

export function outreachSummary(state) {
  if (!state) return { campaign: null };
  const counts = {};
  for (const c of state.contacts) counts[c.status] = (counts[c.status] || 0) + 1;
  return { campaign: { status: state.status, sender: state.sender, counts, total: state.contacts.length,
    templates: state.templates, lastAttemptAt: state.lastAttemptAt, rampStartedAt: state.rampStartedAt,
    contacts: state.contacts.slice(0,30).map(({ email, name, agency, status, step }) => ({ email, name, agency, status, step })),
    issue: state.issue || null } };
}
