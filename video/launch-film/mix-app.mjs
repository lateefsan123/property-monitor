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
  [0, 3, 0.15],         // Two thousand sellers. So... who's due today?
  [5, 7.62, 3.9],       // Meet Repeat AI. Your whole day, at a glance.
  [9.54, 13.16, 8.5],   // Bring in your spreadsheet...
  [15.08, 17.19, 15.5], // Everyone due today. One list.
  [19.05, 25.71, 19.5], // Every day, Repeat sends forty automated WhatsApp messages...
  [27.92, 31.94, 27.8], // Need more? Just tap the WhatsApp icon...
  [34.07, 37.46, 32.9], // It lands right in their WhatsApp. And sellers reply.
  [39.98, 43.37, 39],   // Every message is personal. Their name. Their building...
  [45.09, 48.82, 44.8], // Track your buildings. Open any apartment...
  [50.49, 54.35, 51.2], // Pick the days each building gets its updates...
  [56.05, 58.17, 57.4], // Need something? Just ask Repeat.
  [60.78, 64.1, 61.6],  // Works with Google Sheets, Excel, Gmail, and your calendar.
  [66.48, 69.11, 66],   // Every seller. Right on time.
  [71.42, 72.75, 69.7], // Repeat AI.
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
  '[ducked][vo]amix=inputs=2:normalize=0,apad,atrim=0:73[mixed]',
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
