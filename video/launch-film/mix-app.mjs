// node mix-app.mjs  ->  out/mix-app-film.wav
// Places each voiceover line (one ElevenLabs take, lines split by its pauses)
// on its picture cue, ducks the score under the voice, and masters to -14 LUFS.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const out = path.join(import.meta.dirname, 'out');
const VO = path.join(out, 'vo-brady-confident.mp3');
const SCORE = path.join(out, 'score-app-film.wav');
const MIX = path.join(out, 'mix-app-film.wav');

// [start, end] of each line in the take (from silencedetect), and its cue in the film.
const LINES = [
  [0, 3.855, 0.15],          // Two thousand sellers. One question: who needs you today?
  [6.562, 8.892, 3.9],       // Repeat AI puts the answer right in front of you.
  [11.122, 13.297, 8.5],     // Import your spreadsheet. Your pipeline is ready.
  [15.569, 18.544, 15.5],    // Every seller due today. One clear list.
  [20.658, 25.777, 19.5],    // Repeat sends forty timely WhatsApp updates every day...
  [27.895, 31.098, 27.8],    // Want to step in? Tap once and send it yourself.
  [33.211, 36.206, 32.9],    // The update lands in WhatsApp. Read. Replied.
  [38.3, 40.733, 39],        // Every message is personal: seller, property, building.
  [42.7, 45.412, 44.8],      // Open any apartment and see exactly how its price has moved.
  [47.446, 50.421, 51.2],    // Choose the days for each building. Repeat handles the schedule.
  [52.352, 54.297, 57.4],    // Need an answer? Ask Repeat.
  [56.35, 58.592, 61.6],     // Connect Sheets, Excel, Gmail, and your calendar.
  [60.527, 63.423, 66],      // Every seller. Every signal. Right on time.
  [65.398, 66.51, 69.7],     // Repeat AI.
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
