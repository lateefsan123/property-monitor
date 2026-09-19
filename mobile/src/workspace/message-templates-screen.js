import { useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_MESSAGE_TEMPLATE } from "../features/seller-signal/insight-utils";
import {
  fetchMessageTemplates,
  saveMessageTemplate,
  deleteMessageTemplate,
  MESSAGE_TEMPLATE_IMAGE_MAX_BYTES,
  MESSAGE_TEMPLATE_IMAGE_TYPES,
} from "./message-templates";
import BottomSheet from "../components/BottomSheet";
import { Button, Feedback, Icon } from "./ui";

function Editor({ templates, initial, userId, colors }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState(initial || null);
  const [name, setName] = useState(initial?.name || "Transaction update");
  const [content, setContent] = useState(
    initial?.content || DEFAULT_MESSAGE_TEMPLATE,
  );
  const [isDefault, setIsDefault] = useState(
    initial?.is_default || templates.length === 0,
  );
  const [image, setImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(undefined);
  function select(template) {
    setSelected(template);
    setName(template?.name || "Transaction update");
    setContent(template?.content || DEFAULT_MESSAGE_TEMPLATE);
    setIsDefault(template?.is_default || false);
    setImage(null);
    setRemoveImage(false);
    setNotice("");
    setError(null);
    setDirty(false);
    setSheet(null);
  }
  function requestSelection(template) {
    if (template?.id && template.id === selected?.id) {
      setSheet(null);
      return;
    }
    if (dirty) {
      setPendingSelection(template);
      setSheet("discard");
    } else select(template);
  }
  function openSheet(next) {
    Keyboard.dismiss();
    setSheet(next);
  }
  function closeSheet() {
    if (busy) return;
    setSheet(null);
    setPendingSelection(undefined);
  }
  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!MESSAGE_TEMPLATE_IMAGE_TYPES.includes(asset.mimeType))
        throw new Error("Choose a JPG, PNG, or WebP image.");
      const bytes =
        Platform.OS === "web" && asset.file
          ? await asset.file.arrayBuffer()
          : await new File(asset.uri).arrayBuffer();
      if (bytes.byteLength > MESSAGE_TEMPLATE_IMAGE_MAX_BYTES)
        throw new Error("Template images must be 5 MB or smaller.");
      setImage({
        uri: asset.uri,
        type: asset.mimeType,
        size: bytes.byteLength,
        uploadBody: bytes,
      });
      setRemoveImage(false);
      setDirty(true);
    } catch (failure) {
      setError(failure);
    }
  }
  async function perform(action) {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      let saved;
      if (action === "delete") {
        await deleteMessageTemplate({ id: selected.id, userId });
        select(null);
      } else
        saved = await saveMessageTemplate({
          id: selected?.id,
          userId,
          name,
          content,
          isDefault,
          imageFile: image,
          imagePath: selected?.image_path,
          removeImage,
        });
      if (saved) select(saved);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["seller-signal", "message-templates", userId],
        }),
        client.invalidateQueries({
          queryKey: ["seller-signal", "message-template", userId],
        }),
      ]);
      setNotice(action === "delete" ? "Template deleted." : "Template saved.");
      setDirty(false);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const preview = content
    .replaceAll("{{name}}", "Alex")
    .replaceAll("{{building}}", "St. Regis Residences")
    .replaceAll(
      "{{transactions}}",
      "- St. Regis Residences | 2 Bed | AED 4.95M | 1,410 sqft\n- St. Regis Residences | 1 Bed | AED 3.15M | 910 sqft",
    );
  const imageUri = image?.uri || (!removeImage && selected?.image_url);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 22, gap: 24, paddingBottom: 28 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose template, ${selected?.name || "New template"}`}
          disabled={busy}
          onPress={() => openSheet("templates")}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, opacity: pressed ? 0.6 : 1 })}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Template</Text>
            <Text numberOfLines={1} style={{ color: colors.textName, fontSize: 18, fontWeight: "600" }}>{selected?.name || "New template"}</Text>
          </View>
          <Icon name="chevron" color={colors.textMuted} size={19} />
        </Pressable>
        <Feedback colors={colors} error={error} />
        {notice ? <Text accessibilityRole="alert" style={{ color: colors.badgeOkText }}>{notice}</Text> : null}
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Name</Text>
          <TextInput
            accessibilityLabel="Template name"
            value={name}
            editable={!busy}
            placeholder="Template name"
            placeholderTextColor={colors.textFaint}
            onChangeText={(value) => { setName(value); setDirty(true); }}
            style={{ color: colors.textName, fontSize: 16, minHeight: 44, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}
          />
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Message</Text>
          <TextInput
            accessibilityLabel="Message"
            value={content}
            editable={!busy}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            placeholder="Write your message…"
            placeholderTextColor={colors.textFaint}
            onChangeText={(value) => { setContent(value); setDirty(true); }}
            style={{ color: colors.text, fontSize: 16, lineHeight: 25, minHeight: 190, padding: 0 }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 2 }}>Insert</Text>
            {[["Name", "{{name}}"], ["Building", "{{building}}"], ["Sale details", "{{transactions}}"]].map(([label, token]) => (
              <Pressable
                key={token}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${label.toLowerCase()}`}
                disabled={busy}
                onPress={() => { setContent((previous) => previous + token); setDirty(true); }}
                style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: colors.textName, fontSize: 13, fontWeight: "500" }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {imageUri ? <Image source={{ uri: imageUri }} accessibilityLabel="Template attachment" style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="cover" /> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={pickImage} style={{ minHeight: 44, justifyContent: "center", flex: 1 }}>
            <Text style={{ color: colors.textName, fontSize: 15 }}>{imageUri ? "Change image" : "+ Add image"}</Text>
          </Pressable>
          {imageUri ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setImage(null); setRemoveImage(true); setDirty(true); }} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Remove</Text>
          </Pressable> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <Text style={{ color: colors.text, fontSize: 15 }}>Use by default</Text>
          <Switch accessibilityLabel="Use by default" disabled={busy} value={isDefault} onValueChange={(value) => { setIsDefault(value); setDirty(true); }} />
        </View>
        {selected ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => openSheet("delete")} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={{ color: colors.errorText, fontSize: 14 }}>Delete template</Text>
        </Pressable> : null}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
        <Button colors={colors} style={{ flex: 1, minHeight: 48 }} onPress={() => openSheet("preview")} disabled={busy}>Preview</Button>
        <Button colors={colors} primary style={{ flex: 2, minHeight: 48 }} disabled={busy || !name.trim() || !content.trim()} onPress={() => perform("save")}>{busy ? "Saving…" : "Save template"}</Button>
      </View>
      <BottomSheet visible={Boolean(sheet)} onClose={closeSheet} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>
          <Text style={{ color: colors.textName, fontSize: 21, fontWeight: "600" }}>
            {sheet === "preview" ? "Preview" : sheet === "discard" ? "Unsaved changes" : sheet === "delete" ? "Delete template?" : "Choose template"}
          </Text>
          {sheet === "templates" ? <>
            <Pressable accessibilityRole="button" onPress={() => requestSelection(null)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Icon name="plus" color={colors.textName} />
              <Text style={{ color: colors.textName, fontSize: 16 }}>New template</Text>
            </Pressable>
            {templates.map((template) => <Pressable key={template.id} accessibilityRole="button" accessibilityState={{ selected: selected?.id === template.id }} onPress={() => requestSelection(template)} style={({ pressed }) => ({ minHeight: 54, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ flex: 1, color: colors.textName, fontSize: 16, fontWeight: selected?.id === template.id ? "600" : "400" }}>{template.name}</Text>
              {template.is_default ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>Default</Text> : null}
              <Icon name="chevron" color={colors.textMuted} size={17} />
            </Pressable>)}
          </> : sheet === "preview" ? <>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Example using sample seller details.</Text>
            {imageUri ? <Image source={{ uri: imageUri }} accessibilityLabel="Message image preview" style={{ width: "100%", height: 210, borderRadius: 8 }} resizeMode="contain" /> : null}
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 25, backgroundColor: colors.isDark ? "#19392B" : "#E5F1E9", padding: 16, borderRadius: 16 }}>{preview}</Text>
          </> : sheet === "discard" ? <>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>Discard your changes and switch templates?</Text>
            <Button colors={colors} primary onPress={closeSheet}>Keep editing</Button>
            <Button colors={colors} onPress={() => { select(pendingSelection); setPendingSelection(undefined); }}>Discard changes</Button>
          </> : sheet === "delete" ? <>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>This permanently deletes {selected?.name || "this template"}.</Text>
            <Feedback colors={colors} error={error} />
            <Button colors={colors} disabled={busy} onPress={() => perform("delete")}>{busy ? "Deleting…" : "Delete template"}</Button>
            <Button colors={colors} primary disabled={busy} onPress={closeSheet}>Keep template</Button>
          </> : null}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
export default function MessageTemplatesScreen({ userId, colors }) {
  const query = useQuery({
    queryKey: ["seller-signal", "message-templates", userId],
    queryFn: () => fetchMessageTemplates(userId),
    enabled: Boolean(userId),
  });
  if (query.isPending || query.error)
    return (
      <Feedback
        colors={colors}
        error={query.error}
        loading={query.isPending}
        onRetry={query.refetch}
      />
    );
  return (
    <Editor
      templates={query.data || []}
      initial={query.data?.[0]}
      userId={userId}
      colors={colors}
    />
  );
}
