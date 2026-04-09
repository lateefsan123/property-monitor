import React from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle, Path, Rect, Line } from "react-native-svg";
import { useListingAlertsSummary } from "../features/listing-alerts/useListingAlertsSummary";
import { useHomeLeadSummary } from "../features/seller-signal/useHomeLeadSummary";
import { getTheme } from "../theme";

function getHomeColors(theme) {
  const c = getTheme(theme);
  const isDark = theme === "dark";

  return {
    isDark,
    pageBg: c.bg,
    gapBg: c.bg,
    ghostNumber: isDark ? "#161616" : "#ededed",
    eyebrow: isDark ? "#666" : c.textFaint,
    status: isDark ? "#fff" : c.textName,
    meta: isDark ? "#727272" : c.textMuted,
  };
}

const TILE_ICON_SIZE = 36;

function PeopleIcon({ color }) {
  return (
    <Svg width={TILE_ICON_SIZE} height={TILE_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function SheetIcon({ color }) {
  return (
    <Svg width={TILE_ICON_SIZE} height={TILE_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Line x1="3" y1="9" x2="21" y2="9" />
      <Line x1="3" y1="15" x2="21" y2="15" />
      <Line x1="9" y1="3" x2="9" y2="21" />
      <Line x1="15" y1="3" x2="15" y2="21" />
    </Svg>
  );
}

function GearIcon({ color }) {
  return (
    <Svg width={TILE_ICON_SIZE} height={TILE_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function BellIcon({ color }) {
  return (
    <Svg width={TILE_ICON_SIZE} height={TILE_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

function DotsIcon({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx="5" cy="12" r="1.5" fill={color} stroke="none" />
      <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      <Circle cx="19" cy="12" r="1.5" fill={color} stroke="none" />
    </Svg>
  );
}

function Tile({ title, subtitle, icon: Icon, color, backgroundColor, titleColor, subtitleColor, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        { 
          flex: 1, 
          backgroundColor: backgroundColor,
          padding: 16,
          justifyContent: "space-between"
        },
        pressed && { opacity: 0.85 }
      ]}
      onPress={onPress}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={{ fontSize: 18, color: titleColor, fontWeight: "500" }}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 17, color: subtitleColor, fontWeight: "400", marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
        <View style={{ marginTop: 2 }}>
          <DotsIcon color={color} />
        </View>
      </View>
      <View>
        <Icon color={color} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ theme, onOpenDashboard, onOpenSpreadsheet, onOpenSettings, onOpenAlerts, userId }) {
  const hc = getHomeColors(theme);
  const s = styles(hc);
  const summary = useHomeLeadSummary(userId);
  const alertSummary = useListingAlertsSummary();
  const bigNumber = summary.loading || summary.error ? "" : String(summary.dueCount);
  const hasLargeNumber = bigNumber.length > 2;
  const followupSubtitle = summary.loading
    ? "Syncing"
    : summary.error
      ? "Open queue"
      : summary.hasLeads
        ? summary.dueCount === 0
          ? "Queue clear"
          : `${summary.dueCount} due`
        : "Import leads";
  const headerEyebrow = "Follow-up Queue";
  const headerTitle = summary.loading
    ? "Syncing queue"
    : summary.error
      ? "Open Seller Followup"
      : summary.hasLeads
        ? summary.dueCount === 0
          ? "Queue clear"
          : "Due now"
        : "Import your first seller list";
  const headerMeta = summary.loading
    ? "Checking your active leads"
    : summary.error
      ? "Tap to open your seller queue"
      : summary.hasLeads
        ? `From ${summary.activeCount} active ${summary.activeCount === 1 ? "lead" : "leads"}`
        : "Tap to add a sheet and start tracking";
  const alertsSubtitle = alertSummary.loading
    ? "Watchlist"
    : alertSummary.totalChanges > 0
      ? `${alertSummary.totalChanges} ${alertSummary.totalChanges === 1 ? "change" : "changes"}`
      : alertSummary.watchedBuildingCount > 0
        ? alertSummary.trackedListingCount > 0
          ? alertSummary.hasSnapshot
            ? "Up to date"
            : `Tracking ${alertSummary.trackedListingCount}`
          : "Pick units"
        : "Watchlist";

  return (
    <SafeAreaView style={s.page} edges={["top", "bottom"]}>
      <StatusBar barStyle={hc.isDark ? "light-content" : "dark-content"} backgroundColor={hc.pageBg} />
      
      <Pressable style={({ pressed }) => [s.headerContainer, pressed && { opacity: 0.94 }]} onPress={onOpenDashboard}>
        <View style={s.headerContent}>
          <Text style={[s.bigNumber, hasLargeNumber && s.bigNumberCompact]}>{bigNumber}</Text>

          <View style={s.statsContainer}>
            <Text style={s.eyebrowText}>{headerEyebrow}</Text>
            <Text style={s.statusText}>{headerTitle}</Text>
            <Text style={s.metaText}>{headerMeta}</Text>
          </View>
        </View>
      </Pressable>

      <View style={s.grid}>
        <View style={s.row}>
          <Tile 
            title="Seller Followup" 
            subtitle={followupSubtitle}
            icon={PeopleIcon}
            color="#fff" 
            backgroundColor="#2563EB" 
            titleColor="#fff"
            subtitleColor="#BFDBFE"
            onPress={onOpenDashboard}
          />
          <View style={s.vGap} />
          <Tile 
            title="Spreadsheet" 
            subtitle="Sync" 
            icon={SheetIcon}
            color="#fff" 
            backgroundColor="#2C2C2E" 
            titleColor="#bbb"
            subtitleColor="#3B82F6"
            onPress={onOpenSpreadsheet}
          />
        </View>
        <View style={s.hGap} />
        <View style={s.row}>
          <Tile 
            title="Listing Alerts" 
            subtitle={alertsSubtitle}
            icon={BellIcon}
            color="#fff" 
            backgroundColor="#2563EB" 
            titleColor="#fff"
            subtitleColor="#BFDBFE"
            onPress={onOpenAlerts}
          />
          <View style={s.vGap} />
          <Tile 
            title="Settings" 
            subtitle="System" 
            icon={GearIcon}
            color="#fff" 
            backgroundColor="#2C2C2E" 
            titleColor="#bbb"
            subtitleColor="#bbb"
            onPress={onOpenSettings}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (hc) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: hc.pageBg },
    headerContainer: {
      flex: 0.56,
      overflow: "hidden",
    },
    headerContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 16,
      position: "relative",
    },
    bigNumber: {
      position: "absolute",
      right: -36,
      top: 18,
      fontSize: 236,
      fontWeight: "400",
      color: hc.ghostNumber,
      lineHeight: 264,
      includeFontPadding: false,
      letterSpacing: -12,
    },
    bigNumberCompact: {
      right: -12,
      top: 26,
      fontSize: 188,
      lineHeight: 214,
      letterSpacing: -8,
    },
    statsContainer: {
      position: "absolute",
      top: 76,
      left: 24,
      maxWidth: 180,
      zIndex: 10,
    },
    eyebrowText: {
      fontSize: 11,
      color: hc.eyebrow,
      marginBottom: 10,
      fontWeight: "700",
      letterSpacing: 0.9,
      textTransform: "uppercase",
    },
    statusText: {
      fontSize: 28,
      color: hc.status,
      fontWeight: "500",
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    metaText: {
      fontSize: 13,
      color: hc.meta,
      lineHeight: 18,
      marginTop: 12,
    },
    grid: {
      flex: 1,
      backgroundColor: hc.gapBg,
    },
    row: {
      flex: 1,
      flexDirection: "row",
    },
    hGap: { height: 2, backgroundColor: hc.gapBg },
    vGap: { width: 2, backgroundColor: hc.gapBg },
  });
