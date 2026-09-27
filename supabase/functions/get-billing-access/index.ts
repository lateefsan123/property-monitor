import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { complimentaryAccess } from "../_shared/complimentary-access.js";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRevenueCatCustomer, revenueCatAccess, stripeAccess } from "../_shared/billing-access.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Sign in to check your subscription" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return json({ error: "Invalid session" }, 401);
  const complimentary = complimentaryAccess(user);
  if (complimentary) return json({ subscription: complimentary });
  try {
    // Never accept a user ID or an entitlement from the request body.
    const { data: row, error: billingError } = await userClient.from("billing_subscriptions")
      .select("status,current_period_start,current_period_end,cancel_at_period_end,canceled_at,raw")
      .eq("user_id", user.id).maybeSingle();
    if (billingError) throw new Error("Could not check web subscription");
    const webAccess = stripeAccess(row);
    if (webAccess) return json({ subscription: webAccess });
    const customer = await getRevenueCatCustomer(user.id, Deno.env.get("REVENUECAT_PUBLIC_API_KEY"));
    return json({ subscription: revenueCatAccess(customer) });
  } catch {
    return json({ error: "Could not verify subscription access. Please try again." }, 503);
  }
});
