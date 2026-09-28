// node app-explore.mjs  -> lists tappable controls on Home and in the drawer
import { openApp } from './app-browser.mjs';
const { browser, page, settle, errors } = await openApp();
await settle(3000);
const names = () => page.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],[role=tab],button,[aria-label]')].map((e) => e.getAttribute('aria-label') || e.innerText?.trim()).filter(Boolean).map((t) => t.replace(/\s+/g, ' ').slice(0, 50)));
console.log('HOME:', JSON.stringify([...new Set(await names())]));
console.log('first');
console.log('DRAWER:', JSON.stringify([...new Set(await names())]));
if (errors.length) console.log('ERRORS', [...new Set(errors)].slice(0, 5));
await browser.close();
