/**
 * Short 002 — "It's Tuesday" (RA-001), seller POV.
 *
 * Same pipeline as Short 001: narration word timings → timeline.json → Playwright frames →
 * synthesised SFX + ducked music → -14 LUFS → H.264.
 *
 * Usage: node build-short.mjs [--timeline-only] [--audio-only]
 * Env (dry runs): NARR_DIR, SEL, OUT_DIR
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadClips } from "../lib/clips.mjs";
import { capSplash } from "../lib/splash.mjs";

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
const MUSIC_START = 60;
const TAKES = join(ROOT, "video/launch-film/out/app/takes-v5s");

const sel = JSON.parse(readFileSync(process.env.SEL || join(DIR, "narration-selection.json"), "utf8"));
const run = cmd => execSync(cmd, { stdio: "pipe", maxBuffer: 1 << 26 });
const r2 = v => Math.round(v * 100) / 100;
const rel = p => p.replace(DIR, "").replace(/\\/g, "/");
const relRoot = p => "../../../" + p.replace(ROOT, "").replace(/^[\\/]/, "").replace(/\\/g, "/");

const SCRIPT = {
  1: "I own a two-bed in Burj Khalifa. It's Tuesday.",
  2: "So, naturally.",
  3: "\"Any property available, sir?\" Every week.",
  4: "Then one actually tells me something. A two-bed in my building just sold. 4.67 million.",
  5: "Which floor?",
  6: "That's what Repeat does. It puts the latest sales from each seller's own building into your updates.",
  7: "Repeat AI. Have a reason to follow up.",
};
const VOICE_LUFS = -19.3;
// the recogniser writes small numbers as digits ("9", "15", "30"); compare them as words
const NUMS = { 6: "six", 40: "forty", 9: "nine", 11: "eleven", 12: "twelve", 14: "fourteen", 15: "fifteen", 20: "twenty", 30: "thirty" };
const norm = s => { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ""); return NUMS[t] || t; };

// ── 1. Narration ─────────────────────────────────────────────────────────────
function loadLine(n) {
  const take = sel.takes[String(n)];
  // a take is a number, or "<voice>-<n>" for a recast (e.g. "rupert-2")
  const m = String(take).match(/^([a-z]+)-(\d+)$/);
  const mp3 = join(NARR, m ? `vo-002-${n}-${m[1]}-take-${m[2]}.mp3` : `vo-002-${n}-take-${take}.mp3`);
  const words = JSON.parse(readFileSync(mp3.replace(/\.mp3$/, ".words.json"), "utf8"));
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: "utf8" }));
  const lead = Math.max(0, words[0].start - 0.04);
  // Align heard words to the script: merge recogniser tokens ("two" "bed", "4" ".67") until they
  // spell the next script word, then show the script's spelling
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
for (const n of [1, 2, 3, 4, 5, 6, 7]) L[n] = loadLine(n);
function word(line, w, nth = 1) {
  let k = 0;
  for (const x of line.words) if (norm(x.word) === norm(w) && ++k === nth) return x;
  throw new Error(`word "${w}" (#${nth}) not in line ${line.n}`);
}
const start = {}, cue = {};
const W = (n, w, k = 1, f = "start") => start[n] + word(L[n], w, k)[f];
const endOf = n => start[n] + L[n].words[L[n].words.length - 1].end;

// ── 2. Timeline ──────────────────────────────────────────────────────────────
start[1] = 0.5;
cue.punch = W(1, "it's") - 0.08;            // punch in on "It's Tuesday."
cue.buzz0 = endOf(1) + 0.15;
cue.toChat = cue.buzz0 + 0.3;
start[2] = cue.toChat + 0.25;
start[3] = endOf(2) + 0.25;
{ // six spam messages land through lines 2–3
  const a = cue.toChat + 0.35, b = endOf(3) - 0.2;
  cue.spam = Array.from({ length: 6 }, (_, i) => r2(a + (b - a) * (i / 5) ** 0.85));
}
cue.toSit = endOf(3) + 0.35;                       // Sara's message pings; he sits up
start[4] = cue.toSit + 0.35;
cue.toThread = W(4, "A") - 0.3;
cue.markTx = W(4, "sold");
cue.toClose = endOf(4) + 0.3;
start[5] = cue.toClose + 0.4;
cue.sayPop = start[5] - 0.05;
cue.toReplyChat = endOf(5) + 0.4;
cue.sendReply = cue.toReplyChat + 0.25;
cue.toApp = cue.sendReply + 0.6;
start[6] = cue.toApp + 0.35;
cue.toSales = W(6, "sales") - 0.25;
cue.toMsg = W(6, "into") - 0.2;
cue.splash = W(6, "Repeat");
cue.appIn = W(6, "It") - 0.15;
cue.endCard = endOf(6) + 0.55;
start[7] = cue.endCard + 0.3;
cue.endLine = W(7, "have") - 0.05;
let END = r2(endOf(7) + 1.3);
for (const k in cue) if (!Array.isArray(cue[k])) cue[k] = r2(cue[k]);

const EM = new Set(["repeat", "tuesday", "every", "week", "something", "just", "sold", "latest", "sales", "building"]);
const SHOW = [["4.67 million.", "AED 4.67 million."]];
const idx = (n, w, k = 1) => L[n].words.indexOf(word(L[n], w, k));
function chunk(n, from, to) {
  const ws = L[n].words.slice(from, to);
  let html = ws.map(w => EM.has(norm(w.word)) ? `<em>${w.word}</em>` : w.word).join(" ");
  for (const [a, b] of SHOW) html = html.replace(a, b);
  return { a: r2(start[n] + ws[0].start - 0.12), b: r2(start[n] + ws[ws.length - 1].end + 0.35), html };
}
const captions = [
  chunk(1, 0, idx(1, "It's")), chunk(1, idx(1, "It's")), chunk(2, 0), chunk(3, 0),
  chunk(4, 0, idx(4, "A")), chunk(4, idx(4, "A"), idx(4, "4.67")), chunk(4, idx(4, "4.67")),
  chunk(6, 0, idx(6, "It")), chunk(6, idx(6, "It"), idx(6, "from")), chunk(6, idx(6, "from")),
];
for (let i = 0; i < captions.length - 1; i++) if (captions[i + 1].a - captions[i].b < 0.5) captions[i].b = captions[i + 1].a;

// Poses: Codex's art when it lands, Short 001 poses as stand-ins until then
const POSES = {
  scroll: ["pose-oliver-scroll.png", "../001-content-day/pose-hook.png"],
  sitUp: ["pose-oliver-sit-up.png", "../001-content-day/pose-payoff.png"],
  reply: ["pose-oliver-reply.png", "../001-content-day/pose-interrupted.png"],
};
const poses = {};
for (const [k, files] of Object.entries(POSES)) {
  const f = files.find(x => existsSync(join(DIR, x)));
  const b = JSON.parse(execSync(`python -c "from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert('RGBA'); print(json.dumps(list(im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox())))" "${join(DIR, f)}"`, { encoding: "utf8" }));
  poses[k] = { src: f, standIn: f.startsWith(".."), x0: b[0], y0: b[1], x1: b[2], y1: b[3] };
}

// App proof: recorded film-mode clips (marketing/shorts/app-clips, lib/app-phone.js)
const clips = loadClips(["oliver-sheet-sales", "oliver-message-tab"], DIR, { theme: "light" });
const ev = (c, k) => clips[c].events[k];
const FULL = { sx: 590, sy: 1278, z: 0.78, cy: 1225 };          // whole screen under the caption
const RATE = 1.25;                                               // a brisk but natural pace
const app = { beats: [] };
{
  // 1. Sellers → tap Oliver (on "Repeat puts…") → his sheet → scroll to "Sales in Burj Khalifa"
  const a = cue.appIn, b = cue.toMsg;
  const c0 = Math.max(0, ev("oliver-sheet-sales", "tap:oliver") - (W(6, "It") + 0.15 - a) * RATE);
  const salesAt = a + (ev("oliver-sheet-sales", "sales-visible") - c0) / RATE;
  app.beats.push({ a, b, clip: "oliver-sheet-sales", c0, rate: RATE,
    camKeys: [[a, FULL], [salesAt - 0.5, FULL], [salesAt + 0.3, { sx: 590, sy: 1960, z: 1.12, cy: 1250 }]],
    hl: [{ a: salesAt + 0.2, b, box: [22, 2008, 1136, 90] }] });
}
{
  // 2. Message tab → the same sale in his update; stays under the end card
  const a = cue.toMsg;
  const c0 = Math.max(0, ev("oliver-message-tab", "tap:message-tab") - 0.35 * RATE);
  const msgAt = a + (ev("oliver-message-tab", "message-visible") - c0) / RATE;
  // hold the end card until the message has been on screen long enough to read
  const shift = Math.max(0, r2(msgAt + 1.4 - cue.endCard));
  if (shift) { cue.endCard = r2(cue.endCard + shift); cue.endLine = r2(cue.endLine + shift); start[7] += shift; END = r2(END + shift); }
  const close = { sx: 590, sy: 1660, z: 1.12, cy: 1180 };
  app.beats.push({ a, b: END + 1, clip: "oliver-message-tab", c0, rate: RATE,
    camKeys: [[a, { sx: 590, sy: 1300, z: 0.9, cy: 1150 }], [msgAt - 0.3, { sx: 590, sy: 1300, z: 0.9, cy: 1150 }], [msgAt + 0.4, close],
              [cue.endCard, close], [cue.endCard + 0.7, { sx: 590, sy: 1500, z: 0.66, cy: 1430 }]],
    hl: [{ a: msgAt + 0.2, b: END + 1, box: [22, 1606, 1136, 124] }] });
}

// "Repeat" lands as the answer: the phone opens on the Repeat launch screen as the word is said
app.beats.push({ a: cue.toApp, b: cue.appIn, cam: FULL, screen: { kind: "splash", id: "splash", at: cue.splash } });
app.beats.sort((x, y) => x.a - y.a);
capSplash(app.beats);
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0); }
const timeline = { end: END, cue, captions, poses, app, clips, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: rel(l.mp3) })) };
writeFileSync(join(DIR, "timeline.json"), JSON.stringify(timeline, null, 1));
console.log(`Timeline: ${END}s`, cue, Object.entries(poses).map(([k, p]) => `${k}:${p.src}`).join(" "));
if (process.argv.includes("--timeline-only")) process.exit(0);

// ── 3. Audio ─────────────────────────────────────────────────────────────────
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
  for (const name of ["pop", "tap", "chime"]) {
    const src = join(DIR, "../sfx-elevenlabs/chosen", `${name}.mp3`);
    const trim = "silenceremove=start_periods=1:start_threshold=-50dB";
    const vd = execSync(`ffmpeg -hide_banner -i "${src}" -af ${trim},volumedetect -f null - 2>&1`, { encoding: "utf8" });
    const max = parseFloat(vd.match(/max_volume: (-?[\d.]+) dB/)[1]);
    run(`ffmpeg -y -v error -i "${src}" -af "${trim},volume=${(PEAK[name] - max).toFixed(1)}dB,aresample=48000" "${f(name + ".wav")}"`);
  }

  const fx = [
    ["tap.wav", cue.sendReply - 0.12, 0.9],
    ["pop.wav", cue.sendReply, 1.0],
    ["chime.wav", cue.endCard + 0.2, 0.9],
  ];
  const inputs = [`-ss ${MUSIC_START} -t ${END + 1} -i "${MUSIC}"`];
  const filters = [], voice = [];
  const lines = Object.values(L);
  lines.forEach((l, i) => {
    inputs.push(`-ss ${r2(l.lead)} -i "${l.mp3}"`);
    const ms = Math.round(start[l.n] * 1000);
    filters.push(`[${i + 1}]aresample=48000,${voiceClean(l)},aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${l.gain}dB[v${i}]`);
    voice.push(`[v${i}]`);
  });
  fx.forEach(([file, t, vol], j) => {
    const k = 1 + lines.length + j, ms = Math.round(t * 1000);
    inputs.push(`-i "${f(file)}"`);
    filters.push(`[${k}]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${vol}[s${j}]`);
  });
  filters.push(`${voice.join("")}amix=inputs=${voice.length}:normalize=0,apad=whole_dur=${END}[vo]`);
  filters.push(`[vo]asplit=2[vo1][vokey]`);
  filters.push(`[0]aresample=48000,aformat=channel_layouts=stereo,volume=0.22,afade=t=in:d=0.8,afade=t=out:st=${r2(END - 1.6)}:d=1.6,volume='if(gte(t,${cue.endCard}),1.35,1)':eval=frame[mu]`);
  filters.push(`[mu][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[muduck]`);
  filters.push(`[vo1][muduck]${fx.map((_, j) => `[s${j}]`).join("")}amix=inputs=${2 + fx.length}:normalize=0,atrim=0:${END}[mix]`);
  const pre = join(SFX, "mix-pre.wav");
  run(`ffmpeg -y -v error ${inputs.join(" ")} -filter_complex "${filters.join(";")}" -map "[mix]" -ar 48000 "${pre}"`);
  const meas = execSync(`ffmpeg -hide_banner -i "${pre}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`, { encoding: "utf8" });
  const m = JSON.parse(meas.slice(meas.lastIndexOf("{"), meas.lastIndexOf("}") + 1));
  const mixed = join(SFX, "mix.wav");
  run(`ffmpeg -y -v error -i "${pre}" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000" "${mixed}"`);
  return mixed;
}
const audio = buildAudio();
console.log("Audio:", audio);
if (process.argv.includes("--audio-only")) process.exit(0);

// ── 4. Frames + encode ───────────────────────────────────────────────────────
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
const outFile = join(OUT, "repeat-ai-short-002-its-tuesday.mp4");
run(`ffmpeg -y -v error -framerate ${FPS} -i "${join(FRAMES, "frame-%04d.png")}" -i "${audio}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -ar 48000 -t ${END} -movflags +faststart "${outFile}"`);
console.log("Wrote", outFile);
