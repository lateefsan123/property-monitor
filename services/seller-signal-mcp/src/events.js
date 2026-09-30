import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { callbackUrl, validateSecret, verifyCallback, postSigned } from "./event-webhook.js";

export const EVENT_NAME = "seller.reply_received";
export const EVENT_DEFINITION = {
  name: EVENT_NAME,
  description: "A new inbound WhatsApp reply linked to one of your Repeat AI sellers. Use it to request reply summaries or suggested follow-ups. Outbound messages never trigger this event.",
  delivery: ["webhook"],
  inputSchema: { type: "object", properties: { leadId: { type: "string", pattern: "^[1-9][0-9]*$", description: "Optional seller ID; omit to monitor all your sellers." } }, additionalProperties: false },
  payloadSchema: { type: "object", properties: { leadId: { type: "string" }, messageId: { type: "string" }, sellerName: { type: "string" }, building: { type: "string" }, text: { type: "string" }, truncated: { type: "boolean" } }, required: ["leadId", "messageId", "sellerName", "building", "text", "truncated"], additionalProperties: false },
};
const argumentsSchema = z.object({ leadId: z.string().regex(/^[1-9][0-9]*$/).optional() }).strict();
const subscriptionSchema = z.object({
  name: z.literal(EVENT_NAME), arguments: argumentsSchema.default({}),
  delivery: z.object({ mode: z.literal("webhook"), url: z.string().max(4096), secret: z.string().optional() }).strict(),
  cursor: z.null().optional(), ttlMs: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
}).strict();

export function subscriptionIdentity(userId, clientId, url, args) {
  return `sub_${createHash("sha256").update(JSON.stringify([userId, clientId, EVENT_NAME, url, args.leadId || null])).digest("hex")}`;
}

export function credentialCipher(encodedKey) {
  const key = Buffer.from(encodedKey || "", "base64");
  if (key.length !== 32) throw new Error("MCP_EVENTS_ENCRYPTION_KEY must encode 32 bytes");
  return {
    seal(value, id) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(id));
      const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
    },
    open(value, id) {
      const data = Buffer.from(value, "base64");
      const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
      decipher.setAAD(Buffer.from(id));
      decipher.setAuthTag(data.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
    },
  };
}

export function createEvents({ store, cipher, getLead, checkAccess, post, now = Date.now }) {
  const verified = new Map();
  async function subscribe(auth, params) {
    const input = subscriptionSchema.parse(params);
    const userId = auth?.extra?.userId;
    if (!userId || !auth.clientId || !auth.token) throw new Error("OAuth account required");
    const url = callbackUrl(input.delivery.url).href;
    const secret = validateSecret(input.delivery.secret);
    if (input.arguments.leadId) await getLead(auth, input.arguments.leadId);
    const expires = Math.min(now() + (input.ttlMs ?? 3600000), (auth.expiresAt || 0) * 1000 - 30000);
    if (expires - now() < 30000) throw new Error("Refresh the OAuth connection before subscribing");
    if (!(await checkAccess(auth))) throw new Error("Event access revoked");
    const id = subscriptionIdentity(userId, auth.clientId, url, input.arguments);
    const previous = await store.get(id);
    if (!previous && await store.count(userId) >= 50) throw new Error("Event subscription limit reached");
    const cacheKey = `${userId}:${auth.clientId}:${url}`;
    if ((verified.get(cacheKey) || 0) <= now()) {
      try { await verifyCallback({ id, url, secret }, post); }
      catch {
        const error = new Error("Could not verify callback endpoint");
        error.code = -32015;
        error.data = { reason: "challenge_failed" };
        throw error;
      }
      if (verified.size >= 1000) verified.clear();
      verified.set(cacheKey, now() + 300000);
    }
    const credentials = { auth, url, secret };
    if (previous) {
      const old = cipher.open(previous.credentials, id);
      if (old.secret !== secret) { credentials.previousSecret = old.secret; credentials.rotateUntil = now() + 60000; }
      else if (old.rotateUntil > now()) { credentials.previousSecret = old.previousSecret; credentials.rotateUntil = old.rotateUntil; }
    }
    await store.save({ id, user_id: userId, client_id: auth.clientId, lead_id: input.arguments.leadId || null, credentials: cipher.seal(credentials, id), expires_at: new Date(expires).toISOString() });
    return { id, refreshBefore: new Date(expires).toISOString(), cursor: null, truncated: false };
  }

  async function unsubscribe(auth, params) {
    const input = subscriptionSchema.parse(params);
    if (!auth?.extra?.userId || !auth.clientId) throw new Error("OAuth account required");
    const id = subscriptionIdentity(auth.extra.userId, auth.clientId, callbackUrl(input.delivery.url).href, input.arguments);
    await store.remove(id);
    return {};
  }

  async function deliver(job) {
    const subscription = await store.get(job.subscription_id);
    if (!subscription || Date.parse(subscription.expires_at) <= now()) { await store.finish(job.id, "stopped"); return; }
    const credentials = cipher.open(subscription.credentials, subscription.id);
    if (!(await checkAccess(credentials.auth))) { await store.remove(subscription.id); return; }
    const data = await store.message(job.message_id, subscription.user_id, subscription.lead_id);
    if (!data) { await store.finish(job.id, "stopped"); return; }
    const lead = await getLead(credentials.auth, String(data.lead_id));
    const body = data.body || "";
    const event = {
      eventId: `evt_${job.id}`, name: EVENT_NAME, timestamp: data.created_at, cursor: null,
      data: { leadId: String(data.lead_id), messageId: data.id, sellerName: lead.name || "", building: lead.building || "", text: body.slice(0, 8000), truncated: body.length > 8000 },
    };
    // Re-read before starting outbound I/O so unsubscribe/refresh takes effect.
    const current = await store.get(subscription.id);
    if (!current || current.credentials !== subscription.credentials || Date.parse(current.expires_at) <= now()) return;
    const response = await postSigned({ id: subscription.id, ...credentials }, event, post, now());
    if (response.status >= 200 && response.status < 300) await store.finish(job.id, "delivered");
    else if (response.status === 410) await store.remove(subscription.id);
    else if (response.status === 413 || (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status))) await store.finish(job.id, "failed");
    else throw new Error("Transient callback failure");
  }

  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      await store.cleanup();
      for (const job of await store.claim()) {
        try { await deliver(job); }
        catch { await store.retry(job.id, job.attempts, now()); }
      }
    } finally { running = false; }
  }
  return { subscribe, unsubscribe, tick };
}
