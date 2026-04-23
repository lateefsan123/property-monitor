import { useEffect, useRef, useState } from "react";
import { downloadAsXlsx, extractTableFromImages } from "../image-to-sheet";

function CloseIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UrlTab({ onSubmit, submitting, onClose }) {
  const [url, setUrl] = useState("");

  async function handleSubmit(event) {
    event?.preventDefault?.();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    const ok = await onSubmit?.(trimmed);
    if (ok) onClose?.();
  }

  const disabled = submitting || !url.trim();

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
          {submitting ? (
            <span className="new-sheet-spinner" aria-hidden />
          ) : (
            <PlusIcon />
          )}
        </button>
      </div>

      <div className="new-sheet-instructions">
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
      </div>
    </form>
  );
}

function PictureTab() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState("extracted");
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleFilesSelected(list) {
    const picked = Array.from(list || []).filter((f) => f.type.startsWith("image/"));
    setFiles(picked);
    setPreview(null);
    setError("");
    setStatus(picked.length ? `${picked.length} screenshot${picked.length === 1 ? "" : "s"} ready.` : "");
  }

  async function handleExtract() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setStatus("Reading screenshots with AI. This can take 20-60 seconds...");
    try {
      const result = await extractTableFromImages(files);
      setPreview(result);
      setStatus(`Detected ${result.rows.length} row${result.rows.length === 1 ? "" : "s"} across ${result.headers.length} columns.`);
    } catch (err) {
      setError(err.message || "Could not extract table.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!preview) return;
    try {
      await downloadAsXlsx(preview, { filename: filename || "extracted", sheetName: filename || "Sheet1" });
    } catch (err) {
      setError(err.message || "Could not build .xlsx file.");
    }
  }

  function handleReset() {
    setFiles([]);
    setPreview(null);
    setStatus("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewHeaders = preview?.headers || [];
  const previewRows = preview?.rows || [];
  const truncatedRows = previewRows.slice(0, 10);

  return (
    <div className="new-sheet-picture">
      <p className="new-sheet-picture-hint">
        Upload one or more screenshots of a spreadsheet. We OCR the tables and give you a downloadable .xlsx file.
      </p>

      <div className="screenshot-panel-controls">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          disabled={busy}
        />
        <input
          type="text"
          className="screenshot-panel-filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="Filename"
          disabled={busy}
        />
        <button
          type="button"
          className="sheet-add-btn"
          disabled={!files.length || busy}
          onClick={handleExtract}
        >
          {busy ? "Extracting..." : "Extract"}
        </button>
        <button
          type="button"
          className="sheet-add-btn"
          disabled={!preview || busy}
          onClick={handleDownload}
        >
          Download .xlsx
        </button>
        {(files.length > 0 || preview) && !busy && (
          <button type="button" className="source-row-clear" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {status && <div className="source-row-feedback source-row-feedback-notice" role="status">{status}</div>}
      {error && <div className="source-row-feedback source-row-feedback-error" role="alert">{error}</div>}

      {preview && previewHeaders.length > 0 && (
        <div className="screenshot-preview">
          <div className="screenshot-preview-title">
            Preview ({truncatedRows.length} of {previewRows.length} rows)
          </div>
          <div className="screenshot-preview-scroll">
            <table>
              <thead>
                <tr>{previewHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {truncatedRows.map((row, ri) => (
                  <tr key={ri}>
                    {previewHeaders.map((_, ci) => <td key={ci}>{row[ci] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function NewSpreadsheetModal({ onClose, onSubmit, submitting }) {
  const [mode, setMode] = useState(null);

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

  const title = mode === "url"
    ? "From a Google Sheet URL"
    : mode === "picture"
      ? "From a spreadsheet picture"
      : "Add a spreadsheet";

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
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
                onClick={() => setMode(null)}
                aria-label="Back"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="lead-modal-name">{title}</h2>
          </div>
          <button type="button" className="lead-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
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
                  <LinkIcon />
                </span>
                <span className="new-sheet-choice-text">
                  <span className="new-sheet-choice-title">URL to spreadsheet</span>
                  <span className="new-sheet-choice-desc">Paste a Google Sheet link.</span>
                </span>
              </button>
              <button
                type="button"
                className="new-sheet-choice-card"
                onClick={() => setMode("picture")}
              >
                <span className="new-sheet-choice-icon" aria-hidden>
                  <ImageIcon />
                </span>
                <span className="new-sheet-choice-text">
                  <span className="new-sheet-choice-title">Picture to spreadsheet</span>
                  <span className="new-sheet-choice-desc">Upload a screenshot and we&rsquo;ll OCR the table.</span>
                </span>
              </button>
            </div>
          )}

          {mode === "url" && (
            <UrlTab onSubmit={onSubmit} submitting={submitting} onClose={onClose} />
          )}

          {mode === "picture" && <PictureTab />}
        </div>
      </div>
    </div>
  );
}
