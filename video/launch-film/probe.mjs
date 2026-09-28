import { openFilm } from './browser.mjs';
const { browser, page, seek } = await openFilm('9x16');
const read = async (t) => { await seek(t); return page.evaluate(() => document.querySelector('.film-line')?.textContent); };
console.log('t=0.5000', await read(0.5), '| t=0.5083', await read(0.5 + 1 / 120));
console.log('served code has frameTime:', await page.evaluate(async () => (await (await fetch('/video/launch-film/film.jsx')).text()).includes('frameTime')));
await browser.close();
