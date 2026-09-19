import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PRO_TRIAL_DAYS } from "../subscriptions";

const BENEFITS = [
  "Seller pipeline and follow-ups",
  "Spreadsheet imports and clean records",
  "Building listings and price alerts",
  "Message templates and WhatsApp workflow",
  "Access on mobile and desktop",
];
const TERMS_URL = "https://repeatai.org/terms";
const PRIVACY_URL = "https://repeatai.org/privacy";

export default function SubscriptionScreen({
  action,
  canPurchase,
  error,
  onPurchase,
  onRefresh,
  onRestore,
  onSignOut,
  priceString,
  storeConfigured,
  storeLabel,
  trialEligible,
}) {
  const insets = useSafeAreaInsets();
  const actionPending = useRef(false);
  const [localAction, setLocalAction] = useState(null);
  const pendingAction = action || localAction;
  const price = priceString || null;
  const trialCopy = trialEligible === true ? `${PRO_TRIAL_DAYS}-day free trial` : null;
  const purchaseDisabled = !storeConfigured || !canPurchase || Boolean(pendingAction);

  async function runAction(name, task) {
    if (actionPending.current) return;
    actionPending.current = true;
    setLocalAction(name);
    try {
      const active = await task();
      if (name === "restore") {
        Alert.alert(
          active ? "Purchases restored" : "Nothing to restore",
          active ? "Your Repeat AI Pro access is active." : "No active subscription was found for this store account.",
        );
      }
    } catch (actionError) {
      Alert.alert(
        "Subscription unavailable",
        actionError instanceof Error
          ? actionError.message
          : "Check your connection and try again.",
      );
    } finally {
      actionPending.current = false;
      setLocalAction(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.brand}>Repeat AI</Text>
        <Pressable onPress={onSignOut} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>REPEAT AI PRO</Text>
          <Text style={styles.title}>Your property workspace, wherever you are.</Text>
          <Text style={styles.subtitle}>One plan for the full desktop and mobile experience.</Text>
        </View>

        <View style={styles.planCard}>
          {trialCopy ? <View style={styles.ribbon}><Text style={styles.ribbonText}>{trialCopy}</Text></View> : null}
          <View style={styles.planTopRow}>
            <View>
              <Text style={styles.planName}>Professional</Text>
              <Text style={styles.planTerm}>1 month</Text>
            </View>
            <View style={styles.priceWrap}>
              <Text selectable style={styles.price}>{price || "—"}</Text>
              <Text style={styles.perMonth}>per month</Text>
            </View>
          </View>
        </View>

        <View style={styles.benefits}>
          <Text style={styles.sectionTitle}>Everything you need</Text>
          {BENEFITS.map((benefit, index) => (
            <View key={benefit} style={[styles.benefitRow, index > 0 && styles.benefitBorder]}>
              <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onRefresh} hitSlop={10}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          disabled={purchaseDisabled}
          onPress={() => void runAction("purchase", onPurchase)}
          style={({ pressed }) => [
            styles.primaryButton,
            purchaseDisabled && styles.primaryButtonDisabled,
            pressed && !purchaseDisabled && styles.pressed,
          ]}
        >
          {pendingAction === "purchase" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {!storeConfigured || !canPurchase
                ? "Subscription unavailable"
                : trialCopy ? `Start ${trialCopy}` : `Continue to ${storeLabel}`}
            </Text>
          )}
        </Pressable>

        {price ? <Text style={styles.billingCaption}>
          {trialCopy
            ? `Payment method required. Free for ${PRO_TRIAL_DAYS} days, then ${price} per month. Cancel in the ${storeLabel} anytime.`
            : `Renews monthly at ${price} until canceled in the ${storeLabel}.`}
        </Text> : null}

        <Pressable
          disabled={Boolean(pendingAction)}
          onPress={() => void runAction("restore", onRestore)}
          style={styles.textButton}
        >
          {pendingAction === "restore" ? (
            <ActivityIndicator color="#111111" size="small" />
          ) : (
            <Text style={styles.textButtonLabel}>Restore purchases</Text>
          )}
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.legalLink}>Terms</Text></Pressable>
          <Text style={styles.legalDot}>•</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.legalLink}>Privacy</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { minHeight: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: "#111111", fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  signOut: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 24 },
  hero: { alignItems: "center", gap: 10, paddingHorizontal: 4 },
  eyebrow: { color: "#707070", fontSize: 12, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: "#111111", fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.4, textAlign: "center" },
  subtitle: { color: "#6B7280", fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 330 },
  planCard: { minHeight: 154, borderRadius: 18, borderWidth: 2, borderColor: "#111111", padding: 20, paddingTop: 52, backgroundColor: "#FFFFFF", position: "relative" },
  ribbon: { position: "absolute", top: -2, left: -2, backgroundColor: "#111111", minHeight: 38, paddingHorizontal: 16, justifyContent: "center", borderTopLeftRadius: 18, borderBottomRightRadius: 16 },
  ribbonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  planTopRow: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18 },
  planName: { color: "#111111", fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  planTerm: { color: "#6B7280", fontSize: 14, marginTop: 6 },
  priceWrap: { alignItems: "flex-end" },
  price: { color: "#111111", fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  perMonth: { color: "#6B7280", fontSize: 13, marginTop: 4 },
  benefits: { gap: 0 },
  sectionTitle: { color: "#111111", fontSize: 20, fontWeight: "800", letterSpacing: -0.4, marginBottom: 8 },
  benefitRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12 },
  benefitBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  check: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  benefitText: { flex: 1, color: "#292929", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  errorBox: { borderRadius: 12, backgroundColor: "#FFF1F2", padding: 14, alignItems: "center", gap: 8 },
  errorText: { color: "#9F1239", fontSize: 13, lineHeight: 18, textAlign: "center" },
  retryText: { color: "#111111", fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB", backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonDisabled: { backgroundColor: "#D1D5DB" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", textAlign: "center" },
  billingCaption: { color: "#6B7280", fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 4 },
  textButton: { minHeight: 30, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { color: "#111111", fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  legalLink: { color: "#6B7280", fontSize: 11, textDecorationLine: "underline" },
  legalDot: { color: "#9CA3AF" },
  pressed: { opacity: 0.68 },
});
