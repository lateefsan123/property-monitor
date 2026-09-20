import { useEffect, useRef, useState } from "react";
import {
  IconArrowLeft,
  IconLink,
  IconFileSpreadsheet,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { parseSpreadsheetFile } from "../file-import";
import { previewSheetBuildings } from "../lead-import-services";

function UrlTab({ onSubmit, submitting, onClose, maxSelections }) {
  const [url, setUrl] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event?.preventDefault?.();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    if (!buildings.length) {
      setScanning(true);
      setError("");
      try {
        setBuildings(await previewSheetBuildings(trimmed));
      } catch (scanError) {
        setError(scanError?.message || "Could not scan this sheet.");
      } finally {
        setScanning(false);
      }
      return;
    }
    if (!selected.size) return;
    const ok = await onSubmit?.(trimmed, [...selected]);
    if (ok) onClose?.();
  }

  const filteredBuildings = buildings.filter((item) => item.building.toLowerCase().includes(query.trim().toLowerCase()));
  const totals = buildings.reduce((result, item) => selected.has(item.building)
    ? { rows: result.rows + item.rowCount, phones: result.phones + item.uniquePhoneCount }
    : result, { rows: 0, phones: 0 });
  const disabled = submitting || scanning || !url.trim() || (buildings.length > 0 && !selected.size);

  return (
    <form className="new-sheet-form" onSubmit={handleSubmit}>
      <div className="new-sheet-input-row">
        <input
          type="url"
          className="new-sheet-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste your Google Sheet link"
          autoFocus
          disabled={submitting}
        />
        <button
          type="submit"
          className="new-sheet-submit"
          disabled={disabled}
          aria-label="Add spreadsheet"
          title="Add spreadsheet"
        >
          {submitting || scanning ? (
            <span className="new-sheet-spinner" aria-hidden />
          ) : (
            <IconPlus size={18} stroke={2} aria-hidden="true" />
          )}
        </button>
      </div>

      {error && <div className="source-row-feedback source-row-feedback-error" role="alert">{error}</div>}

      {buildings.length > 0 && (
        <div className="new-sheet-building-picker">
          <div className="new-sheet-building-summary">
            <strong>Select buildings</strong>
            <span>{selected.size} selected · {totals.rows.toLocaleString()} rows · {totals.phones.toLocaleString()} phone entries</span>
            <small>Each building becomes its own spreadsheet card. You can add up to {maxSelections} more.</small>
          </div>
          <input className="new-sheet-building-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buildings" />
          <div className="new-sheet-building-actions">
            <button type="button" onClick={() => setSelected(new Set(filteredBuildings.slice(0, maxSelections).map((item) => item.building)))}>Select visible</button>
            <button type="button" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          <div className="new-sheet-building-list">
            {filteredBuildings.map((item) => (
              <label key={item.building} className="new-sheet-building-option">
                <input type="checkbox" checked={selected.has(item.building)} disabled={!selected.has(item.building) && selected.size >= maxSelections} onChange={() => setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(item.building)) next.delete(item.building); else if (next.size < maxSelections) next.add(item.building);
                  return next;
                })} />
                <span>{item.building}</span>
                <small>{item.rowCount.toLocaleString()} rows · {item.uniquePhoneCount.toLocaleString()} phones</small>
              </label>
            ))}
          </div>
        </div>
      )}

      {!buildings.length && <div className="new-sheet-instructions">
        <h3 className="new-sheet-instructions-title">How to get your spreadsheet link</h3>
        <ol className="new-sheet-steps">
          <li>
            <span className="new-sheet-step-num">1</span>
            <span className="new-sheet-step-text">
              Open your sheet at <strong>sheets.google.com</strong> (or upload an Excel file via <strong>File &rarr; Import</strong>).
            </span>
          </li>
          <li>
            <span className="new-sheet-step-num">2</span>
            <span className="new-sheet-step-text">
              Click <strong>Share</strong> in the top right and set access to <em>Anyone with the link</em>.
            </span>
          </li>
          <li>
            <span className="new-sheet-step-num">3</span>
            <span className="new-sheet-step-text">
              Copy the URL from your browser&rsquo;s address bar and paste it above.
            </span>
          </li>
        </ol>
      </div>}
    </form>
  );
}

function FileTab({ onImportFile, onClose, submitting, onBusyChange }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function handleImport(event) {
    event.preventDefault();
    if (!file || lock.current || submitting) return;
    lock.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const rows = await parseSpreadsheetFile(file);
      if (await onImportFile(file, rows)) onClose();
    } catch (err) {
      setError(err.message || "Could not import this file.");
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <form className="new-sheet-form" onSubmit={handleImport}>
      <p className="new-sheet-picture-hint">Import sellers from Excel or CSV. One worksheet, up to 10 MB.</p>
      <div className="screenshot-panel-controls">
        <input type="file" accept=".xlsx,.xls,.csv" aria-label="Choose spreadsheet"
          disabled={busy || submitting} onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
          }} />
        <button type="submit" className="sheet-add-btn" disabled={!file || busy || submitting}>
          {busy || submitting ? "Importing..." : "Import"}
        </button>
      </div>
      {error && <div className="source-row-feedback source-row-feedback-error" role="alert">{error}</div>}
    </form>
  );
}

export default function NewSpreadsheetModal({ onClose, onSubmit, onImportFile, submitting, maxSelections = 10 }) {
  const [mode, setMode] = useState(null);
  const [fileBusy, setFileBusy] = useState(false);
  const locked = submitting || fileBusy;

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" && !locked) onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, locked]);

  const title = mode === "url"
    ? "From a Google Sheet URL"
    : mode === "file"
      ? "Import Excel (.xlsx)"
      : "Add a spreadsheet";

  return (
    <div className="lead-modal-backdrop" onClick={locked ? undefined : onClose}>
      <div
        className="lead-modal new-sheet-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lead-modal-header">
          <div className="lead-modal-title-block">
            {mode && (
              <button
                type="button"
                className="new-sheet-back"
                disabled={locked}
                onClick={() => setMode(null)}
                aria-label="Back"
              >
                <IconArrowLeft size={18} stroke={2} aria-hidden="true" />
              </button>
            )}
            <h2 className="lead-modal-name">{title}</h2>
          </div>
          <button type="button" className="lead-modal-close" onClick={onClose} disabled={locked} aria-label="Close">
            <IconX className="icon" size={16} stroke={2} aria-hidden="true" />
          </button>
        </div>

        <div className="lead-modal-body">
          {mode === null && (
            <div className="new-sheet-choice">
              <button
                type="button"
                className="new-sheet-choice-card"
                onClick={() => setMode("url")}
              >
                <span className="new-sheet-choice-icon" aria-hidden>
                  <IconLink size={22} stroke={1.8} aria-hidden="true" />
                </span>
                <span className="new-sheet-choice-text">
                  <span className="new-sheet-choice-title">URL to spreadsheet</span>
                  <span className="new-sheet-choice-desc">Paste a Google Sheet link.</span>
                </span>
              </button>
              <button
                type="button"
                className="new-sheet-choice-card"
                onClick={() => setMode("file")}
              >
                <span className="new-sheet-choice-icon" aria-hidden>
                  <IconFileSpreadsheet size={22} stroke={1.8} aria-hidden="true" />
                </span>
                <span className="new-sheet-choice-text">
                  <span className="new-sheet-choice-title">Import Excel (.xlsx)</span>
                  <span className="new-sheet-choice-desc">Upload an Excel or CSV file.</span>
                </span>
              </button>
            </div>
          )}

          {mode === "url" && (
            <UrlTab onSubmit={onSubmit} submitting={submitting} onClose={onClose} maxSelections={maxSelections} />
          )}

          {mode === "file" && <FileTab onImportFile={onImportFile} onClose={onClose} submitting={submitting} onBusyChange={setFileBusy} />}
        </div>
      </div>
    </div>
  );
}
