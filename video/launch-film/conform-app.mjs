// Re-time the rendered 73-second picture using the shared pacing map.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { DURATION, SOURCE_DURATION, PACING } from './app-pacing.mjs';
const out = path.join(import.meta.dirname, 'out');
const source = path.join(out, 'source-app-film-9x16-73s.mp4');
const info = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', source], { encoding: 'utf8' });
if (info.status !== 0) throw new Error(info.stderr);
if (Math.abs(Number(JSON.parse(info.stdout).format.duration) - SOURCE_DURATION) > 0.03)
  throw new Error('Conform requires the original 73-second silent picture.');
let expression = String(DURATION);
for (let i = PACING.length - 1; i >= 1; i--) {
  const [a, x] = PACING[i - 1], [b, y] = PACING[i];
  expression = `if(lt(T,${b}),${x}+(T-${a})*${(y - x) / (b - a)},${expression})`;
}
const target = path.join(out, 'repeat-ai-app-film-9x16-sound-review.mp4');
const result = spawnSync('ffmpeg', ['-hide_banner', '-y', '-i', source,
  '-i', path.join(out, 'mix-app-film.wav'), '-map', '0:v:0', '-map', '1:a:0',
  '-vf', `setpts='(${expression})/TB',fps=60`, '-t', String(DURATION),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', target],
  { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`Conform failed: ${result.status}`);
console.log(target);
