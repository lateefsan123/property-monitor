import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconBrandWhatsapp,
  IconChevronRight,
  IconCircleCheck,
  IconCopy,
  IconDeviceMobile,
  IconKey,
  IconLinkOff,
  IconQrcode,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { QRCodeSVG } from "qrcode.react";

const FACEBOOK_SDK_ID = "facebook-jssdk";
const META_MESSAGE_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);
const BAILEYS_PAIRING_WAIT_TIMEOUT_MS = 45_000;
const BAILEYS_LINK_WAIT_TIMEOUT_MS = 90_000;

let facebookSdkPromise = null;

function getMetaConfig() {
  return {
    provider: import.meta.env.VITE_WHATSAPP_PROVIDER || "baileys",
    appId: import.meta.env.VITE_META_APP_ID || import.meta.env.VITE_WHATSAPP_APP_ID || "",
    configId: import.meta.env.VITE_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "",
    graphVersion: import.meta.env.VITE_WHATSAPP_GRAPH_API_VERSION || "v25.0",
  };
}

function loadFacebookSdk({ appId, graphVersion }) {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser is required"));
  if (!appId) return Promise.reject(new Error("Meta app ID is not configured"));

  if (window.FB) {
    window.FB.init({
      appId,
      autoLogAppEvents: true,
      cookie: true,
      xfbml: true,
      version: graphVersion,
    });
    return Promise.resolve(window.FB);
  }

  if (facebookSdkPromise) return facebookSdkPromise;

  facebookSdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        cookie: true,
        xfbml: true,
        version: graphVersion,
      });
      resolve(window.FB);
    };

    if (document.getElementById(FACEBOOK_SDK_ID)) {
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (window.FB) {
          window.clearInterval(timer);
          window.fbAsyncInit?.();
        } else if (Date.now() - start > 10000) {
          window.clearInterval(timer);
          reject(new Error("Meta SDK did not finish loading"));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = FACEBOOK_SDK_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Could not load Meta SDK"));
    document.body.appendChild(script);
  });

  return facebookSdkPromise;
}

function parseMetaMessage(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  return data && typeof data === "object" ? data : null;
}

function getSignupData(message) {
  return message?.type === "WA_EMBEDDED_SIGNUP" && message?.data
    ? message.data
    : null;
}

function getSignupError(signupData) {
  return signupData?.error_message
    || signupData?.error
    || signupData?.message
    || "WhatsApp signup did not complete.";
}

function getAccountLabel(account) {
  return account?.display_phone_number || account?.business_name || "";
}

function getBaileysPairingCode(result) {
  return result?.pairingCodeFormatted
    || result?.session?.pairingCodeFormatted
    || result?.pairingCode
    || result?.session?.pairingCode
    || null;
}

function cleanPairingCode(code) {
  return String(code || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function getBaileysQrValue(result) {
  return result?.qr
    || result?.session?.qr
    || null;
}

export default function WhatsAppConnectionPanel({
  account,
  connecting,
  onConnect,
}) {
  const config = useMemo(getMetaConfig, []);
  const isBaileys = config.provider === "baileys";
  const missingConfig = isBaileys
    ? []
    : [
        !config.appId ? "Meta app ID" : null,
        !config.configId ? "Embedded Signup config" : null,
      ].filter(Boolean);
  const [status, setStatus] = useState("idle");
  const [localError, setLocalError] = useState(null);
  const [baileysAccountId, setBaileysAccountId] = useState(null);
  const [baileysPairingCode, setBaileysPairingCode] = useState(null);
  const [baileysPhoneNumber, setBaileysPhoneNumber] = useState("");
  const [baileysQrDataUrl, setBaileysQrDataUrl] = useState(null);
  const [baileysQrValue, setBaileysQrValue] = useState(null);
  const [baileysSessionStatus, setBaileysSessionStatus] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pairingMethod, setPairingMethod] = useState("code");
  const pendingRef = useRef({ code: null, signup: null });
  const finalizingRef = useRef(false);
  const onConnectRef = useRef(onConnect);
  const baileysPairingVisibleRef = useRef(false);
  const baileysLinkStartedAtRef = useRef(null);
  const connected = Boolean(account) || status === "connected";

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    baileysPairingVisibleRef.current = Boolean(baileysPairingCode || baileysQrDataUrl || baileysQrValue);
    if (baileysPairingCode) {
      baileysLinkStartedAtRef.current = baileysLinkStartedAtRef.current || Date.now();
    } else {
      baileysLinkStartedAtRef.current = null;
    }
  }, [baileysPairingCode, baileysQrDataUrl, baileysQrValue]);

  useEffect(() => {
    if (!connected) return;
    setLocalError(null);
    setBaileysPairingCode(null);
    setBaileysQrDataUrl(null);
    setBaileysQrValue(null);
    setBaileysSessionStatus("connected");
    setConfirmDisconnect(false);
  }, [connected]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") setModalOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  const finalizeIfReady = useCallback(async () => {
    const { code, signup } = pendingRef.current;
    const wabaId = signup?.waba_id || signup?.wabaId;
    const phoneNumberId = signup?.phone_number_id || signup?.phoneNumberId;

    if (!code || !wabaId || !phoneNumberId || finalizingRef.current) return;

    finalizingRef.current = true;
    setStatus("saving");
    setLocalError(null);

    try {
      await onConnectRef.current?.({
        businessId: signup?.business_id || signup?.businessId || null,
        code,
        phoneNumberId,
        provider: "meta",
        rawSignup: signup,
        wabaId,
      });
      setStatus("connected");
      pendingRef.current = { code: null, signup: null };
    } catch (error) {
      setStatus("idle");
      setLocalError(error instanceof Error ? error.message : "Could not connect WhatsApp.");
    } finally {
      finalizingRef.current = false;
    }
  }, []);

  const applyBaileysResult = useCallback((result) => {
    const nextAccount = result?.account || null;
    const nextStatus = result?.status || result?.session?.status || nextAccount?.connection_status || "pending";
    const pairingCode = getBaileysPairingCode(result);
    const qrValue = getBaileysQrValue(result);

    if (nextAccount?.id) setBaileysAccountId(nextAccount.id);
    setBaileysSessionStatus(nextStatus);
    if (result?.qrDataUrl || result?.session?.qrDataUrl) {
      setBaileysQrDataUrl(result.qrDataUrl || result.session.qrDataUrl);
    }
    if (qrValue) setBaileysQrValue(qrValue);
    if (pairingCode) setBaileysPairingCode(pairingCode);

    if (nextStatus === "connected" || nextAccount?.connection_status === "connected") {
      setStatus("connected");
      setBaileysPairingCode(null);
      setBaileysQrDataUrl(null);
      setBaileysQrValue(null);
      return;
    }

    if (nextStatus === "error" || nextStatus === "pairing_code_error" || nextAccount?.connection_status === "error") {
      setStatus("idle");
      setLocalError(nextAccount?.last_error || result?.session?.lastError || "Could not connect WhatsApp.");
      return;
    }

    if (pairingCode || nextStatus === "pairing_code" || nextStatus === "pairing_code_requested") {
      setStatus("waiting");
      return;
    }

    if (result?.qrDataUrl || nextStatus === "qr") {
      setStatus("waiting");
      return;
    }

    setStatus(nextStatus === "starting" || nextStatus === "connecting" ? "loading" : "waiting");
  }, []);

  useEffect(() => {
    if (isBaileys) return undefined;

    function handleMetaMessage(event) {
      if (!META_MESSAGE_ORIGINS.has(event.origin)) return;

      const message = parseMetaMessage(event.data);
      const signupData = getSignupData(message);
      if (!signupData) return;

      if (signupData.event === "FINISH" || signupData.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
        pendingRef.current = { ...pendingRef.current, signup: signupData };
        setStatus("waiting");
        void finalizeIfReady();
        return;
      }

      if (signupData.event === "ERROR") {
        pendingRef.current = { code: null, signup: null };
        setStatus("idle");
        setLocalError(getSignupError(signupData));
      }
    }

    window.addEventListener("message", handleMetaMessage);
    return () => window.removeEventListener("message", handleMetaMessage);
  }, [finalizeIfReady, isBaileys]);

  useEffect(() => {
    if (!isBaileys || status !== "waiting" || !baileysAccountId) return undefined;

    let cancelled = false;
    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      try {
        const result = await onConnectRef.current?.({
          accountId: baileysAccountId,
          action: "status",
          provider: "baileys",
          quiet: true,
        });
        if (!cancelled) applyBaileysResult(result);
      } catch (error) {
        if (!cancelled) {
          setStatus("idle");
          setLocalError(error instanceof Error ? error.message : "Could not check WhatsApp connection.");
        }
      }

      if (!cancelled && !baileysPairingVisibleRef.current && Date.now() - startedAt > BAILEYS_PAIRING_WAIT_TIMEOUT_MS) {
        setStatus("idle");
        setLocalError("WhatsApp did not return a linking code. Check the WhatsApp service and try again.");
        window.clearInterval(timer);
        return;
      }

      const linkStartedAt = baileysLinkStartedAtRef.current;
      if (!cancelled && linkStartedAt && Date.now() - linkStartedAt > BAILEYS_LINK_WAIT_TIMEOUT_MS) {
        setStatus("idle");
        setBaileysPairingCode(null);
        setBaileysQrDataUrl(null);
        setBaileysQrValue(null);
        setLocalError("WhatsApp is still logging in. Get a fresh code and try again from Linked devices.");
        window.clearInterval(timer);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyBaileysResult, baileysAccountId, isBaileys, status]);

  async function startBaileysPairingCode(event) {
    event?.preventDefault?.();
    const phoneNumber = baileysPhoneNumber.trim();
    if (!phoneNumber) {
      setLocalError("Enter your WhatsApp number first.");
      return;
    }

    setBaileysPairingCode(null);
    setBaileysQrDataUrl(null);
    setBaileysQrValue(null);
    setCopiedCode(false);
    setLocalError(null);
    setStatus("loading");

    try {
      const result = await onConnectRef.current?.({
        action: "start",
        pairingMode: "code",
        phoneNumber,
        provider: "baileys",
        resetSession: true,
      });
      applyBaileysResult(result);
    } catch (error) {
      setStatus("idle");
      setLocalError(error instanceof Error ? error.message : "Could not request WhatsApp pairing code.");
    }
  }

  async function startBaileysQrPairing() {
    setBaileysPairingCode(null);
    setBaileysQrDataUrl(null);
    setBaileysQrValue(null);
    setCopiedCode(false);
    setLocalError(null);
    setStatus("loading");

    try {
      const result = await onConnectRef.current?.({
        action: "start",
        provider: "baileys",
        resetSession: true,
      });
      applyBaileysResult(result);
    } catch (error) {
      setStatus("idle");
      setLocalError(error instanceof Error ? error.message : "Could not request WhatsApp QR code.");
    }
  }

  async function disconnectBaileysAccount() {
    if (!account?.id) return;

    setDisconnecting(true);
    setLocalError(null);

    try {
      await onConnectRef.current?.({
        accountId: account.id,
        action: "disconnect",
        provider: "baileys",
      });
      setBaileysAccountId(null);
      setBaileysPairingCode(null);
      setBaileysPhoneNumber("");
      setBaileysQrDataUrl(null);
      setBaileysQrValue(null);
      setBaileysSessionStatus("disconnected");
      setConfirmDisconnect(false);
      setStatus("idle");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not disconnect WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function copyBaileysPairingCode() {
    if (!baileysPairingCode) return;

    try {
      await navigator.clipboard.writeText(cleanPairingCode(baileysPairingCode));
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1200);
    } catch {
      setLocalError("Could not copy pairing code.");
    }
  }

  async function startSignup() {
    if (connected) return;

    if (isBaileys) {
      await startBaileysPairingCode();
      return;
    }

    if (missingConfig.length) {
      setLocalError(`${missingConfig.join(" and ")} missing.`);
      return;
    }

    pendingRef.current = { code: null, signup: null };
    setLocalError(null);
    setStatus("loading");

    try {
      const fb = await loadFacebookSdk(config);
      setStatus("waiting");
      fb.login((response) => {
        const code = response?.authResponse?.code || null;

        if (!code) {
          setStatus("idle");
          setLocalError("WhatsApp signup was cancelled.");
          return;
        }

        pendingRef.current = { ...pendingRef.current, code };
        void finalizeIfReady();
      }, {
        config_id: config.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
        },
      });
    } catch (error) {
      setStatus("idle");
      setLocalError(error instanceof Error ? error.message : "Could not start WhatsApp signup.");
    }
  }

  const accountLabel = getAccountLabel(account);
  const busy = connecting || disconnecting || status === "loading" || status === "saving" || (!isBaileys && status === "waiting");
  const codeBusy = connecting || disconnecting || status === "loading" || status === "saving";
  const hasBaileysQr = Boolean(baileysQrValue || baileysQrDataUrl);
  const cleanBaileysPairingCode = cleanPairingCode(baileysPairingCode);
  const pairingCodeLength = Math.max(cleanBaileysPairingCode.length, 1);
  const pairingCodeSlotIndexes = Array.from({ length: pairingCodeLength }, (_, index) => index);
  const rowValue = connected
    ? "Connected"
    : isBaileys && baileysPairingCode
      ? "Code ready"
      : isBaileys && status === "waiting"
        ? "Waiting for link"
        : busy
          ? status === "saving" ? "Connecting" : "Opening"
      : missingConfig.length
        ? "Setup pending"
        : "Not connected";

  return (
    <section className="whatsapp-connect-panel" aria-label="WhatsApp connection">
      <button
        type="button"
        className="whatsapp-connect-line"
        data-clickable="true"
        onClick={() => setModalOpen(true)}
        disabled={false}
        aria-busy={busy ? "true" : undefined}
      >
        <span className="whatsapp-connect-line-icon" aria-hidden="true">
          <IconBrandWhatsapp size={19} stroke={1.9} />
        </span>
        <div className="whatsapp-connect-line-main">
          <span className="whatsapp-connect-line-label">WhatsApp</span>
          <span className="whatsapp-connect-line-value">
            {accountLabel && connected ? `Connected to ${accountLabel}` : rowValue}
          </span>
        </div>
        <IconChevronRight
          className="whatsapp-connect-line-chevron"
          size={16}
          stroke={1.9}
          aria-hidden="true"
        />
      </button>
      {modalOpen && (
        <div
          className="whatsapp-connect-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className="whatsapp-connect-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-connect-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="whatsapp-connect-modal-header">
              <div className="whatsapp-connect-modal-title-wrap">
                <span className="whatsapp-connect-modal-icon" aria-hidden="true">
                  <IconBrandWhatsapp size={20} stroke={2} />
                </span>
                <div>
                  <h2 id="whatsapp-connect-modal-title">WhatsApp</h2>
                  <span>{connected ? "Connected" : "Not connected"}</span>
                </div>
              </div>
              <button
                type="button"
                className="whatsapp-connect-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <IconX size={19} stroke={2} aria-hidden="true" />
              </button>
            </div>

            <div className="whatsapp-connect-modal-body">
              {connected ? (
                <div className="whatsapp-connect-connected-card">
                  <span className="whatsapp-connect-connected-icon" aria-hidden="true">
                    <IconCircleCheck size={22} stroke={2.2} />
                  </span>
                  <div className="whatsapp-connect-connected-main">
                    <span className="whatsapp-connect-connected-label">Connected number</span>
                    <strong>{accountLabel || "WhatsApp Web"}</strong>
                  </div>
                </div>
              ) : !isBaileys ? (
                <div className="whatsapp-connect-meta-panel">
                  <button
                    type="button"
                    className="whatsapp-connect-primary-button"
                    onClick={startSignup}
                    disabled={busy || missingConfig.length > 0}
                  >
                    <IconBrandWhatsapp size={16} stroke={2.2} aria-hidden="true" />
                    <span>Connect WhatsApp</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="whatsapp-connect-method-tabs" role="tablist" aria-label="Pairing method">
                    <button
                      type="button"
                      className={`whatsapp-connect-method-tab${pairingMethod === "code" ? " is-active" : ""}`}
                      onClick={() => {
                        setPairingMethod("code");
                        setLocalError(null);
                      }}
                      role="tab"
                      aria-selected={pairingMethod === "code"}
                    >
                      <IconKey size={16} stroke={2.1} aria-hidden="true" />
                      <span>Code</span>
                    </button>
                    <button
                      type="button"
                      className={`whatsapp-connect-method-tab${pairingMethod === "qr" ? " is-active" : ""}`}
                      onClick={() => {
                        setPairingMethod("qr");
                        setLocalError(null);
                      }}
                      role="tab"
                      aria-selected={pairingMethod === "qr"}
                    >
                      <IconQrcode size={16} stroke={2.1} aria-hidden="true" />
                      <span>QR</span>
                    </button>
                  </div>

                  {pairingMethod === "code" ? (
                    <form className="whatsapp-connect-modal-form" onSubmit={startBaileysPairingCode}>
                      <label className="whatsapp-connect-modal-field">
                        <span>WhatsApp number</span>
                        <div className="whatsapp-connect-modal-input-shell">
                          <IconDeviceMobile size={17} stroke={2} aria-hidden="true" />
                          <input
                            type="tel"
                            value={baileysPhoneNumber}
                            onChange={(event) => setBaileysPhoneNumber(event.target.value)}
                            placeholder="+353 85 228 7083"
                            autoComplete="tel"
                            disabled={codeBusy}
                          />
                        </div>
                      </label>
                      <button
                        type="submit"
                        className="whatsapp-connect-primary-button"
                        disabled={codeBusy || !baileysPhoneNumber.trim()}
                      >
                        <IconKey size={16} stroke={2.2} aria-hidden="true" />
                        <span>{baileysPairingCode ? "New code" : "Get code"}</span>
                      </button>
                    </form>
                  ) : (
                    <div className="whatsapp-connect-qr-panel">
                      <div className="whatsapp-connect-qr-card">
                        <div className="whatsapp-connect-qr-card-header">
                          <span>Linked devices QR</span>
                          {hasBaileysQr && <small>Ready</small>}
                        </div>
                        <div className="whatsapp-connect-qr-code-frame">
                          {baileysQrValue ? (
                            <QRCodeSVG
                              value={baileysQrValue}
                              size={224}
                              level="M"
                              marginSize={1}
                              bgColor="#ffffff"
                              fgColor="#111111"
                              title="WhatsApp pairing QR code"
                            />
                          ) : baileysQrDataUrl ? (
                            <img src={baileysQrDataUrl} alt="WhatsApp pairing QR code" />
                          ) : (
                            <div className="whatsapp-connect-qr-placeholder" aria-hidden="true">
                              <IconQrcode size={46} stroke={1.7} />
                            </div>
                          )}
                        </div>
                        <div className="whatsapp-connect-qr-card-footer">
                          <button
                            type="button"
                            className="whatsapp-connect-primary-button whatsapp-connect-qr-action"
                            onClick={startBaileysQrPairing}
                            disabled={codeBusy}
                          >
                            <IconRefresh size={16} stroke={2.2} aria-hidden="true" />
                            <span>{hasBaileysQr ? "Refresh QR" : "Generate QR"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {baileysPairingCode && (
                    <div className="whatsapp-connect-code" role="status">
                      <div className="whatsapp-connect-code-main">
                        <span className="whatsapp-connect-code-label">Pairing code</span>
                        <InputOTP
                          aria-label="WhatsApp pairing code"
                          className="whatsapp-connect-otp-input"
                          containerClassName="whatsapp-connect-otp"
                          maxLength={pairingCodeLength}
                          readOnly
                          value={cleanBaileysPairingCode}
                        >
                          <InputOTPGroup className="whatsapp-connect-otp-group">
                            {pairingCodeSlotIndexes.map((index) => (
                              <InputOTPSlot
                                className="whatsapp-connect-otp-slot"
                                index={index}
                                key={index}
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <button
                        type="button"
                        className="whatsapp-connect-copy-button"
                        onClick={copyBaileysPairingCode}
                      >
                        <IconCopy size={15} stroke={2} aria-hidden="true" />
                        <span>{copiedCode ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}

                  {status === "waiting" && (
                    <div className="whatsapp-connect-modal-status">
                      {baileysSessionStatus === "pairing_code" || baileysPairingCode ? "Waiting for link" : "Waiting for WhatsApp"}
                    </div>
                  )}
                </>
              )}

              {localError && (
                <div className="whatsapp-connect-modal-error">
                  <IconAlertCircle size={16} stroke={2.1} aria-hidden="true" />
                  <span>{localError}</span>
                </div>
              )}

              {connected && (
                <div className="whatsapp-connect-disconnect-zone">
                  {confirmDisconnect ? (
                    <div className="whatsapp-connect-disconnect-confirm">
                      <span>Disconnect this number?</span>
                      <div className="whatsapp-connect-disconnect-actions">
                        <button
                          type="button"
                          className="whatsapp-connect-secondary-button"
                          onClick={() => setConfirmDisconnect(false)}
                          disabled={disconnecting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="whatsapp-connect-danger-button"
                          onClick={disconnectBaileysAccount}
                          disabled={disconnecting}
                        >
                          {disconnecting ? "Disconnecting" : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="whatsapp-connect-disconnect-button"
                      onClick={() => setConfirmDisconnect(true)}
                    >
                      <IconLinkOff size={16} stroke={2.2} aria-hidden="true" />
                      <span>Disconnect number</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
