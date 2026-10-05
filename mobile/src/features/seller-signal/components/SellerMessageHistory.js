import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import ContentSkeleton from "../../../components/ContentSkeleton";
import { fetchSellerThread, sellerThreadQueryKey } from "../../../workspace/message-feed";
import { groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../../../shared/whatsapp-messages.js";

const RECENT_COUNT = 6;
const timeOf = (value) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Every WhatsApp message with this seller: what you sent (right) and what they
// replied (left), oldest first, grouped by day. Opens on the latest few so the
// newest message and any reply are in view without scrolling.
export default function SellerMessageHistory({ userId, lead, colors: c }) {
  const [showAll, setShowAll] = useState(false);
  const thread = useQuery({
    queryKey: sellerThreadQueryKey(userId, lead.id),
    queryFn: () => fetchSellerThread(userId, lead),
    enabled: Boolean(userId && lead?.id),
  });
  if (thread.isPending) return <ContentSkeleton colors={c} rows={3} label="Loading message history" />;
  if (thread.error) return <Text style={{ color: c.errorText, fontSize: 14 }}>Message history unavailable. Pull down to try again.</Text>;
  const messages = thread.data || [];
  if (!messages.length) return <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>No WhatsApp messages with {lead.name || "this seller"} yet. Messages you send and their replies will show here.</Text>;

  const hidden = showAll ? 0 : Math.max(0, messages.length - RECENT_COUNT);
  // groupFeedByDay keeps input order, so oldest-first days stay oldest first.
  return <View style={{ gap: 18 }}>
    {hidden ? <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>Show {hidden} earlier {hidden === 1 ? "message" : "messages"}</Text>
    </Pressable> : null}
    {groupFeedByDay(messages.slice(hidden)).map((group) => <View key={group.key} style={{ gap: 10 }}>
      <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center" }}>{group.title}</Text>
      {group.items.map((message) => {
        const inbound = message.direction === "inbound";
        const failed = message.status === "failed";
        const meta = inbound ? timeOf(messageTime(message)) : [timeOf(messageTime(message)), messageSourceLabel(message), messageStatusLabel(message)].filter(Boolean).join(" · ");
        return <View key={message.id} style={{ alignItems: inbound ? "flex-start" : "flex-end", gap: 4 }}>
          <View style={{ maxWidth: "86%", borderRadius: 16, borderTopLeftRadius: inbound ? 4 : 16, borderTopRightRadius: inbound ? 16 : 4, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: inbound ? c.bgMsg : c.bgBadge }}>
            <Text selectable style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{messageText(message)}</Text>
          </View>
          <Text style={{ color: failed ? c.errorText : c.textMuted, fontSize: 11 }}>{failed && message.error_message ? `${meta} · ${message.error_message}` : meta}</Text>
        </View>;
      })}
    </View>)}
  </View>;
}
