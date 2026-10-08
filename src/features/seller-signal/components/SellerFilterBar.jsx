import { useEffect, useMemo, useRef, useState } from "react";
import { IconAdjustmentsHorizontal, IconCheck, IconChevronDown, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { STATUS_FILTER_OPTIONS } from "../constants";
import { createCustomSellerView, findMatchingSellerView, getSellerViewFilters, readCustomSellerViews, writeCustomSellerViews } from "../saved-views";
import { normalizeStatusFilter, toggleStatusFilterValue } from "../status-filter-utils";

// Filter bar modelled on Deel's People table (Mobbin fd251a0e): a rounded
// panel holding a search field and outlined dropdown pills.
function Pill({ label, count, active, open, onToggle, children, align }) {
  return (
    <div className="seller-pill-wrap">
      <button type="button" className={`seller-filter-pill${active ? " is-active" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        <span>{label}</span>
        {count ? <span className="seller-pill-count">{count}</span> : null}
        <IconChevronDown size={15} stroke={2} aria-hidden="true" />
      </button>
      {open && <div className={`seller-pill-menu${align === "end" ? " is-end" : ""}`} role="menu">{children}</div>}
    </div>
  );
}

function Option({ selected, onSelect, children }) {
  return (
    <button type="button" role="menuitemcheckbox" aria-checked={selected} className={`seller-pill-option${selected ? " is-selected" : ""}`} onClick={onSelect}>
      <span>{children}</span>
      {selected && <IconCheck size={15} stroke={2.4} aria-hidden="true" />}
    </button>
  );
}

const NO_BUILDINGS = [];

// Buildings with seller counts, searchable, several at once. Long lists show
// the first 100 matches; search narrows them.
function BuildingMenu({ options, selected, onChange }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  const chosen = new Set(selected);
  const toggle = (key) => onChange(chosen.has(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  return (
    <div className="seller-building-menu">
      <label className="seller-building-search">
        <IconSearch size={15} stroke={2} aria-hidden="true" />
        <input type="search" autoFocus placeholder={`Search ${options.length.toLocaleString()} buildings`} aria-label="Search buildings" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Option selected={!selected.length} onSelect={() => onChange([])}>All buildings</Option>
      <div className="seller-building-list">
        {matches.slice(0, 100).map((option) => (
          <Option key={option.key} selected={chosen.has(option.key)} onSelect={() => toggle(option.key)}>
            {option.label}<small className="seller-building-count">{option.count.toLocaleString()}</small>
          </Option>
        ))}
        {!matches.length && <p className="seller-pill-empty">No buildings match.</p>}
        {matches.length > 100 && <p className="seller-pill-empty">{(matches.length - 100).toLocaleString()} more. Search to find them.</p>}
      </div>
    </div>
  );
}

export default function SellerFilterBar({ dashboard, userId }) {
  const d = dashboard;
  const [open, setOpen] = useState(null);
  const [views, setViews] = useState(() => readCustomSellerViews(userId));
  const wrap = useRef(null);
  useEffect(() => { setViews(readCustomSellerViews(userId)); }, [userId]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!wrap.current?.contains(event.target)) setOpen(null); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const statuses = normalizeStatusFilter(d.statusFilter);
  const sources = [{ id: "all", label: "All spreadsheets" }, ...(d.sourceOptions || [])];
  const buildingFilter = d.buildingFilter || NO_BUILDINGS;
  const buildingOptions = d.buildingOptions || NO_BUILDINGS;
  const filters = useMemo(() => getSellerViewFilters({ buildingFilter, dataFilter: d.dataFilter, dataQualityFilter: d.dataQualityFilter, searchTerm: d.searchTerm, sourceFilter: d.sourceFilter, statusFilter: d.statusFilter, viewTab: d.viewTab }),
    [buildingFilter, d.dataFilter, d.dataQualityFilter, d.searchTerm, d.sourceFilter, d.statusFilter, d.viewTab]);
  const activeView = findMatchingSellerView(views, filters);
  const activeCount = [statuses.length > 0, d.sourceFilter !== "all", buildingFilter.length > 0, d.dataFilter !== "all", d.dataQualityFilter !== "all"].filter(Boolean).length;
  const buildingLabel = buildingFilter.length === 1
    ? buildingOptions.find((option) => option.key === buildingFilter[0])?.label || "Building"
    : "Building";
  const toggle = (id) => setOpen((value) => (value === id ? null : id));
  const alpha = d.sortOption?.field === "alpha";

  function saveViews(next) { setViews(next); writeCustomSellerViews(userId, next); }
  function applyView(view) {
    d.actions.selectSourceFilter(view.filters.sourceFilter || "all");
    d.actions.selectBuildingFilter?.(view.filters.buildingFilter || []);
    d.actions.selectViewTab(view.filters.viewTab);
    d.actions.selectStatusFilter(view.filters.statusFilter);
    d.actions.selectDataFilter(view.filters.dataFilter);
    d.actions.selectDataQualityFilter(view.filters.dataQualityFilter);
    d.actions.updateSearchTerm(view.filters.searchTerm);
    setOpen(null);
  }
  function clearAll() {
    d.actions.selectStatusFilter([]);
    d.actions.selectSourceFilter("all");
    d.actions.selectBuildingFilter?.([]);
    d.actions.selectDataFilter("all");
    d.actions.selectDataQualityFilter("all");
  }

  return (
    <div className="seller-filter-bar" ref={wrap}>
      <label className="seller-search-pill">
        <IconSearch size={18} stroke={2} aria-hidden="true" />
        <input type="search" placeholder="Search sellers" aria-label="Search sellers" value={d.searchTerm} onChange={(event) => d.actions.updateSearchTerm(event.target.value)} />
        {d.searchTerm && <button type="button" className="seller-search-clear" aria-label="Clear seller search" onClick={() => d.actions.updateSearchTerm("")}><IconX size={15} stroke={2} aria-hidden="true" /></button>}
      </label>
      <button type="button" className={`seller-filter-pill seller-filter-icon${activeCount ? " is-active" : ""}`} aria-label={activeCount ? `Clear ${activeCount} filters` : "No filters applied"} disabled={!activeCount} onClick={clearAll} title={activeCount ? "Clear filters" : undefined}>
        <IconAdjustmentsHorizontal size={18} stroke={1.8} aria-hidden="true" />
        {activeCount ? <span className="seller-pill-count">{activeCount}</span> : null}
      </button>
      <Pill label="Status" count={statuses.length} active={statuses.length > 0} open={open === "status"} onToggle={() => toggle("status")}>
        <Option selected={!statuses.length} onSelect={() => d.actions.selectStatusFilter([])}>All statuses</Option>
        {STATUS_FILTER_OPTIONS.map((option) => (
          <Option key={option.id} selected={statuses.includes(option.id)} onSelect={() => d.actions.selectStatusFilter(toggleStatusFilterValue(d.statusFilter, option.id))}>{option.label}</Option>
        ))}
      </Pill>
      {sources.length > 1 && (
        <Pill label={d.sourceFilter === "all" ? "Spreadsheet" : sources.find((option) => option.id === d.sourceFilter)?.label || "Spreadsheet"} active={d.sourceFilter !== "all"} open={open === "source"} onToggle={() => toggle("source")}>
          {sources.map((option) => <Option key={option.id} selected={d.sourceFilter === option.id} onSelect={() => { d.actions.selectSourceFilter(option.id); setOpen(null); }}>{option.label}</Option>)}
        </Pill>
      )}
      {buildingOptions.length > 1 && (
        <Pill label={buildingLabel} count={buildingFilter.length > 1 ? buildingFilter.length : 0} active={buildingFilter.length > 0} open={open === "building"} onToggle={() => toggle("building")}>
          <BuildingMenu options={buildingOptions} selected={buildingFilter} onChange={(next) => d.actions.selectBuildingFilter(next)} />
        </Pill>
      )}
      <Pill label="Market data" active={d.dataFilter !== "all"} open={open === "market"} onToggle={() => toggle("market")}>
        {[["all", "Any"], ["with_data", "Available"], ["no_data", "Unavailable"]].map(([id, label]) => (
          <Option key={id} selected={d.dataFilter === id} onSelect={() => { d.actions.selectDataFilter(id); setOpen(null); }}>{label}</Option>
        ))}
      </Pill>
      <Pill label="Data quality" active={d.dataQualityFilter !== "all"} open={open === "quality"} onToggle={() => toggle("quality")}>
        {[["all", "Any"], ["trusted", "Complete"], ["partial", "Missing info"], ["review", "Needs review"]].map(([id, label]) => (
          <Option key={id} selected={d.dataQualityFilter === id} onSelect={() => { d.actions.selectDataQualityFilter(id); setOpen(null); }}>{label}</Option>
        ))}
      </Pill>
      <span className="seller-filter-spacer" />
      <Pill label={activeView?.label || "Saved views"} active={Boolean(activeView)} open={open === "views"} onToggle={() => toggle("views")} align="end">
        {views.map((view) => (
          <div key={view.id} className="seller-view-option">
            <Option selected={activeView?.id === view.id} onSelect={() => applyView(view)}>{view.label}</Option>
            <button type="button" className="seller-view-delete" aria-label={`Delete saved view ${view.label}`} onClick={() => saveViews(views.filter((item) => item.id !== view.id))}><IconTrash size={14} stroke={1.8} aria-hidden="true" /></button>
          </div>
        ))}
        {!views.length && <p className="seller-pill-empty">No saved views yet.</p>}
        <button type="button" className="seller-pill-option seller-pill-save" onClick={() => {
          const label = window.prompt("Name this view");
          if (label?.trim()) saveViews([createCustomSellerView(label, filters), ...views].slice(0, 12));
          setOpen(null);
        }}>Save current view</button>
      </Pill>
      <Pill label={alpha ? "Name A-Z" : "Default order"} open={open === "sort"} onToggle={() => toggle("sort")} align="end">
        <Option selected={!alpha} onSelect={() => { d.setSortOption({ field: "added", direction: "desc" }); setOpen(null); }}>Default order</Option>
        <Option selected={alpha} onSelect={() => { d.setSortOption({ field: "alpha", direction: "asc" }); setOpen(null); }}>Name A-Z</Option>
      </Pill>
    </div>
  );
}
