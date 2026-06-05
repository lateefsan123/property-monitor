import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  IconCheck,
  IconDots,
  IconPinned,
  IconPinnedFilled,
  IconPlus,
  IconTable,
  IconUser,
} from "@tabler/icons-react";
import { SellerPreviewThumb, SheetPreviewThumb } from "../../components/SeededPreviewThumb";
import { fetchUserLeads } from "../seller-signal/services";
import { fetchSellerSources, formatSourceLabel } from "../seller-signal/page-helpers";
import { sellerLeadsQueryKey, sellerSourcesQueryKey } from "../seller-signal/queryKeys";
import { requestOpenSpreadsheet } from "../seller-signal/useSpreadsheetFavorites";
import { useSellerFavorites } from "../seller-signal/useSellerFavorites";

const SHEET_PINNED_KEY = "seller-signal:sheet-pinned";
const HOME_LAYOUT_KEY = "home:pinned-layout";
const LAYOUTS = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
];

function loadPinnedSheetIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SHEET_PINNED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function savePinnedSheetIds(set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SHEET_PINNED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

function loadInitialLayout() {
  if (typeof window === "undefined") return "grid";
  try {
    const raw = window.localStorage.getItem(HOME_LAYOUT_KEY);
    return LAYOUTS.some((l) => l.id === raw) ? raw : "grid";
  } catch {
    return "grid";
  }
}

function PinIcon({ filled }) {
  const Icon = filled ? IconPinnedFilled : IconPinned;
  return <Icon size={16} stroke={1.8} aria-hidden="true" />;
}

function SheetMetaIcon() {
  return <IconTable className="sheet-card-meta-icon" size={14} stroke={1.8} aria-hidden="true" />;
}

function SellerMetaIcon() {
  return <IconUser className="sheet-card-meta-icon" size={14} stroke={1.8} aria-hidden="true" />;
}

const TILES = [
  {
    id: "sellers",
    title: "Sellers",
    description: "Track leads, log calls, and manage every conversation with the sellers you're working.",
    accent: "tile-accent-indigo",
    preview: "preview-sellers",
  },
  {
    id: "listing-alerts",
    title: "Listing Alerts",
    description: "Browse live listings, save searches, and get notified the moment a unit matches your criteria.",
    accent: "tile-accent-rose",
    preview: "preview-listings",
  },
  {
    id: "spreadsheets",
    title: "Spreadsheets",
    description: "Import, export, and sync your Google Sheets so your pipeline stays in one place.",
    accent: "tile-accent-emerald",
    preview: "preview-spreadsheets",
  },
];

export function TilePreview({ kind }) {
  if (kind === "preview-sellers") {
    return (
      <div className="tile-preview preview-sellers">
        <img className="preview-sellers-img" src="/sellers.png" alt="" loading="lazy" />
      </div>
    );
  }
  if (kind === "preview-listings") {
    return (
      <div className="tile-preview preview-listings">
        <img className="preview-listings-img" src="/listings.png" alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="tile-preview preview-spreadsheets">
      <img
        className="preview-spreadsheets-img"
        src="https://png.pngtree.com/png-clipart/20250429/original/pngtree-spreadsheet-data-icon-for-finance-or-business-illustration-vector-png-image_20894047.png"
        alt=""
        loading="lazy"
      />
    </div>
  );
}

function TopbarActionsPortal({ children }) {
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

function PinnedCard({ item, onOpen, onTogglePin }) {
  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }
  function handlePinClick(event) {
    event.stopPropagation();
    onTogglePin();
  }
  return (
    <div
      className="sheet-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
    >
      <div className="sheet-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sheet-card-action is-active"
          onClick={handlePinClick}
          aria-label="Unpin"
          title="Unpin"
        >
          <PinIcon filled />
        </button>
      </div>
      {item.kind === "sheet" ? <SheetPreviewThumb seed={item.seed} /> : <SellerPreviewThumb seed={item.seed} />}
      <div className="sheet-card-body">
        <div className="sheet-card-title">{item.name}</div>
        <div className="sheet-card-meta">
          {item.kind === "sheet" ? <SheetMetaIcon /> : <SellerMetaIcon />}
          <span>{item.meta}</span>
        </div>
      </div>
    </div>
  );
}

function PinnedRow({ item, onOpen, onTogglePin }) {
  function handleKey(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }
  function handlePinClick(event) {
    event.stopPropagation();
    onTogglePin();
  }
  return (
    <div
      className="sheet-row"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
    >
      <span className="sheet-row-icon" aria-hidden>
        {item.kind === "sheet" ? <SheetMetaIcon /> : <SellerMetaIcon />}
      </span>
      <span className="sheet-row-name">{item.name}</span>
      <span className="sheet-row-count">{item.meta}</span>
      <span className="sheet-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sheet-card-action is-active"
          onClick={handlePinClick}
          aria-label="Unpin"
          title="Unpin"
        >
          <PinIcon filled />
        </button>
      </span>
    </div>
  );
}

function PinnedSection({ userId, layout, onNavigate, pinnedSheetIds, setPinnedSheetIds }) {
  const { pinnedIds: pinnedSellerIds, togglePin: toggleSellerPin } = useSellerFavorites();

  const sourcesQuery = useQuery({
    queryKey: sellerSourcesQueryKey(userId),
    enabled: Boolean(userId) && pinnedSheetIds.size > 0,
    queryFn: () => fetchSellerSources(userId),
    staleTime: 60 * 1000,
  });

  const leadsQuery = useQuery({
    queryKey: sellerLeadsQueryKey(userId),
    enabled: Boolean(userId) && pinnedSellerIds.size > 0,
    queryFn: () => fetchUserLeads(userId),
    staleTime: 30 * 1000,
  });

  const pinnedItems = useMemo(() => {
    const items = [];
    if (pinnedSheetIds.size > 0) {
      const sources = sourcesQuery.data || [];
      const counts = {};
      for (const lead of leadsQuery.data?.leads || []) {
        const key = lead.sourceId ? String(lead.sourceId) : "legacy";
        counts[key] = (counts[key] || 0) + 1;
      }
      for (const source of sources) {
        const id = String(source.id);
        if (!pinnedSheetIds.has(id)) continue;
        const count = counts[id] || 0;
        items.push({
          kind: "sheet",
          id,
          name: formatSourceLabel(source),
          seed: id,
          meta: `${count} lead${count === 1 ? "" : "s"}`,
        });
      }
      if (pinnedSheetIds.has("legacy")) {
        items.push({
          kind: "sheet",
          id: "legacy",
          name: "Legacy spreadsheet",
          seed: "legacy",
          meta: `${counts.legacy || 0} lead${(counts.legacy || 0) === 1 ? "" : "s"}`,
        });
      }
    }
    if (pinnedSellerIds.size > 0) {
      const leads = leadsQuery.data?.leads || [];
      for (const lead of leads) {
        const id = String(lead.id);
        if (!pinnedSellerIds.has(id)) continue;
        items.push({
          kind: "seller",
          id,
          name: lead.name || "Unnamed seller",
          seed: id,
          meta: lead.building || lead.phone || "Seller",
        });
      }
    }
    return items;
  }, [sourcesQuery.data, leadsQuery.data, pinnedSheetIds, pinnedSellerIds]);

  function toggleSheetPin(id) {
    const key = String(id);
    setPinnedSheetIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      savePinnedSheetIds(next);
      return next;
    });
  }

  function handleOpen(item) {
    if (item.kind === "sheet") {
      requestOpenSpreadsheet(item.id);
      onNavigate("spreadsheets");
    } else {
      onNavigate("sellers");
    }
  }

  function handleTogglePin(item) {
    if (item.kind === "sheet") toggleSheetPin(item.id);
    else toggleSellerPin(item.id);
  }

  if (pinnedItems.length === 0) return null;

  return (
    <section className="home-pinned">
      <h2 className="home-pinned-title">Pinned</h2>
      {layout === "grid" ? (
        <div className="sheet-grid">
          {pinnedItems.map((item) => (
            <PinnedCard
              key={`${item.kind}-${item.id}`}
              item={item}
              onOpen={() => handleOpen(item)}
              onTogglePin={() => handleTogglePin(item)}
            />
          ))}
        </div>
      ) : (
        <div className="sheet-list">
          {pinnedItems.map((item) => (
            <PinnedRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onOpen={() => handleOpen(item)}
              onTogglePin={() => handleTogglePin(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage({ displayName, onNavigate, userId, onOpenCreate }) {
  const firstName = (displayName || "").split(" ")[0] || "there";
  const [layout, setLayout] = useState(loadInitialLayout);
  const [pinnedSheetIds, setPinnedSheetIds] = useState(loadPinnedSheetIds);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HOME_LAYOUT_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [layout]);

  const hasAnyPinned = pinnedSheetIds.size > 0;

  return (
    <div className="home-page">
      <TopbarActionsPortal>
        <button
          type="button"
          className="sheet-topbar-new-btn"
          onClick={() => onOpenCreate?.()}
          aria-label="Create new"
          title="Create new"
        >
          <IconPlus size={18} stroke={2} aria-hidden="true" />
        </button>
        <LayoutMenu value={layout} onChange={setLayout} />
      </TopbarActionsPortal>

      <h1 className="home-title">Welcome back, {firstName}.</h1>

      <div className="home-tiles">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`home-tile ${tile.accent}`}
            onClick={() => onNavigate(tile.id)}
          >
            <div className="home-tile-visual">
              <TilePreview kind={tile.preview} />
            </div>
            <div className="home-tile-body">
              <h3 className="home-tile-title">{tile.title}</h3>
              <p className="home-tile-desc">{tile.description}</p>
            </div>
          </button>
        ))}
      </div>

      <PinnedSection
        userId={userId}
        layout={layout}
        onNavigate={onNavigate}
        pinnedSheetIds={pinnedSheetIds}
        setPinnedSheetIds={setPinnedSheetIds}
      />
      {!hasAnyPinned && null}
    </div>
  );
}
