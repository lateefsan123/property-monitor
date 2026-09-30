import { hasBillingAccess } from "./billing-access.js";

async function result(query) {
  const { data, error } = await query;
  if (error) throw new Error("Event storage operation failed");
  return data;
}

export function createEventStore(db) {
  return {
    get: id => result(db.from("mcp_event_subscriptions").select("*").eq("id", id).maybeSingle()),
    async count(userId) {
      const { count, error } = await db.from("mcp_event_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (error) throw new Error("Could not check event limit");
      return count;
    },
    save: row => result(db.from("mcp_event_subscriptions").upsert(row, { onConflict: "id" })),
    remove: id => result(db.from("mcp_event_subscriptions").delete().eq("id", id)),
    claim: () => result(db.rpc("claim_mcp_event_deliveries")),
    finish: (id, status) => result(db.from("mcp_event_deliveries").update({ status }).eq("id", id)),
    retry: (id, attempts, now) => result(db.from("mcp_event_deliveries").update({ status: attempts >= 6 ? "failed" : "pending", available_at: new Date(now + Math.min(300000, 5000 * 2 ** attempts)).toISOString() }).eq("id", id)),
    async cleanup() {
      await result(db.from("mcp_event_subscriptions").delete().lte("expires_at", new Date().toISOString()));
      await result(db.from("mcp_event_deliveries").delete().lt("created_at", new Date(Date.now() - 86400000).toISOString()));
    },
    async message(id, userId, leadId) {
      let query = db.from("whatsapp_messages").select("id,lead_id,account_id,body,created_at").eq("id", id).eq("user_id", userId).eq("direction", "inbound").eq("status", "received");
      if (leadId) query = query.eq("lead_id", leadId);
      const message = await result(query.maybeSingle());
      if (!message?.lead_id || !message.account_id) return null;
      const account = await result(db.from("whatsapp_accounts").select("id").eq("id", message.account_id).eq("user_id", userId).eq("connection_status", "connected").maybeSingle());
      return account ? message : null;
    },
  };
}

export function eventAccessChecker(db, verifyToken) {
  return async auth => {
    if (!auth?.token || !auth.extra?.userId || !auth.clientId || auth.expiresAt * 1000 <= Date.now()) return false;
    let claims;
    try { claims = JSON.parse(Buffer.from(auth.token.split(".")[1], "base64url").toString("utf8")); } catch { return false; }
    if (!claims.session_id) return false;
    const active = await result(db.rpc("mcp_event_access_active", { p_user: auth.extra.userId, p_client: auth.clientId, p_session: claims.session_id }));
    if (!active) return false;
    const current = await verifyToken(auth.token);
    if (current.extra?.userId !== auth.extra.userId || current.clientId !== auth.clientId) return false;
    return hasBillingAccess(current);
  };
}
