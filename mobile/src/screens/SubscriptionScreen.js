/* global require */
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const logo = require("../../assets/logo2white.png");
const bgImage = require("../../assets/dubaii.png");

const ROW_1 = [
  "Unlimited lead imports",
  "Building-level sales comps",
  "Due-only seller follow-ups",
];
const ROW_2 = [
  "Ready-to-send WhatsApp copy",
  "Smart sheet column mapping",
  "Active and done pipeline tracking",
];
const DEFAULT_PRODUCT_OPTIONS = [
  {
    badge: "Monthly",
    description: "A flexible monthly seller signal Pro subscription billed by the store.",
    id: "monthly",
    label: "Monthly",
    priceLabel: "Configured in RevenueCat",
    productTitle: "",
  },
];

function MarqueeRow({ items, reverse = false, duration = 15000 }) {
  const [contentWidth, setContentWidth] = useState(0);
  const [animatedValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (contentWidth <= 0) return;

    if (reverse) {
      animatedValue.setValue(-contentWidth);
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
      return;
    }

    animatedValue.setValue(0);
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -contentWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [animatedValue, contentWidth, duration, reverse]);

  function onLayout(event) {
    setContentWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={s.marqueeContainer}>
      <Animated.View style={[s.marqueeTrack, { transform: [{ translateX: animatedValue }] }]}>
        <View onLayout={onLayout} style={s.marqueeSet}>
          {items.map((item, index) => (
            <View key={`orig-${index}`} style={s.pill}>
              <Text style={s.pillText}>{item}</Text>
            </View>
          ))}
        </View>
        {[1, 2, 3, 4, 5].map((dup) => (
          <View key={`dup-${dup}`} style={s.marqueeSet}>
            {items.map((item, index) => (
              <View key={`dup-${dup}-${index}`} style={s.pill}>
                <Text style={s.pillText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function PlanCard({ option }) {
  return (
    <View style={s.card}>
      <View style={s.planBadge}>
        <Text style={s.planBadgeText}>{option.badge}</Text>
      </View>
      <Text style={s.planLabel}>{option.label}</Text>
      <Text style={s.planPrice}>{option.priceLabel}</Text>
      <Text style={s.planSub}>{option.description}</Text>
      {option.productTitle ? <Text style={s.planFoot}>{option.productTitle}</Text> : null}
    </View>
  );
}

export default function SubscriptionScreen({
  onClose,
  onRestorePurchases,
  onStartPurchase,
  purchaseAvailable = true,
  productOptions,
  purchasePending = false,
  restorePending = false,
  storeLabel = Platform.OS === "ios"
    ? "App Store"
    : Platform.OS === "android"
    ? "Google Play"
    : "mobile store",
  subscriptionError,
  subscriptionLoading = false,
  subscriptionMessage,
}) {
  const previewMode = typeof onStartPurchase !== "function";
  const optionsToShow = productOptions?.length ? productOptions : DEFAULT_PRODUCT_OPTIONS;
  const ctaLabel = previewMode
    ? "Sign in to subscribe"
    : !purchaseAvailable
    ? "Subscription unavailable"
    : purchasePending
    ? `Opening ${storeLabel}...`
    : subscriptionLoading
    ? "Loading subscription..."
    : "Start monthly subscription";
  const restoreLabel = restorePending ? "Restoring purchases..." : "Restore purchases";
  const buttonDisabled = previewMode || !purchaseAvailable || purchasePending || subscriptionLoading;
  const restoreDisabled = previewMode || restorePending || subscriptionLoading;
  const statusNote = subscriptionMessage
    || (previewMode
      ? `seller signal Pro is sold natively through the ${storeLabel}. Sign in to continue.`
      : !purchaseAvailable
      ? "The monthly RevenueCat package is not configured yet."
      : `Purchases are completed through the ${storeLabel}, while this screen stays fully custom inside your app.`);

  return (
    <SafeAreaView style={s.container}>
      <View style={StyleSheet.absoluteFill}>
        <Image source={bgImage} style={s.bgImage} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)", "#121212", "#121212"]}
          style={s.gradient}
          locations={[0, 0.4, 0.7, 1]}
        />
      </View>

      <View style={s.scrollContent}>
        {onClose ? (
          <View style={s.headerRow}>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [s.closeButton, pressed && s.closeButtonPressed]}
            >
              <Text style={s.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={s.spacer} />

        <View style={s.logoWrap}>
          <View style={s.logoImageContainer}>
            <Image source={logo} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.brandText}>seller signal</Text>
        </View>

        <Text style={s.headline}>
          Turn raw owner lists{"\n"}into seller signals
        </Text>
        <Text style={s.subheadline}>
          Unlock seller signal Pro with one monthly subscription using the paywall you designed in the app.
        </Text>

        <View style={s.marqueeArea}>
          <MarqueeRow items={ROW_1} duration={22000} />
          <MarqueeRow items={ROW_2} duration={25000} reverse={true} />
        </View>

        <View style={s.cardWrap}>
          {optionsToShow.map((option) => (
            <PlanCard key={option.id} option={option} />
          ))}
        </View>

        <Text style={s.statusNote}>{statusNote}</Text>
        {subscriptionError ? <Text style={s.errorNote}>{subscriptionError}</Text> : null}
      </View>

      <View style={s.bottomWrap}>
        <Pressable
          disabled={buttonDisabled}
          style={({ pressed }) => [
            s.subscribeBtn,
            buttonDisabled && s.subscribeBtnDisabled,
            pressed && !buttonDisabled && { opacity: 0.85 },
          ]}
          onPress={onStartPurchase}
        >
          <Text style={s.subscribeBtnText}>{ctaLabel}</Text>
        </Pressable>
        <Pressable
          disabled={restoreDisabled}
          style={({ pressed }) => [
            s.restoreBtn,
            restoreDisabled && s.restoreBtnDisabled,
            pressed && !restoreDisabled && { opacity: 0.85 },
          ]}
          onPress={onRestorePurchases}
        >
          <Text style={s.restoreBtnText}>{restoreLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#2dd4bf";

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  bgImage: {
    width: "100%",
    height: "60%",
    opacity: 0.9,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 0,
  },
  headerRow: {
    alignItems: "flex-start",
    paddingTop: 4,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    backgroundColor: "rgba(18,18,18,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  closeButtonPressed: {
    opacity: 0.8,
  },
  closeButtonText: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 10,
  },
  logoImageContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: -10,
  },
  logo: {
    width: 154,
    height: 154,
    tintColor: "#fff",
  },
  brandText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: -1,
  },
  headline: {
    color: "#e8e8e8",
    fontSize: 24,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },
  subheadline: {
    color: "#a9afb7",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  marqueeArea: {
    marginBottom: 16,
    marginTop: 0,
    width: "100%",
  },
  marqueeContainer: {
    width: "100%",
    overflow: "hidden",
    marginBottom: 12,
  },
  marqueeTrack: {
    flexDirection: "row",
    alignItems: "center",
  },
  marqueeSet: {
    flexDirection: "row",
    paddingRight: 10,
    gap: 10,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillText: {
    color: "#d1d5db",
    fontSize: 13,
    fontWeight: "500",
  },
  cardWrap: {
    gap: 12,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(18,18,18,0.86)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
  },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(45,212,191,0.14)",
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.32)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  planBadgeText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "700",
  },
  planLabel: {
    color: "#f5f5f5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  planPrice: {
    color: ACCENT,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  planSub: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 17,
  },
  planFoot: {
    color: "#7dd3fc",
    fontSize: 11,
    marginTop: 10,
  },
  statusNote: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  errorNote: {
    color: "#fca5a5",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  bottomWrap: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 14 : 20,
    paddingTop: 10,
    backgroundColor: "#121212",
    gap: 10,
  },
  subscribeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  subscribeBtnDisabled: {
    opacity: 0.72,
  },
  subscribeBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  restoreBtn: {
    borderRadius: 30,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  restoreBtnDisabled: {
    opacity: 0.72,
  },
  restoreBtnText: {
    color: "#d1d5db",
    fontSize: 15,
    fontWeight: "600",
  },
});
