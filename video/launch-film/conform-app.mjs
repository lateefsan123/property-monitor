// node video/launch-film/conform-app.mjs [9x16|16x9]
// Puts the current mix on the rendered picture of the cut in app-pacing.mjs, so an
// audio change doesn't need a new frame render. Both must match the cut length.
// (The 86-second cut re-timed its 73-second picture here; the v4 cut is rendered
// at its own timing by render.mjs.)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { CUT, DURATION } from './app-pacing.mjs';
const format = process.argv[2] || '9x16';
const out = path.join(import.meta.dirname, 'out');
const picture = path.join(out, `silent-${CUT}-${format}.mp4`);
const mix = path.join(out, `mix-${CUT}.wav`);
for (const source of [picture, mix]) {
  const info = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source], { encoding: 'utf8' });
  if (info.status !== 0) throw new Error(info.stderr);
  if (Math.abs(Number(info.stdout) - DURATION) > 0.05) throw new Error(`${path.basename(source)} is not ${DURATION} seconds.`);
}
const target = path.join(out, `repeat-ai-${CUT}-${format}.mp4`);
const result = spawnSync('ffmpeg', ['-hide_banner', '-y', '-i', picture, '-i', mix, '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(DURATION), '-movflags', '+faststart', target],
  { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`Conform failed: ${result.status}`);
console.log(target);
