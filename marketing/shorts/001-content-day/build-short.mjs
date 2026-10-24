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
import { loadClips } from "../lib/clips.mjs";

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
cue.toTpl = endOf(2) + 0.45;
start[3] = cue.toTpl + 0.2;
cue.toUse = cue.toTpl + 1.25;                   // preview sheet, then "Use for"
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

// ── App proof: recorded film-mode clips (marketing/shorts/app-clips, lib/app-phone.js)
const clips = loadClips(["composer-manual", "template-appraisal", "template-use-for", "automations-status", "whatsapp-connected", "send-activity"], DIR);
const ev = (c, k) => clips[c].events[k];
const RATE = 1.25;
const lastT = c => (clips[c].frames - 1) / 30;
const stopCam = { sx: 590, sy: 1380, z: 1.14, cy: 1120 };
const app = { beats: [
  { a: cue.zoom, b: cue.toTpl, clip: "composer-manual", c0: 0, rate: 1, cam: { sx: 590, sy: 2150, z: 1.04, cy: 1150 },
    hl: [{ a: cue.zoom + 0.7, b: cue.toTpl, box: [40, 1870, 1100, 470] }] },
  { a: cue.toTpl, b: cue.toUse, clip: "template-appraisal", c0: ev("template-appraisal", "tap:preview") - 0.15, rate: RATE,
    cam: { sx: 590, sy: 1900, z: 1.04, cy: 1200 }, hl: [{ a: cue.toTpl + 0.75, b: cue.toUse, box: [44, 1410, 1092, 1084] }] },
  { a: cue.toUse, b: cue.toAuto, clip: "template-use-for", c0: ev("template-use-for", "tap:use-for") - 0.1, rate: RATE,
    cam: { sx: 590, sy: 1950, z: 1.06, cy: 1200 }, hl: [{ a: cue.toUse + (ev("template-use-for", "appraisal-on") - ev("template-use-for", "tap:use-for") + 0.1) / RATE, b: cue.toAuto, box: [30, 2160, 1120, 115] }] },
  { a: cue.toAuto, b: cue.toWa, clip: "automations-status", c0: Math.max(0, ev("automations-status", "tap:status-switch") - (cue.toggle - cue.toAuto) * RATE), rate: RATE,
    cam: { sx: 590, sy: 1300, z: 1.08, cy: 1160 }, hl: [{ a: cue.toggle - 0.2, b: cue.toWa, box: [30, 1195, 1120, 225] }] },
  { a: cue.toWa, b: cue.backAuto, clip: "whatsapp-connected", c0: ev("whatsapp-connected", "tap:whatsapp") - 0.1, rate: RATE,
    cam: { sx: 590, sy: 560, z: 1.08, cy: 1120 }, hl: [{ a: cue.toWa + 0.8, b: cue.backAuto, box: [44, 300, 1092, 256] }] },
  { a: cue.backAuto, b: cue.toPay + 0.6, clip: "automations-status", c0: lastT("automations-status"), rate: 0,
    camKeys: [[cue.backAuto, stopCam], [cue.toPay - 0.05, stopCam], [cue.toPay + 0.45, { ...stopCam, cy: 2900 }]],
    hl: [{ a: cue.stop, b: cue.toPay, box: [280, 1345, 436, 68] }] },
  { a: cue.endCard, b: END + 1, clip: "send-activity", c0: ev("send-activity", "tap:send-activity") - 0.1, rate: RATE,
    camKeys: [[cue.endCard, { sx: 590, sy: 1000, z: 0.9, cy: 1500 }], [cue.endCard + 0.7, { sx: 590, sy: 1100, z: 0.72, cy: 1420 }]],
    hl: [{ a: cue.endCard + 1.2, b: END + 1, box: [38, 875, 1104, 365] }] },
] };
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0); }
// a tap sound on every recorded tap that plays on screen
const tapTimes = [];
for (const bt of app.beats) if (bt.rate) for (const tp of clips[bt.clip].taps) {
  const ft = bt.a + (tp.t - bt.c0) / bt.rate;
  if (ft >= bt.a && ft < bt.b) tapTimes.push(r2(ft));
}

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
const timeline = { end: END, cue, captions, app, clips, tapTimes, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: l.mp3.replace(DIR, "") })) };
writeFileSync(join(DIR, "timeline.json"), JSON.stringify(timeline, null, 1));
console.log(`Timeline: ${END}s`, cue);
if (process.argv.includes("--timeline-only")) process.exit(0);

// ── 2. Audio ─────────────────────────────────────────────────────────────────
// ElevenLabs takes carry hissy breaths between phrases and harsh "s" sounds. Duck the gaps between
// words (from the word timings), de-ess, roll off the top and take out a little broadband noise.
function voiceClean(l) {
  const gaps = [];
  for (let i = 0; i < l.words.length - 1; i++) {
    // generous margins: the recogniser marks word starts after soft onsets like the "s" in "sir"
    const a = l.words[i].end + 0.08, b = l.words[i + 1].start - 0.15;
    if (b - a > 0.1) gaps.push(`between(t,${a.toFixed(3)},${b.toFixed(3)})`);
  }
  const tail = l.words[l.words.length - 1].end + 0.08;
  gaps.push(`gte(t,${tail.toFixed(3)})`);
  const duck = `volume='if(${gaps.join("+")},0.1,1)':eval=frame`;
  return `afftdn=nr=8:nf=-45,deesser=i=0.3:m=0.5:f=0.5,lowpass=f=13000,${duck}`;
}

function buildAudio() {
  mkdirSync(SFX, { recursive: true });
  const f = name => join(SFX, name);
  // Sound effects: ElevenLabs takes the user picked (../sfx-elevenlabs/chosen), trimmed of lead-in
  // silence and peak-normalised per sound so the cue volumes below stay meaningful
  const PEAK = { switch: -13, buzz: -14, tap: -18, ping: -16, pop: -17, rec: -16, chime: -19 };   // well under the voice
  for (const name of ["switch", "tap", "rec", "chime"]) {
    const src = join(DIR, "../sfx-elevenlabs/chosen", `${name}.mp3`);
    const trim = "silenceremove=start_periods=1:start_threshold=-50dB";
    const vd = execSync(`ffmpeg -hide_banner -i "${src}" -af ${trim},volumedetect -f null - 2>&1`, { encoding: "utf8" });
    const max = parseFloat(vd.match(/max_volume: (-?[\d.]+) dB/)[1]);
    run(`ffmpeg -y -v error -i "${src}" -af "${trim},volume=${(PEAK[name] - max).toFixed(1)}dB,aresample=48000" "${f(name + ".wav")}"`);
  }

  const fx = [
    ["switch.wav", cue.lightOn, 0.9],
    ...tapTimes.map(t => ["tap.wav", t, 0.9]),
    ["rec.wav", cue.toPay + 0.15, 1.0],
    ["chime.wav", cue.endCard + 0.2, 0.9],
  ];
  const inputs = [`-ss ${MUSIC_START} -t ${END + 1} -i "${MUSIC}"`];
  const filters = [];
  const voice = [];
  Object.values(L).forEach((l, i) => {
    inputs.push(`-ss ${r2(l.lead)} -i "${l.mp3}"`);
    const ms = Math.round(start[l.n] * 1000);
    filters.push(`[${i + 1}]aresample=48000,${voiceClean(l)},aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${l.gain}dB[v${i}]`);
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
