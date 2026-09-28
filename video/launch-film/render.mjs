// node video/launch-film/render.mjs [9x16|16x9] [--film film|app-film] [--fps 60] [--sub 2]
// Walks time, calls window.seek(t) for every subframe, pipes PNGs to ffmpeg
// (subframes blended for motion blur), then muxes out/score.wav.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { openFilm } from './browser.mjs';

const format = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '9x16';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const film = (() => { const i = process.argv.indexOf('--film'); return i > 0 ? process.argv[i + 1] : 'film'; })();
const FPS = arg('fps', 60), SUB = arg('sub', 2);
const out = path.join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
const tag = film === 'film' ? 'launch' : film;
const silent = path.join(out, `silent-${tag}-${format}.mp4`);
const final = path.join(out, `repeat-ai-${tag}-${format}.mp4`);

let session = await openFilm(format, film);
const { width, height, duration: DUR, errors } = session;
const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB` : 'null';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
  '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', silent],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DUR * FPS * SUB);
const started = Date.now();
// Long renders on a busy machine can hit a slow screenshot or a Chromium crash:
// retry the frame, reopening the film if the browser went away. Frames are pure
// functions of t, so the video continues seamlessly.
async function capture(t) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await session.seek(t);
      return await session.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height }, timeout: 60000 });
    } catch (error) {
      if (attempt >= 4) throw error;
      console.log(`retrying frame at ${t.toFixed(3)}s: ${String(error).split('\n')[0]}`);
      if (/closed|crash|Unable to capture/i.test(String(error))) {
        await session.browser.close().catch(() => {});
        session = await openFilm(format, film);
        errors.push(...session.errors);
      }
    }
  }
}
for (let i = 0; i < total; i += 1) {
  const png = await capture(i / (FPS * SUB));
  if (!ff.stdin.write(png)) await new Promise((resolve) => ff.stdin.once('drain', resolve));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${i / (FPS * SUB)}s / ${DUR}s  (${Math.round((Date.now() - started) / 1000)}s elapsed)`);
}
ff.stdin.end();
await new Promise((resolve) => ff.on('close', resolve));
await session.browser.close();
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));

// A voiceover mix (mix-app.mjs) wins over the plain score when present.
const mix = path.join(out, `mix-${film}.wav`);
const score = existsSync(mix) ? mix : path.join(out, film === 'film' ? 'score.wav' : `score-${film}.wav`);
if (!existsSync(score)) { console.log(`video only: ${silent} (run music.mjs for sound)`); process.exit(0); }
const mux = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', score, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
await new Promise((resolve) => mux.on('close', resolve));
console.log(`done: ${final}`);
