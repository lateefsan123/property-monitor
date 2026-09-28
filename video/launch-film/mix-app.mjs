// node mix-app.mjs  ->  out/mix-app-film.wav
// Places each voiceover line (one ElevenLabs take, lines split by its pauses)
// on its picture cue, ducks the score under the voice, and masters to -14 LUFS.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const out = path.join(import.meta.dirname, 'out');
const VO = path.join(out, 'vo-bella.mp3');
const SCORE = path.join(out, 'score-app-film.wav');
const MIX = path.join(out, 'mix-app-film.wav');

// [start, end] of each line in the take (from silencedetect), and its cue in the film.
const LINES = [
  [0, 2.31, 0.2],       // Two thousand sellers. Who's due today?
  [4.22, 7.12, 3.6],    // This is Repeat AI. Your whole day, at a glance.
  [8.96, 12.77, 7.4],   // Bring in your spreadsheet...
  [14.59, 17.66, 13.4], // Everyone due for a follow-up today, in one list.
  [19.38, 25.01, 17.8], // Every day, forty automated WhatsApp messages tell owners what sold...
  [26.84, 31.18, 24.3], // Need more? Tap the WhatsApp icon...
  [32.92, 37.78, 29.3], // Every message is personalised...
  [39.49, 44.55, 34.5], // Track your buildings, open any apartment...
  [46.24, 50.52, 41.3], // Choose the days each building gets its updates...
  [52.39, 54.88, 47.4], // And when you need something, just ask Repeat.
  [56.61, 60.6, 51.6],  // It works with Google Sheets, Excel, Gmail...
  [62.54, 64.67, 55.9], // Every seller. Right on time.
  [66.45, 67.94, 58.4], // Repeat AI.
];

const pre = 0.05, post = 0.18;
const voice = LINES.map(([a, b, cue], i) => {
  const delay = Math.round((cue - pre) * 1000);
  return `[1:a]atrim=${Math.max(0, a - pre)}:${b + post},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${(b + post - Math.max(0, a - pre) - 0.06).toFixed(3)}:d=0.06,adelay=${delay}|${delay}[v${i}]`;
});
const graph = [
  ...voice,
  `${LINES.map((_, i) => `[v${i}]`).join('')}amix=inputs=${LINES.length}:normalize=0,aformat=channel_layouts=stereo,asplit[vo][key]`,
  // Music sits under the voice: -8 dB bed, then ducked a further ~6 dB under the voice.
  '[0:a]volume=-8dB[bed]',
  '[bed][key]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=380:makeup=1[ducked]',
  '[ducked][vo]amix=inputs=2:normalize=0,apad,atrim=0:61[mixed]',
];

const inputs = ['-hide_banner', '-y', '-i', SCORE, '-i', VO, '-filter_complex'];
const target = 'I=-14:TP=-2:LRA=11';
// Pass 1 measures loudness; pass 2 applies it linearly so the mix doesn't pump.
const probe = spawnSync('ffmpeg', [...inputs, `${graph.join(';')};[mixed]loudnorm=${target}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1));
const apply = `loudnorm=${target}:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
const run = spawnSync('ffmpeg', [...inputs, `${graph.join(';')};[mixed]${apply},aresample=48000[o]`, '-map', '[o]', '-c:a', 'pcm_s16le', MIX], { encoding: 'utf8' });
if (run.status !== 0) throw new Error(run.stderr.slice(-1500));
console.log(`wrote ${path.relative(process.cwd(), MIX)} (measured ${m.input_i} LUFS before mastering)`);
