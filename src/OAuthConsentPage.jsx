import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Puzzle, SquarePen } from "lucide-react";
import { supabase } from "./supabase";
import styles from "./OAuthConsentPage.module.css";

const CHATGPT_LOGO_URI = "https://persistent.oaistatic.com/sonic/misc/openai-logo.png";

function isChatGptClient(clientName) {
  return /chatgpt|openai/i.test(clientName);
}

function formatScopeTitle(scope) {
  return `Access ${scope.replace(/[:_]/g, " ")} permissions`;
}

function getPermissionItems(scopes) {
  const normalizedScopes = new Set(scopes.map((scope) => scope.trim()).filter(Boolean));
  const permissions = new Map();

  if (normalizedScopes.has("seller-signal:read") && !normalizedScopes.has("seller-signal:write")) {
    permissions.set("seller-signal:read", {
      title: "Read access to Seller Signal app data",
      description: "Including sellers, lead details, notes, listing alerts, WhatsApp accounts, and message history",
    });
  } else {
    permissions.set("seller-signal:write", {
      title: "Read and write access to Seller Signal app data",
      description: "Including sellers, lead details, notes, listing alerts, WhatsApp accounts, and message sending",
    });
  }

  scopes
    .filter((scope) => !["openid", "email", "profile", "seller-signal:read", "seller-signal:write"].includes(scope))
    .forEach((scope) => {
      permissions.set(scope, {
        title: formatScopeTitle(scope),
        description: "For your linked Seller Signal account",
      });
    });

  return Array.from(permissions.values());
}

function getAuthorizationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("authorization_id")?.trim() || "";
}

function OAuthConsentError({ message }) {
  return (
    <main className={styles.root}>
      <section className={styles.errorPanel} role="status" aria-live="polite">
        <div className={styles.errorContent}>
          <AlertTriangle aria-hidden="true" size={18} strokeWidth={2.2} className={styles.errorIcon} />
          <p>{message}</p>
        </div>
      </section>
    </main>
  );
}

export default function OAuthConsentPage({ session }) {
  const authorizationId = useMemo(() => getAuthorizationId(), []);
  const [authDetails, setAuthDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingDecision, setPendingDecision] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadAuthorization() {
      if (!authorizationId) {
        setError("Missing OAuth authorization request.");
        setLoading(false);
        return;
      }

      if (!supabase?.auth?.oauth?.getAuthorizationDetails) {
        setError("OAuth consent is not available in this Seller Signal build.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error: authError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (ignore) return;

      if (authError || !data) {
        setError(authError?.message ?? "OAuth authorization request was not found or has expired.");
        setLoading(false);
        return;
      }

      if (!("authorization_id" in data)) {
        window.location.assign(data.redirect_url);
        return;
      }

      if (data.user.id !== session.user.id) {
        setError("This OAuth request belongs to another Seller Signal account.");
        setLoading(false);
        return;
      }

      setAuthDetails(data);
      setError(null);
      setLoading(false);
    }

    void loadAuthorization();
    return () => {
      ignore = true;
    };
  }, [authorizationId, session.user.id]);

  async function handleDecision(decision) {
    if (!authorizationId || pendingDecision) return;

    setError(null);
    setPendingDecision(decision);

    const result = decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });

    if (result.error || !result.data?.redirect_url) {
      setPendingDecision(null);
      setError(result.error?.message ?? "Unable to finish OAuth authorization.");
      return;
    }

    window.location.assign(result.data.redirect_url);
  }

  async function handleChangeAccount() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <OAuthConsentError message="Loading OAuth authorization request..." />;
  }

  if (error || !authDetails) {
    return <OAuthConsentError message={error || "OAuth authorization request was not found or has expired."} />;
  }

  const scopes = authDetails.scope.split(/\s+/).filter(Boolean);
  const clientLogoUri = authDetails.client.logo_uri?.trim();
  const clientName = authDetails.client.name?.trim() || "An app";
  const resolvedClientLogoUri = clientLogoUri || (isChatGptClient(clientName) ? CHATGPT_LOGO_URI : "");
  const permissionItems = getPermissionItems(scopes);
  const accountEmail = authDetails.user.email || session.user.email || "your account";
  const sellerSignalLogoUri = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <main className={styles.root}>
      <div className={styles.permissionShell}>
        <div className={styles.appConnection} aria-hidden="true">
          <div className={styles.connectionIcon}>
            {resolvedClientLogoUri ? (
              <img
                src={resolvedClientLogoUri}
                alt=""
                className={styles.connectionIconImage}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Puzzle size={44} strokeWidth={1.8} />
            )}
          </div>
          <ArrowRight size={38} strokeWidth={1.2} className={styles.connectionArrow} />
          <div className={`${styles.connectionIcon} ${styles.sellerSignalIcon}`}>
            <img src={sellerSignalLogoUri} alt="" className={styles.connectionIconImage} />
          </div>
        </div>

        <section className={styles.permissionPanel} aria-labelledby="oauth-consent-title">
          <p id="oauth-consent-title" className={styles.permissionIntro}>
            Signed in as <strong>{accountEmail}</strong>.{" "}
            <span>
              {clientName} is requesting access to your Seller Signal account. They will have:
            </span>
          </p>

          <div className={styles.permissionList}>
            {permissionItems.map((permission) => (
              <div key={permission.title} className={styles.permissionRow}>
                <SquarePen aria-hidden="true" size={24} strokeWidth={1.7} className={styles.permissionIcon} />
                <div className={styles.permissionText}>
                  <div className={styles.permissionTitle}>{permission.title}</div>
                  <div className={styles.permissionDescription}>{permission.description}</div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className={styles.inlineError}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.changeAccountButton}`}
              onClick={() => void handleChangeAccount()}
              disabled={Boolean(pendingDecision)}
            >
              Change account
            </button>
            <div className={styles.decisionActions}>
              <button
                className={`${styles.button} ${styles.cancelButton}`}
                type="button"
                onClick={() => void handleDecision("deny")}
                disabled={Boolean(pendingDecision)}
              >
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.allowButton}`}
                type="button"
                onClick={() => void handleDecision("approve")}
                disabled={Boolean(pendingDecision)}
              >
                {pendingDecision === "approve" ? "Allowing..." : "Allow access"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
