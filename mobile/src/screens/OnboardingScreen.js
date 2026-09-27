import AppIcon from "../components/AppIcon";
import { useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#000";

const SLIDES = [
  {
    key: "welcome",
    title: "Your Dubai owner CRM",
    body: "Repeat AI helps you track confirmed property owners, organize them by readiness to sell, and send recurring market updates that keep you top of mind.",
  },
  {
    key: "how-it-works",
    title: "One system for every owner",
    body: "Every owner receives market updates. The categories simply show how close they are to selling, so you know how to follow up and how urgently to act.",
    labels: ["Prospects", "Market Appraisals", "For Sale Available"],
  },
  {
    key: "prospects",
    title: "Prospects",
    body: "Confirmed owners who are not looking to sell yet.",
    support: "These are long-term nurture contacts. You stay relevant with recurring building and unit-specific market updates until timing changes.",
    goal: "Goal: turn passive owners into future sellers.",
  },
  {
    key: "market-appraisals",
    title: "Market Appraisals",
    body: "Owners who are likely to come to market soon.",
    support: "They are warmer than prospects and need stronger pricing context, sharper market updates, and closer follow-up.",
    goal: "Goal: position yourself before they fully decide to sell.",
  },
  {
    key: "for-sale",
    title: "For Sale Available",
    body: "Owners actively looking to sell.",
    support: "This is the hottest category. They still receive updates, but speed matters more because the focus is now conversion.",
    goal: "Goal: win the listing.",
  },
  {
    key: "what-you-send",
    title: "Market updates built for each owner",
    body: "Repeat AI helps you send a relevant market report for the owner's unit or building.",
    bullets: [
      "Recent building transactions",
      "Price movement",
      "Market context",
      "A WhatsApp-ready update",
    ],
    support: "This is how you stay consistent and become the area specialist they trust.",
  },
  {
    key: "listing-alerts",
    title: "Track building listings & price drops",
    body: "See every active listing in a building, track price changes over time, and spot motivated sellers when prices drop.",
    bullets: [
      "Browse listings by building",
      "Price drop alerts at a glance",
      "Full price history per unit",
      "Filter to see only price drops",
    ],
    support: "When an owner sees their neighbours dropping prices, it changes the conversation. Use this to bring real proof to your follow-ups.",
  },
  {
    key: "import-sheet",
    title: "Import your owners",
    body: "Your owners already live in WhatsApp and your spreadsheet. Paste your Google Sheet and Repeat AI will organize them by category and prepare them for follow-up.",
    fields: ["name", "phone", "building", "unit", "status", "last contact", "notes"],
  },
  {
    key: "daily-workflow",
    title: "How you use it every day",
    body: "Review owners by category, open their record, check the market update, send the WhatsApp message, and keep nurturing until they are ready to sell.",
    steps: [
      "Check category",
      "Review market update",
      "Send follow-up",
      "Mark progress",
    ],
  },
  {
    key: "reports",
    title: "Stay consistent with follow-up",
    body: "Everyone gets updates. The category changes the urgency.",
    settings: [
      { label: "Prospects", desc: "Recurring nurture" },
      { label: "Market Appraisals", desc: "Closer follow-up" },
      { label: "For Sale Available", desc: "Fastest action" },
    ],
  },
];

const TOTAL_SLIDES = SLIDES.length;

function SlideIcon({ slideKey }) {
  const size = 48;
  const color = ACCENT;

  switch (slideKey) {
    case "welcome":
      return (
        <AppIcon name="home" size={size} color={color} />
      );
    case "how-it-works":
      return (
        <AppIcon name="chart" size={size} color={color} />
      );
    case "prospects":
      return (
        <AppIcon name="users" size={size} color={color} />
      );
    case "market-appraisals":
      return (
        <AppIcon name="activity" size={size} color={color} />
      );
    case "for-sale":
      return (
        <AppIcon name="flash" size={size} color={color} />
      );
    case "what-you-send":
      return (
        <AppIcon name="document" size={size} color={color} />
      );
    case "listing-alerts":
      return (
        <AppIcon name="building" size={size} color={color} />
      );
    case "import-sheet":
      return (
        <AppIcon name="download" size={size} color={color} />
      );
    case "daily-workflow":
      return (
        <AppIcon name="calendar" size={size} color={color} />
      );
    case "reports":
      return (
        <AppIcon name="notification" size={size} color={color} />
      );
    default:
      return null;
  }
}

function CategoryLabel({ text, index }) {
  const colors = ["#6366f1", "#f59e0b", "#ef4444"];
  const bgs = ["rgba(99,102,241,0.15)", "rgba(245,158,11,0.15)", "rgba(239,68,68,0.15)"];
  return (
    <View style={[ls.label, { backgroundColor: bgs[index], borderColor: colors[index] }]}>
      <View style={[ls.dot, { backgroundColor: colors[index] }]} />
      <Text style={[ls.labelText, { color: colors[index] }]}>{text}</Text>
    </View>
  );
}

const ls = StyleSheet.create({
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  labelText: { fontSize: 14, fontWeight: "600" },
});

function FieldTag({ text }) {
  return (
    <View style={ft.tag}>
      <Text style={ft.tagText}>{text}</Text>
    </View>
  );
}

const ft = StyleSheet.create({
  tag: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tagText: { color: "#374151", fontSize: 13, fontWeight: "500" },
});

function StepItem({ number, text }) {
  return (
    <View style={si.row}>
      <View style={si.numWrap}>
        <Text style={si.num}>{number}</Text>
      </View>
      <Text style={si.text}>{text}</Text>
    </View>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  numWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  num: { color: "#000", fontSize: 13, fontWeight: "700" },
  text: { color: "#4b5563", fontSize: 15, fontWeight: "500", flex: 1 },
});

function SettingRow({ label, desc }) {
  return (
    <View style={sr.row}>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.desc}>{desc}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  label: { color: "#000", fontSize: 14, fontWeight: "600", marginBottom: 3 },
  desc: { color: "#6b7280", fontSize: 13 },
});

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  function animateTransition(nextStep) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function handleNext() {
    if (step < TOTAL_SLIDES - 1) {
      animateTransition(step + 1);
    } else {
      onComplete();
    }
  }

  function handleBack() {
    if (step > 0) {
      animateTransition(step - 1);
    }
  }

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_SLIDES - 1;

  return (
    <SafeAreaView style={s.container}>
      {/* Top Dash Progress */}
      <View style={s.progressRow}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <View key={i} style={[s.progressDash, i <= step ? s.progressDashActive : {}]} />
        ))}
      </View>

      {/* Slide content */}
      <ScrollView
        contentContainerStyle={s.slideContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[s.slideInner, { opacity: fadeAnim }]}>
          {/* Icon */}
          <View style={s.iconWrap}>
            <SlideIcon slideKey={slide.key} />
          </View>

          {/* Title */}
          <Text style={s.title}>{slide.title}</Text>

          {/* Body */}
          <Text style={s.body}>{slide.body}</Text>

          {/* Labels (how it works) */}
          {slide.labels && (
            <View style={s.labelsWrap}>
              {slide.labels.map((label, i) => (
                <CategoryLabel key={label} text={label} index={i} />
              ))}
            </View>
          )}

          {/* Support text */}
          {slide.support && (
            <View style={s.supportBox}>
              <Text style={s.supportText}>{slide.support}</Text>
            </View>
          )}

          {/* Goal */}
          {slide.goal && (
            <View style={s.goalRow}>
              <AppIcon name="checkCircle" size={16} color={ACCENT} />
              <Text style={s.goalText}>{slide.goal}</Text>
            </View>
          )}

          {/* Bullets (what you send) */}
          {slide.bullets && (
            <View style={s.bulletsWrap}>
              {slide.bullets.map((b) => (
                <View key={b} style={s.bulletRow}>
                  <View style={s.bulletDot} />
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Fields (import sheet) */}
          {slide.fields && (
            <View style={s.fieldsWrap}>
              {slide.fields.map((f) => (
                <FieldTag key={f} text={f} />
              ))}
            </View>
          )}

          {/* Steps (daily workflow) */}
          {slide.steps && (
            <View style={s.stepsWrap}>
              {slide.steps.map((st, i) => (
                <StepItem key={st} number={i + 1} text={st} />
              ))}
            </View>
          )}

          {/* Settings (reports) */}
          {slide.settings && (
            <View style={s.settingsWrap}>
              {slide.settings.map((set) => (
                <SettingRow key={set.label} label={set.label} desc={set.desc} />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={s.bottomWrap}>
        <Pressable
          onPress={handleBack}
          style={[s.backBtnCircle, isFirst && { opacity: 0 }]}
          disabled={isFirst}
        >
          <AppIcon name="chevronBack" size={20} color={"#000"} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={s.ctaBtnText}>{isLast ? "Get Started" : "Next"}</Text>
          <AppIcon name="chevron" size={16} color={"#fff"} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  progressDash: {
    flex: 1,
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
  },
  progressDashActive: {
    backgroundColor: "#000",
  },
  slideContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
  },
  slideInner: {
    flex: 1,
  },
  iconWrap: {
    marginBottom: 24,
  },
  title: {
    color: "#000",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  body: {
    color: "#6b7280",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  labelsWrap: {
    gap: 10,
    marginBottom: 8,
  },
  supportBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 16,
  },
  supportText: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 21,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  goalText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  bulletsWrap: {
    gap: 12,
    marginBottom: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  bulletText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "500",
  },
  fieldsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  stepsWrap: {
    gap: 14,
    marginBottom: 8,
  },
  settingsWrap: {
    gap: 10,
    marginBottom: 8,
  },
  bottomWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 14 : 24,
    paddingTop: 10,
  },
  backBtnCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtn: {
    backgroundColor: "#000",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
