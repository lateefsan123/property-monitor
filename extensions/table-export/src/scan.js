import { RowCollector } from './records.js';
import { snapshot, scrollContainers, nextControl, expectedRows, isBusy, findTableLike } from './dom.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const signature = root => JSON.stringify(snapshot(root).rows);
export async function scanTable(root, options = {}, progress = () => {}, signal = new AbortController().signal) {
  const waitMs = Math.max(100, options.waitMs || 150);
  const idleMs = Math.max(waitMs * 3, options.idleMs || 2500);
  const maxMs = options.maxMs || 20 * 60 * 1000;
  const maxRows = options.maxRows || 100000;
  const started = Date.now(), collector = new RowCollector(), issues = new Set();
  const initial = expectedRows(root);
  const manualExpected = options.expectedRows > 0 ? Number(options.expectedRows) : null;
  const publishedExpected = options.paginate === false && initial.source === 'page counter' ? null : initial.count;
  const expected = publishedExpected ?? manualExpected;
  if (publishedExpected !== null && manualExpected !== null && publishedExpected !== manualExpected) issues.add(`The entered total (${manualExpected}) differs from the source total (${publishedExpected}). Check the expected row count.`);
  const originalScroll = new Map();
  // Some apps rebuild the whole table when the page changes; follow the new one.
  const headings = snapshot(root).columns.map(c => c.label);
  function relocate() {
    if (root.isConnected) return true;
    const replacement = findTableLike(headings);
    if (replacement) root = replacement;
    return Boolean(replacement);
  }
  let pages = 0, steps = 0, finished = false, error = '', transitioning = false;
  function guard() {
    if (signal.aborted) throw new Error('Collection stopped. These rows are a partial capture; clear it and scan again before exporting.');
    if (!relocate() && !transitioning) throw new Error('The table was replaced or the sheet changed. Clear this capture and scan the current sheet again.');
    if (Date.now() - started > maxMs || steps++ > 30000) throw new Error('Collection reached its time limit. Narrow the page filter or capture smaller sections.');
    if (collector.rows.size > maxRows) throw new Error('Collection exceeded 100,000 rows. Filter the sheet into smaller sections.');
  }
  async function settled() {
    const deadline = Date.now() + (options.loadTimeoutMs || 30000);
    let changedAt = Date.now();
    const observer = new MutationObserver(() => { changedAt = Date.now(); });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
    try {
      for (;;) {
        await sleep(Math.min(waitMs, 100)); guard();
        if (isBusy(root)) changedAt = Date.now();
        else if (Date.now() - changedAt >= waitMs) return;
        if (Date.now() > deadline) throw new Error('The table is still loading. Wait for it to finish, then scan again.');
      }
    } finally {
      observer.disconnect();
    }
  }
  async function move(el, axis, value) {
    guard();
    const property = axis === 'x' ? 'scrollLeft' : 'scrollTop';
    if (Math.abs(el[property] - value) < 1) return;
    // A timeout alone can outrun virtual-grid rendering in a background tab:
    // wait for the browser's actual scroll event before reading the new cells.
    await new Promise((resolve, reject) => {
      const target = el === document.scrollingElement ? document : el;
      const cleanup = () => { clearTimeout(timer); target.removeEventListener('scroll', done); signal.removeEventListener('abort', abort); };
      const done = () => { cleanup(); resolve(); };
      const abort = () => { cleanup(); reject(new Error('Collection stopped. Clear this partial capture and scan again.')); };
      const timer = setTimeout(() => { cleanup(); reject(new Error('Scrolling did not render. Keep the source tab visible, then collect again.')); }, options.loadTimeoutMs || 30000);
      target.addEventListener('scroll', done, { once: true }); signal.addEventListener('abort', abort, { once: true });
      const before = el[property];
      el[property] = value;
      // Clamped/unchanged positions do not dispatch a scroll event.
      if (Math.abs(el[property] - before) < 1) done();
    });
    await settled();
  }
  function remember(el) {
    if (el && !originalScroll.has(el)) {
      originalScroll.set(el, { top: el.scrollTop, left: el.scrollLeft, anchor: el.style.getPropertyValue('overflow-anchor'), priority: el.style.getPropertyPriority('overflow-anchor'), behavior: el.style.getPropertyValue('scroll-behavior'), behaviorPriority: el.style.getPropertyPriority('scroll-behavior') });
      // Recycled DOM rows must not let browser scroll anchoring jump past data.
      el.style.setProperty('overflow-anchor', 'none', 'important');
      el.style.setProperty('scroll-behavior', 'auto', 'important');
    }
  }
  function collect() {
    guard();
    const view = snapshot(root);
    options.trace?.({ top: scrollContainers(root).y?.scrollTop, left: scrollContainers(root).x?.scrollLeft, first: view.rows[0]?.id, last: view.rows.at(-1)?.id, columns: view.columns.map(c => c.id) });
    view.issues.forEach(i => issues.add(i));
    collector.add(view, pages);
    guard();
    progress({ rows: collector.rows.size, pages: pages + 1, expected, elapsedMs: Date.now() - started });
  }
  async function horizontal() {
    const virtualColumns = Number(root.getAttribute('aria-colcount')) > snapshot(root).columns.length
      || (root.tagName !== 'TABLE' && root.matches('[role="grid"],[role="treegrid"]'));
    // Ordinary tables already expose cells beyond the horizontal viewport.
    if (!virtualColumns) { collect(); return; }
    const { x } = scrollContainers(root); remember(x);
    if (!x) { collect(); return; }
    // Alternate direction on successive row windows instead of returning left
    // after every sweep. Both edges and overlapping columns are still read.
    const rightward = x.scrollLeft <= (x.scrollWidth - x.clientWidth) / 2;
    await move(x, 'x', rightward ? 0 : x.scrollWidth - x.clientWidth); collect();
    for (;;) {
      const before = x.scrollLeft;
      const edge = rightward ? x.scrollWidth - x.clientWidth : 0;
      if (Math.abs(before - edge) <= 2) break;
      const step = Math.max(1, Math.floor(x.clientWidth * 0.75));
      await move(x, 'x', rightward ? Math.min(edge, before + step) : Math.max(0, before - step));
      collect();
      if (Math.abs(x.scrollLeft - before) < 1) throw new Error('Horizontal scrolling stopped before the last column. Try a standard table view.');
    }
  }
  try {
    await settled();
    if (options.paginate !== false && initial.startsAt > 1) throw new Error('Start on the first page before scanning all pages, or turn off automatic pagination to capture this page only.');
    const pageSignatures = new Set();
    for (;;) {
      guard();
      const scroll = scrollContainers(root); remember(scroll.y);
      if (scroll.y) await move(scroll.y, 'y', 0);
      const pageSig = signature(root);
      if (pageSignatures.has(pageSig)) throw new Error('Pagination repeated a page. The capture is incomplete.');
      pageSignatures.add(pageSig);
      let stableSince = Date.now(), previousHeight = -1, previousSize = -1;
      for (;;) {
        await horizontal();
        if (expected !== null && collector.rows.size === expected && !collector.result(Number(root.getAttribute('aria-colcount')) || null).issues.length && !isBusy(root)) break;
        const { y } = scrollContainers(root); remember(y);
        const height = y?.scrollHeight || 0, size = collector.rows.size;
        if (height !== previousHeight || size !== previousSize) stableSince = Date.now();
        previousHeight = height; previousSize = size;
        const bottom = !y || y.scrollTop >= y.scrollHeight - y.clientHeight - 2;
        if (bottom && Date.now() - stableSince >= idleMs && !isBusy(root)) break;
        if (y && !bottom) {
          const before = y.scrollTop;
          await move(y, 'y', Math.min(y.scrollHeight - y.clientHeight, before + Math.max(1, Math.floor(y.clientHeight * 0.7))));
          if (y.scrollTop === before) throw new Error('Scrolling stopped before the end of the table.');
        } else await settled();
      }
      if (options.paginate === false) break;
      // Every row is in: some pagers never disable Next on the last page.
      if (expected !== null && collector.rows.size >= expected) break;
      const next = nextControl(root);
      if (!next) break;
      const before = signature(root); next.click();
      const deadline = Date.now() + (options.loadTimeoutMs || 30000);
      // While the next page loads the table may briefly disappear.
      transitioning = true;
      do {
        await settled();
        if (Date.now() > deadline) throw new Error('Next did not load a different page. The capture is incomplete.');
      } while (!relocate() || signature(root) === before);
      transitioning = false;
      pages++;
    }
    finished = true;
  } catch (cause) { error = cause.message; }
  finally {
    for (const [el, position] of originalScroll) if (el.isConnected) {
      el.scrollTop = position.top; el.scrollLeft = position.left;
      position.anchor ? el.style.setProperty('overflow-anchor', position.anchor, position.priority) : el.style.removeProperty('overflow-anchor');
      position.behavior ? el.style.setProperty('scroll-behavior', position.behavior, position.behaviorPriority) : el.style.removeProperty('scroll-behavior');
    }
  }
  const result = collector.result(Number(root.getAttribute('aria-colcount')) || null);
  result.issues.forEach(i => issues.add(i));
  if (error) issues.add(error);
  if (!result.rows.length) issues.add('No seller rows were captured.');
  // A whole-table count cannot verify an intentionally single-page capture.
  const countMatches = expected !== null && expected === result.rows.length;
  if (expected !== null && !countMatches) issues.add(`Captured ${result.rows.length} rows; the expected total is ${expected}. Check filters, pagination and loading before exporting.`);
  return { ...result, issues: [...issues], expected, expectedSource: publishedExpected !== null ? initial.source : manualExpected !== null ? 'entered by user' : 'unknown', countMatches, finished,
    verified: finished && countMatches && !issues.size, pages: pages + 1,
    source: `${location.origin}${location.pathname}`, capturedAt: new Date().toISOString() };
}
