// Film mode only (EXPO_PUBLIC_FILM=1, see metro.config.js): replaces the real
// Supabase client with an in-memory backend seeded from ./fixtures, so the
// real app renders every screen offline. Nothing is sent anywhere.
import {
  AUTOMATION_SETTINGS, BUILDING_SCHEDULES, FILM_USER, IMPORT_SHEET_CSV, LEADS, LEAD_SOURCES, LISTING_ALERTS_STATE,
  MESSAGE_TEMPLATES, WATCHLISTS, WATCH_BUILDINGS, WHATSAPP_ACCOUNTS, WHATSAPP_MESSAGES, buildingNameForKey, transactionsFor,
} from './fixtures';

const clone = (value) => JSON.parse(JSON.stringify(value));
const db = {
  leads: clone(LEADS),
  sent_leads: [],
  lead_sources: clone(LEAD_SOURCES),
  whatsapp_messages: clone(WHATSAPP_MESSAGES),
  seller_signal_send_alerts: [],
  seller_signal_message_templates: clone(MESSAGE_TEMPLATES),
  whatsapp_accounts: clone(WHATSAPP_ACCOUNTS),
  seller_signal_automation_settings: clone(AUTOMATION_SETTINGS),
  seller_signal_building_schedules: clone(BUILDING_SCHEDULES),
  building_aliases: [],
  building_resolutions: [],
  listing_alerts_watchlists: clone(WATCHLISTS),
  listing_alerts_tracked_listings: [],
  listing_alerts_state: clone(LISTING_ALERTS_STATE),
  notification_tokens: [],
};
let nextId = 1000;
const ok = (data, extra = {}) => ({ data, error: null, ...extra });
const same = (a, b) => (a === null || a === undefined ? b === null || b === undefined : String(a) === String(b));

class Query {
  constructor(table) {
    this.table = table; this.op = 'select'; this.filters = []; this.eqs = {}; this.inValues = {};
    this.orders = []; this.from = null; this.to = null; this.max = null; this.mode = null; this.options = {}; this.returning = false;
  }
  select(_columns, options = {}) { if (this.op === 'select') this.options = options; else this.returning = true; return this; }
  eq(column, value) { this.eqs[column] = value; this.filters.push((row) => same(row[column], value)); return this; }
  neq(column, value) { this.filters.push((row) => !same(row[column], value)); return this; }
  in(column, values) { this.inValues[column] = values; this.filters.push((row) => values.some((value) => same(row[column], value))); return this; }
  gt(column, value) { this.filters.push((row) => row[column] > value); return this; }
  gte(column, value) { this.filters.push((row) => row[column] >= value); return this; }
  lt(column, value) { this.filters.push((row) => row[column] < value); return this; }
  lte(column, value) { this.filters.push((row) => row[column] <= value); return this; }
  is(column, value) { this.filters.push((row) => (value === null ? row[column] == null : row[column] === value)); return this; }
  not(column, operator, value) { if (operator === 'is' && value === null) this.filters.push((row) => row[column] != null); return this; }
  or() { return this; }
  ilike(column, pattern) { const needle = String(pattern).replace(/%/g, '').toLowerCase(); this.filters.push((row) => String(row[column] || '').toLowerCase().includes(needle)); return this; }
  like(column, pattern) { return this.ilike(column, pattern); }
  order(column, { ascending = true } = {}) { this.orders.push([column, ascending]); return this; }
  range(from, to) { this.from = from; this.to = to; return this; }
  limit(count) { this.max = count; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  insert(payload) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload) { this.op = 'update'; this.payload = payload; return this; }
  upsert(payload, { onConflict = 'id' } = {}) { this.op = 'upsert'; this.payload = payload; this.conflict = onConflict.split(','); return this; }
  delete() { this.op = 'delete'; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }

  rows() {
    if (this.table === 'transactions') return this.eqs.building_key ? transactionsFor(this.eqs.building_key) : [];
    if (this.table === 'buildings') {
      const keys = this.inValues.key || [];
      return keys.map((key) => ({ key, search_name: buildingNameForKey(key), location_name: buildingNameForKey(key), location_id: null, source: 'film', source_project: null, source_area: 'Downtown Dubai' }));
    }
    db[this.table] = db[this.table] || [];
    return db[this.table];
  }

  finish(rows) {
    if (this.mode === 'single') return rows[0] ? ok(rows[0]) : { data: null, error: { code: 'PGRST116', message: 'No rows' } };
    if (this.mode === 'maybe') return ok(rows[0] || null);
    return ok(rows);
  }

  run() {
    const table = this.rows();
    const matches = () => table.filter((row) => this.filters.every((test) => test(row)));
    if (this.op === 'select') {
      let rows = this.table === 'buildings' || this.table === 'transactions' ? table : matches();
      for (const [column, ascending] of [...this.orders].reverse()) {
        rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
      }
      const count = rows.length;
      if (this.from !== null) rows = rows.slice(this.from, this.to + 1);
      if (this.max !== null) rows = rows.slice(0, this.max);
      const result = this.finish(clone(rows));
      return this.options.count ? { ...result, count } : result;
    }
    if (this.op === 'insert') {
      const inserted = [].concat(this.payload).map((row) => ({ id: row.id ?? (nextId += 1), ...row }));
      table.push(...inserted);
      return this.returning ? this.finish(clone(inserted)) : ok(null);
    }
    if (this.op === 'update') {
      const rows = matches();
      rows.forEach((row) => Object.assign(row, this.payload));
      return this.returning ? this.finish(clone(rows)) : ok(null);
    }
    if (this.op === 'upsert') {
      const saved = [].concat(this.payload).map((row) => {
        const existing = table.find((item) => this.conflict.every((column) => same(item[column], row[column])));
        if (existing) return Object.assign(existing, row);
        const created = { id: row.id ?? (nextId += 1), ...row };
        table.push(created);
        return created;
      });
      return this.returning ? this.finish(clone(saved)) : ok(null);
    }
    const doomed = matches();
    db[this.table] = table.filter((row) => !doomed.includes(row));
    return this.returning ? this.finish(clone(doomed)) : ok(null);
  }
}

const session = { access_token: 'film', refresh_token: 'film', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, user: FILM_USER };
const listeners = new Set();

async function sendMessage(body) {
  const sentAt = new Date().toISOString();
  db.whatsapp_messages.push({ id: `msg-live-${nextId += 1}`, user_id: FILM_USER.id, direction: 'outbound', status: 'sent', queued_at: sentAt, sent_at: sentAt, lead_id: body.leadId, send_source: body.sendSource || 'manual', initiated_via: 'app' });
  const lead = db.leads.find((row) => same(row.id, body.leadId));
  if (lead) lead.sent_at = sentAt;
  return { messageId: `film-${nextId}`, sentAt, status: 'sent' };
}

const FUNCTIONS = {
  'get-billing-access': () => ({ subscription: { source: 'complimentary', unlimited: true, status: 'active' } }),
  'create-billing-portal-session': () => ({ portalUrl: 'about:blank' }),
  'listing-alerts-sync': () => ({ ok: true }),
  'listing-photos': ({ listingId }) => {
    const listing = WATCH_BUILDINGS.flatMap((building) => building.listings).find((item) => same(item.id, listingId));
    return { photos: listing ? [listing.coverPhoto] : [] };
  },
  'whatsapp-profile-photo': () => ({ url: null }),
  'whatsapp-send-message': sendMessage,
  'whatsapp-connect-account': () => ({ account: { ...db.whatsapp_accounts[0] } }),
};

export const supabase = {
  from: (table) => new Query(table),
  rpc: async (name, args = {}) => {
    if (name === 'get_available_market_building_keys') return ok((args.target_keys || []).map((building_key) => ({ building_key })));
    return ok(null);
  },
  functions: {
    invoke: async (name, { body } = {}) => {
      const handler = FUNCTIONS[name];
      return handler ? ok(await handler(body || {})) : { data: null, error: { message: `Film mode: ${name} is not available` } };
    },
  },
  storage: {
    from: () => ({
      createSignedUrl: async () => ok({ signedUrl: null }),
      createSignedUrls: async (paths) => ok(paths.map((path) => ({ path, signedUrl: null }))),
      upload: async (path) => ok({ path }),
      getPublicUrl: (path) => ({ data: { publicUrl: path } }),
      remove: async () => ok([]),
    }),
  },
  auth: {
    getSession: async () => ok({ session }),
    getUser: async () => ok({ user: session.user }),
    refreshSession: async () => ok({ session, user: session.user }),
    setSession: async () => ok({ session, user: session.user }),
    signInWithPassword: async () => ok({ session, user: session.user }),
    signInWithOAuth: async () => ok({ url: null }),
    signInWithIdToken: async () => ok({ session, user: session.user }),
    signOut: async () => ({ error: null }),
    updateUser: async ({ data } = {}) => {
      session.user = { ...session.user, user_metadata: { ...session.user.user_metadata, ...data } };
      listeners.forEach((listener) => listener('USER_UPDATED', session));
      return ok({ user: session.user });
    },
    onAuthStateChange: (callback) => {
      listeners.add(callback);
      setTimeout(() => callback('INITIAL_SESSION', session), 0);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
  },
  channel: () => {
    const channel = { on: () => channel, subscribe: (callback) => { callback?.('SUBSCRIBED'); return channel; }, unsubscribe: async () => 'ok' };
    return channel;
  },
  removeChannel: async () => 'ok',
  removeAllChannels: async () => [],
};

// Raw fetch calls that bypass the client: Bayut search/watchlist, column
// mapping, repeatai.org integrations and Google Sheets CSV export.
const json = (value) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
const realFetch = globalThis.fetch?.bind(globalThis);
const INTEGRATIONS = [
  { provider: 'google', feature: 'sheets', connected: true, configured: true, canBrowse: true, canReadWorkbook: true },
  { provider: 'microsoft', feature: 'sheets', connected: false, configured: true },
  { provider: 'google', feature: 'email', connected: true, configured: true },
  { provider: 'google', feature: 'calendar', connected: true, configured: true },
];
// Ask Repeat's scripted answer, consistent with the fixtures (Act One: 5 drops, Sara and Maya due).
const ASSISTANT_REPLY = 'Yes, 5 this month. The biggest is a 2 bed on a high floor, down AED 200K to AED 3.0M.\n\nSara Haddad and Maya Cohen own in Act One and are due today. Want me to send them the transaction update?';
globalThis.fetch = async (input, init = {}) => {
  const url = String(typeof input === 'string' ? input : input?.url || '');
  let body = {};
  try { body = init.body ? JSON.parse(init.body) : {}; } catch { body = {}; }
  if (url.includes('/functions/v1/bayut-alerts')) {
    if (body.mode === 'search') {
      const query = String(body.query || '').toLowerCase();
      return json({ locations: WATCH_BUILDINGS.filter((b) => b.buildingName.toLowerCase().includes(query)).map((b) => ({ locationId: b.locationId, buildingName: b.buildingName, searchName: b.buildingName, fullPath: `Dubai > Downtown Dubai > ${b.buildingName}` })) });
    }
    const ids = (body.locations || []).map((location) => String(location.locationId ?? location.location_id ?? location));
    return json({ buildings: WATCH_BUILDINGS.filter((b) => ids.includes(String(b.locationId))) });
  }
  if (url.includes('/functions/v1/map-columns')) return json({ mapping: null });
  if (url.includes('/api/integrations')) {
    if (body.action === 'status') return json({ connections: INTEGRATIONS });
    if (body.action === 'email_summary') return json({ enabled: false, available: true, connected: false, status: 'waiting', providers: [] });
    if (body.action === 'read' && body.feature === 'sheets') {
      const operation = body.input?.operation || body.operation;
      if (operation === 'tabs') return json({ items: [{ name: 'Sellers' }] });
      if (operation === 'rows') return json({ kind: 'sheet-import', rows: IMPORT_SHEET_CSV.split('\n').map((line) => line.split(',')) });
      return json({ kind: 'file-list', items: [{ id: 'film-business-bay', name: 'Downtown owners - September', folder: 'My Drive', spreadsheet: true }], nextPageToken: null });
    }
    return json({ items: [], hasMore: false });
  }
  if (url.includes('/api/voice') && body.action === 'chat') {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return json({ output: [{ role: 'assistant', content: ASSISTANT_REPLY }] });
  }
  if (url.includes('docs.google.com/spreadsheets')) return new Response(IMPORT_SHEET_CSV, { status: 200, headers: { 'Content-Type': 'text/csv' } });
  if (url.includes('supabase.co') || url.includes('repeatai.org')) return json({});
  return realFetch(input, init);
};

if (typeof window !== 'undefined') window.__film = { db };
