import { useRef, useState } from "react";
import { useSpreadsheetsPage } from "../useSpreadsheetsPage";
import { downloadAsXlsx, extractTableFromImages } from "../image-to-sheet";

function isPlaceholderSourceLabel(source) {
  const label = String(source?.label || "").trim();
  return Boolean(label) && /^Spreadsheet\s+\d+$/i.test(label);
}

function getSourceNameValue(source) {
  const buildingName = String(source?.building_name || "").trim();
  const label = String(source?.label || "").trim();
  if (buildingName && (!label || isPlaceholderSourceLabel(source))) return buildingName;
  return label || buildingName || "";
}

function SourceRow({ source, index, count, importing, clearing, onSave, onImport, onClear }) {
  const [name, setName] = useState(() => getSourceNameValue(source));
  const [url, setUrl] = useState(() => source.sheet_url ?? "");

  function handleBlur() {
    if (name !== getSourceNameValue(source) || url !== (source.sheet_url ?? "")) {
      onSave(source.id, { label: name, building_name: null, sheet_url: url });
    }
  }

  function handleImport() {
    onImport(source.id, { label: name, building_name: null, sheet_url: url });
  }

  return (
    <div className="source-row-item">
      <div className="source-row">
        <input
          className="source-row-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          placeholder={`Spreadsheet ${index + 1}`}
        />
        <input
          className="source-row-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleBlur}
          placeholder="Google Sheet URL"
        />
        <span className="source-row-count">{count} leads</span>
        <button
          type="button"
          className="source-row-import"
          disabled={!url || importing}
          onClick={handleImport}
        >
          {importing ? "Importing..." : "Import"}
        </button>
        <button
          type="button"
          className="source-row-clear"
          disabled={clearing}
          onClick={() => onClear(source.id)}
        >
          {clearing ? "Removing..." : "Remove"}
        </button>
      </div>
      {source.notice && (
        <div className="source-row-feedback source-row-feedback-notice" role="status">
          {source.notice}
        </div>
      )}
      {source.error && (
        <div className="source-row-feedback source-row-feedback-error" role="alert">
          {source.error}
        </div>
      )}
    </div>
  );
}

function ScreenshotToSheetPanel() {
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
    <div className="screenshot-panel">
      <div className="screenshot-panel-header">
        <h3>Screenshot &rarr; Excel</h3>
        <p className="screenshot-panel-hint">
          Upload one or more screenshots of a spreadsheet. We OCR the tables and give you a downloadable .xlsx file.
        </p>
      </div>

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

export default function SpreadsheetsPage({ userId }) {
  const page = useSpreadsheetsPage(userId);

  if (page.loading) {
    return (
      <div className="page">
        <div className="lead-list" aria-busy="true" aria-label="Loading spreadsheets">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-card-row">
                <div className="skeleton-stack">
                  <div className="skeleton-bar tall medium" />
                  <div className="skeleton-bar long" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const legacyCount = page.sourceCounts?.legacy || 0;
  const totalLeads = page.leadSources.reduce(
    (sum, s) => sum + (page.sourceCounts?.[s.id] || 0),
    0,
  ) + legacyCount;
  const showLegacyRow = legacyCount > 0 || Boolean(page.legacySheetUrl);
  const hasNamedSources = page.leadSources.length > 0;

  return (
    <div className="page">
      <div className="sheet-header">
        <p className="page-subtitle">
          {page.leadSources.length} source{page.leadSources.length !== 1 && "s"} &middot; {totalLeads} leads
        </p>
        <div className="sheet-sync-info">
          <span className="sheet-sync-label">Imports are manual</span>
          <span className="sheet-sync-note">Import replaces the sellers owned by that spreadsheet.</span>
        </div>
      </div>

      <ScreenshotToSheetPanel />

      <div className="sheet-instructions">
        <h3>How to get your Google Sheets URL</h3>
        <ol>
          <li>Go to <strong>Google Sheets</strong> (sheets.google.com)</li>
          <li>If you have an Excel file, open it in Google Sheets using <strong>File &rarr; Import</strong></li>
          <li>Click <strong>Share</strong> in the top-right corner and set access to <strong>"Anyone with the link"</strong></li>
          <li>Copy the URL from your browser's address bar and paste it below</li>
        </ol>
      </div>

      {page.notice && <div className="notice">{page.notice}</div>}
      {page.error && <div className="error">{page.error}</div>}

      <div className="sheet-actions">
        <button
          type="button"
          className="sheet-add-btn"
          disabled={!page.canAddSource || page.addingSource}
          onClick={() => page.actions.addSource()}
        >
          {page.addingSource ? "Adding..." : "Add Spreadsheet"}
        </button>
        {!page.canAddSource && <span className="sheet-limit-note">Maximum 10 spreadsheets.</span>}
      </div>

      {!hasNamedSources && !showLegacyRow ? (
        <div className="sheet-empty-state">
          <h3>No spreadsheets yet</h3>
          <p>Add a spreadsheet only when you need one. It will appear here once you create it.</p>
        </div>
      ) : (
        <div className="source-list">
          {page.leadSources.map((source, index) => (
            <SourceRow
              key={`${source.id}:${source.building_name ?? ""}:${source.sheet_url ?? ""}`}
              source={{
                ...source,
                ...(page.sourceFeedbackById?.[source.id] || {}),
              }}
              index={index}
              count={page.sourceCounts?.[source.id] || 0}
              importing={page.importingSourceId === source.id}
              clearing={page.clearingSourceId === source.id}
              onSave={page.actions.saveLeadSource}
              onImport={page.actions.importFromSheet}
              onClear={page.actions.clearSource}
            />
          ))}
          {showLegacyRow && (
            <div className="source-row-item" key="legacy">
              <div className="source-row">
                <input
                  className="source-row-name"
                  type="text"
                  value="Legacy spreadsheet"
                  readOnly
                />
                <input
                  className="source-row-url"
                  type="text"
                  value={page.legacySheetUrl || ""}
                  onChange={(e) => page.actions.updateLegacySheetUrl(e.target.value)}
                  placeholder="Google Sheet URL"
                />
                <span className="source-row-count">{legacyCount} leads</span>
                <button
                  type="button"
                  className="source-row-import"
                  disabled={!page.legacySheetUrl || page.importingLegacy}
                  onClick={() => page.actions.importLegacySheet()}
                >
                  {page.importingLegacy ? "Importing..." : "Import"}
                </button>
              </div>
              {page.legacyNotice && (
                <div className="source-row-feedback source-row-feedback-notice" role="status">
                  {page.legacyNotice}
                </div>
              )}
              {page.legacyError && (
                <div className="source-row-feedback source-row-feedback-error" role="alert">
                  {page.legacyError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
