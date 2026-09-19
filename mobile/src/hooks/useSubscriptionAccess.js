import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase";
import {
  clearMobileSubscriptionUser,
  getMobileSubscriptionSnapshot,
  getSubscriptionStoreLabel,
  isMobilePurchaseCancellation,
  purchaseMobilePro,
  restoreMobilePurchases,
  showMobileSubscriptionManagement,
} from "../subscriptions";
import { sharedSubscriptionIsActive, useSharedSubscription } from "./useSharedSubscription";

const EMPTY_STORE = {
  canPurchase: false,
  configured: false,
  error: null,
  isPro: false,
  loading: false,
  priceString: null,
  subscriptionPackage: null,
  trialEligible: null,
  userId: null,
};

export function useSubscriptionAccess({ userId, email, displayName }) {
  const userRef = useRef(userId);
  userRef.current = userId;
  const requestRevision = useRef(0);
  const [store, setStore] = useState(EMPTY_STORE);
  const [action, setAction] = useState(null);
  const {
    data: sharedSubscription,
    error: sharedError,
    isLoading: sharedLoading,
    refetch: refetchShared,
  } = useSharedSubscription(userId);

  const user = useMemo(() => ({ userId, email, displayName }), [displayName, email, userId]);

  const refreshStore = useCallback(async () => {
    const requestedUserId = user.userId;
    const revision = ++requestRevision.current;
    if (!requestedUserId) {
      setStore(EMPTY_STORE);
      await clearMobileSubscriptionUser().catch(() => {});
      return null;
    }

    setStore((current) => ({
      ...(current.userId === requestedUserId ? current : EMPTY_STORE),
      loading: true,
      userId: requestedUserId,
    }));
    try {
      const snapshot = await getMobileSubscriptionSnapshot(user);
      if (revision !== requestRevision.current || userRef.current !== requestedUserId) return null;
      setStore({ ...snapshot, error: null, loading: false, userId: requestedUserId });
      return snapshot;
    } catch (error) {
      if (revision !== requestRevision.current || userRef.current !== requestedUserId) return null;
      setStore((current) => ({
        ...(current.userId === requestedUserId ? current : EMPTY_STORE),
        error: error instanceof Error ? error.message : "Could not connect to the app store.",
        loading: false,
        userId: requestedUserId,
      }));
      return null;
    }
  }, [user]);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  useEffect(() => {
    if (!userId) return undefined;
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshStore();
        void refetchShared();
      }
    });
    return () => listener.remove();
  }, [refreshStore, refetchShared, userId]);

  const storeBelongsToUser = Boolean(userId && store.userId === userId);
  const storeIsPro = storeBelongsToUser && store.isPro;
  const sharedIsActive = sharedSubscriptionIsActive(sharedSubscription);
  const hasAccess = Boolean(storeIsPro || sharedIsActive);
  const source = storeIsPro
    ? (getSubscriptionStoreLabel() === "App Store" ? "app_store" : "play_store")
    : sharedIsActive ? sharedSubscription?.source : null;
  const isLoading = Boolean(userId)
    && !hasAccess
    && (!storeBelongsToUser || store.loading || sharedLoading);
  const storeLabel = source === "stripe"
    ? "Web billing"
    : source === "app_store"
      ? "App Store"
      : source === "play_store"
        ? "Google Play"
        : getSubscriptionStoreLabel();

  const refresh = useCallback(async () => {
    await Promise.allSettled([refreshStore(), refetchShared()]);
  }, [refreshStore, refetchShared]);

  const purchase = useCallback(async () => {
    if (!userId || action) return false;
    setAction("purchase");
    try {
      const snapshot = await purchaseMobilePro(user, store.subscriptionPackage);
      setStore({ ...snapshot, error: null, loading: false, userId });
      void refetchShared();
      return snapshot.isPro;
    } catch (error) {
      if (isMobilePurchaseCancellation(error)) return false;
      throw error;
    } finally {
      setAction(null);
    }
  }, [action, refetchShared, store.subscriptionPackage, user, userId]);

  const restore = useCallback(async () => {
    if (!userId || action) return false;
    setAction("restore");
    try {
      const snapshot = await restoreMobilePurchases(user);
      setStore({ ...snapshot, error: null, loading: false, userId });
      void refetchShared();
      return snapshot.isPro;
    } finally {
      setAction(null);
    }
  }, [action, refetchShared, user, userId]);

  const manage = useCallback(async () => {
    if (!userId || action) return;
    setAction("manage");
    try {
      if (source !== "stripe") {
        await showMobileSubscriptionManagement(user);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
        body: { returnUrl: "https://repeatai.org" },
      });
      if (error || !data?.portalUrl) throw new Error("Could not open web billing.");
      await WebBrowser.openBrowserAsync(data.portalUrl);
      void refetchShared();
    } finally {
      setAction(null);
    }
  }, [action, refetchShared, source, user, userId]);

  return {
    action,
    canPurchase: storeBelongsToUser && store.canPurchase,
    error: store.error || (sharedError && !store.configured
      ? "Could not verify your subscription. Check your connection and try again."
      : null),
    hasAccess,
    isLoading,
    manage,
    priceString: storeBelongsToUser ? store.priceString : null,
    purchase,
    refresh,
    restore,
    source,
    storeConfigured: storeBelongsToUser && store.configured,
    storeLabel,
    trialEligible: storeBelongsToUser ? store.trialEligible : null,
  };
}
