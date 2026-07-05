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

function graphVersion() {
  return Deno.env.get("WHATSAPP_GRAPH_API_VERSION") || "v25.0";
}

function baileysPhoneNumberId(sessionId: string) {
  return `baileys:${sessionId}`;
}

function getBaileysSessionId(account: any) {
  const rawSessionId = cleanString(account?.raw_account?.baileys?.session_id);
  if (rawSessionId) return rawSessionId;

  const phoneNumberId = cleanString(account?.phone_number_id);
  if (phoneNumberId?.startsWith("baileys:")) return phoneNumberId.slice("baileys:".length);
  return null;
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

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function truthyInput(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function requireString(value: unknown, label: string) {
  const text = cleanString(value);
  if (!text) throw new HttpError(400, `${label} is required`);
  return text;
}

function getMetaError(payload: any, fallback: string) {
  return payload?.error?.message || payload?.error?.error_user_msg || fallback;
}

async function graphFetch(path: string, options: RequestInit & { token?: string } = {}) {
  const url = path.startsWith("http")
    ? path
    : `https://graph.facebook.com/${graphVersion()}/${path.replace(/^\/+/, "")}`;
  const headers = new Headers(options.headers);

  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(502, getMetaError(payload, `Meta API request failed with ${response.status}`));
  }

  return payload;
}

async function baileysFetch(path: string, options: RequestInit = {}) {
  const serviceUrl = requireEnv("BAILEYS_SERVICE_URL").replace(/\/+$/, "");
  const serviceToken = requireEnv("BAILEYS_SERVICE_TOKEN");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${serviceToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${serviceUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(502, payload?.error || `Baileys service request failed with ${response.status}`);
  }

  return payload;
}

async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("WHATSAPP_APP_ID"),
    client_secret: requireEnv("WHATSAPP_APP_SECRET"),
    code,
  });

  return graphFetch(`/oauth/access_token?${params.toString()}`);
}

async function subscribeWabaToWebhooks(wabaId: string, accessToken: string) {
  return graphFetch(`/${wabaId}/subscribed_apps`, {
    method: "POST",
    token: accessToken,
  });
}

async function registerPhoneNumber(phoneNumberId: string, accessToken: string, pin: string | null) {
  const body: Record<string, string> = { messaging_product: "whatsapp" };
  if (pin) body.pin = pin;

  return graphFetch(`/${phoneNumberId}/register`, {
    method: "POST",
    token: accessToken,
    body: JSON.stringify(body),
  });
}

async function fetchPhoneNumber(phoneNumberId: string, accessToken: string) {
  const fields = "display_phone_number,verified_name,quality_rating,platform_type,code_verification_status";
  return graphFetch(`/${phoneNumberId}?fields=${encodeURIComponent(fields)}`, {
    token: accessToken,
  });
}

function tokenExpiry(expiresIn: unknown) {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function upsertAccount(adminClient: any, input: {
  accessToken: string;
  businessId: string | null;
  expiresIn: unknown;
  phoneNumber: any;
  phoneNumberId: string;
  rawSignup: unknown;
  scopes: unknown;
  tokenPayload: unknown;
  tokenType: string | null;
  userId: string;
  wabaId: string;
}) {
  const displayPhoneNumber = cleanString(input.phoneNumber?.display_phone_number);
  const businessName = cleanString(input.phoneNumber?.verified_name);

  const { data: account, error: accountError } = await adminClient
    .from("whatsapp_accounts")
    .upsert({
      user_id: input.userId,
      provider: "meta",
      meta_business_id: input.businessId,
      waba_id: input.wabaId,
      phone_number_id: input.phoneNumberId,
      display_phone_number: displayPhoneNumber,
      business_name: businessName,
      connection_status: "connected",
      last_error: null,
      raw_account: {
        embedded_signup: input.rawSignup || {},
        phone_number: input.phoneNumber || {},
        token: input.tokenPayload || {},
      },
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id,phone_number_id" })
    .select("id, display_phone_number, business_name, connection_status, connected_at, last_error")
    .single();

  if (accountError) throw new HttpError(500, accountError.message);

  const scopes = Array.isArray(input.scopes)
    ? input.scopes.map((scope) => String(scope))
    : String(input.scopes || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);

  const { error: secretError } = await adminClient
    .from("whatsapp_account_secrets")
    .upsert({
      account_id: account.id,
      access_token: input.accessToken,
      token_type: input.tokenType,
      scopes,
      expires_at: tokenExpiry(input.expiresIn),
    }, { onConflict: "account_id" });

  if (secretError) throw new HttpError(500, secretError.message);

  return account;
}

async function findLatestBaileysAccount(adminClient: any, userId: string) {
  const { data, error } = await adminClient
    .from("whatsapp_accounts")
    .select("id, phone_number_id, raw_account")
    .eq("user_id", userId)
    .eq("provider", "baileys")
    .neq("connection_status", "disconnected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  return data || null;
}

async function findBaileysAccountById(adminClient: any, userId: string, accountId: string) {
  const { data, error } = await adminClient
    .from("whatsapp_accounts")
    .select("id, phone_number_id, raw_account")
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("provider", "baileys")
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "WhatsApp account not found");
  return data;
}

async function upsertBaileysAccount(adminClient: any, userId: string, session: any) {
  const sessionId = requireString(session?.sessionId, "Baileys session ID");
  const connectionStatus = session?.status === "connected"
    ? "connected"
    : session?.status === "error"
      ? "error"
      : "pending";

  const { data: account, error } = await adminClient
    .from("whatsapp_accounts")
    .upsert({
      user_id: userId,
      provider: "baileys",
      waba_id: "baileys",
      phone_number_id: baileysPhoneNumberId(sessionId),
      display_phone_number: cleanString(session?.displayPhoneNumber),
      business_name: "WhatsApp Web",
      connection_status: connectionStatus,
      last_error: cleanString(session?.lastError),
      raw_account: {
        baileys: {
          connected_at: session?.connectedAt || null,
          pairing_mode: session?.pairingMode || "qr",
          session_id: sessionId,
          status: session?.status || "pending",
          updated_at: session?.updatedAt || null,
        },
      },
      connected_at: connectionStatus === "connected" ? (session?.connectedAt || new Date().toISOString()) : null,
    }, { onConflict: "user_id,phone_number_id" })
    .select("id, display_phone_number, business_name, connection_status, connected_at, last_error, provider, raw_account")
    .single();

  if (error) throw new HttpError(500, error.message);
  return account;
}

async function handleBaileysConnect(adminClient: any, userId: string, input: any) {
  const action = cleanString(input.action) || "start";

  if (action === "disconnect") {
    const accountId = requireString(input.accountId || input.account_id, "WhatsApp account ID");
    const account = await findBaileysAccountById(adminClient, userId, accountId);
    const sessionId = requireString(getBaileysSessionId(account), "Baileys session ID");
    await baileysFetch(`/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });

    const rawAccount = account?.raw_account && typeof account.raw_account === "object"
      ? account.raw_account
      : {};
    const { data: updatedAccount, error } = await adminClient
      .from("whatsapp_accounts")
      .update({
        connection_status: "disconnected",
        connected_at: null,
        last_error: null,
        raw_account: {
          ...rawAccount,
          baileys: {
            ...(rawAccount as any).baileys,
            disconnected_at: new Date().toISOString(),
            session_id: sessionId,
            status: "disconnected",
          },
        },
      })
      .eq("id", accountId)
      .eq("user_id", userId)
      .eq("provider", "baileys")
      .select("id, display_phone_number, business_name, connection_status, connected_at, last_error, provider, raw_account")
      .single();

    if (error) throw new HttpError(500, error.message);

    return jsonResponse({
      account: updatedAccount,
      disconnected: true,
      provider: "baileys",
      status: "disconnected",
    });
  }

  if (action === "status") {
    const accountId = requireString(input.accountId || input.account_id, "WhatsApp account ID");
    const account = await findBaileysAccountById(adminClient, userId, accountId);
    const sessionId = requireString(getBaileysSessionId(account), "Baileys session ID");
    const session = await baileysFetch(`/sessions/${encodeURIComponent(sessionId)}`);
    const updatedAccount = await upsertBaileysAccount(adminClient, userId, session);

    return jsonResponse({
      account: updatedAccount,
      provider: "baileys",
      qr: session?.qr || null,
      qrDataUrl: session?.qrDataUrl || null,
      session,
      status: session?.status || updatedAccount.connection_status,
    });
  }

  if (action !== "start") throw new HttpError(400, "Unsupported Baileys action");

  const existingAccount = await findLatestBaileysAccount(adminClient, userId);
  const existingSessionId = getBaileysSessionId(existingAccount);
  const phoneNumber = cleanString(input.phoneNumber || input.phone_number);
  const customPairingCode = cleanString(input.customPairingCode || input.custom_pairing_code);
  const wantsPairingCode = Boolean(phoneNumber);
  const resetSession = wantsPairingCode || truthyInput(input.resetSession ?? input.reset_session);
  const sessionBody: Record<string, string | boolean> = {};
  if (existingSessionId) sessionBody.sessionId = existingSessionId;
  if (resetSession) sessionBody.resetSession = true;
  if (phoneNumber) {
    sessionBody.phoneNumber = phoneNumber;
    sessionBody.pairingMode = "code";
  }
  if (customPairingCode) sessionBody.customPairingCode = customPairingCode;

  const session = await baileysFetch("/sessions", {
    method: "POST",
    body: JSON.stringify(sessionBody),
  });
  const account = await upsertBaileysAccount(adminClient, userId, session);

  return jsonResponse({
    account,
    pairingCode: session?.pairingCode || null,
    pairingCodeFormatted: session?.pairingCodeFormatted || null,
    pairingCodeRequestedAt: session?.pairingCodeRequestedAt || null,
    provider: "baileys",
    qr: session?.qr || null,
    qrDataUrl: session?.qrDataUrl || null,
    session,
    status: session?.status || account.connection_status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { adminClient, user } = await getAuthenticatedUser(req.headers.get("Authorization"));
    const input = await req.json();

    if (input?.provider === "baileys") {
      return await handleBaileysConnect(adminClient, user.id, input);
    }

    const code = requireString(input.code, "Embedded Signup code");
    const wabaId = requireString(input.wabaId || input.waba_id, "WABA ID");
    const phoneNumberId = requireString(input.phoneNumberId || input.phone_number_id, "Phone number ID");
    const businessId = cleanString(input.businessId || input.business_id);
    const pin = cleanString(input.pin);

    const tokenPayload = await exchangeCodeForToken(code);
    const accessToken = requireString(tokenPayload?.access_token, "Meta access token");

    const phoneNumber = await fetchPhoneNumber(phoneNumberId, accessToken);
    const webhookResult = await subscribeWabaToWebhooks(wabaId, accessToken);
    const registerResult = await registerPhoneNumber(phoneNumberId, accessToken, pin);

    const account = await upsertAccount(adminClient, {
      accessToken,
      businessId,
      expiresIn: tokenPayload?.expires_in,
      phoneNumber,
      phoneNumberId,
      rawSignup: input.rawSignup || input.raw_signup || {},
      scopes: tokenPayload?.scope,
      tokenPayload,
      tokenType: cleanString(tokenPayload?.token_type),
      userId: user.id,
      wabaId,
    });

    return jsonResponse({
      account,
      registerResult,
      webhookResult,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});
