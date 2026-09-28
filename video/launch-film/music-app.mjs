// node video/launch-film/music-app.mjs  ->  out/score-app-film.wav
// 61 s bed for app-film.jsx at 120 BPM, written to sit under the voiceover:
// soft pads, a round bass and a muted pulse. No sound effects.
import path from 'node:path';
import { BEAT, CHORDS, ROOTS, createScore, hz } from './synth.mjs';

const s = createScore(61.5);
const BAR = BEAT * 4;

// Muted kick: lower, shorter and quieter than the drum-kit kick.
const thump = (t, gain = 0.32) => s.add(t, 0.3, (x) => Math.sin(2 * Math.PI * (44 + 50 * Math.exp(-x * 30)) * x) * Math.exp(-x * 11), gain);
// Round bass: sine with a slow attack, one note per bar.
const bass = (t, midi, len, gain = 0.2) => s.add(t, len, (x) => Math.sin(2 * Math.PI * hz(midi) * x) * Math.min(1, x / 0.05) * Math.min(1, (len - x) / 0.25), gain);

// Two bars per chord, pads and bass throughout; the pulse enters after the hook
// and drops out for the close so the tagline breathes.
for (let bar = 0, t = 0; t < 55.5; bar += 1, t = bar * BAR) {
  const c = Math.floor(bar / 2) % 4;
  if (bar % 2 === 0) s.pad(t, CHORDS[c].map((m) => m + 12), BAR * 2 + 0.6, 0.045);
  bass(t, ROOTS[c], BAR - 0.05);
  if (t >= 3) for (let b = 0; b < 4; b += 1) thump(t + b * BEAT, b % 2 ? 0.2 : 0.3);
}

// Close 55.5-61: one held chord for the tagline, a warm resolve on the wordmark.
s.pad(55.5, [57, 64, 69, 72], 2.9, 0.05);
bass(55.5, 45, 2.6, 0.18);
thump(58.1, 0.35);
s.pad(58.1, [57, 64, 69, 72, 76], 3.2, 0.055);
bass(58.1, 45, 3.2, 0.2);

s.write(path.join(import.meta.dirname, 'out', 'score-app-film.wav'), 59.9);
