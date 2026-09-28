import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { withStartupTimeout } from '../startup-request';
import { createBillingRequest } from '../../../src/billing-request';

const requestBilling = createBillingRequest(supabase);

export async function fetchSharedSubscription() {
  const data = await withStartupTimeout(
    () => requestBilling('get-billing-access'),
    'Could not verify your subscription. Check your connection and try again.',
  );
  if (!data || !Object.hasOwn(data, 'subscription')) throw new Error('Could not verify your subscription. Please try again.');
  return data?.subscription ?? null;
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
