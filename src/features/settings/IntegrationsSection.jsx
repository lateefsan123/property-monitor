import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronRight, IconX } from "@tabler/icons-react";
import { integrationStatusOptions } from "../../integration-query";
import { beginIntegrationConnect, integrationRequest } from "../../integration-client";
import IntegrationWorkspace from "../seller-signal/components/IntegrationWorkspace";
import "../../styles/integration-connections.css";

// Web port of mobile's Integrations (mobile/src/workspace/integrations.js):
// apps grouped into Connected / Not connected; a connected app opens in a
// dialog with its tools and a Disconnect action.
const APPS = [
  ["google", "sheets", "Google Sheets", "Choose spreadsheets and preview their rows.", "https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png"],
  ["microsoft", "sheets", "Microsoft Excel", "Browse OneDrive and open your worksheets.", "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/excel_48x1.png"],
  ["google", "email", "Gmail", "Read your inbox and prepare seller follow-ups.", "https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"],
  ["microsoft", "email", "Outlook", "Read your inbox and prepare seller follow-ups.", "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png"],
  ["google", "calendar", "Google Calendar", "See upcoming meetings and viewings.", "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png"],
  ["microsoft", "calendar", "Outlook Calendar", "See upcoming meetings and viewings.", "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png"],
];

function AppDialog({ app, connection, busy, onClose, onUpgrade, onDisconnect }) {
  const [provider, feature, name, description, logo] = app;
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    function onKey(event) { if (event.key === "Escape" && !busy) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return (
    <div className="st-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="st-dialog is-wide" role="dialog" aria-modal="true" aria-labelledby="st-app-title">
        <header className="st-app-head">
          <img src={logo} alt="" width="36" height="36" referrerPolicy="no-referrer" />
          <div><h2 id="st-app-title">{name}</h2><small>Connected</small></div>
          <button type="button" className="st-icon-close is-round" onClick={onClose} disabled={busy} aria-label="Close integration"><IconX size={20} stroke={1.8} aria-hidden="true" /></button>
        </header>
        <div className="st-dialog-body">
          <p className="st-note">{description}</p>
          <div className="integration-detail">
            <IntegrationWorkspace key={`${provider}-${feature}`} provider={provider} feature={feature} connection={connection} request={integrationRequest} upgrade={onUpgrade} />
          </div>
          {confirming ? (
            <div className="st-confirm" role="group" aria-label={`Disconnect ${name}`}>
              <p>Disconnect {name}? Your files and emails stay untouched. You can revoke access separately in your provider account.</p>
              <div>
                <button type="button" className="st-secondary" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
                <button type="button" className="st-secondary is-danger" disabled={busy} onClick={onDisconnect}>{busy ? "Disconnecting…" : "Disconnect"}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="st-disconnect" disabled={busy} onClick={() => setConfirming(true)}>Disconnect</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsSection({ userId }) {
  const cache = useQueryClient();
  const options = integrationStatusOptions(userId, integrationRequest);
  const status = useQuery(options);
  const connections = status.data;
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");
  const [pending, setPending] = useState("");

  async function change(provider, feature, capability, disconnect = false) {
    if (pending) return;
    setPending(`${provider}-${feature}`);
    setError("");
    try {
      if (disconnect) {
        await integrationRequest({ action: "disconnect", provider, feature }, undefined, userId);
        setOpen("");
        await cache.cancelQueries({ queryKey: options.queryKey, exact: true });
        cache.setQueryData(options.queryKey, (previous) => previous?.map((item) => item.provider === provider && item.feature === feature ? { ...item, connected: false } : item));
        await cache.invalidateQueries({ queryKey: options.queryKey, exact: true });
      } else {
        await beginIntegrationConnect(integrationRequest, provider, feature, capability);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending("");
    }
  }

  const apps = APPS.map((app) => ({ app, connection: connections?.find((item) => item.provider === app[0] && item.feature === app[1]) }));
  const groups = [["Connected", apps.filter((item) => item.connection?.connected)], ["Not connected", apps.filter((item) => !item.connection?.connected)]];
  const selected = apps.find(({ app }) => `${app[0]}-${app[1]}` === open);

  return (
    <div className="st-stack">
      {error || status.error ? (
        <p className="st-error" role="alert">{error || status.error.message} <button type="button" className="st-text-btn" onClick={() => { setError(""); void status.refetch(); }}>Try again</button></p>
      ) : null}
      {!connections && status.isFetching ? <p className="st-note" role="status">Loading connections…</p> : null}
      {connections ? groups.filter(([, items]) => items.length).map(([title, items]) => (
        <section key={title} className="st-group">
          <h3 className="st-group-title">{title}</h3>
          <div className="st-group-card">
            {items.map(({ app, connection }) => {
              const [provider, feature, name, , logo] = app;
              const id = `${provider}-${feature}`;
              const connected = Boolean(connection?.connected);
              const disabled = Boolean(pending) || (!connected && !connection?.configured);
              return (
                <button key={id} type="button" className="st-item st-app-row" disabled={disabled}
                  onClick={() => connected ? setOpen(id) : change(provider, feature)}
                  aria-label={`${name}, ${connected ? "connected, open" : connection?.configured ? "connect" : "setup needed"}`}>
                  <img className="st-app-logo" src={logo} alt="" width="25" height="25" referrerPolicy="no-referrer" />
                  <span className="st-item-body">
                    <span className="st-item-label">{name}</span>
                    {pending === id ? <span className="st-item-value">Opening…</span>
                      : connected ? <IconChevronRight className="st-item-chevron" size={17} stroke={1.8} aria-hidden="true" />
                        : <span className="st-item-value">{connection?.configured ? "Connect" : "Setup needed"}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )) : null}
      <p className="st-note">Nothing is sent or changed automatically.</p>
      {selected?.connection?.connected ? (
        <AppDialog app={selected.app} connection={selected.connection} busy={Boolean(pending)} onClose={() => setOpen("")}
          onUpgrade={(capability) => change(selected.app[0], selected.app[1], capability)}
          onDisconnect={() => change(selected.app[0], selected.app[1], undefined, true)} />
      ) : null}
    </div>
  );
}
