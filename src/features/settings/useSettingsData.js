import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_MONTHLY_REPORT_SHARE, DEFAULT_SEND_INTERVAL_MINUTES, DEFAULT_SEND_WINDOW } from "../../../shared/automation-settings.js";
import {
  fetchAutomationSettings,
  fetchWhatsAppAccounts,
  getConnectedWhatsAppAccount,
  saveAutomationSettings,
} from "../seller-signal/services";
import { sellerAutomationSettingsQueryKey, sellerWhatsAppAccountsQueryKey } from "../seller-signal/queryKeys";

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
  const saveAutomation = useMutation({
    mutationFn: (settings) => saveAutomationSettings(userId, settings),
    onSuccess: (settings) => queryClient.setQueryData(sellerAutomationSettingsQueryKey(userId), settings),
  });
  const current = {
    autoWhatsAppEnabled: automation.data?.autoWhatsAppEnabled !== false,
    monthlyReportsEnabled: automation.data?.monthlyReportsEnabled === true,
    monthlyReportDailyShare: automation.data?.monthlyReportDailyShare ?? DEFAULT_MONTHLY_REPORT_SHARE,
    sendWindowStartHour: automation.data?.sendWindowStartHour ?? DEFAULT_SEND_WINDOW.start,
    sendWindowEndHour: automation.data?.sendWindowEndHour ?? DEFAULT_SEND_WINDOW.end,
    sendIntervalMinutes: automation.data?.sendIntervalMinutes ?? DEFAULT_SEND_INTERVAL_MINUTES,
    dailyMessageLimit: automation.data?.dailyMessageLimit ?? 40,
    statusFollowupsEnabled: automation.data?.statusFollowupsEnabled === true,
  };

  return {
    account: getConnectedWhatsAppAccount(accounts.data || []) || accounts.data?.[0] || null,
    accountsLoading: accounts.isPending,
    automation: {
      ...current,
      loading: automation.isPending,
      saving: saveAutomation.isPending,
      error: automation.error || saveAutomation.error,
      set: (key, value) => saveAutomation.mutate({ ...current, [key]: value }),
      setMany: (values) => saveAutomation.mutate({ ...current, ...values }),
    },
  };
}
