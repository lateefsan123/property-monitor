import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import ContentSkeleton from "../components/ContentSkeleton";
import MessageFeedList from "./message-feed-list";
import { activityFeedQueryKey, fetchMessageFeed } from "./message-feed";

const FILTERS = [["all", "All"], ["sent", "Sent"], ["replies", "Replies"]];

// Everyone messaged and every reply from the last 30 days. Rows open the seller
// on their message history, next to their notes.
export default function ActivityScreen({ userId, colors, onNavigate }) {
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const feed = useQuery({ queryKey: activityFeedQueryKey(userId), queryFn: () => fetchMessageFeed(userId, { days: 30, limit: 2000 }), enabled: Boolean(userId) });
  const items = (feed.data || []).filter((item) => filter === "all" || (filter === "replies") === (item.direction === "inbound"));
  async function refresh() {
    setRefreshing(true);
    try { await feed.refetch(); } finally { setRefreshing(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 18 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />}>
    <Text style={{ color: colors.textMuted, fontSize: 14 }}>Who you messaged and who replied, last 30 days.</Text>
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: colors.bgBadge }}>
      {FILTERS.map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: filter === id }} onPress={() => setFilter(id)}
        style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: filter === id ? colors.bgCard : "transparent" }}>
        <Text style={{ color: filter === id ? colors.text : colors.textMuted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
      </Pressable>)}
    </View>
    {feed.isPending ? <ContentSkeleton colors={colors} rows={4} label="Loading activity" />
      : feed.error ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Activity unavailable. Pull down to try again.</Text>
        : !items.length ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>{filter === "replies" ? "No replies in the last 30 days." : "No messages in the last 30 days."}</Text>
          : <MessageFeedList items={items} colors={colors} onOpenSeller={(sellerId) => onNavigate("sellers", { sellerId, sellerTab: "History" })} />}
  </ScrollView>;
}
