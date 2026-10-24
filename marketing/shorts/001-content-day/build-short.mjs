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
const NARR = process.env.NARR_DIR || join(DIR, "narration-v2");
const FPS = 30;
const MUSIC = join(ROOT, "video/launch-film/out/music-vastness-andrew-ev.mp3"); // Mixkit Free License, as in v5
const MUSIC_START = 18;

const sel = JSON.parse(readFileSync(process.env.SEL || join(DIR, "narration-selection-v2.json"), "utf8"));
const run = cmd => execSync(cmd, { stdio: "pipe", maxBuffer: 1 << 26 });
const r2 = v => Math.round(v * 100) / 100;

// v2 script (24 Oct 2026): plain, benefit-led, ~35 s. The v1 punchline ("This is the kitchen.")
// read as corny, so every line now says what Repeat does.
const SCRIPT = {
  1: "I'm trying to film a property tour.",
  2: "But every few minutes, I stop to type the same follow-up to another seller.",
  3: "So I set it up once, in Repeat.",
  4: "I write a template and choose which seller statuses it's for.",
  5: "Then I turn on Status follow-ups, so each seller gets their message when they're due.",
  6: "It stops as soon as a seller replies, and I answer them myself.",
  7: "Everything goes out from my own connected WhatsApp.",
  8: "Now I can finish the tour without stopping.",
  9: "Repeat AI. Set up your follow-ups once, and get back to work.",
};
const VOICE_LUFS = -19.3; // even level across lines before the master
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ── 1. Timeline from narration ───────────────────────────────────────────────
function loadLine(n) {
  const take = sel.takes[String(n)];
  const mp3 = join(NARR, `vo-001v2-${n}-take-${take}.mp3`);
  const words = JSON.parse(readFileSync(mp3.replace(/\.mp3$/, ".words.json"), "utf8"));
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: "utf8" }));
  const lead = Math.max(0, words[0].start - 0.04);
  // merge recogniser tokens ("follow" "-up") until they spell the next script word
  const script = SCRIPT[n].split(/\s+/);
  const merged = [];
  let i = 0;
  for (const sw of script) {
    if (i >= words.length) throw new Error(`line ${n} take ${take}: ran out of heard words at "${sw}"`);
    const m = { ...words[i++] };
    let heard = m.word;
    while (norm(heard) !== norm(sw) && i < words.length && norm(sw).startsWith(norm(heard))) { heard += words[i].word; m.end = words[i++].end; }
    if (norm(heard) !== norm(sw)) throw new Error(`line ${n} take ${take}: heard "${heard}", script "${sw}"`);
    merged.push({ ...m, heard, word: sw });
  }
  const loud = execSync(`ffmpeg -hide_banner -i "${mp3}" -af ebur128 -f null - 2>&1`, { encoding: "utf8" });
  const lufs = parseFloat(loud.slice(loud.lastIndexOf("Integrated loudness")).match(/I:\s+(-?[\d.]+) LUFS/)[1]);
  return { n, mp3, lead, gain: r2(VOICE_LUFS - lufs), words: merged.map(w => ({ ...w, start: w.start - lead, end: w.end - lead })), dur: dur - lead };
}
const L = {};
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) L[n] = loadLine(n);
function word(line, w, nth = 1) {
  let k = 0;
  for (const x of line.words) if (norm(x.word) === norm(w) && ++k === nth) return x;
  throw new Error(`word "${w}" (#${nth}) not found in line ${line.n}`);
}
const lastWord = line => line.words[line.words.length - 1];

const start = {};
const cue = {};
const W = (n, w, k = 1, f = "start") => start[n] + word(L[n], w, k)[f];
const endOf = n => start[n] + lastWord(L[n]).end;

start[1] = 0.6;
cue.lightOn = 0.3;
cue.buzz = endOf(1) + 0.3;
cue.cutInt = cue.buzz + 0.12;
start[2] = cue.cutInt + 0.35;
cue.zoom = W(2, "type") - 0.5;                 // into his phone as he says "type the same follow-up"
start[3] = endOf(2) + 0.45;
cue.toTpl = start[3] - 0.15;                   // the template editor, then its preview
start[4] = endOf(3) + 0.3;
cue.toUse = W(4, "choose") - 0.15;             // "Use for": which statuses get it
start[5] = endOf(4) + 0.4;
cue.toAuto = start[5] - 0.25;
cue.toggle = W(5, "Status") + 0.1;             // the real tap on Status follow-ups
start[6] = endOf(5) + 0.4;
cue.backAuto = start[6] - 0.2;                 // hold on "Stops when they reply."
cue.stop = W(6, "stops");
start[7] = endOf(6) + 0.4;
cue.toWa = start[7] - 0.2;                     // WhatsApp: Connected
start[8] = endOf(7) + 0.9;
cue.toPay = start[8] - 0.55;                   // ring-light iris back to filming
cue.endCard = endOf(8) + 0.55;
start[9] = cue.endCard + 0.35;
const END = r2(endOf(9) + 1.5);

// ── App proof: one feature at a time, as big live crops of the light-theme app beside him
// (marketing/shorts/app-clips/*-light, lib/crop-cards.js), plus the seller's side.
cue.cardsIn = r2(W(2, "type") - 0.5);
cue.zoom = 999;                                 // no full-screen phone in this cut
const clips = loadClips(["template-appraisal-light", "template-use-for-light", "automations-status-light", "whatsapp-connected-light", "send-activity-light"], DIR);
const ev = (c, k) => clips[c].events[k];
// Light-theme phone, big, with the camera on one feature at a time. What isn't Repeat (plain
// WhatsApp, Elena's own phone) is drawn as a phone screen (lib/drawn-screens.js).
const FULL = { sx: 590, sy: 1278, z: 0.8, cx: 640, cy: 1360 };
const useTap = W(4, "statuses");
const waCam = { sx: 590, sy: 380, z: 0.9, cx: 630, cy: 900 };
cue.noteIn = W(5, "so");
const app = { beats: [
  { a: cue.cardsIn, b: cue.toTpl, chip: "The old way: WhatsApp, by hand", cam: FULL,
    screen: { kind: "wa", id: "oliver", name: "Oliver Grant", sub: "last seen today at 11:40", keyboard: true,
      typing: { text: "Hi Oliver, hope you're well. Just wanted to keep you updated on the latest activity in Burj Khalifa…", ta: cue.cardsIn + 0.5, tb: cue.toTpl - 0.4 } } },
  { a: cue.toTpl, b: cue.toUse, chip: "Repeat · Templates", clip: "template-appraisal-light", c0: 2.0, rate: 0,
    camKeys: [[cue.toTpl, { sx: 590, sy: 700, z: 0.86, cx: 630, cy: 1150 }], [cue.toUse, { sx: 590, sy: 760, z: 0.9, cx: 630, cy: 1150 }]] },
  { a: cue.toUse, b: cue.toAuto, chip: "Template · Use for", clip: "template-use-for-light",
    c0: Math.max(1.5, ev("template-use-for-light", "tap:appraisal-on") - (useTap - cue.toUse)), rate: 1,
    cam: { sx: 590, sy: 1840, z: 0.9, cx: 630, cy: 1150 } },
  { a: cue.toAuto, b: cue.noteIn, chip: "Repeat · Automations", clip: "automations-status-light",
    c0: Math.max(0, ev("automations-status-light", "tap:status-switch") - (cue.toggle - cue.toAuto)), rate: 1,
    cam: { sx: 590, sy: 1310, z: 0.9, cx: 630, cy: 1100 } },
  { a: cue.noteIn, b: start[6] - 0.1, chip: "Elena's phone", cam: { ...FULL, sy: 1150, cy: 1260 },
    screen: { kind: "lock", id: "elena", time: "12:00", date: "Friday 23 October",
      note: { at: cue.noteIn + 0.35, app: "WhatsApp", title: "+971 50 555 0100",
        body: "Hi Elena Petrova, hope you're well. Just wanted to keep you updated on the latest activity in Claren Tower 2." } } },
  { a: start[6] - 0.1, b: cue.toWa, chip: "Your WhatsApp", cam: { ...FULL, sy: 1150, cy: 1260 },
    screen: { kind: "wa", id: "elena-chat", name: "Elena Petrova", sub: "online", items: [
      { at: start[6] - 0.1, side: "out", text: "Hi Elena Petrova, hope you're well. Just wanted to keep you updated on the latest activity in Claren Tower 2." },
      { at: W(6, "seller") - 0.1, side: "in", text: "Thanks! Could you call me on Thursday?" },
      { at: W(6, "answer") + 0.2, side: "out", text: "Of course. I'll call you Thursday at 11." }],
      typing: { text: "Of course. I'll call you Thursday at 11.", ta: W(6, "answer") - 0.9, tb: W(6, "answer") - 0.05 } } },
  { a: cue.toWa, b: cue.toPay + 0.6, chip: "Repeat · WhatsApp", clip: "whatsapp-connected-light", c0: ev("whatsapp-connected-light", "connected") + 0.1, rate: 0,
    camKeys: [[cue.toWa, waCam], [cue.toPay - 0.05, waCam], [cue.toPay + 0.45, { ...waCam, cy: 2900 }]] },
  { a: cue.endCard, b: END + 1, clip: "send-activity-light", c0: ev("send-activity-light", "tap:send-activity") - 0.1, rate: 1.25,
    camKeys: [[cue.endCard, { sx: 590, sy: 1000, z: 0.9, cy: 1500 }], [cue.endCard + 0.7, { sx: 590, sy: 1100, z: 0.72, cy: 1420 }]] },
] };
for (const bt of app.beats) for (const o of [bt.screen?.typing, bt.screen?.note, ...(bt.screen?.items || [])]) if (o) for (const k of ["at", "ta", "tb"]) if (o[k] !== undefined) o[k] = r2(o[k]);
const cards = [];
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0 || 0); bt.rate = r2(bt.rate ?? 0); }
for (const k in cue) cue[k] = r2(cue[k]);
// a tap sound on every recorded tap that plays on screen
const tapTimes = [];
for (const bt of app.beats) if (bt.rate) for (const tp of clips[bt.clip].taps) {
  const ft = bt.a + (tp.t - bt.c0) / bt.rate;
  if (ft >= bt.a && ft < bt.b) tapTimes.push(r2(ft));
}
for (const c of cards) if (c.kind === "clip" && c.rate) for (const tp of clips[c.clip].taps) {
  const ft = c.a + (tp.t - c.c0) / c.rate;
  if (ft >= c.a && ft < c.b) tapTimes.push(r2(ft));
}

// Captions: chunks of spoken words, with a few emphasised words in teal
const EM = new Set(["same", "followup", "once", "template", "statuses", "status", "followups", "due", "replies", "myself", "whatsapp", "finish"]);
function chunk(n, from, to) {
  const ws = L[n].words.slice(from, to === undefined ? undefined : to);
  const html = ws.map(w => EM.has(norm(w.word)) ? `<em>${w.word}</em>` : w.word).join(" ");
  return { a: r2(start[n] + ws[0].start - 0.12), b: r2(start[n] + ws[ws.length - 1].end + 0.35), html };
}
const idx = (n, w, k = 1) => L[n].words.indexOf(word(L[n], w, k));
const captions = [
  chunk(1, 0),
  chunk(2, 0, idx(2, "I")), chunk(2, idx(2, "I")),
  chunk(3, 0),
  chunk(4, 0, idx(4, "and")), chunk(4, idx(4, "and")),
  chunk(5, 0, idx(5, "so")), chunk(5, idx(5, "so")),
  chunk(6, 0, idx(6, "and")), chunk(6, idx(6, "and")),
  chunk(7, 0), chunk(8, 0),
];
// Each caption holds until the next one starts (no flashing gaps inside a line)
for (let i = 0; i < captions.length - 1; i++) {
  const gap = captions[i + 1].a - captions[i].b;
  if (gap < 0.5) captions[i].b = captions[i + 1].a;
}

const timeline = { end: END, cue, captions, app, cards, clips, tapTimes, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: l.mp3.replace(DIR, "") })) };
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
    const k = 1 + Object.keys(L).length + j, ms = Math.round(t * 1000);
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
