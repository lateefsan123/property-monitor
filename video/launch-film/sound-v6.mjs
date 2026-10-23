// SFX for v6 film: click cues, confirmations, transition accents, logo.
// Reads timing from app-pacing-v6.mjs. Writes out/sfx-app-film-v6.wav.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CURSOR, TAPS, CLOSE, DURATION, say } from './app-pacing-v6.mjs';

const RATE = 48000;
const samples = Math.ceil(DURATION * RATE);
const buf = new Float32Array(samples);

function addAt(time, fn, length = 0.12) {
  const start = Math.floor(time * RATE);
  const count = Math.floor(length * RATE);
  for (let i = 0; i < count && start + i < samples; i++) buf[start + i] += fn(i / RATE);
}

const click = (t) => Math.exp(-t * 80) * 0.15 * (Math.random() * 2 - 1) * Math.cos(t * 4800);
const confirm = (t) => Math.exp(-t * 12) * 0.12 * (Math.sin(t * 2 * Math.PI * 880) + 0.5 * Math.sin(t * 2 * Math.PI * 1320));
const whoosh = (t) => Math.sin(Math.PI * t / 0.4) * 0.06 * (Math.random() * 2 - 1);
const logo = (t) => Math.exp(-t * 8) * 0.1 * Math.sin(t * 2 * Math.PI * 440);

for (const [time, , , action] of CURSOR) if (action === 'click') addAt(time, click, 0.08);
for (const [time] of TAPS) addAt(time, (t) => click(t) * 0.7, 0.06);
addAt(say(26.2), confirm, 0.3);  // status created
addAt(say(45.0), confirm, 0.3);  // template saved
addAt(say(68.4), whoosh, 0.4);   // desktop→mobile transition
addAt(CLOSE.logo, logo, 0.5);

function writeWav(fp, data, rate) {
  const len = data.length, b = Buffer.alloc(44 + len * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + len * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  writeFileSync(fp, b);
}

const outPath = path.join(import.meta.dirname, 'out', 'sfx-app-film-v6.wav');
writeWav(outPath, buf, RATE);
const clicks = CURSOR.filter(c => c[3] === 'click').length;
console.log(`SFX: ${outPath} (${DURATION}s, ${clicks} clicks, ${TAPS.length} taps)`);
