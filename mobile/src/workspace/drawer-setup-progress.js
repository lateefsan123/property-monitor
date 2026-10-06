import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import AppIcon from "../components/AppIcon";
import { supabase } from "../supabase";
import { useWorkspacePreference } from "./preferences";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist.js";

// Mobile copy of web's sidebar block (src/features/home/SidebarSetupProgress.jsx),
// after HoneyBook's "Set up your account": stays until every step is done.
export default function DrawerSetupProgress({ userId, colors, onOpen }) {
  const hidden = useWorkspacePreference(userId, "setup-checklist-hidden", false);
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    staleTime: 30 * 1000,
  });
  if (!status.data) return null;
  const { completed, total, allDone } = buildSetupSteps(status.data);
  if (allDone) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Set up your account, ${completed} of ${total} completed`}
      onPress={() => { if (hidden.value) hidden.set(false); onOpen(); }}
      style={({ pressed }) => ({ marginHorizontal: 12, marginTop: 4, marginBottom: 4, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: pressed ? colors.bgBadge : "transparent" })}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: colors.textName, fontSize: 15, fontWeight: "600" }}>Set up your account</Text>
        <AppIcon name="chevron" size={16} color={colors.textName} />
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ width: `${(completed / total) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: "#4cc46f" }} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{completed}/{total} completed</Text>
    </Pressable>
  );
}
