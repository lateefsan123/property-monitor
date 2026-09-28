// node app-probe.mjs [name]  ->  out/app/<name>.png  (first-look check of film mode)
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openApp } from './app-browser.mjs';

const out = path.join(import.meta.dirname, 'out', 'app');
mkdirSync(out, { recursive: true });
const { browser, page, errors, settle } = await openApp();
await settle(4000);
await page.screenshot({ path: path.join(out, `${process.argv[2] || 'probe'}.png`) });
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 600));
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
await browser.close();
