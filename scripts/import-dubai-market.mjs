import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readEnvMap, getEnvValue } from './import-dld-transactions.mjs';
import { buildDubaiMarket, dateWindow, fetchDubaiExport } from './lib/dubai-market.mjs';

export async function syncDubaiMarket(market, rpc) {
  // Each batch is atomic. Reruns safely resume after any failure using DLD IDs.
  let synced = 0;
  const byKey = new Map(market.buildings.map(b => [b.key, b]));
  for (let offset = 0; offset < market.transactions.length; offset += 500) {
    const batch = market.transactions.slice(offset, offset + 500);
    const buildings = [...new Set(batch.map(t => t.building_key))].map(key => byKey.get(key));
    await rpc(buildings, batch);
    synced += batch.length;
  }
  return synced;
}

async function connectSync(env) {
  const url = getEnvValue(env, ['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const key = getEnvValue(env, ['SUPABASE_SERVICE_ROLE_KEY']);
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return { close: async () => {}, rpc: async (buildings, transactions) => {
      const { error } = await client.rpc('sync_dld_citywide', { p_buildings: buildings, p_transactions: transactions });
      if (error) throw new Error(error.message);
    } };
  }
  const raw = getEnvValue(env, ['SUPABASE_DB_URL']);
  if (!raw) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY with SUPABASE_URL, or SUPABASE_DB_URL.');
  const db = new URL(raw);
  const host = getEnvValue(env, ['SUPABASE_DB_HOST']) || db.hostname;
  const client = new pg.Client({
    host, port: Number(getEnvValue(env, ['SUPABASE_DB_PORT']) || db.port || 5432),
    user: getEnvValue(env, ['SUPABASE_DB_USER']) || decodeURIComponent(db.username),
    password: decodeURIComponent(db.password), database: db.pathname.slice(1) || 'postgres',
    ssl: { rejectUnauthorized: getEnvValue(env, ['SUPABASE_DB_SSL_VERIFY']) !== 'false' },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  return { close: () => client.end(), rpc: (buildings, transactions) => client.query(
    'select public.sync_dld_citywide($1::jsonb, $2::jsonb)', [JSON.stringify(buildings), JSON.stringify(transactions)],
  ) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node scripts/import-dubai-market.mjs --live [--days=120] [--dry-run]\n  or --input=<csv-file> [--days=120] [--dry-run]\nOptional: --output=<report.json> --save-csv=<file>\nOnly source-labelled DLD rows are upserted. Existing cache and account data are preserved.');
    return;
  }
  for (const arg of args) if (!/^(--live|--dry-run|--days=.+|--input=.+|--output=.+|--save-csv=.+)$/.test(arg)) throw new Error(`Unknown argument: ${arg}`);
  const option = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const period = dateWindow(Number(option('days') || process.env.DLD_LIVE_DAYS || 120));
  const input = option('input');
  if ((!input && !args.includes('--live')) || (input && args.includes('--live'))) throw new Error('Choose exactly one of --live or --input=<file>.');
  const csv = input ? await fs.readFile(input, 'utf8') : await fetchDubaiExport(period);
  if (option('save-csv')) {
    await fs.mkdir(path.dirname(option('save-csv')), { recursive: true });
    await fs.writeFile(option('save-csv'), csv);
  }
  const market = buildDubaiMarket(csv, period);
  if (!market.transactions.length) throw new Error('No eligible transactions; refusing sync.');
  const report = { generatedAt: new Date().toISOString(), dryRun: args.includes('--dry-run'), ...market.summary };
  if (!report.dryRun) {
    const sync = await connectSync(await readEnvMap());
    try { report.synced = await syncDubaiMarket(market, sync.rpc); } finally { await sync.close(); }
  }
  const output = option('output') || 'reports/dubai-market-coverage.json';
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, areas: report.areas.length, report: output }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
