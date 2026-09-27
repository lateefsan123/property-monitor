import AppIcon from "../../../components/AppIcon";
import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet from "../../../components/BottomSheet";
import { formatBedsLabel, formatDate, formatPrice, formatRange } from "../formatters";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../lead-utils";
import { Badge } from "./LeadCard";

const STATUS_ACTIONS = [
  { id: "prospect", label: "Prospect", value: "Prospect" },
  { id: "market_appraisal", label: "Appraisal", value: "Appraisal" },
  { id: "for_sale_available", label: "For Sale", value: "For Sale" },
];

const EDIT_STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
];

function HomeIcon({ size = 15, color }) {
  return (
    <AppIcon name="home" size={size} color={color} />
  );
}

function PhoneIcon({ size = 14, color }) {
  return (
    <AppIcon name="phone" size={size} color={color} />
  );
}

function MessageIcon({ size = 14, color }) {
  return (
    <AppIcon name="message" size={size} color={color} />
  );
}

function WhatsAppIcon({ size = 18, color }) {
  return (
    <AppIcon name="whatsapp" size={size} color={color} />
  );
}

function CopyIcon({ size = 18, color }) {
  return (
    <AppIcon name="copy" size={size} color={color} />
  );
}

function CheckIcon({ size = 18, color }) {
  return (
    <AppIcon name="check" size={size} color={color} />
  );
}

function getEditStatusOptions(currentStatus) {
  if (!currentStatus || EDIT_STATUS_OPTIONS.some((option) => option.value === currentStatus)) {
    return EDIT_STATUS_OPTIONS;
  }

  return [
    EDIT_STATUS_OPTIONS[0],
    { value: currentStatus, label: `${currentStatus} (Current)` },
    ...EDIT_STATUS_OPTIONS.slice(1),
  ];
}

function MetaText({ colors, lead }) {
  const parts = [lead.bedroom, formatDate(lead.lastContactDate)].filter(Boolean);
  if (!parts.length) return null;
  return <Text style={{ fontSize: 14, color: colors.textFaint, marginTop: 2 }}>{parts.join(" | ")}</Text>;
}

function EditForm({ colors, draft, isDeleting, isSaving, onCancel, onChange, onDelete, onSave }) {
  const c = colors;
  const statusOptions = getEditStatusOptions(draft?.status);

  return (
    <View style={s.formSection}>
      <View style={s.formField}>
        <Text style={[s.formLabel, { color: c.textMuted }]}>Name</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
          placeholder="Seller name"
          placeholderTextColor={c.textFaint}
          value={draft?.name || ""}
          onChangeText={(value) => onChange?.("name", value)}
        />
      </View>

      <View style={s.formField}>
        <Text style={[s.formLabel, { color: c.textMuted }]}>Building</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
          placeholder="Building name"
          placeholderTextColor={c.textFaint}
          value={draft?.building || ""}
          onChangeText={(value) => onChange?.("building", value)}
        />
      </View>

      <View style={s.formField}>
        <Text style={[s.formLabel, { color: c.textMuted }]}>Phone</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
          placeholder="+971..."
          placeholderTextColor={c.textFaint}
          value={draft?.phone || ""}
          keyboardType="phone-pad"
          onChangeText={(value) => onChange?.("phone", value)}
        />
      </View>

      <View style={s.formRow}>
        <View style={[s.formField, s.formHalf]}>
          <Text style={[s.formLabel, { color: c.textMuted }]}>Bedroom</Text>
          <TextInput
            style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
            placeholder="2BR"
            placeholderTextColor={c.textFaint}
            value={draft?.bedroom || ""}
            onChangeText={(value) => onChange?.("bedroom", value)}
          />
        </View>

        <View style={[s.formField, s.formHalf]}>
          <Text style={[s.formLabel, { color: c.textMuted }]}>Unit</Text>
          <TextInput
            style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
            placeholder="1203"
            placeholderTextColor={c.textFaint}
            value={draft?.unit || ""}
            onChangeText={(value) => onChange?.("unit", value)}
          />
        </View>
      </View>

      <View style={s.formField}>
        <Text style={[s.formLabel, { color: c.textMuted }]}>Status</Text>
        <View style={s.statusRow}>
          {statusOptions.map((option) => {
            const active = (draft?.status || "") === option.value;
            return (
              <Pressable
                key={option.label}
                style={[
                  s.statusChip,
                  {
                    backgroundColor: active ? c.tabActiveBg : c.bgBadge,
                  },
                ]}
                onPress={() => onChange?.("status", option.value)}
              >
                <Text style={{ color: active ? c.tabActiveText : c.textMuted, fontSize: 13, fontWeight: "600" }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.formField}>
        <Text style={[s.formLabel, { color: c.textMuted }]}>Last contact</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.textFaint}
          value={draft?.lastContact || ""}
          autoCapitalize="none"
          onChangeText={(value) => onChange?.("lastContact", value)}
        />
      </View>

      <View style={s.editActions}>
        <Pressable
          style={[s.primaryAction, { backgroundColor: c.btnPrimaryBg, opacity: isSaving || isDeleting ? 0.6 : 1 }]}
          disabled={isSaving || isDeleting}
          onPress={() => onSave?.()}
        >
          <Text style={{ color: c.btnPrimaryText, fontSize: 14, fontWeight: "700" }}>
            {isSaving ? "Saving..." : "Save"}
          </Text>
        </Pressable>

        <Pressable
          style={[s.secondaryAction, { borderColor: c.border, opacity: isSaving || isDeleting ? 0.6 : 1 }]}
          disabled={isSaving || isDeleting}
          onPress={onCancel}
        >
          <Text style={{ color: c.textSecondary, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[s.secondaryAction, { borderColor: c.errorBorder || c.border, backgroundColor: c.errorBg, opacity: isSaving || isDeleting ? 0.6 : 1 }]}
          disabled={isSaving || isDeleting}
          onPress={onDelete}
        >
          <Text style={{ color: c.errorText, fontSize: 14, fontWeight: "700" }}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LeadDetailSheet({
  visible,
  onClose,
  lead,
  messageTemplate,
  insight,
  editDraft,
  isDeleting,
  isEditing,
  isSaving,
  isSent,
  copiedLeadId,
  onCancelEditing,
  onCopyMessage,
  onDelete,
  onEditFieldChange,
  onSaveEdit,
  onSaveNotes,
  onSendWhatsApp,
  onStartEditing,
  onToggleSent,
  onUpdateStatus,
  whatsappConnected,
  colors,
}) {
  const insets = useSafeAreaInsets();
  const c = colors;
  const leadId = lead?.id ?? null;
  const leadNotes = lead?.notes || "";
  const [notesDraft, setNotesDraft] = useState({ leadId: null, value: "" });
  const notesTimerRef = useRef(null);
  const notesValue = notesDraft.leadId === leadId ? notesDraft.value : leadNotes;

  useEffect(() => () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
  }, []);

  if (!lead) return null;

  const message = insight?.message || buildMessage(lead, insight, messageTemplate);

  function handleNotesChange(text) {
    setNotesDraft({ leadId, value: text });
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onSaveNotes?.(lead.id, text);
    }, 1000);
  }

  function handleNotesBlur() {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    if (notesValue !== (lead.notes || "")) {
      onSaveNotes?.(lead.id, notesValue);
    }
  }
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);

  function handleWhatsApp() {
    if (!whatsappPhone) return;
    if (whatsappConnected) {
      void onSendWhatsApp?.(lead.id);
      return;
    }
    Linking.openURL(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`);
    if (!isSent) void onToggleSent(lead.id);
  }

  function handleDelete() {
    const label = lead.name || lead.building || "this seller";
    Alert.alert(
      "Delete seller?",
      `Delete ${label}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void onDelete?.(lead.id);
          },
        },
      ],
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} colors={colors}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: c.textName }}>{lead.name || "Unnamed"}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
          <HomeIcon size={15} color={c.textMuted} />
          <Text style={{ fontSize: 15, color: c.textMuted }}>{formatBuildingLabel(lead.building) || "-"}</Text>
        </View>

        {lead.phone && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
            <PhoneIcon size={14} color={c.textFaint} />
            <Text style={{ fontSize: 14, color: c.textFaint }}>{lead.phone}</Text>
          </View>
        )}

        <MetaText colors={c} lead={lead} />

        <View style={s.badges}>
          <Badge label={lead.statusLabel} statusId={lead.statusRule?.id} colors={c} />
          <Badge label={lead.dueLabel} type={lead.isDue ? "due" : "ok"} colors={c} />
          {insight?.status === "ready" && <Badge label="Enriched" type="ok" colors={c} />}
          {lead.newTxSinceSent > 0 && <Badge label={`${lead.newTxSinceSent} new txns`} type="due" colors={c} />}
        </View>

        {isEditing ? (
          <EditForm
            colors={c}
            draft={editDraft}
            isDeleting={isDeleting}
            isSaving={isSaving}
            onCancel={onCancelEditing}
            onChange={onEditFieldChange}
            onDelete={handleDelete}
            onSave={() => onSaveEdit?.(lead.id)}
          />
        ) : (
          <>
            <View style={s.inlineActions}>
              <Pressable
                style={[s.secondaryAction, { borderColor: c.border, opacity: isSaving || isDeleting ? 0.6 : 1 }]}
                disabled={isSaving || isDeleting}
                onPress={() => onStartEditing?.(lead.id)}
              >
                <Text style={{ color: c.textSecondary, fontSize: 14, fontWeight: "600" }}>Edit</Text>
              </Pressable>
              <Pressable
                style={[s.secondaryAction, { borderColor: c.errorBorder || c.border, backgroundColor: c.errorBg, opacity: isSaving || isDeleting ? 0.6 : 1 }]}
                disabled={isSaving || isDeleting}
                onPress={handleDelete}
              >
                <Text style={{ color: c.errorText, fontSize: 14, fontWeight: "700" }}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>

            <View style={s.statusSection}>
              <Text style={[s.formLabel, { color: c.textMuted }]}>Status</Text>
              <View style={s.statusRow}>
                {STATUS_ACTIONS.map((option) => {
                  const isActive = lead.statusRule?.id === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        s.statusChip,
                        { backgroundColor: isActive ? c.tabActiveBg : c.bgBadge, opacity: isSaving || isDeleting ? 0.6 : 1 },
                      ]}
                      disabled={isActive || isSaving || isDeleting}
                      onPress={() => onUpdateStatus?.(lead.id, option.value)}
                    >
                      <Text style={{ color: isActive ? c.tabActiveText : c.textMuted, fontSize: 13, fontWeight: "600" }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {insight?.status === "ready" && insight.recentTransactions?.length > 0 && (
              <View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 6 }}>
                  Sales in {insight.locationName || lead.building}
                </Text>
                {insight.recentTransactions.map((tx) => (
                  <View key={tx.id} style={s.txRow}>
                    <Text style={{ width: 78, fontSize: 13, color: c.textMuted }}>{formatDate(tx.date)}</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: c.textSecondary }} numberOfLines={1}>{tx.locationLabel}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>{formatPrice(tx.price)}</Text>
                    <Text style={{ width: 44, fontSize: 13, color: c.textMuted, textAlign: "right" }}>{formatBedsLabel(tx.beds)}</Text>
                  </View>
                ))}
                <Text style={{ fontSize: 13, color: c.textFaint, marginTop: 4 }}>{formatRange(insight.min, insight.max)}</Text>
              </View>
            )}

            {insight?.status === "ready" && !insight.recentTransactions?.length && (
              <Text style={{ fontSize: 14, color: c.textMuted }}>No priced sales found in this period.</Text>
            )}
            {insight?.status === "loading" && <Text style={{ fontSize: 14, color: c.textFainter }}>Loading market data...</Text>}
            {insight?.status === "error" && <Text style={{ fontSize: 14, color: c.errorText }}>{insight.error}</Text>}

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textFaint, letterSpacing: 0.5 }}>NOTES</Text>
              <TextInput
                style={{
                  fontSize: 14,
                  color: c.text,
                  lineHeight: 20,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 12,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
                placeholder="Add notes about this lead..."
                placeholderTextColor={c.textFaint}
                value={notesValue}
                onChangeText={handleNotesChange}
                onBlur={handleNotesBlur}
                multiline
              />
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MessageIcon size={13} color={c.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, letterSpacing: 0.5 }}>MESSAGE</Text>
              </View>
              <Text style={{ fontSize: 14, color: c.text, lineHeight: 20, backgroundColor: c.bgMsg, padding: 12, borderRadius: 10 }}>{message}</Text>
            </View>
          </>
        )}
      </ScrollView>

      {!isEditing && (
        <View style={[s.actionBar, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: c.border }]}>
          {whatsappPhone ? (
            <Pressable onPress={handleWhatsApp} style={[s.actionBtn, { backgroundColor: c.whatsappBg }]}>
              {isSent ? <CheckIcon size={18} color={c.whatsappText} /> : <WhatsAppIcon size={18} color={c.whatsappText} />}
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.whatsappText }}>{isSent ? "Sent" : "Send via WhatsApp"}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => onCopyMessage(lead.id, message)} style={[s.actionBtn, { borderWidth: 1, borderColor: c.border }]}>
              {copiedLeadId === lead.id ? <CheckIcon size={18} color={c.textSecondary} /> : <CopyIcon size={18} color={c.textSecondary} />}
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.textSecondary }}>{copiedLeadId === lead.id ? "Copied!" : "Copy Message"}</Text>
            </Pressable>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statusSection: {
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 8,
  },
  formSection: {
    gap: 12,
    marginTop: 4,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formField: {
    gap: 6,
  },
  formHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  editActions: {
    gap: 10,
    marginTop: 4,
  },
  primaryAction: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
