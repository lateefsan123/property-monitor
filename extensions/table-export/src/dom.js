import { token, text } from './records.js';

const rootSelector = 'table,[role="grid"],[role="table"],[role="treegrid"]';
export function visible(el) {
  return !!el?.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden],[aria-hidden="true"]');
}
function cellText(el) {
  const copy = el.cloneNode(true);
  const originalChildren = [...el.querySelectorAll('*')], clonedChildren = [...copy.querySelectorAll('*')];
  originalChildren.forEach((child, i) => { if (!visible(child)) clonedChildren[i].remove(); });
  copy.querySelectorAll('input,select,button,svg,script,style,[aria-hidden="true"],[hidden]').forEach(n => n.remove());
  // innerText removes hidden helper content in ordinary cells; cloned text is
  // used only for filter headings and cells containing action buttons.
  return text(el.querySelector('input,select,button,svg,[aria-hidden="true"],[hidden]') ? copy.textContent : el.innerText);
}
function cells(row) {
  return [...row.querySelectorAll('th,td,[role="columnheader"],[role="gridcell"],[role="cell"],[role="rowheader"]')]
    .filter(c => c.closest('tr,[role="row"]') === row && visible(c));
}
function columnId(cell, index) {
  for (const attr of ['aria-colindex', 'data-colindex', 'data-x', 'col-id']) {
    if (cell.hasAttribute(attr)) return `${attr}:${cell.getAttribute(attr)}`;
  }
  return `position:${cell.cellIndex >= 0 ? cell.cellIndex : index}`;
}
function rowsOf(root) {
  return [...root.querySelectorAll('tr,[role="row"]')].filter(r => r.closest(rootSelector) === root && visible(r));
}
export function snapshot(root) {
  const allRows = rowsOf(root);
  const headingRows = allRows.filter((r, i) => r.closest('thead') || r.querySelector('[role="columnheader"]') || (i === 0 && r.querySelector('th:not([scope="row"])')));
  const header = headingRows.at(-1) || allRows[0];
  if (!header) throw new Error('This table has no readable headings. Open a sheet with column headings and try again.');
  const headings = cells(header);
  const columns = headings.map((c, i) => ({ id: columnId(c, i), label: cellText(c) || `Column ${i + 1}`, order: Number(c.getAttribute('aria-colindex') ?? c.getAttribute('data-colindex') ?? c.getAttribute('data-x') ?? (c.cellIndex >= 0 ? c.cellIndex : i)) || i }));
  const serial = columns.find(c => /^(slno|sno|srno|serialno|serialnumber|row|rowno|no)$/.test(token(c.label)) || c.label === '#');
  const dataRows = allRows.filter(r => !headingRows.includes(r) && r !== header && !r.closest('tfoot'));
  const problems = new Set();
  const rows = dataRows.map((row, i) => {
    const rowCells = cells(row);
    if (rowCells.some(c => (c.colSpan || 1) > 1 || (c.rowSpan || 1) > 1)) problems.add('Merged cells are not supported. Choose a flat table view.');
    const values = Object.fromEntries(rowCells.map((c, index) => [columnId(c, index), cellText(c)]));
    let id;
    for (const attr of ['aria-rowindex', 'data-rowindex', 'row-index', 'data-y', 'data-row-id', 'data-id']) {
      if (row.hasAttribute(attr)) { id = `${attr}:${row.getAttribute(attr)}`; break; }
    }
    if (!id && serial && /^\d+$/.test(values[serial.id] || '')) id = `serial:${values[serial.id]}`;
    return { id: id || `position:${i}`, cells: values };
  }).filter(r => Object.values(r.cells).some(Boolean));
  if (new Set(rows.map(r => r.id)).size !== rows.length) problems.add('This table repeats row identifiers. Choose a different table view.');
  if (headings.some(c => (c.colSpan || 1) > 1)) problems.add('Grouped headings are not supported. Choose a flat table view.');
  return { columns, rows, issues: [...problems] };
}
export function discoverTables(doc = document) {
  return [...doc.querySelectorAll(rootSelector)]
    .filter(root => visible(root) && !root.closest('[data-repeat-export-ui]') && !root.parentElement?.closest(rootSelector))
    .flatMap(root => {
      try {
        const view = snapshot(root);
        return view.columns.length >= 2 ? [{ root, label: `${root.getAttribute('aria-label') || root.querySelector('caption')?.innerText || 'Table'} — ${view.columns.map(c => c.label).slice(0, 5).join(', ')}`, view }] : [];
      } catch { return []; }
    });
}
export function scopeFor(root) {
  const known = root.closest('.dataTables_wrapper,.dt-container,[data-export-container],.ag-root-wrapper');
  if (known) return known;
  let ancestor = root.parentElement;
  for (let level = 0; ancestor && level < 4; level++, ancestor = ancestor.parentElement) {
    const tables = [...ancestor.querySelectorAll(rootSelector)].filter(visible);
    if (tables.length !== 1) break;
    if (ancestor.querySelector('[role="status"],.pagination,[aria-label="Next page"],.dataTables_info,.dt-info')) return ancestor;
  }
  return root.parentElement;
}
export function expectedRows(root) {
  const scope = scopeFor(root);
  const info = scope?.querySelector('.dataTables_info,.dt-info,[role="status"],[data-row-summary]')?.textContent || '';
  const match = info.match(/showing\s+([\d,]+)\s+(?:to|[-–])\s+[\d,]+\s+of\s+([\d,]+)\s+(?:entries|rows|records|results)/i);
  if (match) return { count: Number(match[2].replaceAll(',', '')), startsAt: Number(match[1].replaceAll(',', '')), source: 'page counter' };
  const count = Number(root.getAttribute('aria-rowcount'));
  if (count > 0) {
    const headers = rowsOf(root).filter((r, i) => r.closest('thead') || r.querySelector('[role="columnheader"]') || (i === 0 && r.querySelector('th:not([scope="row"])'))).length;
    return { count: Math.max(0, count - headers), startsAt: 1, source: 'table row count' };
  }
  return { count: null, startsAt: 1, source: 'not published by this page' };
}
export function scrollContainers(root) {
  const candidates = [root, ...root.querySelectorAll('*')];
  for (let el = root.parentElement; el; el = el.parentElement) candidates.push(el);
  const scrolling = document.scrollingElement;
  if (scrolling && !candidates.includes(scrolling)) candidates.push(scrolling);
  const isScrollable = (el, axis) => {
    if (!visible(el)) return false;
    const style = getComputedStyle(el);
    return (el === scrolling || /(auto|scroll)/.test(axis === 'x' ? style.overflowX : style.overflowY))
      && (axis === 'x' ? el.scrollWidth > el.clientWidth + 2 : el.scrollHeight > el.clientHeight + 2);
  };
  return { x: candidates.find(el => isScrollable(el, 'x')), y: candidates.find(el => isScrollable(el, 'y')) };
}
export function nextControl(root) {
  const scope = scopeFor(root);
  const controls = [...(scope?.querySelectorAll('button,a,[role="button"]') || [])].filter(visible);
  const matches = controls.filter(el => {
    if (el.closest(rootSelector)) return false;
    const label = text(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText).toLowerCase();
    return /^(next(?: page)?|go to next page|›|»|>)$/.test(label) || el.matches('.paginate_button.next,.dt-paging-button.next');
  });
  if (matches.length > 1) throw new Error('More than one Next control was found. Capture pages separately to avoid changing the wrong table.');
  const el = matches[0];
  if (!el) return null;
  const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled') || !!el.closest('.disabled');
  if (disabled) return null;
  const href = el.getAttribute('href');
  if (href && !href.startsWith('#') && !href.startsWith('javascript:')) throw new Error('Next opens a new page. Capture this page with automatic pagination off, then add the next page separately.');
  return el;
}
export function isBusy(root) {
  const scope = scopeFor(root);
  return root.getAttribute('aria-busy') === 'true' || !![...(scope?.querySelectorAll('[aria-busy="true"],.dataTables_processing,.dt-processing,[role="progressbar"]') || [])].find(visible);
}
