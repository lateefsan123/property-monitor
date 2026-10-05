import { Pressable, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import ContentSkeleton from "../../../components/ContentSkeleton";
import { fetchSellerThreadPage, nextFeedCursor, sellerThreadQueryKey } from "../../../workspace/message-feed";
import { formatMessageWhen, groupFeedByDay, messageSourceLabel, messageStatusLabel, messageText, messageTime } from "../../../../../shared/whatsapp-messages.js";

// Every WhatsApp message with this seller: what you sent (right) and what they
// replied (left), oldest first under day dividers. Loads the latest 20; earlier
// messages load a page at a time.
export default function SellerMessageHistory({ userId, lead, colors: c }) {
  const thread = useInfiniteQuery({
    queryKey: sellerThreadQueryKey(userId, lead.id),
    queryFn: ({ pageParam }) => fetchSellerThreadPage(userId, lead, { cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: nextFeedCursor,
    enabled: Boolean(userId && lead?.id),
  });
  if (thread.isPending) return <ContentSkeleton colors={c} rows={3} label="Loading message history" />;
  if (thread.error) return <Text style={{ color: c.errorText, fontSize: 14 }}>Message history unavailable. Close and reopen to try again.</Text>;
  // Pages arrive newest first; the thread reads oldest first.
  const messages = thread.data.pages.flatMap((page) => page.items).reverse();
  if (!messages.length) return <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>No WhatsApp messages with {lead.name || "this seller"} yet. Messages you send and their replies will show here.</Text>;

  return <View style={{ gap: 20 }}>
    {thread.hasNextPage ? <Pressable accessibilityRole="button" disabled={thread.isFetchingNextPage} onPress={() => thread.fetchNextPage()} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: thread.isFetchingNextPage ? c.textMuted : c.text, fontSize: 14, fontWeight: "500" }}>{thread.isFetchingNextPage ? "Loading…" : "Show earlier messages"}</Text>
    </Pressable> : null}
    {groupFeedByDay(messages).map((group) => <View key={group.key} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>{group.title}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>
      {group.items.map((message) => {
        const inbound = message.direction === "inbound";
        const failed = message.status === "failed";
        const time = formatMessageWhen(messageTime(message));
        const meta = inbound ? time : [time, messageSourceLabel(message), messageStatusLabel(message)].filter(Boolean).join(" · ");
        return <View key={message.id} style={{ alignItems: inbound ? "flex-start" : "flex-end", gap: 4 }}>
          <View style={{ maxWidth: "86%", borderRadius: 16, borderTopLeftRadius: inbound ? 4 : 16, borderTopRightRadius: inbound ? 16 : 4, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: inbound ? c.bgMsg : c.bgBadge }}>
            <Text selectable style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{messageText(message)}</Text>
          </View>
          <Text style={{ color: failed ? c.errorText : c.textMuted, fontSize: 11, fontVariant: ["tabular-nums"] }}>{failed && message.error_message ? `${meta} · ${message.error_message}` : meta}</Text>
        </View>;
      })}
    </View>)}
  </View>;
}
