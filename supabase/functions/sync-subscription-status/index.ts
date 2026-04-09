import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `${name} is not configured`);
  return value;
}

function createSupabaseClients(authHeader: string | null) {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { userClient, adminClient };
}

async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) throw new HttpError(401, "Missing Authorization header");

  const { userClient, adminClient } = createSupabaseClients(authHeader);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid auth token");

  return { adminClient, user: data.user };
}

async function stripeGet(path: string, searchParams?: URLSearchParams) {
  const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
  const query = searchParams?.toString();
  const response = await fetch(`https://api.stripe.com${path}${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed with ${response.status}`;
    throw new HttpError(502, message);
  }

  return payload;
}

function unixToIso(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

async function upsertSubscription(adminClient: any, userId: string, subscription: any) {
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

  return {
    status: subscription.status,
    current_period_end: unixToIso(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    isActive: ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { adminClient, user } = await getAuthenticatedUser(req.headers.get("Authorization"));
    const { checkoutSessionId } = await req.json();

    if (!checkoutSessionId || typeof checkoutSessionId !== "string") {
      throw new HttpError(400, "checkoutSessionId is required");
    }

    const searchParams = new URLSearchParams();
    searchParams.append("expand[]", "subscription");
    const checkoutSession = await stripeGet(`/v1/checkout/sessions/${checkoutSessionId}`, searchParams);

    const ownerUserId = checkoutSession.client_reference_id || checkoutSession.metadata?.supabase_user_id;
    if (ownerUserId !== user.id) {
      throw new HttpError(403, "This checkout session does not belong to the current user");
    }

    if (!checkoutSession.subscription) {
      throw new HttpError(409, "Stripe has not attached a subscription to this checkout session yet");
    }

    const subscription = typeof checkoutSession.subscription === "string"
      ? await stripeGet(`/v1/subscriptions/${checkoutSession.subscription}`)
      : checkoutSession.subscription;

    const result = await upsertSubscription(adminClient, user.id, subscription);
    return jsonResponse({ subscription: result });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});
