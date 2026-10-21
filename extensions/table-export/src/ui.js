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
  host.innerHTML = `<div class="brand"><span>↗</span> Repeat AI</div><h1>Export your sellers</h1>
    <p class="muted">Choose your buildings. Get a spreadsheet for each one.</p>
    <div id="message" role="status" aria-live="polite"></div>
    <section class="card"><h2 id="collect-title">Open your seller list</h2><p id="collect-hint" class="muted">Keep it open, then click below. We’ll take care of the rest.</p>
    <label id="table-wrap" hidden>Which table has your sellers?<select id="table" aria-label="Source table"></select></label>
    <div class="row"><button id="scan" class="primary">Find my sellers</button><button id="stop" hidden>Stop</button></div>
    <details id="scan-options" hidden><summary>Help with this sheet</summary><p class="muted">Try allowing extra time, or collect one page at a time.</p>
    <div class="row"><label>Loading time<select id="speed"><option value="650">Automatic</option><option value="1500">Allow extra time</option><option value="3000">Allow more time</option></select></label>
    <label>Expected rows (optional)<input id="expected" type="number" min="1" max="100000" placeholder="Total shown by your sheet"></label></div>
    <label class="check"><input id="paginate" type="checkbox" checked>Include every page</label><button id="refresh" class="quiet">Find tables again</button></details>
    <div id="captures"></div><p id="add-hint" class="muted" hidden><small>Need another sheet? Open it in the source tab, then collect again. Keep this window open.</small></p></section>
    <section id="review" hidden><div class="card"><h2>Choose your buildings</h2>
    <p id="totals" class="muted"></p><details id="column-review"><summary id="column-summary">Preview leads &amp; edit columns</summary><p id="mapping-hint" class="muted"></p><div id="mapping" class="mapping"></div><div id="preview" class="preview"></div></details>
    <input id="search" type="search" aria-label="Find a building" placeholder="Find a building…"><div class="row"><button id="all" class="quiet">Select all shown</button><button id="none" class="quiet">Clear selection</button></div><div id="buildings" class="buildings"></div>
    <label id="confirm-wrap" class="check"><input id="confirm" type="checkbox">I checked the captured totals against the source sheets where no total was available.</label></div>
    <div class="footer"><p id="selection" class="muted"></p><button id="download" class="primary">Download spreadsheets</button><p><small>Next, add these spreadsheets to Repeat AI.</small></p></div></section>`;
  const $ = id => host.querySelector(`#${id}`);
  let captures = [], data = { rows: [], columns: [], duplicates: 0 }, mapping = {}, groups = [], selected = new Set(), running = false, exporting = false;
  let pollTimer, discovering = false, tableCount = 0;
  function message(value, kind = '') { $('message').textContent = value; $('message').className = value ? `notice ${kind}` : ''; if (kind === 'error') $('scan-options').hidden = false; }
  function buttons() {
    $('scan').disabled = running || exporting || discovering || !$('table').value;
    $('refresh').disabled = running || exporting || discovering; $('table').disabled = running || exporting || discovering;
    host.querySelectorAll('#speed,#expected,#paginate').forEach(el => { el.disabled = running || exporting; });
    $('stop').hidden = !running;
    const issue = validateMapping(mapping);
    const blocked = captures.some(c => c.issues.length || !c.finished);
    const unknown = captures.some(c => !c.verified);
    $('confirm-wrap').hidden = !unknown;
    const chosen = groups.filter(g => selected.has(g.key));
    $('selection').textContent = issue || `${chosen.length} ${chosen.length === 1 ? 'building' : 'buildings'} · ${chosen.reduce((n, g) => n + g.rows.length, 0).toLocaleString()} sellers${blocked ? ' · Remove the unfinished sheet to continue.' : ''}`;
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
      label.append(input, title, node('b', `${group.rows.length.toLocaleString()} sellers`)); $('buildings').append(label);
    }
    buttons();
  }
  function renderData() {
    data = combineCaptures(captures); mapping = inferMapping(data.columns); $('confirm').checked = false;
    $('review').hidden = !data.rows.length; $('add-hint').hidden = !captures.length; $('mapping').replaceChildren();
    $('scan').textContent = captures.length ? 'Add another sheet' : 'Find my sellers';
    $('collect-title').textContent = captures.length ? `${captures.length} ${captures.length === 1 ? 'sheet added' : 'sheets added'}` : 'Open your seller list';
    $('collect-hint').hidden = !!captures.length;
    $('column-review').open = !!validateMapping(mapping);
    $('column-summary').textContent = validateMapping(mapping) ? 'Match your columns to continue' : 'Preview leads & edit columns';
    $('mapping-hint').textContent = validateMapping(mapping) || 'Your columns were matched automatically. You can change them here.';
    for (const [field, title] of Object.entries(fields)) {
      const label = node('label', title), select = node('select'); select.setAttribute('aria-label', `${title} column`); select.append(option('', 'Not mapped'));
      for (const col of data.columns) select.append(option(col.id, col.label));
      select.value = mapping[field]; select.onchange = () => { mapping[field] = select.value; $('mapping-hint').textContent = validateMapping(mapping) || 'Columns matched. Choose your buildings below.'; renderGroups(true); };
      label.append(select); $('mapping').append(label);
    }
    $('totals').textContent = `${data.rows.length.toLocaleString()} leads collected${data.duplicates ? ` · ${data.duplicates} duplicates removed` : ''}. All source columns are kept.`;
    const table = node('table'), head = node('tr');
    data.columns.forEach(c => head.append(node('th', c.label))); table.append(head);
    data.rows.slice(0, 5).forEach(row => { const tr = node('tr'); data.columns.forEach(c => tr.append(node('td', row[c.id] || ''))); table.append(tr); });
    $('preview').replaceChildren(table); renderGroups(true);
  }
  function renderCaptures() {
    $('captures').replaceChildren();
    captures.forEach((capture, index) => {
      const item = node('div', undefined, 'capture');
      item.append(node('strong', `Sheet ${index + 1} · ${capture.rows.length.toLocaleString()} sellers`));
      if (!capture.verified) item.append(node('p', capture.issues.join(' ') || 'This sheet does not show a total. Please check the seller count before downloading.', 'notice warning'));
      const remove = node('button', 'Remove sheet', 'quiet'); remove.dataset.remove = 'true'; remove.onclick = () => { captures.splice(index, 1); renderCaptures(); renderData(); }; item.append(remove); $('captures').append(item);
    });
  }
  async function refresh() {
    discovering = true; message('Finding your seller sheet...'); $('table').replaceChildren(); buttons();
    try {
      const tables = await bridge.discover();
      tableCount = tables.length; $('table-wrap').hidden = tableCount < 2;
      if (tableCount > 1) $('table').append(option('', 'Choose your seller table'));
      for (const table of tables) $('table').append(option(String(table.id), table.label));
      message(tables.length ? (tables.length === 1 ? '' : 'Which list contains your sellers? Choose it below.') : 'We couldn’t find your seller list. Open it in your CRM, then try again.', tables.length ? '' : 'warning');
      $('scan-options').hidden = !!tables.length;
    } catch { message('Could not access the source tab. Keep it open and click the extension on that page again.', 'error'); }
    discovering = false; buttons();
  }
  async function poll() {
    try {
      const state = await bridge.poll();
      if (state.status === 'running') { message(`Found ${(state.progress?.rows || 0).toLocaleString()} sellers so far. Keep your seller list open and unchanged.`); pollTimer = setTimeout(poll, 700); return; }
      running = false;
      if (state.status === 'done') {
        captures.push(state.result); renderCaptures(); renderData(); await bridge.clear();
        $('scan-options').hidden = !state.result.issues.length;
        message(state.result.issues.length ? 'We couldn’t collect the whole sheet. Check the details below.' : '', state.result.issues.length ? 'warning' : '');
      } else message(state.message || 'The scan ended unexpectedly. Collect the sheet again.', 'error');
    } catch { running = false; message('The source page changed or closed during collection. This scan was not added. Refresh tables and try again.', 'error'); }
    buttons();
  }
  $('refresh').onclick = refresh;
  $('table').onchange = buttons;
  $('scan').onclick = async () => {
    running = true; buttons(); message('Starting collection…');
    try {
      // Re-discover before every scan; never use stale table IDs after navigation.
      const previousLabel = $('table').selectedOptions[0]?.textContent;
      const tables = await bridge.discover();
      const matches = tables.length === 1 ? tables : tables.filter(table => table.label === previousLabel);
      if (matches.length !== 1) { running = false; await refresh(); return; }
      $('table').replaceChildren(...tables.map(table => option(String(table.id), table.label)));
      $('table').value = String(matches[0].id); $('table-wrap').hidden = tables.length < 2;
      await bridge.start($('table').value, { waitMs: Number($('speed').value), expectedRows: Number($('expected').value) || null, paginate: $('paginate').checked }); await poll(); }
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
