import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { fetchUserLeads } from "../features/seller-signal/services";
import { leadsQueryKey } from "../features/seller-signal/useHomeLeadSummary";
import { summarizeLeadCadence } from "../features/seller-signal/lead-utils";
import {
  buildDailyMessageSeries,
  fetchListingPriceDrops,
  fetchWhatsAppMessageActivity,
} from "./home-insights";
import { formatArea, formatPrice } from "../features/listing-alerts/formatters";
import { Button, Card, Feedback } from "./ui";

function Stat({ label, value, colors }) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text
        style={{
          fontSize: 12,
          color: colors.textMuted,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 23,
          color: colors.textName,
          fontVariant: ["tabular-nums"],
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
export default function WorkspaceHome({
  userId,
  displayName,
  colors,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
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
  const busiest = series.reduce(
    (best, point) => (point.count > best.count ? point : best),
    series[0],
  );
  const chartWidth = Math.max(240, Math.min(width - 66, 660));
  const chartHeight = 200;
  const max = Math.max(4, Math.ceil(Math.max(...series.map((point) => point.count)) / 4) * 4);
  const barStep = (chartWidth - 34) / series.length;
  const loading = leads.isPending || activity.isPending || drops.isPending;
  const refresh = () =>
    Promise.all([leads.refetch(), activity.refetch(), drops.refetch()]);
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      <Text
        style={{
          color: colors.textName,
          fontSize: 23,
          fontWeight: "700",
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        Welcome back, {displayName || "there"}.
      </Text>
      <Feedback
        error={leads.error || activity.error || drops.error}
        colors={colors}
        onRetry={refresh}
      />
      <Card colors={colors}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat
            label="Due today"
            value={leads.isPending ? "—" : cadence.due}
            colors={colors}
          />
          <Stat
            label="Scheduled"
            value={leads.isPending ? "—" : cadence.scheduled}
            colors={colors}
          />
          <Stat
            label="Sent today"
            value={activity.isPending ? "—" : series.at(-1)?.count || 0}
            colors={colors}
          />
        </View>
        <Button colors={colors} onPress={() => onNavigate("sellers")}>
          Open sellers
        </Button>
      </Card>
      <View style={{ flexDirection: width >= 800 ? "row" : "column", gap: 16 }}>
        <Card colors={colors} style={width >= 800 ? { flex: 1 } : undefined}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat
              label="Sent · last 14 days"
              value={activity.isPending ? "—" : total}
              colors={colors}
            />
            <Stat
              label="Busiest day"
              value={activity.isPending || total === 0 ? "—" : `${busiest.count} · ${busiest.label}`}
              colors={colors}
            />
          </View>
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
          {!activity.isPending && total === 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              No messages sent in the last 14 days.
            </Text>
          )}
        </Card>
        <Card colors={colors} style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: "700",
            }}
          >
            Last 14 days
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: colors.textName,
                fontWeight: "700",
                fontSize: 17,
              }}
            >
              Price drops
            </Text>
            <Button
              colors={colors}
              onPress={() => onNavigate("listing-alerts", { priceDrops: true })}
            >{`View all (${drops.data?.length || 0})`}</Button>
          </View>
          {drops.data?.slice(0, 4).map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.buildingName}, ${item.title}`}
              key={`${item.locationId}:${item.id}`}
              onPress={() => onNavigate("listing-alerts", { listing: item })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              {item.coverPhoto && (
                <Image
                  source={{ uri: item.coverPhoto }}
                  style={{ width: 46, height: 46, borderRadius: 9 }}
                />
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textName,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {item.buildingName}
                </Text>

                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  {item.beds || "Studio"} bed · {formatArea(item.areaSqft)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textName,
                    fontWeight: "700",
                  }}
                >
                  {formatPrice(item.price)}
                </Text>
                <Text style={{ color: colors.badgeOkText, fontSize: 11 }}>
                  ↓ {formatPrice(Math.abs(item.priceDelta || 0))}
                </Text>
              </View>
            </Pressable>
          ))}
          {!drops.isPending && !drops.data?.length && (
            <Text style={{ color: colors.textMuted }}>
              No price drops in your watched buildings.
            </Text>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
