function getSourceLabel(source) {
  if (!source) return "";
  if (source.type === "personal") {
    return source.label || "Personal";
  }
  return source.building_name || source.label || "Building";
}

function getSourceTitle(source) {
  if (!source) return "";
  return source.type === "personal" ? "Personal spreadsheet" : "Building spreadsheet";
}

export default function LeadSourcesPanel({
  sources,
  importingSourceId,
  leadCounts,
  onImport,
  onSourceChange,
  onSourceSave,
}) {
  if (!sources?.length) return null;

  return (
    <div className="source-panel">
      <div className="source-panel-header">
        <div>
          <h3 className="source-panel-title">Spreadsheets</h3>
          <p className="source-panel-subtitle">Keep one personal sheet plus up to three building templates.</p>
        </div>
        <div className="source-panel-note">Everyone imported from these sheets defaults to Prospect.</div>
      </div>

      <div className="source-grid">
        {sources.map((source) => {
          const count = leadCounts?.[source.id] || 0;
          const labelValue = source.type === "personal"
            ? source.label || ""
            : source.building_name || source.label || "";
          return (
            <div className="source-card" key={source.id}>
              <div className="source-card-header">
                <div>
                  <div className="source-card-title">{getSourceTitle(source)}</div>
                  <div className="source-card-meta">{count} leads</div>
                </div>
                <span className={`source-badge ${source.type === "personal" ? "source-badge-personal" : "source-badge-building"}`}>
                  {source.type === "personal" ? "Personal" : "Building"}
                </span>
              </div>

              <label className="source-field">
                <span>{source.type === "personal" ? "Label" : "Building name"}</span>
                <input
                  type="text"
                  value={labelValue}
                  onChange={(event) => onSourceChange(source.id, source.type === "personal" ? "label" : "building_name", event.target.value)}
                  onBlur={() => onSourceSave(source.id)}
                  placeholder={source.type === "personal" ? "Personal" : "e.g. Marina Gate 2"}
                />
              </label>

              <label className="source-field">
                <span>Google Sheet URL</span>
                <input
                  type="text"
                  value={source.sheet_url || ""}
                  onChange={(event) => onSourceChange(source.id, "sheet_url", event.target.value)}
                  onBlur={() => onSourceSave(source.id)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </label>

              <button
                type="button"
                className="btn-primary source-import-btn"
                disabled={!source.sheet_url || importingSourceId === source.id}
                onClick={() => onImport(source.id)}
              >
                {importingSourceId === source.id ? "Importing..." : `Import ${getSourceLabel(source)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
