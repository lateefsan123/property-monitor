import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export async function fetchSharedSubscription() {
  const { data, error } = await supabase.functions.invoke("get-billing-access", { body: {} });
  if (error) throw new Error("Could not verify your existing subscription. Please try again.");
  return data?.subscription ?? null;
}

export function sharedSubscriptionIsActive(subscription, now = Date.now()) {
  return subscription?.raw?.livemode === true
    && ["active", "trialing"].includes(subscription.status)
    && Date.parse(subscription.current_period_end) > now;
}

export function useSharedSubscription(userId) {
  const query = useQuery({
    queryKey: ["shared-subscription", userId],
    queryFn: fetchSharedSubscription,
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!userId) return;
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => listener.remove();
  }, [refetch, userId]);
  return query;
}
