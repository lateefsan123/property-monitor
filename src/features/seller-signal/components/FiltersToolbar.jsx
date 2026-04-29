import { useEffect, useRef, useState } from "react";
import { DATA_FILTER_OPTIONS, DATA_QUALITY_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants";

const DEFAULT_STATUS = "prospect";
const DEFAULT_DATA = "with_data";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

export default function FiltersToolbar({
  dataFilter,
  dataQualityFilter,
  onDataFilterChange,
  onDataQualityFilterChange,
  onSearchTermChange,
  onStatusFilterChange,
  searchTerm,
  statusFilter,
  viewTab,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const wrapRef = useRef(null);

  const activeFilterCount =
    (statusFilter !== DEFAULT_STATUS ? 1 : 0) +
    (dataFilter !== DEFAULT_DATA ? 1 : 0) +
    (dataQualityFilter !== "all" ? 1 : 0);

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

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <label className="search-pill">
          <input
            type="text"
            placeholder="Search sellers"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
          <svg className="search-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </label>

        {viewTab !== "done" && (
          <div className="filter-menu-wrap" ref={wrapRef}>
            <button
              type="button"
              className={`toolbar-pill-btn${filtersOpen ? " active" : ""}`}
              aria-haspopup="menu"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              <span className="toolbar-pill-label">Filters</span>
              {activeFilterCount > 0 && (
                <span className="toolbar-pill-badge">{activeFilterCount}</span>
              )}
            </button>
            {filtersOpen && (
              <div className="sheet-sort-menu" role="menu">
                <div className="sheet-sort-menu-label">Status</div>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={statusFilter === option.id}
                    className={`sheet-sort-item${statusFilter === option.id ? " is-selected" : ""}`}
                    onClick={() => {
                      onStatusFilterChange(option.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {statusFilter === option.id && <CheckIcon />}
                  </button>
                ))}
                <div className="sheet-sort-divider" />
                <div className="sheet-sort-menu-label">Data</div>
                {DATA_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={dataFilter === option.id}
                    className={`sheet-sort-item${dataFilter === option.id ? " is-selected" : ""}`}
                    onClick={() => {
                      onDataFilterChange(option.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {dataFilter === option.id && <CheckIcon />}
                  </button>
                ))}
                <div className="sheet-sort-divider" />
                <div className="sheet-sort-menu-label">Data quality</div>
                {DATA_QUALITY_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={dataQualityFilter === option.id}
                    className={`sheet-sort-item${dataQualityFilter === option.id ? " is-selected" : ""}`}
                    onClick={() => {
                      onDataQualityFilterChange(option.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {dataQualityFilter === option.id && <CheckIcon />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {viewTab === "done" && (
        <div className="toolbar-note">Done shows every sent seller in this source.</div>
      )}
    </div>
  );
}
