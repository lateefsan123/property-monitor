// Puts Repeat, the broker fox, on the sample broker cards in the landing and
// onboarding artwork. Starts from the earlier PNGs (kept in public/landing),
// repaints each card's photo panel with the fox from shared/repeat-fox.js and
// replaces the fictional name "Omar Hassan" with "Repeat". Everything else in
// each image is left pixel for pixel.
//
//   node scripts/render-repeat-fox-cards.mjs
//
// Uses playwright-core from video/ and its bundled Chromium (or CHROME_PATH).
// Needs network access for the Newsreader web font.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const repo = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = createRequire(path.join(repo, 'video', 'package.json'))('playwright-core');
const fox = await import(pathToFileURL(path.join(repo, 'shared', 'repeat-fox.js')).href);
const FOX = { colors: fox.FOX_COLORS, head: fox.FOX_HEAD, eyes: fox.FOX_EYES, suit: fox.FOX_SUIT, collar: fox.FOX_COLLAR };

// Pixel positions measured on each source image. name: ink box of "Omar
// Hassan". panel: photo panel [x0, y0, x1, y1] with corner radii [tl, tr, br,
// bl]. cover: area cleared first, blended from its edges or, for the hero whose
// card sits in a green bubble, filled with the colour at `surround`.
const JOBS = [
  { src: 'hero-ask-repeat-minimal-v3.png', out: 'hero-ask-repeat-fox-v1.png',
    name: [1130, 439, 1336, 465], panel: [1377, 388, 1531.5, 535.5], radii: [0, 9, 9, 0], cover: [1377, 385, 1535, 539], surround: [1538, 462] },
  { src: 'product-templates-story-dubai-v1.png', out: 'product-templates-story-fox-dubai-v1.png',
    name: [1113, 198, 1399, 233], panel: [1464, 120, 1722, 355], radii: [12, 12, 12, 12], cover: [1461, 117, 1725, 358] },
  { src: 'product-templates-story-mobile-dubai-v1.png', out: 'product-templates-story-mobile-fox-dubai-v1.png',
    name: [146, 602, 617, 662], panel: [658, 492, 1007, 838], radii: [18, 18, 18, 18], cover: [655, 489, 1010, 841] },
  { src: 'product-templates-story-mobile-clean-v4.png', out: 'product-templates-story-mobile-fox-clean-v1.png',
    name: [146, 603, 618, 662], panel: [658, 492, 1007, 838], radii: [18, 18, 18, 18], cover: [655, 489, 1010, 841] },
];

function drawCard({ bytes, job, FOX }) {
  return (async () => {
    const blob = await (await fetch(`data:image/png;base64,${bytes}`)).blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    const pixel = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
    const rounded = (x0, y0, x1, y1, [tl, tr, br, bl]) => {
      const p = new Path2D();
      p.moveTo(x0 + tl, y0);
      p.lineTo(x1 - tr, y0); if (tr) p.arcTo(x1, y0, x1, y0 + tr, tr); else p.lineTo(x1, y0);
      p.lineTo(x1, y1 - br); if (br) p.arcTo(x1, y1, x1 - br, y1, br); else p.lineTo(x1, y1);
      p.lineTo(x0 + bl, y1); if (bl) p.arcTo(x0, y1, x0, y1 - bl, bl); else p.lineTo(x0, y1);
      p.lineTo(x0, y0 + tl); if (tl) p.arcTo(x0, y0, x0 + tl, y0, tl); else p.lineTo(x0, y0);
      p.closePath();
      return p;
    };
    // Blend each row between the pixels either side, so smooth card gradients
    // carry across the cleared area instead of leaving a flat patch.
    const inpaint = (x0, y0, x1, y1) => {
      const left = Math.max(0, Math.floor(x0) - 2), right = Math.min(canvas.width - 1, Math.ceil(x1) + 2);
      const top = Math.floor(y0), rows = Math.ceil(y1) - top + 1, w = right - left + 1;
      const img = ctx.getImageData(left, top, w, rows);
      for (let row = 0; row < rows; row++) {
        const a = row * w * 4, b = (row * w + w - 1) * 4;
        for (let col = 1; col < w - 1; col++) {
          const t = col / (w - 1), i = (row * w + col) * 4;
          for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(img.data[a + c] * (1 - t) + img.data[b + c] * t);
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, left, top);
    };

    const [px0, py0, px1, py1] = job.panel;
    const panelColour = pixel(Math.round(px0 + 14), Math.round(py0 + 14));
    const surround = job.surround ? pixel(...job.surround) : null;

    // Name: clear "Omar Hassan", then set "Repeat" at the same letter height,
    // left edge and baseline in Newsreader Bold, close to the card's serif.
    const [nx0, ny0, nx1, ny1] = job.name;
    inpaint(nx0 - 8, ny0 - 8, nx1 + 10, ny1 + 6);
    ctx.font = '700 100px Newsreader';
    let m = ctx.measureText('Omar Hassan');
    const size = 100 * (ny1 - ny0) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    ctx.font = `700 ${size}px Newsreader`;
    m = ctx.measureText('Omar Hassan');
    ctx.letterSpacing = `${-0.02 * size}px`;
    const repeat = ctx.measureText('Repeat');
    ctx.fillStyle = '#050505';
    ctx.fillText('Repeat', nx0 + repeat.actualBoundingBoxLeft, ny1 - m.actualBoundingBoxDescent);

    // Photo: clear the old panel, then a flat panel with the fox bust standing
    // on its bottom edge.
    const [cx0, cy0, cx1, cy1] = job.cover;
    if (surround) {
      ctx.fillStyle = surround;
      ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    } else inpaint(cx0, cy0, cx1, cy1);
    const panel = rounded(px0, py0, px1, py1, job.radii);
    ctx.fillStyle = panelColour;
    ctx.fill(panel);
    ctx.save();
    ctx.clip(panel);
    const s = 0.9 * (py1 - py0) / 0.91;
    ctx.translate((px0 + px1) / 2 - s / 2, py1 - s);
    ctx.scale(s / 100, s / 100);
    const polygon = (points, colour) => {
      const p = new Path2D();
      points.split(' ').map(pair => pair.split(',').map(Number)).forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
      ctx.fillStyle = colour;
      ctx.fill(p);
    };
    FOX.head.forEach(shape => polygon(shape.points, FOX.colors[shape.fill]));
    ctx.fillStyle = FOX.colors.ink;
    FOX.eyes.forEach(eye => { ctx.beginPath(); ctx.arc(eye.cx, eye.cy, eye.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = FOX.colors.suit;
    ctx.fill(new Path2D(FOX.suit));
    FOX.collar.forEach(shape => polygon(shape.points, FOX.colors[shape.fill]));
    ctx.restore();
    return { png: canvas.toDataURL('image/png').split(',')[1], width: canvas.width, height: canvas.height };
  })();
}

const bundled = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(bundled) ? bundled : undefined) });
try {
  const page = await browser.newPage();
  await page.setContent('<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@72,700&display=block"></head><body></body></html>');
  await page.evaluate(async () => { await document.fonts.load('700 60px Newsreader'); await document.fonts.ready; });
  for (const job of JOBS) {
    const bytes = readFileSync(path.join(repo, 'public', 'landing', job.src)).toString('base64');
    const result = await page.evaluate(drawCard, { bytes, job, FOX });
    writeFileSync(path.join(repo, 'public', 'landing', job.out), Buffer.from(result.png, 'base64'));
    console.log(`${job.out} ${result.width}x${result.height}`);
  }
} finally {
  await browser.close();
}
