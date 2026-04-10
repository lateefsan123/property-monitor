import { DATA_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants";

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
  isAllExpanded,
  onDataFilterChange,
  onSearchTermChange,
  onSourceFilterChange,
  onStatusFilterChange,
  onToggleAllExpanded,
  onToggleDueOnly,
  searchTerm,
  showDueOnly,
  sourceFilter,
  sourceOptions,
  statusFilter,
}) {
  return (
    <div className="toolbar">
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
      />

      <div className="toolbar-actions">
        {sourceOptions?.length ? (
          <div className="toolbar-group">
            <span className="toolbar-label">Spreadsheet</span>
            <select
              className="toolbar-select"
              value={sourceFilter}
              onChange={(event) => onSourceFilterChange(event.target.value)}
            >
              <option value="all">All spreadsheets</option>
              {sourceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <FilterTabs options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={onStatusFilterChange} />
        <FilterTabs options={DATA_FILTER_OPTIONS} value={dataFilter} onChange={onDataFilterChange} />

        <label className="toggle">
          <input
            type="checkbox"
            checked={showDueOnly}
            onChange={(event) => onToggleDueOnly(event.target.checked)}
          />
          Due only
        </label>

        <button type="button" className="btn-sm" onClick={onToggleAllExpanded}>
          {isAllExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>
    </div>
  );
}
