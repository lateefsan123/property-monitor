import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { Button } from "./ui";
import { fetchSetupStatus, nextSetupAction, setupChecklistQueryKey } from "../../../shared/setup-checklist.js";

// Mobile copy of web's SetupNextAction: turns an empty state into the next
// setup step (import sellers, then connect WhatsApp), or nothing once done.
export function openSetupAction(action, onNavigate) {
  if (action.id === "import") onNavigate("spreadsheets", { add: true });
  else onNavigate("settings", { section: "WhatsApp" });
}

export default function SetupNextAction({ userId, colors, onNavigate, showHint = true, align = "flex-start" }) {
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    staleTime: 30 * 1000,
  });
  const action = nextSetupAction(status.data);
  if (!action || !onNavigate) return null;
  return (
    <View style={{ gap: 12, alignItems: align, marginTop: 4 }}>
      {showHint ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: align === "center" ? "center" : "left" }}>{action.hint}</Text> : null}
      <Button colors={colors} primary onPress={() => openSetupAction(action, onNavigate)} style={{ paddingHorizontal: 18, borderRadius: 22 }}>{action.label}</Button>
    </View>
  );
}
