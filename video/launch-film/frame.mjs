// [FILM=app-film] node frame.mjs 9x16 11.0 [11.5 ...]  -> out/frame-<format>-<t>.png
import path from 'node:path';
import { openFilm } from './browser.mjs';
const [format, ...times] = process.argv.slice(2);
const { browser, page, seek, errors } = await openFilm(format, process.env.FILM || 'film');
for (const t of times) { await seek(Number(t)); await page.screenshot({ path: path.join(import.meta.dirname, 'out', `frame-${format}-${t}.png`) }); }
await browser.close();
if (errors.length) console.log(errors.join('\n'));
