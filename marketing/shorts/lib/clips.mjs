// Extract recorded app clips (marketing/shorts/app-clips/<name>.mp4) to JPEG frames once,
// and load their tap events, for lib/app-phone.js.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHORTS = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const CLIPS = join(SHORTS, "app-clips");
const CACHE = join(CLIPS, "frames");

// Returns { name: { dir (relative to fromDir, for the page), frames, fps, taps, events } }
export function loadClips(names, fromDir) {
  const out = {};
  for (const name of new Set(names)) {
    const mp4 = join(CLIPS, `${name}.mp4`);
    if (!existsSync(mp4)) throw new Error(`missing app clip ${mp4}`);
    const dir = join(CACHE, name);
    const stamp = join(dir, ".source-size");
    const size = String(readFileSync(mp4).length);
    if (!existsSync(stamp) || readFileSync(stamp, "utf8") !== size) {
      mkdirSync(dir, { recursive: true });
      for (const f of readdirSync(dir)) if (f.endsWith(".jpg")) execSync(`rm -f "${join(dir, f)}"`);
      execSync(`ffmpeg -y -v error -i "${mp4}" -vf fps=30 -q:v 2 "${join(dir, "%05d.jpg")}"`);
      execSync(`node -e "require('fs').writeFileSync(process.argv[1], process.argv[2])" "${stamp}" "${size}"`);
    }
    const frames = readdirSync(dir).filter(f => f.endsWith(".jpg")).length;
    const metaPath = join(CLIPS, `${name}.json`);
    const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
    out[name] = {
      dir: relative(fromDir, dir).replace(/\\/g, "/"),
      frames, fps: 30,
      taps: (meta.taps || []).map(x => ({ t: x.t ?? x.time, x: x.x, y: x.y })),
      events: meta.events || meta,
    };
  }
  return out;
}
