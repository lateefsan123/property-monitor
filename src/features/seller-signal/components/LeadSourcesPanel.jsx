import { useState } from "react";

export default function LeadSourcesPanel({
  sources,
  importingSourceId,
  leadCounts,
  onImport,
  onSourceChange,
  onSourceSave,
  legacySheetUrl,
  importingLegacy,
  onLegacyUrlChange,
  onLegacyImport,
}) {
  const [open, setOpen] = useState(false);

  if (!sources?.length) return null;

  const legacyCount = leadCounts?.legacy || 0;
  const totalLeads = sources.reduce((sum, s) => sum + (leadCounts?.[s.id] || 0), 0) + legacyCount;
  const showLegacyRow = true;

  return (
    <div className="source-panel">
      <button
        type="button"
        className="source-panel-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="source-panel-toggle-icon">{open ? "\u25BE" : "\u25B8"}</span>
        <h3 className="source-panel-title">Spreadsheets</h3>
        <span className="source-panel-subtitle">
          {sources.length} source{sources.length !== 1 && "s"} · {totalLeads} leads
        </span>
      </button>

      {open && (
        <div className="source-list">
          {sources.map((source) => {
            const count = leadCounts?.[source.id] || 0;
            const labelValue = source.building_name || source.label || "";
            const importing = importingSourceId === source.id;
            return (
              <div className="source-row" key={source.id}>
                <input
                  className="source-row-name"
                  type="text"
                  value={labelValue}
                  onChange={(e) => onSourceChange(source.id, "building_name", e.target.value)}
                  onBlur={() => onSourceSave(source.id)}
                  placeholder="Building name"
                />
                <input
                  className="source-row-url"
                  type="text"
                  value={source.sheet_url || ""}
                  onChange={(e) => onSourceChange(source.id, "sheet_url", e.target.value)}
                  onBlur={() => onSourceSave(source.id)}
                  placeholder="Google Sheet URL"
                />
                <span className="source-row-count">{count} leads</span>
                <button
                  type="button"
                  className="source-row-import"
                  disabled={!source.sheet_url || importing}
                  onClick={() => onImport(source.id)}
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
                value={legacySheetUrl || ""}
                onChange={(e) => onLegacyUrlChange?.(e.target.value)}
                placeholder="Google Sheet URL"
              />
              <span className="source-row-count">{legacyCount} leads</span>
              <button
                type="button"
                className="source-row-import"
                disabled={!legacySheetUrl || importingLegacy}
                onClick={() => onLegacyImport?.()}
              >
                {importingLegacy ? "Importing..." : "Import"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
