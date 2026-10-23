// Audio mix for v7 film. Take 1 voice + Vastness music + SFX → stereo WAV.
// Uses Codex's improved limiter approach from the v6 mix.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { VOICE, BREATHS, DURATION } from './app-pacing-v7.mjs';

const out = path.join(import.meta.dirname, 'out');
const voicePath = path.join(out, VOICE.file);
const musicPath = path.join(out, 'music-vastness-andrew-ev.mp3');
const sfxPath = path.join(out, 'sfx-app-film-v7.wav');
const mixPath = path.join(out, 'mix-app-film-v7.wav');
const RATE = 48000;
const mixSamples = Math.ceil(DURATION * RATE);

for (const [l, p] of [['voice', voicePath], ['sfx', sfxPath]]) {
  if (!existsSync(p)) { console.error(`Missing ${l}: ${p}`); process.exit(1); }
}
const hasMusic = existsSync(musicPath);

function decodeToRaw(fp, channels = 1) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', fp,
    '-f', 'f32le', '-acodec', 'pcm_f32le', '-ar', String(RATE), '-ac', String(channels), '-'],
    { maxBuffer: 100 * 1024 * 1024 });
  if (r.status !== 0) { console.error(`ffmpeg failed: ${r.stderr?.toString()}`); process.exit(1); }
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}

function readWav(fp) {
  const b = readFileSync(fp), off = b.indexOf('data') + 8, n = (b.length - off) / 2;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = b.readInt16LE(off + i * 2) / 32768;
  return s;
}

console.log('Decoding voice...');
const voiceRaw = decodeToRaw(voicePath);
let musicRaw = null;
if (hasMusic) { console.log('Decoding music...'); musicRaw = decodeToRaw(musicPath, 2); }
console.log('Reading SFX...');
const sfxRaw = readWav(sfxPath);

const left = new Float32Array(mixSamples);
const right = new Float32Array(mixSamples);

// Voice with breath splits
const voiceStart = Math.round(VOICE.at * RATE);
let takeOff = 0, mixOff = voiceStart;
const sorted = [...BREATHS].sort((a, b) => a[0] - b[0]);
for (const [splitSec, extraSec] of sorted) {
  const splitSample = Math.round(splitSec * RATE);
  const count = splitSample - takeOff;
  for (let i = 0; i < count && takeOff + i < voiceRaw.length && mixOff + i < mixSamples; i++) {
    left[mixOff + i] += voiceRaw[takeOff + i]; right[mixOff + i] += voiceRaw[takeOff + i];
  }
  mixOff += count + Math.round(extraSec * RATE);
  takeOff = splitSample;
}
for (let i = 0; takeOff + i < voiceRaw.length && mixOff + i < mixSamples; i++) {
  left[mixOff + i] += voiceRaw[takeOff + i]; right[mixOff + i] += voiceRaw[takeOff + i];
}

// Voice gain
const vGain = Math.pow(10, 2.5 / 20);
for (let i = 0; i < mixSamples; i++) { left[i] *= vGain; right[i] *= vGain; }

// Music: stereo, smooth ducking
if (musicRaw) {
  const mStart = Math.round(18 * RATE);
  const mGain = Math.pow(10, -10.5 / 20);
  const duck = Math.pow(10, -8 / 20);
  const fadeIn = 2 * RATE, fadeOut = 4.5 * RATE;
  const mEnd = Math.min(mixSamples, musicRaw.length / 2 - mStart);
  let envelope = 0, duckGain = 1;
  const coeff = (s) => 1 - Math.exp(-1 / (RATE * s));
  const envAtt = coeff(0.005), envRel = coeff(0.12);
  const gAtt = coeff(0.02), gRel = coeff(0.45);
  for (let i = 0; i < mEnd; i++) {
    const amp = Math.abs(left[i]);
    envelope += (amp > envelope ? envAtt : envRel) * (amp - envelope);
    const target = envelope > 0.006 ? duck : 1;
    duckGain += (target < duckGain ? gAtt : gRel) * (target - duckGain);
    let g = mGain * duckGain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > mEnd - fadeOut) g *= (mEnd - i) / fadeOut;
    left[i] += musicRaw[(mStart + i) * 2] * g;
    right[i] += musicRaw[(mStart + i) * 2 + 1] * g;
  }
}

// SFX
const sfxGain = Math.pow(10, -16 / 20);
for (let i = 0; i < sfxRaw.length && i < mixSamples; i++) {
  const s = sfxRaw[i] * sfxGain;
  left[i] += s; right[i] += s;
}

// Limiter via ffmpeg
const n = left.length, b = Buffer.alloc(n * 8);
for (let i = 0; i < n; i++) { b.writeFloatLE(left[i], i * 8); b.writeFloatLE(right[i], i * 8 + 4); }
const tmp = mixPath.replace(/\.wav$/, '-pre.wav');
const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', 'pipe:0',
  '-af', 'alimiter=limit=0.794328:attack=5:release=50:level=false:latency=true',
  '-c:a', 'pcm_s16le', tmp], { input: b, maxBuffer: 1024 * 1024 });
if (result.status !== 0) throw new Error(result.stderr?.toString() || 'Limiter failed');
renameSync(tmp, mixPath);
console.log(`Mix: ${mixPath} (${(mixSamples / RATE).toFixed(2)}s, stereo)`);
