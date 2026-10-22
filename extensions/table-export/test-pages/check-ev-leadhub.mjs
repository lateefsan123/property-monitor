import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE_MODULE || 'playwright-core');

const bundle = await build({ entryPoints: ['extensions/table-export/test-pages/ev-leadhub.js'], bundle: true, write: false, format: 'iife' });
const workspaceCss = await readFile('extensions/table-export/workspace.css');
const server = http.createServer((req, res) => {
  if (req.url === '/workspace.css') return res.writeHead(200, { 'Content-Type': 'text/css' }).end(workspaceCss);
  if (req.url.startsWith('/fixture.js')) res.writeHead(200, { 'Content-Type': 'application/javascript' }).end(bundle.outputFiles[0].contents);
  else res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><link rel=stylesheet href=/workspace.css><script src="/fixture.js" defer></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1217/chrome-win64/chrome.exe'), headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  for (const query of ['', '?replace=0', '?pager=hint']) {
    await page.goto(`http://127.0.0.1:${server.address().port}/${query}`);
    const result = await page.evaluate(() => window.__run());
    assert.equal(result.rows, 392); assert.equal(result.pages, 4); assert.equal(result.verified, true); assert.deepEqual(result.issues, []);
    assert.equal(result.exported, 392); assert.deepEqual(result.files.map(f => f.file), ['Sellers.xlsx']);
    console.log('PASS LeadHub', query || 'rebuilt table', JSON.stringify(result));
  }
  const workbook = await page.evaluate(() => Array.from(window.__output.files.find(f => f.name === 'Sellers.xlsx').data));
  const wb = XLSX.read(new Uint8Array(workbook), { type: 'array' });
  const sellers = XLSX.utils.sheet_to_json(wb.Sheets.Sellers);
  assert.equal(sellers.length, 392);
  for (let i = 0; i < 392; i++) {
    assert.equal(sellers[i].Name, `Contact ${i + 1}`);
    assert.equal(sellers[i].Phone, `+97150${String(i).padStart(7, '0')}`);
    assert.equal(sellers[i].Email, `contact${i + 1}@example.invalid`);
  }
  console.log('PASS all 392 names, phones and emails round-trip in Sellers.xlsx');
  await page.locator('#scan').click();
  await page.waitForFunction(() => document.querySelector('#review-title')?.textContent === '392 sellers');
  assert.equal(await page.locator('#download').isEnabled(), true);
  assert.equal(await page.locator('#buildings').isVisible(), false);
  await mkdir('extensions/table-export/test-pages/results', { recursive: true });
  await page.locator('#export-ui').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'extensions/table-export/test-pages/results/ev-392-sellers.png', fullPage: false });
  // A malformed real record must still block capture; a detail panel must not.
  const malformed = await page.evaluate(() => {
    const row = document.querySelector('tbody tr'); row.removeChild(row.lastElementChild);
    return window.__snapshot();
  });
  assert.equal(malformed.rows.length, 92);
  assert.equal(Object.keys(malformed.rows[0].cells).length, 10);
  const merged = await page.evaluate(() => {
    document.querySelector('tbody tr td').colSpan = 2;
    return window.__snapshot();
  });
  assert.ok(merged.issues.some(i => i.includes('Merged cells')));
  console.log('PASS detail panels ignored; incomplete and merged real records retained/flagged');
  // Exercise move() with an attempted position which the DOM clamps unchanged.
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const clamped = await page.evaluate(async () => {
    const root = document.querySelector('table'), wrap = document.querySelector('#wrap');
    root.setAttribute('aria-colcount', '12');
    Object.defineProperty(wrap, 'scrollLeft', { get: () => 0, set: () => {}, configurable: true });
    const started = performance.now();
    const result = await window.__run();
    return { elapsed: performance.now() - started, issues: result.issues };
  });
  assert.ok(clamped.elapsed < 5000);
  assert.ok(clamped.issues.some(i => i.includes('Horizontal scrolling stopped')));
  assert.ok(!clamped.issues.some(i => i.includes('Scrolling did not render')));
  console.log('PASS unchanged scroll resolves immediately while incomplete capture stays blocked');
  await page.goto('http://127.0.0.1:4186');
  await page.getByRole('button', { name: 'Find my sellers', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#review-title')?.textContent === '144 sellers in 3 buildings', null, { timeout: 120000 });
  assert.equal(await page.locator('#download').isEnabled(), true);
  assert.equal(await page.locator('#buildings input').count(), 3);
  await page.screenshot({ path: 'extensions/table-export/test-pages/results/demo-144-sellers.png', fullPage: true });
  console.log('PASS built-in demo: 144 sellers, 3 buildings, download enabled');
  await page.getByText('Developer', { exact: true }).click();
  await page.getByRole('button', { name: 'Run capture checks', exact: true }).click();
  await page.waitForFunction(() => /10 browser checks passed|FAIL/.test(document.querySelector('#checks').textContent), null, { timeout: 240000 });
  const checks = await page.locator('#checks').innerText();
  assert.ok(!checks.includes('FAIL'), checks);
  console.log(checks);
} finally { await browser.close(); server.close(); }
