import { useWorkspacePreference } from "./preferences";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAutomationSettings, saveAutomationSettings } from "./automation-settings";
import { DAILY_AUTOMATION_CAP, MONTHLY_REPORT_SHARE_OPTIONS, SEND_INTERVAL_OPTIONS, formatHour, formatInterval, messagesThatFit, suggestedInterval } from "../../../shared/automation-settings.js";
import BottomSheet from "../components/BottomSheet";
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
      ["statusFollowupsEnabled", "Status follow-ups", "Send the template for a seller's status when they're due. Stops when they reply."],
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
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{(() => { const limit = query.data.dailyMessageLimit || DAILY_AUTOMATION_CAP; const reports = Math.min(limit, Math.round((query.data.monthlyReportDailyShare * limit) / DAILY_AUTOMATION_CAP)); return `${reports} monthly reports and ${limit - reports} transaction updates a day. Unused slots go to the other.`; })()}</Text>
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
    {query.data ? <SendPacing settings={query.data} colors={colors} saving={mutation.isPending} onChange={(values) => mutation.mutate({ ...query.data, ...values })} /> : null}
  </View>;
}

// Send hours and the gap between automated messages (web: Settings > Automations > Sending).
function SendPacing({ settings, colors, saving, onChange }) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const pacing = { start: settings.sendWindowStartHour, end: settings.sendWindowEndHour, interval: settings.sendIntervalMinutes };
  const limit = settings.dailyMessageLimit || DAILY_AUTOMATION_CAP;
  const fit = messagesThatFit(pacing, limit);
  const suggested = suggestedInterval(pacing, limit);
  const hourColumn = (label, hours, value, onPick) => <View style={{ flex: 1, gap: 4 }}>
    <Text style={{ color: colors.textMuted, fontSize: 13, paddingBottom: 4 }}>{label}</Text>
    <ScrollView style={{ maxHeight: 320 }}>
      {hours.map((hour) => <Pressable key={hour} accessibilityRole="radio" accessibilityState={{ checked: value === hour }} onPress={() => onPick(hour)}
        style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: value === hour ? colors.bgBadge : "transparent" }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: value === hour ? "600" : "400" }}>{formatHour(hour)}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
  const stepButton = (label, next, disabled) => <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={saving || disabled} onPress={() => onChange({ dailyMessageLimit: next })}
    style={({ pressed }) => ({ width: 40, height: 36, alignItems: "center", justifyContent: "center", opacity: saving || disabled ? 0.35 : pressed ? 0.6 : 1 })}>
    <Text style={{ color: colors.text, fontSize: 20 }}>{label === "Fewer messages" ? "−" : "+"}</Text>
  </Pressable>;
  return <>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Messages per day</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>How many automated WhatsApp messages go out each day, up to {DAILY_AUTOMATION_CAP}.</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 10, backgroundColor: colors.bgBadge }}>
        {stepButton("Fewer messages", limit - 1, limit <= 1)}
        <Text accessibilityLabel={`${limit} messages a day`} style={{ minWidth: 28, textAlign: "center", color: colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{limit}</Text>
        {stepButton("More messages", limit + 1, limit >= DAILY_AUTOMATION_CAP)}
      </View>
    </View>
    <Pressable accessibilityRole="button" disabled={saving} onPress={() => setHoursOpen(true)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Send between</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>Automated messages only go out in these hours, Dubai time.</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 15 }}>{formatHour(pacing.start)} – {formatHour(pacing.end)}</Text>
    </Pressable>
    <View style={{ gap: 12, paddingVertical: 16, borderBottomColor: colors.border, borderBottomWidth: 0.5 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Space messages</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>The gap between one automated message and the next.</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Gap between messages" style={{ flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: colors.bgBadge }}>
        {SEND_INTERVAL_OPTIONS.map((minutes) => {
          const selected = pacing.interval === minutes;
          return <Pressable key={minutes} accessibilityRole="radio" accessibilityState={{ selected, disabled: saving }} disabled={saving}
            onPress={() => onChange({ sendIntervalMinutes: minutes })}
            style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: selected ? colors.bgCard : "transparent" }}>
            <Text style={{ color: selected ? colors.text : colors.textMuted, fontWeight: "600", fontSize: 14 }}>{minutes === 60 ? "1h" : `${minutes}m`}</Text>
          </Pressable>;
        })}
      </View>
    </View>
    <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
      {formatHour(pacing.start)} to {formatHour(pacing.end)}, one every {formatInterval(pacing.interval)}: up to {fit} message{fit === 1 ? "" : "s"} a day{fit < limit ? `, fewer than your ${limit}. Widen the hours or shorten the gap to send them all.` : ", your daily limit."} Shared between updates and reports.
    </Text>
    {suggested !== pacing.interval ? <View style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.bgBadge }}>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>Suggested: one every {formatInterval(suggested)} spreads your {limit} message{limit === 1 ? "" : "s"} across the day, which WhatsApp is less likely to flag.</Text>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => onChange({ sendIntervalMinutes: suggested })}
        style={({ pressed }) => ({ alignSelf: "flex-start", minHeight: 36, paddingHorizontal: 14, justifyContent: "center", borderRadius: 10, backgroundColor: colors.bgCard, opacity: saving ? 0.4 : pressed ? 0.6 : 1 })}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Use {formatInterval(suggested)}</Text>
      </Pressable>
    </View> : null}
    <BottomSheet visible={hoursOpen} onClose={() => setHoursOpen(false)} colors={colors}>
      <View style={{ padding: 20, paddingTop: 4, gap: 16 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: "700" }}>Send between</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {hourColumn("Start", Array.from({ length: 24 }, (_, hour) => hour), pacing.start,
            (hour) => onChange({ sendWindowStartHour: hour, sendWindowEndHour: Math.max(hour + 1, pacing.end) }))}
          {hourColumn("End", Array.from({ length: 24 }, (_, index) => index + 1).filter((hour) => hour > pacing.start), pacing.end,
            (hour) => onChange({ sendWindowEndHour: hour }))}
        </View>
      </View>
    </BottomSheet>
  </>;
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
