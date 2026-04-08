import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Auth from "./Auth.jsx";
import {
  createCheckoutSession,
  fetchBillingSubscription,
  hasActiveSubscription,
  syncCheckoutSession,
} from "./billing";
import ResetPassword from "./ResetPassword.jsx";
import { supabase, supabaseConfigError } from "./supabase";

const ONBOARDING_STORAGE_KEY = "seller_signal_onboarding_completed_v2";

function readStoredGateFlag(key) {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStoredGateFlag(key, value = "true") {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and continue with in-memory state.
  }
}

function readCheckoutRedirect() {
  if (typeof window === "undefined") {
    return { checkout: null, checkoutSessionId: null };
  }

  const url = new URL(window.location.href);
  return {
    checkout: url.searchParams.get("checkout"),
    checkoutSessionId: url.searchParams.get("checkout_session_id"),
  };
}

function clearCheckoutRedirect() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  url.searchParams.delete("checkout_session_id");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export function Root() {
  const [session, setSession] = useState(undefined);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [gateState, setGateState] = useState(() => ({
    hydrated: true,
    onboardingCompleted: readStoredGateFlag(ONBOARDING_STORAGE_KEY),
  }));
  const [billingState, setBillingState] = useState({
    checkoutPending: false,
    error: null,
    initialized: false,
    message: null,
    subscription: null,
    subscriptionLoading: false,
  });
  const [pendingCheckoutSessionId, setPendingCheckoutSessionId] = useState(null);
  const sessionUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setIsRecoveringPassword(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const { checkout, checkoutSessionId } = readCheckoutRedirect();
    if (!checkout && !checkoutSessionId) return;

    if (checkout === "cancelled") {
      setBillingState((currentState) => ({
        ...currentState,
        checkoutPending: false,
        message: "Checkout cancelled.",
      }));
    }

    if (checkoutSessionId) {
      setPendingCheckoutSessionId(checkoutSessionId);
      setBillingState((currentState) => ({
        ...currentState,
        checkoutPending: false,
        message: "Finalizing your subscription...",
      }));
    }

    clearCheckoutRedirect();
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      setBillingState({
        checkoutPending: false,
        error: null,
        initialized: true,
        message: null,
        subscription: null,
        subscriptionLoading: false,
      });
      return undefined;
    }

    let ignore = false;

    async function loadBillingSubscription() {
      setBillingState((currentState) => ({
        ...currentState,
        error: null,
        subscriptionLoading: true,
      }));

      try {
        const subscription = await fetchBillingSubscription();
        if (ignore) return;

        setBillingState((currentState) => ({
          ...currentState,
          initialized: true,
          subscription,
          subscriptionLoading: false,
        }));
      } catch (error) {
        if (ignore) return;

        setBillingState((currentState) => ({
          ...currentState,
          error: error instanceof Error ? error.message : "Could not load subscription status",
          initialized: true,
          subscription: null,
          subscriptionLoading: false,
        }));
      }
    }

    void loadBillingSubscription();

    return () => {
      ignore = true;
    };
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || !pendingCheckoutSessionId) return undefined;

    let ignore = false;

    async function finalizeCheckout() {
      setBillingState((currentState) => ({
        ...currentState,
        error: null,
        subscriptionLoading: true,
      }));

      try {
        const subscription = await syncCheckoutSession(pendingCheckoutSessionId);
        if (ignore) return;

        setBillingState((currentState) => ({
          ...currentState,
          checkoutPending: false,
          initialized: true,
          message: hasActiveSubscription(subscription)
            ? "Subscription active. Access unlocked."
            : "Subscription updated.",
          subscription,
          subscriptionLoading: false,
        }));
      } catch (error) {
        if (ignore) return;

        setBillingState((currentState) => ({
          ...currentState,
          checkoutPending: false,
          error: error instanceof Error ? error.message : "Could not finalize checkout",
          initialized: true,
          subscriptionLoading: false,
        }));
      } finally {
        if (!ignore) {
          setPendingCheckoutSessionId(null);
        }
      }
    }

    void finalizeCheckout();

    return () => {
      ignore = true;
    };
  }, [pendingCheckoutSessionId, sessionUserId]);

  function handlePasswordResetComplete() {
    setIsRecoveringPassword(false);
  }

  function handleOnboardingComplete() {
    writeStoredGateFlag(ONBOARDING_STORAGE_KEY);
    setGateState((currentState) => ({ ...currentState, onboardingCompleted: true }));
  }

  async function handleStartCheckout() {
    setBillingState((currentState) => ({
      ...currentState,
      checkoutPending: true,
      error: null,
      message: null,
    }));

    try {
      const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
      const successUrl = new URL(appUrl.toString());
      successUrl.searchParams.set("checkout", "success");
      successUrl.searchParams.set("checkout_session_id", "{CHECKOUT_SESSION_ID}");

      const cancelUrl = new URL(appUrl.toString());
      cancelUrl.searchParams.set("checkout", "cancelled");

      const { checkoutUrl } = await createCheckoutSession({
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString(),
      });

      window.location.assign(checkoutUrl);
    } catch (error) {
      setBillingState((currentState) => ({
        ...currentState,
        checkoutPending: false,
        error: error instanceof Error ? error.message : "Could not start Stripe checkout",
      }));
    }
  }

  if (supabaseConfigError) {
    console.error(supabaseConfigError);

    return (
      <div className="page">
        <div className="error">
          The app is temporarily unavailable right now.
        </div>
      </div>
    );
  }

  if (session === undefined || !gateState.hydrated) {
    return <div className="page"><div className="empty">Loading...</div></div>;
  }

  if (isRecoveringPassword && session) {
    return <ResetPassword onComplete={handlePasswordResetComplete} />;
  }

  return session ? (
    <App
      billingError={billingState.error}
      billingLoading={!billingState.initialized || billingState.subscriptionLoading}
      billingMessage={billingState.message}
      checkoutPending={billingState.checkoutPending}
      onboardingCompleted={gateState.onboardingCompleted}
      onCompleteOnboarding={handleOnboardingComplete}
      onStartCheckout={handleStartCheckout}
      session={session}
      subscriptionAccessGranted={hasActiveSubscription(billingState.subscription)}
    />
  ) : (
    <Auth />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
