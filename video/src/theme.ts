export const theme = {
  bg: "#FFFFFF",
  ink: "#0A0A0A",
  muted: "#8A8A8D",
  hairline: "#EDEDED",
  soft: "#F5F5F5",
  accents: {
    home: "#2B6CB0",
    sellers: "#4F46E5",
    listings: "#E11D48",
    spreadsheets: "#059669",
  },
} as const;

export const type = {
  display: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontWeight: 600,
    letterSpacing: "-0.035em",
  },
  displayLight: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontWeight: 500,
    letterSpacing: "-0.03em",
  },
  body: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  mono: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontWeight: 500,
    letterSpacing: "0",
  },
} as const;
