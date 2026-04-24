import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function assertRedirectUrl(value: string | undefined, fallbackEnvName: string) {
  const candidate = value?.trim() || Deno.env.get(fallbackEnvName)?.trim();
  if (!candidate) throw new HttpError(400, `${fallbackEnvName} is required`);

  const parsed = new URL(candidate);
  if (!["http:", "https:", "seller-signal:"].includes(parsed.protocol)) {
    throw new HttpError(400, "Unsupported redirect URL protocol");
  }

  return parsed.toString();
}

async function stripeRequest(path: string, body: URLSearchParams) {
  const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed with ${response.status}`;
    throw new HttpError(502, message);
  }

  return payload;
}

async function userHasPriorSubscription(adminClient: any, userId: string) {
  const { data, error } = await adminClient
    .from("billing_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  return Boolean(data);
}

function resolveTrialPeriodDays(input: unknown) {
  if (typeof input !== "number" || !Number.isInteger(input)) return null;
  if (input <= 0 || input > 30) return null;
  return input;
}

async function ensureStripeCustomer(adminClient: any, user: any) {
  const { data: existing, error } = await adminClient
    .from("stripe_customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (existing?.customer_id) return existing.customer_id;

  const body = new URLSearchParams();
  if (user.email) body.set("email", user.email);

  const username = typeof user.user_metadata?.username === "string"
    ? user.user_metadata.username.trim()
    : "";
  if (username) body.set("name", username);

  body.set("metadata[supabase_user_id]", user.id);

  const customer = await stripeRequest("/v1/customers", body);

  const { error: upsertError } = await adminClient.from("stripe_customers").upsert(
    {
      user_id: user.id,
      customer_id: customer.id,
      email: user.email ?? null,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) throw new HttpError(500, upsertError.message);

  return customer.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { adminClient, user } = await getAuthenticatedUser(req.headers.get("Authorization"));
    const { successUrl, cancelUrl, trialPeriodDays } = await req.json().catch(() => ({}));
    const stripePriceId = requireEnv("STRIPE_MONTHLY_PRICE_ID");

    const checkoutSuccessUrl = assertRedirectUrl(successUrl, "STRIPE_SUCCESS_URL");
    const checkoutCancelUrl = assertRedirectUrl(cancelUrl, "STRIPE_CANCEL_URL");
    const stripeCustomerId = await ensureStripeCustomer(adminClient, user);

    const requestedTrialDays = resolveTrialPeriodDays(trialPeriodDays);
    const eligibleForTrial = requestedTrialDays !== null
      && !(await userHasPriorSubscription(adminClient, user.id));

    const body = new URLSearchParams();
    body.set("mode", "subscription");
    body.set("success_url", checkoutSuccessUrl);
    body.set("cancel_url", checkoutCancelUrl);
    body.set("customer", stripeCustomerId);
    body.set("client_reference_id", user.id);
    body.set("allow_promotion_codes", "true");
    body.set("billing_address_collection", "auto");
    body.set("line_items[0][price]", stripePriceId);
    body.set("line_items[0][quantity]", "1");
    body.set("metadata[supabase_user_id]", user.id);
    body.set("subscription_data[metadata][supabase_user_id]", user.id);
    if (eligibleForTrial) {
      body.set("subscription_data[trial_period_days]", String(requestedTrialDays));
    }

    const checkoutSession = await stripeRequest("/v1/checkout/sessions", body);

    return jsonResponse({
      checkoutSessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});
