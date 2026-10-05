// node video/launch-film/mix-app.mjs
// Voice, licensed music and effects for the cut in app-pacing.mjs. The approved
// take plays once from VOICE.at, unedited: no trims, tempo changes or added pauses.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CUT, DURATION, VOICE } from './app-pacing.mjs';
const out = path.join(import.meta.dirname, 'out');
const file = name => path.join(out, name);
function ff(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 16e6 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}
const lastJson = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
const loudness = (args, filter = 'anull') => lastJson(ff([...args, '-af', `${filter},loudnorm=print_format=json`, '-f', 'null', '-']));
function length(name) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file(name)], { encoding: 'utf8' });
  return Number(result.stdout);
}

// Voice: one fixed gain to -18 LUFS and a peak limiter, so the delivery keeps its
// own timing and dynamics. The limiter's lookahead is compensated (latency=1).
const voiceLength = length(VOICE.file);
if (VOICE.at + voiceLength > DURATION - 1.5) throw new Error('Closing voice has no tail');
const voiceSource = loudness(['-i', file(VOICE.file)], 'highpass=f=75');
const voiceGain = +(-18 - Number(voiceSource.input_i)).toFixed(2);
ff(['-i', file(VOICE.file), '-af',
  `highpass=f=75,volume=${voiceGain}dB,alimiter=limit=0.708:attack=3:release=60:level=0:latency=1,` +
  `aresample=48000,adelay=${Math.round(VOICE.at * 1000)}:all=1,apad,atrim=0:${DURATION},aformat=channel_layouts=stereo`,
  '-c:a', 'pcm_s24le', file(`voice-${CUT}.wav`)]);

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

// Balance while the narration plays: voice stem against the ducked music.
const speech = ['-ss', String(VOICE.at), '-t', String(voiceLength)];
const voice = loudness([...speech, '-i', file(`voice-${CUT}.wav`)]);
const bed = loudness([...speech, '-i', file(`bed-${CUT}.wav`)]);
const master = loudness(['-i', file(`mix-${CUT}.wav`)]);
const report = {
  cut: CUT, duration: DURATION,
  voice: { file: VOICE.file, at: VOICE.at, length: voiceLength, gainDb: voiceGain, source: voiceSource },
  duringSpeech: { voiceLufs: Number(voice.input_i), musicLufs: Number(bed.input_i), musicBelowVoiceLu: +(Number(voice.input_i) - Number(bed.input_i)).toFixed(2) },
  premix: { integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp) },
  master: { integratedLufs: Number(master.input_i), truePeakDbtp: Number(master.input_tp), lra: Number(master.input_lra), normalization: applied.normalization_type },
};
writeFileSync(file(`audio-timing-${CUT}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report.duringSpeech, ...report.master, voiceGainDb: voiceGain }, null, 2));
