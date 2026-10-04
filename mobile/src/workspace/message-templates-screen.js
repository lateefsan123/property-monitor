import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { messageTemplatesOptions } from "./message-templates";
import MessageTemplateEditor from "./message-template-editor";
import { Feedback, Icon } from "./ui";
import { templateStatusLabels } from "../../../supabase/functions/_shared/template-status.js";

export default function MessageTemplatesScreen({ userId, colors }) {
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState("");
  const query = useQuery(messageTemplatesOptions(userId));
  const templates = query.data || [];
  const term = search.trim().toLocaleLowerCase();
  const filtered = templates.filter(template => `${template.name} ${template.content}`.toLocaleLowerCase().includes(term));
  const blue = colors.isDark ? "#6EA8FF" : "#1769E8";
  function openEditor(template) {
    setNotice("");
    setEditor({ template });
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.isDark ? colors.bg : colors.bgCard }}>
      <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 44, borderRadius: 22, backgroundColor: colors.isDark ? colors.bgHover : "#FAFAFA" }}>
        <Icon name="search" size={18} color={colors.textFaint} />
        <TextInput accessibilityLabel="Search templates" placeholder="Search…" placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" style={{ flex: 1, minHeight: 44, paddingHorizontal: 8, fontSize: 16, color: colors.textName }} />
        {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><Icon name="closeCircle" size={19} color={colors.textMuted} /></Pressable> : null}
      </View>
      {notice ? <Text accessibilityRole="alert" style={{ color: colors.badgeOkText, paddingHorizontal: 20, paddingVertical: 8 }}>{notice}</Text> : null}
      {query.isPending || (query.error && !query.data) ? <View style={{ padding: 20 }}><Feedback colors={colors} error={query.error} loading={query.isPending} onRetry={query.refetch} /></View> : (
        <FlatList
          data={filtered}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          keyExtractor={item => String(item.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}${item.is_default ? ", default template" : ""}`} onPress={() => openEditor(item)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 74, opacity: pressed ? 0.5 : 1 })}>
              <Icon name="tag" size={21} color={colors.textMuted} />
              <View style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text numberOfLines={1} style={{ flex: 1, color: colors.textName, fontSize: 15, fontWeight: "500" }}>{item.name}</Text>
                  {item.is_default || item.statuses?.length ? <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted, fontSize: 12 }}>{[...templateStatusLabels(item.statuses), item.is_default ? "Default" : null].filter(Boolean).join(" · ")}</Text> : null}
                </View>
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 13 }}>{item.content.replace(/\s+/g, " ").trim()}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingBottom: 60 }}>
            <Icon name={term ? "search" : "edit"} size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textName, fontSize: 22, fontWeight: "700", textAlign: "center" }}>{term ? "No templates found" : "No templates yet"}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 23, textAlign: "center" }}>{term ? "Try a different name or message." : "Is there a message you send frequently? Save it here for later."}</Text>
          </View>}
        />
      )}
      {!query.isPending && Boolean(query.data) ? <Pressable accessibilityRole="button" accessibilityLabel="New template" onPress={() => openEditor(null)} style={({ pressed }) => ({ position: "absolute", right: 20, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: blue, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.7 : 1, boxShadow: "0 3px 10px rgba(0,0,0,0.16)" })}><Icon name="plus" size={30} color="#FFFFFF" /></Pressable> : null}
      {editor ? <MessageTemplateEditor key={editor.template?.id || "new"} templates={templates} initial={editor.template} userId={userId} colors={colors} onClose={message => { setEditor(null); if (typeof message === "string") setNotice(message); }} /> : null}
    </View>
  );
}
