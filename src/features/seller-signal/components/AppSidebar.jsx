import { useSpreadsheetFavorites, requestOpenSpreadsheet } from "../useSpreadsheetFavorites";

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

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

function SellersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function SpreadsheetsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const TOP_GROUP = [
  { id: "home", label: "Home", Icon: HomeIcon, kind: "nav", accent: "blue" },
  { id: "search", label: "Search", Icon: SearchIcon, kind: "disabled", accent: "purple" },
  { id: "new", label: "New", Icon: PlusIcon, kind: "action", accent: "emerald" },
];

const MAIN_GROUP = [
  { id: "sellers", label: "Sellers", Icon: SellersIcon, kind: "nav", accent: "indigo" },
  { id: "listing-alerts", label: "Listings", Icon: ListingsIcon, kind: "nav", accent: "rose" },
  { id: "spreadsheets", label: "Spreadsheets", Icon: SpreadsheetsIcon, kind: "nav", accent: "emerald" },
];

function SidenavItem({ item, currentPage, onNavigate, onAction }) {
  const Icon = item.Icon;
  const isNav = item.kind === "nav";
  const isAction = item.kind === "action";
  const isInteractive = isNav || isAction;
  const isActive = isNav && currentPage === item.id;
  const accent = item.accent ? ` accent-${item.accent}` : "";

  function handleClick() {
    if (isNav) onNavigate(item.id);
    else if (isAction) onAction?.(item.id);
  }

  return (
    <button
      type="button"
      className={`sidenav-link${accent}${isActive ? " active" : ""}${!isInteractive ? " disabled" : ""}`}
      onClick={isInteractive ? handleClick : undefined}
      disabled={!isInteractive}
    >
      <span className="sidenav-link-icon">
        <Icon />
      </span>
      <span>{item.label}</span>
    </button>
  );
}

function FavoriteItem({ source, onOpen }) {
  const name = getSourceNameValue(source) || `Spreadsheet ${Number(source.sort_order ?? 0) + 1}`;
  return (
    <button
      type="button"
      className="sidenav-link sidenav-favorite accent-emerald"
      onClick={() => onOpen(source.id)}
      title={name}
    >
      <span className="sidenav-link-icon">
        <SpreadsheetsIcon />
      </span>
      <span className="sidenav-favorite-label">{name}</span>
    </button>
  );
}

export default function AppSidebar({
  currentPage,
  onNavigate,
  onAction,
  onSignOut,
  collapsed,
  userId,
}) {
  const { favoritedSources } = useSpreadsheetFavorites(userId);

  function handleOpenFavorite(id) {
    requestOpenSpreadsheet(id);
    onNavigate("spreadsheets");
  }

  return (
    <aside className={`sidenav${collapsed ? " sidenav-collapsed" : ""}`}>
      <div className="sidenav-group sidenav-group-top">
        {TOP_GROUP.map((item) => (
          <SidenavItem
            key={item.id}
            item={item}
            currentPage={currentPage}
            onNavigate={onNavigate}
            onAction={onAction}
          />
        ))}
      </div>

      {favoritedSources.length > 0 && (
        <div className="sidenav-group sidenav-group-favorites">
          {favoritedSources.map((source) => (
            <FavoriteItem
              key={source.id}
              source={source}
              onOpen={handleOpenFavorite}
            />
          ))}
        </div>
      )}

      <div className="sidenav-group">
        {MAIN_GROUP.map((item) => (
          <SidenavItem
            key={item.id}
            item={item}
            currentPage={currentPage}
            onNavigate={onNavigate}
            onAction={onAction}
          />
        ))}
      </div>

      <div className="sidenav-spacer" />

      <div className="sidenav-footer">
        <button type="button" className="sidenav-link sidenav-signout accent-rose" onClick={onSignOut}>
          <span className="sidenav-link-icon">
            <SignOutIcon />
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
