// Repeat, the broker fox: one geometric drawing on a 100 × 100 grid that the
// web and mobile components both render, so the fox looks the same everywhere.
export const FOX_COLORS = {
  fur: "#E8733A",
  cream: "#F7EFE6",
  ink: "#1C1D21",
  shirt: "#FFFFFF",
  tie: "#1D9E75",
  suit: "#2B2D33",
};

// Ears, inner ears, face, cheeks and nose, drawn in this order.
export const FOX_HEAD = [
  { points: "20,38 27,9 44,31", fill: "fur" },
  { points: "80,38 73,9 56,31", fill: "fur" },
  { points: "26,31 28.5,17 37,29", fill: "ink" },
  { points: "74,31 71.5,17 63,29", fill: "ink" },
  { points: "16,38 44,31 56,31 84,38 50,78", fill: "fur" },
  { points: "22,42 40,54 47,71", fill: "cream" },
  { points: "78,42 60,54 53,71", fill: "cream" },
  { points: "45,69 55,69 50,78", fill: "ink" },
];

export const FOX_EYES = [
  { cx: 38, cy: 47, r: 3.2 },
  { cx: 62, cy: 47, r: 3.2 },
];

export const FOX_SUIT = "M12 100C12 88 24 81 38 79.5H62C76 81 88 88 88 100Z";

// White shirt and green tie inside the jacket's V.
export const FOX_COLLAR = [
  { points: "40,79.5 60,79.5 50,93", fill: "shirt" },
  { points: "47.5,80 52.5,80 51.5,84 48.5,84", fill: "tie" },
  { points: "48.5,84 51.5,84 53.5,93 50,97 46.5,93", fill: "tie" },
];

// The head tilts and nods around the chin.
export const FOX_CHIN = { x: 50, y: 78 };
