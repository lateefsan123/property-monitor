/**
 * Repeat AI intro film v10: what Repeat AI is and why it is convenient, on the dark app. Automatic
 * follow-ups, statuses with the right message, the latest transactions in the seller's building,
 * the broker card in Repeat's real message format, a human pace, stops on a reply.
 * Narration: Brady J via the ElevenLabs creative connector (Eleven v4).
 * Built on the shorts pipeline (../lib). Writes 9:16; the 16:9 version is made from it.
 *
 * Usage: node build-short.mjs [--timeline-only] [--audio-only]
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
const MUSIC_START = 10;

const sel = JSON.parse(readFileSync(process.env.SEL || join(DIR, "narration-selection.json"), "utf8"));
const run = cmd => execSync(cmd, { stdio: "pipe", maxBuffer: 1 << 26 });
const r2 = v => Math.round(v * 100) / 100;
const rel = p => p.replace(DIR, "").replace(/\\/g, "/");

const SCRIPT = {
  1: "If you're a broker in Dubai, your sellers are your business.",
  2: "But following up with every one of them, by hand, on WhatsApp? It never ends.",
  3: "Meet Repeat AI.",
  4: "It follows up with your sellers for you, automatically, from your own WhatsApp.",
  5: "Give each seller a status, like Prospect, Appraisal or For Sale, and they get the right message at the right time.",
  6: "Every update shows the latest transactions in their own building, so it's actually worth reading.",
  7: "And your broker card goes with it, so they know it's you.",
  8: "It sends at a human pace, within your hours, and stops the moment a seller replies.",
  9: "So you spend your time on real conversations, not copy and paste.",
  10: "Repeat AI. Stay close to your sellers.",
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
  const mp3 = join(NARR, m ? `vo-v10-${n}-${m[1]}-take-${m[2]}.mp3` : `vo-v10-${n}-take-${take}.mp3`);
  const words = JSON.parse(readFileSync(mp3.replace(/\.mp3$/, ".words.json"), "utf8"));
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: "utf8" }));
  const lead = Math.max(0, words[0].start - 0.04);
  // Align heard words to the script: merge recogniser tokens ("two" "bed", "4" ".67") until they
  // spell the next script word, then show the script's spelling
  const script = SCRIPT[n].split(/\s+/);
  let merged = [];
  try {
    let i = 0;
    for (const sw of script) {
      if (i >= words.length) throw new Error(`ran out of heard words at "${sw}"`);
      const m = { ...words[i++] };
      let heard = m.word;
      while (norm(heard) !== norm(sw) && i < words.length && norm(sw).startsWith(norm(heard))) { heard += words[i].word; m.end = words[i++].end; }
      if (norm(heard) !== norm(sw)) throw new Error(`heard "${heard}", script "${sw}"`);
      merged.push({ ...m, heard, word: sw });
    }
  } catch (e) {
    // numbers come back as digits ("11:47", "9", "15"): spread the script words over the heard
    // speech by length instead, which is close enough for cues and captions
    const a = words[0].start, z = words[words.length - 1].end, total = script.reduce((s, w) => s + w.length + 1, 0);
    let t = a;
    merged = script.map(w => { const d = (z - a) * (w.length + 1) / total; const r = { word: w, start: t, end: t + d * 0.92 }; t += d; return r; });
    console.log(`  line ${n}: ${e.message}; timed by length instead`);
  }
  const loud = execSync(`ffmpeg -hide_banner -i "${mp3}" -af ebur128 -f null - 2>&1`, { encoding: "utf8" });
  const lufs = parseFloat(loud.slice(loud.lastIndexOf("Integrated loudness")).match(/I:\s+(-?[\d.]+) LUFS/)[1]);
  return { n, mp3, lead, gain: r2(VOICE_LUFS - lufs), words: merged.map(w => ({ ...w, start: w.start - lead, end: w.end - lead })), dur: dur - lead };
}
const L = {};
for (const n of Object.keys(SCRIPT).map(Number)) L[n] = loadLine(n);
function word(line, w, nth = 1) {
  let k = 0;
  for (const x of line.words) if (norm(x.word) === norm(w) && ++k === nth) return x;
  throw new Error(`word "${w}" (#${nth}) not in line ${line.n}`);
}
const start = {}, cue = {};
const W = (n, w, k = 1, f = "start") => start[n] + word(L[n], w, k)[f];
const endOf = n => start[n] + L[n].words[L[n].words.length - 1].end;

// ── 2. Timeline ──────────────────────────────────────────────────────────────
// The intro, selling the convenience on the dark app: the problem (desk) → "Meet Repeat AI."
// (launch screen) → follow-ups switched on → statuses and their templates → an update with the
// latest transactions in the seller's building → the real message, broker card and all, in
// WhatsApp → human pace, stops on a reply → Send activity → end card.
const GAP = { 2: 0.45, 3: 0.65, 4: 0.55, 5: 0.6, 6: 0.6, 7: 0.5, 8: 0.6, 9: 0.6 };
start[1] = 0.6;
for (let n = 2; n <= 9; n++) start[n] = endOf(n - 1) + GAP[n];
cue.toCringe = start[2] - 0.25;
cue.toApp = start[3] - 0.45;                  // the phone comes up on the Repeat launch screen
cue.splash = W(3, "Repeat");
cue.endCard = endOf(9) + 0.9;
start[10] = cue.endCard + 0.35;
cue.endLine = W(10, "stay") - 0.05;
let END = r2(endOf(10) + 1.5);

const clips = loadClips(["automations-status", "send-activity"], DIR);
const ev = (c, k) => clips[c].events[k];
const lastT = c => (clips[c].frames - 1) / 30;
const ST = "../../../video/launch-film/out/app/takes-v5s/";   // dark-theme stills
const CARD = "../002-seller-tuesday/assets/template-card.png";
const FIXED = { sx: 590, sy: 1278, z: 0.75, cy: 1147 };   // the whole phone in frame, held still
const at = n => start[n] - 0.2;
const b = [];
b.push({ a: cue.toApp, b: at(4), screen: { kind: "splash", id: "splash", at: cue.splash } });
// 4. it follows up for you, automatically: Status follow-ups switched on
{
  const a = at(4), tap = W(4, "automatically"), c0 = Math.max(0.3, ev("automations-status", "tap:status-switch") - (tap - a));
  b.push({ a, b: at(5), clip: "automations-status", c0, rate: 1 });
}
// 5. a status for each seller, and the right message for it
b.push({ a: at(5), b: W(5, "right") - 0.15, still: ST + "sc-statuses.png" });
b.push({ a: W(5, "right") - 0.15, b: at(6), still: ST + "tpl-preview.png", cut: true });
// 6. the latest transactions in their own building, in Repeat's real message format
b.push({ a: at(6), b: at(7), still: ST + "tpl-intro-preview.png" });
// 7. in WhatsApp: the broker card, then the message, exactly as Repeat sends it
const MSG = "Hi Oliver Grant, I'm Sara, a broker specialising in Burj Khalifa, Downtown Dubai.\n\nHere are the latest transactions in your building:\n\n- Burj Khalifa | 2 Bed | 4.67M AED | 1,568 sqft | 23 Oct 2026\n\nIf you ever think about selling, I'd be happy to tell you what your unit could achieve.";
const chat = (id, items) => ({ kind: "wa", id, name: "Oliver Grant", sub: "online", dark: true, bottom: true, items });
const sent = [{ at: at(7) + 0.3, side: "out", img: CARD, text: MSG }];
b.push({ a: at(7), b: at(8), screen: chat("oliver-sent", sent) });
// 8. a human pace, within your hours; then the seller replies and it stops
b.push({ a: at(8), b: W(8, "stops") - 0.2, still: ST + "sc-pacing.png", cut: true });
b.push({ a: W(8, "stops") - 0.2, b: at(9), cut: true, screen: chat("oliver-reply", [...sent, { at: W(8, "replies") - 0.1, side: "in", text: "Which floor?" }]) });
// 9. what went out today: Send activity
{
  const a = at(9), c0 = ev("send-activity", "tap:send-activity") - 0.3;
  b.push({ a, b: cue.endCard, clip: "send-activity", c0, rate: 1 });
}
// under the end card: Send activity held, pulling back from the same framing
b.push({ a: cue.endCard, b: END + 1, clip: "send-activity", c0: lastT("send-activity"), rate: 0, cut: true,
  camKeys: [[cue.endCard, FIXED], [cue.endCard + 0.9, { sx: 590, sy: 1100, z: 0.66, cy: 1420 }]] });
for (const bt of b) if (bt.a < cue.endCard) bt.cam = FIXED;
const app = { beats: b.sort((x, y) => x.a - y.a) };
capSplash(app.beats);
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0 || 0); bt.rate = r2(bt.rate ?? 0); }
for (const bt of app.beats) for (const o of [bt.screen?.typing, ...(bt.screen?.items || [])]) if (o) for (const k of ["at", "ta", "tb", "clear"]) if (o[k] !== undefined) o[k] = r2(o[k]);
for (const k in cue) cue[k] = r2(cue[k]);
const tapTimes = [];
for (const bt of app.beats) if (bt.rate && bt.clip) for (const tp of clips[bt.clip].taps) {
  const ft = bt.a + (tp.t - bt.c0) / bt.rate;
  if (ft >= bt.a && ft < bt.b) tapTimes.push(r2(ft));
}

// Headlines, not subtitles: a few key phrases, each landing on its word
const HEADLINES = [
  [1, "sellers", "Your sellers are <em>your business</em>"],
  [2, "never", "By hand? <em>It never ends.</em>"],
  [3, "Repeat", "Meet <em>Repeat AI</em>"],
  [4, "automatically", "Follow-ups, <em>automatically</em>"],
  [5, "status", "A <em>status</em> for every seller"],
  [5, "right", "The <em>right message</em> for each one"],
  [6, "latest", "The latest sales <em>in their building</em>"],
  [7, "broker", "Your <em>broker card</em>, every time"],
  [8, "human", "A <em>human pace</em>, in your hours"],
  [8, "stops", "They reply? <em>It stops.</em>"],
  [9, "real", "Real conversations, <em>not copy and paste</em>"],
];
const captions = HEADLINES.map(([n, w, html]) => ({ a: W(n, w) - 0.15, n, html }));
captions.forEach((c, i) => {
  const next = captions[i + 1], lineEnd = endOf(c.n) + 0.9;
  c.b = r2(next && next.a < lineEnd + 1.2 ? next.a : lineEnd);
  c.a = r2(c.a); delete c.n;
});

const POSES = {
  desk: ["../003-midnight-message/pose-broker-desk.png"],
  cringe: ["../010-wrong-name/pose-broker-cringe.png"],
};
const poses = {};
for (const [k, files] of Object.entries(POSES)) {
  const f = files.find(x => existsSync(join(DIR, x)));
  const b = JSON.parse(execSync(`python -c "from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert('RGBA'); print(json.dumps(list(im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox())))" "${join(DIR, f)}"`, { encoding: "utf8" }));
  poses[k] = { src: f, standIn: f.startsWith(".."), x0: b[0], y0: b[1], x1: b[2], y1: b[3] };
}
const timeline = { end: END, cue, captions, poses, app, clips, tapTimes, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: rel(l.mp3) })) };
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
  for (const name of ["tap", "chime"]) {
    const src = join(DIR, "../sfx-elevenlabs/chosen", `${name}.mp3`);
    const trim = "silenceremove=start_periods=1:start_threshold=-50dB";
    const vd = execSync(`ffmpeg -hide_banner -i "${src}" -af ${trim},volumedetect -f null - 2>&1`, { encoding: "utf8" });
    const max = parseFloat(vd.match(/max_volume: (-?[\d.]+) dB/)[1]);
    run(`ffmpeg -y -v error -i "${src}" -af "${trim},volume=${(PEAK[name] - max).toFixed(1)}dB,aresample=48000" "${f(name + ".wav")}"`);
  }

  const fx = [
    ...tapTimes.map(t => ["tap.wav", t, 0.9]),
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
const outFile = join(OUT, "repeat-ai-intro-v10-9x16.mp4");
run(`ffmpeg -y -v error -framerate ${FPS} -i "${join(FRAMES, "frame-%04d.png")}" -i "${audio}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -ar 48000 -t ${END} -movflags +faststart "${outFile}"`);
console.log("Wrote", outFile);
