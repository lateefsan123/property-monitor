import { useEffect, useRef, useState } from "react";
import { IconCheck, IconFilter } from "@tabler/icons-react";
import { PRICE_PRESETS } from "../filter-options";

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
  { id: "price-drops", label: "Price drops" },
];

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
        <IconFilter size={18} stroke={2} aria-hidden="true" />
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
                {watchingOnly && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
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
                {newOnly && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
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
                    {trackedOnly && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={priceChangedOnly}
                    className={`sheet-sort-item${priceChangedOnly ? " is-selected" : ""}`}
                    onClick={() => setPriceChangedOnly(!priceChangedOnly)}
                  >
                    <span>Price moves only</span>
                    {priceChangedOnly && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
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
                  {trackedStatusFilter === option.id && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
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
                  {(pricePreset || "any") === option.id && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
                </button>
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
