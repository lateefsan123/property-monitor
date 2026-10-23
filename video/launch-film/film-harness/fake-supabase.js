// Film-only Supabase stub. Vite aliases redirect supabase imports here.
// All queries resolve from in-memory state. No network. No auth. No real data.

const statuses = [];
let automationSettings = {
  auto_whatsapp_enabled: true,
  monthly_reports_enabled: false,
  monthly_report_daily_share: 10,
  send_window_start_hour: 9,
  send_window_end_hour: 21,
  send_interval_minutes: 15,
  daily_message_limit: 40,
  status_followups_enabled: true,
  nearby_sales_enabled: false,
};

function resolve(data) {
  // Only the query builder is thenable. A response that resolves to itself
  // recursively re-enters Promise assimilation and never settles.
  return { data, error: null };
}

function makeBuilder(table) {
  const state = { table, filters: {}, op: null, payload: null, isSingle: false };

  function finish() {
    const { table: t, op, payload, filters } = state;

    if (t === 'seller_signal_statuses') {
      if (op === 'insert') {
        const row = { ...payload, id: `film-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString() };
        statuses.push(row);
        return resolve(row);
      }
      if (op === 'update') {
        const idx = statuses.findIndex(s => s.id === filters.id);
        if (idx >= 0) Object.assign(statuses[idx], payload);
        return resolve(idx >= 0 ? statuses[idx] : null);
      }
      if (op === 'delete') {
        const idx = statuses.findIndex(s => s.id === filters.id);
        if (idx >= 0) statuses.splice(idx, 1);
        return resolve(null);
      }
      return resolve(state.isSingle ? (statuses[0] || null) : [...statuses]);
    }

    if (t === 'seller_signal_automation_settings') {
      if (op === 'upsert') {
        Object.assign(automationSettings, payload);
        return resolve({ ...automationSettings });
      }
      return resolve(state.isSingle ? { ...automationSettings } : { ...automationSettings });
    }

    if (t === 'whatsapp_accounts') {
      return resolve([{
        id: 'film-wa', user_id: 'film-user', phone_number: '+971501234567',
        status: 'connected', display_name: 'Sara Haddad', created_at: new Date().toISOString(),
      }]);
    }

    if (t === 'leads') {
      if (op === 'update') return resolve(null);
      return resolve([]);
    }

    return resolve(state.isSingle ? null : []);
  }

  const chain = {
    select() { return chain; },
    eq(col, val) { state.filters[col] = val; return chain; },
    in() { return chain; },
    order() { return chain; },
    limit() { return chain; },
    gte() { return chain; },
    lte() { return chain; },
    maybeSingle() { state.isSingle = true; return chain; },
    single() { state.isSingle = true; return chain; },
    insert(row) { state.op = 'insert'; state.payload = row; return chain; },
    update(row) { state.op = 'update'; state.payload = row; return chain; },
    upsert(row, opts) { state.op = 'upsert'; state.payload = row; return chain; },
    delete() { state.op = 'delete'; return chain; },
    abortSignal() { return chain; },
    // Make chain awaitable — this is what react-query and service fns do
    then(onResolve, onReject) {
      return Promise.resolve(finish()).then(onResolve, onReject);
    },
    catch(fn) { return Promise.resolve(finish()).catch(fn); },
  };
  return chain;
}

export const supabase = {
  from: (table) => makeBuilder(table),
  auth: {
    getSession: () => Promise.resolve({
      data: { session: { user: {
        id: 'film-user', email: 'sara@broker.ae',
        user_metadata: { username: 'Sara Haddad', full_name: 'Sara Haddad' },
      } } },
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: () => Promise.resolve({ data: { user: { id: 'film-user' } } }),
  },
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }),
  removeChannel: () => {},
};

export const supabaseConfigError = null;
export const hasAuthConnectionFailure = () => false;
