// Opens the film page in headless Chromium with the frame size of the format.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';

const bundled = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe');

export async function openFilm(format = '9x16', film = 'film', base = 'http://127.0.0.1:4190') {
  const executablePath = process.env.CHROME_PATH || (existsSync(bundled) ? bundled : undefined);
  const browser = await chromium.launch({ executablePath });
  const [width, height] = format === '16x9' ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${base}/video/launch-film/${film}.html?play=0&format=${format}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.seek === 'function');
  await page.evaluate(() => window.filmReady || true);
  const seek = (t) => page.evaluate((value) => window.seek(value), t);
  // A film can name its cut (app-film-v4) so its files never replace an older cut's.
  const { duration, name } = await page.evaluate(() => window.filmSize);
  return { browser, page, seek, width, height, duration, name, errors };
}
