/**
 * Short 001 — Content Day (RA-101)
 *
 * 1. Lays out the timeline from the chosen Brady narration takes (word timings).
 * 2. Renders short.html frame by frame (Playwright) at 1080×1920, 30 fps.
 * 3. Synthesises the sound effects, ducks the licensed music under the voice, masters to -14 LUFS.
 * 4. Encodes out/repeat-ai-short-001-content-day.mp4.
 *
 * Usage: node build-short.mjs [--timeline-only] [--audio-only]
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("D:/Users/Lateef/Documents/property/video/node_modules/playwright-core");
const BROWSER = "C:/Users/lateef/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(DIR, "../../../");
const FRAMES = join(DIR, "frames");
const SFX = join(DIR, "sfx");
const OUT = process.env.OUT_DIR || join(DIR, "out");
const NARR = process.env.NARR_DIR || join(DIR, "narration");
const FPS = 30;
const MUSIC = join(ROOT, "video/launch-film/out/music-vastness-andrew-ev.mp3"); // Mixkit Free License, as in v5
const MUSIC_START = 18;

const sel = JSON.parse(readFileSync(process.env.SEL || join(DIR, "narration-selection.json"), "utf8"));
const run = cmd => execSync(cmd, { stdio: "pipe", maxBuffer: 1 << 26 });
const r2 = v => Math.round(v * 100) / 100;

const SCRIPT = {
  1: "Ring light's finally on.",
  2: "And I've stopped mid-take again, to send the same seller update.",
  3: "So I set the routine follow-ups up in Repeat.",
  4: "When a seller's due, their update goes out on WhatsApp. If they reply, it stops, and I answer them myself.",
  5: "Right. This is the kitchen.",
  6: "Repeat AI. Build your brand, and keep your follow-ups organised.",
};
const VOICE_LUFS = -19.3; // even level across lines before the master

// ── 1. Timeline from narration ───────────────────────────────────────────────
function loadLine(n) {
  const take = sel.takes[String(n)];
  const mp3 = join(NARR, `vo-ra101-${n}-take-${take}.mp3`);
  const words = JSON.parse(readFileSync(mp3.replace(/\.mp3$/, ".words.json"), "utf8"));
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: "utf8" }));
  // Trim lead-in silence so a line starts on its first word
  const lead = Math.max(0, words[0].start - 0.04);
  // Recogniser splits hyphenated words ("mid", "-take"); join them, then show the script's spelling
  const merged = [];
  for (const w of words) {
    if (w.word.startsWith("-") && merged.length) { const m = merged[merged.length - 1]; m.word += w.word; m.end = w.end; }
    else merged.push({ ...w });
  }
  const script = SCRIPT[n].split(/\s+/);
  if (script.length !== merged.length) throw new Error(`line ${n} take ${take}: ${merged.length} words heard, ${script.length} in script`);
  merged.forEach((w, i) => { w.heard = w.word; w.word = script[i]; });
  const loud = execSync(`ffmpeg -hide_banner -i "${mp3}" -af ebur128 -f null - 2>&1`, { encoding: "utf8" });
  const lufs = parseFloat(loud.slice(loud.lastIndexOf("Integrated loudness")).match(/I:\s+(-?[\d.]+) LUFS/)[1]);
  return { n, mp3, lead, gain: r2(VOICE_LUFS - lufs), words: merged.map(w => ({ ...w, start: w.start - lead, end: w.end - lead })), dur: dur - lead };
}
const L = {};
for (const n of [1, 2, 3, 4, 5, 6]) L[n] = loadLine(n);
const norm = s => s.toLowerCase().replace(/[^a-z']/g, "");
function word(line, w, nth = 1) {
  let k = 0;
  for (const x of line.words) if (norm(x.word) === norm(w) && ++k === nth) return x;
  throw new Error(`word "${w}" (#${nth}) not found in line ${line.n}`);
}
const lastWord = line => line.words[line.words.length - 1];

const start = {};
const cue = {};
const W = (n, w, k, f = "start") => start[n] + word(L[n], w, k)[f];
const endOf = n => start[n] + lastWord(L[n]).end;

start[1] = 0.6;
cue.lightOn = 0.3;
cue.buzz = endOf(1) + 0.3;
cue.cutInt = cue.buzz + 0.12;
start[2] = cue.cutInt + 0.35;
cue.zoom = W(2, "send", 1) - 0.75;             // land on the composer as he says "send the same seller update"
cue.tap = endOf(2) + 0.2;
cue.toTpl = cue.tap + 0.45;
start[3] = cue.toTpl + 0.2;
cue.toUse = W(3, "follow-ups", 1) - 0.05;
start[4] = endOf(3) + 0.4;
cue.toAuto = start[4] - 0.35;
cue.toggle = W(4, "due", 1, "end") - 0.05;
cue.toWa = W(4, "goes", 1) - 0.2;
cue.backAuto = W(4, "if", 1) - 0.3;
cue.stop = W(4, "stops", 1) - 0.05;
cue.toPay = endOf(4) + 0.35;
start[5] = cue.toPay + 0.65;
cue.endCard = endOf(5) + 0.55;
start[6] = cue.endCard + 0.35;
const END = r2(endOf(6) + 1.5);

// Captions: chunks of spoken words, with a few emphasised words in teal
const EM = new Set(["same", "seller", "update", "routine", "follow-ups", "whatsapp", "stops", "myself", "kitchen"]);
function chunk(n, from, to) {
  const ws = L[n].words.slice(from, to === undefined ? undefined : to);
  const html = ws.map(w => EM.has(norm(w.word).replace(/'/g, "")) || EM.has(w.word.toLowerCase().replace(/[.,]/g, "")) ? `<em>${w.word}</em>` : w.word).join(" ");
  return { a: r2(start[n] + ws[0].start - 0.12), b: r2(start[n] + ws[ws.length - 1].end + 0.35), html };
}
const idx = (n, w, k = 1) => L[n].words.indexOf(word(L[n], w, k));
const captions = [
  chunk(1, 0),
  chunk(2, 0, idx(2, "to")), chunk(2, idx(2, "to")),
  chunk(3, 0),
  chunk(4, 0, idx(4, "their")), chunk(4, idx(4, "their"), idx(4, "if")), chunk(4, idx(4, "if"), idx(4, "and", 1)), chunk(4, idx(4, "and", 1)),
  chunk(5, 0, 1), chunk(5, 1),
];
// Each caption holds until the next one starts (no flashing gaps inside a line)
for (let i = 0; i < captions.length - 1; i++) {
  const gap = captions[i + 1].a - captions[i].b;
  if (gap < 0.5) captions[i].b = captions[i + 1].a;
}
const [cRight, cKitchen] = captions.slice(-2);
cRight.b = cKitchen.b; // keep "Right." up with "This is the kitchen."
cRight.html = "Right.";
cKitchen.html = "Right. This is the <em>kitchen.</em>";

for (const k in cue) cue[k] = r2(cue[k]);
const timeline = { end: END, cue, captions, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: l.mp3.replace(DIR, "") })) };
writeFileSync(join(DIR, "timeline.json"), JSON.stringify(timeline, null, 1));
console.log(`Timeline: ${END}s`, cue);
if (process.argv.includes("--timeline-only")) process.exit(0);

// ── 2. Audio ─────────────────────────────────────────────────────────────────
function buildAudio() {
  mkdirSync(SFX, { recursive: true });
  const f = name => join(SFX, name);
  // Ring-light switch: a short click with a low thump
  run(`ffmpeg -y -v error -f lavfi -i "anoisesrc=d=0.05:c=white:a=0.6" -f lavfi -i "sine=f=95:d=0.12" -filter_complex "[0]highpass=f=1800,afade=t=out:d=0.05[c];[1]afade=t=out:d=0.12,volume=0.7[t];[c][t]amix=inputs=2:normalize=0" "${f("switch.wav")}"`);
  // Phone vibration: two short buzzes
  run(`ffmpeg -y -v error -f lavfi -i "sine=f=165:d=0.62" -af "volume='if(lt(mod(t,0.31),0.19),1,0)':eval=frame,tremolo=f=28:d=0.5,lowpass=f=900,volume=0.9,afade=t=out:st=0.5:d=0.12" "${f("buzz.wav")}"`);
  // Soft air move for the zoom into the phone
  run(`ffmpeg -y -v error -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.5" -af "bandpass=f=900:w=600,afade=t=in:d=0.35,afade=t=out:st=0.35:d=0.25,volume=0.35" "${f("air.wav")}"`);
  // UI tap
  run(`ffmpeg -y -v error -f lavfi -i "sine=f=2400:d=0.03" -f lavfi -i "anoisesrc=d=0.02:c=white:a=0.3" -filter_complex "[0]afade=t=out:d=0.03,volume=0.35[a];[1]highpass=f=3000,volume=0.5[b];[a][b]amix=inputs=2:normalize=0" "${f("tap.wav")}"`);
  // Record start: two-tone beep
  run(`ffmpeg -y -v error -f lavfi -i "sine=f=1046:d=0.09" -f lavfi -i "sine=f=1568:d=0.14" -filter_complex "[0]afade=t=out:st=0.06:d=0.03,volume=0.22[a];[1]adelay=110|110,afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.05,volume=0.22[b];[a][b]amix=inputs=2:normalize=0" "${f("rec.wav")}"`);
  // End card: soft chime
  run(`ffmpeg -y -v error -f lavfi -i "sine=f=880:d=1.6" -f lavfi -i "sine=f=1318.5:d=1.6" -filter_complex "[0]volume=0.16[a];[1]volume=0.09[b];[a][b]amix=inputs=2:normalize=0,afade=t=in:d=0.01,afade=t=out:st=0.05:d=1.55" "${f("chime.wav")}"`);

  const fx = [
    ["switch.wav", cue.lightOn, 0.9],
    ["buzz.wav", cue.buzz, 1.0],
    ["air.wav", cue.zoom, 0.8],
    ["tap.wav", cue.tap, 1.0],
    ["tap.wav", cue.toggle, 1.0],
    ["rec.wav", cue.toPay + 0.15, 1.0],
    ["chime.wav", cue.endCard + 0.2, 0.9],
  ];
  const inputs = [`-ss ${MUSIC_START} -t ${END + 1} -i "${MUSIC}"`];
  const filters = [];
  const voice = [];
  Object.values(L).forEach((l, i) => {
    inputs.push(`-ss ${r2(l.lead)} -i "${l.mp3}"`);
    const ms = Math.round(start[l.n] * 1000);
    filters.push(`[${i + 1}]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${l.gain}dB[v${i}]`);
    voice.push(`[v${i}]`);
  });
  fx.forEach(([file, t, vol], j) => {
    const k = 7 + j, ms = Math.round(t * 1000);
    inputs.push(`-i "${f(file)}"`);
    filters.push(`[${k}]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${vol}[s${j}]`);
  });
  filters.push(`${voice.join("")}amix=inputs=${voice.length}:normalize=0,apad=whole_dur=${END}[vo]`);
  filters.push(`[vo]asplit=2[vo1][vokey]`);
  // music: quiet bed, ducked further while he talks, swells a little on the end card
  filters.push(`[0]aresample=48000,aformat=channel_layouts=stereo,volume=0.22,afade=t=in:d=0.8,afade=t=out:st=${r2(END - 1.6)}:d=1.6,volume='if(gte(t,${cue.endCard}),1.35,1)':eval=frame[mu]`);
  filters.push(`[mu][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[muduck]`);
  filters.push(`[vo1][muduck]${fx.map((_, j) => `[s${j}]`).join("")}amix=inputs=${2 + fx.length}:normalize=0,atrim=0:${END}[mix]`);
  const pre = join(SFX, "mix-pre.wav");
  run(`ffmpeg -y -v error ${inputs.join(" ")} -filter_complex "${filters.join(";")}" -map "[mix]" -ar 48000 "${pre}"`);

  // Two-pass loudness to -14 LUFS, -1.5 dBTP
  const meas = execSync(`ffmpeg -hide_banner -i "${pre}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`, { encoding: "utf8" });
  const m = JSON.parse(meas.slice(meas.lastIndexOf("{"), meas.lastIndexOf("}") + 1));
  const mixed = join(SFX, "mix.wav");
  run(`ffmpeg -y -v error -i "${pre}" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000" "${mixed}"`);
  return mixed;
}
const audio = buildAudio();
console.log("Audio:", audio);
if (process.argv.includes("--audio-only")) process.exit(0);

// ── 3. Frames ────────────────────────────────────────────────────────────────
mkdirSync(FRAMES, { recursive: true });
mkdirSync(OUT, { recursive: true });
for (const x of readdirSync(FRAMES)) if (x.startsWith("frame-")) unlinkSync(join(FRAMES, x));
const total = Math.round(END * FPS);
const browser = await chromium.launch({ executablePath: BROWSER, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript(t => { window.TL = t; }, timeline);
await page.goto("file:///" + join(DIR, "short.html").replace(/\\/g, "/"));
await page.evaluate(() => window.ready);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.setTime(t), i / FPS);
  for (let tries = 0; ; tries++) {
    try { await page.screenshot({ path: join(FRAMES, `frame-${String(i).padStart(4, "0")}.png`), timeout: 60000 }); break; }
    catch (e) { if (tries >= 2) throw e; }
  }
  if (i % 150 === 0) console.log(`  frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

// ── 4. Encode ────────────────────────────────────────────────────────────────
const outFile = join(OUT, "repeat-ai-short-001-content-day.mp4");
run(`ffmpeg -y -v error -framerate ${FPS} -i "${join(FRAMES, "frame-%04d.png")}" -i "${audio}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -ar 48000 -t ${END} -movflags +faststart "${outFile}"`);
console.log("Wrote", outFile);
