const names = ['Celestia A', 'Celestia B', 'Tenora'];
export const labels = ['Sl.No', 'building name', 'unit number', 'rooms', 'size', 'land number', 'name', 'mobile number', 'status'];
const widths = [70, 190, 140, 100, 110, 130, 240, 210, 250];
const offsets = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
export function sampleRows(total) {
  return Array.from({ length: total }, (_, i) => [String(i + 1), names[i % 3], String(i + 1).padStart(5, '0'), String(i % 4), '104.28', '09', i === 2 ? '=Sample text, never a formula' : `Sample Owner ${i + 1}`, i % 31 === 0 ? '' : `050${String(i).padStart(7, '0')}`, 'Prospect']);
}
export function createFixture() {
  const viewport = document.querySelector('#viewport'), summary = document.querySelector('#summary'), next = document.querySelector('#next');
  let mode, rows, root, page = 0, loaded = 24, loading = false, generation = 0;
  function td(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
  function gridRow(index, values, header = false) {
    const row = document.createElement('div'); row.className = `grid-row${header ? ' grid-head' : ''}`; row.setAttribute('role', 'row'); row.setAttribute('aria-rowindex', header ? '1' : String(index + 2));
    if (!header) row.style.top = `${40 + index * 30}px`;
    values.forEach((value, col) => {
      if (offsets[col] + widths[col] < viewport.scrollLeft || offsets[col] > viewport.scrollLeft + viewport.clientWidth) return;
      const cell = document.createElement('div'); cell.setAttribute('role', header ? 'columnheader' : 'gridcell'); cell.setAttribute('aria-colindex', String(col + 1)); cell.textContent = value;
      cell.style.left = `${offsets[col]}px`; cell.style.width = `${widths[col]}px`; row.append(cell);
    });
    return row;
  }
  function renderGrid() {
    root.replaceChildren(gridRow(0, labels, true));
    const start = Math.max(0, Math.floor((viewport.scrollTop - 40) / 30));
    for (let i = start; i < Math.min(rows.length, start + Math.ceil(viewport.clientHeight / 30) + 3); i++) root.append(gridRow(i, rows[i]));
  }
  function renderTable() {
    root.replaceChildren(); const head = document.createElement('thead'), hr = document.createElement('tr'); labels.forEach(label => hr.append(td('th', label))); head.append(hr); root.append(head);
    const body = document.createElement('tbody');
    const displayed = mode === 'pagination' ? rows.slice(page * 24, (page + 1) * 24) : mode === 'lazy' ? rows.slice(0, loaded) : rows;
    displayed.forEach(row => { const tr = document.createElement('tr'); row.forEach(value => tr.append(td('td', value))); body.append(tr); }); root.append(body);
    summary.textContent = mode === 'unknown' ? `${displayed.length} rows visible` : `Showing ${mode === 'pagination' ? page * 24 + 1 : 1} to ${mode === 'pagination' ? Math.min((page + 1) * 24, rows.length) : displayed.length} of ${rows.length + (mode === 'mismatch' ? 7 : 0)} entries`;
    next.hidden = mode !== 'pagination'; next.disabled = (page + 1) * 24 >= rows.length;
  }
  viewport.addEventListener('scroll', () => {
    if (mode === 'virtual') renderGrid();
    if (mode === 'lazy' && !loading && loaded < rows.length && viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 5) {
      loading = true; root.setAttribute('aria-busy', 'true'); const capturedGeneration = generation;
      setTimeout(() => { if (generation !== capturedGeneration) return; loaded += 24; loading = false; renderTable(); root.setAttribute('aria-busy', 'false'); }, 450);
    }
  });
  next.onclick = () => {
    if (next.disabled || loading) return;
    loading = true; root.setAttribute('aria-busy', 'true'); const capturedGeneration = generation;
    setTimeout(() => { if (generation !== capturedGeneration) return; page++; loading = false; renderTable(); root.setAttribute('aria-busy', 'false'); viewport.scrollTop = 0; }, 350);
  };
  return {
    setup(type = 'virtual', total = 144, building = '') {
      generation++; mode = type; rows = sampleRows(total).filter(row => !building || row[1] === building); page = 0; loaded = 24; loading = false; viewport.replaceChildren(); viewport.scrollTop = 0; viewport.scrollLeft = 0;
      root = document.createElement(mode === 'virtual' ? 'div' : 'table'); root.setAttribute('aria-label', 'Dubai South sample sellers'); root.setAttribute('aria-colcount', String(labels.length));
      if (mode === 'virtual') {
        root.className = 'sheet-grid'; root.setAttribute('role', 'grid'); root.setAttribute('aria-rowcount', String(rows.length + 1)); root.style.height = `${rows.length * 30 + 40}px`; viewport.append(root); renderGrid(); summary.textContent = `${rows.length} sellers across ${building || 'three buildings'}`; next.hidden = true;
      } else { root.className = 'source-table'; viewport.append(root); renderTable(); }
      return root;
    },
    get root() { return root; },
  };
}
