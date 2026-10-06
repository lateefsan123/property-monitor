#!/usr/bin/env node
// Prepares broker outreach in the dedicated Repeat AI outreach account by
// running scripts/broker-outreach-setup.sql for it (statuses, templates, the
// broker spreadsheet, gentle pacing). Refuses the main seller account and the
// demo account. Never switches status follow-ups on; do that in Settings >
// Automations once the Repeat AI number is linked and replies are checked.
//
//   node scripts/setup-broker-outreach.mjs --user-id <outreach account UUID>
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REFUSED = new Map([
  ["441421f9-1089-4694-a66e-ab75b5459003", "the main seller account"],
  ["90dec869-75fa-4294-8bf1-7e4c2384184f", "the sales demo account"],
]);
const userId = process.argv[process.argv.indexOf("--user-id") + 1];
if (!/^[0-9a-f-]{36}$/i.test(userId || "")) throw new Error("Pass --user-id <outreach account UUID>.");
if (REFUSED.has(userId)) throw new Error(`Refusing ${REFUSED.get(userId)}: broker outreach must stay separate from real sellers.`);

const query = (sql) => JSON.parse(execFileSync("npx", ["supabase", "db", "query", "--linked", "--output-format", "json", sql], { encoding: "utf8", shell: true }).trim().split("\n").pop());
const [account] = query(`select u.email, (select string_agg(coalesce(display_phone_number, '?') || ':' || connection_status, ', ') from public.whatsapp_accounts a where a.user_id = u.id) as whatsapp, (select count(*) from public.leads l where l.user_id = u.id) as leads from auth.users u where u.id = '${userId}'`).rows || [];
if (!account) throw new Error("No account with that ID.");
console.log(`Account: ${account.email} · WhatsApp: ${account.whatsapp || "not linked"} · existing sellers: ${account.leads}`);
if (!String(account.whatsapp || "").includes("353899618882:connected")) console.warn("Note: the Repeat AI number (+353 89 961 8882) isn't connected yet. Link it before switching follow-ups on.");

const dir = mkdtempSync(join(tmpdir(), "broker-outreach-"));
const file = join(dir, "setup.sql");
writeFileSync(file, readFileSync(new URL("./broker-outreach-setup.sql", import.meta.url), "utf8").replaceAll(":outreach_user_id", userId));
console.log(execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", file], { encoding: "utf8", shell: true }));
