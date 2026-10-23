// SFX for v7 film: subtle click cues, taps, confirmation, transition, logo.
// No whoosh spam. Tasteful and minimal.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CLICKS, TAPS, CLOSE, DURATION, say } from './app-pacing-v7.mjs';

const RATE = 48000;
const samples = Math.ceil(DURATION * RATE);
const buf = new Float32Array(samples);

function addAt(time, fn, length) {
  const start = Math.floor(time * RATE);
  const count = Math.floor(length * RATE);
  for (let i = 0; i < count && start + i < samples; i++) buf[start + i] += fn(i / RATE);
}

// Soft click — brief, organic
const click = (t) => Math.exp(-t * 90) * 0.12 * (Math.random() * 2 - 1) * Math.cos(t * 5200);
// Gentle confirmation
const confirm = (t) => Math.exp(-t * 14) * 0.1 * (Math.sin(t * 2 * Math.PI * 880) + 0.4 * Math.sin(t * 2 * Math.PI * 1320));
// Subtle push transition — one per section change, very quiet
const push = (t) => Math.sin(Math.PI * t / 0.3) * 0.03 * (Math.random() * 2 - 1);
// Logo
const logo = (t) => Math.exp(-t * 8) * 0.09 * Math.sin(t * 2 * Math.PI * 440);

// Desktop clicks
for (const [time] of CLICKS) addAt(time, click, 0.06);
// Mobile taps
for (const [time] of TAPS) addAt(time, (t) => click(t) * 0.6, 0.05);
// Confirmations
addAt(say(26.2), confirm, 0.25);  // status created
addAt(say(45.0), confirm, 0.25);  // template context
// Section push transitions (only 3, not every screen change)
addAt(say(18.02), push, 0.3);    // → statuses
addAt(say(28.56), push, 0.3);    // → templates
addAt(say(45.88), push, 0.3);    // → automations
// Logo
addAt(CLOSE.logo, logo, 0.4);

function writeWav(fp, data, rate) {
  const len = data.length, b = Buffer.alloc(44 + len * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + len * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  writeFileSync(fp, b);
}

const outPath = path.join(import.meta.dirname, 'out', 'sfx-app-film-v7.wav');
writeWav(outPath, buf, RATE);
console.log(`SFX: ${outPath} (${DURATION}s, ${CLICKS.length} clicks, ${TAPS.length} taps, 2 confirms, 3 pushes, 1 logo)`);
