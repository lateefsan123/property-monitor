import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isAutomationAccount } from "../_shared/automation-account.js";
import { templateMediaType, templateMediaPayload } from '../_shared/template-media.js';
import { hasPriorWhatsAppContact } from '../_shared/intro-attachment.js';
import { createClient } from "jsr:@supabase/supabase-js@2";
import { accountsNotDue, loadLastAutoSends, loadSendPacing } from "../_shared/send-pacing.js";
import { dueFollowUps, renderFollowUp, sendableStatuses } from "../_shared/status-followups.js";

// Status follow-ups (see _shared/status-followups.js): for accounts that turned
// them on, send the template assigned to a seller's custom status once that
// seller is due, then move them to the status's next status. Replied sellers
// are skipped. One message per account per run, inside the account's send
// hours, gap and daily limit (the claim enforces the limit). Called by the
// automation dispatcher.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auto-whatsapp-token",
};
const TEMPLATE_IMAGE_BUCKET = "seller-signal-template-images";
const SENT_STATUSES = ["queued", "sending", "sent", "delivered", "read", "failed"];
const LOOKUP_BATCH = 200;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function isAuthorized(req: Request) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN");
  const auth = req.headers.get("authorization") || "";
  return Boolean(
    (serviceRoleKey && (req.headers.get("apikey") === serviceRoleKey || auth === `Bearer ${serviceRoleKey}`))
    || (token && req.headers.get("x-auto-whatsapp-token") === token),
  );
}

function dubaiHour(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(date).find((part) => part.type === "hour")?.value);
  return Number.isFinite(hour) ? hour % 24 : null;
}

function normalizePhone(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("9710")) digits = `971${digits.slice(4)}`;
  if (digits.startsWith("0")) digits = `971${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

async function must<T>(query: PromiseLike<{ data: T; error: any }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

function sessionId(account: any) {
  const raw = String(account?.raw_account?.baileys?.session_id || "").trim();
  if (raw) return raw;
  const id = String(account?.phone_number_id || "");
  return id.startsWith("baileys:") ? id.slice(8) : null;
}

async function send(client: any, account: any, to: string, body: string, imageUrl: string | null, mediaType: string) {
  if (account.provider === "baileys") {
    const session = sessionId(account);
    if (!session) throw new Error("WhatsApp session is not configured");
    const response = await fetch(`${requireEnv("BAILEYS_SERVICE_URL").replace(/\/+$/, "")}/sessions/${encodeURIComponent(session)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${requireEnv("BAILEYS_SERVICE_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ [mediaType === 'video' ? 'videoUrl' : 'imageUrl']: imageUrl, text: body, to }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `WhatsApp service failed with ${response.status}`);
    return { providerMessageId: payload?.messageId || null, providerPayload: payload };
  }
  const secret = await must(client.from("whatsapp_account_secrets").select("access_token").eq("account_id", account.id).maybeSingle());
  if (!(secret as any)?.access_token) throw new Error("WhatsApp account token is not configured");
  const payload = templateMediaPayload({ to, body, imageUrl, mediaType }, true);
  const response = await fetch(`https://graph.facebook.com/${Deno.env.get("WHATSAPP_GRAPH_API_VERSION") || "v25.0"}/${account.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${(secret as any).access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error?.message || `WhatsApp API failed with ${response.status}`);
  return { providerMessageId: result?.messages?.[0]?.id || null, providerPayload: result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

  const runId = crypto.randomUUID();
  const startedAt = new Date();
  try {
    const input = await req.json().catch(() => ({}));
    const dryRun = Boolean(input?.dryRun);
    const maxSends = Math.max(1, Math.min(10, Math.floor(Number(input?.maxSends) || 1)));
    const dailyCap = Math.max(1, Math.min(40, Math.floor(Number(input?.dailyCap) || 40)));
    const client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const settings = await must(client.from("seller_signal_automation_settings").select("user_id").eq("status_followups_enabled", true));
    const enabledUsers = new Set((settings as any[] || []).map((row) => String(row.user_id)));
    if (!enabledUsers.size) return json({ runId, sent: 0, skipped: { noAccountsEnabled: true } });

    const accounts = await must(client.from("whatsapp_accounts")
      .select("id, user_id, provider, phone_number_id, raw_account, connection_status, connected_at")
      .eq("connection_status", "connected").in("user_id", [...enabledUsers]).order("connected_at", { ascending: false }));
    const accountByUser = new Map<string, any>();
    for (const account of accounts as any[] || []) if (!accountByUser.has(String(account.user_id))) accountByUser.set(String(account.user_id), account);

    const pacing = await loadSendPacing(client, [...accountByUser.keys()]);
    const lastSends = await loadLastAutoSends(client, [...accountByUser.keys()], startedAt);
    const waiting = accountsNotDue({ pacing, lastSends, now: startedAt, dubaiHour: dubaiHour(startedAt), enforceWindow: !dryRun && input?.enforceSendWindow !== false });
    for (const userId of waiting.keys()) accountByUser.delete(userId);

    const summary = { runId, dryRun, sent: 0, failed: 0, matches: [] as unknown[], waitingAccounts: waiting.size, accounts: accountByUser.size, errors: [] as string[] };

    for (const [userId, account] of accountByUser) {
      if (summary.sent + summary.failed >= maxSends) break;
      const statusRows = await must(client.from("seller_signal_statuses")
        .select("id, label, follow_up_days, builtin_key, next_status_id, hidden").eq("user_id", userId));
      const templates = await must(client.from("seller_signal_message_templates")
        .select("content, image_path, statuses, updated_at").eq("user_id", userId));
      const statuses = sendableStatuses(statusRows as any[], templates as any[], userId);
      if (!statuses.length) continue;

      let leadQuery = client.from("leads")
        .select("id, user_id, name, phone, building, status, sent_at, last_contact, next_follow_up_on")
        .eq("user_id", userId);
      if (!isAutomationAccount(userId)) leadQuery = leadQuery.in("status", statuses.map((status: { label: string }) => status.label));
      const leads = await must(leadQuery.limit(2000));
      if (!(leads as any[])?.length) continue;
      const leadIds = (leads as any[]).map((lead) => Number(lead.id));
      const phones = (leads as any[]).map((lead) => normalizePhone(lead.phone)).filter(Boolean) as string[];

      // In batches: 2,000 ids and phones in one filter make a ~40 KB URL, which the REST API rejects (400).
      const inbound: any[] = [];
      const outbound: any[] = [];
      for (let start = 0; start < leadIds.length; start += LOOKUP_BATCH) {
        const ids = leadIds.slice(start, start + LOOKUP_BATCH);
        const batchPhones = phones.slice(start, start + LOOKUP_BATCH);
        inbound.push(...(await must(client.from("whatsapp_messages").select("lead_id, recipient_phone")
          .eq("user_id", userId).eq("direction", "inbound").or(`lead_id.in.(${ids.join(",")}),recipient_phone.in.(${batchPhones.join(",") || "0"})`).limit(5000)) as any[] || []));
        outbound.push(...(await must(client.from("whatsapp_messages").select("lead_id, created_at")
          .eq("user_id", userId).eq("direction", "outbound").in("lead_id", ids).in("status", SENT_STATUSES).limit(10000)) as any[] || []));
      }
      const repliedLeadIds = new Set(inbound.map((row) => Number(row.lead_id)).filter(Boolean));
      const repliedPhones = new Set(inbound.map((row) => String(row.recipient_phone || "")));
      const outboundByLead = new Map<number, string[]>();
      for (const row of outbound as any[] || []) {
        const list = outboundByLead.get(Number(row.lead_id)) || [];
        list.push(row.created_at);
        outboundByLead.set(Number(row.lead_id), list);
      }

      const leadsWithPhones = (leads as any[]).map((lead) => ({ ...lead, phone: normalizePhone(lead.phone) })).filter((lead) => lead.phone);
      const due = dueFollowUps({ leads: leadsWithPhones, statuses, outboundByLead, repliedLeadIds, repliedPhones, now: startedAt.getTime() });

      for (const { lead, status } of due) {
        const body = renderFollowUp(status.template.content, lead);
        if (!body) continue;
        if (dryRun) {
          summary.matches.push({ leadId: lead.id, status: status.label, next: status.nextLabel, body });
          break;
        }
        let imageUrl: string | null = null;
        if (status.template.image_path && !await hasPriorWhatsAppContact(client, { userId, phone: lead.phone, sentAt: lead.sent_at })) {
          const signed = await client.storage.from(TEMPLATE_IMAGE_BUCKET).createSignedUrl(status.template.image_path, 3600);
          if (signed.error || !signed.data?.signedUrl) throw new Error('Could not load the template attachment.');
          imageUrl = signed.data?.signedUrl || null;
        }
        const mediaType = templateMediaType(status.template.image_path);
        const payload = templateMediaPayload({ to: lead.phone, body, imageUrl, mediaType });
        const { data: claim, error: claimError } = await client.rpc("claim_seller_signal_automation_message", {
          p_user_id: userId,
          p_account_id: account.id,
          p_lead_id: lead.id,
          p_recipient_phone: lead.phone,
          p_message_type: payload.type,
          p_body: body,
          p_raw_request: { ...payload, statusFollowUp: { statusId: status.id, status: status.label } },
          p_market_transaction_date: null,
          p_auto_send_event_id: null,
          p_daily_cap: dailyCap,
          p_automation_kind: "status_followups",
          p_fill: false,
        }).single();
        if (claimError) throw new Error(claimError.message);
        // Not claimed: the account's daily limit is reached or the automation was switched off.
        if (!(claim as any)?.claimed) break;
        const messageId = (claim as any).message_id;
        try {
          const { providerMessageId, providerPayload } = await send(client, account, lead.phone, body, imageUrl, mediaType);
          const sentAt = new Date().toISOString();
          await must(client.from("whatsapp_messages").update({ status: "sent", sent_at: sentAt, meta_message_id: providerMessageId, raw_response: providerPayload || {} }).eq("id", messageId));
          const leadUpdate: Record<string, unknown> = { sent_at: sentAt, next_follow_up_on: null };
          if (status.nextLabel) leadUpdate.status = status.nextLabel;
          await must(client.from("leads").update(leadUpdate).eq("user_id", userId).eq("id", lead.id));
          await must(client.from("sent_leads").upsert({ user_id: userId, lead_id: lead.id, sent_at: sentAt }, { onConflict: "user_id,lead_id" }));
          summary.sent += 1;
        } catch (error) {
          // A failed or unconfirmed send stays recorded as a touch, so it is
          // never resent straight away; it shows as failed in Activity.
          const message = error instanceof Error ? error.message : "Send failed";
          await client.from("whatsapp_messages").update({ status: "failed", error_message: `Status follow-up not confirmed: ${message}. Check WhatsApp before resending.` }).eq("id", messageId);
          summary.failed += 1;
          summary.errors.push(message);
        }
        break; // one message per account per run
      }
    }
    return json(summary);
  } catch (error) {
    return json({ runId, error: error instanceof Error ? error.message : "Status follow-ups failed" }, 500);
  }
});
