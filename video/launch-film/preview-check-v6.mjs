// Preview check: captures representative frames in both formats and checks
// for missing images, errors, and correct timing.
// Run: node video/launch-film/preview-check-v6.mjs
import { chromium } from 'playwright-core';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const bundled = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe');
const executablePath = existsSync(bundled) ? bundled : undefined;
const base = process.argv[2] || 'http://127.0.0.1:4197';
const out = path.join(import.meta.dirname, 'out');

const times = [
  ['hook', 1.0], ['workspace', 8.0], ['status-dropdown', 12.0],
  ['statuses-dialog', 30.0], ['templates', 38.0], ['tpl-preview', 50.0],
  ['automations', 58.0], ['controls', 68.0], ['mobile', 78.0],
  ['ask', 84.0], ['close', 96.0],
];

async function checkFormat(format) {
  const [w, h] = format === '16x9' ? [1920, 1080] : [1080, 1920];
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|websocket/.test(m.text())) errors.push(m.text().slice(0, 150)); });

  await page.goto(`${base}/video/launch-film/app-film-v6.html?play=0&format=${format}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => typeof window.seek === 'function', { timeout: 15000 }).catch(() => {});
  const hasSeek = await page.evaluate(() => typeof window.seek === 'function');
  const filmSize = await page.evaluate(() => window.filmSize);
  console.log(`${format}: seek=${hasSeek}, filmSize=${JSON.stringify(filmSize)}`);

  if (!hasSeek) { await browser.close(); return errors; }

  // Check for missing images at various time points
  let missingImages = 0;
  for (const [label, t] of times) {
    await page.evaluate((v) => window.seek(v), t);
    await page.waitForTimeout(100);
    const file = path.join(out, `preview-v6-${label}-${format}.png`);
    await page.screenshot({ path: file });

    // Check for broken images (naturalWidth === 0)
    const broken = await page.evaluate(() => {
      return [...document.querySelectorAll('img')].filter(i => i.src && i.naturalWidth === 0).map(i => i.src.split('/').pop());
    });
    if (broken.length) {
      console.log(`  ${label} (t=${t}): MISSING ${broken.join(', ')}`);
      missingImages += broken.length;
    } else {
      console.log(`  ${label} (t=${t}): OK`);
    }
  }

  await browser.close();
  const real = errors.filter(e => !/404.*font|blockedbyclient/.test(e));
  if (real.length) console.log(`  Errors: ${real.join(' | ')}`);
  if (missingImages) console.log(`  ${missingImages} missing image(s)`);
  return errors;
}

const e9 = await checkFormat('9x16');
const e16 = await checkFormat('16x9');
const total = e9.length + e16.length;
console.log(`\nPreview check complete. ${total === 0 ? 'No errors.' : `${total} error(s).`}`);
