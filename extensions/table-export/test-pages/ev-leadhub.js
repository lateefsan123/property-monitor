// A stand-in for E&V LeadHub: 392 contacts, 100 a page, an unlabelled icon pager
// with a "1/4" box above the table, and a brand-new <table> on every page.
import { scanTable } from '../src/scan.js';
import { expectedRows, snapshot } from '../src/dom.js';
import { combineCaptures, inferMapping, groupBuildings } from '../src/records.js';
import { createExport } from '../src/export.js';
import { mountWorkspace } from '../src/ui.js';

const params = new URLSearchParams(location.search);
const replaceTable = params.get('replace') !== '0';
const pagerStyle = params.get('pager') || 'box'; // box: no hints; hint: chevron class, no box
const TOTAL = 392, PER = 100, PAGES = Math.ceil(TOTAL / PER);
document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:750px;overflow-x:auto}table{width:1800px;table-layout:fixed}td,th{padding:8px}#export-ui{margin:20px auto;max-width:560px;padding:24px}#export-ui table{width:auto}</style>');
let page = 1;
const arrow = (d) => `<svg viewBox="0 0 24 24" width="16" height="16"><path d="${d}" stroke="currentColor" fill="none"/></svg>`;

document.body.innerHTML = `
  <div class="app"><div class="toolbar">
    <span>${TOTAL} Results</span>
    <span>Page results: <b>${PER}</b></span>
    <button id="prev" type="button" ${pagerStyle === 'hint' ? 'class="btn icon-chevron-left"' : ''}>${arrow('M15 6l-6 6 6 6')}</button>
    ${pagerStyle === 'box' ? '<span id="box"></span>' : ''}
    <button id="next" type="button" ${pagerStyle === 'hint' ? 'class="btn icon-chevron-right"' : ''}>${arrow('M9 6l6 6-6 6')}</button>
  </div><div id="wrap"></div></div>`;

function render() {
  const rows = [];
  for (let i = (page - 1) * PER; i < Math.min(TOTAL, page * PER); i++) {
    rows.push(`<tr><td><input type=checkbox></td><td><button>⌄</button></td><td><button>…</button></td><td>Contact ${i + 1}</td><td>Seller</td><td>Advisor</td><td>Follow up</td><td>Advisor</td><td>Today</td><td>contact${i + 1}@example.invalid</td><td>+97150${String(i).padStart(7, '0')}</td></tr><tr><td colspan=11>Contact details ${i + 1}</td></tr>`);
  }
  const html = `<table><thead><tr><th><input type=checkbox></th><th></th><th>ACTIONS</th><th>Name</th><th>Intent</th><th>Real Estate Advisor</th><th>Valid Interaction</th><th>Valid Interaction Advisor</th><th>Last Activity</th><th>Email</th><th>Phone</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  const wrap = document.getElementById('wrap');
  if (replaceTable || !wrap.firstChild) wrap.innerHTML = html;
  else wrap.querySelector('tbody').innerHTML = rows.join('');
  const box = document.getElementById('box');
  if (box) box.textContent = `${page}/${PAGES}`;
}
document.getElementById('next').onclick = () => {
  // Like many CRMs: the arrow stays enabled on the last page and does nothing.
  if (page >= PAGES) return;
  document.getElementById('wrap').innerHTML = '';
  setTimeout(() => { page += 1; render(); }, 250);
};
render();

window.__run = async () => {
  const result = await scanTable(document.querySelector('table'), { waitMs: 120, idleMs: 400 });
  const data = combineCaptures([result]), mapping = inferMapping(data.columns);
  const output = result.verified ? await createExport({ ...data, mapping, captures: [result], groups: groupBuildings(data.rows, mapping) }) : null;
  window.__capture = result;
  window.__output = output;
  return { files: output?.report.files, exported: output?.report.totalExported, expected: expectedRows(document.querySelector('table')), rows: result.rows.length, pages: result.pages, verified: result.verified, issues: result.issues };
};

const ui = document.createElement('section'); ui.id = 'export-ui'; document.body.append(ui);
mountWorkspace(ui, {
  discover: async () => [{ id: 'contacts', label: 'LeadHub contacts' }],
  start: async () => {},
  poll: async () => ({ status: 'done', result: window.__capture }),
  clear: async () => {}, cancel: async () => {},
});
window.__snapshot = () => snapshot(document.querySelector('table'));
