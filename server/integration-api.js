import { INTEGRATION_PROVIDERS } from './integration-oauth.js';
import { IntegrationError } from './integration-http.js';

export function createIntegrationHandler({ authenticate, store, oauth, configured, read }) {
  return async (req, res) => {
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'Method not allowed' }); }
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1];
    if (!token) return send(401, { error: 'Sign in to manage connections' });
    let user;
    try { user = await authenticate(token); } catch { return send(401, { error: 'Please sign in again' }); }
    if (!user?.id) return send(401, { error: 'Please sign in again' });
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || Array.isArray(body) || JSON.stringify(body).length > 12000) throw new Error();
    } catch { return send(400, { error: 'Invalid request' }); }
    const { action, provider, feature } = body;
    const fields = { status: ['action'], begin: ['action', 'provider', 'feature'],
      complete: ['action', 'provider', 'state', 'code', 'error'], disconnect: ['action', 'provider', 'feature'], read: ['action', 'provider', 'feature', 'input'] };
    if (!Object.hasOwn(fields, action) || Object.keys(body).some(key => !fields[action].includes(key))) return send(400, { error: 'Invalid request' });
    if (action !== 'status' && (!Object.hasOwn(INTEGRATION_PROVIDERS, provider)
      || (action !== 'complete' && !Object.hasOwn(INTEGRATION_PROVIDERS[provider].scopes, feature)))) return send(400, { error: 'Unknown integration' });
    try {
      if (action === 'status') {
        const rows = await store.list(user.id);
        return send(200, { connections: Object.entries(INTEGRATION_PROVIDERS).flatMap(([provider, spec]) =>
          Object.keys(spec.scopes).map(feature => ({ provider, feature, configured: configured(provider),
            connected: rows.some(row => row.provider === provider && row.feature === feature) }))) });
      }
      if (action === 'disconnect') {
        await store.disconnect({ userId: user.id, provider, feature });
        return send(200, { status: 'disconnected' });
      }
      if (!configured(provider)) return send(503, { error: 'This connection is not set up yet' });
      if (action === 'read') return send(200, await read({ userId: user.id, provider, feature, input: body.input }));
      const result = action === 'begin'
        ? await oauth.begin({ userId: user.id, provider, feature })
        : await oauth.complete({ userId: user.id, provider, state: body.state, code: body.code, error: body.error });
      return send(200, result);
    } catch (error) {
      // Never serialize provider responses, secrets, DB errors or authorization codes.
      if (error instanceof IntegrationError) return send(error.status, { error: error.message, code: error.code });
      return send(503, { error: action === 'complete' ? 'Could not finish connecting. Please reconnect from Settings.' : 'Connections are unavailable. Please try again later.' });
    }
  };
}
