import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle, Line, Path } from "react-native-svg";
import BottomSheet from "../components/BottomSheet";
import {
  formatArea,
  formatBedsAndBaths,
  formatListingTimestamp,
  formatPrice,
  formatPriceRange,
  formatSyncTimestamp,
} from "../features/listing-alerts/formatters";
import { useListingAlerts } from "../features/listing-alerts/useListingAlerts";
import { getTheme } from "../theme";
import ListingDetailScreen from "./ListingDetailScreen";

const VIEW_TAB_OPTIONS = [
  { id: "buildings", label: "Buildings" },
  { id: "listings", label: "Listings" },
];

const PRICE_BUCKETS = [
  { id: "all", label: "All" },
  { id: "lt1", label: "< 1M", max: 1_000_000 },
  { id: "1-3", label: "1-3M", min: 1_000_000, max: 3_000_000 },
  { id: "3-6", label: "3-6M", min: 3_000_000, max: 6_000_000 },
  { id: "gt6", label: "6M+", min: 6_000_000 },
];

const BED_OPTIONS = [
  { id: "all", label: "All" },
  { id: "studio", label: "Studio", match: (b) => b === 0 },
  { id: "1", label: "1 bed", match: (b) => b === 1 },
  { id: "2", label: "2 bed", match: (b) => b === 2 },
  { id: "3plus", label: "3+ bed", match: (b) => Number.isFinite(b) && b >= 3 },
];

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
];

// ---------- Icons ----------

function BackIcon({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function HomeIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

function ExternalLinkIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3h7v7" />
      <Path d="M10 14L21 3" />
      <Path d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

function ArrowIcon({ direction = "down", size = 11, color }) {
  // Compact arrow used inline with the price delta chip.
  const d = direction === "down" ? "M12 5v14M5 12l7 7 7-7" : "M12 19V5M5 12l7-7 7 7";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

function PriceDeltaChip({ priceDelta, colors }) {
  if (!Number.isFinite(priceDelta) || priceDelta === 0) return null;
  const isDrop = priceDelta < 0;
  const bg = isDrop ? colors.badgeOkBg : colors.badgeDueBg;
  const fg = isDrop ? colors.badgeOkText : colors.badgeDueText;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: bg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      }}
    >
      <ArrowIcon direction={isDrop ? "down" : "up"} color={fg} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: fg,
          lineHeight: 13,
          includeFontPadding: false,
        }}
      >
        {formatPrice(Math.abs(priceDelta))}
      </Text>
    </View>
  );
}

function StatusPill({ listing, colors }) {
  const isRemoved = listing.currentStatus === "removed";
  const backgroundColor = isRemoved ? colors.errorBg : colors.badgeOkBg;
  const color = isRemoved ? colors.errorText : colors.badgeOkText;

  return (
    <View style={{ backgroundColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color, lineHeight: 14, includeFontPadding: false }}>
        {isRemoved ? "Off market" : "Active"}
      </Text>
    </View>
  );
}

function TrackingPill({ colors }) {
  return (
    <View style={{ backgroundColor: colors.bgBadge, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text, lineHeight: 14, includeFontPadding: false }}>
        Tracking
      </Text>
    </View>
  );
}

function TuneIcon({ color }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="4" y1="21" x2="4" y2="14" />
      <Line x1="4" y1="10" x2="4" y2="3" />
      <Line x1="12" y1="21" x2="12" y2="12" />
      <Line x1="12" y1="8" x2="12" y2="3" />
      <Line x1="20" y1="21" x2="20" y2="16" />
      <Line x1="20" y1="12" x2="20" y2="3" />
      <Line x1="1" y1="14" x2="7" y2="14" />
      <Line x1="9" y1="8" x2="15" y2="8" />
      <Line x1="17" y1="16" x2="23" y2="16" />
    </Svg>
  );
}

function BellDotIcon({ color, accent }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
      {accent ? <Circle cx="19" cy="5" r="3" fill={accent} stroke="none" /> : null}
    </Svg>
  );
}

function SearchIcon({ color }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

// ---------- Small building components ----------

function WatchButton({ active, disabled, onPress, colors }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [
        {
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: active ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: active ? colors.tabActiveBg : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
        pressed && !disabled && { opacity: 0.82 },
      ]}
    >
      <BellDotIcon
        color={active ? colors.tabActiveText : colors.text}
        accent={active ? colors.statValue : null}
      />
    </Pressable>
  );
}

function BuildingRow({ building, colors, isWatched, watchDisabled, onToggleWatch, onPress, changeCount }) {
  const hasListingCount = Number.isFinite(building.listingCount);
  const countLine = hasListingCount
    ? `${building.listingCount} ${building.listingCount === 1 ? "listing" : "listings"}`
    : building.fullPath || "Bayut location";
  const priceLine = building.fetchError
    ? "Live pricing unavailable"
    : hasListingCount && building.listingCount === 0
      ? "No live listings"
      : building.lowestPrice != null || building.highestPrice != null
        ? formatPriceRange(building.lowestPrice, building.highestPrice)
        : "Watch to load listings";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12 }, pressed && { opacity: 0.85 }]}>
      {building.imageUrl ? (
        <Image source={{ uri: building.imageUrl }} style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textName }} numberOfLines={1}>
          {building.buildingName}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <HomeIcon size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {countLine}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
          {priceLine}
        </Text>
        {changeCount > 0 ? (
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <View style={{ backgroundColor: colors.badgeDueBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.badgeDueText, lineHeight: 14, includeFontPadding: false }}>
                {changeCount} {changeCount === 1 ? "update" : "updates"}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <WatchButton active={isWatched} disabled={watchDisabled} onPress={onToggleWatch} colors={colors} />
    </Pressable>
  );
}

function ListingRow({ listing, colors, onOpen }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12 }, pressed && { opacity: 0.85 }]}>
      {listing.coverPhoto ? (
        <Image source={{ uri: listing.coverPhoto }} style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textName }} numberOfLines={1}>
          {listing.title || "Untitled listing"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <HomeIcon size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {listing.buildingName}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Text style={{ fontSize: 14, color: colors.text, fontWeight: "700" }} numberOfLines={1}>
            {formatPriceRange(listing.price, listing.price)}
          </Text>
          <PriceDeltaChip priceDelta={listing.priceDelta} colors={colors} />
        </View>
        {Number.isFinite(listing.previousPrice) && listing.previousPrice !== listing.price ? (
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 1 }} numberOfLines={1}>
            Was {formatPrice(listing.previousPrice)}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 2 }} numberOfLines={1}>
          {formatBedsAndBaths(listing.beds, listing.baths)} | {formatArea(listing.areaSqft)} | {formatListingTimestamp(listing.verifiedAt)}
        </Text>
      </View>

      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.whatsappBg,
        }}
      >
        <ExternalLinkIcon size={16} color={colors.whatsappText} />
      </View>
    </Pressable>
  );
}

function ListingHistoryRow({ listing, colors, onPress, onOpenExternal }) {
  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved ? listing.lastKnownPrice : listing.price ?? listing.currentPrice ?? listing.lastKnownPrice;
  const statusLine = !isTracked
    ? "Open to choose if this unit should be tracked"
    : isRemoved
      ? `Off market ${listing.removedAt ? formatListingTimestamp(listing.removedAt) : ""}`.trim()
      : listing.totalChanges > 0
        ? `${listing.totalChanges} tracked ${listing.totalChanges === 1 ? "change" : "changes"}`
        : `Tracking since ${formatListingTimestamp(listing.firstSeenAt || listing.verifiedAt)}`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12 }, pressed && { opacity: 0.85 }]}>
      {listing.coverPhoto ? (
        <Image source={{ uri: listing.coverPhoto }} style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textName }} numberOfLines={1}>
          {listing.title || "Untitled listing"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <HomeIcon size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {listing.buildingName}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Text style={{ fontSize: 14, color: colors.text, fontWeight: "700" }} numberOfLines={1}>
            {isRemoved ? `Last seen ${formatPrice(listing.lastKnownPrice)}` : formatPriceRange(currentPrice, currentPrice)}
          </Text>
          {isTracked && !isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} colors={colors} /> : null}
          {isTracked ? <TrackingPill colors={colors} /> : null}
          {isTracked && listing.currentStatus ? <StatusPill listing={listing} colors={colors} /> : null}
        </View>
        {isTracked && Number.isFinite(listing.previousPrice) && listing.previousPrice !== currentPrice && !isRemoved ? (
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 1 }} numberOfLines={1}>
            Was {formatPrice(listing.previousPrice)}
          </Text>
        ) : null}
        {statusLine ? (
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 1 }} numberOfLines={1}>
            {statusLine}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 2 }} numberOfLines={1}>
          {formatBedsAndBaths(listing.beds, listing.baths)} | {formatArea(listing.areaSqft)} | {formatListingTimestamp(listing.lastVerifiedAt || listing.verifiedAt || listing.lastSeenAt)}
        </Text>
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation?.();
          onOpenExternal();
        }}
        style={({ pressed }) => [
          {
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.whatsappBg,
          },
          pressed && { opacity: 0.82 },
        ]}
      >
        <ExternalLinkIcon size={16} color={colors.whatsappText} />
      </Pressable>
    </Pressable>
  );
}

// ---------- Main screen ----------

export default function ListingAlertsScreen({ onBack, theme }) {
  const colors = getTheme(theme);
  const s = styles(colors);
  const alerts = useListingAlerts();

  const [viewTab, setViewTab] = useState("buildings");
  const [watchingOnly, setWatchingOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [priceChangedOnly, setPriceChangedOnly] = useState(false);
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedsFilter, setBedsFilter] = useState("all");
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  const [listingBuildingFilter, setListingBuildingFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const hasTrackedUnits = alerts.stats.trackedListingCount > 0;
  const buildingFilterOptions = alerts.watchedBuildings || [];

  // Swipe between tabs — same pattern as Dashboard
  const stateRef = useRef({ viewTab, setViewTab });
  stateRef.current = { viewTab, setViewTab };
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        const current = stateRef.current;
        if (g.dx < -60 && current.viewTab === "buildings") current.setViewTab("listings");
        else if (g.dx > 60 && current.viewTab === "listings") current.setViewTab("buildings");
      },
    })
  ).current;

  async function openListing(url) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open listing", "The Bayut link could not be opened on this device.");
    }
  }

  function openListingDetails(listing) {
    setSelectedListing(listing);
  }

  function toggleListingTracking(listing) {
    if (!listing) return;
    alerts.actions.toggleListingSelection(listing);
  }

  function openBuildingListings(building) {
    if (!building) return;
    if (!alerts.watchedSet?.has(building.locationId)) {
      const didWatch = alerts.actions.toggleWatch(building);
      if (!didWatch) return;
    }
    setListingBuildingFilter(building.locationId || "all");
    setViewTab("listings");
  }

  useEffect(() => {
    if (listingBuildingFilter === "all") return;
    if (buildingFilterOptions.some((building) => building.locationId === listingBuildingFilter)) return;
    setListingBuildingFilter("all");
  }, [buildingFilterOptions, listingBuildingFilter]);

  useEffect(() => {
    if (!selectedListing) return;

    const nextSelectedListing = [...(alerts.latestListings || []), ...(alerts.trackedListings || [])].find(
      (item) => item.key === selectedListing.key || (item.locationId === selectedListing.locationId && item.id === selectedListing.id),
    );

    if (nextSelectedListing) {
      setSelectedListing(nextSelectedListing);
    }
  }, [alerts.latestListings, alerts.trackedListings, selectedListing]);

  // Per-building change counts (so we can show a small "N updates" pill on the row)
  const changeCountByBuilding = useMemo(() => {
    const map = new Map();
    for (const item of alerts.changeItems || []) {
      const key = item.buildingKey || item.locationId;
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [alerts.changeItems]);

  const buildings = useMemo(() => {
    if (watchingOnly) return alerts.watchedBuildings || [];
    if (alerts.usingLiveSearch) return alerts.searchResults || [];
    return [...(alerts.watchedBuildings || []), ...(alerts.popularBuildings || [])];
  }, [alerts.popularBuildings, alerts.searchResults, alerts.usingLiveSearch, alerts.watchedBuildings, watchingOnly]);

  const listings = useMemo(() => {
    let source = [];

    if (!alerts.stats.watchedBuildingCount) {
      source = [];
    } else if (trackedOnly || trackedStatusFilter !== "all") {
      source = alerts.trackedListings || [];
    } else {
      source = alerts.latestListings || [];
    }

    if (listingBuildingFilter !== "all") {
      source = source.filter((l) => l.locationId === listingBuildingFilter);
    }

    if (watchingOnly && alerts.watchedSet?.size) {
      source = source.filter((l) => alerts.watchedSet.has(l.locationId));
    }

    if (trackedOnly) {
      source = source.filter((l) => l.isTracked || l.currentStatus);
    }

    if (trackedStatusFilter !== "all") {
      source = source.filter((l) => {
        if (!l.isTracked && !l.currentStatus) return false;
        if (trackedStatusFilter === "removed") return l.currentStatus === "removed";
        return (l.currentStatus || "active") === "active";
      });
    }

    if (priceChangedOnly) {
      source = source.filter((l) =>
        l.isTracked || l.currentStatus
          ? (l.dropsCount || 0) > 0 || (l.increasesCount || 0) > 0 || (Number.isFinite(l.priceDelta) && l.priceDelta !== 0)
          : Number.isFinite(l.priceDelta) && l.priceDelta !== 0,
      );
    }

    const bucket = PRICE_BUCKETS.find((b) => b.id === priceFilter);
    if (bucket && bucket.id !== "all") {
      source = source.filter((l) => {
        const price = l.currentStatus === "removed"
          ? l.lastKnownPrice
          : l.currentPrice ?? l.price ?? l.lastKnownPrice;
        if (!Number.isFinite(price)) return false;
        if (bucket.min != null && price < bucket.min) return false;
        if (bucket.max != null && price >= bucket.max) return false;
        return true;
      });
    }

    const bed = BED_OPTIONS.find((b) => b.id === bedsFilter);
    if (bed && bed.match) {
      source = source.filter((l) => bed.match(l.beds));
    }

    return source;
  }, [
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    bedsFilter,
    listingBuildingFilter,
    priceChangedOnly,
    priceFilter,
    trackedOnly,
    trackedStatusFilter,
    watchingOnly,
  ]);

  const count = viewTab === "buildings" ? buildings.length : listings.length;
  const countLabel = viewTab === "buildings"
    ? `${count} ${count === 1 ? "building" : "buildings"}`
    : `${count} ${count === 1 ? "listing" : "listings"}`;
  const listingHeaderText = !alerts.stats.watchedBuildingCount
    ? "Watch a building to browse its apartments"
    : !hasTrackedUnits
      ? `Pick the exact units you care about, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`
      : `${alerts.stats.trackedListingCount} tracked ${alerts.stats.trackedListingCount === 1 ? "unit" : "units"}, ${alerts.alertSummary.totalChanges} changes, last checked ${formatSyncTimestamp(alerts.alertSummary.lastCheckedAt)}`;

  if (!alerts.hydrated) {
    return (
      <SafeAreaView style={s.page} edges={["top"]}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  // Full-screen detail view — replaces the old bottom sheet entirely.
  if (selectedListing) {
    return (
      <ListingDetailScreen
        listing={selectedListing}
        colors={colors}
        onOpenExternal={() => openListing(selectedListing.bayutUrl)}
        onToggleTracking={() => toggleListingTracking(selectedListing)}
      />
    );
  }

  const renderItem = ({ item }) => {
    if (viewTab === "buildings") {
      const changeCount = changeCountByBuilding.get(item.locationId)
        || changeCountByBuilding.get(item.key)
        || 0;
      return (
        <BuildingRow
          building={item}
          colors={colors}
          isWatched={alerts.watchedSet?.has(item.locationId)}
          watchDisabled={!alerts.watchedSet?.has(item.locationId) && alerts.stats.watchedBuildingCount >= alerts.watchLimit}
          onToggleWatch={() => alerts.actions.toggleWatch(item)}
          onPress={() => openBuildingListings(item)}
          changeCount={changeCount}
        />
      );
    }
    return (
      <ListingHistoryRow
        listing={item}
        colors={colors}
        onPress={() => openListingDetails(item)}
        onOpenExternal={() => openListing(item.bayutUrl)}
      />
    );
  };

  const keyExtractor = (item, index) =>
    viewTab === "buildings"
      ? String(item.locationId || item.key || index)
      : String(item.key || `${item.buildingKey || ""}-${item.id || index}`);

  return (
    <SafeAreaView style={s.page} edges={["top"]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {/* Pill tab bar — matches Dashboard */}
      <View style={s.tabBar}>
        {onBack ? (
          <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
            <BackIcon color={colors.text} />
          </Pressable>
        ) : null}

        <View style={s.pillTrack}>
          {VIEW_TAB_OPTIONS.map((tab) => {
            const isActive = viewTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[s.pillTab, isActive && s.pillTabActive]}
                onPress={() => setViewTab(tab.id)}
              >
                <Text style={[s.pillTabLabel, isActive && s.pillTabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.countText}>{countLabel}</Text>
      </View>

      {/* Search — only on Buildings tab */}
      {viewTab === "buildings" ? (
        <View style={s.searchBar}>
          <View style={s.searchInputWrap}>
            <SearchIcon color={colors.textFaint} />
            <TextInput
              style={s.searchInput}
              placeholder="Search buildings on Bayut..."
              placeholderTextColor={colors.textFaint}
              value={alerts.searchTerm}
              onChangeText={alerts.actions.setSearchTerm}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      ) : (
        <View style={s.listingHeader}>
          <Text style={s.listingHeaderTitle}>{listingHeaderText}</Text>
          {alerts.stats.watchedBuildingCount ? (
            <Pressable style={({ pressed }) => [s.refreshPill, pressed && { opacity: 0.85 }]} onPress={alerts.actions.refresh} disabled={alerts.watchedLoading}>
              {alerts.watchedLoading ? <ActivityIndicator size="small" color={colors.tabActiveText} /> : <Text style={s.refreshPillText}>Refresh</Text>}
            </Pressable>
          ) : null}
        </View>
      )}

      {alerts.searchError && viewTab === "buildings" ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{alerts.searchError}</Text>
        </View>
      ) : null}
      {alerts.watchError ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{alerts.watchError}</Text>
        </View>
      ) : null}

      {/* List — flat rows with hairline separators, same as Dashboard */}
      <View style={s.listWrap} {...swipeResponder.panHandlers}>
        <FlatList
          data={viewTab === "buildings" ? buildings : listings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.textFainter }]} />}
          ListEmptyComponent={
            viewTab === "buildings" && alerts.searchLoading ? (
              <View style={s.emptyWrap}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={s.emptyText}>Searching Bayut buildings...</Text>
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>
                  {viewTab === "buildings" ? "No buildings match" : "No listings match"}
                </Text>
                <Text style={s.emptyText}>
                  {viewTab === "buildings"
                    ? "Try a broader search term, or switch off the Watching filter."
                    : alerts.stats.watchedBuildingCount
                      ? hasTrackedUnits
                        ? "Try another filter, or switch off Tracked only to browse more live units."
                        : "Open a live unit and track the exact ones you want alerts for."
                      : "Watch a building first, then this tab will show its live apartments."}
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* FAB — filter bottom sheet */}
      <Pressable style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]} onPress={() => setSheetOpen(true)}>
        <TuneIcon color={colors.bg} />
      </Pressable>

      {/* Bottom sheet — filter chips, same pattern as Dashboard */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} colors={colors}>
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>View</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Watching only</Text>
            <Switch
              value={watchingOnly}
              onValueChange={setWatchingOnly}
              trackColor={{ false: colors.border, true: colors.tabActiveBg }}
            />
          </View>

          {viewTab === "listings" ? (
            <>
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Tracked units only</Text>
                <Switch
                  value={trackedOnly}
                  onValueChange={setTrackedOnly}
                  trackColor={{ false: colors.border, true: colors.tabActiveBg }}
                />
              </View>

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Price moves only</Text>
                <Switch
                  value={priceChangedOnly}
                  onValueChange={setPriceChangedOnly}
                  trackColor={{ false: colors.border, true: colors.tabActiveBg }}
                />
              </View>

              {hasTrackedUnits ? (
                <>
                  <Text style={s.sectionLabel}>Status</Text>
                  <View style={s.chipRow}>
                    {TRACK_STATUS_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.id}
                        style={[s.chip, trackedStatusFilter === opt.id && s.chipActive]}
                        onPress={() => setTrackedStatusFilter(opt.id)}
                      >
                        <Text style={[s.chipText, trackedStatusFilter === opt.id && s.chipTextActive]}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {buildingFilterOptions.length ? (
                <>
                  <Text style={s.sectionLabel}>Building</Text>
                  <View style={s.chipRow}>
                    <Pressable
                      style={[s.chip, listingBuildingFilter === "all" && s.chipActive]}
                      onPress={() => setListingBuildingFilter("all")}
                    >
                      <Text style={[s.chipText, listingBuildingFilter === "all" && s.chipTextActive]}>All watched buildings</Text>
                    </Pressable>
                    {buildingFilterOptions.map((building) => (
                      <Pressable
                        key={building.locationId}
                        style={[s.chip, listingBuildingFilter === building.locationId && s.chipActive]}
                        onPress={() => setListingBuildingFilter(building.locationId)}
                      >
                        <Text style={[s.chipText, listingBuildingFilter === building.locationId && s.chipTextActive]}>
                          {building.buildingName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={s.sectionLabel}>Price</Text>
              <View style={s.chipRow}>
                {PRICE_BUCKETS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[s.chip, priceFilter === opt.id && s.chipActive]}
                    onPress={() => setPriceFilter(opt.id)}
                  >
                    <Text style={[s.chipText, priceFilter === opt.id && s.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.sectionLabel}>Bedrooms</Text>
              <View style={s.chipRow}>
                {BED_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[s.chip, bedsFilter === opt.id && s.chipActive]}
                    onPress={() => setBedsFilter(opt.id)}
                  >
                    <Text style={[s.chipText, bedsFilter === opt.id && s.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      </BottomSheet>

    </SafeAreaView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Tab bar — pill segmented control (matches DashboardScreen)
    tabBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.bg,
      position: "relative",
    },
    backBtn: {
      position: "absolute",
      left: 16,
      top: 10,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    pillTrack: {
      flexDirection: "row",
      backgroundColor: c.bgCard,
      borderRadius: 24,
      padding: 3,
    },
    pillTab: {
      minWidth: 100,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 22,
    },
    pillTabActive: { backgroundColor: c.tabActiveBg },
    pillTabLabel: { fontSize: 14, fontWeight: "600", color: c.textMuted },
    pillTabLabelActive: { color: c.tabActiveText },
    countText: {
      position: "absolute",
      right: 16,
      fontSize: 12,
      color: c.textFaint,
    },

    // Search
    searchBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.bgCard,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      paddingVertical: 0,
    },
    listingHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    listingHeaderTitle: {
      flex: 1,
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 17,
    },
    refreshPill: {
      minWidth: 72,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.tabActiveBg,
    },
    refreshPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.tabActiveText,
    },

    // Error inline
    errorBox: {
      marginHorizontal: 16,
      marginTop: 4,
      backgroundColor: c.errorBg,
      borderRadius: 10,
      padding: 10,
    },
    errorText: { color: c.errorText, fontSize: 13 },

    // List
    listWrap: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 120 },
    separator: { height: StyleSheet.hairlineWidth, marginVertical: 18, marginHorizontal: -16 },

    // Empty state
    emptyWrap: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textName,
    },
    emptyText: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
      maxWidth: 260,
      lineHeight: 18,
    },

    // FAB
    fab: {
      position: "absolute",
      bottom: 44,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      zIndex: 10,
      backgroundColor: c.textName,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },

    // Bottom sheet
    sheetScroll: { maxHeight: 500 },
    sheetContent: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: c.bgBadge,
    },
    chipActive: { backgroundColor: c.tabActiveBg },
    chipText: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    chipTextActive: { color: c.tabActiveText },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toggleLabel: { fontSize: 15, color: c.text },
  });
