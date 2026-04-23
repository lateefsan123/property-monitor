import { useEffect, useRef, useState } from "react";

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

export const PRICE_PRESETS = [
  { id: "any", label: "Any price", min: null, max: null },
  { id: "under-2m", label: "Under AED 2M", min: 0, max: 2_000_000 },
  { id: "2m-5m", label: "AED 2M – 5M", min: 2_000_000, max: 5_000_000 },
  { id: "5m-10m", label: "AED 5M – 10M", min: 5_000_000, max: 10_000_000 },
  { id: "10m-20m", label: "AED 10M – 20M", min: 10_000_000, max: 20_000_000 },
  { id: "over-20m", label: "Over AED 20M", min: 20_000_000, max: null },
];

export function getPricePreset(id) {
  return PRICE_PRESETS.find((preset) => preset.id === id) || PRICE_PRESETS[0];
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 12 10 17 19 7" />
    </svg>
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
  newOnly,
  setNewOnly,
  trackedStatusFilter,
  setTrackedStatusFilter,
  pricePreset,
  setPricePreset,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    function handleDocClick(event) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) setFiltersOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [filtersOpen]);

  const activeFilterCount =
    (viewTab === "buildings" ? (watchingOnly ? 1 : 0) : 0) +
    (viewTab === "listings" && showTrackedToggle && trackedOnly ? 1 : 0) +
    (viewTab === "listings" && priceChangedOnly ? 1 : 0) +
    (viewTab === "listings" && newOnly ? 1 : 0) +
    (viewTab === "listings" && trackedStatusFilter !== "all" ? 1 : 0) +
    (viewTab === "listings" && pricePreset && pricePreset !== "any" ? 1 : 0);

  return (
    <>
      <div className="filter-menu-wrap la-filter-pill-wrap" ref={wrapRef}>
        <button
          type="button"
          className={`toolbar-pill-btn is-icon${filtersOpen ? " active" : ""}`}
          aria-haspopup="menu"
          aria-expanded={filtersOpen}
          aria-label="Filters"
          title="Filters"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="toolbar-pill-badge">{activeFilterCount}</span>
          )}
        </button>
        {filtersOpen && (
            <div className="sheet-sort-menu" role="menu">
              {viewTab === "buildings" ? (
                <>
                  <div className="sheet-sort-menu-label">Show</div>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={watchingOnly}
                    className={`sheet-sort-item${watchingOnly ? " is-selected" : ""}`}
                    onClick={() => setWatchingOnly(!watchingOnly)}
                  >
                    <span>Watching only</span>
                    {watchingOnly && <CheckIcon />}
                  </button>
                </>
              ) : null}

              {viewTab === "listings" ? (
                <>
                  <div className="sheet-sort-menu-label">Show</div>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={newOnly}
                    className={`sheet-sort-item${newOnly ? " is-selected" : ""}`}
                    onClick={() => setNewOnly(!newOnly)}
                  >
                    <span>New listings only</span>
                    {newOnly && <CheckIcon />}
                  </button>
                  {showTrackedToggle ? (
                    <>
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={trackedOnly}
                        className={`sheet-sort-item${trackedOnly ? " is-selected" : ""}`}
                        onClick={() => setTrackedOnly(!trackedOnly)}
                      >
                        <span>Tracked units only</span>
                        {trackedOnly && <CheckIcon />}
                      </button>
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={priceChangedOnly}
                        className={`sheet-sort-item${priceChangedOnly ? " is-selected" : ""}`}
                        onClick={() => setPriceChangedOnly(!priceChangedOnly)}
                      >
                        <span>Price moves only</span>
                        {priceChangedOnly && <CheckIcon />}
                      </button>
                    </>
                  ) : null}
                  <div className="sheet-sort-divider" />
                  <div className="sheet-sort-menu-label">Status</div>
                  {TRACK_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={trackedStatusFilter === option.id}
                      className={`sheet-sort-item${trackedStatusFilter === option.id ? " is-selected" : ""}`}
                      onClick={() => {
                        setTrackedStatusFilter(option.id);
                        setFiltersOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {trackedStatusFilter === option.id && <CheckIcon />}
                    </button>
                  ))}
                  <div className="sheet-sort-divider" />
                  <div className="sheet-sort-menu-label">Price</div>
                  {PRICE_PRESETS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={(pricePreset || "any") === option.id}
                      className={`sheet-sort-item${(pricePreset || "any") === option.id ? " is-selected" : ""}`}
                      onClick={() => {
                        setPricePreset(option.id);
                        setFiltersOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {(pricePreset || "any") === option.id && <CheckIcon />}
                    </button>
                  ))}
                </>
              ) : null}
          </div>
        )}
      </div>
    </>
  );
}

