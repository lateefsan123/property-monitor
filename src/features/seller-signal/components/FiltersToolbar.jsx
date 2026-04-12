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
  onDataFilterChange,
  onSearchTermChange,
  onStatusFilterChange,
  searchTerm,
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
        <FilterTabs options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={onStatusFilterChange} />
        <FilterTabs options={DATA_FILTER_OPTIONS} value={dataFilter} onChange={onDataFilterChange} />


      </div>
    </div>
  );
}
