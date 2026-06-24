import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconBrandWhatsapp,
  IconChevronRight,
} from "@tabler/icons-react";

const FACEBOOK_SDK_ID = "facebook-jssdk";
const META_MESSAGE_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

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
  const [baileysQrDataUrl, setBaileysQrDataUrl] = useState(null);
  const pendingRef = useRef({ code: null, signup: null });
  const finalizingRef = useRef(false);
  const onConnectRef = useRef(onConnect);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

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

    if (nextAccount?.id) setBaileysAccountId(nextAccount.id);
    if (result?.qrDataUrl) setBaileysQrDataUrl(result.qrDataUrl);

    if (nextStatus === "connected" || nextAccount?.connection_status === "connected") {
      setStatus("connected");
      setBaileysQrDataUrl(null);
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
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyBaileysResult, baileysAccountId, isBaileys, status]);

  async function startSignup() {
    if (missingConfig.length) {
      setLocalError(`${missingConfig.join(" and ")} missing.`);
      return;
    }

    pendingRef.current = { code: null, signup: null };
    setLocalError(null);
    setStatus("loading");

    try {
      if (isBaileys) {
        const result = await onConnectRef.current?.({
          action: "start",
          provider: "baileys",
        });
        applyBaileysResult(result);
        return;
      }

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
  const busy = connecting || status === "loading" || status === "waiting" || status === "saving";
  const connected = Boolean(account);
  const rowValue = connected
    ? "Connected"
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
        onClick={startSignup}
        disabled={busy}
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
      {localError && <div className="whatsapp-connect-error">{localError}</div>}
      {isBaileys && baileysQrDataUrl && !connected && (
        <div className="whatsapp-connect-qr">
          <img src={baileysQrDataUrl} alt="WhatsApp pairing QR code" />
          <span>Scan in WhatsApp Linked Devices</span>
        </div>
      )}
    </section>
  );
}
