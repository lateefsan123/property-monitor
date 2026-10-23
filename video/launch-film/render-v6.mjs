// node video/launch-film/render-v6.mjs [9x16|16x9] [--fps 30] [--sub 1]
// v6 render: uses the v6 Vite server at port 4197.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { openFilm } from './browser.mjs';

const format = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '9x16';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FPS = arg('fps', 60), SUB = arg('sub', 2);
const film = 'app-film-v6';
const base = 'http://127.0.0.1:4197';
const out = path.join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });

let session = await openFilm(format, film, base);
const { width, height, duration: DUR, errors } = session;
const cut = session.name || film;
const silent = path.join(out, `silent-${cut}-${format}.mp4`);
const final = path.join(out, `repeat-ai-${cut}-${format}.mp4`);
const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB` : 'null';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
  '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', silent],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DUR * FPS * SUB);
const started = Date.now();

async function capture(t) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await session.seek(t);
      return await session.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height }, timeout: 60000 });
    } catch (error) {
      if (attempt >= 4) throw error;
      console.log(`retrying ${t.toFixed(3)}s: ${String(error).split('\n')[0]}`);
      if (/closed|crash|Unable/i.test(String(error))) {
        await session.browser.close().catch(() => {});
        session = await openFilm(format, film, base);
        errors.push(...session.errors);
      }
    }
  }
}

console.log(`Rendering ${format} at ${FPS}fps (sub=${SUB}), ${DUR}s, ${total} frames...`);
for (let i = 0; i < total; i += 1) {
  const png = await capture(i / (FPS * SUB));
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * SUB * 5) === 0) console.log(`${Math.round(i / (FPS * SUB))}s / ${DUR}s  (${Math.round((Date.now() - started) / 1000)}s)`);
}
ff.stdin.end();
const renderCode = await new Promise((r, reject) => { ff.once('error', reject); ff.once('close', r); });
await session.browser.close();
if (renderCode !== 0) throw new Error(`Video encoder exited ${renderCode}`);
const real = (errors || []).filter(e => !/WebSocket|websocket/.test(e));
if (real.length) throw new Error('PAGE ERRORS:\n' + real.join('\n'));

const mix = path.join(out, `mix-${cut}.wav`);
if (!existsSync(mix)) { console.log(`video only: ${silent}`); process.exit(0); }
const mux = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', mix, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
const muxCode = await new Promise((r, reject) => { mux.once('error', reject); mux.once('close', r); });
if (muxCode !== 0) throw new Error(`Audio mux exited ${muxCode}`);
console.log(`done: ${final}`);
