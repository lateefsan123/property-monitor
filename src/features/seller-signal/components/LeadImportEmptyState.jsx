export default function LeadImportEmptyState({
  error,
  importing,
  onImport,
  onSheetUrlChange,
  sheetUrl,
}) {
  return (
    <div className="lead-import-empty">
      <div className="lead-import-empty-card">
        <div className="lead-import-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>

        <h2 className="lead-import-empty-title">Import your leads</h2>
        <p className="lead-import-empty-subtitle">Paste your Google Sheet to start building your seller pipeline.</p>

        <div className="lead-import-empty-steps">
          <div className="lead-import-empty-step">
            <span className="lead-import-empty-step-number">1</span>
            <span>Open your spreadsheet in Google Sheets</span>
          </div>
          <div className="lead-import-empty-step">
            <span className="lead-import-empty-step-number">2</span>
            <span>Make sure it&apos;s shared (<strong>Anyone with the link</strong>)</span>
          </div>
          <div className="lead-import-empty-step">
            <span className="lead-import-empty-step-number">3</span>
            <span>Copy the URL and paste it below</span>
          </div>
        </div>

        <form
          className="lead-import-empty-input"
          onSubmit={(event) => {
            event.preventDefault();
            onImport();
          }}
        >
          <input
            type="text"
            placeholder="Paste your Google Sheet URL here..."
            value={sheetUrl}
            onChange={(event) => onSheetUrlChange(event.target.value)}
            autoFocus
          />
          <button className="btn-primary" type="submit" disabled={importing || !sheetUrl}>
            {importing ? "Importing..." : "Import Spreadsheet"}
          </button>
        </form>

        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
