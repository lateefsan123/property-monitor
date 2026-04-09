import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Pagination({ currentPage, onNext, onPrevious, totalPages, colors }) {
  const s = styles(colors);

  return (
    <View style={s.row}>
      <Pressable style={[s.btn, currentPage <= 1 && s.btnDisabled]} onPress={onPrevious} disabled={currentPage <= 1}>
        <Text style={[s.btnText, currentPage <= 1 && s.btnTextDisabled]}>Previous</Text>
      </Pressable>
      <Text style={s.pageText}>{currentPage} / {totalPages}</Text>
      <Pressable style={[s.btn, currentPage >= totalPages && s.btnDisabled]} onPress={onNext} disabled={currentPage >= totalPages}>
        <Text style={[s.btnText, currentPage >= totalPages && s.btnTextDisabled]}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 24, paddingTop: 20 },
    btn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      backgroundColor: c.bgCard,
    },
    btnDisabled: { opacity: 0.35 },
    btnText: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
    btnTextDisabled: { color: c.textFaint },
    pageText: { fontSize: 13, color: c.textFaint },
  });
