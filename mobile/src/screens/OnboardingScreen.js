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
import Svg, { Circle, Path, Rect } from "react-native-svg";

const ACCENT = "#000";

const SLIDES = [
  {
    key: "welcome",
    title: "Your Dubai owner CRM",
    body: "Seller Signal helps you track confirmed property owners, organize them by readiness to sell, and send recurring market updates that keep you top of mind.",
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
    body: "Seller Signal helps you send a relevant market report for the owner's unit or building.",
    bullets: [
      "Recent building transactions",
      "Price movement",
      "Market context",
      "A WhatsApp-ready update",
    ],
    support: "This is how you stay consistent and become the area specialist they trust.",
  },
  {
    key: "data-lives",
    title: "Built around your current workflow",
    body: "Your owner numbers already live in WhatsApp and your spreadsheet. When you get a new owner, you save them in both places. Seller Signal works on top of that system.",
  },
  {
    key: "import-sheet",
    title: "Import your owners",
    body: "Paste your Google Sheet and Seller Signal will organize your owners by category and prepare them for follow-up.",
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
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      );
    case "how-it-works":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 20V10M18 20V4M6 20v-4" />
        </Svg>
      );
    case "prospects":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </Svg>
      );
    case "market-appraisals":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Svg>
      );
    case "for-sale":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </Svg>
      );
    case "what-you-send":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </Svg>
      );
    case "data-lives":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </Svg>
      );
    case "import-sheet":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </Svg>
      );
    case "daily-workflow":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <Path d="M16 2v4M8 2v4M3 10h18" />
        </Svg>
      );
    case "reports":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </Svg>
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
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <Path d="M22 4L12 14.01l-3-3" />
              </Svg>
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
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={s.ctaBtnText}>{isLast ? "Get Started" : "Next"}</Text>
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
          </Svg>
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
