import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import BottomSheet from "../../../components/BottomSheet";

const STATUS_OPTIONS = [
  { value: "", label: "None" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
];

const EMPTY_DRAFT = {
  name: "",
  building: "",
  bedroom: "",
  unit: "",
  phone: "",
  status: "",
};

export default function AddSellerSheet({ visible, onClose, onSubmit, submitting, sourceLabel, colors }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  useEffect(() => {
    if (visible) setDraft(EMPTY_DRAFT);
  }, [visible]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    const ok = await onSubmit(draft);
    if (ok) onClose?.();
  }

  const disabled = submitting
    || !(String(draft.name).trim() || String(draft.building).trim() || String(draft.phone).trim());

  return (
    <BottomSheet visible={visible} onClose={onClose} colors={colors}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: colors.textName }]}>Add seller</Text>
        {sourceLabel ? (
          <Text style={[s.subtitle, { color: colors.textMuted }]}>to {sourceLabel}</Text>
        ) : null}

        <Field label="Name" colors={colors}>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            placeholder="Seller name"
            placeholderTextColor={colors.textFaint}
            value={draft.name}
            onChangeText={(value) => updateField("name", value)}
            editable={!submitting}
          />
        </Field>

        <Field label="Building" colors={colors}>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            placeholder="Building name"
            placeholderTextColor={colors.textFaint}
            value={draft.building}
            onChangeText={(value) => updateField("building", value)}
            editable={!submitting}
          />
        </Field>

        <View style={s.row}>
          <View style={s.half}>
            <Field label="Bedroom" colors={colors}>
              <TextInput
                style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="2BR"
                placeholderTextColor={colors.textFaint}
                value={draft.bedroom}
                onChangeText={(value) => updateField("bedroom", value)}
                editable={!submitting}
              />
            </Field>
          </View>
          <View style={s.half}>
            <Field label="Unit" colors={colors}>
              <TextInput
                style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="Unit 1203"
                placeholderTextColor={colors.textFaint}
                value={draft.unit}
                onChangeText={(value) => updateField("unit", value)}
                editable={!submitting}
              />
            </Field>
          </View>
        </View>

        <Field label="Phone" colors={colors}>
          <TextInput
            style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            placeholder="+971..."
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            value={draft.phone}
            onChangeText={(value) => updateField("phone", value)}
            editable={!submitting}
          />
        </Field>

        <Field label="Status" colors={colors}>
          <View style={s.statusRow}>
            {STATUS_OPTIONS.map((option) => {
              const active = draft.status === option.value;
              return (
                <Pressable
                  key={option.value || "blank"}
                  style={[
                    s.statusChip,
                    { backgroundColor: active ? colors.tabActiveBg : colors.bgBadge },
                  ]}
                  onPress={() => updateField("status", option.value)}
                  disabled={submitting}
                >
                  <Text style={[s.statusChipText, { color: active ? colors.tabActiveText : colors.textMuted }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [
              s.cancelBtn,
              { borderColor: colors.border, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 },
            ]}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              s.submitBtn,
              { backgroundColor: colors.btnPrimaryBg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={disabled}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.btnPrimaryText} />
            ) : (
              <Text style={[s.submitBtnText, { color: colors.btnPrimaryText }]}>Add seller</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function Field({ label, colors, children }) {
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { maxHeight: 600 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 14 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: -10 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusChipText: { fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontSize: 14, fontWeight: "700" },
});
