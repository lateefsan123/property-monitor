export const PRICE_SLIDER_STEP = 100_000;
const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
  { id: "price-drops", label: "Price drops" },
];

export const PRICE_SLIDER_MIN = 0;
export const PRICE_SLIDER_MAX = 50_000_000;
export const LISTINGS_PAGE_SIZE = 25;

function FilterTabs({ options, value, onChange }) {
  return (
    <div className="tabs">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`tab${value === option.id ? " active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function formatSliderPrice(value) {
  if (!Number.isFinite(value) || value <= 0) return "Any";
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  return `AED ${Math.round(value / 1_000)}k`;
}

function PriceRangeSlider({ min, max, valueMin, valueMax, onMinChange, onMaxChange }) {
  const safeMin = Number.isFinite(min) ? min : PRICE_SLIDER_MIN;
  const safeMax = Number.isFinite(max) ? max : PRICE_SLIDER_MAX;

  return (
    <div className="la-price-slider">
      <div className="la-price-slider-header">
        <span>{formatSliderPrice(valueMin)}</span>
        <span>{formatSliderPrice(valueMax)}</span>
      </div>
      <div className="la-price-slider-inputs">
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={PRICE_SLIDER_STEP}
          value={Math.min(valueMin, valueMax)}
          onChange={(event) => onMinChange(Number(event.target.value))}
        />
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={PRICE_SLIDER_STEP}
          value={Math.max(valueMin, valueMax)}
          onChange={(event) => onMaxChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

export default function ListingAlertsFilters({
  viewTab,
  watchingOnly,
  setWatchingOnly,
  trackedOnly,
  setTrackedOnly,
  showTrackedToggle,
  priceChangedOnly,
  setPriceChangedOnly,
  trackedStatusFilter,
  setTrackedStatusFilter,
  priceMin,
  priceMax,
  priceRangeMin,
  priceRangeMax,
  onPriceMinChange,
  onPriceMaxChange,
}) {
  return (
    <div className="toolbar la-filters">
      <div className="toolbar-actions">
        {viewTab === "buildings" ? (
          <label className="toggle">
            <input
              type="checkbox"
              checked={watchingOnly}
              onChange={(event) => setWatchingOnly(event.target.checked)}
            />
            Watching only
          </label>
        ) : null}

        {viewTab === "listings" && showTrackedToggle ? (
          <>
            <label className="toggle">
              <input
                type="checkbox"
                checked={trackedOnly}
                onChange={(event) => setTrackedOnly(event.target.checked)}
              />
              Tracked units only
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={priceChangedOnly}
                onChange={(event) => setPriceChangedOnly(event.target.checked)}
              />
              Price moves only
            </label>
          </>
        ) : null}
      </div>

      {viewTab === "listings" ? (
        <div className="toolbar-actions la-filter-groups">
          <FilterTabs
            options={TRACK_STATUS_OPTIONS}
            value={trackedStatusFilter}
            onChange={setTrackedStatusFilter}
          />

          <PriceRangeSlider
            min={priceRangeMin}
            max={priceRangeMax}
            valueMin={priceMin}
            valueMax={priceMax}
            onMinChange={onPriceMinChange}
            onMaxChange={onPriceMaxChange}
          />
        </div>
      ) : null}
    </div>
  );
}
