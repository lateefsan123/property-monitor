import { TOP_NAVIGATION, MAIN_NAVIGATION } from '../../../../shared/navigation';
import {
  IconBuildingEstate,
  IconCalendarWeek,
  IconHome,
  IconLogout,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSettings,
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

const ICONS = { home: IconHome, search: IconSearch, plus: IconPlus, users: IconUsers, building: IconBuildingEstate, table: IconTable, message: IconMessage };
const ACCENTS = { home: 'blue', search: 'purple', new: 'emerald', sellers: 'indigo', 'listing-alerts': 'rose', spreadsheets: 'emerald', 'message-template': 'emerald' };
const toSidebarItem = item => ({ ...item, Icon: ICONS[item.icon], accent: ACCENTS[item.id] });
const TOP_GROUP = TOP_NAVIGATION.map(toSidebarItem);
const MAIN_GROUP = [...MAIN_NAVIGATION.map(toSidebarItem), { id: "schedule", label: "Schedule", Icon: IconCalendarWeek, kind: "nav" }];

function SidenavItem({ item, currentPage, onNavigate, onAction, onPrefetch }) {
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
      onMouseEnter={() => onPrefetch?.(item.id)}
      onFocus={() => onPrefetch?.(item.id)}
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
  onPrefetch,
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
    <aside
      aria-label="Primary navigation"
      className={`sidenav${collapsed ? " sidenav-collapsed" : ""}`}
    >
      <div className="sidenav-group sidenav-group-top">
        {TOP_GROUP.map((item) => (
          <SidenavItem
            key={item.id}
            item={item}
            currentPage={currentPage}
            onNavigate={onNavigate}
            onAction={onAction}
            onPrefetch={onPrefetch}
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
            onPrefetch={onPrefetch}
          />
        ))}
      </div>

      <div className="sidenav-spacer" />

      <div className="sidenav-footer">
        <SidenavItem
          item={{ id: "settings", label: "Settings", Icon: IconSettings, kind: "action", accent: "purple" }}
          currentPage={currentPage}
          onNavigate={onNavigate}
          onAction={onAction}
          onPrefetch={onPrefetch}
        />
        <button type="button" className="sidenav-link sidenav-signout accent-rose" onClick={onSignOut}>
          <IconLogout size={20} stroke={1.8} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
