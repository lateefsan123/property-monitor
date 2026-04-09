import { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Svg, Circle, Line, Path, Text as SvgText } from "react-native-svg";
import {
  formatArea,
  formatBedsAndBaths,
  formatEventTimestamp,
  formatPrice,
  formatSyncTimestamp,
} from "../features/listing-alerts/formatters";

const HERO_HEIGHT = 320;

// ---------- Icons ----------

function ExternalLinkIcon({ size = 16, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3h7v7" />
      <Path d="M10 14L21 3" />
      <Path d="M21 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

function ArrowIcon({ direction = "down", size = 14, color }) {
  const d = direction === "down" ? "M12 5v14M5 12l7 7 7-7" : "M12 19V5M5 12l7-7 7 7";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

// ---------- Pieces ----------

function Eyebrow({ children, color }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: "800",
        color,
        textTransform: "uppercase",
        letterSpacing: 1.6,
        includeFontPadding: false,
      }}
    >
      {children}
    </Text>
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
        gap: 5,
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <ArrowIcon direction={isDrop ? "down" : "up"} size={13} color={fg} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: fg,
          lineHeight: 16,
          includeFontPadding: false,
          letterSpacing: 0.2,
        }}
      >
        {formatPrice(Math.abs(priceDelta))}
      </Text>
    </View>
  );
}

// Inline stat cell — used inside the StatStrip below.
function StatCell({ label, value, accent, colors }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 6 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: accent || colors.textName,
          lineHeight: 26,
          includeFontPadding: false,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Eyebrow color={colors.textFaint}>{label}</Eyebrow>
    </View>
  );
}

function StatStrip({ items, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.bgCardBorder,
      }}
    >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            flexDirection: "row",
            borderLeftWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
            borderColor: colors.bgCardBorder,
          }}
        >
          <StatCell label={item.label} value={item.value} accent={item.accent} colors={colors} />
        </View>
      ))}
    </View>
  );
}

function TimelineEvent({ event, colors, isLast }) {
  const isDrop = event.type === "price_drop";
  const isIncrease = event.type === "price_increase";
  const isRemoved = event.type === "removed";
  const isReappeared = event.type === "reappeared";

  let headline = "Tracking started";
  if (event.type === "new") headline = `Listed at ${formatPrice(event.price)}`;
  if (isReappeared) headline = `Back on market at ${formatPrice(event.price)}`;
  if (isDrop) headline = `Dropped ${formatPrice(Math.abs(event.priceDelta))} → ${formatPrice(event.price)}`;
  if (isIncrease) headline = `Raised ${formatPrice(Math.abs(event.priceDelta))} → ${formatPrice(event.price)}`;
  if (isRemoved) headline = "Went off market";

  const dotColor = isDrop
    ? colors.badgeOkText
    : isIncrease
      ? colors.badgeDueText
      : isRemoved
        ? colors.errorText
        : colors.statValue;

  return (
    <View style={{ flexDirection: "row", gap: 14, minHeight: 56 }}>
      {/* Rail with dot */}
      <View style={{ width: 14, alignItems: "center" }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.bg,
            borderWidth: 2.5,
            borderColor: dotColor,
            marginTop: 2,
          }}
        />
        {isLast ? null : (
          <View style={{ flex: 1, width: 1.5, backgroundColor: colors.bgCardBorder, marginTop: 4 }} />
        )}
      </View>

      <View style={{ flex: 1, gap: 3, paddingBottom: isLast ? 0 : 18 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textName, letterSpacing: -0.1 }}>
          {headline}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textFaint, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {formatEventTimestamp(event.at)}
        </Text>
      </View>
    </View>
  );
}

// ---------- Price chart ----------

const CHART_HEIGHT = 220;
const CHART_PAD_LEFT = 16;
const CHART_PAD_RIGHT = 16;
const CHART_PAD_TOP = 24;
const CHART_PAD_BOTTOM = 32;

function PriceChart({ priceHistory, width, colors }) {
  const points = useMemo(() => {
    if (!Array.isArray(priceHistory)) return [];
    return priceHistory
      .filter((event) => Number.isFinite(event?.price) && event.at)
      .map((event) => {
        const t = new Date(String(event.at).replace(" ", "T")).getTime();
        return Number.isFinite(t) ? { t, price: event.price, type: event.type } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);
  }, [priceHistory]);

  if (points.length < 2) {
    return (
      <View
        style={{
          height: CHART_HEIGHT,
          backgroundColor: colors.bgCard,
          borderRadius: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.bgCardBorder,
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
          gap: 8,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgBadge, alignItems: "center", justifyContent: "center" }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 3v18h18" />
            <Path d="M7 14l4-4 4 4 5-5" />
          </Svg>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textName, marginTop: 4 }}>
          {points.length === 0 ? "No price history yet" : "Just one data point so far"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 17 }}>
          Refresh this watchlist after the market moves to start drawing the curve.
        </Text>
      </View>
    );
  }

  const innerWidth = Math.max(1, width - CHART_PAD_LEFT - CHART_PAD_RIGHT);
  const innerHeight = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const tSpan = Math.max(1, maxT - minT);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const p of points) {
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
  }
  const priceSpanRaw = maxPrice - minPrice;
  const pricePadding = priceSpanRaw === 0 ? Math.max(1, Math.abs(maxPrice) * 0.05) : priceSpanRaw * 0.18;
  const minY = minPrice - pricePadding;
  const maxY = maxPrice + pricePadding;
  const yRange = Math.max(1, maxY - minY);

  const xFor = (t) => CHART_PAD_LEFT + ((t - minT) / tSpan) * innerWidth;
  const yFor = (price) => CHART_PAD_TOP + (1 - (price - minY) / yRange) * innerHeight;

  // Smooth path using cardinal-ish curves between points (simple cubic).
  function buildSmoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${xFor(pts[0].t).toFixed(2)} ${yFor(pts[0].price).toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const x0 = xFor(p0.t);
      const y0 = yFor(p0.price);
      const x1 = xFor(p1.t);
      const y1 = yFor(p1.price);
      const midX = (x0 + x1) / 2;
      d += ` C ${midX.toFixed(2)} ${y0.toFixed(2)}, ${midX.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    return d;
  }

  const linePath = buildSmoothPath(points);
  const baselineY = (CHART_PAD_TOP + innerHeight).toFixed(2);
  const areaPath = `${linePath} L ${xFor(maxT).toFixed(2)} ${baselineY} L ${xFor(minT).toFixed(2)} ${baselineY} Z`;

  // 4 horizontal grid lines for richer feel
  const gridLines = [0, 0.33, 0.66, 1].map((frac) => CHART_PAD_TOP + frac * innerHeight);

  const lineColor = colors.statValue;
  const areaColor = colors.isDark ? "rgba(94,234,212,0.18)" : "rgba(10,112,130,0.10)";
  const gridColor = colors.bgCardBorder;
  const labelColor = colors.textFaint;

  const firstDate = new Date(minT).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const lastDate = new Date(maxT).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <View
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.bgCardBorder,
        overflow: "hidden",
      }}
    >
      {/* Chart header — high / low / range */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: 4,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 3 }}>
          <Eyebrow color={colors.textFaint}>HIGH</Eyebrow>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textName }}>{formatPrice(maxPrice)}</Text>
        </View>
        <View style={{ gap: 3, alignItems: "center" }}>
          <Eyebrow color={colors.textFaint}>RANGE</Eyebrow>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textName }}>
            {formatPrice(maxPrice - minPrice)}
          </Text>
        </View>
        <View style={{ gap: 3, alignItems: "flex-end" }}>
          <Eyebrow color={colors.textFaint}>LOW</Eyebrow>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textName }}>{formatPrice(minPrice)}</Text>
        </View>
      </View>

      <Svg width={width} height={CHART_HEIGHT}>
        {/* dashed grid */}
        {gridLines.map((y, i) => (
          <Line
            key={`grid-${i}`}
            x1={CHART_PAD_LEFT}
            y1={y}
            x2={width - CHART_PAD_RIGHT}
            y2={y}
            stroke={gridColor}
            strokeWidth={1}
            strokeDasharray="2,5"
          />
        ))}

        {/* area */}
        <Path d={areaPath} fill={areaColor} />

        {/* line */}
        <Path
          d={linePath}
          stroke={lineColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* dots */}
        {points.map((p, i) => {
          const cx = xFor(p.t);
          const cy = yFor(p.price);
          const isDrop = p.type === "price_drop";
          const isRise = p.type === "price_increase";
          const fill = isDrop ? colors.badgeOkText : isRise ? colors.badgeDueText : lineColor;
          const isEnd = i === 0 || i === points.length - 1;
          return (
            <Circle
              key={`dot-${i}`}
              cx={cx}
              cy={cy}
              r={isEnd ? 5 : 3.5}
              fill={fill}
              stroke={colors.bgCard}
              strokeWidth={2}
            />
          );
        })}

        {/* x-axis labels */}
        <SvgText
          x={CHART_PAD_LEFT}
          y={CHART_HEIGHT - 10}
          fontSize="10"
          fontWeight="700"
          fill={labelColor}
          letterSpacing="0.8"
        >
          {firstDate.toUpperCase()}
        </SvgText>
        <SvgText
          x={width - CHART_PAD_RIGHT}
          y={CHART_HEIGHT - 10}
          fontSize="10"
          fontWeight="700"
          fill={labelColor}
          letterSpacing="0.8"
          textAnchor="end"
        >
          {lastDate.toUpperCase()}
        </SvgText>
      </Svg>
    </View>
  );
}

// ---------- Main screen ----------

function daysBetween(start, end) {
  const a = start ? new Date(String(start).replace(" ", "T")).getTime() : NaN;
  const b = end ? new Date(String(end).replace(" ", "T")).getTime() : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export default function ListingDetailScreen({
  listing,
  colors,
  onOpenExternal,
  onToggleTracking,
}) {
  const insets = useSafeAreaInsets();
  if (!listing) return null;

  const isTracked = Boolean(listing.isTracked);
  const isRemoved = listing.currentStatus === "removed";
  const currentPrice = isRemoved
    ? null
    : listing.currentPrice ?? listing.price ?? listing.lastKnownPrice ?? null;
  const lastKnownPrice = listing.lastKnownPrice ?? listing.price ?? listing.currentPrice ?? null;
  const firstSeenAt = listing.firstSeenAt || listing.verifiedAt || null;
  const lastSeenAt = listing.lastSeenAt || listing.removedAt || listing.lastVerifiedAt || listing.verifiedAt || null;
  const daysTracked = daysBetween(firstSeenAt, lastSeenAt || new Date().toISOString());

  const bedsBaths = formatBedsAndBaths(listing.beds, listing.baths);
  const area = formatArea(listing.areaSqft);

  // Compose the editorial eyebrow string from the most distinctive metadata available.
  const eyebrowBits = [
    isTracked ? "Tracked unit" : "Live unit",
    listing.community || listing.cluster || null,
    bedsBaths,
  ].filter(Boolean);

  const chartWidth = 360 - 32; // ~screen width minus 16 padding either side
  const reversedHistory = (listing.priceHistory || []).slice().reverse();
  const hasCover = Boolean(listing.coverPhoto);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "light-content"} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO ---------------------------------------------------- */}
        {hasCover ? (
          <View style={{ height: HERO_HEIGHT, backgroundColor: colors.bgCard }}>
            <Image
              source={{ uri: listing.coverPhoto }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              resizeMode="cover"
            />
            {/* Top fade so the status bar stays readable */}
            <LinearGradient
              colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 60 }}
            />
            {/* Bottom fade into the page background for a clean handoff */}
            <LinearGradient
              colors={["rgba(0,0,0,0)", colors.bg]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110 }}
            />
          </View>
        ) : (
          // No cover photo: a calm tinted block sized so the heading still has a real top.
          <View
            style={{
              height: HERO_HEIGHT * 0.55,
              backgroundColor: colors.bgCard,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderColor: colors.bgCardBorder,
            }}
          >
            <LinearGradient
              colors={[colors.bgCard, colors.bg]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80 }}
            />
          </View>
        )}

        {/* HEADING ------------------------------------------------- */}
        <View style={{ paddingHorizontal: 24, marginTop: hasCover ? -24 : 16, gap: 12 }}>
          <Eyebrow color={colors.textMuted}>{eyebrowBits.join("  ·  ")}</Eyebrow>

          <Text
            style={{
              fontSize: 34,
              lineHeight: 38,
              fontWeight: "900",
              color: colors.textName,
              letterSpacing: -1.2,
            }}
          >
            {listing.buildingName || "Untitled building"}
          </Text>

          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted, letterSpacing: -0.1 }}>
            {listing.title || "Untitled listing"}
          </Text>

          <Text style={{ fontSize: 12, color: colors.textFaint, letterSpacing: 0.2 }}>
            {area}
          </Text>
        </View>

        {/* PRICE HERO --------------------------------------------- */}
        <View style={{ paddingHorizontal: 24, marginTop: 28, gap: 10 }}>
          <Eyebrow color={colors.textFaint}>
            {isRemoved ? "Last known price" : "Current valuation"}
          </Eyebrow>
          <View style={{ flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <Text
              style={{
                fontSize: 44,
                lineHeight: 46,
                fontWeight: "900",
                color: colors.textName,
                letterSpacing: -1.6,
              }}
            >
              {isRemoved ? formatPrice(lastKnownPrice) : formatPrice(currentPrice)}
            </Text>
            {!isRemoved ? <PriceDeltaChip priceDelta={listing.priceDelta} colors={colors} /> : null}
          </View>
          {Number.isFinite(listing.previousPrice) && !isRemoved ? (
            <Text style={{ fontSize: 12, color: colors.textFaint, letterSpacing: 0.2 }}>
              {`Previously ${formatPrice(listing.previousPrice)}`}
            </Text>
          ) : null}
        </View>

        {/* CHART --------------------------------------------------- */}
        <View style={{ paddingHorizontal: 16, marginTop: 32, gap: 12 }}>
          <View style={{ paddingHorizontal: 8 }}>
            <Eyebrow color={colors.textFaint}>Price trajectory</Eyebrow>
          </View>
          <PriceChart priceHistory={listing.priceHistory} width={chartWidth} colors={colors} />
        </View>

        {/* INLINE STATS STRIP ------------------------------------- */}
        <View style={{ marginTop: 32 }}>
          <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
            <Eyebrow color={colors.textFaint}>By the numbers</Eyebrow>
          </View>
          <StatStrip
            colors={colors}
            items={[
              {
                label: "Drops",
                value: String(listing.dropsCount || 0),
                accent: listing.dropsCount ? colors.badgeOkText : undefined,
              },
              {
                label: "Rises",
                value: String(listing.increasesCount || 0),
                accent: listing.increasesCount ? colors.badgeDueText : undefined,
              },
              {
                label: "Changes",
                value: String(listing.totalChanges || 0),
              },
              {
                label: "Days",
                value: daysTracked == null ? "—" : String(daysTracked),
              },
            ]}
          />
          {/* Footnote with seen-first / seen-last context, no separate cards needed */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingTop: 14,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textFaint, letterSpacing: 0.2 }}>
              First seen {formatSyncTimestamp(firstSeenAt)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textFaint, letterSpacing: 0.2 }}>
              Last seen {formatSyncTimestamp(lastSeenAt)}
            </Text>
          </View>
        </View>

        {/* TIMELINE ------------------------------------------------ */}
        <View style={{ paddingHorizontal: 24, marginTop: 36, gap: 16 }}>
          <Eyebrow color={colors.textFaint}>Activity</Eyebrow>
          {isTracked && reversedHistory.length > 0 ? (
            <View>
              {reversedHistory.map((event, index) => (
                <TimelineEvent
                  key={`${event.type}-${event.at || index}-${index}`}
                  event={event}
                  colors={colors}
                  isLast={index === reversedHistory.length - 1}
                />
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
              {isTracked
                ? "Tracking has started. Refresh this watchlist after the market moves to fill out the activity log."
                : "Track this unit, then refresh after the market moves to fill out the activity log."}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BAR ---------------------------------------- */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: colors.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.bgCardBorder,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Pressable
          onPress={onToggleTracking}
          style={({ pressed }) => [
            {
              flex: 1,
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isTracked ? colors.bgBadge : colors.tabActiveBg,
              borderWidth: isTracked ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.bgCardBorder,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: isTracked ? colors.textName : colors.tabActiveText,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {isTracked ? "Stop tracking" : "Track unit"}
          </Text>
        </Pressable>

        {listing.bayutUrl ? (
          <Pressable
            onPress={onOpenExternal}
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: "row",
                gap: 8,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.textName,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <ExternalLinkIcon size={15} color={colors.bg} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: colors.bg,
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              Open on Bayut
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
