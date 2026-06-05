import {
  IconBuildingEstate,
  IconHome,
  IconLogout,
  IconPlus,
  IconSearch,
  IconTable,
  IconUsers,
} from "@tabler/icons-react";
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

const TOP_GROUP = [
  { id: "home", label: "Home", Icon: IconHome, kind: "nav", accent: "blue" },
  { id: "search", label: "Search", Icon: IconSearch, kind: "disabled", accent: "purple" },
  { id: "new", label: "New", Icon: IconPlus, kind: "action", accent: "emerald" },
];

const MAIN_GROUP = [
  { id: "sellers", label: "Sellers", Icon: IconUsers, kind: "nav", accent: "indigo" },
  { id: "listing-alerts", label: "Listings", Icon: IconBuildingEstate, kind: "nav", accent: "rose" },
  { id: "spreadsheets", label: "Spreadsheets", Icon: IconTable, kind: "nav", accent: "emerald" },
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
      <Icon size={20} stroke={1.8} aria-hidden="true" />
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
      <IconTable size={20} stroke={1.8} aria-hidden="true" />
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
          <IconLogout size={20} stroke={1.8} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
