import { useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_MESSAGE_TEMPLATE } from "../features/seller-signal/insight-utils";
import {
  saveMessageTemplate,
  deleteMessageTemplate,
  MESSAGE_TEMPLATE_IMAGE_MAX_BYTES,
  MESSAGE_TEMPLATE_IMAGE_TYPES,
} from "./message-templates";
import BottomSheet from "../components/BottomSheet";
import { Button, Feedback, Icon } from "./ui";


export default function MessageTemplateEditor({ templates, initial, userId, colors, onClose }) {
  const client = useQueryClient();
  const selected = initial;
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
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [dirty, setDirty] = useState(false);
  function requestClose() {
    if (busy) return;
    Keyboard.dismiss();
    if (dirty) setSheet("discard");
    else onClose();
  }
  function openSheet(next) {
    Keyboard.dismiss();
    setSheet(next);
  }
  function closeSheet() {
    if (busy) return;
    setSheet(null);
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
    try {
      if (action === "delete") {
        await deleteMessageTemplate({ id: selected.id, userId });
      } else
        await saveMessageTemplate({
          id: selected?.id,
          userId,
          name,
          content,
          isDefault,
          imageFile: image,
          imagePath: selected?.image_path,
          removeImage,
        });
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["seller-signal", "message-templates", userId],
        }),
        client.invalidateQueries({
          queryKey: ["seller-signal", "message-template", userId],
        }),
      ]);
      onClose(action === "delete" ? "Template deleted." : "Template saved.");
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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={requestClose}>
      <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bgCard }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close editor" disabled={busy} onPress={requestClose} style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.bgCard, opacity: pressed || busy ? 0.5 : 1, boxShadow: "0 3px 16px rgba(0,0,0,0.04)" })}>
          <Icon name="close" size={26} color={colors.textName} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Save template" accessibilityState={{ disabled: busy || !name.trim() || !content.trim() }} disabled={busy || !name.trim() || !content.trim()} onPress={() => perform("save")} style={({ pressed }) => ({ minWidth: 60, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, opacity: busy || !name.trim() || !content.trim() ? 0.4 : pressed ? 0.6 : 1, boxShadow: "0 3px 16px rgba(0,0,0,0.04)" })}>
          <Text style={{ color: colors.isDark ? "#6EA8FF" : "#1769E8", fontSize: 15, fontWeight: "600" }}>{busy ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 18 }}>
        <View style={{ gap: 8, marginBottom: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 28, fontWeight: "700", letterSpacing: -0.7 }}>{selected ? "Edit template" : "Create a template"}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 23 }}>Save a message you send often for later.</Text>
        </View>
        <Feedback colors={colors} error={error} />
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
            style={{ color: colors.text, fontSize: 16, lineHeight: 25, minHeight: 100, padding: 0 }}
          />
        </View>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10 }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => openSheet("details")} style={{ minHeight: 44, flex: 1, justifyContent: "center" }}><Text style={{ color: colors.textMuted, fontSize: 14 }}>Insert details</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => openSheet("preview")} style={{ minHeight: 44, paddingLeft: 20, justifyContent: "center" }}><Text style={{ color: colors.isDark ? "#6EA8FF" : "#1769E8", fontSize: 14 }}>Preview</Text></Pressable>
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
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => openSheet("options")} style={{ flexDirection: "row", alignItems: "center", minHeight: 50, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>Options</Text>
          {isDefault ? <Text style={{ color: colors.textMuted, fontSize: 13, marginRight: 12 }}>Default</Text> : null}
          <Icon name="chevron" color={colors.textMuted} size={18} />
        </Pressable>
      </ScrollView>
      <BottomSheet visible={Boolean(sheet)} onClose={closeSheet} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>
          <Text style={{ color: colors.textName, fontSize: 21, fontWeight: "600" }}>
            {sheet === "preview" ? "Preview" : sheet === "discard" ? "Unsaved changes" : sheet === "delete" ? "Delete template?" : sheet === "details" ? "Insert details" : "Options"}
          </Text>
          {sheet === "details" ? <>
            <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>These are filled in for each seller when you send.</Text>
            {[["Seller name", "{{name}}"], ["Building", "{{building}}"], ["Sale details", "{{transactions}}"]].map(([label, token]) => (
              <Pressable key={token} accessibilityRole="button" accessibilityLabel={`Insert ${label.toLowerCase()}`} onPress={() => { setContent(previous => previous + token); setDirty(true); closeSheet(); }} style={{ minHeight: 48, justifyContent: "center" }}>
                <Text style={{ color: colors.textName, fontSize: 16 }}>{label}</Text>
              </Pressable>
            ))}
          </> : sheet === "options" ? <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Use by default</Text>
              <Switch accessibilityLabel="Use by default" value={isDefault} onValueChange={value => { setIsDefault(value); setDirty(true); }} />
            </View>
            {selected ? <Pressable accessibilityRole="button" onPress={() => setSheet("delete")} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.errorText, fontSize: 16 }}>Delete template</Text></Pressable> : null}
          </> : sheet === "preview" ? <>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Example using sample seller details.</Text>
            {imageUri ? <Image source={{ uri: imageUri }} accessibilityLabel="Message image preview" style={{ width: "100%", height: 210, borderRadius: 8 }} resizeMode="contain" /> : null}
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 25, backgroundColor: colors.isDark ? "#19392B" : "#E5F1E9", padding: 16, borderRadius: 16 }}>{preview}</Text>
          </> : sheet === "discard" ? <>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>Discard your unsaved changes?</Text>
            <Button colors={colors} primary onPress={closeSheet}>Keep editing</Button>
            <Button colors={colors} onPress={() => onClose()}>Discard changes</Button>
          </> : sheet === "delete" ? <>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>This permanently deletes {selected?.name || "this template"}.</Text>
            <Feedback colors={colors} error={error} />
            <Button colors={colors} disabled={busy} onPress={() => perform("delete")}>{busy ? "Deleting…" : "Delete template"}</Button>
            <Button colors={colors} primary disabled={busy} onPress={closeSheet}>Keep template</Button>
          </> : null}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
