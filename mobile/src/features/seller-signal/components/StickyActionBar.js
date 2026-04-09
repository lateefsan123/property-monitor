import { Pressable, StyleSheet, Text, View } from "react-native";

export default function StickyActionBar({ canSendAll, onSendAll, sendAllCount, colors }) {
  if (!canSendAll) return null;

  const s = styles(colors);

  return (
    <View style={s.container}>
      <Pressable style={s.btn} onPress={onSendAll}>
        <Text style={s.title}>Send All</Text>
        <Text style={s.subtitle}>{sendAllCount} on current page</Text>
      </Pressable>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 32,
      right: 16,
    },
    btn: {
      backgroundColor: c.whatsappBg,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    title: { color: c.whatsappText, fontSize: 15, fontWeight: "700" },
    subtitle: { color: c.whatsappText, fontSize: 11, fontWeight: "500", opacity: 0.8 },
  });
