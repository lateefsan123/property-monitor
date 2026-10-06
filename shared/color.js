// Colour maths for the status colour picker (web and mobile): hex <-> HSV.
// h is 0-360, s and v are 0-1.

export function normalizeHex(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  const full = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  return /^[0-9a-fA-F]{6}$/.test(full) ? `#${full.toLowerCase()}` : null;
}

export function hexToHsv(hex) {
  const clean = normalizeHex(hex) || "#3b82f6";
  const r = parseInt(clean.slice(1, 3), 16) / 255;
  const g = parseInt(clean.slice(3, 5), 16) / 255;
  const b = parseInt(clean.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? delta / max : 0, v: max };
}

export function hsvToHex({ h, s, v }) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, Number(s)));
  const val = Math.min(1, Math.max(0, Number(v)));
  const chroma = val * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - chroma;
  const [r, g, b] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x]
    : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  const hex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// The pure hue at full saturation and brightness, for the picker's square.
export function hueToHex(h) {
  return hsvToHex({ h, s: 1, v: 1 });
}
