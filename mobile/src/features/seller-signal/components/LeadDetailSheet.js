import SellerAvatar from './SellerAvatar';
import AppIcon from "../../../components/AppIcon";
import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { introAttachmentPath } from "../../../../../supabase/functions/_shared/intro-attachment.js";
import { resolveForLead } from "../../../../../supabase/functions/_shared/template-status.js";
import BottomSheet from "../../../components/BottomSheet";
import { formatBedsLabel, formatDate, formatPrice, formatRange } from "../formatters";
import { formatPhoneForWhatsApp } from "../insight-utils";
import { leadInsightMessage } from "../../../workspace/lead-insights";
import { formatBuildingLabel } from "../lead-utils";
import { Badge } from "./LeadCard";
import SellerFollowUpControl from './seller-follow-up-control';
import { pickSellerImage } from '../seller-contact';
import SellerMessageHistory from "./SellerMessageHistory";

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

function EditForm({ colors, draft, onChange }) {
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


    </View>
  );
}

function EditActions({ colors: c, isDeleting, isSaving, onCancel, onDelete, onSave }) {
  const busy = isSaving || isDeleting;
  return (
    <View style={[s.actionBar, { borderTopColor: c.border, paddingBottom: 16, gap: 8 }]}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={[s.secondaryAction, { flex: 1, borderColor: c.border, opacity: busy ? 0.5 : 1 }]}>
          <Text style={{ color: c.textSecondary, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onSave} style={[s.primaryAction, { flex: 1, backgroundColor: c.btnPrimaryBg, opacity: busy ? 0.5 : 1 }]}>
          <Text style={{ color: c.btnPrimaryText, fontWeight: "700" }}>{isSaving ? "Saving..." : "Save changes"}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onDelete} style={{ minHeight: 44, alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1 }}>
        <Text style={{ color: c.errorText, fontWeight: "600" }}>{isDeleting ? "Deleting..." : "Delete seller"}</Text>
      </Pressable>
    </View>
  );
}

export default function LeadDetailSheet({
  userId,
  whatsappAccountId,
  visible,
  onClose,
  lead,
  messageTemplate,
  messageTemplateImagePath,
  messageTemplateImageUrl,
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
  onSaveMessage,
  onSaveFollowUp,
  onSendWhatsApp,
  onStartEditing,
  onHandoff,
  onUpdateStatus,
  whatsappConnected,
  colors,
  initialTab = null,
}) {
  const [draftMessage, setDraftMessage] = useState(null);
  const [savingMessage, setSavingMessage] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState(initialTab || "Details");
  const [statusOpen, setStatusOpen] = useState(false);
  const c = colors;
  const leadId = lead?.id ?? null;
  const leadNotes = lead?.notes || "";
  const [notesDraft, setNotesDraft] = useState({ leadId: null, value: "" });
  const [imageIncluded, setImageIncluded] = useState(true);
  const [customImage, setCustomImage] = useState(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState('');
  const messageBusyRef = useRef(false);
  const notesTimerRef = useRef(null);
  const notesValue = notesDraft.leadId === leadId ? notesDraft.value : leadNotes;

  useEffect(() => () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
  }, []);

  if (!lead) return null;

  const baseMessage = leadInsightMessage(lead, insight, messageTemplate);
  const message = draftMessage ?? lead.message_draft ?? baseMessage;
  async function saveMessage(value) {
    setSavingMessage(true); setSaveError(""); setSaveStatus("");
    try { await onSaveMessage(lead.id, value); setDraftMessage(null); setSaveStatus(value === null ? "Template restored" : "Message saved"); }
    catch (error) { setSaveError(error.message || "Could not save. Try again."); }
    finally { setSavingMessage(false); }
  }
  const followUp = Boolean(isSent || lead.sentAt || lead.sent_at);
  // The template for this seller's status (or the default) supplies the image.
  const templateImagePath = resolveForLead(messageTemplateImagePath, lead);
  const templateImageUrl = resolveForLead(messageTemplateImageUrl, lead);
  const selectedImagePath = introAttachmentPath(templateImagePath, lead, isSent, imageIncluded);

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

  async function handleWhatsApp() {
    if (messageBusyRef.current) return;
    if (!whatsappPhone) return;
    if (customImage && !whatsappConnected) { setMessageError('Reconnect WhatsApp to send the selected image.'); return; }
    if (whatsappConnected) {
      messageBusyRef.current = true;
      setMessageBusy(true);
      setMessageError('');
      try {
        const sent = await onSendWhatsApp?.(lead.id, { imagePath: selectedImagePath, customImage, message });
        if (sent) { setCustomImage(null); setImageIncluded(false); }
        else setMessageError('Message was not sent. Your image is still selected; check the send error and try again.');
      } catch (failure) { setMessageError(failure.message || 'Could not send this message. Your image is still selected.'); }
      finally { messageBusyRef.current = false; setMessageBusy(false); }
      return;
    }
    Linking.openURL(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`);
    onHandoff?.(lead.id);
  }

  async function chooseImage() {
    if (messageBusyRef.current) return;
    messageBusyRef.current = true;
    setMessageBusy(true);
    setMessageError('');
    try {
      const image = await pickSellerImage();
      if (image) setCustomImage(image);
    } catch (failure) { setMessageError(failure.message || 'Could not choose that image.'); }
    finally { messageBusyRef.current = false; setMessageBusy(false); }
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
    <BottomSheet visible={visible} onClose={() => { handleNotesBlur(); onClose(); }} colors={colors}>
      <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {isEditing ? <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>Edit seller</Text> : <View style={s.profileHeader}>
          <SellerAvatar key={`${userId}:${whatsappAccountId}:${lead.id}`} userId={userId} accountId={whatsappAccountId} lead={lead} visible={visible} colors={c} />
          <Text style={{ fontSize: 22, fontWeight: "700", color: c.textName, textAlign: "center" }}>{lead.name || "Unnamed seller"}</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center" }}>{formatBuildingLabel(lead.resolvedBuilding || lead.building) || "No building"}</Text>
          {!isEditing && <Pressable accessibilityRole="button" onPress={() => onStartEditing?.(lead.id)} disabled={isSaving || isDeleting} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: c.text, fontWeight: "600" }}>Edit seller</Text></Pressable>}
        </View>}
        {!isEditing && <View accessibilityRole="tablist" style={[s.tabs, { backgroundColor: c.bgBadge }]}>{["Details", "Notes", "Message", "History"].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => { handleNotesBlur(); setTab(value); }} style={[s.tab, tab === value && { backgroundColor: c.bgCard }]}><Text style={{ color: tab === value ? c.text : c.textMuted, fontWeight: "600" }}>{value}</Text></Pressable>)}</View>}

        {isEditing ? (
          <EditForm
            colors={c}
            draft={editDraft}
            onChange={onEditFieldChange}
          />
        ) : (
          <>
            {tab === "Details" && <View style={{ gap: 20 }}>
              <View style={[s.infoGroup, { backgroundColor: c.bgMsg }]}>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>Phone</Text>
                <Text selectable style={{ color: c.text, fontSize: 16 }}>{lead.phone || "No phone number"}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>Property</Text>
                <Text style={{ color: c.text, fontSize: 15 }}>{[lead.bedroom, lead.unit ? `Unit ${lead.unit}` : null].filter(Boolean).join(" / ") || "No property details"}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>Last contact</Text>
                <Text style={{ color: c.text, fontSize: 15 }}>{formatDate(lead.lastContactDate) || "Not contacted yet"}</Text>
              </View>
            <View style={s.statusSection}>
              <Pressable accessibilityRole="button" accessibilityLabel="Change seller status" accessibilityState={{ expanded: statusOpen }} onPress={() => setStatusOpen(value => !value)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
                <Text style={{ color: c.text, fontSize: 15 }}>Status</Text><View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Badge label={lead.statusLabel || "No status"} statusId={lead.statusRule?.id} colors={c} /><AppIcon name="chevron" size={16} color={c.textMuted} /></View>
              </Pressable>
              {statusOpen && <View style={s.statusRow}>
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
                      onPress={() => { onUpdateStatus?.(lead.id, option.value); setStatusOpen(false); }}
                    >
                      <Text style={{ color: isActive ? c.tabActiveText : c.textMuted, fontSize: 13, fontWeight: "600" }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>}
            </View>

            {onSaveFollowUp ? <SellerFollowUpControl lead={lead} colors={c} onSave={onSaveFollowUp} /> : null}

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
            {insight?.status === "error" && insight.error !== "Property market data is not available yet." && <Text style={{ fontSize: 14, color: c.errorText }}>{insight.error}</Text>}

            </View>}

            {tab === "Notes" && <View style={{ gap: 6 }}>
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
                  minHeight: 160,
                  textAlignVertical: "top",
                }}
                placeholder="Add a note about this seller..."
                placeholderTextColor={c.textFaint}
                value={notesValue}
                onChangeText={handleNotesChange}
                onBlur={handleNotesBlur}
                multiline
              />
            </View>}

            {tab === "History" && <SellerMessageHistory userId={userId} lead={lead} colors={c} />}

            {tab === "Message" && <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MessageIcon size={13} color={c.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, letterSpacing: 0.5 }}>MESSAGE</Text>
              </View>
              <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {customImage?.uri || (selectedImagePath && templateImageUrl) ? <Image accessibilityLabel="Message attachment preview" source={{ uri: customImage?.uri || templateImageUrl }} resizeMode="contain" style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: c.bgInput }} /> : null}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{customImage || selectedImagePath ? 'Message image' : 'Add an image'}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, lineHeight: 18 }}>{customImage ? 'For this seller’s next message only' : selectedImagePath ? 'Using your template image' : 'Optional · for this message only'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable accessibilityRole="button" disabled={messageBusy} onPress={chooseImage} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: c.bgBadge, opacity: messageBusy ? 0.45 : 1 }}><Text style={{ color: c.text, fontWeight: '600' }}>{messageBusy ? 'Please wait…' : customImage || selectedImagePath ? 'Change image' : 'Add image'}</Text></Pressable>
                  {customImage || selectedImagePath ? <Pressable accessibilityRole="button" disabled={messageBusy} onPress={() => { setCustomImage(null); setImageIncluded(false); setMessageError(''); }} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', opacity: messageBusy ? 0.45 : 1 }}><Text style={{ color: c.errorText }}>Remove image</Text></Pressable> : null}
                </View>
                {templateImagePath && !followUp && (customImage || !imageIncluded) ? <Pressable accessibilityRole="button" disabled={messageBusy} onPress={() => { setCustomImage(null); setImageIncluded(true); setMessageError(''); }} style={{ minHeight: 44, justifyContent: 'center', opacity: messageBusy ? 0.45 : 1 }}><Text style={{ color: c.textMuted, textAlign: 'center' }}>Use template image</Text></Pressable> : null}
                {!whatsappConnected ? <Text style={{ color: c.textMuted, fontSize: 12 }}>Connect WhatsApp to send image attachments.</Text> : null}
              </View>
              {messageError ? <Text accessibilityRole="alert" style={{ color: c.errorText }}>{messageError}</Text> : null}
              <TextInput accessibilityLabel="Seller message" multiline editable={!savingMessage} value={message} onChangeText={value => { setDraftMessage(value); setSaveStatus(""); }} style={{ fontSize: 14, color: c.text, lineHeight: 20, backgroundColor: c.bgMsg, padding: 12, borderRadius: 10, minHeight: 160, textAlignVertical: "top" }} />
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Saved for this seller’s manual messages. Templates stay unchanged.</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable accessibilityRole="button" disabled={savingMessage || !message.trim()} onPress={() => saveMessage(message)} style={{ padding: 14, borderRadius: 12, backgroundColor: c.btnPrimaryBg, opacity: savingMessage || !message.trim() ? 0.5 : 1 }}><Text style={{ color: c.btnPrimaryText, fontWeight: "600" }}>{savingMessage ? "Saving…" : "Save message"}</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={savingMessage} onPress={() => saveMessage(null)} style={{ padding: 14 }}><Text style={{ color: c.textMuted }}>Use template</Text></Pressable>
              </View>
              {saveStatus ? <Text accessibilityLiveRegion="polite" style={{ color: c.textMuted }}>{saveStatus}</Text> : null}
              {saveError ? <Text accessibilityRole="alert" style={{ color: c.errorText }}>{saveError}</Text> : null}
            </View>}
          </>
        )}
      </ScrollView>

      {isEditing ? <EditActions colors={c} isDeleting={isDeleting} isSaving={isSaving} onCancel={onCancelEditing} onDelete={handleDelete} onSave={() => onSaveEdit?.(lead.id)} /> : (
        <View style={[s.actionBar, { paddingBottom: 16, borderTopColor: c.border }]}>
          {tab !== "Message" ? <Pressable accessibilityRole="button" onPress={() => { handleNotesBlur(); setTab("Message"); }} style={[s.actionBtn, { backgroundColor: c.btnPrimaryBg }]}><MessageIcon size={18} color={c.btnPrimaryText} /><Text style={{ color: c.btnPrimaryText, fontWeight: "600", fontSize: 15 }}>Preview message</Text></Pressable> : whatsappPhone ? (
            <Pressable accessibilityRole="button" disabled={messageBusy} onPress={handleWhatsApp} style={[s.actionBtn, { backgroundColor: c.whatsappBg, opacity: messageBusy ? 0.5 : 1 }]}>
              {isSent ? <CheckIcon size={18} color={c.whatsappText} /> : <WhatsAppIcon size={18} color={c.whatsappText} />}
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.whatsappText }}>{messageBusy ? 'Please wait…' : isSent ? "Send follow-up" : "Send via WhatsApp"}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => onCopyMessage(lead.id, message)} style={[s.actionBtn, { borderWidth: 1, borderColor: c.border }]}>
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
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  profileHeader: { alignItems: "center", gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  tabs: { flexDirection: "row", padding: 4, borderRadius: 12 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 40, borderRadius: 9 },
  infoGroup: { padding: 16, borderRadius: 14, gap: 5 },
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
