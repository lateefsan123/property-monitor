import { IconFileSpreadsheet } from "@tabler/icons-react";

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
          <IconFileSpreadsheet size={48} stroke={1.5} aria-hidden="true" />
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
