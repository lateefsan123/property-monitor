import { useState } from "react";
import { DATA_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants";

const DEFAULT_STATUS = "prospect";
const DEFAULT_DATA = "with_data";

function FilterTabs({ onChange, options, value }) {
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

export default function FiltersToolbar({
  dataFilter,
  onDataFilterChange,
  onSearchTermChange,
  onStatusFilterChange,
  searchTerm,
  statusFilter,
  viewTab,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount =
    (statusFilter !== DEFAULT_STATUS ? 1 : 0) +
    (dataFilter !== DEFAULT_DATA ? 1 : 0);

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <label className="search-pill">
          <svg className="search-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search sellers"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
        </label>

        {viewTab !== "done" && (
          <button
            type="button"
            className={`toolbar-pill-btn${filtersOpen ? " active" : ""}`}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="toolbar-pill-badge">{activeFilterCount}</span>
            )}
          </button>
        )}
      </div>

      {viewTab === "done" ? (
        <div className="toolbar-note">Done shows every sent seller in this source.</div>
      ) : filtersOpen ? (
        <div className="toolbar-actions">
          <FilterTabs options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={onStatusFilterChange} />
          <FilterTabs options={DATA_FILTER_OPTIONS} value={dataFilter} onChange={onDataFilterChange} />
        </div>
      ) : null}
    </div>
  );
}
