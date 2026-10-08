import { useEffect, useRef, useState } from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconCloudUpload,
  IconLink,
  IconTable,
  IconX,
} from "@tabler/icons-react";
import SearchField from "../../../components/SearchField";
import { beginIntegrationConnect, integrationRequest } from "../../../integration-client";
import { rememberSpreadsheetImport, takeSpreadsheetImport } from "../../../integration-resume";
import { parseSpreadsheetFile } from "../file-import";
import { previewSheetBuildings } from "../lead-import-services";
import ConnectedSpreadsheetPicker, { SheetProviderIcon } from "./ConnectedSpreadsheetPicker";
import { SHEET_PROVIDERS } from "./sheet-providers";
import { readConnectedSheetRows } from "../../../../shared/connected-sheet-rows.js";
import "../../../styles/spreadsheet-import.css";

// Import spreadsheet: the same four choices as the mobile app (file, link,
// Google Sheets account, Microsoft Excel account), each a one-screen step.
const OPTIONS = [
  { id: "file", title: "Import file", detail: "Excel or CSV from your computer", icon: IconTable },
  { id: "url", title: "Import from link", detail: "Google Sheets, OneDrive or SharePoint link", icon: IconLink },
  { id: "google", title: "Google Sheets", detail: "Choose from your Google account", provider: "google" },
  { id: "microsoft", title: "Microsoft Excel", detail: "Choose from OneDrive", provider: "microsoft" },
];

const TITLES = {
  file: "Import file",
  url: "Import from link",
  google: "Google Sheets",
  microsoft: "Microsoft Excel",
};

const isMicrosoftLink = (value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "1drv.ms" || host === "onedrive.live.com" || host.endsWith(".sharepoint.com");
  } catch {
    return false;
  }
};

function UrlStep({ onSubmit, submitting, onClose, maxSelections, onMicrosoftLink }) {
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
    if (isMicrosoftLink(trimmed)) {
      onMicrosoftLink(trimmed);
      return;
    }
    if (!buildings.length) {
      setScanning(true);
      setError("");
      try {
        setBuildings(await previewSheetBuildings(trimmed));
      } catch (scanError) {
        setError(scanError?.message || "Could not read this sheet. Check it is shared as “Anyone with the link”.");
      } finally {
        setScanning(false);
      }
      return;
    }
    if (!selected.size) return;
    const ok = await onSubmit?.(trimmed, [...selected]);
    if (ok) onClose?.();
  }

  const filtered = buildings.filter((item) => item.building.toLowerCase().includes(query.trim().toLowerCase()));
  const totals = buildings.reduce((result, item) => selected.has(item.building)
    ? { rows: result.rows + item.rowCount, phones: result.phones + item.uniquePhoneCount }
    : result, { rows: 0, phones: 0 });
  const busy = submitting || scanning;

  return (
    <form id="si-url-form" className="si-step" onSubmit={handleSubmit}>
      <label className="si-field">
        <span>Spreadsheet link</span>
        <input
          type="url"
          value={url}
          onChange={(event) => { setUrl(event.target.value); if (buildings.length) { setBuildings([]); setSelected(new Set()); } }}
          placeholder="https://docs.google.com/spreadsheets/…"
          autoFocus
          disabled={busy}
        />
      </label>
      {error && <p className="si-error" role="alert">{error}</p>}

      {buildings.length > 0 ? (
        <div className="si-buildings">
          <div className="si-buildings-head">
            <strong>Choose buildings</strong>
            <span>{selected.size} selected · {totals.rows.toLocaleString()} rows · {totals.phones.toLocaleString()} phones</span>
          </div>
          <p className="si-hint">Each building becomes its own spreadsheet. You can add up to {maxSelections} more.</p>
          <div className="si-buildings-tools">
            <SearchField className="is-full" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="Search buildings" />
            <button type="button" className="si-link" onClick={() => setSelected(new Set(filtered.slice(0, maxSelections).map((item) => item.building)))}>Select visible</button>
            <button type="button" className="si-link" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          <ul className="si-check-list">
            {filtered.map((item) => {
              const checked = selected.has(item.building);
              return (
                <li key={item.building}>
                  <label className={checked ? "is-checked" : ""}>
                    <input type="checkbox" checked={checked} disabled={!checked && selected.size >= maxSelections} onChange={() => setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(item.building)) next.delete(item.building); else if (next.size < maxSelections) next.add(item.building);
                      return next;
                    })} />
                    <span>{item.building}</span>
                    <small>{item.rowCount.toLocaleString()} rows · {item.uniquePhoneCount.toLocaleString()} phones</small>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <ol className="si-steps">
          <li><span>1</span>Open your sheet in Google Sheets, OneDrive or SharePoint.</li>
          <li><span>2</span>For Google Sheets, click <strong>Share</strong> and set access to <em>Anyone with the link</em>.</li>
          <li><span>3</span>Copy the link from your browser and paste it above.</li>
        </ol>
      )}

      <div className="si-footer">
        <button type="submit" className="si-btn is-primary" disabled={busy || !url.trim() || (buildings.length > 0 && !selected.size)}>
          {scanning ? "Reading sheet…" : submitting ? "Adding…" : buildings.length ? `Add ${selected.size || ""} ${selected.size === 1 ? "spreadsheet" : "spreadsheets"}`.replace("  ", " ") : "Continue"}
        </button>
      </div>
    </form>
  );
}

function FileStep({ onImportFile, onClose, submitting, onBusyChange }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lock = useRef(false);
  const inputRef = useRef(null);

  function pick(next) {
    if (!next) return;
    if (!/\.(xlsx|xls|csv)$/i.test(next.name)) {
      setError("Choose an .xlsx, .xls or .csv file.");
      return;
    }
    setFile(next);
    setError("");
  }

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

  const disabled = busy || submitting;
  return (
    <form className="si-step" onSubmit={handleImport}>
      <label
        className={`si-drop${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) pick(event.dataTransfer.files?.[0]); }}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" aria-label="Choose spreadsheet file" disabled={disabled}
          onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} />
        {file ? (
          <>
            <span className="si-drop-icon is-file" aria-hidden="true"><IconTable size={28} stroke={1.5} /></span>
            <strong>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2)} MB · click to choose a different file</span>
          </>
        ) : (
          <>
            <span className="si-drop-icon" aria-hidden="true"><IconCloudUpload size={28} stroke={1.5} /></span>
            <strong>Drop your spreadsheet here</strong>
            <span>or <u>browse your computer</u> · Excel or CSV, one worksheet, up to 10 MB</span>
          </>
        )}
      </label>
      {error && <p className="si-error" role="alert">{error}</p>}
      <div className="si-footer">
        <button type="submit" className="si-btn is-primary" disabled={!file || disabled}>
          {disabled ? "Importing…" : "Import sellers"}
        </button>
      </div>
    </form>
  );
}

export default function NewSpreadsheetModal({
  userId,
  onClose,
  onSubmit,
  onImportFile,
  onImportRows,
  submitting,
  maxSelections = 10,
  initialMode = null,
}) {
  const [mode, setMode] = useState(initialMode);
  const [excelUrl, setExcelUrl] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [connectedBusy, setConnectedBusy] = useState(false);
  const [connectedError, setConnectedError] = useState("");
  const locked = submitting || fileBusy || connectedBusy;

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

  function go(next) {
    setConnectedError("");
    if (next === "microsoft") setExcelUrl("");
    setMode(next);
  }

  async function connect(provider, capability) {
    rememberSpreadsheetImport(provider);
    try {
      await beginIntegrationConnect(integrationRequest, provider, "sheets", capability);
    } catch (error) {
      takeSpreadsheetImport();
      throw error;
    }
  }

  async function importConnected({ provider, file, sheetName }) {
    if (connectedBusy) return;
    setConnectedBusy(true);
    setConnectedError("");
    try {
      const rawRows = await readConnectedSheetRows(integrationRequest, { provider, file, sheetName, userId });
      const ok = await onImportRows({
        key: `${provider}:${file.driveId || ""}:${file.id}:${sheetName}`,
        label: `${file.name.replace(/\.(xlsx|xls|csv)$/i, "")} · ${sheetName}`,
        rawRows,
      });
      if (ok) onClose?.();
    } catch (error) {
      setConnectedError(error.message || "Could not import this worksheet.");
    } finally {
      setConnectedBusy(false);
    }
  }

  const provider = mode === "google" || mode === "microsoft" ? mode : null;

  return (
    <div className="si-backdrop" onClick={locked ? undefined : onClose}>
      <div
        className="si-modal"
        role="dialog"
        aria-modal="true"
        {...(mode ? { "aria-label": `Import spreadsheet: ${TITLES[mode]}` } : { "aria-labelledby": "si-title" })}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Steps show only back and close; the step content names itself. */}
        <header className={`si-header${mode ? " is-step" : ""}`}>
          {mode ? (
            <button type="button" className="si-icon-btn" disabled={locked} onClick={() => go(null)} aria-label="Back to import options">
              <IconArrowLeft size={18} stroke={2} aria-hidden="true" />
            </button>
          ) : null}
          <div className="si-heading">
            {!mode && (
              <>
                <h2 id="si-title">Import spreadsheet</h2>
                <p>Bring your sellers in from a file, a link or a connected account.</p>
              </>
            )}
          </div>
          <button type="button" className="si-icon-btn" onClick={onClose} disabled={locked} aria-label="Close">
            <IconX size={18} stroke={2} aria-hidden="true" />
          </button>
        </header>

        <div className="si-body">
          {mode === null && (
            <ul className="si-options">
              {OPTIONS.map((option) => (
                <li key={option.id}>
                  <button type="button" className="si-option" onClick={() => go(option.id)}>
                    <span className={`si-option-icon${option.provider ? " is-logo" : ""}`} aria-hidden="true">
                      {option.provider ? <SheetProviderIcon provider={option.provider} size={26} /> : <option.icon size={22} stroke={1.7} />}
                    </span>
                    <span className="si-option-text">
                      <strong>{option.title}</strong>
                      <span>{option.detail}</span>
                    </span>
                    <IconChevronRight size={18} stroke={1.8} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {mode === "file" && <FileStep onImportFile={onImportFile} onClose={onClose} submitting={submitting} onBusyChange={setFileBusy} />}

          {mode === "url" && (
            <UrlStep
              onSubmit={onSubmit}
              submitting={submitting}
              onClose={onClose}
              maxSelections={maxSelections}
              onMicrosoftLink={(link) => { setExcelUrl(link); setMode("microsoft"); }}
            />
          )}

          {provider && (
            <div className="si-step">
              <ConnectedSpreadsheetPicker
                key={`${provider}:${excelUrl}`}
                userId={userId}
                provider={provider}
                busy={connectedBusy || submitting}
                initialUrl={provider === "microsoft" && excelUrl ? excelUrl : undefined}
                onConnect={(capability) => connect(provider, capability)}
                onImport={importConnected}
              />
              {connectedError && <p className="si-error" role="alert">{connectedError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
