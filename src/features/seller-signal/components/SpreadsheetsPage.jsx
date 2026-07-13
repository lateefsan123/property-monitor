import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconArrowsSort,
  IconCheck,
  IconDots,
  IconPinned,
  IconPinnedFilled,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTable,
  IconX,
} from "@tabler/icons-react";
import { SheetPreviewThumb } from "../../../components/SeededPreviewThumb";
import { useSpreadsheetsPage } from "../useSpreadsheetsPage";
import {
  useSpreadsheetFavorites,
  consumePendingOpenSpreadsheet,
  useOpenSpreadsheetRequests,
} from "../useSpreadsheetFavorites";
import SpreadsheetDetailModal from "./SpreadsheetDetailModal";
import NewSpreadsheetModal from "./NewSpreadsheetModal";

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function getSourceNameValue(source) {
  const buildingName = String(source?.building_name || "").trim();
  const label = String(source?.label || "").trim();
  if (buildingName && (!label || isPlaceholderSourceLabel(source))) return buildingName;
  return label || buildingName || "";
}

function FavoriteIcon({ filled }) {
  const Icon = filled ? IconStarFilled : IconStar;
  return <Icon size={16} stroke={1.8} aria-hidden="true" />;
}

function PinIcon({ filled }) {
  const Icon = filled ? IconPinnedFilled : IconPinned;
  return <Icon size={16} stroke={1.8} aria-hidden="true" />;
}

function SheetMetaIcon({ size = 14, className = "sheet-card-meta-icon" }) {
  return <IconTable className={className || undefined} size={size} stroke={1.8} aria-hidden="true" />;
}

function NewSpreadsheetCard({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      className="sheet-card sheet-card-new"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="sheet-card-new-inner">
        <span className="sheet-card-plus" aria-hidden>
          <IconPlus size={24} stroke={2} aria-hidden="true" />
        </span>
        <span className="sheet-card-new-label">{label}</span>
      </div>
    </button>
  );
}

function SpreadsheetCard({ name, count, seed, favorited, pinned, onClick, onToggleFavorite, onTogglePin }) {
  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  }
  function handleAction(fn) {
    return (event) => {
      event.stopPropagation();
      fn?.();
    };
  }
  return (
    <div
      className={`sheet-card${pinned ? " is-pinned" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKey}
    >
      <div className="sheet-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`sheet-card-action${favorited ? " is-active" : ""}`}
          onClick={handleAction(onToggleFavorite)}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          title={favorited ? "Remove from favorites" : "Favorite"}
        >
          <FavoriteIcon filled={favorited} />
        </button>
        <button
          type="button"
          className={`sheet-card-action${pinned ? " is-active" : ""}`}
          onClick={handleAction(onTogglePin)}
          aria-label={pinned ? "Unpin" : "Pin"}
          title={pinned ? "Unpin" : "Pin"}
        >
          <PinIcon filled={pinned} />
        </button>
      </div>
      <SheetPreviewThumb seed={seed ?? name} />
      <div className="sheet-card-body">
        <div className="sheet-card-title">{name}</div>
        <div className="sheet-card-meta">
          <SheetMetaIcon />
          <span>{count} lead{count === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

const SORT_STORAGE_KEY = "seller-signal:sheet-sort";
const LAYOUT_STORAGE_KEY = "seller-signal:sheet-layout";
const PINNED_STORAGE_KEY = "seller-signal:sheet-pinned";

function loadIdSet(key) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key, set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}
const SORT_FIELDS = [
  { id: "created", label: "Date created" },
  { id: "alpha", label: "Alphabetical" },
];
const SORT_DIRECTIONS = [
  { id: "desc", label: "Newest first" },
  { id: "asc", label: "Oldest first" },
];
const LAYOUTS = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
];

function loadInitialLayout() {
  if (typeof window === "undefined") return "grid";
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    return LAYOUTS.some((l) => l.id === raw) ? raw : "grid";
  } catch {
    return "grid";
  }
}

function loadInitialSort() {
  if (typeof window === "undefined") return { field: "created", direction: "desc" };
  try {
    const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return { field: "created", direction: "desc" };
    const parsed = JSON.parse(raw);
    const field = SORT_FIELDS.some((f) => f.id === parsed?.field) ? parsed.field : "created";
    const direction = SORT_DIRECTIONS.some((d) => d.id === parsed?.direction) ? parsed.direction : "desc";
    return { field, direction };
  } catch {
    return { field: "created", direction: "desc" };
  }
}

function sortSources(sources, field, direction) {
  const list = [...sources];
  list.sort((a, b) => {
    if (field === "alpha") {
      const an = String(getSourceNameValue(a) || "").toLowerCase();
      const bn = String(getSourceNameValue(b) || "").toLowerCase();
      return an.localeCompare(bn);
    }
    const at = a?.created_at ? new Date(a.created_at).getTime() : (a?.sort_order ?? 0);
    const bt = b?.created_at ? new Date(b.created_at).getTime() : (b?.sort_order ?? 0);
    return at - bt;
  });
  if (direction === "desc") list.reverse();
  return list;
}

function TopbarSortPortal({ children }) {
  const [host, setHost] = useState(() =>
    typeof document === "undefined" ? null : document.getElementById("app-topbar-actions"),
  );

  useEffect(() => {
    if (host || typeof document === "undefined") return undefined;
    let cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      const el = document.getElementById("app-topbar-actions");
      if (el) setHost(el);
    };
    attempt();
    const raf = window.requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [host]);

  if (!host) return null;
  return createPortal(children, host);
}

function SortMenu({ field, direction, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleDocClick(event) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="sheet-sort" ref={wrapRef}>
      <button
        type="button"
        className={`sheet-sort-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Sort"
      >
        <IconArrowsSort size={18} stroke={1.8} aria-hidden="true" />
      </button>
      {open && (
        <div className="sheet-sort-menu" role="menu">
          <div className="sheet-sort-menu-label">Sort</div>
          {SORT_FIELDS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={field === option.id}
              className={`sheet-sort-item${field === option.id ? " is-selected" : ""}`}
              onClick={() => {
                onChange({ field: option.id, direction });
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {field === option.id && (
                <IconCheck size={14} stroke={2.5} aria-hidden="true" />
              )}
            </button>
          ))}
          <div className="sheet-sort-divider" />
          {SORT_DIRECTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={direction === option.id}
              className={`sheet-sort-item${direction === option.id ? " is-selected" : ""}`}
              onClick={() => {
                onChange({ field, direction: option.id });
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {direction === option.id && (
                <IconCheck size={14} stroke={2.5} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleDocClick(event) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="sheet-sort" ref={wrapRef}>
      <button
        type="button"
        className={`sheet-sort-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change layout"
      >
        <IconDots size={20} stroke={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="sheet-sort-menu" role="menu">
          <div className="sheet-sort-menu-label">Layout</div>
          {LAYOUTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.id}
              className={`sheet-sort-item${value === option.id ? " is-selected" : ""}`}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.id && (
                <IconCheck size={14} stroke={2.5} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpreadsheetRow({
  name,
  count,
  favorited,
  pinned,
  selected,
  selectionActive,
  onClick,
  onToggleSelect,
  onToggleFavorite,
  onTogglePin,
}) {
  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  }
  function handleAction(fn) {
    return (event) => {
      event.stopPropagation();
      fn?.();
    };
  }
  return (
    <div
      className={`sheet-row${pinned ? " is-pinned" : ""}${selected ? " is-selected" : ""}${selectionActive ? " selection-active" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKey}
      aria-selected={selected || undefined}
    >
      <span className="sheet-row-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          aria-label={selected ? "Deselect spreadsheet" : "Select spreadsheet"}
        />
      </span>
      <span className="sheet-row-icon" aria-hidden>
        <SheetMetaIcon size={20} className="" />
      </span>
      <span className="sheet-row-name">{name}</span>
      <span className="sheet-row-count">{count} lead{count === 1 ? "" : "s"}</span>
      <span className="sheet-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`sheet-card-action${favorited ? " is-active" : ""}`}
          onClick={handleAction(onToggleFavorite)}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          title={favorited ? "Remove from favorites" : "Favorite"}
        >
          <FavoriteIcon filled={favorited} />
        </button>
        <button
          type="button"
          className={`sheet-card-action${pinned ? " is-active" : ""}`}
          onClick={handleAction(onTogglePin)}
          aria-label={pinned ? "Unpin" : "Pin"}
          title={pinned ? "Unpin" : "Pin"}
        >
          <PinIcon filled={pinned} />
        </button>
      </span>
    </div>
  );
}

function SelectionBar({ count, total, onSelectAll, onClear, onCopyLink, onPin, onUnpin, canCopyLink, allPinned }) {
  return (
    <div className="selection-bar" role="toolbar" aria-label="Selection actions">
      <button
        type="button"
        className="selection-bar-close"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <IconX size={16} stroke={2} aria-hidden="true" />
      </button>
      <span className="selection-bar-count">{count} selected</span>
      <span className="selection-bar-divider" />
      <button
        type="button"
        className="selection-bar-link"
        onClick={onSelectAll}
        disabled={count >= total}
      >
        Select all
      </button>
      <span className="selection-bar-grow" />
      <button
        type="button"
        className="selection-bar-action"
        onClick={onCopyLink}
        disabled={!canCopyLink}
        title={canCopyLink ? "Copy Google Sheet link" : "Select one spreadsheet with a link"}
      >
        Copy link
      </button>
      <button
        type="button"
        className="selection-bar-action"
        onClick={allPinned ? onUnpin : onPin}
      >
        {allPinned ? "Unpin" : "Pin"}
      </button>
    </div>
  );
}

export default function SpreadsheetsPage({ userId }) {
  const page = useSpreadsheetsPage(userId);
  const [openSourceId, setOpenSourceId] = useState(null);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [sort, setSort] = useState(loadInitialSort);
  const [layout, setLayout] = useState(loadInitialLayout);
  const { favoriteIds: favorites, toggle: toggleFavorite } = useSpreadsheetFavorites(userId);
  const [pinned, setPinned] = useState(() => loadIdSet(PINNED_STORAGE_KEY));
  const [selected, setSelected] = useState(() => new Set());

  function toggleSelected(id) {
    const key = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function setManyPinned(ids, value) {
    setPinned((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        const key = String(id);
        if (value) next.add(key);
        else next.delete(key);
      }
      saveIdSet(PINNED_STORAGE_KEY, next);
      return next;
    });
  }

  function togglePin(id) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      saveIdSet(PINNED_STORAGE_KEY, next);
      return next;
    });
  }

  function handleLayoutChange(nextLayout) {
    setLayout(nextLayout);
    if (nextLayout !== "list") setSelected(new Set());
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    } catch {
      /* ignore */
    }
  }, [sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [layout]);

  useEffect(() => {
    if (page.loading) return;
    const pendingId = consumePendingOpenSpreadsheet();
    if (!pendingId) return;
    const exists = page.leadSources.some((s) => String(s.id) === pendingId) || pendingId === "legacy";
    if (!exists) return;

    const timeoutId = window.setTimeout(() => setOpenSourceId(pendingId), 0);
    return () => window.clearTimeout(timeoutId);
  }, [page.loading, page.leadSources]);

  useOpenSpreadsheetRequests((id) => {
    const exists = page.leadSources.some((s) => String(s.id) === id) || id === "legacy";
    if (exists) {
      consumePendingOpenSpreadsheet();
      setOpenSourceId(id);
    }
  });

  const sortedSources = useMemo(
    () => sortSources(page.leadSources, sort.field, sort.direction),
    [page.leadSources, sort.field, sort.direction],
  );

  if (page.loading) {
    return (
      <div className="page">
        <div className="sheet-grid" aria-busy="true" aria-label="Loading spreadsheets">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="sheet-card sheet-card-skeleton" key={index}>
              <div className="sheet-card-preview skeleton-bar" />
              <div className="sheet-card-body">
                <div className="skeleton-bar tall medium" />
                <div className="skeleton-bar short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const legacyCount = page.sourceCounts?.legacy || 0;
  const totalLeads = page.leadSources.reduce(
    (sum, s) => sum + (page.sourceCounts?.[s.id] || 0),
    0,
  ) + legacyCount;
  const showLegacyCard = legacyCount > 0 || Boolean(page.legacySheetUrl);

  const openSource = openSourceId === "legacy"
    ? null
    : page.leadSources.find((s) => s.id === openSourceId) || null;
  const openIsLegacy = openSourceId === "legacy";

  function handleOpenNewSheet() {
    if (!page.canAddSource || page.addingSource) return;
    setNewSheetOpen(true);
  }

  async function handleCreateFromUrl(sheetUrl, selectedBuildings) {
    const created = await page.actions.addSource({ sheetUrl, selectedBuildings });
    return Boolean(created);
  }

  return (
    <div className="page">
      <TopbarSortPortal>
        <button
          type="button"
          className="sheet-topbar-new-btn"
          onClick={handleOpenNewSheet}
          disabled={!page.canAddSource || page.addingSource}
          aria-label="New spreadsheet"
          title="New spreadsheet"
        >
          <IconPlus size={18} stroke={2} aria-hidden="true" />
        </button>
        <SortMenu field={sort.field} direction={sort.direction} onChange={setSort} />
        <LayoutMenu value={layout} onChange={handleLayoutChange} />
      </TopbarSortPortal>

      <div className="sheet-header">
        <p className="page-subtitle">
          {page.leadSources.length} source{page.leadSources.length !== 1 && "s"} &middot; {totalLeads} leads
        </p>
        <div className="sheet-sync-info">
          <span className="sheet-sync-label">Imports are manual</span>
          <span className="sheet-sync-note">Import replaces the sellers owned by that spreadsheet.</span>
        </div>
      </div>

      {page.notice && <div className="notice">{page.notice}</div>}
      {page.error && <div className="error">{page.error}</div>}

      {layout === "grid" ? (
        <div className="sheet-grid">
          <NewSpreadsheetCard
            onClick={handleOpenNewSheet}
            disabled={!page.canAddSource || page.addingSource}
            label={page.addingSource ? "Adding..." : "New"}
          />
          {sortedSources.map((source) => (
            <SpreadsheetCard
              key={source.id}
              name={getSourceNameValue(source) || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`}
              count={page.sourceCounts?.[source.id] || 0}
              seed={source.id}
              favorited={favorites.has(String(source.id))}
              pinned={pinned.has(String(source.id))}
              onClick={() => setOpenSourceId(source.id)}
              onToggleFavorite={() => toggleFavorite(source.id)}
              onTogglePin={() => togglePin(source.id)}
            />
          ))}
          {showLegacyCard && (
            <SpreadsheetCard
              key="legacy"
              name="Legacy spreadsheet"
              count={legacyCount}
              seed="legacy"
              favorited={favorites.has("legacy")}
              pinned={pinned.has("legacy")}
              onClick={() => setOpenSourceId("legacy")}
              onToggleFavorite={() => toggleFavorite("legacy")}
              onTogglePin={() => togglePin("legacy")}
            />
          )}
        </div>
      ) : (
        <div className="sheet-list">
          {sortedSources.map((source) => (
            <SpreadsheetRow
              key={source.id}
              name={getSourceNameValue(source) || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`}
              count={page.sourceCounts?.[source.id] || 0}
              favorited={favorites.has(String(source.id))}
              pinned={pinned.has(String(source.id))}
              selected={selected.has(String(source.id))}
              selectionActive={selected.size > 0}
              onClick={() => setOpenSourceId(source.id)}
              onToggleSelect={() => toggleSelected(source.id)}
              onToggleFavorite={() => toggleFavorite(source.id)}
              onTogglePin={() => togglePin(source.id)}
            />
          ))}
          {showLegacyCard && (
            <SpreadsheetRow
              key="legacy"
              name="Legacy spreadsheet"
              count={legacyCount}
              favorited={favorites.has("legacy")}
              pinned={pinned.has("legacy")}
              selected={selected.has("legacy")}
              selectionActive={selected.size > 0}
              onClick={() => setOpenSourceId("legacy")}
              onToggleSelect={() => toggleSelected("legacy")}
              onToggleFavorite={() => toggleFavorite("legacy")}
              onTogglePin={() => togglePin("legacy")}
            />
          )}
        </div>
      )}

      {layout === "list" && selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          total={sortedSources.length + (showLegacyCard ? 1 : 0)}
          canCopyLink={(() => {
            if (selected.size !== 1) return false;
            const only = Array.from(selected)[0];
            if (only === "legacy") return Boolean(page.legacySheetUrl);
            const src = page.leadSources.find((s) => String(s.id) === only);
            return Boolean(src?.sheet_url);
          })()}
          allPinned={Array.from(selected).every((id) => pinned.has(String(id)))}
          onSelectAll={() => {
            const all = new Set(sortedSources.map((s) => String(s.id)));
            if (showLegacyCard) all.add("legacy");
            setSelected(all);
          }}
          onClear={clearSelection}
          onCopyLink={async () => {
            const only = Array.from(selected)[0];
            let url = "";
            if (only === "legacy") url = page.legacySheetUrl || "";
            else {
              const src = page.leadSources.find((s) => String(s.id) === only);
              url = src?.sheet_url || "";
            }
            if (!url) return;
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              /* ignore */
            }
          }}
          onPin={() => setManyPinned(Array.from(selected), true)}
          onUnpin={() => setManyPinned(Array.from(selected), false)}
        />
      )}

      {!page.canAddSource && (
        <p className="sheet-limit-note">Maximum 10 spreadsheets.</p>
      )}

      {newSheetOpen && (
        <NewSpreadsheetModal
          onClose={() => setNewSheetOpen(false)}
          onSubmit={handleCreateFromUrl}
          submitting={page.addingSource || Boolean(page.importingSourceId)}
          maxSelections={page.remainingSourceSlots}
        />
      )}

      {openSource && (
        <SpreadsheetDetailModal
          source={{
            ...openSource,
            name: getSourceNameValue(openSource),
          }}
          index={page.leadSources.findIndex((s) => s.id === openSource.id)}
          count={page.sourceCounts?.[openSource.id] || 0}
          importing={page.importingSourceId === openSource.id}
          clearing={page.clearingSourceId === openSource.id}
          notice={page.sourceFeedbackById?.[openSource.id]?.notice}
          error={page.sourceFeedbackById?.[openSource.id]?.error}
          onClose={() => setOpenSourceId(null)}
          onSave={page.actions.saveLeadSource}
          onImport={page.actions.importFromSheet}
          onClear={page.actions.clearSource}
        />
      )}

      {openIsLegacy && (
        <SpreadsheetDetailModal
          source={{ id: "legacy", sheet_url: page.legacySheetUrl || "" }}
          index={0}
          count={legacyCount}
          importing={page.importingLegacy}
          isLegacy
          notice={page.legacyNotice}
          error={page.legacyError}
          onClose={() => setOpenSourceId(null)}
          onSave={(_, draft) => page.actions.updateLegacySheetUrl(draft.sheet_url || "")}
          onImport={() => page.actions.importLegacySheet()}
        />
      )}
    </div>
  );
}
