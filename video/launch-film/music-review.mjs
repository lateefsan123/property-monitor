// Build two music auditions without overwriting the approved picture or stems.
// node video/launch-film/music-review.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CUT, DURATION } from './app-pacing.mjs';

const out = path.join(import.meta.dirname, 'out');
const file = name => path.join(out, name);
function ff(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 16e6 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}
const lastJson = text => JSON.parse(text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1));
const measure = name => lastJson(ff(['-i', file(name), '-af', 'loudnorm=print_format=json', '-f', 'null', '-']));
if (DURATION !== 72) throw new Error('These generated music candidates are composed for the 72-second cut');
const reports = [];
for (const variant of ['a', 'b']) {
  const tag = `${CUT}-eleven-music-${variant}`;
  const source = `music-eleven-quiet-confidence-${variant}.wav`;
  const length = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file(source)], { encoding: 'utf8' });
  if (length.status !== 0 || Math.abs(Number(length.stdout) - DURATION) > 0.1) throw new Error(`Unexpected music duration: ${source}`);
  ff(['-i', file(source), '-af',
    `atrim=0:${DURATION},asetpts=PTS-STARTPTS,highpass=f=70,equalizer=f=2200:t=q:w=0.8:g=-3,` +
    `loudnorm=I=-27:TP=-8:LRA=9,afade=t=in:d=0.5,afade=t=out:st=${DURATION - 2}:d=2,aresample=48000`,
    '-c:a', 'pcm_s24le', file(`score-${tag}.wav`)]);
  const duck = 'sidechaincompress=threshold=0.035:ratio=3:attack=100:release=700:makeup=1';
  const inputs = ['-i', file(`voice-${CUT}.wav`), '-i', file(`score-${tag}.wav`), '-i', file(`sfx-${CUT}.wav`)];
  const graph = '[0:a]asplit[voice][key];' + `[1:a][key]${duck}[bed];` +
    '[2:a]highpass=f=150,lowpass=f=6000,volume=-16dB[fx];' +
    `[voice][bed][fx]amix=inputs=3:normalize=0,atrim=0:${DURATION}[premix]`;
  const target = 'I=-16:TP=-2:LRA=9';
  const measured = lastJson(ff([...inputs, '-filter_complex', `${graph};[premix]loudnorm=${target}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-']));
  const norm = `loudnorm=${target}:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}`;
  ff([...inputs, '-filter_complex', `${graph};[premix]${norm},aresample=48000[o]`, '-map', '[o]', '-c:a', 'pcm_s24le', file(`mix-${tag}.wav`)]);
  // Copy the finished picture exactly; replace its audio with this audition mix.
  const exportName = `repeat-ai-${tag}-9x16.mp4`;
  ff(['-i', file(`repeat-ai-${CUT}-9x16.mp4`), '-i', file(`mix-${tag}.wav`), '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(DURATION), '-movflags', '+faststart', file(exportName)]);
  ff(['-v', 'error', '-i', file(exportName), '-f', 'null', '-']);
  const master = measure(`mix-${tag}.wav`);
  if (Number(master.input_tp) > -1.9 || Math.abs(Number(master.input_i) + 16) > 0.5) throw new Error(`Master outside expected loudness bounds: ${tag}`);
  reports.push({ variant, source, exportName, duration: DURATION, integratedLufs: Number(master.input_i), truePeakDbtp: Number(master.input_tp) });
}
writeFileSync(file('eleven-music-review.json'), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
