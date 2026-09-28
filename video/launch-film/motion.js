// Pure functions of time, so window.seek(t) can paint any frame on demand.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;

// Closed-form damped spring from 0 to 1 (k stiffness, d damping).
export function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// A value with several targets: one spring per change, keeps motion continuous.
// keys: [[time, value], ...] sorted by time.
export function track(t, keys, k = 170, d = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i += 1) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}

// Presets: snappy UI, default cards/camera, heavy type.
export const UI = [320, 30];
export const CARD = [170, 26];
export const HEAVY = [120, 22];

// 120 BPM beat grid.
export const BPM = 120;
export const BEAT = 60 / BPM;
export const beat = (n) => n * BEAT;
