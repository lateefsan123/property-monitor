import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconList,
  IconSearch,
  IconTable,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { VIEW_TAB_OPTIONS } from "../constants";
import {
  createCustomSellerView,
  findMatchingSellerView,
  getSellerViewFilters,
  readCustomSellerViews,
  writeCustomSellerViews,
} from "../saved-views";
import { normalizeStatusFilter, toggleStatusFilterValue } from "../status-filter-utils";

const QUICK_FILTER_GROUPS = [
  {
    id: "pipeline",
    label: "Pipeline filters",
    filters: [
      { id: "prospect", label: "Prospects", kind: "status" },
      { id: "market_appraisal", label: "Appraisals", kind: "status" },
      { id: "for_sale_available", label: "For sale", kind: "status" },
    ],
  },
  {
    id: "data",
    label: "Data filters",
    filters: [
      { id: "review", label: "Needs review", kind: "quality" },
      { id: "with_data", label: "Has market data", kind: "market" },
    ],
  },
];

const QUICK_FILTERS = QUICK_FILTER_GROUPS.flatMap((group) => group.filters);

function ViewTabIcon({ id }) {
  return id === "done"
    ? <IconCheck size={16} stroke={2.1} aria-hidden="true" />
    : <IconList size={16} stroke={1.9} aria-hidden="true" />;
}

export default function FiltersToolbar({
  dataFilter,
  dataQualityFilter,
  onDataFilterChange,
  onDataQualityFilterChange,
  onSearchTermChange,
  onSourceFilterChange,
  onStatusFilterChange,
  onViewTabChange,
  searchTerm,
  sourceFilter,
  statusFilter,
  userId,
  viewTab,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [customViews, setCustomViews] = useState(() => readCustomSellerViews(userId));
  const viewWrapRef = useRef(null);

  const currentFilters = useMemo(
    () => getSellerViewFilters({ dataFilter, dataQualityFilter, searchTerm, sourceFilter, statusFilter, viewTab }),
    [dataFilter, dataQualityFilter, searchTerm, sourceFilter, statusFilter, viewTab],
  );

  const activeView = findMatchingSellerView(customViews, currentFilters);
  const activeStatusIds = useMemo(() => normalizeStatusFilter(statusFilter), [statusFilter]);
  const hasQuickFilters = activeStatusIds.length > 0 || dataFilter !== "all" || dataQualityFilter !== "all";

  useEffect(() => {
    setCustomViews(readCustomSellerViews(userId));
  }, [userId]);

  useEffect(() => {
    if (!openMenu) return undefined;

    function handleDocClick(event) {
      const inViewMenu = viewWrapRef.current?.contains(event.target);
      if (!inViewMenu) setOpenMenu(null);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  function applyView(view) {
    onSourceFilterChange(view.filters.sourceFilter || "all");
    onViewTabChange(view.filters.viewTab);
    onStatusFilterChange(view.filters.statusFilter);
    onDataFilterChange(view.filters.dataFilter);
    onDataQualityFilterChange(view.filters.dataQualityFilter);
    onSearchTermChange(view.filters.searchTerm);
    setOpenMenu(null);
  }

  function ensureActiveTab() {
    if (viewTab !== "active") onViewTabChange("active");
  }

  function toggleQuickFilter(filter) {
    ensureActiveTab();
    if (filter.kind === "status") {
      onStatusFilterChange(toggleStatusFilterValue(statusFilter, filter.id));
      return;
    }
    if (filter.kind === "quality") {
      onDataQualityFilterChange(dataQualityFilter === filter.id ? "all" : filter.id);
      return;
    }
    if (filter.kind === "market") {
      onDataFilterChange(dataFilter === filter.id ? "all" : filter.id);
    }
  }

  function isQuickFilterActive(filter) {
    if (filter.kind === "status") return activeStatusIds.includes(filter.id);
    if (filter.kind === "quality") return dataQualityFilter === filter.id;
    if (filter.kind === "market") return dataFilter === filter.id;
    return false;
  }

  function clearQuickFilters() {
    ensureActiveTab();
    onStatusFilterChange([]);
    onDataFilterChange("all");
    onDataQualityFilterChange("all");
  }

  function saveCurrentView() {
    const label = window.prompt("Name this view");
    if (!label?.trim()) return;

    setCustomViews((current) => {
      const next = [createCustomSellerView(label, currentFilters), ...current].slice(0, 12);
      writeCustomSellerViews(userId, next);
      return next;
    });
    setOpenMenu(null);
  }

  function deleteCustomView(viewId) {
    setCustomViews((current) => {
      const next = current.filter((view) => view.id !== viewId);
      writeCustomSellerViews(userId, next);
      return next;
    });
  }

  return (
    <div className="toolbar seller-viewbar">
      <div className="toolbar-row seller-viewbar-row">
        <div className="seller-view-menu-wrap" ref={viewWrapRef}>
          <button
            type="button"
            className={`seller-view-picker${openMenu === "views" ? " is-open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={openMenu === "views"}
            onClick={() => setOpenMenu((value) => (value === "views" ? null : "views"))}
          >
            <IconTable size={18} stroke={1.9} aria-hidden="true" />
            <span>{activeView?.label || "Saved views"}</span>
            <IconChevronDown size={16} stroke={2} aria-hidden="true" />
          </button>

          {openMenu === "views" && (
            <div className="sheet-sort-menu seller-view-menu" role="menu">
              {customViews.length > 0 && (
                <>
                  <div className="sheet-sort-menu-label">Saved views</div>
                  {customViews.map((view) => (
                    <div key={view.id} className="seller-view-menu-row">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={activeView?.id === view.id}
                        className={`sheet-sort-item seller-view-menu-item${activeView?.id === view.id ? " is-selected" : ""}`}
                        onClick={() => applyView(view)}
                      >
                        <span>{view.label}</span>
                        {activeView?.id === view.id && <IconCheck size={14} stroke={2.5} aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className="seller-view-delete"
                        aria-label={`Delete ${view.label}`}
                        title="Delete view"
                        onClick={() => deleteCustomView(view.id)}
                      >
                        <IconTrash size={16} stroke={1.9} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </>
              )}
              {!customViews.length && (
                <div className="seller-view-empty">No saved views yet</div>
              )}

              <div className="sheet-sort-divider" />
              <button type="button" className="sheet-sort-item" onClick={saveCurrentView}>
                <span>Save current view</span>
              </button>
            </div>
          )}
        </div>

        <div className="seller-view-tabs" role="tablist" aria-label="Seller status">
          {VIEW_TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={viewTab === tab.id}
              className={`seller-view-tab${viewTab === tab.id ? " is-active" : ""}`}
              onClick={() => onViewTabChange(tab.id)}
            >
              <span className="seller-view-tab-icon">
                <ViewTabIcon id={tab.id} />
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {viewTab === "active" && (
          <div className="seller-filter-chips" aria-label="Seller filters">
            {QUICK_FILTER_GROUPS.map((group, groupIndex) => (
              <Fragment key={group.id}>
                {groupIndex > 0 && <span className="seller-filter-separator" aria-hidden="true" />}
                <div className="seller-filter-group" role="group" aria-label={group.label}>
                  {group.filters.map((filter) => {
                    const active = isQuickFilterActive(filter);
                    return (
                      <button
                        key={`${filter.kind}-${filter.id}`}
                        type="button"
                        className={`seller-filter-chip${active ? " is-active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleQuickFilter(filter)}
                      >
                        {active && <IconCheck size={13} stroke={2.5} aria-hidden="true" />}
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Fragment>
            ))}
            {hasQuickFilters && (
              <button
                type="button"
                className="seller-filter-clear"
                onClick={clearQuickFilters}
                aria-label="Clear seller filters"
              >
                <IconX size={13} stroke={2.2} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}

        <label className="search-pill">
          <input
            type="text"
            placeholder="Search sellers"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
          <IconSearch className="search-pill-icon" size={17} stroke={2} aria-hidden="true" />
        </label>
      </div>

      {viewTab === "done" && (
        <div className="toolbar-note">Done shows every sent seller in this source.</div>
      )}
    </div>
  );
}
