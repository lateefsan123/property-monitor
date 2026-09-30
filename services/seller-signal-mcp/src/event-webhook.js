import https from "node:https";
import { lookup } from "node:dns/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import ipaddr from "ipaddr.js";
import { Webhook } from "standardwebhooks";

export function callbackUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) throw new Error("Callback must use HTTPS on port 443");
  return url;
}

export function isPublicAddress(address) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch { return false; }
}

// Resolve once per connection and pin the socket to that public address. The
// original hostname is retained for Host, SNI and certificate verification.
export async function webhookPost(destination, body, headers, { resolve = lookup, request = https.request } = {}) {
  const url = callbackUrl(destination);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolve(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error("Callback address is not public");
  const target = addresses[0];
  return new Promise((resolveResponse, reject) => {
    const req = request(url, {
      method: "POST", agent: false,
      lookup: (_host, options, callback) => options.all ? callback(null, [target]) : callback(null, target.address, target.family),
      headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      signal: AbortSignal.timeout(10000),
    }, res => {
      let size = 0;
      const chunks = [];
      res.on("data", chunk => {
        size += chunk.length;
        if (size > 16384) res.destroy(new Error("Callback response too large"));
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolveResponse({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

export function validateSecret(secret) {
  if (typeof secret !== "string" || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) throw new Error("Invalid webhook secret");
  const decoded = Buffer.from(secret.slice(6), "base64");
  if (decoded.length < 24 || decoded.length > 64 || decoded.toString("base64").replace(/=+$/, "") !== secret.slice(6).replace(/=+$/, "")) throw new Error("Invalid webhook secret");
  return secret;
}

export async function postSigned(subscription, payload, post = webhookPost, now = Date.now()) {
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body) > 262144) throw new Error("Event exceeds 256 KiB");
  const id = payload.eventId || `verify_${randomBytes(20).toString("hex")}`;
  const signedAt = new Date(now);
  const secrets = [subscription.secret];
  if (subscription.previousSecret && subscription.rotateUntil > now) secrets.push(subscription.previousSecret);
  return post(subscription.url, body, {
    "Content-Type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(now / 1000)),
    "webhook-signature": secrets.map(secret => new Webhook(secret).sign(id, signedAt, body)).join(" "),
    "X-MCP-Subscription-Id": subscription.id,
  });
}

export async function verifyCallback(subscription, post = webhookPost) {
  const challenge = randomBytes(32).toString("hex");
  const response = await postSigned(subscription, { type: "verification", challenge }, post);
  let received;
  try { received = JSON.parse(response.body).challenge; } catch { /* Invalid response fails closed. */ }
  if (response.status < 200 || response.status >= 300 || typeof received !== "string" || Buffer.byteLength(received) !== Buffer.byteLength(challenge) || !timingSafeEqual(Buffer.from(received), Buffer.from(challenge))) throw new Error("Callback challenge failed");
}
