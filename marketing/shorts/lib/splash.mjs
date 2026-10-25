// The Repeat launch screen beat (lib/drawn-screens.js "splash") stays short: if the app's first
// beat starts later than ~1 s after the word, the phone shows that beat's first frame, held, in
// between, so the black screen never lingers. Beats must be sorted by `a`.
export function capSplash(beats, max = 1.0) {
  const i = beats.findIndex(b => b.screen && b.screen.kind === "splash");
  if (i < 0) return beats;
  const sp = beats[i], next = beats[i + 1], end = sp.screen.at + max;
  if (!next || sp.b <= end) return beats;
  const hold = { ...next, a: end, b: next.a, rate: 0 };
  delete hold.hl;
  sp.b = end;
  next.cut = true;
  beats.splice(i + 1, 0, hold);
  return beats;
}
