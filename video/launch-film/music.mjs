// node video/launch-film/music.mjs  ->  out/score.wav
// Original 20 s score at 120 BPM plus UI sound effects for film.jsx, placed on
// the same cue times as the picture (no samples, no licensing).
import path from 'node:path';
import { BEAT, CHORDS, createScore } from './synth.mjs';

const s = createScore(20.5);

// 0-2.5 hook: count-up ticks, pops on each word, sub pulse.
for (let i = 0; i < 26; i += 1) s.tick(Math.pow(i / 26, 1.7) * 1.0, 0.1);
s.sub(0, 1.4, 33, 0.4); s.kick(0);
s.pop(0.5, 520); s.kick(1.5); s.pop(1.55, 620); s.pop(2.0, 820, 0.3); s.clap(2.0);
s.pad(0, CHORDS[0].map((m) => m + 12), 2.6, 0.035);
s.whoosh(2.5);

// 2.5-14 groove (chord stabs from the Sellers reveal at 5 s).
s.groove(2.5, 5, { stabs: false, busyHats: false });
s.groove(5, 14);
[2.6, 2.75, 2.9].forEach((t, i) => s.pop(t, 600 + i * 120, 0.16));
s.click(4.5, 0.45); s.whoosh(5.0, 0.6, 0.32);
for (let i = 0; i < 6; i += 1) s.tick(5.5 + i * 0.25, 0.14);
s.pop(7.5, 700); s.pop(8.0, 880); s.pop(10.1, 700); s.pop(10.6, 880);
[10.5, 11, 11.5, 12, 12.5].forEach((t, i) => { s.click(t, 0.45); s.chime(t + 0.04, [76 + i, 83 + i], 0.08, 0.05); });
s.riser(12.6, 14.0, 0.2);
s.chime(13.25, [69, 73, 76, 81], 0.2, 0.06);
s.whoosh(14.0, 0.7, 0.34);

// 14-17 breath; 17-20 lockup hit and resolve.
s.pad(14.0, [57, 64, 69, 72], 3.2, 0.05);
s.sub(14.0, 1.5, 33, 0.3);
s.pop(14.25, 540, 0.22); s.pop(15.0, 720, 0.24);
for (let t = 15; t < 17; t += BEAT) s.hat(t, 0.05);
s.riser(16.1, 17.0, 0.16);
s.kick(17); s.sub(17, 3.2, 33, 0.5); s.whoosh(17.0, 0.6, 0.3);
s.pad(17, [57, 64, 69, 72, 76], 3.3, 0.055);
s.chime(17.35, [81, 88], 0.12, 0.12); s.pop(17.9, 900, 0.2);

s.write(path.join(import.meta.dirname, 'out', 'score.wav'), 19.4);
