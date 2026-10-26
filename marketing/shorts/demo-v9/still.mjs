// Render single stills of short.html for checking: node still.mjs 1.0 5.2 ...
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("D:/Users/Lateef/Documents/property/video/node_modules/playwright-core");
const DIR = fileURLToPath(new URL(".", import.meta.url));
const BROWSER = "C:/Users/lateef/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe";

const times = process.argv.slice(2).map(Number);
mkdirSync(join(DIR, "frames"), { recursive: true });
const tlPath = join(DIR, "timeline.json");
const tl = existsSync(tlPath) ? JSON.parse(readFileSync(tlPath, "utf8")) : null;

const browser = await chromium.launch({ executablePath: BROWSER, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
if (tl) await page.addInitScript(t => { window.TL = t; }, tl);
await page.goto("file:///" + join(DIR, "short.html").replace(/\\/g, "/"));
await page.evaluate(() => window.ready);
for (const t of times) {
  await page.evaluate(t => window.setTime(t), t);
  await page.screenshot({ path: join(DIR, "frames", `still-${t.toFixed(2)}.png`) });
}
await browser.close();
