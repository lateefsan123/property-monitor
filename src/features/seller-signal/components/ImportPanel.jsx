import { IconCloudUpload } from "@tabler/icons-react";

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
          <IconCloudUpload className="import-icon" size={32} stroke={2} aria-hidden="true" />
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
