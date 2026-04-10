function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-3a1 1 0 01-1-1V1a1 1 0 112 0v2a1 1 0 01-1 1zm0 18a1 1 0 01-1-1v-2a1 1 0 112 0v2a1 1 0 01-1 1zm9-9h-2a1 1 0 110-2h2a1 1 0 110 2zM6 13H4a1 1 0 110-2h2a1 1 0 110 2zm12.364-5.95l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 01-1.414 1.414zM7.05 18.364l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 01-1.414 1.414zm11.314 0a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 111.414-1.414l1.414 1.414a1 1 0 010 1.414zM7.05 7.05a1 1 0 01-1.414 0L4.222 5.636a1 1 0 111.414-1.414L7.05 5.636a1 1 0 010 1.414z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  );
}

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

const NAV_ITEMS = [
  { id: "sellers", label: "Sellers", Icon: SellersIcon },
  { id: "listing-alerts", label: "Listing Alerts", Icon: AlertsIcon },
];

export default function AppSidebar({
  currentPage,
  displayName,
  onNavigate,
  onSignOut,
  onToggleTheme,
  theme,
}) {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <aside className="sidenav">
      <div className="sidenav-brand">
        <img src={logoSrc} alt="Seller Signal" className="sidenav-logo" />
      </div>

      <div className="sidenav-user">
        <span className="sidenav-user-label">Signed in as</span>
        <span className="sidenav-user-name">{displayName}</span>
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
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-icon theme-toggle-sun">
              <SunIcon />
            </span>
            <span className="theme-toggle-icon theme-toggle-moon">
              <MoonIcon />
            </span>
            <span className={`theme-toggle-thumb${theme === "dark" ? " dark" : ""}`} />
          </span>
        </button>

        <button type="button" className="btn-sm sidenav-signout" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
