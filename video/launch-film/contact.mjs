// node video/launch-film/contact.mjs [9x16|16x9] [step] [film|app-film]
// Renders one frame per beat (default 0.5 s) and tiles them into a contact
// sheet so the whole film can be reviewed before a full render.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { openFilm } from './browser.mjs';

const format = process.argv[2] || '9x16';
const step = Number(process.argv[3] || 0.5);
const film = process.argv[4] || 'film';
const out = path.join(import.meta.dirname, 'out');
const { browser, page, seek, duration, name, errors } = await openFilm(format, film);
const frames = path.join(out, `contact-${name || film}-${format}`);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
let index = 0;
for (let t = 0; t < duration; t += step, index += 1) {
  await seek(t + 0.001);
  await page.screenshot({ path: path.join(frames, `${String(index).padStart(3, '0')}.png`) });
}
await browser.close();



const result = spawnSync('python', [path.join(import.meta.dirname, 'sheet.py'), frames, String(step), format === '16x9' ? '5' : '8'], { stdio: 'inherit' });
if (result.status !== 0) console.log('sheet failed');
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
