import { useCallback, useEffect, useState } from "react";
import { BackHandler, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAutomationSettings, saveAutomationSettings } from "./automation-settings";
import { fetchWhatsAppSendActivity } from "./send-activity";
import SendActivitySummary from './send-activity-summary';
import WhatsAppPanel from "./whatsapp-panel";
import AccountSettings from "../screens/SettingsScreen";
import Integrations from './integrations';
import { Feedback } from "./ui";
import { SettingsGroup, SettingsItem, SettingsProfile, SettingsToggle, settingsBackground } from "../components/SettingsLayout";

const SETTINGS_PAGES = [
  ["Automations", "flash"],
  ["WhatsApp", "whatsapp"],
  ["Send activity", "activity"],
  ["Integrations", "link"],
];

function Automations({ userId, colors }) {
  const client = useQueryClient();
  const key = ["seller-signal", "automation-settings", userId];
  const query = useQuery({ queryKey: key, queryFn: () => fetchAutomationSettings(userId), enabled: Boolean(userId) });
  const mutation = useMutation({
    mutationFn: (settings) => saveAutomationSettings(userId, settings),
    onSuccess: (settings) => client.setQueryData(key, settings),
  });
  return <View style={{ gap: 16 }}>
    <Feedback colors={colors} error={query.error || mutation.error} loading={query.isPending} onRetry={query.refetch} />
    {[
      ["autoWhatsAppEnabled", "Transaction updates", "Send sellers matching property transaction updates."],
      ["monthlyReportsEnabled", "Monthly reports", "Send building summaries during the first seven days of each month."],
    ].map(([id, label, description]) => (
      <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{description}</Text>
        </View>
        <SettingsToggle colors={colors} accessibilityLabel={label} value={Boolean(query.data?.[id])} disabled={!query.data || mutation.isPending} onValueChange={(value) => mutation.mutate({ ...query.data, [id]: value })} />
      </View>
    ))}
    <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
      Up to 40 messages a day, five minutes apart. Transaction updates go first. All schedules use Dubai time.
    </Text>
  </View>;
}

function SendActivity({ userId, colors, active }) {
  const query = useQuery({
    queryKey: ["seller-signal", "send-activity", userId],
    queryFn: () => fetchWhatsAppSendActivity(userId),
    enabled: Boolean(userId) && active,
    refetchInterval: active ? 60000 : false,
  });
  return <View style={{ gap: 20 }}>
    <Feedback colors={colors} loading={query.isPending} error={query.error} onRetry={query.refetch} />
    {query.data ? <SendActivitySummary data={query.data} colors={colors} refreshing={query.isFetching} onRefresh={query.refetch} /> : null}
  </View>;
}

export default function WorkspaceSettings({ userId, colors, active = true, onHeaderChange, onExit, ...accountProps }) {
  const [page, setPage] = useState(null);
  const backToSettings = useCallback(() => setPage(null), []);
  useEffect(() => {
    if (!onHeaderChange) return;
    onHeaderChange(active && page ? { title: page, onBack: backToSettings } : null);
    return () => onHeaderChange(null);
  }, [active, page, backToSettings, onHeaderChange]);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (page) { backToSettings(); return true; }
      if (onExit) { onExit(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [active, page, backToSettings, onExit]);

  if (page === "Account" || page === "Help & legal") return <AccountSettings {...accountProps} embedded hideAppearance section={page === "Account" ? "account" : "support"} />;

  return <ScrollView style={{ backgroundColor: settingsBackground(colors) }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>
    {!page ? <>
      <SettingsProfile displayName={accountProps.displayName} colors={colors} onPress={() => setPage("Account")} />
      {accountProps.onManageSubscription ? <SettingsGroup title="Account" colors={colors}>
        <SettingsItem label="Manage subscription" icon="card" colors={colors} last value={accountProps.manageSubscriptionPending ? "Opening…" : accountProps.subscriptionStoreLabel} disabled={accountProps.manageSubscriptionPending} onPress={accountProps.onManageSubscription} />
      </SettingsGroup> : null}
      <SettingsGroup title="Workspace" colors={colors}>
        {SETTINGS_PAGES.map(([label, icon], index) => <SettingsItem key={label} label={label} icon={icon} colors={colors} last={index === SETTINGS_PAGES.length - 1} onPress={() => setPage(label)} />)}
      </SettingsGroup>
      <SettingsGroup title="Preferences" colors={colors}>
        <SettingsItem label="Dark mode" icon="moon" colors={colors} last>
          <SettingsToggle colors={colors} accessibilityLabel="Dark mode" value={accountProps.theme === "dark"} onValueChange={accountProps.onToggleTheme} />
        </SettingsItem>
      </SettingsGroup>
      <SettingsGroup title="Support" colors={colors}>
        <SettingsItem label="Help & legal" icon="document" colors={colors} last onPress={() => setPage("Help & legal")} />
      </SettingsGroup>
    </> : page === "Automations" ? <Automations userId={userId} colors={colors} />
      : page === "WhatsApp" ? <WhatsAppPanel userId={userId} colors={colors} active={active} />
        : page === "Send activity" ? <SendActivity userId={userId} colors={colors} active={active} />
          : page === "Integrations" ? <Integrations key={userId} userId={userId} colors={colors} /> : null}
  </ScrollView>;
}
