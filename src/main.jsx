import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import Auth from "./Auth.jsx";
import LandingPage from "./LandingPage.jsx";
import {
  createCheckoutSession,
  fetchBillingSubscription,
  hasActiveSubscription,
  syncCheckoutSession,
  TRIAL_PERIOD_DAYS,
} from "./billing";
import ResetPassword from "./ResetPassword.jsx";
import WelcomeScreen from "./WelcomeScreen.jsx";
import HowDidYouHearScreen from "./HowDidYouHearScreen.jsx";
import TrialOfferScreen from "./TrialOfferScreen.jsx";
import UsernameSetup from "./features/seller-signal/components/UsernameSetup.jsx";
import { queryClient } from "./queryClient";
import { supabase, supabaseConfigError } from "./supabase";

const POST_AUTH_ACTION_STORAGE_KEY = "seller_signal_post_auth_action_v1";

function readStoredPostAuthAction() {
  try {
    const value = window.localStorage.getItem(POST_AUTH_ACTION_STORAGE_KEY);
    return value === "checkout" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredPostAuthAction(value) {
  try {
    if (value) {
      window.localStorage.setItem(POST_AUTH_ACTION_STORAGE_KEY, value);
      return;
    }

    window.localStorage.removeItem(POST_AUTH_ACTION_STORAGE_KEY);
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
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [profileOverride, setProfileOverride] = useState({ userId: null, completed: false, username: "", avatarUrl: "" });
  const [referralAskedLocally, setReferralAskedLocally] = useState({ userId: null, asked: false });
  const [trialOfferedLocally, setTrialOfferedLocally] = useState({ userId: null, offered: false });
  const [showAuth, setShowAuth] = useState(() => Boolean(readStoredPostAuthAction()));
  const [postAuthAction, setPostAuthAction] = useState(() => readStoredPostAuthAction());
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

  useEffect(() => {
    if (!sessionUserId) return;
    setShowAuth(false);
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || postAuthAction !== "checkout") return;
    if (!billingState.initialized || billingState.subscriptionLoading || billingState.checkoutPending) return;
    if (pendingCheckoutSessionId) return;

    updatePostAuthAction(null);
    if (hasActiveSubscription(billingState.subscription)) return;
    void handleStartCheckout();
  }, [
    billingState.checkoutPending,
    billingState.initialized,
    billingState.subscription,
    billingState.subscriptionLoading,
    pendingCheckoutSessionId,
    postAuthAction,
    sessionUserId,
  ]);

  function handlePasswordResetComplete() {
    setIsRecoveringPassword(false);
  }

  function updatePostAuthAction(action) {
    setPostAuthAction(action);
    writeStoredPostAuthAction(action);
  }

  function openAuth(action = null) {
    updatePostAuthAction(action);
    setShowAuth(true);
  }

  async function handleStartCheckout(options = {}) {
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
        trialPeriodDays: options.withTrial ? TRIAL_PERIOD_DAYS : undefined,
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

  function handleSubscribeFromLanding() {
    if (sessionUserId) {
      void handleStartCheckout();
      return;
    }

    openAuth("checkout");
  }

  function handleSignOutFromLanding() {
    updatePostAuthAction(null);
    setShowAuth(false);
    void supabase.auth.signOut();
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

  if (session === undefined) {
    return <div className="page"><div className="empty">Loading...</div></div>;
  }

  if (isRecoveringPassword && session) {
    return <ResetPassword onComplete={handlePasswordResetComplete} />;
  }

  if (session && !welcomeDismissed && !session.user.user_metadata?.welcomed) {
    const displayName = session.user.user_metadata?.username?.trim() || "";
    return (
      <WelcomeScreen
        displayName={displayName}
        onContinue={() => setWelcomeDismissed(true)}
      />
    );
  }

  if (session) {
    const overrideMatches = profileOverride.userId === session.user.id;
    const profileCompleted = (overrideMatches && profileOverride.completed)
      || Boolean(session.user.user_metadata?.profile_completed);

    if (!profileCompleted) {
      const initialName = session.user.user_metadata?.username?.trim() || "";
      const initialAvatar = session.user.user_metadata?.avatar_url || "";
      return (
        <UsernameSetup
          initialName={initialName}
          initialAvatar={initialAvatar}
          onComplete={({ username, avatarDataUrl }) =>
            setProfileOverride({
              userId: session.user.id,
              completed: true,
              username,
              avatarUrl: avatarDataUrl,
            })
          }
        />
      );
    }

    const referralAskedOverride = referralAskedLocally.userId === session.user.id && referralAskedLocally.asked;
    const referralAsked = referralAskedOverride || Boolean(session.user.user_metadata?.referral_asked);
    if (!referralAsked) {
      return (
        <HowDidYouHearScreen
          onContinue={() => setReferralAskedLocally({ userId: session.user.id, asked: true })}
        />
      );
    }

    const trialOfferedOverride = trialOfferedLocally.userId === session.user.id && trialOfferedLocally.offered;
    const trialOffered = trialOfferedOverride || Boolean(session.user.user_metadata?.trial_offered);
    const alreadySubscribed = hasActiveSubscription(billingState.subscription);
    if (!trialOffered && !alreadySubscribed) {
      return (
        <TrialOfferScreen
          checkoutPending={billingState.checkoutPending || billingState.subscriptionLoading}
          onStartTrial={() => {
            setTrialOfferedLocally({ userId: session.user.id, offered: true });
            void handleStartCheckout({ withTrial: true });
          }}
          onSkip={() => setTrialOfferedLocally({ userId: session.user.id, offered: true })}
        />
      );
    }
  }

  if (session && !billingState.initialized && !pendingCheckoutSessionId) {
    return <div className="page"><div className="empty">Loading...</div></div>;
  }

  if (session && hasActiveSubscription(billingState.subscription)) {
    return <App session={session} />;
  }

  return session ? (
    <LandingPage
      billingError={billingState.error}
      billingMessage={billingState.message}
      checkoutPending={billingState.checkoutPending || billingState.subscriptionLoading}
      isAuthenticated
      onGetStarted={handleSubscribeFromLanding}
      onSignOut={handleSignOutFromLanding}
      onSubscribe={handleSubscribeFromLanding}
    />
  ) : showAuth ? (
    <Auth />
  ) : (
    <LandingPage
      onGetStarted={() => openAuth()}
      onSignIn={() => openAuth()}
      onSubscribe={handleSubscribeFromLanding}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
);
