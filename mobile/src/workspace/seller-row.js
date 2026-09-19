import { Pressable, Text, View } from "react-native";
import { Icon } from "./ui";

export default function SellerRow({
  lead,
  insight,
  onPress,
  colors,
  favorite,
  pinned,
  onFavorite,
  onPin,
}) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.bgCard,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open seller ${lead.name}`}
          onPress={() => onPress(lead)}
          style={{ flex: 1 }}
        >
          <Text
            numberOfLines={2}
            style={{ color: colors.textName, fontWeight: "700", fontSize: 14 }}
          >
            {lead.name || "Unnamed seller"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pinned ? "Unpin seller" : "Pin seller"}
          onPress={onPin}
          style={{ padding: 8 }}
        >
          <Icon
            name="pin"
            size={16}
            color={pinned ? colors.statValue : colors.textFaint}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favorite ? "Unfavorite seller" : "Favorite seller"
          }
          onPress={onFavorite}
          style={{ padding: 8 }}
        >
          <Icon
            name="star"
            size={16}
            color={favorite ? "#c99017" : colors.textFaint}
          />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Seller details for ${lead.name}`}
        onPress={() => onPress(lead)}
        style={{ gap: 8 }}
      >
        <Text
          numberOfLines={2}
          style={{ color: colors.textSecondary, fontSize: 12 }}
        >
          {lead.resolvedBuilding || lead.building}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {lead.bedroom || "N/A"}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {lead.unit || "No unit"}
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 12 }}>
            {lead.phone || "No phone"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[
            lead.statusLabel,
            lead.dueLabel,
            lead.dataQuality?.label,
            insight?.status === "ready" ? "Has market data" : null,
          ]
            .filter(Boolean)
            .map((label, index) => (
              <Text
                key={`${index}:${label}`}
                style={{
                  fontSize: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                  color: colors.textBadge,
                  backgroundColor: colors.bgBadge,
                }}
              >
                {label}
              </Text>
            ))}
        </View>
      </Pressable>
    </View>
  );
}
