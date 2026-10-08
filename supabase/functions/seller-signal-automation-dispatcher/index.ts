import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auto-whatsapp-token",
};

const DEFAULT_DAILY_CAP = 40;
// Sends per pass, across accounts (one each); keeps a run well inside the time limit.
const MAX_ACCOUNTS_PER_PASS = 10;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function isAuthorized(req: Request) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN");
  const apikey = req.headers.get("apikey");
  const auth = req.headers.get("authorization") || "";
  const customToken = req.headers.get("x-auto-whatsapp-token");

  return Boolean(
    (serviceRoleKey && (apikey === serviceRoleKey || auth === `Bearer ${serviceRoleKey}`))
    || (token && customToken === token),
  );
}

async function invokePipeline(
  functionName: string,
  body: Record<string, unknown>,
) {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || `${functionName} failed with ${response.status}`;
    throw new Error(message);
  }
  return payload || {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const runId = crypto.randomUUID();
  try {
    const input = await req.json().catch(() => ({}));
    const dryRun = Boolean(input?.dryRun);
    const dailyCap = Math.max(
      1,
      Math.min(DEFAULT_DAILY_CAP, Math.floor(Number(input?.dailyCap) || DEFAULT_DAILY_CAP)),
    );
    // At most one message per account per run, paced by each account's own
    // send hours and gap (_shared/send-pacing.js), so every account gets its
    // turn instead of one send across all accounts. Each kind first stays
    // within its share of the 40 (monthly_report_daily_share, enforced by the
    // claim); then a fill pass lets either kind use slots the other left unused.
    const base = { dryRun, maxSends: MAX_ACCOUNTS_PER_PASS, dailyCap };
    const passes: Array<[string, string, Record<string, unknown>]> = [
      ["transactionUpdates", "seller-signal-auto-whatsapp", base],
      ["monthlyReports", "seller-signal-monthly-report", { ...base, reportDailyBudget: dailyCap }],
      // Accounts that turned on status follow-ups (custom status templates).
      ["statusFollowUps", "seller-signal-status-followups", base],
      ["transactionFill", "seller-signal-auto-whatsapp", { ...base, fill: true }],
      ["monthlyReportFill", "seller-signal-monthly-report", { ...base, reportDailyBudget: dailyCap, fill: true }],
    ];
    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    let sent = 0;
    // Each pass runs on its own: one pass failing (e.g. a 546 resource limit)
    // must not stop the others from sending.
    for (const [label, functionName, body] of passes) {
      try {
        const result = await invokePipeline(functionName, body);
        results[label] = result;
        sent += Number(result?.sent || 0);
      } catch (error) {
        errors[label] = error instanceof Error ? error.message : "Unknown error";
      }
    }

    const failed = Object.keys(errors).length;
    return jsonResponse({ runId, dailyCap, sent, ...results, ...(failed ? { errors } : {}) }, failed === passes.length ? 500 : 200);
  } catch (error) {
    return jsonResponse({
      runId,
      error: error instanceof Error ? error.message : "Unknown dispatcher error",
    }, 500);
  }
});
