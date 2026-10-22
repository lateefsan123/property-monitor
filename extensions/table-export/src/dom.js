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
  // Expanded detail panels are not records. Keep genuinely incomplete data
  // rows so the collector still blocks missing cells instead of hiding data loss.
  const recordRows = dataRows.filter(row => {
    const rowCells = cells(row);
    return !(rowCells.length === 1 && (rowCells[0].colSpan || 1) > 1);
  });
  const rows = recordRows.map((row, i) => {
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
// The table on the page with the same headings (after an app re-rendered it).
export function findTableLike(headings, doc = document) {
  const wanted = new Set(headings.map(token).filter(Boolean));
  const need = Math.min(3, wanted.size);
  for (const root of doc.querySelectorAll(rootSelector)) {
    if (!visible(root) || root.closest('[data-repeat-export-ui]') || root.parentElement?.closest(rootSelector)) continue;
    try {
      const labels = snapshot(root).columns.map(c => token(c.label));
      if (need && labels.filter(label => wanted.has(label)).length >= need) return root;
    } catch { /* not a readable table */ }
  }
  return null;
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
// The largest ancestor that still holds only this table: CRM toolbars often
// put the result count and the pager above the table, outside its wrapper.
export function pagerScope(root) {
  let scope = root.parentElement || root;
  for (let el = scope.parentElement, level = 0; el && el !== document.body && level < 8; el = el.parentElement, level++) {
    if ([...el.querySelectorAll(rootSelector)].filter(visible).length !== 1) break;
    scope = el;
  }
  return scope;
}
const number = value => Number(value.replaceAll(',', ''));
// Text outside the table itself, line by line ("392 Results", "1/4").
function scopeLines(root) {
  const lines = [];
  const walker = document.createTreeWalker(pagerScope(root), NodeFilter.SHOW_TEXT, {
    acceptNode: node => (root.contains(node) || !node.parentElement || !visible(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const line = text(node.textContent);
    if (line) lines.push(line);
  }
  return lines;
}
const PAGE_OF = /^(\d+)\s*(?:\/|of)\s*(\d+)$/i;
export function expectedRows(root) {
  const scope = scopeFor(root);
  const info = scope?.querySelector('.dataTables_info,.dt-info,[role="status"],[data-row-summary]')?.textContent || '';
  const match = info.match(/showing\s+([\d,]+)\s+(?:to|[-–])\s+[\d,]+\s+of\s+([\d,]+)\s+(?:entries|rows|records|results)/i);
  if (match) return { count: Number(match[2].replaceAll(',', '')), startsAt: Number(match[1].replaceAll(',', '')), source: 'page counter' };
  // CRM toolbars: "392 Results" or "1–100 of 392 contacts", plus a "1/4" page box.
  const lines = scopeLines(root);
  const page = lines.map(line => line.match(PAGE_OF)).find(Boolean);
  for (const line of lines) {
    const total = line.match(/^([\d,]+)\s+(?:results|records|contacts|leads|entries|rows|items)$/i)
      || line.match(/\bof\s+([\d,]+)\s*(?:results|records|contacts|leads|entries|rows|items)?$/i);
    if (total && !PAGE_OF.test(line)) return { count: number(total[1]), startsAt: page && Number(page[1]) > 1 ? 2 : 1, source: 'page counter' };
  }
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
const NEXT_LABEL = /^(next(?: page)?|go to next page|›|»|>)$/;
// Icon-only arrows: their names live in classes, test ids or the icon itself.
const NEXT_HINT = /(^|[^a-z])(next|chevron-?right|arrow-?right|caret-?right|angle-?right|keyboard-?arrow-?right|navigate-?next|forward)([^a-z]|$)/i;
const hints = el => [el, ...el.querySelectorAll('*')].slice(0, 12)
  .map(n => [n.getAttribute('aria-label'), n.getAttribute('title'), n.getAttribute('data-testid'), n.getAttribute('data-icon'), n.getAttribute('class'), n.getAttribute('name')].filter(Boolean).join(' ')).join(' ');
function isNext(el) {
  const label = text(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText).toLowerCase();
  if (NEXT_LABEL.test(label) || el.matches('.paginate_button.next,.dt-paging-button.next')) return true;
  return !text(el.innerText) && NEXT_HINT.test(hints(el)) && !/prev|left|back/i.test(label);
}
function isDisabled(el) {
  return el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled') || !!el.closest('.disabled,[aria-disabled="true"]')
    || getComputedStyle(el).pointerEvents === 'none';
}
// Icon-only pager with a "1/4" box: the button straight after the box is Next.
function afterPageBox(controls, scope) {
  const box = [...scope.querySelectorAll('*')].find(el => visible(el) && !el.children.length && PAGE_OF.test(text(el.textContent)));
  if (!box) return null;
  return controls.find(el => !text(el.innerText) && (box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) || null;
}
export function nextControl(root) {
  // "4/4": the last page, even if the arrow still looks clickable.
  const page = scopeLines(root).map(line => line.match(PAGE_OF)).find(Boolean);
  if (page && Number(page[1]) >= Number(page[2])) return null;
  let el = null;
  for (const scope of [scopeFor(root), pagerScope(root)]) {
    const controls = [...(scope?.querySelectorAll('button,a,[role="button"]') || [])].filter(c => visible(c) && !c.closest(rootSelector) && !c.closest('[data-repeat-export-ui]'));
    const matches = controls.filter(isNext);
    // A pager above and below the same table is two copies of one control.
    el = matches.find(c => !isDisabled(c)) || matches[0] || afterPageBox(controls, scope);
    if (el) break;
  }
  if (!el || isDisabled(el)) return null;
  const href = el.getAttribute('href');
  if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
    // App routers render Next as a link to the same page with a new query.
    const target = new URL(href, location.href);
    if (target.origin !== location.origin || target.pathname !== location.pathname) throw new Error('Next opens a new page. Capture this page with automatic pagination off, then add the next page separately.');
  }
  return el;
}
export function isBusy(root) {
  const scope = scopeFor(root);
  return root.getAttribute('aria-busy') === 'true' || !![...(scope?.querySelectorAll('[aria-busy="true"],.dataTables_processing,.dt-processing,[role="progressbar"]') || [])].find(visible);
}
