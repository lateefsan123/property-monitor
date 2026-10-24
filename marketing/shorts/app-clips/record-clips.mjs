// Records real interaction clips of the Repeat AI mobile app (Expo web film mode on :8083,
// offline demo fixtures) for the shorts. Playwright's virtual clock steps the app exactly 1/30 s
// between full-resolution screenshots, so motion is smooth and text crisp at 1179×2556.
// The same clock pins the demo date to 23 Oct 2026 12:00, matching Short 002.
//
//   node record-clips.mjs [clip …]     → <clip>.mp4 + <clip>.json (taps/events) here
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("D:/Users/Lateef/Documents/property/video/node_modules/playwright-core");
const BROWSER = "C:/Users/lateef/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";
const DIR = fileURLToPath(new URL(".", import.meta.url));
const BASE = "http://127.0.0.1:8083";
const FPS = 30, DT = 1000 / FPS, SCALE = 3;
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

async function openApp() {
  const browser = await chromium.launch({ executablePath: BROWSER });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: SCALE, colorScheme: "dark", hasTouch: true, isMobile: true });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.route("**/*", route => {
    const u = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) || !["http:", "https:"].includes(u.protocol) ? route.continue() : route.abort();
  });
  await page.addInitScript(() => { try { localStorage.setItem("seller-signal-theme", "dark"); } catch {} });
  await page.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.goto(BASE, { waitUntil: "load", timeout: 180000 });
  await page.getByLabel("Open navigation").first().waitFor({ timeout: 180000 });
  await page.addStyleTag({ content: 'input, textarea { outline: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; } svg text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }' });
  await page.waitForTimeout(1500);
  return { browser, page, errors };
}

// A recording: every step advances the app clock one frame and saves a screenshot.
// Playwright's page.screenshot stalls while the virtual clock is paused; DevTools capture doesn't.
function recorder(page, name, cdp) {
  const dir = join(DIR, "frames-raw", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  const taps = [], events = {};
  const t = () => n / FPS;
  async function frame() {
    await page.clock.runFor(DT);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 393, height: 852, scale: SCALE } });
    writeFileSync(join(dir, `${String(++n).padStart(5, "0")}.png`), Buffer.from(data, "base64"));
  }
  const hold = async s => { for (let i = 0; i < Math.round(s * FPS); i++) await frame(); };
  async function until(locator, max = 4) {
    for (let i = 0; i < max * FPS; i++) { if (await locator.isVisible().catch(() => false)) return; await frame(); }
    throw new Error(`${name}: timed out waiting for ${locator}`);
  }
  async function tap(locator, label) {
    await until(locator);
    const b = await locator.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    taps.push({ t: +t().toFixed(3), x: Math.round(x * SCALE), y: Math.round(y * SCALE), label });
    await page.mouse.click(x, y);
    events[`tap:${label}`] = +t().toFixed(3);
    await frame();
  }
  // Smooth real scroll of the nearest scrollable ancestor until `locator` sits at `at` (0–1 of the viewport)
  async function scrollTo(locator, at = 0.5, secs = 1.0) {
    await until(locator);
    const plan = await locator.evaluate((el, at) => {
      let s = el.parentElement;
      while (s && !(s.scrollHeight > s.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
      if (!s) return null;
      const r = el.getBoundingClientRect(), sr = s.getBoundingClientRect();
      const want = s.scrollTop + (r.top + r.height / 2) - (sr.top + sr.height * at);
      const max = s.scrollHeight - s.clientHeight;
      s.dataset.recScroll = "1";
      return { from: s.scrollTop, to: Math.max(0, Math.min(max, want)) };
    }, at);
    if (!plan) return;
    const steps = Math.round(secs * FPS);
    for (let i = 1; i <= steps; i++) {
      const y = plan.from + (plan.to - plan.from) * ease(i / steps);
      await page.evaluate(y => { const s = document.querySelector("[data-rec-scroll='1']"); if (s) s.scrollTop = y; }, y);
      await frame();
    }
    await page.evaluate(() => { const s = document.querySelector("[data-rec-scroll='1']"); if (s) delete s.dataset.recScroll; });
  }
  const mark = label => { events[label] = +t().toFixed(3); };
  async function save() {
    const mp4 = join(DIR, `${name}.mp4`);
    writeFileSync(join(DIR, `${name}.json`), JSON.stringify({ clip: name, fps: FPS, frames: n, duration: +t().toFixed(3), pixels: [1179, 2556], encodedPixels: [1180, 2556], demoClock: "2026-10-23T12:00:00Z", taps, events }, null, 1));
    execSync(`ffmpeg -y -v error -framerate ${FPS} -i "${join(dir, "%05d.png")}" -vf pad=1180:2556 -c:v libx264 -preset slow -crf 14 -g 1 -pix_fmt yuv420p "${mp4}"`);
    console.log(`${name}: ${n} frames, ${t().toFixed(2)} s, taps ${taps.map(x => x.label).join(", ")}`);
  }
  return { frame, hold, until, tap, scrollTo, mark, save };
}

const grow = page => page.evaluate(() => document.querySelectorAll("textarea").forEach(a => { a.style.height = "auto"; a.style.height = `${a.scrollHeight}px`; }));

async function nav(page, label) {
  await page.getByLabel("Open navigation").first().click();
  await page.clock.runFor(600);
  await page.getByLabel(label, { exact: true }).last().click();
  await page.clock.runFor(900);
}

const CLIPS = {
  // Short 002
  async "oliver-sheet-sales"(page, r) {
    await nav(page, "Sellers");
    await r.hold(1.0); r.mark("start");
    await r.tap(page.getByText("Oliver Grant", { exact: true }).first(), "oliver");
    await r.hold(0.9); r.mark("sheet-open");
    await r.scrollTo(page.getByText("Sales in Burj Khalifa", { exact: true }), 0.62, 1.3);
    r.mark("sales-visible");
    await r.hold(1.6);
  },
  async "oliver-message-tab"(page, r) {
    await nav(page, "Sellers");
    await page.getByText("Oliver Grant", { exact: true }).first().click();
    await page.clock.runFor(1200);
    await r.hold(0.8); r.mark("start");
    await r.tap(page.getByRole("tab", { name: "Message", exact: true }), "message-tab");
    await r.hold(0.3); await grow(page);
    await r.hold(0.3);
    await r.scrollTo(page.getByLabel("Seller message", { exact: true }), 0.55, 1.1);
    r.mark("message-visible");
    await r.hold(2.0);
  },
  async "automations-transaction"(page, r) {
    await nav(page, "Settings");
    await r.hold(0.6); r.mark("start");
    await r.tap(page.getByText("Automations", { exact: true }).last(), "automations");
    await r.hold(0.8); r.mark("automations-open");
    await r.hold(1.6);
  },
  // Short 003: the sending window and spacing, then the real hours picker
  async "automations-window"(page, r) {
    await nav(page, "Settings");
    await page.getByText("Automations", { exact: true }).last().click();
    await page.clock.runFor(1200);
    await r.hold(0.8); r.mark("start");
    await r.scrollTo(page.getByText("Space messages", { exact: true }), 0.42, 1.4);
    r.mark("window-visible");
    await r.hold(1.6);
    await r.tap(page.getByText("Send between", { exact: true }).first(), "send-between");
    await r.hold(0.9); r.mark("picker-open");
    await r.scrollTo(page.getByText("9 am", { exact: true }).last(), 0.5, 0.9);
    r.mark("picker-9am");
    await r.hold(0.5);
    await r.scrollTo(page.getByText("9 pm", { exact: true }).last(), 0.5, 0.9);
    r.mark("picker-9pm");
    await r.hold(1.6);
  },
  // Short 004: Home → Due today list → Scheduled
  async "home-due-today"(page, r) {
    await nav(page, "Home");
    await r.hold(1.0); r.mark("home");
    await r.tap(page.getByText("View sellers", { exact: true }).last(), "view-sellers");
    await r.hold(1.0); r.mark("due-list");
    await r.scrollTo(page.getByText("Yusuf Rahman", { exact: true }).first(), 0.55, 1.4);
    await r.hold(0.8); r.mark("due-scrolled");
    await r.tap(page.getByText(/^Scheduled/).last(), "scheduled-tab");
    await r.hold(0.8); r.mark("scheduled");
    await r.hold(1.4);
  },
  // Short 005: Maya Cohen (For Sale) → her status → her For Sale message
  async "maya-for-sale"(page, r) {
    await nav(page, "Sellers");
    await r.hold(0.8); r.mark("start");
    const maya = page.getByText("Maya Cohen", { exact: true }).first();
    await r.scrollTo(maya, 0.35, 1.0);
    await r.hold(0.3);
    await r.tap(maya, "maya");
    await r.hold(0.9); r.mark("sheet-open");
    await r.scrollTo(page.getByText("Status", { exact: true }).last(), 0.6, 0.8);
    r.mark("status-visible");
    await r.hold(1.4);
    await r.tap(page.getByRole("tab", { name: "Message", exact: true }), "message-tab");
    await r.hold(0.3); await grow(page);
    await r.hold(0.3);
    await r.scrollTo(page.getByLabel("Seller message", { exact: true }), 0.55, 1.0);
    r.mark("message-visible");
    await r.hold(2.0);
  },
  // Short 006: Elena Petrova → Set follow-up → 30 days → Save → Scheduled
  async "elena-follow-up"(page, r) {
    await nav(page, "Sellers");
    await r.hold(0.8); r.mark("start");
    await r.tap(page.getByText("Elena Petrova", { exact: true }).first(), "elena");
    await r.hold(0.9); r.mark("sheet-open");
    await r.scrollTo(page.getByText("Set follow-up", { exact: true }).last(), 0.6, 0.8);
    r.mark("follow-up-visible");
    await r.hold(0.6);
    await r.tap(page.getByText("Set follow-up", { exact: true }).last(), "set-follow-up");
    await r.hold(0.9); r.mark("sheet-follow-up");
    await r.tap(page.getByText("30 days", { exact: true }).last(), "30-days");
    await r.hold(0.4); r.mark("30-selected");
    await r.hold(1.2);
    await r.tap(page.getByText("Save follow-up", { exact: true }).last(), "save");
    await r.hold(1.0); r.mark("saved");
    await r.scrollTo(page.getByText(/^Scheduled for/).last(), 0.55, 0.6);
    r.mark("scheduled-visible");
    await r.hold(1.6);
  },
  // Short 001
  async "composer-manual"(page, r) {
    await nav(page, "Sellers");
    await page.getByText("Oliver Grant", { exact: true }).first().click();
    await page.clock.runFor(1200);
    await page.getByRole("tab", { name: "Message", exact: true }).click();
    await page.clock.runFor(900); await grow(page);
    await r.hold(0.6); r.mark("start");
    await r.scrollTo(page.getByText("Send via WhatsApp", { exact: true }), 0.85, 1.0);
    r.mark("composer-visible");
    await r.hold(1.8);
  },
  async "template-appraisal"(page, r) {
    await nav(page, "Message template");
    await r.hold(0.8); r.mark("start");
    await r.tap(page.getByLabel("Edit Appraisal follow-up", { exact: true }).last(), "edit-appraisal");
    await r.hold(0.5); await grow(page);
    await r.hold(0.7); r.mark("editor-open");
    await r.tap(page.getByText("Preview").last(), "preview");
    await r.hold(0.4); await grow(page);
    await r.hold(1.6); r.mark("preview-settled");
    await r.hold(0.8);
  },
  async "template-use-for"(page, r) {
    await nav(page, "Message template");
    await page.getByLabel("Edit Appraisal follow-up", { exact: true }).last().click();
    await page.clock.runFor(1400); await grow(page);
    await r.hold(0.8); r.mark("start");
    await r.tap(page.getByLabel("Use for seller statuses", { exact: true }).last(), "use-for");
    await r.hold(1.0); r.mark("use-for-open");
    const sw = page.getByLabel("Use for Appraisal", { exact: true }).last();
    const on = await sw.getAttribute("aria-checked").catch(() => null);
    if (on === "true") { await r.tap(sw, "appraisal-off"); await r.hold(0.6); }
    await r.tap(sw, "appraisal-on");
    await r.hold(0.5); r.mark("appraisal-on");
    await r.hold(1.8);
  },
  async "automations-status"(page, r) {
    await nav(page, "Settings");
    await page.getByText("Automations", { exact: true }).last().click();
    await page.clock.runFor(1200);
    await r.hold(0.6); r.mark("start");
    await r.scrollTo(page.getByText("Status follow-ups", { exact: true }), 0.45, 0.9);
    await r.hold(0.4);
    const row = page.getByText("Status follow-ups", { exact: true }).locator("xpath=ancestor::*[.//*[@role='switch']][1]");
    await r.tap(row.getByRole("switch").first(), "status-switch");
    await r.hold(0.5); r.mark("switched-on");
    await r.hold(2.4);
  },
  async "whatsapp-connected"(page, r) {
    await nav(page, "Settings");
    await r.hold(0.6); r.mark("start");
    await r.tap(page.getByText("WhatsApp", { exact: true }).last(), "whatsapp");
    await r.hold(0.8); r.mark("connected");
    await r.hold(1.8);
  },
  async "send-activity"(page, r) {
    await nav(page, "Settings");
    await r.hold(0.6); r.mark("start");
    await r.tap(page.getByText("Send activity", { exact: true }).last(), "send-activity");
    await r.hold(0.8); r.mark("activity-open");
    await r.hold(2.4);
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
for (const name of wanted) {
  const { browser, page, errors } = await openApp();
  try {
    await page.clock.pauseAt(new Date("2026-10-23T12:00:10Z"));
    const cdp = await page.context().newCDPSession(page);
    const r = recorder(page, name, cdp);
    await CLIPS[name](page, r);
    await r.save();
    if (errors.length) console.log(`  page errors: ${errors.length} (first: ${errors[0].slice(0, 120)})`);
  } catch (e) {
    console.log(`FAILED ${name}: ${e.message.split("\n")[0]}`);
    await page.context().newCDPSession(page).then(c => c.send("Page.captureScreenshot", { format: "png" })).then(r => writeFileSync(join(DIR, `failed-${name}.png`), Buffer.from(r.data, "base64"))).catch(() => {});
  } finally { await browser.close(); }
}
