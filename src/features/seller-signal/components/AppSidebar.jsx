function SellersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AlertsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SpreadsheetsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "sellers", label: "Sellers", Icon: SellersIcon },
  { id: "listing-alerts", label: "Listings", Icon: AlertsIcon },
  { id: "spreadsheets", label: "Spreadsheets", Icon: SpreadsheetsIcon },
];

export default function AppSidebar({
  currentPage,
  displayName,
  onNavigate,
  onSignOut,
}) {
  return (
    <aside className="sidenav">
      <div className="sidenav-brand">
        <span className="sidenav-brand-name">SELLERSIGNAL</span>
      </div>

      <nav className="sidenav-links">
        {NAV_ITEMS.map((item) => {
          const NavIcon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidenav-link${currentPage === item.id ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <NavIcon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidenav-spacer" />

      <div className="sidenav-footer">
        <div className="sidenav-user">
          <span className="sidenav-user-name">{displayName}</span>
        </div>
        <button type="button" className="btn-sm sidenav-signout" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
