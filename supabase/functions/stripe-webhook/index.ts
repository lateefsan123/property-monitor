import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `${name} is not configured`);
  return value;
}

function createAdminClient() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function unixToIso(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string) {
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const pieces = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = pieces.find(([key]) => key === "t")?.[1];
  const signatures = pieces.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || !signatures.length) return false;

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signedPayload = `${timestamp}.${payload}`;
  const digest = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signedPayload));
  const digestHex = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((signature) => timingSafeEqual(signature, digestHex));
}

async function stripeGet(path: string) {
  const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed with ${response.status}`;
    throw new HttpError(502, message);
  }

  return payload;
}

async function resolveUserId(adminClient: any, subscription: any) {
  const metadataUserId = subscription.metadata?.supabase_user_id;
  if (metadataUserId) return metadataUserId;

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) throw new HttpError(409, "Stripe subscription is missing a customer");

  const { data, error } = await adminClient
    .from("stripe_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data?.user_id) throw new HttpError(404, "Could not map Stripe customer to a Supabase user");
  return data.user_id;
}

async function persistStripeCustomer(adminClient: any, userId: string, subscription: any) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) return;

  const { error } = await adminClient.from("stripe_customers").upsert(
    {
      user_id: userId,
      customer_id: customerId,
      email: typeof subscription.customer_email === "string" ? subscription.customer_email : null,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new HttpError(500, error.message);
}

async function persistSubscription(adminClient: any, userId: string, subscription: any) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  const price = subscription.items?.data?.[0]?.price;

  if (!customerId) throw new HttpError(409, "Stripe subscription is missing a customer");

  const { error } = await adminClient.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price?.id ?? null,
      stripe_product_id: typeof price?.product === "string" ? price.product : price?.product?.id ?? null,
      status: subscription.status,
      current_period_start: unixToIso(subscription.current_period_start),
      current_period_end: unixToIso(subscription.current_period_end),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at: unixToIso(subscription.canceled_at),
      raw: subscription,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new HttpError(500, error.message);
}

async function handleSubscriptionEvent(adminClient: any, subscription: any) {
  const userId = await resolveUserId(adminClient, subscription);
  await persistStripeCustomer(adminClient, userId, subscription);
  await persistSubscription(adminClient, userId, subscription);

  return {
    status: subscription.status,
    isActive: ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
    userId,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const signatureHeader = req.headers.get("stripe-signature");
    if (!signatureHeader) {
      throw new HttpError(400, "Missing Stripe signature");
    }

    const payload = await req.text();
    const validSignature = await verifyStripeSignature(payload, signatureHeader);
    if (!validSignature) {
      throw new HttpError(400, "Invalid Stripe signature");
    }

    const event = JSON.parse(payload);
    const adminClient = createAdminClient();

    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object;
      if (checkoutSession.mode !== "subscription" || !checkoutSession.subscription) {
        return jsonResponse({ received: true, ignored: true });
      }

      const subscription = await stripeGet(`/v1/subscriptions/${checkoutSession.subscription}`);
      const result = await handleSubscriptionEvent(adminClient, subscription);
      return jsonResponse({ received: true, result });
    }

    if (
      event.type === "customer.subscription.created"
      || event.type === "customer.subscription.updated"
      || event.type === "customer.subscription.deleted"
    ) {
      const result = await handleSubscriptionEvent(adminClient, event.data.object);
      return jsonResponse({ received: true, result });
    }

    return jsonResponse({ received: true, ignored: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});
