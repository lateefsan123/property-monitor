// Narration mix for the seller export how-to: the main take cut at its own
// pauses, with the install pickup between, placed per pacing.mjs.
// node mix.mjs  -> video/launch-film/out/mix-export-film.wav (render.mjs muxes it)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { CUT, DURATION, PARTS, PICKUP, VOICE } from './pacing.mjs';

const here = import.meta.dirname;
const voice = path.join(here, 'out', VOICE);
const pickup = path.join(here, 'out', PICKUP.file);
const out = path.join(here, '..', 'launch-film', 'out', `mix-${CUT}.wav`);

// Each clip: trim, short fades so cuts never click, then delay to its film time.
const clip = (input, from, to, at, label) =>
  `[${input}:a]atrim=${from}:${to},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(to - from - 0.06).toFixed(3)}:d=0.06,adelay=${Math.round(at * 1000)}:all=1[${label}]`;
const clips = [
  ...PARTS.map((p, i) => clip(0, p.from, p.to, p.at, `p${i}`)),
  clip(1, 0, PICKUP.end, PICKUP.at, 'pk'),
];
const labels = [...PARTS.map((_, i) => `[p${i}]`), '[pk]'].join('');
const graph = `${clips.join(';')};${labels}amix=inputs=${PARTS.length + 1}:normalize=0:duration=longest,apad=whole_dur=${DURATION.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`;

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', voice, '-i', pickup, '-filter_complex', graph, '-map', '[out]', '-ac', '2', out], { stdio: 'inherit' });
console.log(`${out} (${DURATION.toFixed(2)} s)`);
