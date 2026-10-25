/**
 * Short 004 — "Two mornings" (RA-121), broker POV split screen: the spreadsheet morning vs the
 * Due today morning.
 *
 * Same pipeline as Shorts 001–003: narration word timings → timeline.json → Playwright frames
 * (recorded app clips via ../lib/app-phone.js) → ElevenLabs SFX + ducked music → -14 LUFS → H.264.
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
const NARR = process.env.NARR_DIR || join(DIR, "narration-v2");
const FPS = 30;
const MUSIC = join(ROOT, "video/launch-film/out/music-vastness-andrew-ev.mp3"); // Mixkit Free License, as in v5
const MUSIC_START = 140;

const sel = JSON.parse(readFileSync(process.env.SEL || join(DIR, "narration-selection-v2.json"), "utf8"));
const run = cmd => execSync(cmd, { stdio: "pipe", maxBuffer: 1 << 26 });
const r2 = v => Math.round(v * 100) / 100;
const rel = p => p.replace(DIR, "").replace(/\\/g, "/");

const SCRIPT = {
  1: "Two ways to start the same morning.",
  2: "Without Repeat, I open a spreadsheet and try to work out who I'm meant to follow up with.",
  3: "With Repeat, it's different. I open Due today.",
  4: "Every seller due for a follow-up is already on the list, with their status and how overdue they are.",
  5: "Sellers I've scheduled for later wait under Scheduled until their date comes round.",
  6: "So I start the day knowing exactly who to contact.",
  7: "Repeat AI. A clearer start to the day.",
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
  const mp3 = join(NARR, m ? `vo-004v2-${n}-${m[1]}-take-${m[2]}.mp3` : `vo-004v2-${n}-take-${take}.mp3`);
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
// v2 script (24 Oct 2026): plain and benefit-led; the coffee joke is gone.
start[1] = 0.6;
cue.toLaptop = endOf(1) + 0.35;              // top lane: the spreadsheet morning
start[2] = cue.toLaptop + 0.35;
cue.toSheet = W(2, "spreadsheet") - 0.1;
cue.toPhone = endOf(2) + 0.4;                // bottom lane: the Repeat morning
start[3] = cue.toPhone + 0.3;
cue.splash = W(3, "Repeat");
cue.toApp = cue.splash - 0.5;                 // the phone comes up on the Repeat launch screen
cue.appIn = W(3, "open") - 0.1;

// App proof: Home → View sellers → Due today → Scheduled (../app-clips/home-due-today)
const clips = loadClips(["home-due-today"], DIR, { theme: "light" });
const ev = k => clips["home-due-today"].events[k];
const app = { beats: [] };
const FULL = { sx: 590, sy: 1278, z: 0.78, cy: 1225 };
start[4] = endOf(3) + 0.3;
start[5] = endOf(4) + 0.4;
{
  // A: Home → tap View sellers → the Due today list, held while line 4 describes it
  const a = cue.appIn, c0 = ev("tap:view-sellers") - 0.6, rate = 1.0;
  const listAt = a + (ev("due-list") - c0) / rate;
  const holdAt = listAt + 0.8;
  const list = { sx: 590, sy: 1000, z: 1.0, cy: 1150 };
  app.beats.push({ a, b: holdAt, clip: "home-due-today", c0, rate,
    camKeys: [[a, FULL], [listAt, FULL], [listAt + 0.6, list]] });
  // freeze on the list (the clip would otherwise scroll and tap Scheduled early)
  app.beats.push({ a: holdAt, b: start[5] - 0.2, clip: "home-due-today", c0: ev("due-list") + 0.8, rate: 0, cut: true,
    camKeys: [[holdAt, list], [W(4, "status"), { sx: 590, sy: 800, z: 1.15, cy: 1150 }]] });
  // B: scroll → tap Scheduled while line 5 explains it
  const b0 = start[5] - 0.2, c1 = ev("due-list") + 0.8, r1 = 1.0;
  app.beats.push({ a: b0, b: endOf(5) + 0.6, clip: "home-due-today", c0: c1, rate: r1, cut: true,
    camKeys: [[b0, { sx: 590, sy: 800, z: 1.0, cy: 1150 }]] });
  cue.toSplit2 = endOf(5) + 0.6;
}
start[6] = cue.toSplit2 + 0.4;
cue.warm = W(6, "contact");
cue.endCard = endOf(6) + 0.6;
start[7] = cue.endCard + 0.3;
cue.endLine = W(7, "clearer") - 0.3;
let END = r2(endOf(7) + 1.3);
// under the end card: Home with today's numbers
app.beats.push({ a: cue.endCard, b: END + 1, clip: "home-due-today", c0: 0.5, rate: 0,
  camKeys: [[cue.endCard, { sx: 590, sy: 900, z: 0.9, cy: 1300 }], [cue.endCard + 0.7, { sx: 590, sy: 900, z: 0.62, cy: 1180 }]] });

// "Repeat" lands as the answer: the phone opens on the Repeat launch screen as the word is said
app.beats.push({ a: cue.toApp, b: cue.appIn, cam: FULL, screen: { kind: "splash", id: "splash", at: cue.splash } });
app.beats.sort((x, y) => x.a - y.a);
capSplash(app.beats);
// The phone stays in one place (the user's note, 25 Oct 2026): one framing for every beat, and
// the end card pulls back from it, so the phone never jumps around the frame.
{
  const FIXED = { sx: 590, sy: 1278, z: 0.75, cy: 1147 };   // the whole phone in frame, under the headline
  for (const bt of app.beats) if (bt.a < cue.endCard) { delete bt.camKeys; bt.cam = FIXED; }
  const endBeat = app.beats.find(bt => bt.a >= cue.endCard);
  if (endBeat) {
    const last = endBeat.camKeys ? endBeat.camKeys[endBeat.camKeys.length - 1][1] : endBeat.cam;
    delete endBeat.cam;
    endBeat.camKeys = [[cue.endCard, FIXED], [cue.endCard + 0.9, last]];
  }
}
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0 || 0); bt.rate = r2(bt.rate ?? 0); }
for (const k in cue) cue[k] = r2(cue[k]);
const tapTimes = [];
for (const bt of app.beats) if (bt.rate) for (const tp of clips[bt.clip].taps) {
  const ft = bt.a + (tp.t - bt.c0) / bt.rate;
  if (ft >= bt.a && ft < bt.b) tapTimes.push(r2(ft));
}

const EM = new Set(["repeat", "spreadsheet", "due", "today", "status", "overdue", "scheduled", "exactly"]);
const SHOW = [];
const idx = (n, w, k = 1) => L[n].words.indexOf(word(L[n], w, k));
function chunk(n, from, to) {
  const ws = L[n].words.slice(from, to);
  let html = ws.map(w => EM.has(norm(w.word)) ? `<em>${w.word}</em>` : w.word).join(" ");
  return { a: r2(start[n] + ws[0].start - 0.12), b: r2(start[n] + ws[ws.length - 1].end + 0.35), html };
}
// Headlines, not subtitles (the user's note, 25 Oct 2026): a few short key phrases, each landing on
// its word and held until the next one or a beat after its line ends.
const HEADLINES = [
 [
  1,
  "Two",
  "Two mornings"
 ],
 [
  2,
  "spreadsheet",
  "Without Repeat: <em>the spreadsheet</em>"
 ],
 [
  3,
  "Repeat",
  "With <em>Repeat</em>: Due today"
 ],
 [
  4,
  "status",
  "Status and <em>how overdue</em>"
 ],
 [
  5,
  "Scheduled",
  "Later? <em>Scheduled</em>"
 ],
 [
  6,
  "exactly",
  "Know <em>exactly</em> who's next"
 ]
];
const captions = HEADLINES.map(([n, w, html]) => ({ a: W(n, w) - 0.15, n, html }));
captions.forEach((c, i) => {
  const next = captions[i + 1], lineEnd = endOf(c.n) + 0.9;
  c.b = r2(next && next.a < lineEnd + 1.2 ? next.a : lineEnd);
  c.a = r2(c.a); delete c.n;
});

// Poses: Codex's art when it lands, earlier poses as stand-ins until then
const POSES = {
  neutral: ["pose-table-neutral.png", "../003-midnight-message/pose-broker-desk.png"],
  laptop: ["pose-table-laptop.png", "../001-content-day/pose-interrupted.png"],
  phone: ["pose-table-phone.png", "../003-midnight-message/pose-broker-desk.png"],
  sip: ["pose-table-sip.png", "../001-content-day/pose-payoff.png"],
};
const poses = {};
for (const [k, files] of Object.entries(POSES)) {
  const f = files.find(x => existsSync(join(DIR, x)));
  const b = JSON.parse(execSync(`python -c "from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert('RGBA'); print(json.dumps(list(im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox())))" "${join(DIR, f)}"`, { encoding: "utf8" }));
  poses[k] = { src: f, standIn: f.startsWith(".."), x0: b[0], y0: b[1], x1: b[2], y1: b[3] };
}
// where the mug sits on each pose (fractions of its bounds), for the steam
const steamSpots = existsSync(join(DIR, "steam.json")) ? JSON.parse(readFileSync(join(DIR, "steam.json"), "utf8")) : { neutral: [0.6, 0.45], laptop: [0.8, 0.5], phone: [0.7, 0.45], sip: [0.6, 0.2] };
const timeline = { end: END, cue, captions, poses, steam: steamSpots, app, clips, tapTimes, lines: Object.values(L).map(l => ({ n: l.n, start: r2(start[l.n]), end: r2(endOf(l.n)), file: rel(l.mp3) })) };
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
const outFile = join(OUT, "repeat-ai-short-004-two-mornings.mp4");
run(`ffmpeg -y -v error -framerate ${FPS} -i "${join(FRAMES, "frame-%04d.png")}" -i "${audio}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -ar 48000 -t ${END} -movflags +faststart "${outFile}"`);
console.log("Wrote", outFile);
