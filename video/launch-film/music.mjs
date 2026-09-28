// node video/launch-film/music.mjs  ->  out/score.wav
// Original 20 s score at 120 BPM plus UI sound effects, synthesized in code
// and placed on the same timeline as film.jsx (no samples, no licensing).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SR = 48000;
const DUR = 20.5;
const BEAT = 0.5;
const L = new Float32Array(Math.ceil(DUR * SR));
const R = new Float32Array(L.length);
let seed = 1234567;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Adds a voice at time t (seconds), panned -1..1.
function add(t, len, fn, gain = 1, pan = 0) {
  const start = Math.floor(t * SR);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < len * SR && start + i < L.length; i += 1) {
    const v = fn(i / SR, i);
    L[start + i] += v * gl; R[start + i] += v * gr;
  }
}

const kick = (t) => add(t, 0.45, (s) => Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-s * 28)) * s) * Math.exp(-s * 7.5), 0.9);
const hat = (t, g = 0.12) => add(t, 0.06, (s) => noise() * Math.exp(-s * 70) * (s < 0.002 ? s / 0.002 : 1), g, 0.25);
const clap = (t) => add(t, 0.22, (s) => noise() * Math.exp(-s * 22) * (1 + 0.6 * Math.sin(s * 900)), 0.22, -0.1);
function pluck(t, midi, len = 0.3, gain = 0.2, pan = 0) {
  const f = hz(midi);
  add(t, len, (s) => {
    const saw = ((s * f) % 1) * 2 - 1;
    const sq = Math.sign(Math.sin(2 * Math.PI * f * 1.003 * s));
    return (saw * 0.6 + sq * 0.25) * Math.exp(-s * (6 / len)) * Math.min(1, s / 0.004);
  }, gain, pan);
}
function pad(t, midis, len, gain = 0.05) {
  midis.forEach((m, i) => add(t, len, (s) => {
    const env = Math.min(1, s / 0.6) * Math.min(1, (len - s) / 0.8);
    return (Math.sin(2 * Math.PI * hz(m) * s) + 0.3 * Math.sin(2 * Math.PI * hz(m) * 2.01 * s)) * env;
  }, gain, i % 2 ? 0.4 : -0.4));
}
const whoosh = (t, len = 0.5, gain = 0.28) => {
  let lp = 0;
  add(t - len * 0.7, len, (s) => { lp += (noise() - lp) * (0.02 + 0.3 * (s / len)); return lp * Math.sin(Math.PI * s / len) ** 2 * 3; }, gain);
};
const click = (t, gain = 0.35) => add(t, 0.04, (s) => Math.sin(2 * Math.PI * 2400 * s) * Math.exp(-s * 160), gain, 0.15);
const tick = (t, gain = 0.12) => add(t, 0.02, (s) => Math.sin(2 * Math.PI * 3200 * s) * Math.exp(-s * 300), gain);
const pop = (t, f = 700, gain = 0.25) => add(t, 0.12, (s) => Math.sin(2 * Math.PI * (f + 600 * s) * s) * Math.exp(-s * 34), gain);
const chime = (t, midis, gain = 0.16, step = 0.07) => midis.forEach((m, i) => add(t + i * step, 0.9, (s) => (Math.sin(2 * Math.PI * hz(m) * s) + 0.25 * Math.sin(2 * Math.PI * hz(m) * 3 * s)) * Math.exp(-s * 4.5), gain, (i - 1) * 0.3));
const riser = (t0, t1, gain = 0.2) => {
  let lp = 0;
  add(t0, t1 - t0, (s) => { const p = s / (t1 - t0); lp += (noise() - lp) * (0.01 + 0.5 * p * p); return lp * p * p * 2.5; }, gain);
};
const sub = (t, len, midi, gain = 0.35) => add(t, len, (s) => Math.sin(2 * Math.PI * hz(midi) * s) * Math.exp(-s * 1.2) * Math.min(1, s / 0.01), gain);

// Harmony: Am - F - C - G, one chord per bar (4 beats).
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ROOTS = [45, 41, 48, 43];
const bar = (t) => Math.floor(t / (4 * BEAT)) % 4;

// 0-2.5 hook: count-up ticks, pops on each word, sub pulse.
for (let i = 0; i < 26; i += 1) tick(Math.pow(i / 26, 1.7) * 1.0, 0.1);
sub(0, 1.4, 33, 0.4); kick(0);
pop(0.5, 520); kick(1.5); pop(1.55, 620); pop(2.0, 820, 0.3); clap(2.0);
pad(0, CHORDS[0].map((m) => m + 12), 2.6, 0.035);
whoosh(2.5);

// 2.5-14 groove.
for (let t = 2.5; t < 14; t += BEAT) {
  kick(t);
  hat(t + BEAT / 2, 0.11);
  if (t >= 5) hat(t + BEAT / 4, 0.05), hat(t + (3 * BEAT) / 4, 0.05);
  const b = Math.round((t - 2.5) / BEAT) % 4;
  if (b === 1 || b === 3) clap(t);
  const c = bar(t - 0.5);
  pluck(t, ROOTS[c], 0.22, 0.2, -0.05);
  pluck(t + BEAT / 2, ROOTS[c] + 12, 0.16, 0.12, 0.05);
  if (t >= 5 && (b === 0 || b === 2)) CHORDS[c].forEach((m, i) => pluck(t + 0.25, m + 12, 0.2, 0.05, i - 1));
}
// Picture cues.
[2.6, 2.75, 2.9].forEach((t, i) => pop(t, 600 + i * 120, 0.16));
click(4.5, 0.45); whoosh(5.0, 0.6, 0.32);
for (let i = 0; i < 6; i += 1) tick(5.5 + i * 0.25, 0.14);
pop(7.5, 700); pop(8.0, 880); pop(10.1, 700); pop(10.6, 880);
[10.5, 11, 11.5, 12, 12.5].forEach((t, i) => { click(t, 0.45); chime(t + 0.04, [76 + i, 83 + i], 0.08, 0.05); });
riser(12.6, 14.0, 0.2);
chime(13.25, [69, 73, 76, 81], 0.2, 0.06);
whoosh(14.0, 0.7, 0.34);

// 14-17 breath: pad only, soft pulse; words land on pops.
pad(14.0, [57, 64, 69, 72], 3.2, 0.05);
sub(14.0, 1.5, 33, 0.3);
pop(14.25, 540, 0.22); pop(15.0, 720, 0.24);
for (let t = 15; t < 17; t += BEAT) hat(t, 0.05);
riser(16.1, 17.0, 0.16);

// 17-20 lockup: big hit and resolve.
kick(17); sub(17, 3.2, 33, 0.5); whoosh(17.0, 0.6, 0.3);
pad(17, [57, 64, 69, 72, 76], 3.3, 0.055);
chime(17.35, [81, 88], 0.12, 0.12); pop(17.9, 900, 0.2);

// Master: gentle saturation, peak-normalise to -1 dBFS, 16-bit stereo WAV.
let peak = 0;
for (let i = 0; i < L.length; i += 1) {
  L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
// About -2 dBFS sample peak, leaving headroom for AAC encoding.
const gain = 0.79 / (peak || 1);
const fadeFrom = Math.floor(19.4 * SR);
const n = L.length, buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i += 1) {
  const fade = i > fadeFrom ? Math.max(0, 1 - (i - fadeFrom) / (1.1 * SR)) : 1;
  buf.writeInt16LE(Math.round(L[i] * gain * fade * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * gain * fade * 32767), 46 + i * 4);
}
const out = path.join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'score.wav'), buf);
console.log('wrote out/score.wav', (n / SR).toFixed(1) + 's');
