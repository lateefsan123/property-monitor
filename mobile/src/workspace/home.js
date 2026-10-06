import { messageTemplatesOptions } from "./message-templates";
import ContentSkeleton from "../components/ContentSkeleton";
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import HomeActivity from "./home-activity";
import { useQuery } from "@tanstack/react-query";
import AppIcon from "../components/AppIcon";
import { fetchUserLeads } from "../features/seller-signal/services";
import { leadsQueryKey } from "../features/seller-signal/useHomeLeadSummary";
import { summarizeLeadCadence } from "../features/seller-signal/lead-utils";
import { buildDailyMessageSeries, fetchListingPriceDrops, fetchWhatsAppMessageActivity } from "./home-insights";
import { formatArea, formatPrice } from "../features/listing-alerts/formatters";
import { Feedback } from "./ui";
import { integrationStatusOptions } from '../../../src/integration-query';
import { integrationRequest } from './integration-client';
import { useEmailSummary } from '../../../shared/use-email-summary';
import EmailSummaryCard from './email-summary-card';
import CalendarToday from './calendar-today';
import HomeConnectionPrompt from './home-connection-prompt';
import HomeMessageFeed from "./home-message-feed";
import HomeSetupChecklist from "./home-setup-checklist";
import { supabase } from "../supabase";
import { fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist.js";
import { openSetupAction } from "./setup-next-action";
import { fetchMessagePage, messageFeedQueryKey } from "./message-feed";

export default function WorkspaceHome({ userId, displayName, colors, active = true, onNavigate, onAskRepeat }) {
  useQuery(messageTemplatesOptions(userId));
  const [tab, setTab] = useState("activity");
  const [days, setDays] = useState(14);
  const [refreshing, setRefreshing] = useState(false);
  const connections = useQuery(integrationStatusOptions(userId, integrationRequest));
  const hasEmail = connections.data?.some(item => item.feature === 'email' && item.connected) || false;
  const emailSummary = useEmailSummary({ userId, connected: hasEmail, request: integrationRequest });
  const hasCalendar = connections.data?.some(item => item.feature === 'calendar' && item.connected) || false;
  // Each card appears once the account uses what it shows (web Home does the same).
  const setup = useQuery({ queryKey: setupChecklistQueryKey(userId), queryFn: () => fetchSetupStatus(supabase, userId), enabled: Boolean(userId) });
  const usingSellers = (setup.data?.leadCount || 0) > 0;
  const messaging = Boolean(setup.data?.messageSent);
  const watching = Boolean(setup.data?.watching);
  const tabs = [["activity", "Activity", messaging], ["drops", "Price drops", watching], ["email", "Email", hasEmail], ["calendar", "Calendar", hasCalendar]].filter(item => item[2]);
  const activeTab = tabs.some(([id]) => id === tab) ? tab : tabs[0]?.[0];
  const emailConnected = connections.data ? hasEmail : emailSummary.data?.connected;
  const emailReady = connections.data !== undefined || emailSummary.data !== undefined;
  const leads = useQuery({
    queryKey: leadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId),
  });
  const activity = useQuery({
    queryKey: ["home", "whatsapp-activity", userId, 14],
    queryFn: () => fetchWhatsAppMessageActivity(userId),
    enabled: Boolean(userId),
  });
  const feed = useQuery({
    queryKey: messageFeedQueryKey(userId, "latest"),
    queryFn: () => fetchMessagePage(userId, { days: 7, pageSize: 3 }),
    enabled: Boolean(userId),
  });
  const drops = useQuery({
    queryKey: ["home", "price-drops", userId],
    queryFn: () => fetchListingPriceDrops(userId),
    enabled: Boolean(userId),
  });
  const series = buildDailyMessageSeries(activity.data || []);
  const cadence = summarizeLeadCadence(leads.data?.leads);
  const leadsReady = leads.data !== undefined;
  const noSellers = leadsReady && !(leads.data?.leads || []).length;
  const activityReady = activity.data !== undefined;
  const metrics = [
    { label: "Due today", value: leadsReady ? cadence.due : "—", action: () => onNavigate("sellers") },
    { label: "Scheduled", value: leadsReady ? cadence.scheduled : "—", action: () => onNavigate("schedule") },
    { label: "Sent today", value: activityReady ? series[series.length - 1]?.count || 0 : "—", action: () => setTab("activity") },
  ];
  async function refresh() {
    setRefreshing(true);
    try { await Promise.all([setup.refetch(), leads.refetch(), activity.refetch(), feed.refetch(), drops.refetch(), connections.refetch(), ...(hasEmail ? [emailSummary.refetch()] : [])]); }
    finally { setRefreshing(false); }
  }
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 26, width: "100%", maxWidth: 720, alignSelf: "center" }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Text>
        <Text style={{ color: colors.textName, fontSize: 25, fontWeight: "600", letterSpacing: -0.6 }}>Hello{displayName ? `, ${displayName}` : ""}</Text>
      </View>
      <HomeSetupChecklist key={userId} userId={userId} colors={colors} active={active} onNavigate={onNavigate} />
      <Feedback error={leads.error || activity.error || drops.error} colors={colors} onRetry={refresh} />
      {usingSellers ? <>
      <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: "row", paddingVertical: 22 }}>
          {metrics.map((metric, index) => <Pressable key={metric.label} accessibilityRole="button" accessibilityLabel={`${metric.label}: ${metric.value}`} onPress={metric.action}
            style={{ flex: 1, gap: 8, paddingHorizontal: 14, borderLeftWidth: index ? 1 : 0, borderLeftColor: colors.borderLight }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{metric.label}</Text>
            <Text selectable style={{ fontSize: 30, fontWeight: "600", letterSpacing: -0.8, fontVariant: ["tabular-nums"], color: colors.textName }}>{metric.value}</Text>
          </Pressable>)}
        </View>
        <Pressable accessibilityRole="button" onPress={() => (noSellers ? openSetupAction({ id: "import" }, onNavigate) : onNavigate("sellers"))}
          style={({ pressed }) => ({ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.borderLight, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: colors.textName, fontSize: 14, fontWeight: "500" }}>{noSellers ? "Import your sellers to get started" : leadsReady && cadence.due === 0 ? "All caught up · View sellers" : "View sellers"}</Text>
          <AppIcon name="chevron" color={colors.textMuted} size={17} />
        </Pressable>
      </View>
      </> : null}
      {messaging ? <HomeMessageFeed userId={userId} query={feed} colors={colors} onNavigate={onNavigate} onOpenSeller={(sellerId) => onNavigate("sellers", { sellerId, sellerTab: "History" })} /> : null}
      {tabs.length ? <>
      <View style={{ gap: 24 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {tabs.map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: activeTab === id }} onPress={() => setTab(id)}
            style={{ minHeight: 48, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: activeTab === id ? colors.textName : "transparent" }}>
            <Text style={{ fontSize: 14, fontWeight: activeTab === id ? "600" : "400", color: activeTab === id ? colors.textName : colors.textMuted }}>{label}</Text>
          </Pressable>)}
        </View>
        {activeTab === 'calendar' ? <CalendarToday colors={colors} userId={userId} connections={connections.data} connectionError={connections.error} retryConnections={connections.refetch} onAskRepeat={onAskRepeat} /> : activeTab === "email" ? (
          emailReady && !emailConnected ? <HomeConnectionPrompt feature="email" colors={colors} userId={userId} connections={connections.data} /> : <EmailSummaryCard key={userId} query={emailSummary} colors={colors} connectedProviders={connections.data ? connections.data.filter(item => item.feature === 'email' && item.connected).map(item => item.provider) : emailSummary.data?.providers || []} />
        ) : activeTab === "activity" ? <HomeActivity series={series} days={days} onDaysChange={setDays} ready={activityReady} loading={activity.isPending} colors={colors} /> : (
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <View style={{ gap: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Last 14 days</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View all price drops" onPress={() => onNavigate("listing-alerts", { priceDrops: true })} style={{ minHeight: 44, justifyContent: "center", paddingLeft: 8 }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>View all</Text>
          </Pressable>
        </View>
        {drops.isPending ? <ContentSkeleton colors={colors} rows={3} label="Loading price drops" /> : null}
        {drops.data?.slice(0, 5).map((item, index) => (
          <Pressable key={`${item.locationId}:${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.buildingName}, ${item.title}`}
            onPress={() => onNavigate("listing-alerts", { listing: item })}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: index < Math.min(drops.data.length, 5) - 1 ? 1 : 0, borderBottomColor: colors.borderLight, opacity: pressed ? 0.7 : 1 })}>
            {item.coverPhoto ? <Image source={{ uri: item.coverPhoto }} resizeMode="cover" style={{ width: 48, height: 48, borderRadius: 10 }} /> : <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.bgBadge, justifyContent: "center", alignItems: "center" }}><AppIcon name="building" size={22} color={colors.textMuted} /></View>}
            <View style={{ flex: 1, gap: 5 }}>
              <Text numberOfLines={1} style={{ color: colors.textName, fontSize: 14, fontWeight: "600" }}>{item.buildingName}</Text>
              <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{[item.beds === 0 ? "Studio" : item.beds ? `${item.beds} bed` : null, formatArea(item.areaSqft)].filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <Text style={{ color: colors.textName, fontSize: 14, fontWeight: "600" }}>{formatPrice(item.price)}</Text>
              <Text style={{ color: colors.badgeOkText, fontSize: 12 }}>↓ {formatPrice(Math.abs(item.priceDelta || 0))}</Text>
            </View>
          </Pressable>
        ))}
        {!drops.isPending && !drops.error && !drops.data?.length ? <Text style={{ color: colors.textMuted, fontSize: 14, paddingVertical: 20 }}>No recent drops in your watched buildings.</Text> : null}
      </View>

        )}
      </View>
      </> : null}
    </ScrollView>
  );
}
