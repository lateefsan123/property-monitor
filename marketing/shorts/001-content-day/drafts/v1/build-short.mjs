/**
 * Short 001 — Content Day (RA-101)
 *
 * Renders HTML frames via Playwright, builds SFX + music bed,
 * optionally mixes narration, encodes final 1080×1920 MP4.
 *
 * Requires three pose PNGs in this directory:
 *   pose-hook.png, pose-interrupted.png, pose-payoff.png
 *
 * Optional narration WAVs:
 *   narration-01.wav … narration-04.wav
 *
 * Usage:  node build-short.mjs
 * Output: out/repeat-ai-short-001-content-day.mp4
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(
  "D:/Users/Lateef/Documents/property/video/node_modules/playwright-core"
);

import { execSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../../");
const FRAMES_DIR = join(__dirname, "frames");
const OUT_DIR = join(__dirname, "out");
const SFX_DIR = join(__dirname, "sfx");
const TEMPLATE = join(__dirname, "short-template.html");

const FPS = 30;
const TOTAL_FRAMES = 660;
const DURATION = TOTAL_FRAMES / FPS; // 22 s
const WIDTH = 1080;
const HEIGHT = 1920;

// ── Asset paths ──
const POSE_HOOK    = join(__dirname, "pose-hook.png");
const POSE_INT     = join(__dirname, "pose-interrupted.png");
const POSE_PAYOFF  = join(__dirname, "pose-payoff.png");
const APP_SELLERS  = join(ROOT, "video/launch-film/out/app/takes-v6/mobile-sellers.png");
const APP_MESSAGE  = join(ROOT, "video/launch-film/out/app/takes-v6/mobile-send.png");
const APP_ACTIVITY = join(ROOT, "video/launch-film/out/app/takes-v6/mobile-activity.png");
const MUSIC_BED    = join(ROOT, "video/assets/accurate/public/dream-culture.mp3");

// Optional narration
const NAR = [1,2,3,4].map(n => join(__dirname, `narration-0${n}.wav`));

const BROWSER_PATH =
  "C:/Users/lateef/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";

// ── Helpers ──
function toDataUri(p) {
  const buf = readFileSync(p);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
function run(cmd) { execSync(cmd, { stdio: "pipe" }); }

// ── Preflight ──
function preflight() {
  const missing = [];
  if (!existsSync(POSE_HOOK))   missing.push("pose-hook.png");
  if (!existsSync(POSE_INT))    missing.push("pose-interrupted.png");
  if (!existsSync(POSE_PAYOFF)) missing.push("pose-payoff.png");
  if (missing.length) {
    console.error(`\nMissing pose assets:\n  ${missing.join("\n  ")}`);
    console.error("\nSee asset-requests.md. Waiting for Codex to supply them.\n");
    process.exit(1);
  }
}

// ── Audio ──
function buildAudio() {
  console.log("Building audio...");
  mkdirSync(SFX_DIR, { recursive: true });

  const cameraBeep = join(SFX_DIR, "camera-beep.wav");
  const notifBuzz  = join(SFX_DIR, "notif-buzz.wav");
  const uiSwipe    = join(SFX_DIR, "ui-swipe.wav");
  const recBeep    = join(SFX_DIR, "rec-beep.wav");
  const mixed      = join(SFX_DIR, "mix.wav");

  // Camera start: two short tones
  run(`ffmpeg -y -f lavfi -i "sine=frequency=880:duration=0.08" -f lavfi -i "sine=frequency=1100:duration=0.12" -filter_complex "[0]adelay=0|0,volume=0.3[a];[1]adelay=120|120,volume=0.35[b];[a][b]amix=inputs=2:duration=longest" "${cameraBeep}"`);

  // Notification: descending two-tone
  run(`ffmpeg -y -f lavfi -i "sine=frequency=600:duration=0.1" -f lavfi -i "sine=frequency=440:duration=0.15" -filter_complex "[0]adelay=0|0,volume=0.25[a];[1]adelay=130|130,volume=0.2[b];[a][b]amix=inputs=2:duration=longest" "${notifBuzz}"`);

  // UI swipe: pink noise burst
  run(`ffmpeg -y -f lavfi -i "anoisesrc=duration=0.2:color=pink:amplitude=0.15" -af "afade=t=in:d=0.03,afade=t=out:st=0.1:d=0.1,highpass=f=2000,lowpass=f=6000" "${uiSwipe}"`);

  // REC beep: single clean tone
  run(`ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=0.15" -af "afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.07,volume=0.3" "${recBeep}"`);

  // Check for narration files
  const hasNar = NAR.every(f => existsSync(f));
  if (hasNar) console.log("  Narration files found — mixing in.");
  else console.log("  No narration — caption-led with SFX + music.");

  // Build the mix command
  // Inputs: 0=music, 1=cameraBeep, 2=notifBuzz, 3-5=uiSwipe×3, 6=recBeep, [7-10=narration]
  let inputs = [
    `-t ${DURATION} -i "${MUSIC_BED}"`,
    `-i "${cameraBeep}"`,
    `-i "${notifBuzz}"`,
    `-i "${uiSwipe}"`, `-i "${uiSwipe}"`, `-i "${uiSwipe}"`,
    `-i "${recBeep}"`,
  ];
  let filters = [
    `[0]volume=0.08,afade=t=in:d=1.5,afade=t=out:st=${DURATION-2.5}:d=2.5[music]`,
    `[1]adelay=300|300[sfx1]`,              // camera beep at 0.3 s
    `[2]adelay=2600|2600[sfx2]`,            // notif buzz at 2.6 s
    `[3]adelay=6700|6700[sfx3]`,            // swipe into sellers at 6.7 s
    `[4]adelay=9200|9200[sfx4]`,            // swipe into message at 9.2 s
    `[5]adelay=11800|11800[sfx5]`,          // swipe into activity at 11.8 s
    `[6]adelay=14100|14100[sfx6]`,          // rec beep at 14.1 s
  ];
  let mixLabels = "[music][sfx1][sfx2][sfx3][sfx4][sfx5][sfx6]";
  let mixCount = 7;

  if (hasNar) {
    // Narration timing: line 1 at 0.3s, line 2 at 2.5s, line 3 at 7.5s, line 4 at 14.3s
    const narDelays = [300, 2500, 7500, 14300];
    for (let i = 0; i < 4; i++) {
      inputs.push(`-i "${NAR[i]}"`);
      const idx = 7 + i;
      filters.push(`[${idx}]adelay=${narDelays[i]}|${narDelays[i]},volume=0.9[nar${i}]`);
      mixLabels += `[nar${i}]`;
      mixCount++;
    }
  }

  filters.push(`${mixLabels}amix=inputs=${mixCount}:duration=first:normalize=0[out]`);

  const cmd = `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filters.join(";")}" -map "[out]" -ar 44100 -ac 2 "${mixed}"`;
  run(cmd);

  console.log("Audio done.");
  return mixed;
}

// ── Main ──
async function main() {
  console.log("Short 001 — Content Day build\n");
  preflight();

  mkdirSync(FRAMES_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Clean old frames
  for (const f of readdirSync(FRAMES_DIR)) {
    if (f.endsWith(".png")) unlinkSync(join(FRAMES_DIR, f));
  }

  console.log("Loading assets...");
  const assets = {
    hook:     toDataUri(POSE_HOOK),
    tension:  toDataUri(POSE_INT),
    payoff:   toDataUri(POSE_PAYOFF),
    sellers:  toDataUri(APP_SELLERS),
    message:  toDataUri(APP_MESSAGE),
    activity: toDataUri(APP_ACTIVITY),
  };

  const audioPath = buildAudio();

  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: BROWSER_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.goto(
    `file:///${TEMPLATE.replace(/\\/g, "/")}`,
    { waitUntil: "load" }
  );

  console.log(`Rendering ${TOTAL_FRAMES} frames...`);
  const t0 = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    await page.evaluate(({ f, a }) => window.setFrame(f, a), { f, a: assets });
    await page.screenshot({
      path: join(FRAMES_DIR, `frame-${String(f).padStart(4,"0")}.png`),
      type: "png",
    });
    if (f % 100 === 0) {
      console.log(`  ${((f/TOTAL_FRAMES)*100)|0}%  frame ${f}  ${((Date.now()-t0)/1000).toFixed(1)}s`);
    }
  }
  console.log(`Frames done in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  await browser.close();

  const outFile = join(OUT_DIR, "repeat-ai-short-001-content-day.mp4");
  console.log("Encoding final MP4...");
  execSync([
    "ffmpeg -y",
    `-framerate ${FPS}`,
    `-i "${join(FRAMES_DIR, "frame-%04d.png")}"`,
    `-i "${audioPath}"`,
    "-c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium",
    "-c:a aac -b:a 128k",
    `-t ${DURATION}`,
    "-movflags +faststart -shortest",
    `"${outFile}"`,
  ].join(" "), { stdio: "inherit" });

  // Verify
  const probe = JSON.parse(execSync(
    `ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_name,codec_type -of json "${outFile}"`,
    { encoding: "utf8" }
  ));
  const v = probe.streams.find(s => s.codec_type === "video");
  const au = probe.streams.find(s => s.codec_type === "audio");
  console.log("\n══ Output ══");
  console.log(`  File:     ${outFile}`);
  console.log(`  Duration: ${parseFloat(probe.format.duration).toFixed(2)} s`);
  console.log(`  Video:    ${v.width}×${v.height} ${v.codec_name}`);
  console.log(`  Audio:    ${au ? au.codec_name : "MISSING"}`);
  console.log("═════════════\n");
}

main().catch(e => { console.error("Build failed:", e); process.exit(1); });
