import '../src/agent.js';
import { mountWorkspace } from '../src/ui.js';
import { scanTable } from '../src/scan.js';
import { createFixture } from './fixture.js';
import { combineCaptures, inferMapping, groupBuildings } from '../src/records.js';
import { createExport } from '../src/export.js';
import * as XLSX from 'xlsx';

const fixture = createFixture(); let building = '';
function reset() { fixture.setup(document.querySelector('#mode').value, Math.min(26414, Math.max(1, Number(document.querySelector('#row-count').value) || 144)), building); }
reset();
document.querySelector('#reset').onclick = reset;
document.querySelectorAll('[data-building]').forEach(button => { button.onclick = () => { building = button.dataset.building; document.querySelectorAll('[data-building]').forEach(b => b.setAttribute('aria-selected', String(b === button))); reset(); }; });
const agent = globalThis.__repeatTableExporter;
mountWorkspace(document.querySelector('#app'), {
  discover: async () => agent.discover(), start: async (id, options) => agent.start(Number(id), options),
  poll: async () => agent.poll(), cancel: async () => agent.cancel(), clear: async () => agent.clear(),
});
document.querySelector('#run-checks').onclick = async () => {
  const output = document.querySelector('#checks'), button = document.querySelector('#run-checks');
  if (agent.poll().status === 'running') { output.textContent = 'Stop the current collection first.'; return; }
  button.disabled = true; document.querySelector('#app').inert = true; document.querySelector('#source-container').inert = true; output.textContent = 'Running the real collector against synthetic tables…\n';
  let passed = 0;
  try {
    for (const mode of ['static', 'virtual', 'slow virtual', 'pagination', 'lazy', 'unknown', 'mismatch']) {
      fixture.setup(mode === 'slow virtual' ? 'virtual' : mode, 72, '', { renderDelayMs: mode === 'slow virtual' ? 900 : 0 });
      const trace = [], started = performance.now();
      const capture = await scanTable(fixture.root, { maxMs: 120000, trace: value => trace.push(value) });
      const elapsed = ((performance.now() - started) / 1000).toFixed(1);
      if (capture.rows.length !== 72 || capture.issues.length && mode !== 'mismatch') throw new Error(`${mode}: captured ${capture.rows.length}/72. ${capture.issues.join('; ')} Trace: ${JSON.stringify(trace)}`);
      if (mode === 'mismatch' ? !capture.issues.length : !!capture.issues.length) throw new Error(`${mode}: ${capture.issues.join('; ') || 'should report mismatch'}`);
      if (mode === 'unknown' && capture.verified) throw new Error('Unknown total must require review');
      if (!['unknown', 'mismatch'].includes(mode) && !capture.verified) throw new Error(`${mode}: count not verified`);
      if (mode === 'virtual') {
        const data = combineCaptures([capture]), mapping = inferMapping(data.columns), groups = groupBuildings(data.rows, mapping);
        const exported = await createExport({ ...data, groups, mapping, captures: [capture] });
        if (exported.report.files.length !== 3 || exported.report.totalExported !== 72) throw new Error('Wrong workbook split');
        for (const file of exported.files.filter(f => f.name.endsWith('.xlsx'))) {
          const wb = XLSX.read(file.data, { type: 'array' });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets.Sellers, { header: 1, raw: false });
          if (rows.length !== 25 || !rows[0].includes('Phone')) throw new Error('Spreadsheet round trip failed');
        }
      }
      output.textContent += `PASS ${mode}: 72 rows, ${capture.columns.length} columns, ${elapsed}s${mode === 'mismatch' ? ', download correctly blocked' : ''}\n`; passed++;
    }
    fixture.setup('pagination', 72);
    const pageOnly = await scanTable(fixture.root, { waitMs: 100, idleMs: 350, paginate: false, expectedRows: 24 });
    if (!pageOnly.verified || pageOnly.rows.length !== 24) throw new Error('Explicit single-page collection failed');
    passed++; output.textContent += 'PASS single page: 24/24, ready to add another page\n';
    fixture.setup('static', 6);
    const wrongManualTotal = await scanTable(fixture.root, { waitMs: 100, idleMs: 350, expectedRows: 5 });
    if (wrongManualTotal.verified || !wrongManualTotal.issues.length) throw new Error('Entered total must not override a conflicting source total');
    passed++; output.textContent += 'PASS conflicting entered total: download blocked\n';
    fixture.setup('virtual', 100);
    const controller = new AbortController();
    const stopped = await scanTable(fixture.root, { waitMs: 100, idleMs: 350 }, () => controller.abort(), controller.signal);
    if (stopped.finished || !stopped.issues.length) throw new Error('Cancellation must mark partial data');
    passed++; output.textContent += 'PASS cancellation: partial capture blocked\n';
    output.textContent += `${passed} browser checks passed. Excel round trips passed. Reset the sample and refresh tables to try it yourself.`;
  } catch (error) { output.textContent += `FAIL ${error.message}`; }
  finally { button.disabled = false; document.querySelector('#app').inert = false; document.querySelector('#source-container').inert = false; reset(); }
};
