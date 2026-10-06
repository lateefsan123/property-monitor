import { useWorkspacePreference } from "./preferences";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAutomationSettings, saveAutomationSettings } from "./automation-settings";
import { DAILY_AUTOMATION_CAP, MONTHLY_REPORT_SHARE_OPTIONS } from "../../../shared/automation-settings.js";
import { fetchWhatsAppSendActivity } from "./send-activity";
import ActivityDateFilter from './activity-date-filter';
import { activityRange } from '../../../shared/send-activity-dates';
import SendActivitySummary from './send-activity-summary';
import WhatsAppPanel from "./whatsapp-panel";
import AccountSettings from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/edit-profile-screen";
import ScheduleSettings from './schedule-settings';
import Integrations from './integrations';
import StatusSettings from './status-settings';
import { Feedback } from "./ui";
import { SettingsGroup, SettingsItem, SettingsProfile, SettingsToggle, settingsBackground } from "../components/SettingsLayout";

const SETTINGS_PAGES = [
  ["Automations", "flash"],
  ["Statuses", "tag"],
  ["Schedule", "calendar"],
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
      ["monthlyReportsEnabled", "Monthly reports", "Send each seller a summary of last month's sales in their building, once a month."],
    ].map(([id, label, description]) => (
      <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{description}</Text>
        </View>
        <SettingsToggle colors={colors} accessibilityLabel={label} value={Boolean(query.data?.[id])} disabled={!query.data || mutation.isPending} onValueChange={(value) => mutation.mutate({ ...query.data, [id]: value })} />
      </View>
    ))}
    {query.data?.autoWhatsAppEnabled && query.data?.monthlyReportsEnabled ? <View style={{ gap: 12, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Daily split</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{query.data.monthlyReportDailyShare} monthly reports and {DAILY_AUTOMATION_CAP - query.data.monthlyReportDailyShare} transaction updates a day. Unused slots go to the other.</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Monthly reports a day" style={{ flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: colors.bgBadge }}>
        {MONTHLY_REPORT_SHARE_OPTIONS.map((share) => {
          const selected = query.data.monthlyReportDailyShare === share;
          return <Pressable key={share} accessibilityRole="radio" accessibilityState={{ selected, disabled: mutation.isPending }} disabled={mutation.isPending}
            onPress={() => mutation.mutate({ ...query.data, monthlyReportDailyShare: share })}
            style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: selected ? colors.bgCard : "transparent" }}>
            <Text style={{ color: selected ? colors.text : colors.textMuted, fontWeight: "600", fontSize: 14 }}>{share}</Text>
          </Pressable>;
        })}
      </View>
    </View> : null}
    <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
      Up to 40 messages a day, five minutes apart, shared between updates and reports. All schedules use Dubai time.
    </Text>
  </View>;
}

function SendActivity({ userId, colors, active }) {
  const [selection, setSelection] = useState({ preset: 'today' });
  const range = selection.preset === 'custom' ? selection.range : activityRange(selection.preset);
  const query = useQuery({
    queryKey: ["seller-signal", "send-activity", userId, range.startDate, range.endDate],
    queryFn: () => fetchWhatsAppSendActivity(userId, range),
    enabled: Boolean(userId) && active,
    refetchInterval: active ? 60000 : false,
  });
  return <View style={{ gap: 20 }}>
    <ActivityDateFilter value={{ ...selection, range }} colors={colors} onApply={setSelection} />
    <Feedback colors={colors} loading={query.isPending} error={query.error} onRetry={query.refetch} />
    {query.data ? <SendActivitySummary data={query.data} colors={colors} /> : null}
  </View>;
}

export default function WorkspaceSettings({ userId, colors, active = true, onHeaderChange, onExit, request, ...accountProps }) {
  const assistantPreference = useWorkspacePreference(userId, "ask-repeat-visible", true);
  const [page, setPage] = useState(() => ["Integrations", "WhatsApp"].includes(request?.section) ? request.section : null);
  const [editingProfile, setEditingProfile] = useState(false);
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

  if (page === "Account" || page === "Help & legal") return <>
    <AccountSettings {...accountProps} onEditProfile={() => setEditingProfile(true)} embedded hideAppearance section={page === "Account" ? "account" : "support"} />
    {editingProfile ? <EditProfileScreen userId={userId} displayName={accountProps.displayName} avatarUrl={accountProps.avatarUrl} colors={colors} onClose={() => setEditingProfile(false)} /> : null}
  </>;

  return <ScrollView style={{ backgroundColor: settingsBackground(colors) }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>
    {!page ? <>
      <SettingsProfile displayName={accountProps.displayName} avatarUrl={accountProps.avatarUrl} colors={colors} onPress={() => setPage("Account")} />
      {accountProps.onManageSubscription ? <SettingsGroup title="Account" colors={colors}>
        <SettingsItem label="Manage subscription" icon="card" colors={colors} last value={accountProps.manageSubscriptionPending ? "Opening…" : accountProps.subscriptionStoreLabel} disabled={accountProps.manageSubscriptionPending} onPress={accountProps.onManageSubscription} />
      </SettingsGroup> : null}
      <SettingsGroup title="Workspace" colors={colors}>
        {SETTINGS_PAGES.map(([label, icon], index) => <SettingsItem key={label} label={label} icon={icon} colors={colors} last={index === SETTINGS_PAGES.length - 1} onPress={() => setPage(label)} />)}
      </SettingsGroup>
      <SettingsGroup title="Preferences" colors={colors}>
        <SettingsItem label="Dark mode" icon="moon" colors={colors}>
          <SettingsToggle colors={colors} accessibilityLabel="Dark mode" value={accountProps.theme === "dark"} onValueChange={accountProps.onToggleTheme} />
        </SettingsItem>
        <SettingsItem label="Ask Repeat" icon="message" colors={colors} last>
          <SettingsToggle colors={colors} accessibilityLabel="Ask Repeat" value={assistantPreference.value} disabled={assistantPreference.pending} onValueChange={assistantPreference.set} />
        </SettingsItem>
        {assistantPreference.error ? <Text accessibilityRole="alert" style={{ color: colors.errorText, padding: 16 }}>Could not save this preference. Please try again.</Text> : null}
      </SettingsGroup>
      <SettingsGroup title="Support" colors={colors}>
        <SettingsItem label="Help & legal" icon="document" colors={colors} last onPress={() => setPage("Help & legal")} />
      </SettingsGroup>
    </> : page === "Automations" ? <Automations userId={userId} colors={colors} />
      : page === "Statuses" ? <StatusSettings userId={userId} colors={colors} />
      : page === "Schedule" ? <ScheduleSettings userId={userId} colors={colors} />
      : page === "WhatsApp" ? <WhatsAppPanel userId={userId} colors={colors} active={active} />
        : page === "Send activity" ? <SendActivity userId={userId} colors={colors} active={active} />
          : page === "Integrations" ? <Integrations key={userId} userId={userId} colors={colors} /> : null}
  </ScrollView>;
}
