export const PRICE_SLIDER_STEP = 100_000;

export const PRICE_SLIDER_MIN = 0;
export const PRICE_SLIDER_MAX = 50_000_000;
export const LISTINGS_PAGE_SIZE = 25;

export const PRICE_PRESETS = [
  { id: "any", label: "Any price", min: null, max: null },
  { id: "under-2m", label: "Under AED 2M", min: 0, max: 2_000_000 },
  { id: "2m-5m", label: "AED 2M - 5M", min: 2_000_000, max: 5_000_000 },
  { id: "5m-10m", label: "AED 5M - 10M", min: 5_000_000, max: 10_000_000 },
  { id: "10m-20m", label: "AED 10M - 20M", min: 10_000_000, max: 20_000_000 },
  { id: "over-20m", label: "Over AED 20M", min: 20_000_000, max: null },
];

export function getPricePreset(id) {
  return PRICE_PRESETS.find((preset) => preset.id === id) || PRICE_PRESETS[0];
}
