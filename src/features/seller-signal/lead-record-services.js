import { supabase } from "../../supabase";
import { mapStoredLeadRow, startOfDay, sortLeadsByPriority } from "./lead-utils";

const SUPABASE_PAGE_SIZE = 1000;

async function selectAllRows(buildQuery, pageSize = SUPABASE_PAGE_SIZE) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw new Error(error.message);

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function fetchUserLeads(userId, today = startOfDay(new Date())) {
  const [leadRows, sentLeadRows] = await Promise.all([
    selectAllRows(() => supabase.from("leads").select("*").eq("user_id", userId).order("id")),
    selectAllRows(() => supabase.from("sent_leads").select("lead_id, sent_at").eq("user_id", userId).order("lead_id")),
  ]);

  const sentMap = {};
  for (const row of leadRows || []) {
    if (!row.sent_at) continue;
    sentMap[row.id] = new Date(row.sent_at).getTime();
  }
  for (const row of sentLeadRows || []) {
    const sentAt = new Date(row.sent_at).getTime();
    if (!sentMap[row.lead_id] || sentAt > sentMap[row.lead_id]) {
      sentMap[row.lead_id] = sentAt;
    }
  }

  const leads = sortLeadsByPriority(
    (leadRows || [])
      .map((row, index) => mapStoredLeadRow(row, index, today))
      .filter((lead) => lead.name || lead.building || lead.phone),
  );

  const doneCount = Object.keys(sentMap).length;
  const doneIds = Object.keys(sentMap).sort();
  const prevDoneIds = JSON.parse(sessionStorage.getItem("debug:doneIds") || "[]");
  const missing = prevDoneIds.filter((id) => !sentMap[id]);
  if (missing.length > 0) {
    const now = new Date().toLocaleTimeString();
    console.error(`[DONE-TRACKER ${now}] LEADS DISAPPEARED FROM DONE:`, missing);
    const names = missing.map((id) => {
      const lead = leads.find((item) => String(item.id) === String(id));
      return lead ? `${lead.name} (${lead.building})` : `id=${id} (NOT IN LEADS)`;
    });
    console.error(`[DONE-TRACKER ${now}] Missing lead names:`, names);
    console.error(`[DONE-TRACKER ${now}] Previous done count: ${prevDoneIds.length}, Current: ${doneCount}`);
  } else if (prevDoneIds.length > 0) {
    console.log(`[DONE-TRACKER ${new Date().toLocaleTimeString()}] Done leads OK - count: ${doneCount}`);
  }
  sessionStorage.setItem("debug:doneIds", JSON.stringify(doneIds));

  return { leads, sentMap };
}

export async function updateLeadStatus({ userId, leadId, status }) {
  if (!userId || !leadId) return;
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function persistLeadSentState(userId, leadId, isSent) {
  console.log(`[DONE-TRACKER ${new Date().toLocaleTimeString()}] ${isSent ? "MARKING DONE" : "UNMARKING DONE"} lead=${leadId}`);
  const sentAt = isSent ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("leads")
    .update({ sent_at: sentAt })
    .eq("user_id", userId)
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  try {
    if (isSent) {
      const { error: legacyError } = await supabase.from("sent_leads").insert({ user_id: userId, lead_id: leadId, sent_at: sentAt });
      if (legacyError && legacyError.code !== "23505") {
        console.warn("Could not sync legacy sent_leads row", legacyError.message);
      }
    } else {
      const { error: legacyError } = await supabase.from("sent_leads").delete().eq("user_id", userId).eq("lead_id", leadId);
      if (legacyError) {
        console.warn("Could not clear legacy sent_leads row", legacyError.message);
      }
    }
  } catch (legacySyncError) {
    console.warn("Legacy sent state sync failed", legacySyncError);
  }

  return sentAt;
}
