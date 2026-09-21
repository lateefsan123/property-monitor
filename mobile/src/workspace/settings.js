import { useCallback, useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAutomationSettings, saveAutomationSettings } from "./automation-settings";
import { fetchWhatsAppSendActivity } from "./send-activity";
import WhatsAppPanel from "./whatsapp-panel";
import AccountSettings from "../screens/SettingsScreen";
import Integrations from './integrations';
import { Button, Feedback, Icon } from "./ui";

const SETTINGS_PAGES = [
  ["General", "settings"],
  ["Automations", "filter"],
  ["WhatsApp", "message"],
  ["Send activity", "table"],
  ["Integrations", "table"],
  ["Accounts", "users"],
];

function SettingsRow({ label, colors, onPress, children, icon }) {
  const content = <>
    {icon ? <Icon name={icon} color={colors.textMuted} size={21} /> : null}
    <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "500" }}>{label}</Text>
    {children || <Icon name="chevron" color={colors.textFaint} size={18} />}
  </>;
  const style = {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  };
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>
      {content}
    </Pressable>
  ) : <View style={style}>{content}</View>;
}

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
        <Switch accessibilityLabel={label} value={Boolean(query.data?.[id])} disabled={!query.data || mutation.isPending} onValueChange={(value) => mutation.mutate({ ...query.data, [id]: value })} />
      </View>
    ))}
    <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
      Up to 40 messages a day, five minutes apart. Transaction updates go first. All schedules use Dubai time.
    </Text>
  </View>;
}

const SOURCE_LABELS = { auto: "Automated", bulk: "Bulk messages", manual: "Manual", mcp: "Integrations", other: "Other" };
function readableLabel(value) {
  const text = String(value).replace(/[_-]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
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
    {query.data ? <>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Today · Dubai time</Text>
        <Text selectable style={{ color: colors.textName, fontSize: 32, fontWeight: "700" }}>{query.data.total} messages</Text>
        <Text style={{ color: colors.textMuted }}>{query.data.distinctLeads} sellers contacted</Text>
      </View>
      {Object.entries(query.data.sources).filter(([, count]) => count > 0).map(([name, count]) => (
        <SettingsRow key={name} label={SOURCE_LABELS[name] || readableLabel(name)} colors={colors}>
          <Text selectable style={{ color: colors.text, fontSize: 16 }}>{count}</Text>
        </SettingsRow>
      ))}
      {Object.keys(query.data.origins).length ? <View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sent from</Text>
        {Object.entries(query.data.origins).map(([name, count]) => (
          <SettingsRow key={name} label={readableLabel(name)} colors={colors}>
            <Text selectable style={{ color: colors.text }}>{count}</Text>
          </SettingsRow>
        ))}
      </View> : null}
      {query.data.alerts.map((alert) => (
        <Text key={alert.id} style={{ color: colors.errorText }}>{readableLabel(alert.alert_type)}: {alert.observed_count} ({alert.severity})</Text>
      ))}
    </> : null}
    <Button colors={colors} disabled={query.isFetching} onPress={query.refetch}>Refresh activity</Button>
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

  if (page === "Accounts") return <AccountSettings {...accountProps} embedded hideAppearance />;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>
    {!page ? SETTINGS_PAGES.map(([label, icon]) => (
      <SettingsRow key={label} label={label} icon={icon} colors={colors} onPress={() => setPage(label)} />
    )) : page === "General" ? (
      <SettingsRow label="Dark mode" icon="moon" colors={colors}>
        <Switch accessibilityLabel="Dark mode" value={accountProps.theme === "dark"} onValueChange={accountProps.onToggleTheme} />
      </SettingsRow>
    ) : page === "Automations" ? <Automations userId={userId} colors={colors} />
      : page === "WhatsApp" ? <WhatsAppPanel userId={userId} colors={colors} active={active} />
        : page === "Send activity" ? <SendActivity userId={userId} colors={colors} active={active} />
          : page === "Integrations" ? <Integrations key={userId} userId={userId} colors={colors} /> : null}
  </ScrollView>;
}
