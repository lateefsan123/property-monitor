// Shared synthesizer for the film scores: drums, plucks, pads, UI sounds and a
// mastering step. Deterministic (seeded noise), no samples.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const SR = 48000;
export const BEAT = 0.5;
export const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
export const ROOTS = [45, 41, 48, 43];
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function createScore(duration) {
  const L = new Float32Array(Math.ceil(duration * SR));
  const R = new Float32Array(L.length);
  let seed = 1234567;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;

  function add(t, len, fn, gain = 1, pan = 0) {
    const start = Math.floor(t * SR);
    const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
    for (let i = 0; i < len * SR && start + i < L.length; i += 1) {
      if (start + i < 0) continue;
      const v = fn(i / SR, i);
      L[start + i] += v * gl; R[start + i] += v * gr;
    }
  }
  const s = {
    add,
    kick: (t) => add(t, 0.45, (x) => Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-x * 28)) * x) * Math.exp(-x * 7.5), 0.9),
    hat: (t, g = 0.12) => add(t, 0.06, (x) => noise() * Math.exp(-x * 70) * (x < 0.002 ? x / 0.002 : 1), g, 0.25),
    clap: (t) => add(t, 0.22, (x) => noise() * Math.exp(-x * 22) * (1 + 0.6 * Math.sin(x * 900)), 0.22, -0.1),
    pluck(t, midi, len = 0.3, gain = 0.2, pan = 0) {
      const f = hz(midi);
      add(t, len, (x) => {
        const saw = ((x * f) % 1) * 2 - 1;
        const sq = Math.sign(Math.sin(2 * Math.PI * f * 1.003 * x));
        return (saw * 0.6 + sq * 0.25) * Math.exp(-x * (6 / len)) * Math.min(1, x / 0.004);
      }, gain, pan);
    },
    pad(t, midis, len, gain = 0.05) {
      midis.forEach((m, i) => add(t, len, (x) => {
        const env = Math.min(1, x / 0.6) * Math.min(1, (len - x) / 0.8);
        return (Math.sin(2 * Math.PI * hz(m) * x) + 0.3 * Math.sin(2 * Math.PI * hz(m) * 2.01 * x)) * env;
      }, gain, i % 2 ? 0.4 : -0.4));
    },
    whoosh(t, len = 0.5, gain = 0.28) {
      let lp = 0;
      add(t - len * 0.7, len, (x) => { lp += (noise() - lp) * (0.02 + 0.3 * (x / len)); return lp * Math.sin(Math.PI * x / len) ** 2 * 3; }, gain);
    },
    click: (t, gain = 0.35) => add(t, 0.04, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 160), gain, 0.15),
    tick: (t, gain = 0.12) => add(t, 0.02, (x) => Math.sin(2 * Math.PI * 3200 * x) * Math.exp(-x * 300), gain),
    pop: (t, f = 700, gain = 0.25) => add(t, 0.12, (x) => Math.sin(2 * Math.PI * (f + 600 * x) * x) * Math.exp(-x * 34), gain),
    chime: (t, midis, gain = 0.16, step = 0.07) => midis.forEach((m, i) => add(t + i * step, 0.9, (x) => (Math.sin(2 * Math.PI * hz(m) * x) + 0.25 * Math.sin(2 * Math.PI * hz(m) * 3 * x)) * Math.exp(-x * 4.5), gain, (i - 1) * 0.3)),
    riser(t0, t1, gain = 0.2) {
      let lp = 0;
      add(t0, t1 - t0, (x) => { const p = x / (t1 - t0); lp += (noise() - lp) * (0.01 + 0.5 * p * p); return lp * p * p * 2.5; }, gain);
    },
    sub: (t, len, midi, gain = 0.35) => add(t, len, (x) => Math.sin(2 * Math.PI * hz(midi) * x) * Math.exp(-x * 1.2) * Math.min(1, x / 0.01), gain),

    // Four-on-the-floor groove with bass plucks and chord stabs on the grid.
    groove(from, to, { stabs = true, busyHats = true } = {}) {
      for (let t = from; t < to - 1e-6; t += BEAT) {
        s.kick(t);
        s.hat(t + BEAT / 2, 0.11);
        if (busyHats) { s.hat(t + BEAT / 4, 0.05); s.hat(t + (3 * BEAT) / 4, 0.05); }
        const b = Math.round((t - from) / BEAT) % 4;
        if (b === 1 || b === 3) s.clap(t);
        const c = Math.floor(t / (4 * BEAT)) % 4;
        s.pluck(t, ROOTS[c], 0.22, 0.2, -0.05);
        s.pluck(t + BEAT / 2, ROOTS[c] + 12, 0.16, 0.12, 0.05);
        if (stabs && (b === 0 || b === 2)) CHORDS[c].forEach((m, i) => s.pluck(t + 0.25, m + 12, 0.2, 0.05, i - 1));
      }
    },

    // Gentle saturation, peak-normalise to about -2 dBFS (AAC headroom), fade, 16-bit stereo WAV.
    // A fixed gain keeps every sound's level when the loudest one is removed.
    write(file, fadeFrom = duration - 1.1, fixedGain = null) {
      let peak = 0;
      for (let i = 0; i < L.length; i += 1) {
        L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2);
        peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      }
      const gain = fixedGain ?? 0.79 / (peak || 1);
      console.log(`output gain ${gain.toFixed(4)} (peak ${(peak * gain).toFixed(3)})`);
      const fadeStart = Math.floor(fadeFrom * SR);
      const n = L.length, buf = Buffer.alloc(44 + n * 4);
      buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
      buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
      buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
      buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
      for (let i = 0; i < n; i += 1) {
        const fade = i > fadeStart ? Math.max(0, 1 - (i - fadeStart) / (1.1 * SR)) : 1;
        buf.writeInt16LE(Math.round(L[i] * gain * fade * 32767), 44 + i * 4);
        buf.writeInt16LE(Math.round(R[i] * gain * fade * 32767), 46 + i * 4);
      }
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, buf);
      console.log(`wrote ${path.relative(process.cwd(), file)} ${(n / SR).toFixed(1)}s`);
    },
  };
  return s;
}
