export default function ImportPanel({ importing, onImport, onSheetUrlChange, sheetUrl }) {
  return (
    <div className="import-panel-container">
      <form
        className="import-dropzone"
        onSubmit={(event) => {
          event.preventDefault();
          onImport();
        }}
      >
        <div className="import-icon-container">
          <svg className="import-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="import-title">Import Seller Leads</h3>
        <p className="import-subtitle">Paste your Google Sheet URL below to import new leads into the system.</p>

        <div className="import-input-group">
          <input
            type="text"
            className="import-input"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(event) => onSheetUrlChange(event.target.value)}
          />
          <button className="btn-primary import-btn" type="submit" disabled={importing || !sheetUrl}>
            {importing ? "Importing..." : "Import Data"}
          </button>
        </div>
      </form>
    </div>
  );
}
