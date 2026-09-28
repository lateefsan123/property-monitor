export function createProfilePhotoLookup({ timeoutMs = 4500, now = Date.now } = {}) {
  const sockets = new WeakMap();
  return async function lookup(socket, phone) {
    if (!socket || !/^\d{7,15}$/.test(phone)) return null;
    let cache = sockets.get(socket);
    if (!cache) { cache = new Map(); sockets.set(socket, cache); }
    const existing = cache.get(phone);
    if (existing && existing.expires > now()) return existing.promise;
    if (cache.size >= 256) cache.delete(cache.keys().next().value);
    let timer;
    const entry = { expires: now() + timeoutMs, promise: null };
    entry.promise = Promise.race([
      Promise.resolve().then(() => socket.profilePictureUrl(`${phone}@s.whatsapp.net`, 'image', timeoutMs)),
      new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]).then(value => {
      if (typeof value !== 'string') return null;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
      } catch { return null; }
    }).catch(() => null).then(url => {
      entry.expires = now() + (url ? 5 * 60_000 : 60_000);
      return url;
    }).finally(() => clearTimeout(timer));
    cache.set(phone, entry);
    return entry.promise;
  };
}

export function registerProfilePhotoRoute(app, { requireToken, sessions, restoreSession }) {
  const lookup = createProfilePhotoLookup();
  app.post('/sessions/:sessionId/profile-photo', requireToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!/^\d{7,15}$/.test(phone)) return res.status(400).json({ error: 'Invalid phone' });
    // Restore only an existing registered linked device after a process restart.
    let session = sessions.get(req.params.sessionId);
    if (!session && restoreSession) {
      try { session = await restoreSession(req.params.sessionId); } catch { return res.json({ url: null }); }
    }
    const deadline = Date.now() + 4000;
    while (session && ['starting', 'connecting', 'reconnecting'].includes(session.status) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (session?.status !== 'connected' || !session.socket) return res.json({ url: null });
    return res.json({ url: await lookup(session.socket, phone) });
  });
}
