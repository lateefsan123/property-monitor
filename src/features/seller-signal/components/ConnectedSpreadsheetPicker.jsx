import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconChevronRight, IconFileSpreadsheet, IconFolder, IconTable } from "@tabler/icons-react";
import { integrationRequest } from "../../../integration-client";
import { integrationStatusOptions } from "../../../integration-query";
import SearchField from "../../../components/SearchField";
import { SHEET_PROVIDERS } from "./sheet-providers";

// Web port of mobile's connected-spreadsheet-picker: connect or upgrade the
// Google/Microsoft account, browse (Google search, OneDrive folders), choose a
// workbook, then a worksheet. Uses the same /api/integrations import
// operations as mobile.

export function SheetProviderIcon({ provider, size = 28 }) {
  return <img className="si-provider-logo" src={SHEET_PROVIDERS[provider].logo} alt="" width={size} height={size} />;
}

export default function ConnectedSpreadsheetPicker({ userId, provider, busy, onConnect, onImport, initialUrl }) {
  const [file, setFile] = useState(null);
  const [tab, setTab] = useState(null);
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageToken, setPageToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const status = useQuery(integrationStatusOptions(userId, integrationRequest));
  const connection = status.data?.find((item) => item.provider === provider && item.feature === "sheets");
  const capability = !connection?.connected ? undefined
    : provider === "google" && !connection.canBrowse ? "browse"
      : provider === "microsoft" && !connection.canReadWorkbook ? "workbook" : null;
  const ready = Boolean(connection?.connected) && capability === null;
  const folderId = folders.at(-1)?.id;
  const input = file ? { operation: "tabs", fileId: file.id, ...(file.driveId ? { driveId: file.driveId } : {}) }
    : initialUrl ? { operation: "resolve", url: initialUrl }
      : { operation: "browse", ...(folderId ? { folderId } : {}), ...(provider === "google" && query ? { query } : {}), ...(pageToken ? { pageToken } : {}) };
  const files = useQuery({
    queryKey: ["spreadsheet-import-picker", userId, provider, input],
    queryFn: ({ signal }) => integrationRequest({ action: "read", provider, feature: "sheets", input }, signal, userId),
    enabled: ready,
    staleTime: 30_000,
  });

  async function connect() {
    setConnecting(true);
    setConnectError("");
    try {
      await onConnect(capability);
    } catch (error) {
      setConnectError(error.message || "Could not start the connection. Try again.");
      setConnecting(false);
    }
  }

  function back() {
    setPageToken("");
    if (tab) setTab(null);
    else if (file) setFile(null);
    else setFolders((previous) => previous.slice(0, -1));
  }

  function choose(item) {
    setPageToken("");
    if (file) setTab(item.name);
    else if (item.folder) setFolders((previous) => [...previous, item]);
    else setFile(item);
  }

  const loading = status.isPending || (ready && files.isPending);
  const error = status.error || (ready && files.error);
  const items = files.data?.items || [];
  const crumbs = [SHEET_PROVIDERS[provider].name, ...folders.map((folder) => folder.name), file?.name].filter(Boolean);

  if (loading) {
    return <div className="si-state" role="status"><span className="si-spinner" aria-hidden="true" />Loading your {provider === "google" ? "Google Drive" : "OneDrive"}…</div>;
  }
  if (error) {
    return (
      <div className="si-state is-error" role="alert">
        <span>{error.message || "Could not load your spreadsheets."}</span>
        <button type="button" className="si-link" onClick={() => { void status.refetch(); void files.refetch(); }}>Try again</button>
      </div>
    );
  }

  if (connection && !ready) {
    return (
      <div className="si-connect">
        <SheetProviderIcon provider={provider} size={44} />
        <h3>{!connection.connected ? `Connect ${SHEET_PROVIDERS[provider].name}` : "Allow access to your files"}</h3>
        {provider === "microsoft" && <p className="si-note">Work or school accounts only. Repeat AI only reads your workbook.</p>}
        <button type="button" className="si-btn is-primary" disabled={busy || connecting || !connection.configured} onClick={connect}>
          {!connection.configured ? "Connection setup needed" : connecting ? "Opening sign-in…" : connection.connected ? "Allow access" : "Connect account"}
        </button>
        {connectError && <p className="si-error" role="alert">{connectError}</p>}
      </div>
    );
  }

  if (!connection) {
    return <div className="si-state">This connection isn’t available right now.</div>;
  }

  return (
    <div className="si-picker">
      {(file || folders.length > 0) && (
        <div className="si-picker-bar">
          <nav className="si-crumbs" aria-label="Location">
            {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`}>{crumb}</span>)}
          </nav>
          <button type="button" className="si-link" disabled={busy} onClick={back}>Back</button>
        </div>
      )}

      {!file && !initialUrl && provider === "google" && (
        <form className="si-search" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPageToken(""); }}>
          <SearchField className="is-full" placeholder="Search your Google Sheets" maxLength={100} value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => { setSearch(""); setQuery(""); setPageToken(""); }} />
        </form>
      )}

      {tab ? (
        <div className="si-confirm">
          <span className="si-confirm-icon" aria-hidden="true"><IconTable size={20} stroke={1.7} /></span>
          <div>
            <strong>{tab}</strong>
            <span>From {file.name} · imported as a new spreadsheet</span>
          </div>
          <button type="button" className="si-btn is-primary" disabled={busy} onClick={() => onImport({ provider, file, sheetName: tab })}>
            {busy ? "Importing…" : "Import worksheet"}
          </button>
        </div>
      ) : (
        <>
          {files.data?.kind === "resolved-file" && (
            <ul className="si-list">
              <li>
                <button type="button" className="si-list-item" disabled={busy} onClick={() => setFile(files.data.file)}>
                  <IconFileSpreadsheet size={18} stroke={1.7} aria-hidden="true" />
                  <span>{files.data.file.name}</span>
                  <IconChevronRight size={16} stroke={1.8} aria-hidden="true" />
                </button>
              </li>
            </ul>
          )}
          {items.length > 0 && (
            <ul className="si-list" aria-busy={files.isFetching}>
              {items.map((item) => (
                <li key={item.id || item.name}>
                  <button type="button" className="si-list-item" disabled={busy || files.isFetching} onClick={() => choose(item)}>
                    {file ? <IconTable size={18} stroke={1.7} aria-hidden="true" />
                      : item.folder ? <IconFolder size={18} stroke={1.7} aria-hidden="true" />
                        : <IconFileSpreadsheet size={18} stroke={1.7} aria-hidden="true" />}
                    <span>{item.name}</span>
                    <IconChevronRight size={16} stroke={1.8} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.data?.items?.length === 0 && (
            <div className="si-state">{file ? "This workbook has no worksheets." : query ? "No spreadsheets match your search." : "No spreadsheets here."}</div>
          )}
          {!file && (files.data?.nextPageToken || pageToken) && (
            <div className="si-pager">
              {pageToken && <button type="button" className="si-link" disabled={busy} onClick={() => setPageToken("")}>First page</button>}
              {files.data?.nextPageToken && <button type="button" className="si-link" disabled={busy || files.isFetching} onClick={() => setPageToken(files.data.nextPageToken)}>More files</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
