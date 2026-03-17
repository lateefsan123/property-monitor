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

export default function AppTopNav({
  displayName,
  onSignOut,
  onToggleImport,
  onToggleTheme,
  showImport,
  theme,
}) {
  return (
    <nav className="topnav">
      <div className="topnav-brand">
        <img src={theme === "dark" ? "/darkmode logo.png" : "/logo.png"} alt="Seller Signal" className="topnav-logo" />
        <span className="user-email">{displayName}</span>
      </div>

      <div className="topnav-actions">
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

        <button type="button" className="btn-sm" onClick={onToggleImport}>
          {showImport ? "Cancel" : "Import"}
        </button>

        <button type="button" className="btn-sm" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
