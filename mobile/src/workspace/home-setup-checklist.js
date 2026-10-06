import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import AppIcon from "../components/AppIcon";
import { supabase } from "../supabase";
import { useWorkspacePreference } from "./preferences";
import { openSetupAction } from "./setup-next-action";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist.js";

// Mobile copy of web Home's "Get set up" card (src/features/home/HomeSetupChecklist.jsx):
// progress beside the title, one row per step that ticks itself off.
export default function HomeSetupChecklist({ userId, colors, active = true, onNavigate }) {
  const hidden = useWorkspacePreference(userId, "setup-checklist-hidden", false);
  const enabled = Boolean(userId) && !hidden.pending && !hidden.value;
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled,
    queryFn: () => fetchSetupStatus(supabase, userId),
  });
  const { refetch } = status;
  // Home stays mounted behind other pages; recheck when it comes back into view.
  useEffect(() => { if (active && enabled) refetch(); }, [active, enabled, refetch]);

  if (hidden.pending || hidden.value || !status.data) return null;
  const { steps, completed, total, allDone } = buildSetupSteps(status.data);
  if (allDone) return null;
  const nextId = steps.find((step) => !step.done)?.id;

  function open(step) {
    if (step.id === "first-message") onNavigate("sellers");
    else openSetupAction(step, onNavigate);
  }

  return (
    <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingTop: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 17, fontWeight: "600", letterSpacing: -0.3 }}>Get set up</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{completed}/{total} completed</Text>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: completed }}
            style={{ width: 64, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
            <View style={{ width: `${(completed / total) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: colors.textName }} />
          </View>
        </View>
      </View>
      <View style={{ marginTop: 6 }}>
        {steps.map((step, index) => (
          <Pressable key={step.id} accessibilityRole="button" accessibilityState={{ checked: step.done }} accessibilityLabel={`${step.title}${step.done ? ", done" : ""}`}
            onPress={() => open(step)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: index ? 1 : 0, borderTopColor: colors.borderLight, opacity: pressed ? 0.6 : 1 })}>
            <AppIcon name={step.done ? "checkCircleFilled" : "circle"} size={22} color={step.done ? colors.textName : colors.textMuted} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: step.done ? colors.textMuted : colors.textName, fontSize: 15, fontWeight: "600", textDecorationLine: step.done ? "line-through" : "none" }}>{step.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{step.text}</Text>
            </View>
            {step.id === nextId
              ? <View style={{ paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderRadius: 16, backgroundColor: colors.btnPrimaryBg }}>
                <Text style={{ color: colors.btnPrimaryText, fontSize: 13, fontWeight: "600" }}>{step.action}</Text>
              </View>
              : <AppIcon name="chevron" size={17} color={colors.textMuted} />}
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => hidden.set(true)} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Hide checklist</Text>
      </Pressable>
    </View>
  );
}
