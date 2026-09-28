import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  IconCheck,
  IconDots,
  IconLayoutGrid,
  IconList,
  IconPinned,
  IconPinnedFilled,
  IconPlus,
  IconTable,
  IconUser,
} from "@tabler/icons-react";
import { SellerPreviewThumb, SheetPreviewThumb } from "../../components/SeededPreviewThumb";
import HomeInsights from "./HomeInsights";
import "../../styles/home-pinned.css";
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

function PinnedSection({ userId, layout, onLayoutChange, onNavigate, pinnedSheetIds, setPinnedSheetIds }) {
  const { pinnedIds: pinnedSellerIds, togglePin: toggleSellerPin } = useSellerFavorites(userId);

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
      {/* Layout only affects pinned items, so the switch lives with them. */}
      <div className="home-pinned-head">
        <h2 className="home-pinned-title">Pinned</h2>
        <div className="home-layout-switch" role="radiogroup" aria-label="Pinned layout">
          {LAYOUTS.map((option) => (
            <button key={option.id} type="button" role="radio" aria-checked={layout === option.id} aria-label={option.label}
              title={option.label} className={layout === option.id ? "is-active" : ""} onClick={() => onLayoutChange(option.id)}>
              {option.id === "grid" ? <IconLayoutGrid size={16} stroke={1.8} aria-hidden="true" /> : <IconList size={16} stroke={1.8} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
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
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
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
      </TopbarActionsPortal>

      <header className="home-greeting">
        <span className="home-muted">{today}</span>
        <h1 className="home-title">Hello{displayName ? `, ${displayName}` : ""}</h1>
      </header>

      <HomeInsights userId={userId} onNavigate={onNavigate} />

      <PinnedSection
        userId={userId}
        layout={layout}
        onLayoutChange={setLayout}
        onNavigate={onNavigate}
        pinnedSheetIds={pinnedSheetIds}
        setPinnedSheetIds={setPinnedSheetIds}
      />
    </div>
  );
}
