/**
 * Monitor script: checks if test leads are still in "done" state.
 * Run with: node scripts/monitor-done-lead.mjs
 * Checks every 5 minutes and logs the result.
 */

const SB_URL = "https://zrqxaammmrydkekbphqa.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = "441421f9-1089-4694-a66e-ab75b5459003";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const WATCHED_LEADS = [
  { id: 1744, name: "Ms. Saira Hapis", type: "LEGACY", markedAt: "2026-04-13T18:38:39+00:00" },
  { id: 13927, name: "TAHIRA AHMED", type: "SOURCE-LINKED", markedAt: "2026-04-13T18:41:07+00:00" },
];

async function checkLead(watched) {
  const now = new Date().toISOString();
  const tag = `[${now}] [${watched.type}] Lead ${watched.id} (${watched.name})`;

  const [leadRes, sentRes] = await Promise.all([
    fetch(
      `${SB_URL}/rest/v1/leads?id=eq.${watched.id}&user_id=eq.${USER_ID}&select=id,name,building,sent_at,source_id`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    ),
    fetch(
      `${SB_URL}/rest/v1/sent_leads?lead_id=eq.${watched.id}&user_id=eq.${USER_ID}&select=lead_id,sent_at`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    ),
  ]);

  const leads = await leadRes.json();
  const sentLeads = await sentRes.json();
  const lead = leads[0];
  const sentLead = sentLeads[0];

  if (!lead) {
    console.error(`${tag} — DELETED from leads table!`);
    return "deleted";
  }

  if (!lead.sent_at && !sentLead) {
    console.error(`${tag} — LOST sent_at! Both leads.sent_at and sent_leads are gone.`);
    return "lost";
  }

  if (!lead.sent_at) {
    console.warn(`${tag} — leads.sent_at is NULL but sent_leads exists: ${JSON.stringify(sentLead)}`);
    return "partial-leads";
  }

  if (!sentLead) {
    console.warn(`${tag} — sent_leads row MISSING but leads.sent_at=${lead.sent_at}`);
    return "partial-sent";
  }

  const elapsed = Math.round((Date.now() - new Date(watched.markedAt).getTime()) / 60000);
  console.log(`${tag} — OK (sent_at=${lead.sent_at}, elapsed=${elapsed}min)`);
  return "ok";
}

async function runCheck() {
  console.log(`\n--- Check at ${new Date().toISOString()} ---`);
  for (const watched of WATCHED_LEADS) {
    try {
      await checkLead(watched);
    } catch (err) {
      console.error(`[ERROR] Failed to check lead ${watched.id}: ${err.message}`);
    }
  }
}

console.log("=== MONITORING DONE LEADS ===");
for (const w of WATCHED_LEADS) {
  console.log(`  ${w.type}: ${w.name} (id=${w.id}) — marked done at ${w.markedAt}`);
}
console.log(`Checking every ${CHECK_INTERVAL_MS / 60000} minutes...\n`);

runCheck();
setInterval(runCheck, CHECK_INTERVAL_MS);
