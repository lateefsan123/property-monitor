import { randomBytes } from 'node:crypto';

// Pending actions are deliberately ephemeral: restarts invalidate them safely.
export function createApprovalStore({ origin, now = Date.now, ttl = 600000 } = {}) {
  const pending = new Map();
  function clean() {
    for (const [id, item] of pending) if (item.expires <= now()) pending.delete(id);
  }
  function get(id, userId) {
    clean();
    const item = pending.get(id);
    if (!item || item.request.userId !== userId) throw new Error('Approval expired or unavailable for this account.');
    return item;
  }
  return {
    create(request, execute) {
      clean();
      if (pending.size >= 1000 || [...pending.values()].filter(x => x.request.userId === request.userId).length >= 10) {
        throw new Error('Too many pending approvals. Finish or wait for existing requests to expire.');
      }
      const id = randomBytes(32).toString('hex');
      pending.set(id, { request: structuredClone(request), execute, expires: now() + ttl, status: 'pending' });
      return { status: 'confirmation_required', approvalUrl: `${origin}/approve/${id}`, message: 'Open this link, sign in to Repeat AI, review the exact action, and approve or decline. Nothing has changed yet. The link expires in 10 minutes. After approval, read back the result. Do not request another action while this approval is pending.' };
    },
    inspect(id, userId) {
      const item = get(id, userId);
      return { action: item.request.action, summary: item.request.summary, input: item.request.input, status: item.status };
    },
    async decide(id, userId, approve) {
      const item = get(id, userId);
      if (item.status !== 'pending') throw new Error('This approval has already been used. Do not retry the action.');
      item.status = approve === true ? 'executing' : 'declined';
      if (approve !== true) return { status: 'declined' };
      try {
        await item.execute();
        item.status = 'completed';
        return { status: 'completed' };
      } catch {
        item.status = 'failed';
        throw new Error('The action could not be confirmed as completed. Check the record or message history before trying again.');
      } finally { item.execute = undefined; }
    },
  };
}

export function approvalPage({ url, publishableKey, nonce }) {
  const config = JSON.stringify({ url, publishableKey }).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review action · Repeat AI</title>
<style>body{font:16px system-ui;background:#f7f7f5;color:#171717;margin:0}main{max-width:640px;margin:8vh auto;padding:32px;background:white;border:1px solid #ddd;border-radius:16px}h1{font-size:26px}label{display:block;margin:16px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;font:inherit;border:1px solid #aaa;border-radius:6px}button{font:inherit;padding:12px 18px;margin:16px 8px 0 0;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f6f6;padding:16px;border-radius:8px}#status{white-space:pre-wrap}button:disabled{opacity:.5}</style></head>
<body><main><p>Repeat AI</p><h1>Review this action</h1><p>Sign in to the same account connected to your assistant. Nothing changes until you approve the details below.</p>
<form id="login"><label for="email">Email</label><input id="email" type="email" autocomplete="username" required><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required><button id="signin">Sign in</button></form>
<section id="review" hidden><p id="summary"></p><pre id="details"></pre><button id="approve">Approve action</button><button id="decline">Decline</button></section><p id="status" role="status"></p></main>
<script nonce="${nonce}">const config=${config};let token='';const el=id=>document.getElementById(id);const status=message=>el('status').textContent=message;
async function request(path,body){const response=await fetch(location.pathname+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed');return data;}
el('login').addEventListener('submit',async event=>{event.preventDefault();el('signin').disabled=true;status('Signing in…');try{const response=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey},body:JSON.stringify({email:el('email').value,password:el('password').value})});const data=await response.json();el('password').value='';if(!response.ok||!data.access_token)throw Error('Sign-in failed. Check your email and password.');token=data.access_token;const action=await request('/details',{});el('summary').textContent=action.summary||action.action;el('details').textContent=JSON.stringify(action.input,null,2);el('login').hidden=true;el('review').hidden=false;status(action.status==='pending'?'Review the exact details before approving.':'This action is '+action.status+'.');el('approve').disabled=el('decline').disabled=action.status!=='pending';}catch(error){status(error.message);}finally{el('signin').disabled=false;}});
for(const [id,approve] of [['approve',true],['decline',false]])el(id).addEventListener('click',async()=>{el('approve').disabled=el('decline').disabled=true;try{const result=await request('/decision',{approve});status(result.status==='completed'?'Action completed. Return to your assistant and ask it to read back the result.':'Declined. Nothing was changed.');}catch(error){status(error.message);}});</script></body></html>`;
}

export function mountApprovalRoutes(app, { store, origin, config, verifyUser }) {
  app.get('/approve/:id', (_req, res) => {
    const nonce = randomBytes(24).toString('base64');
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self' ${new URL(config.url).origin}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` });
    res.type('html').send(approvalPage({ ...config, nonce }));
  });
  async function authenticate(req) {
    if (req.get('origin') !== origin || !req.is('application/json')) throw new Error('Open the approval page to continue.');
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    if (!token) throw new Error('Sign in to review this action.');
    // Tool OAuth credentials must never double as independent user approval.
    let claims;
    try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { throw new Error('Invalid sign-in session.'); }
    if (claims.client_id || claims.role !== 'authenticated') throw new Error('Sign in directly to approve this action.');
    const user = await verifyUser(token);
    if (!user?.id) throw new Error('Invalid sign-in session.');
    return user.id;
  }
  for (const operation of ['details', 'decision']) {
    app.post(`/approve/:id/${operation}`, async (req, res) => {
      res.set('Cache-Control', 'no-store');
      try {
        const userId = await authenticate(req);
        if (operation === 'decision' && typeof req.body?.approve !== 'boolean') throw new Error('Choose approve or decline.');
        const result = operation === 'details' ? store.inspect(req.params.id, userId) : await store.decide(req.params.id, userId, req.body.approve);
        res.json(result);
      } catch (error) { res.status(400).json({ error: error.message }); }
    });
  }
}
