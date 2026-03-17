export default function ImportPanel({ importing, onImport, onSheetUrlChange, sheetUrl }) {
  return (
    <form
      className="import-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onImport();
      }}
    >
      <input
        type="text"
        placeholder="Paste Google Sheet URL..."
        value={sheetUrl}
        onChange={(event) => onSheetUrlChange(event.target.value)}
      />
      <button className="btn-primary" type="submit" disabled={importing}>
        {importing ? "Importing..." : "Import"}
      </button>
    </form>
  );
}
