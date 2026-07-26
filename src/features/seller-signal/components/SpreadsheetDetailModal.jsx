import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";

function DetailsPanel({ name, url, placeholderName, isLegacy, onNameChange, onUrlChange, onBlurSave }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Details</h3>
        <p className="lead-detail-panel-subtitle">Name and Google Sheet URL for this spreadsheet.</p>
      </div>
      <div className="lead-edit-form">
        <div className="lead-edit-grid">
          <label className="lead-edit-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onBlurSave}
              placeholder={placeholderName}
              disabled={isLegacy}
            />
          </label>

          <label className="lead-edit-field lead-edit-field-wide">
            <span>Google Sheet URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onBlur={onBlurSave}
              placeholder="https://docs.google.com/spreadsheets/..."
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function SyncPanel({ count, importing, url, notice, error, onImport }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Sync</h3>
        <p className="lead-detail-panel-subtitle">
          Pull the latest rows from Google Sheets into this spreadsheet.
        </p>
      </div>

      <div className="lead-detail-grid">
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Leads</span>
          <span className="lead-detail-cell-value">{count}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Sheet URL</span>
          <span className="lead-detail-cell-value">{url ? "Connected" : "Not set"}</span>
        </div>
      </div>

      {notice && (
        <div className="source-row-feedback source-row-feedback-notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="source-row-feedback source-row-feedback-error" role="alert">
          {error}
        </div>
      )}

      <div className="lead-edit-actions">
        <button
          type="button"
          className="sheet-add-btn"
          disabled={!url || importing}
          onClick={onImport}
        >
          {importing ? "Importing..." : "Import now"}
        </button>
      </div>
    </div>
  );
}

function DangerPanel({ clearing, onRemove }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Danger zone</h3>
        <p className="lead-detail-panel-subtitle">
          Disconnect this spreadsheet. Sellers already imported remain in your database.
        </p>
      </div>
      <div className="lead-edit-actions">
        <button
          type="button"
          className="source-row-clear"
          disabled={clearing}
          onClick={onRemove}
        >
          {clearing ? "Removing..." : "Remove spreadsheet"}
        </button>
      </div>
    </div>
  );
}

export default function SpreadsheetDetailModal({
  source,
  index,
  count,
  importing,
  clearing,
  isLegacy = false,
  notice,
  error,
  onClose,
  onSave,
  onImport,
  onClear,
}) {
  const initialName = isLegacy ? "Legacy spreadsheet" : (source?.name ?? "");
  const initialUrl = source?.sheet_url ?? "";
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [activeSection, setActiveSection] = useState("details");

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSave() {
    if (isLegacy) return;
    if (name === initialName && url === initialUrl) return;
    onSave?.(source.id, { label: name, building_name: null, sheet_url: url });
  }

  function handleImport() {
    if (isLegacy) {
      onImport?.();
    } else {
      onImport?.(source.id, { label: name, building_name: null, sheet_url: url });
    }
  }

  function handleRemove() {
    if (isLegacy) return;
    onClear?.(source.id);
    onClose?.();
  }

  const placeholderName = `Spreadsheet ${index + 1}`;
  const title = isLegacy ? "Legacy spreadsheet" : (name || placeholderName);
  const subtitle = `${count} lead${count === 1 ? "" : "s"}`;

  const sections = [
    { id: "details", label: "Details" },
    { id: "sync", label: "Sync" },
    ...(isLegacy ? [] : [{ id: "danger", label: "Danger zone" }]),
  ];

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className="lead-modal lead-detail-modal spreadsheet-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lead-detail-header">
          <div className="lead-detail-header-title">
            <h2 className="lead-detail-name">{title}</h2>
            <span className="lead-detail-building">{subtitle}</span>
          </div>
          <div className="lead-detail-header-actions">
            <button
              type="button"
              className="lead-detail-close"
              onClick={onClose}
              aria-label="Close"
            >
              <IconX size={16} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lead-detail-body">
          <ul className="lead-detail-sections" role="tablist">
            {sections.map((section) => {
              const active = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`lead-detail-section${active ? " active" : ""}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="lead-detail-section-label">{section.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="lead-detail-content">
            {activeSection === "details" && (
              <DetailsPanel
                name={name}
                url={url}
                placeholderName={placeholderName}
                isLegacy={isLegacy}
                onNameChange={setName}
                onUrlChange={setUrl}
                onBlurSave={handleSave}
              />
            )}
            {activeSection === "sync" && (
              <SyncPanel
                count={count}
                importing={importing}
                url={url}
                notice={notice}
                error={error}
                onImport={handleImport}
              />
            )}
            {activeSection === "danger" && !isLegacy && (
              <DangerPanel clearing={clearing} onRemove={handleRemove} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
