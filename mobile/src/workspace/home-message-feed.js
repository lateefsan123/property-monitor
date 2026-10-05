import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import BottomSheet from "../components/BottomSheet";
import ContentSkeleton from "../components/ContentSkeleton";
import MessageFeedList from "./message-feed-list";

const PREVIEW_COUNT = 3;

// Home shortcut: the latest few people messaged or who replied. Show all opens
// every message from the last 7 days in a sheet; rows open the seller's history.
export default function HomeMessageFeed({ query, colors, onOpenSeller }) {
  const [showAll, setShowAll] = useState(false);
  const items = query.data || [];
  const open = (sellerId) => { setShowAll(false); onOpenSeller(sellerId); };
  return <View style={{ gap: 6, backgroundColor: colors.bgCard, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 15, fontWeight: "600" }}>Recent messages</Text>
      {items.length > PREVIEW_COUNT ? <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={{ minHeight: 36, justifyContent: "center", paddingLeft: 12 }}>
        <Text style={{ color: colors.text, fontSize: 13 }}>Show all</Text>
      </Pressable> : null}
    </View>
    {query.isPending ? <ContentSkeleton colors={colors} rows={2} label="Loading recent messages" />
      : query.error ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Recent messages unavailable.</Text>
        : !items.length ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>No messages in the last 7 days.</Text>
          : <MessageFeedList items={items.slice(0, PREVIEW_COUNT)} compact colors={colors} onOpenSeller={open} />}
    <BottomSheet visible={showAll} onClose={() => setShowAll(false)} colors={colors}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Last 7 days</Text>
          <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 20, fontWeight: "700" }}>{items.length} message{items.length === 1 ? "" : "s"}</Text>
        </View>
        <MessageFeedList items={items} colors={colors} onOpenSeller={open} />
      </ScrollView>
    </BottomSheet>
  </View>;
}
