import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectWhatsAppAccount,
  fetchAutomationSettings,
  fetchWhatsAppAccounts,
  fetchWhatsAppSendActivity,
  getConnectedWhatsAppAccount,
  saveAutomationSettings,
} from "../seller-signal/services";
import {
  sellerAutomationSettingsQueryKey,
  sellerSendActivityQueryKey,
  sellerWhatsAppAccountsQueryKey,
} from "../seller-signal/queryKeys";

// Only what the Settings page needs, on the same query keys as the Sellers
// page so both stay in sync without loading any seller data.
export function useSettingsData(userId) {
  const queryClient = useQueryClient();
  const accounts = useQuery({
    queryKey: sellerWhatsAppAccountsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppAccounts(userId),
    staleTime: 60_000,
  });
  const automation = useQuery({
    queryKey: sellerAutomationSettingsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchAutomationSettings(userId),
    staleTime: 60_000,
  });
  const activity = useQuery({
    queryKey: sellerSendActivityQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWhatsAppSendActivity(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const saveAutomation = useMutation({
    mutationFn: (settings) => saveAutomationSettings(userId, settings),
    onSuccess: (settings) => queryClient.setQueryData(sellerAutomationSettingsQueryKey(userId), settings),
  });
  const connect = useMutation({ mutationFn: (payload) => connectWhatsAppAccount(payload) });

  const current = {
    autoWhatsAppEnabled: automation.data?.autoWhatsAppEnabled !== false,
    monthlyReportsEnabled: automation.data?.monthlyReportsEnabled === true,
  };

  async function connectAccount(payload) {
    const result = await connect.mutateAsync(payload);
    const account = result?.account || result;
    if (!account?.id) throw new Error("WhatsApp account was not returned");
    queryClient.setQueryData(sellerWhatsAppAccountsQueryKey(userId), (existing) => {
      const list = Array.isArray(existing) ? existing : [];
      return [account, ...list.filter((item) => item.id !== account.id)];
    });
    await queryClient.invalidateQueries({ queryKey: sellerWhatsAppAccountsQueryKey(userId) });
    return result?.account ? result : { account };
  }

  return {
    account: getConnectedWhatsAppAccount(accounts.data || []),
    connecting: connect.isPending,
    connectAccount,
    automation: {
      ...current,
      loading: automation.isPending,
      saving: saveAutomation.isPending,
      error: automation.error || saveAutomation.error,
      set: (key, value) => saveAutomation.mutate({ ...current, [key]: value }),
    },
    activity: { data: activity.data || null, loading: activity.isPending },
  };
}
