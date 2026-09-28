// node video/launch-film/mix-app.mjs
// Preserve phrases, leave explicit breathing gaps, and master voice/music/SFX.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { DURATION } from './app-pacing.mjs';
const out = path.join(import.meta.dirname, 'out');
const file = name => path.join(out, name);
function ff(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 16e6 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}
// Source, source start/end, film cue, pitch-preserving tempo, script.
// 0: previous ElevenLabs take; 1: the new conversational pickups.
// Trims include consonant lead-in and tails, verified against the transcript.
const lines = [
  [0, 0, 4.015, 0.25, 0.92, "Two thousand sellers. One question: who needs you today?"],
  [1, 0, 3.86, 5.95, 1, "Meet Repeat AI. Here's what needs your attention today."],
  [1, 5.52, 9.49, 11.05, 0.87, 'Start with your spreadsheet. Bring your sellers in, and keep them in one place.'],
  [0, 15.42, 18.70, 19.05, 0.94, 'Every seller due today. One clear list.'],
  [1, 11.25, 16.90, 23.85, 0.96, 'Repeat sends up to forty WhatsApp updates a day, based on recent sales in each building.'],
  [0, 27.74, 31.26, 33.10, 0.91, 'Want to step in? Tap once and send it yourself.'],
  [0, 33.06, 36.37, 38.50, 0.95, 'The update lands in WhatsApp. Read. Replied.'],
  [1, 18.65, 24.77, 45.60, 1, 'Each message uses their name and their building, so the update feels relevant.'],
  [0, 42.55, 45.57, 53.25, 0.75, 'Open any apartment and see exactly how its price has moved.'],
  [1, 26.71, 31.75, 60.15, 0.98, 'Choose the days for each building. Then let Repeat take care of the follow-up.'],
  [0, 52.20, 54.46, 67.45, 0.96, 'Need an answer? Ask Repeat.'],
  [0, 56.20, 58.75, 72.70, 0.82, 'Connect Sheets, Excel, Gmail, and your calendar.'],
  [0, 60.38, 63.59, 77.80, 0.94, 'Every seller. Every signal. Right on time.'],
  [0, 65.24, 66.51, 82.65, 0.95, 'Repeat AI.'],
];
const timing = lines.map(([source, start, end, cue, tempo, text], i) => ({
  line: i + 1, source, start, end, cue, tempo, text,
  finish: +(cue + (end - start) / tempo).toFixed(3),
}));
for (let i = 1; i < timing.length; i++) {
  const gap = timing[i].cue - timing[i - 1].finish;
  if (gap < 0.8) throw new Error(`Line ${i + 1} needs breathing room: ${gap.toFixed(3)}s`);
  timing[i].gapBefore = +gap.toFixed(3);
}
if (timing.at(-1).finish > DURATION - 1.5) throw new Error('Closing voice has no tail');

const voiceGraph = lines.map(([src, a, b, cue, speed], i) => {
  const duration = (b - a) / speed;
  return `[${src}:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,atempo=${speed},highpass=f=75,` +
    `afade=t=in:d=0.008,afade=t=out:st=${duration - 0.045}:d=0.045,` +
    `loudnorm=I=-18:TP=-3:LRA=9,aresample=48000,asetpts=PTS-STARTPTS,adelay=${Math.round(cue * 1000)}:all=1[v${i}]`;
});
voiceGraph.push(`${lines.map((_, i) => `[v${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${DURATION},aformat=channel_layouts=stereo[voice]`);
ff(['-i', file('vo-brady-confident.mp3'), '-i', file('vo-brady-conversation-pickups.mp3'),
  '-filter_complex', voiceGraph.join(';'), '-map', '[voice]', '-c:a', 'pcm_s24le', file('voice-app-film.wav')]);

// Continuous passage from Andrew Ev's Vastness, licensed from Mixkit for web video.
ff(['-i', file('music-vastness-andrew-ev.mp3'), '-af',
  `atrim=18:${18 + DURATION},asetpts=PTS-STARTPTS,highpass=f=70,lowpass=f=11500,equalizer=f=2200:t=q:w=0.8:g=-3,loudnorm=I=-27:TP=-8:LRA=9,afade=t=in:d=2,afade=t=out:st=${DURATION - 4.5}:d=4.5,aresample=48000`,
  '-c:a', 'pcm_s24le', file('score-app-film.wav')]);
const mixGraph = [
  '[0:a]asplit[voice][key]',
  '[1:a][key]sidechaincompress=threshold=0.035:ratio=3:attack=100:release=700:makeup=1[bed]',
  '[2:a]highpass=f=150,lowpass=f=6000,volume=-16dB[fx]',
  `[voice][bed][fx]amix=inputs=3:normalize=0,atrim=0:${DURATION}[premix]`,
].join(';');
const inputs = ['-i', file('voice-app-film.wav'), '-i', file('score-app-film.wav'), '-i', file('sfx-app-film.wav'), '-filter_complex'];
const target = 'I=-16:TP=-2:LRA=9';
const stderr = ff([...inputs, `${mixGraph};[premix]loudnorm=${target}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-']);
const measured = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
const normalize = `loudnorm=${target}:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}`;
ff([...inputs, `${mixGraph};[premix]${normalize},aresample=48000[o]`, '-map', '[o]', '-c:a', 'pcm_s24le', file('mix-app-film.wav')]);
writeFileSync(file('audio-timing.json'), JSON.stringify({ duration: DURATION, timing, measured }, null, 2));
console.table(timing.map(({ line, cue, finish, gapBefore }) => ({ line, cue, finish, gapBefore })));
console.log('Wrote 86-second mix; all inter-line gaps >= 0.8 seconds.');
