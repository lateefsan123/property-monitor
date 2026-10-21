import { discoverTables } from './dom.js';
import { scanTable } from './scan.js';

// This state lives only in the extension's isolated world, never in the page's
// application state or localStorage. No cookies, private APIs or sessions read.
if (!globalThis.__repeatTableExporter) {
  let tables = [], controller, state = { status: 'idle' }, heartbeat = Date.now();
  globalThis.__repeatTableExporter = {
    discover() {
      if (state.status === 'running') throw new Error('Stop the current scan before choosing another table.');
      tables = discoverTables();
      return tables.map(({ label, view }, id) => ({ id, label, columns: view.columns, visibleRows: view.rows.length }));
    },
    start(id, options) {
      if (state.status === 'running') throw new Error('A scan is already running in this tab.');
      const table = tables[id];
      if (!table) throw new Error('Refresh tables and select the current sheet.');
      controller = new AbortController(); heartbeat = Date.now(); state = { status: 'running', progress: {} };
      const watchdog = setInterval(() => { if (Date.now() - heartbeat > 20000) controller.abort(); }, 5000);
      scanTable(table.root, options, progress => { state.progress = progress; }, controller.signal)
        .then(result => { state = { status: 'done', result }; })
        .catch(() => { state = { status: 'error', message: 'The page could not be read. Refresh tables and try again.' }; })
        .finally(() => clearInterval(watchdog));
      return true;
    },
    poll() { heartbeat = Date.now(); return state; },
    cancel() { controller?.abort(); },
    clear() { if (state.status !== 'running') state = { status: 'idle' }; },
  };
}
