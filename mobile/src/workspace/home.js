import { useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import AppIcon from "../components/AppIcon";
import { fetchUserLeads } from "../features/seller-signal/services";
import { leadsQueryKey } from "../features/seller-signal/useHomeLeadSummary";
import { summarizeLeadCadence } from "../features/seller-signal/lead-utils";
import { buildDailyMessageSeries, fetchListingPriceDrops, fetchWhatsAppMessageActivity } from "./home-insights";
import { formatArea, formatPrice } from "../features/listing-alerts/formatters";
import { Button, Feedback } from "./ui";

export default function WorkspaceHome({ userId, displayName, colors, onNavigate }) {
  const { width } = useWindowDimensions();
  const [showActivity, setShowActivity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const drops = useQuery({
    queryKey: ["home", "price-drops", userId],
    queryFn: () => fetchListingPriceDrops(userId),
    enabled: Boolean(userId),
  });
  const series = buildDailyMessageSeries(activity.data || []);
  const cadence = summarizeLeadCadence(leads.data?.leads);
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const leadsReady = !leads.isPending && !leads.error;
  const activityReady = !activity.isPending && !activity.error;
  const chartWidth = Math.max(240, Math.min(width - 48, 660));
  const chartHeight = 150;
  const max = Math.max(4, Math.ceil(Math.max(...series.map((point) => point.count)) / 4) * 4);
  const barStep = (chartWidth - 34) / series.length;
  async function refresh() {
    setRefreshing(true);
    try { await Promise.all([leads.refetch(), activity.refetch(), drops.refetch()]); }
    finally { setRefreshing(false); }
  }
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      contentContainerStyle={{ padding: 24, paddingBottom: 112, gap: 28, width: "100%", maxWidth: 720, alignSelf: "center" }}>
      <Text style={{ color: colors.textMuted, fontSize: 15 }}>Hello{displayName ? `, ${displayName}` : ""}.</Text>
      <Feedback error={leads.error || activity.error || drops.error} colors={colors} onRetry={refresh} />

      <View style={{ gap: 20, padding: 22, borderRadius: 20, backgroundColor: colors.bgCard }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Today</Text>
          <Text selectable style={{ fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.7, color: colors.textName }}>
            {!leadsReady ? "— sellers due" : cadence.due === 0 ? "You’re all caught up" : `${cadence.due} ${cadence.due === 1 ? "seller" : "sellers"} due today`}
          </Text>
          {leadsReady && cadence.due === 0 ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>No follow-ups due today.</Text> : null}
        </View>
        <Button colors={colors} primary onPress={() => onNavigate("sellers")} style={{ minHeight: 48, borderRadius: 12 }}>View sellers</Button>
      </View>

      <View style={{ flexDirection: "row", gap: 24 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="View scheduled follow-ups" onPress={() => onNavigate("schedule")} style={{ flex: 1, gap: 6, minHeight: 44 }}>
          <Text selectable style={{ color: colors.textName, fontSize: 20, fontWeight: "600" }}>{leadsReady ? cadence.scheduled : "—"}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Scheduled</Text>
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <Text selectable style={{ color: colors.textName, fontSize: 20, fontWeight: "600" }}>{activityReady ? series.at(-1)?.count || 0 : "—"}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sent today</Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.textName, fontSize: 18, fontWeight: "600" }}>Recent price drops</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Last 14 days</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View all price drops" onPress={() => onNavigate("listing-alerts", { priceDrops: true })} style={{ minHeight: 44, justifyContent: "center", paddingLeft: 8 }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>View all</Text>
          </Pressable>
        </View>
        {drops.isPending ? <ActivityIndicator accessibilityLabel="Loading price drops" color={colors.textMuted} style={{ padding: 20 }} /> : null}
        {drops.data?.slice(0, 3).map((item, index) => (
          <Pressable key={`${item.locationId}:${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.buildingName}, ${item.title}`}
            onPress={() => onNavigate("listing-alerts", { listing: item })}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: index < Math.min(drops.data.length, 3) - 1 ? 1 : 0, borderBottomColor: colors.borderLight, opacity: pressed ? 0.7 : 1 })}>
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

      <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showActivity }} onPress={() => setShowActivity(!showActivity)}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 }}>
          <Text style={{ color: colors.text, fontSize: 14 }}>{showActivity ? "Hide activity" : "View activity"}</Text>
          <View style={{ transform: [{ rotate: showActivity ? "-90deg" : "90deg" }] }}><AppIcon name="chevron" color={colors.textMuted} size={18} /></View>
        </Pressable>
        {showActivity ? <View style={{ gap: 12, paddingTop: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{activityReady ? `${total} messages sent · last 14 days` : "Message activity unavailable"}</Text>
          {activityReady && total > 0 ? (
          <Svg
            width="100%"
            height={chartHeight + 26}
            viewBox={`0 0 ${chartWidth} ${chartHeight + 26}`}
            accessibilityLabel={`Messages sent over the last 14 days: ${total}`}
          >
            {[0, 0.5, 1].map((ratio) => (
              <SvgText
                key={`label-${ratio}`}
                x={24}
                y={14 + ratio * (chartHeight - 30)}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {max * (1 - ratio)}
              </SvgText>
            ))}
            {[0, 0.5, 1].map((ratio) => (
              <Line
                key={ratio}
                x1={30}
                x2={chartWidth}
                y1={10 + ratio * (chartHeight - 30)}
                y2={10 + ratio * (chartHeight - 30)}
                stroke={colors.border}
                strokeDasharray="3 4"
              />
            ))}
            {series.map((point, i) => (
              <Rect
                key={point.key}
                x={34 + i * barStep}
                y={chartHeight - 20 - (point.count / max) * (chartHeight - 30)}
                width={Math.max(3, barStep * 0.6)}
                height={(point.count / max) * (chartHeight - 30)}
                rx={3}
                fill={colors.statValue}
              />
            ))}
            {[0, 4, 8, 13].map((i) => (
              <SvgText
                key={i}
                x={34 + i * barStep}
                y={chartHeight + 8}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor={i === 13 ? "end" : "start"}
              >
                {series[i].label}
              </SvgText>
            ))}
          </Svg>
          ) : activityReady ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>No messages sent yet.</Text> : null}
        </View> : null}
      </View>
    </ScrollView>
  );
}
