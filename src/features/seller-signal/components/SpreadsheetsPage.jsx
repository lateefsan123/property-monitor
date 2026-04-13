import { useSpreadsheetsPage } from "../useSpreadsheetsPage";

export default function SpreadsheetsPage({ userId }) {
  const page = useSpreadsheetsPage(userId);

  if (page.loading) {
    return (
      <div className="page">
        <div className="lead-list" aria-busy="true" aria-label="Loading spreadsheets">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-card-row">
                <div className="skeleton-stack">
                  <div className="skeleton-bar tall medium" />
                  <div className="skeleton-bar long" />
                </div>
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
  const showLegacyRow = legacyCount > 0 || Boolean(page.legacySheetUrl);

  const lastSync = typeof window !== "undefined"
    ? Number(localStorage.getItem("seller-signal:last-sheet-sync") || 0)
    : 0;
  const lastSyncLabel = lastSync
    ? `Last synced ${new Date(lastSync).toLocaleString()}`
    : "Not synced yet";

  return (
    <div className="page">
      <div className="sheet-header">
        <p className="page-subtitle">
          {page.leadSources.length} source{page.leadSources.length !== 1 && "s"} &middot; {totalLeads} leads
        </p>
        <div className="sheet-sync-info">
          <span className="sheet-sync-label">{lastSyncLabel}</span>
          <span className="sheet-sync-note">Auto-syncs every hour</span>
        </div>
      </div>

      <div className="sheet-instructions">
        <h3>How to get your Google Sheets URL</h3>
        <ol>
          <li>Go to <strong>Google Sheets</strong> (sheets.google.com)</li>
          <li>If you have an Excel file, open it in Google Sheets using <strong>File &rarr; Import</strong></li>
          <li>Click <strong>Share</strong> in the top-right corner and set access to <strong>"Anyone with the link"</strong></li>
          <li>Copy the URL from your browser's address bar and paste it below</li>
        </ol>
      </div>

      {page.error && <div className="error">{page.error}</div>}

      <div className="source-list">
        {page.leadSources.map((source, index) => {
          const count = page.sourceCounts?.[source.id] || 0;
          const labelValue = source.building_name || source.label || "";
          const importing = page.importingSourceId === source.id;
          return (
            <div className="source-row" key={source.id}>
              <input
                className="source-row-name"
                type="text"
                value={labelValue}
                onChange={(e) => page.actions.updateLeadSourceField(source.id, "building_name", e.target.value)}
                onBlur={() => page.actions.persistLeadSource(source.id)}
                placeholder={`Spreadsheet ${index + 1}`}
              />
              <input
                className="source-row-url"
                type="text"
                value={source.sheet_url || ""}
                onChange={(e) => page.actions.updateLeadSourceField(source.id, "sheet_url", e.target.value)}
                onBlur={() => page.actions.persistLeadSource(source.id)}
                placeholder="Google Sheet URL"
              />
              <span className="source-row-count">{count} leads</span>
              <button
                type="button"
                className="source-row-import"
                disabled={!source.sheet_url || importing}
                onClick={() => page.actions.importFromSheet(source.id)}
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          );
        })}
        {showLegacyRow && (
          <div className="source-row" key="legacy">
            <input
              className="source-row-name"
              type="text"
              value="Legacy spreadsheet"
              readOnly
            />
            <input
              className="source-row-url"
              type="text"
              value={page.legacySheetUrl || ""}
              onChange={(e) => page.actions.updateLegacySheetUrl(e.target.value)}
              placeholder="Google Sheet URL"
            />
            <span className="source-row-count">{legacyCount} leads</span>
            <button
              type="button"
              className="source-row-import"
              disabled={!page.legacySheetUrl || page.importingLegacy}
              onClick={() => page.actions.importLegacySheet()}
            >
              {page.importingLegacy ? "Importing..." : "Import"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
