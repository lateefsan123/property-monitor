// Original picture seconds -> revised playback seconds. Shared by picture and sound.
export const SOURCE_DURATION = 73;
export const DURATION = 86;
export const PACING = [
  [0, 0], [3.3, 5.8], [8, 10.5], [15, 18.5], [19.2, 23.2],
  [27.4, 32.5], [32.4, 38], [38.6, 45], [44.4, 52.6],
  [50.8, 59.5], [57, 66.8], [61.2, 72], [65.6, 77.2],
  [69.4, 82], [73, 86],
];
function map(t, from, to) {
  if (t <= 0) return 0;
  for (let i = 1; i < PACING.length; i++) {
    const a = PACING[i - 1], b = PACING[i];
    if (t <= b[from]) return a[to] + (t - a[from]) / (b[from] - a[from]) * (b[to] - a[to]);
  }
  return PACING.at(-1)[to];
}
export const filmTime = (t) => map(t, 0, 1);
export const sourceTime = (t) => map(t, 1, 0);
