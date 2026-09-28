// Original short UI accents synchronized with picture. No external sound samples.
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { createScore } from './synth.mjs';
import { DURATION, filmTime } from './app-pacing.mjs';
const s = createScore(DURATION);
const events = [];
function cue(type, source, fn) {
  const at = filmTime(source);
  events.push({ type, pictureTime: source, at: +at.toFixed(3) });
  fn(at);
}
function tap(t, gain = 0.14) {
  s.add(t, 0.07, x => (Math.sin(2 * Math.PI * 640 * x) + 0.22 * Math.sin(2 * Math.PI * 1750 * x))
    * Math.min(1, x / 0.002) * Math.exp(-x * 85), gain);
}
for (const t of [9, 10.2, 11.6, 30.2, 45.6, 47, 51.9, 53.9, 54.6, 55.8, 57.8, 59.3])
  cue('tap', t, at => tap(at));
for (const t of [3.3, 8, 15, 19.2, 27.4, 32.4, 38.6, 44.4, 50.8, 57, 61.2, 65.6])
  cue('transition', t, at => s.whoosh(at, 0.34, 0.10));
cue('import complete', 11.8, at => s.chime(at, [72, 79], 0.075, 0.09));
cue('message sent', 32.9, at => s.pop(at, 540, 0.17));
cue('read receipt', 34.4, at => tap(at, 0.075));
cue('reply received', 35.6, at => s.chime(at, [76, 79], 0.095, 0.11));
cue('schedule saved', 55.95, at => s.chime(at, [72, 76], 0.07, 0.09));
cue('assistant reply', 59.45, at => s.pop(at, 620, 0.10));
cue('logo settle', 69.4, at => {
  s.chime(at, [60, 67, 72], 0.065, 0.12);
  s.sub(at, 0.8, 36, 0.085);
});
const out = path.join(import.meta.dirname, 'out');
s.write(path.join(out, 'sfx-app-film.wav'), DURATION - 1.1);
writeFileSync(path.join(out, 'sfx-app-cues.json'), JSON.stringify(events, null, 2));
