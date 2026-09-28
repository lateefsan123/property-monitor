// node video/launch-film/render.mjs [9x16|16x9] [--fps 60] [--sub 2]
// Walks time, calls window.seek(t) for every subframe, pipes PNGs to ffmpeg
// (subframes blended for motion blur), then muxes out/score.wav.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { openFilm } from './browser.mjs';

const format = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '9x16';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FPS = arg('fps', 60), SUB = arg('sub', 2), DUR = 20;
const out = path.join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
const silent = path.join(out, `silent-${format}.mp4`);
const final = path.join(out, `repeat-ai-launch-${format}.mp4`);

const { browser, page, seek, width, height, errors } = await openFilm(format);
const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB` : 'null';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
  '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', silent],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DUR * FPS * SUB);
const started = Date.now();
for (let i = 0; i < total; i += 1) {
  await seek(i / (FPS * SUB));
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  if (!ff.stdin.write(png)) await new Promise((resolve) => ff.stdin.once('drain', resolve));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${i / (FPS * SUB)}s / ${DUR}s  (${Math.round((Date.now() - started) / 1000)}s elapsed)`);
}
ff.stdin.end();
await new Promise((resolve) => ff.on('close', resolve));
await browser.close();
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));

const score = path.join(out, 'score.wav');
if (!existsSync(score)) { console.log(`video only: ${silent} (run music.mjs for sound)`); process.exit(0); }
const mux = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', score, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
await new Promise((resolve) => mux.on('close', resolve));
console.log(`done: ${final}`);
