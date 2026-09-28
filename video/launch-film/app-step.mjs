// node app-step.mjs <name> "<step>" ["<step>" ...]
// Drives the film-mode app through steps, screenshots the end state to
// out/app/<name>.png and lists the controls on screen (for writing takes).
// Steps: "nav:Sellers"  "tap:Label"  "text:Visible text"  "fill:Label=value"  "wait:ms"  "scroll:px"
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openApp } from './app-browser.mjs';

const [name, ...steps] = process.argv.slice(2);
const out = path.join(import.meta.dirname, 'out', 'app');
mkdirSync(out, { recursive: true });
const { browser, page, settle, errors } = await openApp();
await settle(2500);

export async function runStep(page, settle, step) {
  const [kind, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (kind === 'nav') { await page.getByLabel('Open navigation').first().click(); await settle(600); await page.getByLabel(arg, { exact: true }).last().click(); }
  else if (kind === 'tap') await page.getByLabel(arg, { exact: true }).last().click();
  else if (kind === "text") await page.getByText(arg).last().click();
  else if (kind === 'fill') { const [label, value] = arg.split('='); await page.getByLabel(label).last().fill(value); }
  else if (kind === 'wait') await page.waitForTimeout(Number(arg));
  else if (kind === 'scroll') await page.mouse.wheel(0, Number(arg));
  await settle();
}
for (const step of steps) await runStep(page, settle, step);
await page.screenshot({ path: path.join(out, `${name}.png`) });
const names = await page.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],input,textarea,[aria-label]')]
  .filter((e) => e.getBoundingClientRect().height > 0)
  .map((e) => e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.innerText?.trim()).filter(Boolean).map((t) => t.replace(/\s+/g, ' ').slice(0, 60)));
console.log(JSON.stringify([...new Set(names)]));
if (errors.length) console.log('ERRORS', [...new Set(errors)].slice(0, 6));
await browser.close();
