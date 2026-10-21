import { combineCaptures, fields, groupBuildings, inferMapping, validateMapping } from './records.js';
import { createExport } from './export.js';

function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (className) el.className = className;
  return el;
}
function option(value, label) { const el = node('option', label); el.value = value; return el; }
const plural = (count, one, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

// Repeat AI's two-row mark (public/brand), drawn inline so the extension needs no assets.
const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="4.5" width="17" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="6" y="7" width="3" height="3" rx="1" fill="currentColor"/><path d="M11.5 8.5h5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="12" y="19.5" width="17" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="22" width="3" height="3" rx="1" fill="currentColor"/><path d="M20.5 23.5h5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.5 12.5v7a4 4 0 0 0 4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const SEARCH = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m13.2 13.2 3.3 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

export function mountWorkspace(host, bridge) {
  host.innerHTML = `<header class="top"><span class="mark">${MARK}</span><span class="brand-name">Repeat AI</span></header>
    <section id="collect" class="stage">
      <div id="intro"><h1 id="collect-title">Export your sellers</h1>
      <p id="collect-hint" class="lead">Open your seller list, then click below.</p></div>
      <label id="table-wrap" class="field" hidden>Which list has your sellers?<select id="table" aria-label="Source table"></select></label>
      <div id="progress" class="progress" hidden><div class="bar" aria-hidden="true"><span></span></div>
        <p class="count"><strong id="progress-count">0</strong> sellers found</p><p class="hint">Keep your seller list open and unchanged while we read it.</p></div>
      <div id="message" role="status" aria-live="polite"></div>
      <div id="captures" class="captures"></div>
      <div class="actions"><button id="scan" class="primary">Find my sellers</button><button id="stop" class="link" hidden>Stop</button></div>
      <details id="scan-options" class="help" hidden><summary>Help with this sheet</summary><p class="hint">If the list loads slowly, allow extra time. You can also collect one page at a time.</p>
        <div class="row"><label class="field">Loading time<select id="speed"><option value="150">Automatic</option><option value="1500">Allow extra time</option><option value="3000">Allow more time</option></select></label>
        <label class="field">Expected sellers (optional)<input id="expected" type="number" min="1" max="100000" placeholder="Total shown in your list"></label></div>
        <label class="check"><input id="paginate" type="checkbox" checked><span>Include every page</span></label><button id="refresh" class="link">Look for the list again</button></details>
    </section>
    <section id="review" class="stage" hidden>
      <div class="review-head"><h2 id="review-title"></h2></div>
      <details id="column-review" class="columns"><summary id="column-summary">Preview sellers &amp; columns</summary><p id="mapping-hint" class="hint"></p><div id="mapping" class="mapping"></div><div id="preview" class="preview"></div></details>
      <div id="search-wrap" class="search">${SEARCH}<input id="search" type="search" aria-label="Find a building" placeholder="Find a building"></div>
      <div id="list-tools" class="list-tools"><span id="list-count" class="hint"></span><span><button id="all" class="link">Select all</button><button id="none" class="link">Clear</button></span></div>
      <div id="buildings" class="buildings" role="group" aria-label="Buildings"></div>
      <label id="confirm-wrap" class="check confirm" hidden><input id="confirm" type="checkbox"><span>The seller count looks right</span></label>
      <div class="footer"><div id="result" role="status" aria-live="polite"></div><p id="selection"></p><button id="download" class="primary">Download spreadsheets</button></div>
    </section>`;
  const $ = id => host.querySelector(`#${id}`);
  let captures = [], data = { rows: [], columns: [], duplicates: 0 }, mapping = {}, groups = [], selected = new Set(), running = false, exporting = false;
  let pollTimer, discovering = false, tableCount = 0;
  function result(value, kind = '') { $('result').textContent = value; $('result').className = value ? `notice ${kind}` : ''; }
  function message(value, kind = '') { $('message').textContent = value; $('message').className = value ? `notice ${kind}` : ''; if (kind === 'error') $('scan-options').hidden = false; }
  // The page's stage drives the step markers and what each section shows.
  function stage() {
    const value = running ? 'collecting' : captures.length ? 'review' : 'intro';
    host.dataset.stage = value;
    $('intro').hidden = value === 'review';
    $('collect-title').textContent = running ? 'Finding your sellers' : 'Export your sellers';
    $('collect-hint').hidden = running;
    $('collect').classList.toggle('quiet-stage', value === 'review');
    $('progress').hidden = !running;
  }
  function buttons() {
    stage();
    $('scan').disabled = running || exporting || discovering || !$('table').value;
    $('scan').hidden = running || captures.length > 0;
    $('refresh').disabled = running || exporting || discovering; $('table').disabled = running || exporting || discovering;
    host.querySelectorAll('#speed,#expected,#paginate').forEach(el => { el.disabled = running || exporting; });
    $('stop').hidden = !running;
    const issue = validateMapping(mapping);
    const blocked = captures.some(c => c.issues.length || !c.finished);
    const unknown = captures.some(c => !c.verified);
    // The count check only matters once nothing else blocks the download.
    $('confirm-wrap').hidden = !unknown || blocked;
    const chosen = groups.filter(g => selected.has(g.key));
    // Only speak up when something needs doing; the button says the rest.
    $('selection').textContent = issue || (blocked ? 'Remove the unfinished sheet to continue.' : chosen.length ? '' : 'Choose at least one building.');
    $('selection').className = 'warn';
    $('selection').hidden = !$('selection').textContent;
    $('download').textContent = exporting ? 'Downloading…' : 'Download';
    $('download').disabled = running || exporting || !!issue || blocked || !chosen.length || (unknown && !$('confirm').checked);
    host.querySelectorAll('#mapping select,#search,#all,#none,#confirm,#buildings input,[data-remove]').forEach(el => { el.disabled = running || exporting || el.dataset.missing === 'true'; });
  }
  function renderGroups(reset = false) {
    groups = groupBuildings(data.rows, mapping);
    if (reset) selected = new Set(groups.filter(g => g.key).map(g => g.key));
    const search = $('search').value.trim().toLowerCase(); $('buildings').replaceChildren();
    const shown = groups.filter(g => g.name.toLowerCase().includes(search));
    for (const group of shown) {
      const label = node('label', undefined, `building${group.key ? '' : ' excluded'}`), input = node('input'); input.type = 'checkbox'; input.checked = selected.has(group.key); input.disabled = !group.key; input.dataset.missing = String(!group.key); input.setAttribute('aria-label', group.name);
      input.onchange = () => { input.checked ? selected.add(group.key) : selected.delete(group.key); buttons(); };
      const title = node('span', undefined, 'name'); title.append(node('span', group.name));
      // Only mention missing details where they actually exist.
      if (!group.key) title.append(node('small', 'No building name'));
      label.append(input, title, node('b', group.rows.length.toLocaleString())); $('buildings').append(label);
    }
    if (!shown.length) $('buildings').append(node('p', search ? `No buildings match “${$('search').value.trim()}”.` : 'No buildings found. Check the building column under Preview sellers & columns.', 'empty'));
    const named = groups.filter(g => g.key);
    $('list-count').textContent = plural(named.length, 'building');
    $('review-title').textContent = `${plural(data.rows.length, 'seller')} in ${plural(named.length, 'building')}`;
    // Short lists need no search or bulk controls.
    $('search-wrap').hidden = groups.length <= 6 && !search;
    $('list-tools').hidden = groups.length <= 6;
    buttons();
  }
  function renderData() {
    data = combineCaptures(captures); mapping = inferMapping(data.columns); $('confirm').checked = false; result('');
    $('review').hidden = !data.rows.length; $('mapping').replaceChildren();
    const issue = validateMapping(mapping);
    $('column-review').open = !!issue;
    $('column-review').hidden = !issue;
    // Column matching sits out of the way unless it needs an answer.
    $('review').insertBefore($('column-review'), issue ? $('search-wrap') : $('confirm-wrap'));
    $('column-review').classList.toggle('needs', !!issue);
    $('column-summary').textContent = issue ? 'Match your columns to continue' : 'Preview sellers & columns';
    $('mapping-hint').textContent = issue || 'We matched your columns automatically. Change them here if anything looks wrong.';
    for (const [field, title] of Object.entries(fields)) {
      const label = node('label', title, 'field'), select = node('select'); select.setAttribute('aria-label', `${title} column`); select.append(option('', 'Not used'));
      for (const col of data.columns) select.append(option(col.id, col.label));
      select.value = mapping[field]; select.onchange = () => {
        mapping[field] = select.value; const next = validateMapping(mapping);
        $('mapping-hint').textContent = next || 'Done. You can download now.'; $('column-review').classList.toggle('needs', !!next);
        $('column-summary').textContent = next ? 'Match your columns to continue' : 'Preview sellers & columns'; renderGroups(true);
      };
      label.append(select); $('mapping').append(label);
    }
    const table = node('table'), head = node('tr');
    data.columns.forEach(c => head.append(node('th', c.label))); table.append(head);
    data.rows.slice(0, 5).forEach(row => { const tr = node('tr'); data.columns.forEach(c => tr.append(node('td', row[c.id] || ''))); table.append(tr); });
    $('preview').replaceChildren(table); renderGroups(true);
  }
  function renderCaptures() {
    $('captures').replaceChildren();
    const listed = captures.length > 1 || captures.some(c => c.issues.length || !c.finished || !c.verified);
    captures.forEach((capture, index) => {
      if (!listed) return;
      const item = node('div', undefined, 'capture'), line = node('div', undefined, 'capture-line');
      line.append(node('span', `${captures.length > 1 ? `Sheet ${index + 1}` : 'Your list'} · ${plural(capture.rows.length, 'seller')}`));
      const remove = node('button', 'Remove', 'link'); remove.dataset.remove = 'true'; remove.setAttribute('aria-label', `Remove sheet ${index + 1}`); remove.onclick = () => { captures.splice(index, 1); renderCaptures(); renderData(); buttons(); };
      line.append(remove); item.append(line);
      if (capture.issues.length || !capture.finished) item.append(node('p', capture.issues.join(' ') || 'This sheet wasn’t finished. Remove it and collect it again.', 'notice error'));
      else if (!capture.verified) item.append(node('p', 'We couldn’t check the total. Make sure the count looks right.', 'notice warning'));
      $('captures').append(item);
    });
  }
  async function refresh() {
    discovering = true; message('Looking for your seller list…', 'quiet'); $('table').replaceChildren(); buttons();
    try {
      const tables = await bridge.discover();
      tableCount = tables.length; $('table-wrap').hidden = tableCount < 2;
      if (tableCount > 1) $('table').append(option('', 'Choose your seller list'));
      for (const table of tables) $('table').append(option(String(table.id), table.label));
      message(tables.length ? (tables.length === 1 ? '' : 'There’s more than one list on this page. Choose the one with your sellers.') : 'We couldn’t find your seller list. Open it in your CRM, then try again.', tables.length ? '' : 'warning');
      $('scan-options').hidden = !!tables.length;
    } catch { message('We can’t reach your CRM tab. Keep it open and click the extension on that page again.', 'error'); }
    discovering = false; buttons();
  }
  async function poll() {
    try {
      const state = await bridge.poll();
      if (state.status === 'running') { $('progress-count').textContent = (state.progress?.rows || 0).toLocaleString(); pollTimer = setTimeout(poll, 700); return; }
      running = false;
      if (state.status === 'done') {
        captures.push(state.result); renderCaptures(); renderData(); await bridge.clear();
        $('scan-options').hidden = !state.result.issues.length;
        message(state.result.issues.length ? 'We couldn’t collect the whole list. See below.' : '', state.result.issues.length ? 'warning' : '');
      } else message(state.message || 'Collection stopped before the end. Nothing was added. Try again.', 'error');
    } catch { running = false; message('Your seller list changed or closed while we were reading it. Nothing was added. Try again.', 'error'); }
    buttons();
  }
  $('refresh').onclick = refresh;
  $('table').onchange = buttons;
  $('scan').onclick = async () => {
    running = true; $('progress-count').textContent = '0'; message(''); buttons();
    try {
      // Re-discover before every scan; never use stale table IDs after navigation.
      const previousLabel = $('table').selectedOptions[0]?.textContent;
      const tables = await bridge.discover();
      const matches = tables.length === 1 ? tables : tables.filter(table => table.label === previousLabel);
      if (matches.length !== 1) { running = false; await refresh(); return; }
      $('table').replaceChildren(...tables.map(table => option(String(table.id), table.label)));
      $('table').value = String(matches[0].id); $('table-wrap').hidden = tables.length < 2;
      await bridge.start($('table').value, { waitMs: Number($('speed').value), expectedRows: Number($('expected').value) || null, paginate: $('paginate').checked }); await poll(); }
    catch { running = false; message('We couldn’t start. Make sure your seller list is open, then try again.', 'error'); buttons(); }
  };
  $('stop').onclick = async () => { await bridge.cancel(); $('stop').disabled = true; $('stop').textContent = 'Stopping…'; setTimeout(() => { $('stop').disabled = false; $('stop').textContent = 'Stop'; }, 1500); };
  $('search').oninput = () => renderGroups();
  $('all').onclick = () => { groups.filter(g => g.key && g.name.toLowerCase().includes($('search').value.trim().toLowerCase())).forEach(g => selected.add(g.key)); renderGroups(); };
  $('none').onclick = () => { selected.clear(); renderGroups(); };
  $('confirm').onchange = buttons;
  $('download').onclick = async () => {
    exporting = true; result(''); buttons();
    try {
      const output = await createExport({ ...data, mapping, captures, groups: groups.filter(g => selected.has(g.key)) }, value => result(value, 'quiet'));
      const url = URL.createObjectURL(new Blob([output.zip], { type: 'application/zip' }));
      const anchor = node('a'); anchor.href = url; anchor.download = `Repeat-AI-buildings-${new Date().toISOString().slice(0, 10)}.zip`; host.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      result('Downloaded. Now add the spreadsheets to Repeat AI.', 'success');
    } catch (cause) { result(cause.message || 'The spreadsheets couldn’t be made. Choose fewer buildings and try again.', 'error'); }
    exporting = false; buttons();
  };
  refresh();
  return () => { clearTimeout(pollTimer); bridge.cancel(); host.replaceChildren(); };
}
