import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import BottomSheet from "../components/BottomSheet";
import ContentSkeleton from "../components/ContentSkeleton";
import MessageFeedList, { LoadMore } from "./message-feed-list";
import SetupNextAction from "./setup-next-action";
import { fetchMessagePage, latestPerSeller, messageFeedQueryKey, nextFeedCursor } from "./message-feed";

// The last 7 days, a page at a time; mounted only while the sheet is open.
function AllMessages({ userId, colors, onOpenSeller }) {
  const feed = useInfiniteQuery({
    queryKey: messageFeedQueryKey(userId, "week"),
    queryFn: ({ pageParam }) => fetchMessagePage(userId, { days: 7, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: nextFeedCursor,
  });
  if (feed.isPending) return <ContentSkeleton colors={colors} rows={4} label="Loading messages" />;
  if (feed.error) return <Text style={{ color: colors.textMuted, fontSize: 14 }}>Messages unavailable.</Text>;
  return <View>
    <MessageFeedList items={latestPerSeller(feed.data.pages.flatMap((page) => page.items))} colors={colors} onOpenSeller={onOpenSeller} />
    <LoadMore query={feed} colors={colors} />
  </View>;
}

// Home shortcut: the latest few people messaged or who replied, each with its
// exact send time. Show all opens the last 7 days in a sheet.
export default function HomeMessageFeed({ userId, query, colors, onOpenSeller, onNavigate }) {
  const [showAll, setShowAll] = useState(false);
  const items = query.data?.items || [];
  const open = (sellerId) => { setShowAll(false); onOpenSeller(sellerId); };
  return <View style={{ gap: 6, backgroundColor: colors.bgCard, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 15, fontWeight: "600" }}>Recent messages</Text>
      {query.data?.hasMore ? <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={{ minHeight: 36, justifyContent: "center", paddingLeft: 12 }}>
        <Text style={{ color: colors.text, fontSize: 13 }}>Show all</Text>
      </Pressable> : null}
    </View>
    {query.isPending ? <ContentSkeleton colors={colors} rows={2} label="Loading recent messages" />
      : query.error ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Recent messages unavailable.</Text>
        : !items.length ? <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>No messages in the last 7 days.</Text>
          <SetupNextAction userId={userId} colors={colors} onNavigate={onNavigate} showHint={false} />
        </View>
          : <MessageFeedList items={items} compact colors={colors} onOpenSeller={open} />}
    <BottomSheet visible={showAll} onClose={() => setShowAll(false)} colors={colors}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Last 7 days</Text>
          <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 20, fontWeight: "700" }}>Recent messages</Text>
        </View>
        {showAll ? <AllMessages userId={userId} colors={colors} onOpenSeller={open} /> : null}
      </ScrollView>
    </BottomSheet>
  </View>;
}
