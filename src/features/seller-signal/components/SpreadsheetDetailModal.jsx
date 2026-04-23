import { useEffect, useState } from "react";

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 15 21 21 15 21" />
      <polyline points="3 9 3 3 9 3" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
      <path d="M21 9a9 9 0 0 0-15-6.7L3 5" />
      <path d="M3 15a9 9 0 0 0 15 6.7L21 19" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

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
    { id: "details", label: "Details", accent: "indigo", Icon: SettingsIcon },
    { id: "sync", label: "Sync", accent: "emerald", Icon: SyncIcon },
    ...(isLegacy ? [] : [{ id: "danger", label: "Danger zone", accent: "rose", Icon: TrashIcon }]),
  ];

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className="lead-modal lead-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lead-detail-header">
          <span className="lead-detail-header-icon" aria-hidden>
            <SheetIcon />
          </span>
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
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="lead-detail-body">
          <ul className="lead-detail-sections" role="tablist">
            {sections.map((section) => {
              const Icon = section.Icon;
              const active = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`lead-detail-section accent-${section.accent}${active ? " active" : ""}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="lead-detail-section-icon">
                      <Icon />
                    </span>
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
