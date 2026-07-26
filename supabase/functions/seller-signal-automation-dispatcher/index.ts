import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auto-whatsapp-token",
};

const DEFAULT_DAILY_CAP = 40;
const MONTHLY_REPORT_WINDOW_DAYS = 7;

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

function getDubaiDayOfMonth(date = new Date()) {
  const value = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(date);
  const day = Number(value);
  return Number.isFinite(day) ? day : null;
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
    const transactionUpdates = await invokePipeline("seller-signal-auto-whatsapp", {
      dryRun,
      maxSends: 1,
      dailyCap,
    });
    const transactionSent = Number(transactionUpdates?.sent || 0);
    const dubaiDay = getDubaiDayOfMonth();

    let monthlyReports: Record<string, unknown> | null = null;
    if (transactionSent === 0 && dubaiDay !== null && dubaiDay <= MONTHLY_REPORT_WINDOW_DAYS) {
      monthlyReports = await invokePipeline("seller-signal-monthly-report", {
        dryRun,
        maxSends: 1,
        dailyCap,
        reportDailyBudget: dailyCap,
      });
    }

    return jsonResponse({
      runId,
      dailyCap,
      dubaiDay,
      monthlyReportWindowDays: MONTHLY_REPORT_WINDOW_DAYS,
      sent: transactionSent + Number(monthlyReports?.sent || 0),
      transactionUpdates,
      monthlyReports,
    });
  } catch (error) {
    return jsonResponse({
      runId,
      error: error instanceof Error ? error.message : "Unknown dispatcher error",
    }, 500);
  }
});
