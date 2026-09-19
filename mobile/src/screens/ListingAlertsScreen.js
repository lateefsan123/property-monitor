import { useQuery } from '@tanstack/react-query';
import { fetchListingPriceDrops } from '../workspace/home-insights';
import { Button } from '../workspace/ui';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle, Line, Path } from "react-native-svg";
import BottomSheet from "../components/BottomSheet";
import AppSearchBar from "../components/AppSearchBar";
import {
  formatArea,
  formatBedsAndBaths,
  formatPrice,
  formatPriceRange,
} from "../features/listing-alerts/formatters";
import { useListingAlerts } from "../features/listing-alerts/useListingAlerts";
import { getTheme } from "../theme";
import ListingDetailScreen from "./ListingDetailScreen";

const PRICE_BUCKETS = [
  { id: "all", label: "All" },
  { id: "lt1", label: "< 1M", max: 1_000_000 },
  { id: "1-3", label: "1-3M", min: 1_000_000, max: 3_000_000 },
  { id: "3-6", label: "3-6M", min: 3_000_000, max: 6_000_000 },
  { id: "gt6", label: "6M+", min: 6_000_000 },
];

const TRACK_STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "removed", label: "Off market" },
  { id: "price-drops", label: "Price drops" },
];

const LISTINGS_PAGE_SIZE = 25;

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

function LocationPinIcon({ size = 15, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
      <Circle cx="12" cy="11" r="2.5" />
    </Svg>
  );
}

function getSearchOptionLabel(option) {
  return option?.buildingName || option?.searchName || "Unknown";
}

function getSearchOptionMeta(option) {
  const fullPath = String(option?.fullPath || "").trim();
  if (!fullPath) return null;

  const label = getSearchOptionLabel(option).toLowerCase();
  const parts = fullPath.split("|").map((part) => part.trim()).filter(Boolean);
  const remaining = parts.filter((part, index) => index !== 0 || part.toLowerCase() !== label);

  return (remaining.length ? remaining : parts).join(", ");
}

// ---------- Small building components ----------

function WatchButton({ active, disabled, onPress, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? "Stop watching building" : "Watch building"}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [
        {
          alignItems: "center",
          justifyContent: "center",
          minWidth: 86,
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: 22,
          borderWidth: active ? 1 : 0,
          borderColor: colors.border,
          backgroundColor: active ? "transparent" : colors.tabActiveBg,
          opacity: disabled ? 0.45 : 1,
        },
        pressed && !disabled && { opacity: 0.82 },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.text : colors.tabActiveText }}>
        {active ? "Watching" : "Watch"}
      </Text>
    </Pressable>
  );
}

function BuildingRow({ building, colors, isWatched, watchDisabled, onToggleWatch, onPress, changeCount, grid }) {
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

  if (grid) return <View style={{borderWidth:1,borderColor:colors.border,borderRadius:12,overflow:'hidden',backgroundColor:colors.bgCard}}><Pressable accessibilityRole="button" accessibilityLabel={"Open building " + building.buildingName} onPress={onPress}>{building.imageUrl ? <Image source={{uri:building.imageUrl}} style={{width:'100%',height:160,backgroundColor:colors.bgBadge}} /> : <View style={{height:90,backgroundColor:colors.bgBadge,alignItems:'center',justifyContent:'center'}}><HomeIcon size={30} color={colors.textMuted} /></View>}<View style={{padding:16,gap:7}}><Text style={{color:colors.textName,fontSize:18,fontWeight:'700'}}>{building.buildingName}</Text><Text style={{color:colors.textMuted,fontSize:12}}>{building.community || 'Dubai'}</Text><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:colors.text}}>{countLine}</Text><Text style={{color:colors.text,fontWeight:'600'}}>{priceLine}</Text></View>{changeCount > 0 && <Text style={{color:colors.badgeOkText,fontSize:12}}>{changeCount} updates</Text>}</View></Pressable><View style={{padding:12,paddingTop:0,flexDirection:'row',justifyContent:'space-between'}}><WatchButton active={isWatched} disabled={watchDisabled} onPress={onToggleWatch} colors={colors}/></View></View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12 }, pressed && { opacity: 0.85 }]}>
      {building.imageUrl ? (
        <Image source={{ uri: building.imageUrl }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.bgBadge }} />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bgBadge }} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.textName }} numberOfLines={2}>
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

function ListingHistoryRow({ listing, colors, onPress, onOpenExternal, showBuilding }) {
  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved ? listing.lastKnownPrice : listing.price ?? listing.currentPrice ?? listing.lastKnownPrice;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12 }, pressed && { opacity: 0.85 }]}>
      {listing.coverPhoto ? (
        <Image source={{ uri: listing.coverPhoto }} style={{ width: 64, height: 76, borderRadius: 10, backgroundColor: colors.bgBadge }} />
      ) : (
        <View style={{ width: 64, height: 76, borderRadius: 10, backgroundColor: colors.bgBadge }} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textMuted }} numberOfLines={2}>
          {listing.title || "Untitled listing"}
        </Text>
        {showBuilding && <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <HomeIcon size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {listing.buildingName}
          </Text>
        </View>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Text style={{ fontSize: 19, color: colors.textName, fontWeight: "700" }} numberOfLines={1}>
            {isRemoved ? `Last seen ${formatPrice(listing.lastKnownPrice)}` : formatPriceRange(currentPrice, currentPrice)}
          </Text>
          {isTracked && !isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} colors={colors} /> : null}

          {isRemoved ? <StatusPill listing={listing} colors={colors} /> : null}
        </View>


        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 5 }} numberOfLines={1}>
          {formatBedsAndBaths(listing.beds, listing.baths)} | {formatArea(listing.areaSqft)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Open listing on Bayut"
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

export default function ListingAlertsScreen({ onBack, theme, userId, embedded = false, request, active = true, onExit, onHeaderChange }) {
  const colors = getTheme(theme);
  const s = styles(colors);
  const alerts = useListingAlerts();

  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [grid, setGrid] = useState(false);
  const [watchingOnly, setWatchingOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [priceChangedOnly, setPriceChangedOnly] = useState(false);
  const [priceFilter, setPriceFilter] = useState("all");
  const [trackedStatusFilter, setTrackedStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [listingsPage, setListingsPage] = useState(1);
  const [externalListing, setExternalListing] = useState(null);
  const [allListings, setAllListings] = useState(false);
  const dropsQuery = useQuery({ queryKey: ['home', 'price-drops', userId], queryFn: () => fetchListingPriceDrops(userId), enabled: Boolean(userId) && allListings });
  const [selectedListingKey, setSelectedListingKey] = useState(null);
  const [selectedSearchOption, setSelectedSearchOption] = useState(null);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const autoTracking = alerts.autoTracking;
  const effectiveTrackedOnly = autoTracking ? false : trackedOnly;
  const buildingFilterOptions = useMemo(() => alerts.watchedBuildings || [], [alerts.watchedBuildings]);
  const searchResults = useMemo(() => alerts.searchResults || [], [alerts.searchResults]);
  const searchTerm = alerts.searchTerm || "";
  const searchInputRef = useRef(null);
  const searchBlurTimeoutRef = useRef(null);
  const viewTab = selectedBuildingId || allListings ? "listings" : "buildings";
  const effectiveListingBuildingFilter = selectedBuildingId || "all";

  const [handledRequest, setHandledRequest] = useState(null);
  if (handledRequest !== request) {
    setHandledRequest(request);
    if (request?.listing) { setExternalListing(request.listing); setSelectedListingKey(null); }
    if (request?.priceDrops) { setAllListings(true); setPriceChangedOnly(true); setSelectedBuildingId(null); setListingsPage(1); }
    if (request?.search) {
      setAllListings(false);
      setSelectedBuildingId(null);
      setSelectedListingKey(null);
      setExternalListing(null);
      setPriceChangedOnly(false);
      setTrackedOnly(false);
      setPriceFilter("all");
      setTrackedStatusFilter("all");
    }
  }
  useEffect(() => { if (request?.search) searchInputRef.current?.focus?.(); }, [request]);

  useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedListingKey || externalListing) { setSelectedListingKey(null); setExternalListing(null); }
      else if (selectedBuildingId || allListings) { setSelectedBuildingId(null); setAllListings(false); }
      else onExit?.();
      return Boolean(onExit || selectedListingKey || externalListing || selectedBuildingId || allListings);
    });
    return () => listener.remove();
  }, [active, selectedListingKey, externalListing, selectedBuildingId, allListings, onExit]);

  async function openListing(url) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open listing", "The Bayut link could not be opened on this device.");
    }
  }

  function openListingDetails(listing) {
    if (!listing) return;
    setExternalListing(allListings ? listing : null);
    setSelectedListingKey(allListings ? null : listing.key || `${listing.locationId}:${listing.id}`);
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
    setAllListings(false);
    setPriceChangedOnly(false);
    setTrackedOnly(false);
    setPriceFilter("all");
    setTrackedStatusFilter("all");
    setSelectedBuildingId(building.locationId || null);
    setListingsPage(1);
  }

  function goBackToBuildings() {
    setAllListings(false);
    setSelectedBuildingId(null);
    setListingsPage(1);
  }

  function handleWatchingOnlyChange(nextValue) {
    setListingsPage(1);
    setWatchingOnly(nextValue);
  }

  function handleTrackedOnlyChange(nextValue) {
    setListingsPage(1);
    setTrackedOnly(nextValue);
  }

  function handlePriceChangedOnlyChange(nextValue) {
    setListingsPage(1);
    setPriceChangedOnly(nextValue);
  }

  function handlePriceFilterChange(nextValue) {
    setListingsPage(1);
    setPriceFilter(nextValue);
  }

  function handleTrackedStatusFilterChange(nextValue) {
    setListingsPage(1);
    setTrackedStatusFilter(nextValue);
  }

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) clearTimeout(searchBlurTimeoutRef.current);
    };
  }, []);

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

  const selectedListing = useMemo(() => {
    if (!selectedListingKey) return externalListing;
    return [...(alerts.latestListings || []), ...(alerts.trackedListings || [])].find(
      (item) => item.key === selectedListingKey || `${item.locationId}:${item.id}` === selectedListingKey,
    ) || null;
  }, [alerts.latestListings, alerts.trackedListings, selectedListingKey, externalListing]);

  const selectedSearchBuilding = useMemo(() => {
    if (!selectedSearchOption?.locationId) return null;
    return (alerts.watchedBuildings || []).find((building) => building.locationId === selectedSearchOption.locationId)
      || searchResults.find((building) => building.locationId === selectedSearchOption.locationId)
      || selectedSearchOption;
  }, [alerts.watchedBuildings, searchResults, selectedSearchOption]);

  const buildings = useMemo(() => {
    if (watchingOnly) {
      if (selectedSearchBuilding?.locationId) {
        return (alerts.watchedBuildings || []).filter((building) => building.locationId === selectedSearchBuilding.locationId);
      }
      return alerts.watchedBuildings || [];
    }
    if (selectedSearchBuilding) return [selectedSearchBuilding];
    if (alerts.usingLiveSearch) return searchResults;
    return alerts.watchedBuildings || [];
  }, [alerts.usingLiveSearch, alerts.watchedBuildings, searchResults, selectedSearchBuilding, watchingOnly]);

  const listings = useMemo(() => {
    if (allListings) return dropsQuery.data || [];
    let source = [];

    if (!alerts.stats.watchedBuildingCount) {
      source = [];
    } else if (effectiveTrackedOnly || (trackedStatusFilter !== "all" && trackedStatusFilter !== "price-drops")) {
      source = alerts.trackedListings || [];
    } else {
      source = alerts.latestListings || [];
    }

    if (effectiveListingBuildingFilter !== "all") {
      source = source.filter((l) => l.locationId === effectiveListingBuildingFilter);
    }

    if (watchingOnly && alerts.watchedSet?.size) {
      source = source.filter((l) => alerts.watchedSet.has(l.locationId));
    }

    if (effectiveTrackedOnly) {
      source = source.filter((l) => l.isTracked || l.currentStatus);
    }

    if (trackedStatusFilter !== "all") {
      if (trackedStatusFilter === "price-drops") {
        source = source.filter((l) => Number.isFinite(l.priceDelta) && l.priceDelta < 0);
      } else {
        source = source.filter((l) => {
          if (!l.isTracked && !l.currentStatus) return false;
          if (trackedStatusFilter === "removed") return l.currentStatus === "removed";
          return (l.currentStatus || "active") === "active";
        });
      }
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

    return source;
  }, [
    allListings,
    dropsQuery.data,
    alerts.latestListings,
    alerts.stats.watchedBuildingCount,
    alerts.trackedListings,
    alerts.watchedSet,
    effectiveListingBuildingFilter,
    effectiveTrackedOnly,
    priceChangedOnly,
    priceFilter,
    trackedStatusFilter,
    watchingOnly,
  ]);

  const selectedBuildingOption = useMemo(
    () => buildingFilterOptions.find((building) => building.locationId === effectiveListingBuildingFilter) || null,
    [buildingFilterOptions, effectiveListingBuildingFilter],
  );
  const headerTitle = selectedListing?.buildingName || selectedBuildingOption?.buildingName || (allListings ? "Price drops" : "Listings");
  const hasDetail = Boolean(selectedListing);
  const hasBuilding = Boolean(selectedBuildingId || allListings);
  useEffect(() => {
    if (!onHeaderChange) return;
    if (!active || (!hasDetail && !hasBuilding)) {
      onHeaderChange(null);
      return;
    }
    onHeaderChange({
      title: headerTitle,
      onBack: () => {
        if (hasDetail) {
          setSelectedListingKey(null);
          setExternalListing(null);
        } else {
          setAllListings(false);
          setSelectedBuildingId(null);
          setListingsPage(1);
        }
      },
    });
    return () => onHeaderChange(null);
  }, [active, hasDetail, hasBuilding, headerTitle, onHeaderChange]);
  const listingTotalPages = Math.max(1, Math.ceil(listings.length / LISTINGS_PAGE_SIZE));
  const listingSafePage = Math.min(listingsPage, listingTotalPages);
  const pagedListings = useMemo(() => {
    const startIndex = (listingSafePage - 1) * LISTINGS_PAGE_SIZE;
    return listings.slice(startIndex, startIndex + LISTINGS_PAGE_SIZE);
  }, [listingSafePage, listings]);
  const showSearchDropdown = !selectedBuildingId
    && searchMenuOpen
    && searchTerm.trim().length >= 2
    && (alerts.searchLoading || Boolean(alerts.searchError) || searchResults.length > 0 || !selectedSearchOption);

  function handleSearchInputChange(nextValue) {
    setSelectedSearchOption(null);
    setSearchMenuOpen(nextValue.trim().length >= 2);
    alerts.actions.setSearchTerm(nextValue);
  }

  function handleSearchOptionSelect(option) {
    if (!option) return;
    setSelectedSearchOption(option);
    setSearchMenuOpen(false);
    alerts.actions.setSearchTerm(getSearchOptionLabel(option));
    searchInputRef.current?.blur?.();
  }

  function clearSearchSelection() {
    setSelectedSearchOption(null);
    setSearchMenuOpen(false);
    alerts.actions.setSearchTerm("");
    searchInputRef.current?.focus?.();
  }

  if (!alerts.hydrated) {
    return (
      <SafeAreaView style={s.page} edges={embedded ? [] : ["top"]}>
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
        embeddedHeader={embedded && Boolean(onHeaderChange)}
        onBack={() => { setSelectedListingKey(null); setExternalListing(null); }}
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
          grid={grid}
          building={item}
          colors={colors}
          isWatched={alerts.watchedSet?.has(item.locationId)}
          watchDisabled={!alerts.watchedSet?.has(item.locationId) && alerts.stats.watchedBuildingCount >= alerts.watchLimit}
          onToggleWatch={() => alerts.watchedSet?.has(item.locationId) ? alerts.actions.toggleWatch(item) : openBuildingListings(item)}
          onPress={() => openBuildingListings(item)}
          changeCount={changeCount}
        />
      );
    }
    return (
      <ListingHistoryRow
        showBuilding={!selectedBuildingId}
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
    <SafeAreaView style={s.page} edges={embedded ? [] : ["top"]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {allListings ? <View style={{padding:16,gap:8}}>{!onHeaderChange && <Button colors={colors} onPress={goBackToBuildings}>← Watched buildings</Button>}<Text style={{color:colors.textMuted}}>Last 14 days</Text>{dropsQuery.error && <Text style={{color:colors.errorText}}>{dropsQuery.error.message}</Text>}</View> : selectedBuildingId ? (
        onHeaderChange ? null : <View style={s.buildingHeader}>
          <Pressable style={s.backBtn} onPress={goBackToBuildings} hitSlop={12}>
            <BackIcon color={colors.text} />
          </Pressable>
          <View style={s.buildingHeaderContent}>
            <Text style={s.buildingHeaderTitle} numberOfLines={1}>
              {selectedBuildingOption?.buildingName || "Listings"}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={[s.tabBar, embedded && { display: "none" }]}>
            {onBack ? (
              <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
                <BackIcon color={colors.text} />
              </Pressable>
            ) : null}
            <Text style={s.pageTitle}>Listings</Text>

          </View>

          <View style={s.searchBar}>
            <View style={s.searchBox}>
              <AppSearchBar
                colors={colors}
                inputRef={searchInputRef}
                placeholder="Search buildings"
                accessibilityLabel="Search buildings"
                clearLabel="Clear building search"
                value={searchTerm}
                onChangeText={handleSearchInputChange}
                onClear={clearSearchSelection}
                onFocus={() => {
                  if (searchTerm.trim().length >= 2) setSearchMenuOpen(true);
                }}
                onBlur={() => {
                  if (searchBlurTimeoutRef.current) clearTimeout(searchBlurTimeoutRef.current);
                  searchBlurTimeoutRef.current = setTimeout(() => setSearchMenuOpen(false), 120);
                }}
              />

              {showSearchDropdown ? (
                <View style={s.searchDropdown}>
                  {alerts.searchLoading ? (
                    <Text style={s.searchDropdownState}>Searching available buildings...</Text>
                  ) : alerts.searchError ? (
                    <Text style={s.searchDropdownState}>Search is unavailable right now.</Text>
                  ) : searchResults.length ? (
                    <ScrollView
                      style={s.searchDropdownScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {searchResults.map((option) => {
                        const meta = getSearchOptionMeta(option);
                        const isSelected = selectedSearchBuilding?.locationId === option.locationId;
                        return (
                          <Pressable
                            key={option.locationId}
                            style={({ pressed }) => [
                              s.searchOption,
                              isSelected && s.searchOptionSelected,
                              pressed && { opacity: 0.82 },
                            ]}
                            onPress={() => handleSearchOptionSelect(option)}
                          >
                            <View style={s.searchOptionIconWrap}>
                              <LocationPinIcon size={15} color={colors.textMuted} />
                            </View>
                            <View style={s.searchOptionCopy}>
                              <Text style={s.searchOptionTitle} numberOfLines={1}>
                                {getSearchOptionLabel(option)}
                              </Text>
                              {meta ? (
                                <Text style={s.searchOptionMeta} numberOfLines={1}>
                                  {meta}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={s.searchDropdownState}>No available buildings match that search.</Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </>
      )}

      {alerts.searchError && !selectedBuildingId ? (
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
      <View style={s.listWrap}>
        <FlatList
          data={viewTab === "buildings" ? buildings : pagedListings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.textFainter }]} />}
          ListEmptyComponent={
            (selectedBuildingId ? alerts.watchedLoading : allListings ? dropsQuery.isPending : alerts.searchLoading) ? (
              <View style={s.emptyWrap}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={s.emptyText}>{selectedBuildingId || allListings ? "Loading listings…" : "Searching buildings…"}</Text>
              </View>
            ) : (selectedBuildingId && (alerts.watchError || selectedBuildingOption?.fetchError)) || (allListings && dropsQuery.error) ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>Could not load listings</Text>
                <Button colors={colors} onPress={() => allListings ? dropsQuery.refetch() : alerts.actions.refresh()}>Try again</Button>
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>
                  {viewTab === "buildings" ? (searchTerm ? "No buildings found" : "Watch a building") : "No listings found"}
                </Text>
                <Text style={s.emptyText}>
                  {viewTab === "buildings"
                    ? (searchTerm ? "Try another building name." : "Search above, then tap Watch to follow its listings.")
                    : allListings ? "No price drops in the last 14 days." : "Try changing your filters or checking again later."}
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* FAB — filter bottom sheet */}
      {viewTab === "listings" && listingTotalPages > 1 ? (
        <View style={s.paginationBar}>
          <Pressable
            disabled={listingSafePage <= 1}
            onPress={() => setListingsPage((page) => Math.max(1, page - 1))}
            style={({ pressed }) => [
              s.paginationButton,
              listingSafePage <= 1 && s.paginationDisabled,
              pressed && listingSafePage > 1 && { opacity: 0.85 },
            ]}
          >
            <Text style={s.paginationText}>Previous</Text>
          </Pressable>
          <Text style={s.paginationStatus}>
            Page {listingSafePage} of {listingTotalPages}
          </Text>
          <Pressable
            disabled={listingSafePage >= listingTotalPages}
            onPress={() => setListingsPage((page) => Math.min(listingTotalPages, page + 1))}
            style={({ pressed }) => [
              s.paginationButton,
              listingSafePage >= listingTotalPages && s.paginationDisabled,
              pressed && listingSafePage < listingTotalPages && { opacity: 0.85 },
            ]}
          >
            <Text style={s.paginationText}>Next</Text>
          </Pressable>
        </View>
      ) : null}

      {<Pressable accessibilityRole="button" accessibilityLabel="Listing filters" style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]} onPress={() => setSheetOpen(true)}>
        <TuneIcon color={colors.bg} />
      </Pressable>}

      {/* Mobile filters stay out of the results list. */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} colors={colors}>
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={{gap:10,marginBottom:16}}><Button colors={colors} onPress={() => setSheetOpen(false)}>Done</Button>{viewTab === 'buildings' && <><Button colors={colors} onPress={() => setGrid(!grid)}>{grid ? 'List layout' : 'Grid layout'}</Button></>}</View>
          {!selectedBuildingId ? (
            <>
              <Text style={s.sectionLabel}>View</Text>
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Watching only</Text>
                <Switch
                  value={watchingOnly}
                  onValueChange={handleWatchingOnlyChange}
                  trackColor={{ false: colors.border, true: colors.tabActiveBg }}
                />
              </View>
            </>
          ) : (
            <>
              {!autoTracking ? (
                <View style={s.toggleRow}>
                  <Text style={s.toggleLabel}>Tracked units only</Text>
                  <Switch
                    value={trackedOnly}
                    onValueChange={handleTrackedOnlyChange}
                    trackColor={{ false: colors.border, true: colors.tabActiveBg }}
                  />
                </View>
              ) : null}

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Price moves only</Text>
                <Switch
                  value={priceChangedOnly}
                  onValueChange={handlePriceChangedOnlyChange}
                  trackColor={{ false: colors.border, true: colors.tabActiveBg }}
                />
              </View>

              <Text style={s.sectionLabel}>Status</Text>
              <View style={s.chipRow}>
                {TRACK_STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[s.chip, trackedStatusFilter === opt.id && s.chipActive]}
                    onPress={() => handleTrackedStatusFilterChange(opt.id)}
                  >
                    <Text style={[s.chipText, trackedStatusFilter === opt.id && s.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.sectionLabel}>Price</Text>
              <View style={s.chipRow}>
                {PRICE_BUCKETS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[s.chip, priceFilter === opt.id && s.chipActive]}
                    onPress={() => handlePriceFilterChange(opt.id)}
                  >
                    <Text style={[s.chipText, priceFilter === opt.id && s.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </BottomSheet>

    </SafeAreaView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Header
    tabBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.bg,
      position: "relative",
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    pageTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      color: c.textName,
      textAlign: "center",
    },
    countText: {
      position: "absolute",
      right: 16,
      fontSize: 12,
      color: c.textFaint,
    },
    buildingHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.bg,
      gap: 4,
    },
    buildingHeaderContent: {
      flex: 1,
      gap: 2,
    },
    buildingHeaderTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.textName,
    },
    buildingHeaderSubtitle: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 17,
    },

    // Search
    searchBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      zIndex: 20,
    },
    searchBox: {
      position: "relative",
    },
    searchDropdown: {
      position: "absolute",
      top: 56,
      left: 0,
      right: 0,
      backgroundColor: c.bgCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: c.isDark ? 0.35 : 0.12,
      shadowRadius: 16,
      elevation: 10,
      overflow: "hidden",
      zIndex: 30,
    },
    searchDropdownScroll: {
      maxHeight: 280,
    },
    searchDropdownState: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 13,
      color: c.textMuted,
    },
    searchOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight || c.border,
    },
    searchOptionSelected: {
      backgroundColor: c.bgBadge,
    },
    searchOptionIconWrap: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    searchOptionCopy: {
      flex: 1,
      gap: 2,
    },
    searchOptionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textName,
    },
    searchOptionMeta: {
      fontSize: 13,
      color: c.textMuted,
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
    resultsBar: {
      paddingHorizontal: 16,
      paddingBottom: 6,
      gap: 2,
    },
    resultsCount: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    resultsMeta: {
      fontSize: 12,
      color: c.textFaint,
    },

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

    paginationBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 22,
      gap: 10,
    },
    paginationButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: c.bgCard,
    },
    paginationDisabled: {
      opacity: 0.5,
    },
    paginationText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    paginationStatus: {
      fontSize: 12,
      color: c.textMuted,
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
