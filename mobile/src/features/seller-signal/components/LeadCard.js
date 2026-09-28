import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import AppIcon from "../../../components/AppIcon";
import { Icon } from "../../../workspace/ui";
import * as Linking from "expo-linking";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

function HomeIcon({ size = 15, color }) {
  return (
    <AppIcon name="home" size={size} color={color} />
  );
}

function WhatsAppIcon({ size = 18, color }) {
  return (
    <AppIcon name="whatsapp" size={size} color={color} />
  );
}

function CopyIcon({ size = 18, color }) {
  return (
    <AppIcon name="copy" size={size} color={color} />
  );
}

function CheckIcon({ size = 18, color }) {
  return (
    <AppIcon name="check" size={size} color={color} />
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

export default function LeadCard({
  colors,
  copiedLeadId,
  insight,
  favorite, pinned, onFavorite, onPin,
  isSent,
  lead,
  messageTemplate,
  onCopyMessage,
  onPress,
  onSendWhatsApp,
  onHandoff,
  whatsappConnected,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const c = colors;
  const message = lead.message_draft ?? (insight?.message || buildMessage(lead, insight, messageTemplate));
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const bedroomLabel = formatLeadBedroom(lead.bedroom);
  const unitLabel = formatLeadUnit(lead.unit || extractUnitFromBuilding(lead.building));

  function handleWhatsApp(e) {
    e.stopPropagation();
    if (!whatsappPhone) return;
    if (whatsappConnected) {
      void onSendWhatsApp?.(lead.id);
      return;
    }
    Linking.openURL(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`);
    onHandoff?.(lead.id);
  }

  return (
    <Pressable onPress={() => onPress(lead)} accessibilityRole="button" accessibilityLabel={`Open seller ${lead.name || "Unnamed"}`}>
      {/* Seller identity and property details */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.textName }}>{lead.name || "Unnamed"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <HomeIcon size={14} color={c.textMuted} />
            <Text style={{ fontSize: 15, color: c.textMuted }} numberOfLines={1}>{formatBuildingLabel(lead.resolvedBuilding || lead.building) || "-"}</Text>
          </View>
          {(bedroomLabel || unitLabel) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
              {bedroomLabel && <Text style={{ fontSize: 13, color: c.textFaint, fontWeight: "500" }}>{bedroomLabel}</Text>}
              {bedroomLabel && unitLabel && <Text style={{ fontSize: 13, color: c.textFainter }}>·</Text>}
              {unitLabel && <Text style={{ fontSize: 13, color: c.textFaint }}>{unitLabel}</Text>}
            </View>
          )}
        </View>
      <View style={{flexDirection:'row',justifyContent:'flex-end'}}>{[[onPin,pinned,'pin','Pin seller'],[onFavorite,favorite,'star','Add to favourites']].map(([action,selected,icon,label]) => <Pressable key={icon} accessibilityRole="button" accessibilityLabel={selected ? (icon === "pin" ? "Unpin seller" : "Remove favourite") : label} accessibilityState={{selected}} onPress={event=>{event.stopPropagation();action?.();}} style={{padding:10, borderRadius:12, backgroundColor:selected ? c.bgBadge : "transparent"}}><Icon name={selected ? `${icon}Filled` : icon} size={16} color={selected ? c.statValue : c.textFaint}/></Pressable>)}</View>
      </View>


      {lead.phone ? <Pressable accessibilityRole="button" accessibilityLabel={`Copy phone number for ${lead.name || "seller"}`} onPress={async event => { event.stopPropagation(); try { await Clipboard.setStringAsync(String(lead.phone)); setCopyStatus("Copied"); } catch { setCopyStatus("Could not copy. Try again."); } }} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}><CopyIcon size={15} color={c.textMuted} /><Text style={{ color: c.textMuted, fontSize: 13 }}>{lead.phone}</Text>{copyStatus ? <Text accessibilityLiveRegion="polite" style={{ color: c.textMuted, fontSize: 12 }}>{copyStatus}</Text> : null}</Pressable> : null}
      {/* Badges + action button */}
      {(
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <View style={[s.badges, { flex: 1 }]}>
            <Badge label={lead.statusLabel} statusId={lead.statusRule?.id} colors={c} />
            <Badge label={lead.dueLabel} type={lead.isDue ? "due" : "ok"} colors={c} />
            {lead.dataQuality?.level === "review" && <Badge label="Needs review" colors={c} />}
            {lead.newTxSinceSent > 0 && <Badge label={`${lead.newTxSinceSent} new txns`} type="due" colors={c} />}
          </View>
          {whatsappPhone ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Send WhatsApp message to ${lead.name || "seller"}`} onPress={handleWhatsApp} style={{ alignItems: "center", justifyContent: "center", backgroundColor: c.whatsappBg, width: 40, height: 40, borderRadius: 20 }}>
              {isSent ? <CheckIcon size={18} color={c.whatsappText} /> : <WhatsAppIcon size={18} color={c.whatsappText} />}
            </Pressable>
          ) : (
            <Pressable onPress={(e) => { e.stopPropagation(); onCopyMessage(lead.id, message); }} style={{ alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border }}>
              {copiedLeadId === lead.id ? <CheckIcon size={18} color={c.textSecondary} /> : <CopyIcon size={18} color={c.textSecondary} />}
            </Pressable>
          )}
        </View>
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
