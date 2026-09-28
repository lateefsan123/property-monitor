// Opens the real mobile app (web build in film mode, port 8083) at iPhone
// size and 3x density, dark theme, with its offline demo backend.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';

const bundled = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe');

export async function openApp({ base = 'http://127.0.0.1:8083', theme = 'dark' } = {}) {
  const executablePath = process.env.CHROME_PATH || (existsSync(bundled) ? bundled : undefined);
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, colorScheme: theme, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript((value) => { try { localStorage.setItem('seller-signal-theme', value); } catch { /* storage unavailable */ } }, theme);
  // Dev servers keep sockets open, so wait for the app's own navigation instead of network idle.
  await page.goto(base, { waitUntil: 'load', timeout: 180000 });
  await page.getByLabel('Open navigation').first().waitFor({ timeout: 180000 });
  // react-native-web leaves inputs on Chromium's fallback face; match the app's system type.
  await page.addStyleTag({ content: 'input, textarea { outline: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; } input::placeholder, textarea::placeholder { font-weight: 400 !important; } svg text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }' });
  const settle = (ms = 900) => page.waitForTimeout(ms);
  const tap = async (text, options = {}) => { await page.getByText(text, { exact: true, ...options }).last().click(); await settle(); };
  return { browser, page, errors, settle, tap };
}
