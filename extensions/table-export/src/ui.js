import { combineCaptures, fields, groupBuildings, inferMapping, validateMapping } from './records.js';
import { createExport } from './export.js';

function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (className) el.className = className;
  return el;
}
function option(value, label) { const el = node('option', label); el.value = value; return el; }
export function mountWorkspace(host, bridge) {
  host.innerHTML = `<div class="brand"><span>↗</span> Repeat AI</div><h1>Turn tables into spreadsheets.</h1>
    <p class="muted">Collect the current sheet, choose your buildings, and get an Excel file for each one.</p>
    <div id="message" role="status" aria-live="polite"></div>
    <section class="card"><h2>1. Collect a sheet</h2><p class="muted">Keep the source tab open. Scanning scrolls the table and follows Next buttons. Your existing filters stay in effect.</p>
    <label>Source table<select id="table" aria-label="Source table"></select></label>
    <div class="row"><label>Wait for each load<select id="speed"><option value="650">Normal · 0.65 seconds</option><option value="1500">Slow page · 1.5 seconds</option><option value="3000">Very slow · 3 seconds</option></select></label>
    <label>Expected rows (optional)<input id="expected" type="number" min="1" max="100000" placeholder="Total shown by your sheet"></label></div>
    <label class="check"><input id="paginate" type="checkbox" checked>Follow Next buttons through all pages</label>
    <div class="row"><button id="refresh">Refresh tables</button><button id="scan" class="primary">Collect this sheet</button><button id="stop" hidden>Stop</button></div>
    <div id="captures"></div><p class="muted"><small>To add another worksheet, open it in the source tab, then refresh tables and collect again. Keep this window open; captured data is held only in memory.</small></p></section>
    <section id="review" hidden><div class="card"><h2>2. Check your columns</h2><div id="mapping" class="mapping"></div><p id="totals" class="muted"></p><div id="preview" class="preview"></div></div>
    <div class="card"><h2>3. Choose buildings</h2><input id="search" type="search" aria-label="Find a building" placeholder="Find a building…"><div class="row"><button id="all" class="quiet">Select all shown</button><button id="none" class="quiet">Clear selection</button></div><div id="buildings" class="buildings"></div>
    <label id="confirm-wrap" class="check"><input id="confirm" type="checkbox">I checked the captured totals against the source sheets where no total was available.</label></div>
    <div class="footer"><p id="selection" class="muted"></p><button id="download" class="primary">Download building spreadsheets (.zip)</button><p><small>Files stay on your device. Upload the Excel files through Repeat AI’s existing importer. This tool sends no messages.</small></p></div></section>`;
  const $ = id => host.querySelector(`#${id}`);
  let captures = [], data = { rows: [], columns: [], duplicates: 0 }, mapping = {}, groups = [], selected = new Set(), running = false, exporting = false;
  let pollTimer;
  function message(value, kind = '') { $('message').textContent = value; $('message').className = value ? `notice ${kind}` : ''; }
  function buttons() {
    $('scan').disabled = running || exporting || !$('table').value;
    $('refresh').disabled = running || exporting; $('table').disabled = running || exporting;
    $('stop').hidden = !running;
    const issue = validateMapping(mapping);
    const blocked = captures.some(c => c.issues.length || !c.finished);
    const unknown = captures.some(c => !c.verified);
    $('confirm-wrap').hidden = !unknown;
    const chosen = groups.filter(g => selected.has(g.key));
    $('selection').textContent = issue || `${chosen.length} buildings · ${chosen.reduce((n, g) => n + g.rows.length, 0).toLocaleString()} records${blocked ? ' · Remove incomplete captures to download.' : ''}`;
    $('download').disabled = running || exporting || !!issue || blocked || !chosen.length || (unknown && !$('confirm').checked);
    host.querySelectorAll('#mapping select,#search,#all,#none,#confirm,#buildings input,[data-remove]').forEach(el => { el.disabled = running || exporting || el.dataset.missing === 'true'; });
  }
  function renderGroups(reset = false) {
    groups = groupBuildings(data.rows, mapping);
    if (reset) selected = new Set(groups.filter(g => g.key).map(g => g.key));
    const search = $('search').value.toLowerCase(); $('buildings').replaceChildren();
    for (const group of groups.filter(g => g.name.toLowerCase().includes(search))) {
      const label = node('label', undefined, 'building'), input = node('input'); input.type = 'checkbox'; input.checked = selected.has(group.key); input.disabled = !group.key; input.dataset.missing = String(!group.key); input.setAttribute('aria-label', group.name);
      input.onchange = () => { input.checked ? selected.add(group.key) : selected.delete(group.key); buttons(); };
      const title = node('span', group.name);
      if (group.missingPhone || group.missingName || group.phoneNeedsReview || !group.key) title.append(node('small', !group.key ? 'Excluded: no building value' : `${group.missingPhone} missing phones · ${group.phoneNeedsReview} phones to review · ${group.missingName} missing names`));
      label.append(input, title, node('b', `${group.rows.length.toLocaleString()} records`)); $('buildings').append(label);
    }
    buttons();
  }
  function renderData() {
    data = combineCaptures(captures); mapping = inferMapping(data.columns); $('confirm').checked = false;
    $('review').hidden = !data.rows.length; $('mapping').replaceChildren();
    for (const [field, title] of Object.entries(fields)) {
      const label = node('label', title), select = node('select'); select.setAttribute('aria-label', `${title} column`); select.append(option('', 'Not mapped'));
      for (const col of data.columns) select.append(option(col.id, col.label));
      select.value = mapping[field]; select.onchange = () => { mapping[field] = select.value; renderGroups(true); };
      label.append(select); $('mapping').append(label);
    }
    $('totals').textContent = `${data.rows.length.toLocaleString()} records · ${data.columns.length} columns · ${data.duplicates} exact duplicates skipped. Preview: first five records. All source columns are retained.`;
    const table = node('table'), head = node('tr');
    data.columns.forEach(c => head.append(node('th', c.label))); table.append(head);
    data.rows.slice(0, 5).forEach(row => { const tr = node('tr'); data.columns.forEach(c => tr.append(node('td', row[c.id] || ''))); table.append(tr); });
    $('preview').replaceChildren(table); renderGroups(true);
  }
  function renderCaptures() {
    $('captures').replaceChildren();
    captures.forEach((capture, index) => {
      const item = node('div', undefined, 'capture');
      item.append(node('strong', `Capture ${index + 1} · ${capture.rows.length.toLocaleString()} records`));
      item.append(node('p', capture.verified ? `Count matches the expected total (${capture.expectedSource || 'source'}).` : capture.issues.join(' ') || 'End reached. The source does not publish a total; check the count before downloading.', capture.verified ? 'muted' : 'notice warning'));
      const remove = node('button', 'Remove capture', 'quiet'); remove.dataset.remove = 'true'; remove.onclick = () => { captures.splice(index, 1); renderCaptures(); renderData(); }; item.append(remove); $('captures').append(item);
    });
  }
  async function refresh() {
    message('Finding readable tables…'); $('table').replaceChildren(); buttons();
    try {
      const tables = await bridge.discover();
      for (const table of tables) $('table').append(option(String(table.id), table.label));
      message(tables.length ? 'Choose the table you want to collect.' : 'No readable table found. Open the sheet first. Canvas-only grids and inaccessible frames need a different view.', tables.length ? '' : 'warning');
    } catch { message('Could not access the source tab. Keep it open and click the extension on that page again.', 'error'); }
    buttons();
  }
  async function poll() {
    try {
      const state = await bridge.poll();
      if (state.status === 'running') { message(`Collecting ${(state.progress?.rows || 0).toLocaleString()} records · page ${state.progress?.pages || 1}. Leave the source table unchanged.`); pollTimer = setTimeout(poll, 700); return; }
      running = false;
      if (state.status === 'done') {
        captures.push(state.result); renderCaptures(); renderData(); await bridge.clear();
        message(state.result.issues.length ? 'Capture needs attention. Review the issue below before exporting.' : 'Sheet collected. Choose your buildings below, or add another sheet.', state.result.issues.length ? 'warning' : '');
      } else message(state.message || 'The scan ended unexpectedly. Collect the sheet again.', 'error');
    } catch { running = false; message('The source page changed or closed during collection. This scan was not added. Refresh tables and try again.', 'error'); }
    buttons();
  }
  $('refresh').onclick = refresh;
  $('table').onchange = buttons;
  $('scan').onclick = async () => {
    running = true; buttons(); message('Starting collection…');
    try { await bridge.start($('table').value, { waitMs: Number($('speed').value), expectedRows: Number($('expected').value) || null, paginate: $('paginate').checked }); await poll(); }
    catch { running = false; message('Could not start the scan. Refresh tables and try again.', 'error'); buttons(); }
  };
  $('stop').onclick = async () => { await bridge.cancel(); message('Stopping collection…'); };
  $('search').oninput = () => renderGroups();
  $('all').onclick = () => { groups.filter(g => g.key && g.name.toLowerCase().includes($('search').value.toLowerCase())).forEach(g => selected.add(g.key)); renderGroups(); };
  $('none').onclick = () => { selected.clear(); renderGroups(); };
  $('confirm').onchange = buttons;
  $('download').onclick = async () => {
    exporting = true; buttons();
    try {
      const result = await createExport({ ...data, mapping, captures, groups: groups.filter(g => selected.has(g.key)) }, message);
      const url = URL.createObjectURL(new Blob([result.zip], { type: 'application/zip' }));
      const anchor = node('a'); anchor.href = url; anchor.download = `Repeat-AI-buildings-${new Date().toISOString().slice(0, 10)}.zip`; host.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      message(`Download prepared: ${result.report.files.length} Excel files, ${result.report.totalExported.toLocaleString()} records. Unzip and upload the Excel files to Repeat AI.`);
    } catch (cause) { message(cause.message || 'The spreadsheets could not be generated. Choose fewer buildings and try again.', 'error'); }
    exporting = false; buttons();
  };
  refresh();
  return () => { clearTimeout(pollTimer); bridge.cancel(); host.replaceChildren(); };
}
