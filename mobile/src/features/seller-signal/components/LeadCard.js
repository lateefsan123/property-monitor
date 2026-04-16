import * as Linking from "expo-linking";
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Svg, Path } from "react-native-svg";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../lead-utils";

function formatLeadBedroom(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/studio/i.test(raw)) return "Studio";
  if (/^\d+$/.test(raw)) return `${raw}BR`;
  return raw;
}

function extractUnitFromBuilding(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(?:\[.*?\]\s*)?(?:Apartment|Unit|Villa)\s+([A-Za-z0-9-]+)/i);
  return match?.[1] || null;
}

function formatLeadUnit(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^unit\b/i.test(raw)) return raw;
  return `Unit ${raw}`;
}

function PhoneIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

function HomeIcon({ size = 15, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

function WhatsAppIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </Svg>
  );
}

function CopyIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 8H20V20H8z" />
      <Path d="M16 8V4H4V16H8" />
    </Svg>
  );
}

function CheckIcon({ size = 18, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

function getBadgePalette({ type, statusId, colors }) {
  if (type === "due") return { bg: colors.badgeDueBg, fg: colors.badgeDueText };
  if (type === "ok") return { bg: colors.badgeOkBg, fg: colors.badgeOkText };

  // Status-specific colors (distinct hue per pipeline stage)
  const isDark = colors.isDark;
  if (statusId === "prospect") {
    return isDark
      ? { bg: "#172554", fg: "#93c5fd" }  // deep indigo / sky
      : { bg: "#dbeafe", fg: "#1e40af" };
  }
  if (statusId === "market_appraisal") {
    return isDark
      ? { bg: "#422006", fg: "#fbbf24" }  // deep amber / gold
      : { bg: "#fef3c7", fg: "#92400e" };
  }
  if (statusId === "for_sale_available") {
    return isDark
      ? { bg: "#052e16", fg: "#4ade80" }  // deep green
      : { bg: "#dcfce7", fg: "#166534" };
  }

  return { bg: colors.bgBadge, fg: colors.textBadge };
}

export function Badge({ label, type, statusId, colors }) {
  const { bg, fg } = getBadgePalette({ type, statusId, colors });
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: fg,
          lineHeight: 14,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function LeadCard({ buildingImageUrl, isSent, isDone, lead, insight, onPress, copiedLeadId, onCopyMessage, onToggleSent, colors }) {
  const c = colors;
  const message = insight?.message || buildMessage(lead, insight);
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const [previewVisible, setPreviewVisible] = useState(false);
  const bedroomLabel = formatLeadBedroom(lead.bedroom);
  const unitLabel = formatLeadUnit(lead.unit || extractUnitFromBuilding(lead.building));

  function handleWhatsApp(e) {
    e.stopPropagation();
    if (!whatsappPhone) return;
    Linking.openURL(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`);
    if (!isSent) void onToggleSent(lead.id);
  }

  return (
    <Pressable onPress={() => onPress(lead)} style={{ opacity: isSent ? 0.5 : 1 }}>
      {/* Name + building image */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {buildingImageUrl && (
          <Pressable onPress={(e) => { e.stopPropagation(); setPreviewVisible(true); }}>
            <Image
              source={{ uri: buildingImageUrl }}
              style={{ width: 52, height: 52, borderRadius: 8 }}
            />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.textName, textDecorationLine: isDone ? "line-through" : "none" }}>{lead.name || "Unnamed"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <HomeIcon size={14} color={c.textMuted} />
            <Text style={{ fontSize: 15, color: c.textMuted }} numberOfLines={1}>{formatBuildingLabel(lead.building) || "-"}</Text>
          </View>
          {(bedroomLabel || unitLabel) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
              {bedroomLabel && <Text style={{ fontSize: 13, color: c.textFaint, fontWeight: "500" }}>{bedroomLabel}</Text>}
              {bedroomLabel && unitLabel && <Text style={{ fontSize: 13, color: c.textFainter }}>·</Text>}
              {unitLabel && <Text style={{ fontSize: 13, color: c.textFaint }}>{unitLabel}</Text>}
            </View>
          )}
          {lead.phone && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <PhoneIcon size={13} color={c.textFaint} />
              <Text style={{ fontSize: 14, color: c.textFaint }}>{lead.phone}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Badges + action button */}
      {!isDone && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <View style={[s.badges, { flex: 1 }]}>
            <Badge label={lead.statusLabel} statusId={lead.statusRule?.id} colors={c} />
            <Badge label={lead.dueLabel} type={lead.isDue ? "due" : "ok"} colors={c} />
            {insight?.status === "ready" && <Badge label="Enriched" type="ok" colors={c} />}
            {lead.newTxSinceSent > 0 && <Badge label={`${lead.newTxSinceSent} new txns`} type="due" colors={c} />}
          </View>
          {whatsappPhone ? (
            <Pressable onPress={handleWhatsApp} style={{ alignItems: "center", justifyContent: "center", backgroundColor: c.whatsappBg, width: 40, height: 40, borderRadius: 20 }}>
              {isSent ? <CheckIcon size={18} color={c.whatsappText} /> : <WhatsAppIcon size={18} color={c.whatsappText} />}
            </Pressable>
          ) : (
            <Pressable onPress={(e) => { e.stopPropagation(); onCopyMessage(lead.id, message); }} style={{ alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border }}>
              {copiedLeadId === lead.id ? <CheckIcon size={18} color={c.textSecondary} /> : <CopyIcon size={18} color={c.textSecondary} />}
            </Pressable>
          )}
        </View>
      )}
      {buildingImageUrl && (
        <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
          <Pressable onPress={() => setPreviewVisible(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" }}>
            <Image source={{ uri: buildingImageUrl }} style={{ width: "90%", height: "60%", borderRadius: 12 }} resizeMode="contain" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 16 }}>{lead.building || ""}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>Tap anywhere to close</Text>
          </Pressable>
        </Modal>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
