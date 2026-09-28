import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfilePhotoLookup, registerProfilePhotoRoute } from '../services/whatsapp-baileys/src/profile-photo.js';

test('deduplicates, caches, and isolates photos by linked socket', async () => {
  let calls = 0;
  let time = 0;
  const lookup = createProfilePhotoLookup({ now: () => time });
  const socket = { profilePictureUrl: async jid => { calls++; assert.equal(jid, '971500000001@s.whatsapp.net'); return 'https://example.com/a.jpg'; } };
  assert.deepEqual(await Promise.all([lookup(socket, '971500000001'), lookup(socket, '971500000001')]), ['https://example.com/a.jpg', 'https://example.com/a.jpg']);
  assert.equal(calls, 1);
  assert.equal(await lookup({ profilePictureUrl: async () => null }, '971500000001'), null);
  time = 300_001;
  await lookup(socket, '971500000001');
  assert.equal(calls, 2);
});
test('missing, private, invalid, and timed-out photos return initials fallback', async () => {
  const lookup = createProfilePhotoLookup({ timeoutMs: 10 });
  for (const result of [null, 'http://example.com/a.jpg', 'not a url']) {
    assert.equal(await lookup({ profilePictureUrl: async () => result }, '971500000001'), null);
  }
  assert.equal(await lookup({ profilePictureUrl: async () => { throw new Error('403'); } }, '971500000001'), null);
  assert.equal(await lookup({ profilePictureUrl: () => new Promise(() => {}) }, '971500000001'), null);
  assert.equal(await lookup({ profilePictureUrl: () => { throw new Error('must not run'); } }, 'bad'), null);
});
test('private route requires middleware and does not connect missing sessions', async () => {
  let route;
  const requireToken = () => {};
  registerProfilePhotoRoute({ post: (...args) => { route = args; } }, { requireToken, sessions: new Map() });
  assert.equal(route[1], requireToken);
  let body;
  const res = { set() {}, json(value) { body = value; } };
  await route[2]({ params: { sessionId: 'absent' }, body: { phone: '971500000001' } }, res);
  assert.deepEqual(body, { url: null });
});

test('restores an existing linked session before looking up a photo', async () => {
  let route; let restored;
  registerProfilePhotoRoute({ post: (...args) => { route = args; } }, { requireToken: () => {}, sessions: new Map(), restoreSession: async id => { restored=id; return {status:'connected',socket:{profilePictureUrl:async()=> 'https://example.com/photo.jpg'}}; } });
  let body; const res={set(){},json(value){body=value;}};
  await route[2]({params:{sessionId:'saved'},body:{phone:'971500000001'}},res);
  assert.equal(restored,'saved'); assert.equal(body.url,'https://example.com/photo.jpg');
});
