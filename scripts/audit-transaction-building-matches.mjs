// Read-only audit: uses the same transaction-key resolver as the send workers.
// No message bodies, phone numbers or credentials are written to the report.
// --worker-dry-run can use SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN when the local
// REST service key differs from the Edge runtime's service key.
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { loadAutomaticAliases } from '../supabase/functions/_shared/automatic-aliases.js';
import { loadTransactionBuildingMatches } from '../supabase/functions/_shared/transaction-building-matches.js';

const env = { ...process.env };
for (const file of ['.env', '.env.development.local']) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}
const userId = process.argv[process.argv.indexOf('--user-id') + 1];
if (!process.argv.includes('--user-id') || !/^[0-9a-f-]{36}$/.test(userId || '')) throw new Error('Pass --user-id UUID');
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing server-side Supabase configuration');
const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const read = async build => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
};
const leads = await read(() => client.from('leads').select('id,user_id,building,sent_at,whatsapp_missing_at').eq('user_id', userId).order('id'));
const aliases = new Map();
for (const [scope, build] of [
  [userId, () => client.from('building_aliases').select('alias_key,canonical_name').eq('user_id', userId).order('id')],
  ['*', () => client.from('building_aliases').select('alias_key,canonical_name').eq('is_global', true).order('id')],
]) {
  for (const row of await read(build)) {
    const id = `${scope}:${row.alias_key}`;
    if (!aliases.has(id)) aliases.set(id, new Set());
    aliases.get(id).add(row.canonical_name);
  }
}
for (const row of await loadAutomaticAliases(client, [userId])) {
  const id = `${userId}:${row.alias_key}`;
  if (!aliases.has(id) && !aliases.has(`*:${row.alias_key}`)) aliases.set(id, new Set([row.canonical_name]));
}
const { matches, summary } = await loadTransactionBuildingMatches(client, leads, aliases, () => []);
const date = new Date();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const since = new Date(Date.parse(`${today}T00:00:00Z`) - 2 * 86400000).toISOString().slice(0, 10);
const transactions = await read(() => client.from('transactions').select('id,building_key,date,amount').gte('date', since).lte('date', today).gte('amount', 100000).order('id'));
const groups = new Map();
for (const lead of leads) {
  const match = matches.get(`${userId}|${lead.building}`);
  if (!groups.has(lead.building)) groups.set(lead.building, { building: lead.building, match, leads: 0, neverContacted: 0, outsideCooldown: 0,
    recentSales: transactions.filter(row => row.building_key === match?.key).length });
  const group = groups.get(lead.building);
  group.leads += 1;
  if (!lead.sent_at) group.neverContacted += 1;
  if (!lead.whatsapp_missing_at && (!lead.sent_at || date - new Date(lead.sent_at) >= 7 * 86400000)) group.outsideCooldown += 1;
}
console.log(JSON.stringify({ today, since, userId, summary, buildings: [...groups.values()] }, null, 2));
if (process.argv.includes('--worker-dry-run')) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/seller-signal-auto-whatsapp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(env.SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN ? { 'x-auto-whatsapp-token': env.SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN } : {}) },
    body: JSON.stringify({ dryRun: true, userId }), signal: AbortSignal.timeout(120000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Worker dry run HTTP ${response.status}: ${JSON.stringify(result)}`);
  console.log(JSON.stringify({ worker: result }, null, 2));
}
