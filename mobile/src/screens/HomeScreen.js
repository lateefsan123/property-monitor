import { createElement, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Circle,
  Line,
  Path,
  Polyline,
  Svg,
  Text as SvgText,
} from "react-native-svg";
import { useListingAlertsSummary } from "../features/listing-alerts/useListingAlertsSummary";
import { useHomeLeadSummary } from "../features/seller-signal/useHomeLeadSummary";
import { getTheme } from "../theme";

function getHomeColors(theme) {
  const base = getTheme(theme);
  const isDark = theme === "dark";

  return {
    accent: isDark ? "#60A5FA" : "#155EEF",
    border: isDark ? "#2A2D32" : "#E1E4E8",
    danger: isDark ? "#FB7185" : "#DC2626",
    isDark,
    muted: isDark ? "#9CA3AF" : "#667085",
    navBackground: isDark ? "#111315" : "#FAFAF8",
    page: isDark ? "#111315" : "#FAFAF8",
    pressed: isDark ? "#1B1E22" : "#F1F3F5",
    text: isDark ? "#F5F7FA" : "#15171A",
    textSoft: isDark ? "#D0D5DD" : "#344054",
    themeBase: base,
  };
}

function Icon({ children, color, size = 22, strokeWidth = 1.7 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

function SunIcon({ color }) {
  return (
    <Icon color={color}>
      <Circle cx="12" cy="12" r="3.5" />
      <Line x1="12" y1="2" x2="12" y2="4" />
      <Line x1="12" y1="20" x2="12" y2="22" />
      <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <Line x1="2" y1="12" x2="4" y2="12" />
      <Line x1="20" y1="12" x2="22" y2="12" />
      <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </Icon>
  );
}

function MoonIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="M20.5 14.4A8 8 0 0 1 9.6 3.5a8 8 0 1 0 10.9 10.9Z" />
    </Icon>
  );
}

function SettingsIcon({ color }) {
  return (
    <Icon color={color}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19 12a7.1 7.1 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8.4 8.4 0 0 0-1.8-1L14.2 3h-4.4L9.4 6a8.4 8.4 0 0 0-1.8 1L5.1 6l-2 3.4 2 1.6a7.1 7.1 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a8.4 8.4 0 0 0 1.8 1l.4 3h4.4l.4-3a8.4 8.4 0 0 0 1.8-1l2.5 1 2-3.4-2-1.6a7.1 7.1 0 0 0 .1-1Z" />
    </Icon>
  );
}

function HomeIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="m3 10 9-7 9 7" />
      <Path d="M5 9v12h14V9" />
      <Path d="M9 21v-7h6v7" />
    </Icon>
  );
}

function LeadsIcon({ color }) {
  return (
    <Icon color={color}>
      <Circle cx="9" cy="8" r="3" />
      <Path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20" />
      <Path d="M16 6.3a3 3 0 0 1 0 5.4M18 14.5a4.5 4.5 0 0 1 2.5 4V20" />
    </Icon>
  );
}

function ListingsIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="M5 21V5l7-2v18" />
      <Path d="M12 8h7v13H3h18" />
      <Line x1="8" y1="8" x2="9" y2="8" />
      <Line x1="8" y1="12" x2="9" y2="12" />
      <Line x1="8" y1="16" x2="9" y2="16" />
      <Line x1="15" y1="12" x2="16" y2="12" />
      <Line x1="15" y1="16" x2="16" y2="16" />
    </Icon>
  );
}

function SheetIcon({ color }) {
  return (
    <Icon color={color}>
      <Path d="M4 3h16v18H4z" />
      <Line x1="4" y1="9" x2="20" y2="9" />
      <Line x1="4" y1="15" x2="20" y2="15" />
      <Line x1="10" y1="3" x2="10" y2="21" />
    </Icon>
  );
}

function MoreIcon({ color }) {
  return (
    <Icon color={color}>
      <Circle cx="5" cy="12" r="1" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1" fill={color} stroke="none" />
      <Circle cx="19" cy="12" r="1" fill={color} stroke="none" />
    </Icon>
  );
}

function ArrowDownIcon({ color }) {
  return (
    <Icon color={color} size={28} strokeWidth={1.8}>
      <Line x1="12" y1="3" x2="12" y2="20" />
      <Path d="m5 13 7 7 7-7" />
    </Icon>
  );
}

function ChevronIcon({ color }) {
  return (
    <Icon color={color} size={18}>
      <Path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

function MessageChart({ colors, series, width }) {
  const chartWidth = Math.max(280, width);
  const height = 206;
  const top = 30;
  const bottom = 34;
  const left = 8;
  const right = 8;
  const plotWidth = chartWidth - left - right;
  const plotHeight = height - top - bottom;
  const values = series.map((day) => Number(day?.count) || 0);
  const maxValue = Math.max(4, ...values);
  const chartMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const xFor = (index) => left + (index / Math.max(series.length - 1, 1)) * plotWidth;
  const yFor = (value) => top + plotHeight - (value / chartMax) * plotHeight;
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
  const lastIndex = Math.max(series.length - 1, 0);
  const lastValue = values[lastIndex] || 0;
  const lastX = xFor(lastIndex);
  const lastY = yFor(lastValue);
  const guides = [0, chartMax / 2, chartMax];

  return (
    <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
      {guides.map((value) => {
        const y = yFor(value);
        return (
          <Line
            key={value}
            x1={left}
            x2={chartWidth - right}
            y1={y}
            y2={y}
            stroke={colors.border}
            strokeWidth="1"
            strokeDasharray={value === 0 ? undefined : "4 6"}
          />
        );
      })}
      <Line
        x1={lastX}
        x2={lastX}
        y1={top - 2}
        y2={top + plotHeight}
        stroke={colors.accent}
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.65"
      />
      <Polyline
        points={points}
        fill="none"
        stroke={colors.accent}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((value, index) => (
        <Circle
          key={`${series[index]?.key || index}-dot`}
          cx={xFor(index)}
          cy={yFor(value)}
          r={index === lastIndex ? 4.5 : 2.6}
          fill={colors.page}
          stroke={colors.accent}
          strokeWidth={index === lastIndex ? 2.4 : 1.8}
        />
      ))}
      <SvgText
        x={lastX - 2}
        y={Math.max(15, lastY - 14)}
        fill={colors.accent}
        fontSize="11"
        fontWeight="600"
        textAnchor="end"
      >
        {`Today ${lastValue}`}
      </SvgText>
      {series.map((day, index) => (
        <SvgText
          key={`${day?.key || index}-label`}
          x={xFor(index)}
          y={height - 8}
          fill={colors.muted}
          fontSize="9"
          textAnchor="middle"
        >
          {day?.label || ""}
        </SvgText>
      ))}
    </Svg>
  );
}

function Metric({ label, value, colors, isLast }) {
  return (
    <View style={[s.metric, !isLast && { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth }]}>
      <Text selectable style={[s.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.metricLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function NavItem({ active = false, colors, icon: NavIcon, label, onPress }) {
  const color = active ? colors.accent : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [s.navItem, pressed && { opacity: 0.55 }]}
    >
      {createElement(NavIcon, { color })}
      <Text style={[s.navLabel, { color }, active && s.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function formatToday() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

export default function HomeScreen({
  theme,
  onOpenDashboard,
  onOpenSpreadsheet,
  onOpenSettings,
  onOpenAlerts,
  onToggleTheme,
  userId,
  previewAlertSummary,
  previewSummary,
}) {
  const colors = getHomeColors(theme);
  const { width } = useWindowDimensions();
  const liveSummary = useHomeLeadSummary(userId);
  const liveAlertSummary = useListingAlertsSummary();
  const summary = previewSummary ?? liveSummary;
  const alertSummary = previewAlertSummary ?? liveAlertSummary;
  const chartWidth = Math.max(280, width - 48);
  const series = useMemo(() => {
    if (Array.isArray(summary.messageSeries) && summary.messageSeries.length) return summary.messageSeries;
    return (summary.sentTrend || []).map((count, index) => ({ count, key: String(index), label: "" }));
  }, [summary.messageSeries, summary.sentTrend]);
  const totalMessages = series.reduce((total, day) => total + (Number(day.count) || 0), 0);
  const dueCount = summary.loading ? "—" : summary.dueCount ?? 0;
  const urgentCount = summary.loading ? "—" : summary.urgentCount ?? 0;
  const scheduledCount = summary.loading ? "—" : summary.scheduledCount ?? 0;
  const replyRate = summary.replyLoading
    ? "—"
    : Number.isFinite(summary.replyRate)
      ? `${summary.replyRate}%`
      : "—";
  const priceDropCount = alertSummary.loading ? null : alertSummary.priceDropCount ?? 0;
  const upcomingFollowups = summary.upcomingFollowups || [];
  const queueTitle = summary.hasLeads === false && !summary.loading
    ? "Import your first seller list"
    : `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due`;
  const queueAction = summary.hasLeads === false ? "Import leads" : "Start queue";

  return (
    <SafeAreaView style={[s.page, { backgroundColor: colors.page }]} edges={["top", "bottom"]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor={colors.page} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.topBar}>
          <View>
            <Text style={[s.brand, { color: colors.text }]}>Repeat AI</Text>
            <Text style={[s.date, { color: colors.muted }]}>{formatToday()}</Text>
          </View>
          <View style={s.topActions}>
            <Pressable
              accessibilityLabel={`Use ${colors.isDark ? "light" : "dark"} mode`}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onToggleTheme}
              style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.5 }]}
            >
              {colors.isDark ? <SunIcon color={colors.text} /> : <MoonIcon color={colors.text} />}
            </Pressable>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onOpenSettings}
              style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.5 }]}
            >
              <SettingsIcon color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={s.hero}>
          <Text style={[s.eyebrow, { color: colors.muted }]}>TODAY</Text>
          <View style={s.heroRow}>
            <Text selectable style={[s.heroTitle, { color: colors.text }]}>{queueTitle}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={summary.hasLeads === false ? onOpenSpreadsheet : onOpenDashboard}
              style={({ pressed }) => [s.textAction, pressed && { opacity: 0.55 }]}
            >
              <Text style={[s.textActionLabel, { color: colors.accent }]}>{queueAction} →</Text>
            </Pressable>
          </View>
        </View>

        <View style={[s.metrics, { borderBottomColor: colors.border, borderTopColor: colors.border }]}>
          <Metric colors={colors} label="urgent" value={urgentCount} />
          <Metric colors={colors} label="scheduled" value={scheduledCount} />
          <Metric colors={colors} label="reply rate" value={replyRate} isLast />
        </View>

        <View style={s.sectionHeader}>
          <View>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Messages</Text>
            <Text selectable style={[s.sectionMeta, { color: colors.muted }]}>{totalMessages} · last 14 days</Text>
          </View>
          {summary.replySampleSize > 0 ? (
            <Text style={[s.sampleMeta, { color: colors.muted }]}>{summary.repliedCount}/{summary.replySampleSize} contacts replied</Text>
          ) : null}
        </View>

        <View style={s.chartWrap}>
          <MessageChart colors={colors} series={series} width={chartWidth} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenAlerts}
          style={({ pressed }) => [
            s.priceRow,
            { borderBottomColor: colors.border, borderTopColor: colors.border },
            pressed && { backgroundColor: colors.pressed },
          ]}
        >
          <ArrowDownIcon color={colors.danger} />
          <View style={s.priceCopy}>
            <Text selectable style={[s.priceTitle, { color: colors.text }]}>
              {priceDropCount === null
                ? "Checking price changes"
                : `${priceDropCount} listing${priceDropCount === 1 ? "" : "s"} reduced`}
            </Text>
            <Text style={[s.priceMeta, { color: colors.muted }]}>Changes in your tracked listings</Text>
          </View>
          <Text style={[s.rowAction, { color: colors.accent }]}>View</Text>
        </Pressable>

        <View style={s.upcomingHeader}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming follow-ups</Text>
          <Pressable onPress={onOpenDashboard} hitSlop={8}>
            <Text style={[s.rowAction, { color: colors.accent }]}>See all</Text>
          </Pressable>
        </View>

        {upcomingFollowups.length ? upcomingFollowups.map((lead) => (
          <Pressable
            accessibilityRole="button"
            key={lead.id}
            onPress={onOpenDashboard}
            style={({ pressed }) => [
              s.followupRow,
              { borderBottomColor: colors.border },
              pressed && { backgroundColor: colors.pressed },
            ]}
          >
            <View style={s.followupCopy}>
              <Text selectable numberOfLines={1} style={[s.followupName, { color: colors.text }]}>{lead.name}</Text>
              <Text numberOfLines={1} style={[s.followupMeta, { color: colors.muted }]}>
                {[lead.dueLabel, lead.building].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <ChevronIcon color={colors.muted} />
          </Pressable>
        )) : (
          <View style={[s.emptyQueue, { borderBottomColor: colors.border }]}>
            <Text style={[s.followupName, { color: colors.text }]}>Queue clear</Text>
            <Text style={[s.followupMeta, { color: colors.muted }]}>No upcoming follow-ups.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[s.bottomNav, { backgroundColor: colors.navBackground, borderTopColor: colors.border }]}>
        <NavItem active colors={colors} icon={HomeIcon} label="Home" />
        <NavItem colors={colors} icon={LeadsIcon} label="Leads" onPress={onOpenDashboard} />
        <NavItem colors={colors} icon={ListingsIcon} label="Listings" onPress={onOpenAlerts} />
        <NavItem colors={colors} icon={SheetIcon} label="Sheet" onPress={onOpenSpreadsheet} />
        <NavItem colors={colors} icon={MoreIcon} label="More" onPress={onOpenSettings} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 22, paddingHorizontal: 24 },
  topBar: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  brand: { fontSize: 25, fontWeight: "700", letterSpacing: -0.8 },
  date: { fontSize: 12, marginTop: 2 },
  topActions: { flexDirection: "row", gap: 18, paddingTop: 3 },
  iconButton: { alignItems: "center", height: 36, justifyContent: "center", width: 28 },
  hero: { paddingBottom: 22, paddingTop: 34 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  heroRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  heroTitle: { flex: 1, fontSize: 27, fontWeight: "600", letterSpacing: -0.8, lineHeight: 32, paddingRight: 14 },
  textAction: { paddingBottom: 3, paddingVertical: 8 },
  textActionLabel: { fontSize: 14, fontWeight: "600" },
  metrics: { borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingVertical: 15 },
  metric: { flex: 1, paddingHorizontal: 11 },
  metricValue: { fontSize: 17, fontVariant: ["tabular-nums"], fontWeight: "600" },
  metricLabel: { fontSize: 11, marginTop: 2 },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", paddingTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "600", letterSpacing: -0.35 },
  sectionMeta: { fontSize: 13, fontVariant: ["tabular-nums"], marginTop: 3 },
  sampleMeta: { fontSize: 10, paddingBottom: 2 },
  chartWrap: { alignItems: "center", marginHorizontal: -1, overflow: "hidden", paddingTop: 4 },
  priceRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 76, paddingHorizontal: 5 },
  priceCopy: { flex: 1, paddingHorizontal: 16 },
  priceTitle: { fontSize: 16, fontVariant: ["tabular-nums"], fontWeight: "600" },
  priceMeta: { fontSize: 11, marginTop: 3 },
  rowAction: { fontSize: 13, fontWeight: "600" },
  upcomingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 6, paddingTop: 22 },
  followupRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 62, paddingHorizontal: 4, paddingVertical: 10 },
  followupCopy: { flex: 1, paddingRight: 12 },
  followupName: { fontSize: 15, fontWeight: "600" },
  followupMeta: { fontSize: 11, marginTop: 3 },
  emptyQueue: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
  bottomNav: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 68, paddingHorizontal: 8, paddingTop: 8 },
  navItem: { alignItems: "center", flex: 1, gap: 3, justifyContent: "flex-start" },
  navLabel: { fontSize: 10 },
  navLabelActive: { fontWeight: "600" },
});
