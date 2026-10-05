import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatBuildingLabel } from "../features/seller-signal/lead-utils";
import { groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../shared/whatsapp-messages.js";

const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function FeedRow({ item, compact, first, colors, onOpenSeller }) {
  const lead = item.lead;
  const inbound = item.direction === "inbound";
  const name = lead?.name || `+${item.recipient_phone}`;
  const place = lead ? [formatBuildingLabel(lead.building) || lead.building, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean).join(" · ") : "Not in your sellers";
  const detail = inbound ? `Replied: ${messageText(item)}` : [messageSourceLabel(item), messageStatusLabel(item)].filter(Boolean).join(" · ");
  const time = timeOf(messageTime(item));
  return <Pressable disabled={!lead} accessibilityRole={lead ? "button" : undefined}
    accessibilityLabel={`${inbound ? "Reply from" : "Message to"} ${name}, ${time}${lead ? ", open messages" : ""}`}
    onPress={() => onOpenSeller(lead.id)}
    style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: compact ? 10 : 12, opacity: pressed ? 0.6 : 1, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border })}>
    <View style={{ flex: 1, gap: 3 }}>
      <Text numberOfLines={1} style={{ color: colors.textName, fontSize: 15, fontWeight: "600" }}>{name}</Text>
      {compact ? null : <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13 }}>{place}</Text>}
      <Text numberOfLines={inbound && !compact ? 2 : 1} style={{ color: item.status === "failed" ? colors.errorText : inbound ? colors.text : colors.textMuted, fontSize: 13 }}>{detail}</Text>
    </View>
    <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{time}</Text>
  </Pressable>;
}

// Rows of who was messaged (and who replied). Grouped by day unless compact.
export default function MessageFeedList({ items, compact = false, colors, onOpenSeller }) {
  if (compact) return <View>{items.map((item, index) => <FeedRow key={item.id} item={item} compact first={index === 0} colors={colors} onOpenSeller={onOpenSeller} />)}</View>;
  return <View style={{ gap: 18 }}>
    {groupFeedByDay(items).map((group) => <View key={group.key} style={{ gap: 2 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>{group.title}</Text>
      {group.items.map((item, index) => <FeedRow key={item.id} item={item} first={index === 0} colors={colors} onOpenSeller={onOpenSeller} />)}
    </View>)}
  </View>;
}
