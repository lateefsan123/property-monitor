import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { IconBrandWhatsapp, IconChevronRight, IconLink, IconX } from "@tabler/icons-react";
import { connectWhatsAppAccount } from "../seller-signal/services";
import { sellerWhatsAppAccountsQueryKey } from "../seller-signal/queryKeys";
import repeatIcon from "../../assets/repeat-ai-icon.png";

// Web port of mobile's WhatsApp settings (mobile/src/workspace/whatsapp-panel.js
// and whatsapp-overview.js): a connect card, or the linked number, with the
// pair / manage / disconnect steps in a dialog.
function Dialog({ title, onClose, busy, children }) {
  useEffect(() => {
    function onKey(event) { if (event.key === "Escape" && !busy) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return (
    <div className="st-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="st-dialog" role="dialog" aria-modal="true" aria-labelledby="st-wa-title">
        <header className="st-dialog-head">
          <h2 id="st-wa-title">{title}</h2>
          <button type="button" className="st-icon-close" disabled={busy} onClick={onClose} aria-label="Close"><IconX size={18} stroke={1.8} aria-hidden="true" /></button>
        </header>
        <div className="st-dialog-body">{children}</div>
      </div>
    </div>
  );
}

function ConnectionArt() {
  return (
    <div className="st-wa-art" role="img" aria-label="Connect Repeat AI with WhatsApp">
      <span className="st-wa-art-app"><img src={repeatIcon} alt="" /></span>
      <span className="st-wa-art-line" />
      <span className="st-wa-art-link"><IconLink size={17} stroke={1.8} /></span>
      <span className="st-wa-art-line" />
      <span className="st-wa-art-wa"><IconBrandWhatsapp size={48} stroke={1.6} /></span>
    </div>
  );
}

export default function WhatsAppSection({ userId, account, loading }) {
  const client = useQueryClient();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [copied, setCopied] = useState(false);
  const accountId = result?.account?.id;
  const code = result?.pairingCodeFormatted || result?.session?.pairingCodeFormatted || result?.pairingCode || result?.session?.pairingCode;
  const qr = result?.qr || result?.session?.qr;
  const qrData = result?.qrDataUrl || result?.session?.qrDataUrl;
  const connected = account?.connection_status === "connected" || result?.account?.connection_status === "connected";
  const connectedAccount = result?.account?.connection_status === "connected" ? result.account : account;
  const phoneLabel = connectedAccount?.display_phone_number || connectedAccount?.business_name || "WhatsApp number";
  const savedPhone = result?.account?.display_phone_number || account?.display_phone_number;
  const refresh = () => client.invalidateQueries({ queryKey: sellerWhatsAppAccountsQueryKey(userId) });

  useEffect(() => {
    if (!waiting || !accountId) return undefined;
    let stopped = false;
    let timer;
    const started = Date.now();
    async function poll() {
      try {
        const next = await connectWhatsAppAccount({ provider: "baileys", accountId, action: "status", quiet: true });
        if (stopped) return;
        if (["error", "logged_out", "pairing_code_error"].includes(next?.session?.status || next?.status)) {
          setWaiting(false);
          setError(new Error(next?.session?.lastError || "WhatsApp disconnected. Use your saved number to reconnect."));
          return;
        }
        setResult((previous) => ({ ...previous, ...next, session: { ...previous?.session, ...next?.session } }));
        if (next?.account?.connection_status === "connected") {
          setWaiting(false);
          setSheet(null);
          await refresh();
          return;
        }
        if (Date.now() - started > 90_000) {
          setWaiting(false);
          setError(new Error("Linking timed out. Get a fresh code and try again."));
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch (failure) {
        if (!stopped) { setError(failure); setWaiting(false); }
      }
    }
    timer = setTimeout(poll, 2500);
    return () => { stopped = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, accountId, userId]);

  async function run(action, pairingMode, reuseSavedNumber = false) {
    setError(null);
    if (action === "start" && pairingMode === "code" && !reuseSavedNumber && !/^\+?\d[\d\s-]{7,18}$/.test(phone.trim())) {
      setError(new Error("Enter your WhatsApp number including country code."));
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      const next = await connectWhatsAppAccount({
        provider: "baileys",
        action,
        accountId: action === "disconnect" || reuseSavedNumber ? (result?.account?.id || connectedAccount?.id) : undefined,
        pairingMode,
        reuseSavedNumber,
        phoneNumber: pairingMode === "code" ? phone.trim() : undefined,
        resetSession: action === "start",
      });
      setResult(action === "disconnect" ? null : next);
      setWaiting(action === "start" && next?.account?.connection_status !== "connected");
      await refresh();
      if (action === "disconnect" || next?.account?.connection_status === "connected") setSheet(null);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(String(code)); setCopied(true); }
    catch { setError(new Error("Could not copy the code. You can select it above.")); }
  }

  if (loading) return <p className="st-note" role="status">Loading WhatsApp…</p>;

  return (
    <div className="st-stack">
      {connected ? (
        <section className="st-group">
          <h3 className="st-group-title">Linked number</h3>
          <button type="button" className="st-wa-linked" onClick={() => { setError(null); setSheet("manage"); }} aria-label={`Manage WhatsApp number, ${phoneLabel}`}>
            <span className="st-wa-linked-icon"><IconBrandWhatsapp size={25} stroke={1.7} aria-hidden="true" /></span>
            <span className="st-wa-linked-text"><strong>{phoneLabel}</strong><small>Connected</small></span>
            <IconChevronRight size={18} stroke={1.8} aria-hidden="true" />
          </button>
        </section>
      ) : (
        <section className="st-wa-empty">
          <ConnectionArt />
          <h3>{waiting ? "Finish linking WhatsApp" : "Connect WhatsApp"}</h3>
          <p>{waiting ? "Continue setup in WhatsApp." : "Use your number in Repeat AI."}</p>
          <button type="button" className="st-primary" onClick={() => { setError(null); setSheet("pair"); }}>{waiting ? "Continue linking" : "Link a number"}</button>
        </section>
      )}
      {!sheet && error ? <p className="st-error" role="alert">{error.message}</p> : null}

      {sheet ? (
        <Dialog busy={busy} onClose={() => setSheet(null)}
          title={sheet === "pair" ? "Add WhatsApp number" : sheet === "disconnect" ? "Disconnect WhatsApp?" : "WhatsApp number"}>
          {error ? <p className="st-error" role="alert">{error.message}</p> : null}
          {sheet === "pair" ? (
            <>
              {!waiting ? (
                <>
                  {savedPhone ? <button type="button" className="st-primary" disabled={busy} onClick={() => run("start", "code", true)}>Use this number · {savedPhone}</button> : null}
                  <label className="st-field">
                    <span>Phone number</span>
                    <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+971…" autoFocus disabled={busy} />
                  </label>
                  <button type="button" className="st-primary" disabled={busy} onClick={() => run("start", "code")}>{busy ? "Connecting…" : "Get pairing code"}</button>
                  <button type="button" className="st-secondary" disabled={busy} onClick={() => run("start", "qr")}>Use QR code</button>
                </>
              ) : null}
              {code || qr || qrData ? (
                <>
                  <p className="st-note">
                    {code ? "In WhatsApp, open Settings → Linked devices → Link a device → Link with phone number instead."
                      : "On another device, open WhatsApp → Settings → Linked devices → Link a device, then scan this code."}
                  </p>
                  {code ? (
                    <>
                      <p className="st-wa-code">{code}</p>
                      <button type="button" className="st-secondary" onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>
                    </>
                  ) : null}
                  {qrData ? <img className="st-wa-qr" src={qrData} alt="WhatsApp QR code" />
                    : qr ? <span className="st-wa-qr"><QRCodeSVG value={qr} size={200} /></span> : null}
                </>
              ) : null}
              {waiting ? <p className="st-note" role="status">Waiting for WhatsApp…</p> : null}
            </>
          ) : sheet === "disconnect" ? (
            <>
              <p className="st-note">Automated messages will pause until you reconnect.</p>
              <button type="button" className="st-secondary is-danger" disabled={busy} onClick={() => run("disconnect")}>{busy ? "Disconnecting…" : "Disconnect"}</button>
              <button type="button" className="st-secondary" disabled={busy} onClick={() => setSheet("manage")}>Keep connected</button>
            </>
          ) : (
            <>
              <p className="st-wa-number">{phoneLabel}</p>
              <p className="st-ok">Connected</p>
              <button type="button" className="st-secondary" onClick={() => setSheet("disconnect")}>Disconnect number</button>
            </>
          )}
        </Dialog>
      ) : null}
    </div>
  );
}
