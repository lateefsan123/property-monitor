/**
 * Repeat AI demo film v8 (about 85 s): the problem, "That's why I use Repeat.", then organise →
 * write once → let it run → proof → Ask Repeat. Light theme, phone-first, the broker in the corner,
 * no tags. Narration: Brady J via the ElevenLabs creative connector (Eleven v4).
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
  1: "Ten thousand sellers. Every one of them expects to hear from you.",
  2: "That's a lot of follow-ups to remember.",
  3: "That's why I use Repeat.",
  4: "I bring my sellers in from Google Sheets or Excel.",
  5: "Every seller gets a stage, like Prospect or Appraisal, and a follow-up date.",
  6: "I can add my own stages too, each with its own schedule.",
  7: "Each morning, Due today shows who to contact, and who's overdue.",
  8: "I write one template for each stage.",
  9: "Repeat fills in their name, their building and the latest sales, and my broker card goes with the first message.",
  10: "Then I let it run.",
  11: "Follow-ups go out from my own WhatsApp, as each seller comes due.",
  12: "Only within my sending hours, spaced out, under a daily limit.",
  13: "When something sells in their building, they get the update.",
  14: "And when a seller replies, their follow-ups stop. That conversation is mine.",
  15: "Send activity shows everything that went out.",
  16: "And Ask Repeat, in early access, can tell me which buildings sold the most last month.",
  17: "Repeat AI. Stay close to your sellers.",
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
  const mp3 = join(NARR, m ? `vo-v8-${n}-${m[1]}-take-${m[2]}.mp3` : `vo-v8-${n}-take-${take}.mp3`);
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
// The demo film, as a story: the problem (desk) → "That's why I use Repeat." → organise
// (import, stages, own stages, Due today) → write once (templates, fill-ins, broker card) → let
// it run (Status follow-ups, own WhatsApp, hours/spacing/limit, sales updates, stops on reply) →
// proof (Send activity) → Ask Repeat → end card. One feature per beat, all light theme.
const ST = "../../../video/launch-film/out/app/takes-light/";
const GAP = { 2: 0.45, 3: 0.6, 4: 0.55, 5: 0.6, 6: 0.6, 7: 0.7, 8: 0.9, 9: 0.5, 10: 0.9, 11: 0.5, 12: 0.55, 13: 0.7, 14: 0.7, 15: 0.9, 16: 0.9 };
start[1] = 0.6;
for (let n = 2; n <= 16; n++) start[n] = endOf(n - 1) + GAP[n];
cue.toCringe = start[2] - 0.25;               // "That's a lot of follow-ups to remember."
cue.toApp = start[3] - 0.45;                  // the phone comes up on the Repeat launch screen
cue.splash = W(3, "Repeat");
cue.endCard = endOf(16) + 0.9;
start[17] = cue.endCard + 0.35;
cue.endLine = W(17, "stay") - 0.05;
let END = r2(endOf(17) + 1.5);

const clips = loadClips(["home-due-today", "template-appraisal", "oliver-message-tab", "automations-status", "whatsapp-connected",
  "automations-window", "automations-transaction", "send-activity"], DIR, { theme: "light" });
const ev = (c, k) => clips[c].events[k];
const lastT = c => (clips[c].frames - 1) / 30;
const FULL = { sx: 590, sy: 1278, z: 0.8, cy: 1360 };
const near = (sy, z = 1.0, cy = 1080) => ({ sx: 590, sy, z, cy });
const b = [];
const at = n => start[n] - 0.2;               // a beat starts just before its line
// 3. the launch screen (capped by capSplash)
b.push({ a: cue.toApp, b: at(4), cam: FULL, screen: { kind: "splash", id: "splash", at: cue.splash } });
// 4. import from Google Sheets or Excel
b.push({ a: at(4), b: endOf(4) + 0.25, still: ST + "import-options.png", camKeys: [[at(4), FULL], [W(4, "Google") - 0.2, near(1950, 0.95, 1100)]] });
b.push({ a: endOf(4) + 0.25, b: at(5), still: ST + "import-done.png", cut: true, cam: near(1300, 0.86, 1250) });
// 5. every seller has a stage and a follow-up date
b.push({ a: at(5), b: W(5, "and") - 0.1, still: ST + "sv-due.png", camKeys: [[at(5), FULL], [W(5, "Prospect") - 0.3, near(1050, 0.95, 1150)]] });
b.push({ a: W(5, "and") - 0.1, b: at(6), still: ST + "cs-oliver.png", camKeys: [[W(5, "and") - 0.1, near(1100, 0.86, 1200)], [W(5, "date") - 0.4, near(1300, 1.02, 1080)]] });
// 6. your own stages, each with its own schedule
b.push({ a: at(6), b: W(6, "each") - 0.1, still: ST + "cs-named.png", cam: near(700, 0.9, 1100) });
b.push({ a: W(6, "each") - 0.1, b: endOf(6) + 0.3, still: ST + "cs-week.png", cut: true, cam: near(1900, 0.92, 1150) });
b.push({ a: endOf(6) + 0.3, b: at(7), still: ST + "cs-saved.png", cut: true, cam: near(700, 0.92, 1150) });
// 7. Due today: who to contact, who's overdue
{
  const a = at(7), tap = W(7, "Due") - 0.1, c0 = Math.max(0, ev("home-due-today", "tap:view-sellers") - (tap - a));
  const hold = a + (ev("home-due-today", "due-list") + 0.6 - c0);
  b.push({ a, b: hold, clip: "home-due-today", c0, rate: 1, camKeys: [[a, FULL], [hold - 0.5, FULL], [hold, near(900, 0.92, 1150)]] });
  b.push({ a: hold, b: at(8), clip: "home-due-today", c0: ev("home-due-today", "due-list") + 0.6, rate: 0, cut: true,
    camKeys: [[hold, near(900, 0.92, 1150)], [W(7, "overdue") - 0.3, near(930, 1.05, 1060)]] });
}
// 8–9. one template per stage; name, building and sales fill in; the broker card
{
  const a = at(8), c0 = ev("template-appraisal", "tap:edit-appraisal") - 0.5;
  const open = a + (ev("template-appraisal", "editor-open") - c0);
  b.push({ a, b: open, clip: "template-appraisal", c0, rate: 1, camKeys: [[a, near(700, 0.86, 1200)], [open - 0.2, near(700, 0.86, 1200)]] });
  const pv = W(9, "latest") - 0.3;
  b.push({ a: open, b: pv, clip: "template-appraisal", c0: ev("template-appraisal", "tap:preview") - 0.05, rate: 0, cut: true,
    camKeys: [[open, near(760, 0.9, 1150)], [W(9, "name") - 0.2, near(980, 1.0, 1100)]] });
  const card = W(9, "broker") - 0.3;
  b.push({ a: pv, b: card, clip: "template-appraisal", c0: ev("template-appraisal", "tap:preview") - 0.2, rate: 1, cut: true,
    camKeys: [[pv, near(980, 1.0, 1100)], [pv + 0.9, near(1800, 0.95, 1150)]] });
  b.push({ a: card, b: at(10), clip: "oliver-message-tab", c0: lastT("oliver-message-tab"), rate: 0, cam: near(880, 1.0, 1050) });
}
// 10. then let it run: the real tap on Status follow-ups
{
  const a = at(10), tap = W(10, "run");
  b.push({ a, b: at(11), clip: "automations-status", c0: Math.max(0.3, ev("automations-status", "tap:status-switch") - (tap - a)), rate: 1,
    camKeys: [[a, near(1000, 0.88, 1200)], [a + 0.5, near(1330, 0.95, 1150)]] });
}
// 11. from your own WhatsApp
b.push({ a: at(11), b: at(12), clip: "whatsapp-connected", c0: ev("whatsapp-connected", "tap:whatsapp") - 0.25, rate: 1,
  camKeys: [[at(11), FULL], [at(11) + 0.9, FULL], [at(11) + 1.5, near(380, 0.95, 950)]] });
// 12. within hours, spaced out, under a daily limit
{
  const a = at(12), held = ev("automations-window", "window-visible") + 0.3, from = Math.max(0, held - 1.2);
  b.push({ a, b: a + (held - from), clip: "automations-window", c0: from, rate: 1, camKeys: [[a, FULL], [a + (held - from), { ...FULL, sy: 1500 }]] });
  b.push({ a: a + (held - from), b: at(13), clip: "automations-window", c0: held, rate: 0, cut: true,
    camKeys: [[a + (held - from), { ...FULL, sy: 1500 }], [W(12, "sending") - 0.2, near(1600, 0.98, 1100)], [W(12, "spaced") - 0.3, near(1600, 0.98, 1100)],
              [W(12, "spaced") + 0.2, near(1950, 0.98, 1100)], [W(12, "daily") - 0.3, near(1950, 0.98, 1100)], [W(12, "daily") + 0.2, near(1195, 0.98, 1100)]] });
}
// 13. when something sells in their building, they get the update
{
  const a = at(13), lock = W(13, "they") - 0.2;
  b.push({ a, b: lock, clip: "automations-transaction", c0: ev("automations-transaction", "tap:automations") - 0.2, rate: 1,
    camKeys: [[a, FULL], [a + 1.0, FULL], [a + 1.5, near(330, 1.0, 950)]] });
  b.push({ a: lock, b: at(14), cam: { ...FULL, sy: 1150, cy: 1260 },
    screen: { kind: "lock", id: "elena-sale", time: "10:42", date: "Friday 23 October",
      note: { at: lock + 0.3, app: "WhatsApp", title: "+971 50 555 0100", body: "Hi Elena Petrova, a 1-bed in Claren Tower 2 just sold for AED 1.62M." } } });
}
// 14. a seller replies; the follow-ups stop and the conversation is yours
{
  const a = at(14), reply = "Of course. I'll call you Thursday at 11.";
  b.push({ a, b: at(15), cam: { ...FULL, sy: 1200, cy: 1300 },
    screen: { kind: "wa", id: "elena-chat", name: "Elena Petrova", sub: "online", keyboard: true, items: [
      { at: a, side: "out", text: "Hi Elena Petrova, a 1-bed in Claren Tower 2 just sold for AED 1.62M." },
      { at: W(14, "replies") - 0.1, side: "in", text: "Thanks! Could you call me on Thursday?" },
      { at: endOf(14) + 0.15, side: "out", text: reply }],
      typing: { text: reply, ta: W(14, "That") - 0.1, tb: endOf(14), clear: endOf(14) + 0.15 } } });
}
// 15. Send activity: everything that went out
{
  const a = at(15);
  b.push({ a, b: at(16), clip: "send-activity", c0: ev("send-activity", "tap:send-activity") - 0.3, rate: 1,
    camKeys: [[a, FULL], [a + 1.2, FULL], [a + 1.8, near(800, 0.95, 1150)]] });
}
// 16. Ask Repeat (early access): which buildings sold the most last month
b.push({ a: at(16), b: W(16, "which") - 0.2, still: ST + "rank-listening.png", cam: FULL });
b.push({ a: W(16, "which") - 0.2, b: W(16, "most") - 0.1, still: ST + "rank-asking.png", cut: true, cam: FULL });
b.push({ a: W(16, "most") - 0.1, b: cue.endCard + 0.1, still: ST + "rank-answer.png", cut: true,
  camKeys: [[W(16, "most") - 0.1, FULL], [W(16, "most") + 0.6, near(1500, 0.98, 1150)]] });
// under the end card: Send activity
b.push({ a: cue.endCard, b: END + 1, clip: "send-activity", c0: lastT("send-activity"), rate: 0,
  camKeys: [[cue.endCard, near(1000, 0.9, 1600)], [cue.endCard + 0.7, near(1100, 0.66, 1420)]] });
const app = { beats: b.sort((x, y) => x.a - y.a) };
capSplash(app.beats);
for (const bt of app.beats) { bt.a = r2(bt.a); bt.b = r2(bt.b); bt.c0 = r2(bt.c0 || 0); bt.rate = r2(bt.rate ?? 0); }
for (const bt of app.beats) for (const o of [bt.screen?.typing, bt.screen?.note, ...(bt.screen?.items || [])]) if (o) for (const k of ["at", "ta", "tb", "clear"]) if (o[k] !== undefined) o[k] = r2(o[k]);
for (const k in cue) cue[k] = r2(cue[k]);
const tapTimes = [];
for (const bt of app.beats) if (bt.rate && bt.clip) for (const tp of clips[bt.clip].taps) {
  const ft = bt.a + (tp.t - bt.c0) / bt.rate;
  if (ft >= bt.a && ft < bt.b) tapTimes.push(r2(ft));
}

const EM = new Set(["repeat", "stage", "prospect", "appraisal", "followup", "date", "stages", "schedule", "due", "today", "overdue", "template",
  "name", "building", "sales", "broker", "card", "run", "whatsapp", "hours", "spaced", "limit", "update", "replies", "mine", "send", "activity", "ask"]);
const SHOW = [["Ten thousand sellers.", "<em>10,000</em> sellers."]];
const idx = (n, w, k = 1) => L[n].words.indexOf(word(L[n], w, k));
function chunk(n, from, to) {
  const ws = L[n].words.slice(from, to);
  let html = ws.map(w => EM.has(norm(w.word)) ? `<em>${w.word}</em>` : w.word).join(" ");
  for (const [a, b] of SHOW) html = html.replace(a, b);
  return { a: r2(start[n] + ws[0].start - 0.12), b: r2(start[n] + ws[ws.length - 1].end + 0.35), html };
}
const captions = [
  chunk(1, 0, idx(1, "Every")), chunk(1, idx(1, "Every")),
  chunk(2, 0), chunk(3, 0), chunk(4, 0),
  chunk(5, 0, idx(5, "and")), chunk(5, idx(5, "and")),
  chunk(6, 0),
  chunk(7, 0, idx(7, "Due")), chunk(7, idx(7, "Due")),
  chunk(8, 0),
  chunk(9, 0, idx(9, "and", 2)), chunk(9, idx(9, "and", 2)),
  chunk(10, 0), chunk(11, 0), chunk(12, 0), chunk(13, 0),
  chunk(14, 0, idx(14, "That")), chunk(14, idx(14, "That")),
  chunk(15, 0),
  chunk(16, 0, idx(16, "can")), chunk(16, idx(16, "can")),
];
for (let i = 0; i < captions.length - 1; i++) if (captions[i + 1].a - captions[i].b < 0.5) captions[i].b = captions[i + 1].a;

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
const outFile = join(OUT, "repeat-ai-demo-v8-9x16.mp4");
run(`ffmpeg -y -v error -framerate ${FPS} -i "${join(FRAMES, "frame-%04d.png")}" -i "${audio}" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -ar 48000 -t ${END} -movflags +faststart "${outFile}"`);
console.log("Wrote", outFile);
