import { Pressable, Text, View } from "react-native";
import { formatBuildingLabel } from "../features/seller-signal/lead-utils";
import { formatMessageWhen, groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../shared/whatsapp-messages.js";

const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function FeedRow({ item, compact, first, colors, onOpenSeller }) {
  const lead = item.lead;
  const inbound = item.direction === "inbound";
  const name = lead?.name || `+${item.recipient_phone}`;
  const place = lead ? [formatBuildingLabel(lead.building) || lead.building, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean).join(" · ") : "Not in your sellers";
  const detail = inbound ? `Replied: ${messageText(item)}` : [messageSourceLabel(item), messageStatusLabel(item)].filter(Boolean).join(" · ");
  const sentAt = messageTime(item);
  // Rows under a day divider show the time; standalone rows also name the day.
  const when = compact ? formatMessageWhen(sentAt) : timeOf(sentAt);
  return <Pressable disabled={!lead} accessibilityRole={lead ? "button" : undefined}
    accessibilityLabel={`${inbound ? "Reply from" : "Message to"} ${name}, ${formatMessageWhen(sentAt)}${lead ? ", open messages" : ""}`}
    onPress={() => onOpenSeller(lead.id)}
    style={({ pressed }) => ({ flexDirection: "row", gap: 14, paddingVertical: compact ? 11 : 14, opacity: pressed ? 0.6 : 1, borderTopWidth: first ? 0 : 1, borderColor: colors.border })}>
    <View style={{ flex: 1, gap: 3 }}>
      <Text numberOfLines={1} style={{ color: colors.textName, fontSize: 15, fontWeight: "600" }}>{name}</Text>
      {compact ? null : <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13 }}>{place}</Text>}
      <Text numberOfLines={inbound && !compact ? 2 : 1} style={{ color: item.status === "failed" ? colors.errorText : inbound ? colors.text : colors.textMuted, fontSize: 13 }}>{detail}</Text>
    </View>
    <Text style={{ color: colors.textMuted, fontSize: 12, paddingTop: 2, fontVariant: ["tabular-nums"] }}>{when}</Text>
  </Pressable>;
}

// A day label followed by a rule to the edge.
export function DayDivider({ title, colors }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 }}>
    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>{title}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
  </View>;
}

// Rows of who was messaged (and who replied). Grouped under day dividers unless compact.
export default function MessageFeedList({ items, compact = false, colors, onOpenSeller }) {
  if (compact) return <View>{items.map((item, index) => <FeedRow key={item.id} item={item} compact first={index === 0} colors={colors} onOpenSeller={onOpenSeller} />)}</View>;
  return <View style={{ gap: 20 }}>
    {groupFeedByDay(items).map((group) => <View key={group.key}>
      <DayDivider title={group.title} colors={colors} />
      {group.items.map((item, index) => <FeedRow key={item.id} item={item} first={index === 0} colors={colors} onOpenSeller={onOpenSeller} />)}
    </View>)}
  </View>;
}

// "Load more" for paged lists; hidden once every page is loaded.
export function LoadMore({ query, colors }) {
  if (!query.hasNextPage) return null;
  return <Pressable accessibilityRole="button" disabled={query.isFetchingNextPage} onPress={() => query.fetchNextPage()}
    style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: query.isFetchingNextPage ? colors.textMuted : colors.textName, fontSize: 14, fontWeight: "500" }}>{query.isFetchingNextPage ? "Loading…" : "Load more"}</Text>
  </Pressable>;
}
