// Product shots for the seller export sales page, cut from the how-to film:
// the browser only, with captions and the cursor hidden.
//   node video/export-film/stills.mjs   (film studio running on :4190)
//   -> public/export/*.png (convert to .webp for the page)
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { openFilm } from '../launch-film/browser.mjs';
import { T } from './pacing.mjs';

const out = path.join(import.meta.dirname, '..', '..', 'public', 'export');
mkdirSync(out, { recursive: true });
const shots = {
  hero: T.list + 1.0,
  'step-crm': T.crm + 1.5,
  'step-scan': T.scanStart + 2.5,
  'step-list': T.untick + 0.8,
  'step-files': T.files + 1.95,
};
const { browser, page, seek } = await openFilm('16x9', '../export-film/film');
await page.addStyleTag({ content: '.caption, .cursor { display: none !important; }' });
for (const [name, t] of Object.entries(shots)) {
  await seek(t);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, `${name}.png`), clip: { x: 160, y: 66, width: 1600, height: 900 } });
  console.log(name, t.toFixed(2));
}
// Poster for the page's video: the film's title card, full frame.
await seek(2.4);
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(out, 'video-poster.png'), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
console.log('video-poster 2.40');
await browser.close();
