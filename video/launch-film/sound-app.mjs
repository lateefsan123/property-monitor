// Original short UI accents synchronized with picture. No external sound samples.
// Every cue comes from the shared timeline in app-pacing.mjs, so picture and
// effects move together.
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { createScore } from './synth.mjs';
import { CHAT, CLOSE, CUT, DURATION, PHONE_IN, PHONE_OUT, SCREENS, TAPS, screenAt } from './app-pacing.mjs';
const s = createScore(DURATION);
const events = [];
function cue(type, at, fn) {
  events.push({ type, at: +at.toFixed(3) });
  fn(at);
}
function tap(t, gain = 0.14) {
  s.add(t, 0.07, x => (Math.sin(2 * Math.PI * 640 * x) + 0.22 * Math.sin(2 * Math.PI * 1750 * x))
    * Math.min(1, x / 0.002) * Math.exp(-x * 85), gain);
}
for (const [t] of TAPS) cue('tap', t, at => tap(at));
const pushes = SCREENS.filter(([, , transition]) => transition === 'push').map(([time]) => time);
for (const t of [PHONE_IN, ...pushes, PHONE_OUT]) cue('transition', t, at => s.whoosh(at, 0.34, 0.10));
cue('import complete', screenAt('import-done'), at => s.chime(at, [72, 79], 0.075, 0.09));
cue('message sent', CHAT.sent, at => s.pop(at, 540, 0.17));
cue('read receipt', CHAT.read, at => tap(at, 0.075));
cue('reply received', CHAT.reply, at => s.chime(at, [76, 79], 0.095, 0.11));
cue('schedule saved', screenAt('schedule-updated'), at => s.chime(at, [72, 76], 0.07, 0.09));
cue('assistant reply', screenAt('ask-reply'), at => s.pop(at, 620, 0.10));
cue('logo settle', CLOSE.logo, at => {
  s.chime(at, [60, 67, 72], 0.065, 0.12);
  s.sub(at, 0.8, 36, 0.085);
});
events.sort((a, b) => a.at - b.at);
const out = path.join(import.meta.dirname, 'out');
s.write(path.join(out, `sfx-${CUT}.wav`), DURATION - 1.1);
writeFileSync(path.join(out, `sfx-${CUT}-cues.json`), JSON.stringify(events, null, 2));
console.log(`${events.length} cues`);
