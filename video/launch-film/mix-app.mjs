// node video/launch-film/mix-app.mjs
// Voice, licensed music and effects for the cut in app-pacing.mjs. The narration
// take plays in order at its delivered speed: it is only split inside its own
// pauses (BREATHS) to give the picture room and to fit the Ask Repeat demo, and
// it fades out after its last word. No tempo changes, no pickups.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ANSWER_AT, BREATHS, CUT, DEMO, DURATION, QUESTION_AT, VOICE, say } from './app-pacing.mjs';
const out = path.join(import.meta.dirname, 'out');
const file = name => path.join(out, name);
function ff(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 16e6 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}
const lastJson = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
const loudness = (args, filter = 'anull') => lastJson(ff([...args, '-af', `${filter},loudnorm=print_format=json`, '-f', 'null', '-']));

// Each clip gets one fixed gain to -18 LUFS and a peak limiter (lookahead compensated),
// so every voice keeps its own timing and dynamics.
const clips = [VOICE.file, DEMO.question.file, DEMO.answer.file].map((name) => {
  const source = loudness(['-i', file(name)], 'highpass=f=75');
  return { name, gainDb: +(-18 - Number(source.input_i)).toFixed(2), source };
});
const MONO = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono';
// A clip at an exact length, so the parts land on the times app-pacing.mjs gives them.
const clip = (input, { gainDb }, length, fadeOut = 0.005) => `[${input}:a]highpass=f=75,volume=${gainDb}dB,` +
  `alimiter=limit=0.708:attack=3:release=60:level=0:latency=1,aresample=48000,${MONO},apad=whole_dur=${length},atrim=0:${length},` +
  `afade=t=in:d=0.005,afade=t=out:st=${(length - fadeOut).toFixed(3)}:d=${fadeOut}`;
const silence = (length) => `anullsrc=r=48000:cl=mono,atrim=0:${length},${MONO}`;
const FADE = 0.2; // after "sellers.", over a breath
const splits = [0, ...BREATHS.map(([split]) => split).sort((a, b) => a - b), VOICE.end + FADE];
const parts = splits.slice(0, -1).map((from, i) => ({ from, to: splits[i + 1], at: say(from) }));
if (say(VOICE.end) + FADE > DURATION - 1.5) throw new Error('Closing voice has no tail');
// In film order: lead-in, each part of the take, and the room after it (silence,
// or the Ask Repeat question and answer at the demo split).
const sources = [], graph = [], order = [];
let next = 0;
const input = (...args) => { sources.push(...args); return next++; };
const add = (filter) => { const label = `e${order.length}`; graph.push(`${filter}[${label}]`); order.push(`[${label}]`); };
add(silence(VOICE.at));
parts.forEach(({ from, to }, i) => {
  const last = i === parts.length - 1;
  add(clip(input('-ss', String(from), '-to', String(to), '-i', file(VOICE.file)), clips[0], +(to - from).toFixed(3), last ? FADE : 0.005));
  if (last) return;
  const [split, extra] = BREATHS.find(([at]) => at === to);
  if (split !== DEMO.split) { add(silence(extra)); return; }
  add(silence(DEMO.lead));
  add(clip(input('-i', file(DEMO.question.file)), clips[1], DEMO.question.length));
  add(silence(DEMO.think));
  add(clip(input('-i', file(DEMO.answer.file)), clips[2], DEMO.answer.length));
  add(silence(DEMO.tail));
});
graph.push(`${order.join('')}concat=n=${order.length}:v=0:a=1,apad,atrim=0:${DURATION},aformat=channel_layouts=stereo[voice]`);
ff([...sources, '-filter_complex', graph.join(';'), '-map', '[voice]', '-c:a', 'pcm_s24le', file(`voice-${CUT}.wav`)]);

// Continuous passage from Andrew Ev's Vastness, licensed from Mixkit for web video.
ff(['-i', file('music-vastness-andrew-ev.mp3'), '-af',
  `atrim=18:${18 + DURATION},asetpts=PTS-STARTPTS,highpass=f=70,lowpass=f=11500,equalizer=f=2200:t=q:w=0.8:g=-3,loudnorm=I=-27:TP=-8:LRA=9,afade=t=in:d=2,afade=t=out:st=${DURATION - 4.5}:d=4.5,aresample=48000`,
  '-c:a', 'pcm_s24le', file(`score-${CUT}.wav`)]);
const duck = 'sidechaincompress=threshold=0.035:ratio=3:attack=100:release=700:makeup=1';
const mixGraph = [
  '[0:a]asplit[voice][key]',
  `[1:a][key]${duck}[bed]`,
  '[2:a]highpass=f=150,lowpass=f=6000,volume=-16dB[fx]',
  `[voice][bed][fx]amix=inputs=3:normalize=0,atrim=0:${DURATION}[premix]`,
].join(';');
const inputs = ['-i', file(`voice-${CUT}.wav`), '-i', file(`score-${CUT}.wav`), '-i', file(`sfx-${CUT}.wav`), '-filter_complex'];
// The ducked music alone, to check it stays under the voice.
ff(['-i', file(`voice-${CUT}.wav`), '-i', file(`score-${CUT}.wav`), '-filter_complex', `[0:a]asplit[voice][key];[voice]anullsink;[1:a][key]${duck}[bed]`,
  '-map', '[bed]', '-c:a', 'pcm_s24le', file(`bed-${CUT}.wav`)]);
const target = 'I=-16:TP=-2:LRA=9';
const measured = lastJson(ff([...inputs, `${mixGraph};[premix]loudnorm=${target}:print_format=json[o]`, '-map', '[o]', '-f', 'null', '-']));
const normalize = `loudnorm=${target}:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}`;
const applied = lastJson(ff([...inputs, `${mixGraph};[premix]${normalize}:print_format=json,aresample=48000[o]`, '-map', '[o]', '-c:a', 'pcm_s24le', file(`mix-${CUT}.wav`)]));

// Balance while the voices play: voice stem against the ducked music.
const speech = ['-ss', String(VOICE.at), '-t', String(say(VOICE.end) - VOICE.at)];
const voice = loudness([...speech, '-i', file(`voice-${CUT}.wav`)]);
const bed = loudness([...speech, '-i', file(`bed-${CUT}.wav`)]);
const master = loudness(['-i', file(`mix-${CUT}.wav`)]);
const report = {
  cut: CUT, duration: DURATION,
  voice: { at: VOICE.at, end: VOICE.end, parts, clips: clips.map(({ name, gainDb, source }) => ({ name, gainDb, sourceLufs: Number(source.input_i), sourceTruePeak: Number(source.input_tp) })), questionAt: QUESTION_AT, answerAt: ANSWER_AT },
  duringSpeech: { voiceLufs: Number(voice.input_i), musicLufs: Number(bed.input_i), musicBelowVoiceLu: +(Number(voice.input_i) - Number(bed.input_i)).toFixed(2) },
  premix: { integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp) },
  master: { integratedLufs: Number(master.input_i), truePeakDbtp: Number(master.input_tp), lra: Number(master.input_lra), normalization: applied.normalization_type },
};
writeFileSync(file(`audio-timing-${CUT}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ gains: report.voice.clips.map(({ name, gainDb }) => `${name} ${gainDb} dB`), ...report.duringSpeech, ...report.master }, null, 2));
