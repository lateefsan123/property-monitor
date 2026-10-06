import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BottomSheet from "../components/BottomSheet";
import AppIcon from "../components/AppIcon";
import { SettingsGroup } from "../components/SettingsLayout";
import { Button, Feedback, Field } from "./ui";
import { FOLLOW_UP_OPTIONS, MAX_STATUSES, STATUS_COLOR_OPTIONS, statusesQueryKey } from "../../../shared/seller-statuses.js";
import { deleteStatus, fetchStatuses, renameSellers, saveStatus } from "../features/seller-signal/seller-status-services";
import { refreshAccountStatuses } from "../../../src/features/seller-signal/status-registry.js";

// Mobile copy of web Settings → Statuses (src/features/settings/StatusesSection.jsx).
const BUILT_INS = [
  { key: "prospect", label: "Prospect", tone: "#3b82f6", days: 75 },
  { key: "market_appraisal", label: "Appraisal", tone: "#d97706", days: 25 },
  { key: "for_sale_available", label: "For Sale", tone: "#16a34a", days: 5 },
  { key: "not_interested", label: "Not Interested", tone: "#9ca3af", locked: true },
];

function followUpLabel(days) {
  return FOLLOW_UP_OPTIONS.find((item) => item.days === Number(days))?.label || (Number(days) === 0 ? "Don't follow up" : `Every ${days} days`);
}

function Row({ color, label, detail, colors, last, onPress, disabled }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${detail}`} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 16, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 58, paddingRight: 16, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.border }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{detail}</Text>
        </View>
        {!disabled ? <AppIcon name="chevron" size={17} color={colors.textFaint} /> : null}
      </View>
    </Pressable>
  );
}

export default function StatusSettings({ userId, colors }) {
  const client = useQueryClient();
  const statuses = useQuery({ queryKey: statusesQueryKey(userId), enabled: Boolean(userId), queryFn: () => fetchStatuses(userId) });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const rows = statuses.data || [];
  const custom = rows.filter((row) => !row.builtin_key);
  const overrides = new Map(rows.filter((row) => row.builtin_key).map((row) => [row.builtin_key, row]));

  async function run(task) {
    setSaving(true);
    setError(null);
    try {
      await task();
      refreshAccountStatuses(userId);
      await Promise.all([
        client.invalidateQueries({ queryKey: statusesQueryKey(userId) }),
        client.invalidateQueries({ queryKey: ["seller-signal"] }),
      ]);
      setDraft(null);
    } catch (failure) {
      setError(failure);
    } finally {
      setSaving(false);
    }
  }

  function save() {
    return run(async () => {
      const previous = draft.id ? rows.find((row) => row.id === draft.id) : null;
      const saved = await saveStatus(userId, { ...draft, position: draft.position ?? custom.length });
      if (previous && !previous.builtin_key && previous.label !== saved.label) await renameSellers(userId, previous.label, saved.label);
    });
  }

  function remove() {
    const row = rows.find((item) => item.id === draft.id);
    if (!row) return;
    Alert.alert(`Delete "${row.label}"?`, "Sellers with this status will have no status.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => run(() => deleteStatus(userId, row)) },
    ]);
  }

  const newDraft = () => ({ label: "", color: STATUS_COLOR_OPTIONS[custom.length % STATUS_COLOR_OPTIONS.length], follow_up_days: 14 });

  return (
    <View style={{ gap: 4 }}>
      <Feedback colors={colors} error={statuses.error} loading={statuses.isPending} onRetry={statuses.refetch} />
      <SettingsGroup title="Your statuses" colors={colors}>
        {custom.map((row) => <Row key={row.id} color={row.color || "#6b7280"} label={row.label} detail={followUpLabel(row.follow_up_days)} colors={colors} onPress={() => { setError(null); setDraft({ ...row }); }} />)}
        <Pressable accessibilityRole="button" disabled={custom.length >= MAX_STATUSES - BUILT_INS.length} onPress={() => { setError(null); setDraft(newDraft()); }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
          <AppIcon name="plus" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 16 }}>Add status</Text>
        </Pressable>
      </SettingsGroup>
      <SettingsGroup title="Built-in" colors={colors}>
        {BUILT_INS.map((item, index) => {
          const override = overrides.get(item.key);
          const days = item.locked ? 0 : override ? override.follow_up_days : item.days;
          return <Row key={item.key} color={item.tone} label={item.label} detail={item.locked ? "Never messaged" : followUpLabel(days)} colors={colors}
            last={index === BUILT_INS.length - 1} disabled={item.locked}
            onPress={() => { setError(null); setDraft({ id: override?.id, builtin_key: item.key, label: item.label, follow_up_days: days }); }} />;
        })}
      </SettingsGroup>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>Follow-up gaps decide when a seller shows as due. Statuses set to "Don't follow up" are never sent automated messages.</Text>

      <BottomSheet visible={Boolean(draft)} onClose={() => !saving && setDraft(null)} colors={colors}>
        {draft ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 18 }}>
            <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: "700" }}>{draft.builtin_key ? draft.label : draft.id ? "Edit status" : "New status"}</Text>
            <Feedback colors={colors} error={error} />
            {!draft.builtin_key ? <>
              <Field colors={colors} label="Name" value={draft.label} maxLength={40} placeholder="e.g. Hot lead" onChangeText={(label) => setDraft({ ...draft, label })} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {STATUS_COLOR_OPTIONS.map((color) => (
                  <Pressable key={color} accessibilityRole="radio" accessibilityState={{ checked: draft.color === color }} accessibilityLabel={color} onPress={() => setDraft({ ...draft, color })}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color, borderWidth: 3, borderColor: draft.color === color ? colors.textName : "transparent" }} />
                ))}
              </View>
            </> : null}
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Follow up</Text>
              {FOLLOW_UP_OPTIONS.map((option) => {
                const selected = Number(draft.follow_up_days) === option.days;
                return (
                  <Pressable key={option.days} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setDraft({ ...draft, follow_up_days: option.days })}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 46 }}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>{option.label}</Text>
                    {selected ? <AppIcon name="check" size={18} color={colors.textName} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <Button colors={colors} primary disabled={saving || (!draft.builtin_key && !draft.label.trim())} onPress={save}>{saving ? "Saving…" : "Save"}</Button>
            {draft.id && !draft.builtin_key ? <Button colors={colors} disabled={saving} onPress={remove}>Delete status</Button> : null}
          </ScrollView>
        ) : null}
      </BottomSheet>
    </View>
  );
}
