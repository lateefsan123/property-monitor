import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { credentialCipher, createEvents, EVENT_NAME, subscriptionIdentity } from "../src/events.js";
import { callbackUrl, isPublicAddress, validateSecret, verifyCallback, webhookPost } from "../src/event-webhook.js";

const secret = `whsec_${randomBytes(32).toString("base64")}`;
function setup() {
  const rows = new Map();
  const responses = [];
  const finished = [];
  const retries = [];
  const jobs = [];
  let access = true;
  let time = Date.now();
  let status = 200;
  const auth = { token: "test", expiresAt: Math.floor(time / 1000) + 3600, clientId: "client-a", extra: { userId: "a" } };
  const params = { name: EVENT_NAME, arguments: { leadId: "42" }, delivery: { mode: "webhook", url: "https://example.com/callback", secret }, cursor: null };
  const cipher = credentialCipher(randomBytes(32).toString("base64"));
  const store = {
    get: async id => rows.get(id), count: async user => [...rows.values()].filter(row => row.user_id === user).length,
    save: async row => rows.set(row.id, row), remove: async id => rows.delete(id),
    finish: async (...args) => finished.push(args), retry: async (...args) => retries.push(args), cleanup: async () => {}, claim: async () => jobs.splice(0),
    message: async (_id, user, lead) => user === "a" && lead === "42" ? { id: "message-1", lead_id: 42, body: "Can we speak tomorrow?", created_at: new Date(time).toISOString() } : null,
  };
  const options = { store, cipher, now: () => time, checkAccess: async () => access,
    getLead: async (a, id) => { if (a.extra.userId !== "a" || id !== "42") throw new Error("Not found"); return { id, name: "Alex Demo", building: "Review Tower" }; },
    post: async (url, body, headers) => {
      const parsed = JSON.parse(body);
      new Webhook(secret).verify(body, headers);
      responses.push({ url, parsed, headers });
      return { status, body: JSON.stringify({ challenge: parsed.challenge }) };
    },
  };
  return { auth, params, rows, responses, finished, retries, jobs, options, api: createEvents(options), advance: ms => { time += ms; }, access: value => { access = value; }, status: value => { status = value; } };
}

test("callback SSRF filtering rejects private, mapped, reserved, credential and redirect targets", async () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  for (const url of ["http://example.com", "https://user:pass@example.com", "https://example.com:8443", "https://example.com/#fragment"]) assert.throws(() => callbackUrl(url));
  let requested = false;
  await assert.rejects(webhookPost("https://example.com", "{}", {}, { resolve: async () => [{ address: "127.0.0.1", family: 4 }], request: () => { requested = true; } }), /not public/);
  assert.equal(requested, false);
  await assert.rejects(verifyCallback({ id: "x", url: "https://example.com", secret }, async () => ({ status: 302, body: "{}" })), /challenge/);
});

test("secret validation and encryption fail closed on tampering or a different subscription", () => {
  for (const value of [null, "whsec_!bad", `whsec_${Buffer.alloc(8).toString("base64")}`, `whsec_${Buffer.alloc(65).toString("base64")}`]) assert.throws(() => validateSecret(value));
  assert.equal(validateSecret(secret), secret);
  const cipher = credentialCipher(randomBytes(32).toString("base64"));
  const sealed = cipher.seal({ secret }, "id");
  assert.equal(cipher.open(sealed, "id").secret, secret);
  assert.throws(() => cipher.open(sealed, "other"));
  const bytes = Buffer.from(sealed, "base64"); bytes[30] ^= 1;
  assert.throws(() => cipher.open(bytes.toString("base64"), "id"));
});

test("subscribe verifies callback, persists encrypted credentials, refreshes idempotently and isolates clients", async () => {
  const s = setup();
  const first = await s.api.subscribe(s.auth, s.params);
  assert.equal(s.responses[0].parsed.type, "verification");
  assert.equal(s.rows.size, 1);
  assert.equal(s.rows.get(first.id).credentials.includes(secret), false);
  assert.ok(Date.parse(first.refreshBefore) < s.auth.expiresAt * 1000);
  assert.equal((await s.api.subscribe(s.auth, s.params)).id, first.id);
  assert.equal(s.responses.length, 1);
  assert.notEqual(subscriptionIdentity("a", "client-b", s.params.delivery.url, { leadId: "42" }), first.id);
  const restarted = createEvents(s.options);
  assert.equal((await restarted.subscribe(s.auth, s.params)).id, first.id);
  assert.equal(s.rows.size, 1);
  await assert.rejects(s.api.subscribe(s.auth, { ...s.params, arguments: { leadId: "43" } }));
  await assert.rejects(s.api.subscribe(s.auth, { ...s.params, arguments: { userId: "b" } }));
  await assert.rejects(s.api.subscribe(s.auth, { ...s.params, cursor: "replay" }));
});

test("TTL requests are bounded and expired OAuth tokens cannot start monitoring", async () => {
  const s = setup();
  const short = await s.api.subscribe(s.auth, { ...s.params, ttlMs: 60000 });
  assert.ok(Date.parse(short.refreshBefore) - Date.now() <= 60000);
  const finite = await s.api.subscribe(s.auth, { ...s.params, ttlMs: null });
  assert.ok(finite.refreshBefore);
  s.advance(3600000);
  await assert.rejects(s.api.subscribe(s.auth, s.params), /Refresh/);
});

test("matching reply is signed; retry preserves event identity; unsubscribe and revoked access stop delivery", async () => {
  const s = setup();
  const sub = await s.api.subscribe(s.auth, s.params);
  const job = { id: "job-1", subscription_id: sub.id, message_id: "message-1", attempts: 1 };
  s.status(503); s.jobs.push(job); await s.api.tick();
  assert.equal(s.retries.length, 1);
  s.status(200); s.jobs.push({ ...job, attempts: 2 }); await s.api.tick();
  assert.equal(s.responses[1].parsed.eventId, s.responses[2].parsed.eventId);
  assert.equal(s.responses[2].parsed.data.text, "Can we speak tomorrow?");
  assert.equal(s.finished[0][1], "delivered");
  await s.api.unsubscribe({ ...s.auth, extra: { userId: "b" } }, s.params);
  assert.equal(s.rows.size, 1);
  await s.api.unsubscribe(s.auth, s.params);
  await s.api.unsubscribe(s.auth, s.params);
  const count = s.responses.length;
  s.jobs.push(job); await s.api.tick(); assert.equal(s.responses.length, count);
  await s.api.subscribe(s.auth, s.params);
  s.access(false); s.jobs.push(job); await s.api.tick();
  assert.equal(s.rows.size, 0);
  assert.equal(s.responses.length, count);
});

test("410 disables the subscription and 413 is not retried", async () => {
  for (const status of [410, 413]) {
    const s = setup(); const sub = await s.api.subscribe(s.auth, s.params);
    s.status(status); s.jobs.push({ id: "j", subscription_id: sub.id, message_id: "m", attempts: 1 }); await s.api.tick();
    assert.equal(s.retries.length, 0);
    if (status === 410) assert.equal(s.rows.size, 0);
    else assert.equal(s.finished[0][1], "failed");
  }
});

test("invalid verification and missing ownership never activate subscriptions", async () => {
  const s = setup();
  const api = createEvents({ ...s.options, post: async () => ({ status: 200, body: '{"challenge":"wrong"}' }) });
  await assert.rejects(api.subscribe(s.auth, s.params), error => error.code === -32015);
  assert.equal(s.rows.size, 0);
  s.access(false);
  await assert.rejects(s.api.subscribe(s.auth, s.params), /revoked/);
  assert.equal(s.responses.length, 0);
});
