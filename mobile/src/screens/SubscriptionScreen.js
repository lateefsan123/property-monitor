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

const BENEFITS = ["Sellers and follow-ups", "Listings and price alerts", "Mobile and desktop"];
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
        <View />
        <Pressable onPress={onSignOut} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>CHOOSE A PLAN</Text>

        <View style={styles.planCard}>
          {trialCopy ? <View style={styles.ribbon}><Text style={styles.ribbonText}>{trialCopy}</Text></View> : null}
          <View style={styles.planRow}>
            <Text style={styles.planLength}>1 Month</Text>
            <Text selectable style={styles.price}>{price ? `${price} / mo` : "—"}</Text>
          </View>
          <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
        </View>

        <Text style={styles.billingLine}>{trialCopy ? "Billed monthly after trial" : "Billed monthly"}</Text>

        <View style={styles.benefits}>
          <Text style={styles.sectionTitle}>WHAT PRO ADDS</Text>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
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
                : trialCopy ? `Start ${trialCopy}` : "Subscribe"}
            </Text>
          )}
        </Pressable>

        {price ? <Text style={styles.billingCaption}>
          {trialCopy
            ? `Then ${price}/month. Cancel anytime.`
            : `${price}/month. Cancel anytime.`}
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
  signOut: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, gap: 18 },
  title: { color: "#111111", fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: -1.5, textAlign: "center", paddingBottom: 34 },
  planCard: { minHeight: 164, borderRadius: 10, borderWidth: 3, borderColor: "#111111", padding: 17, paddingTop: 50, backgroundColor: "#FFFFFF", position: "relative" },
  ribbon: { position: "absolute", top: -3, left: -3, backgroundColor: "#111111", minHeight: 39, minWidth: 190, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderTopLeftRadius: 9, borderBottomRightRadius: 9 },
  ribbonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  planRow: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 },
  planLength: { color: "#111111", fontSize: 21, fontWeight: "700" },
  price: { color: "#111111", fontSize: 16, fontWeight: "500" },
  checkBadge: { position: "absolute", right: -13, bottom: -13, width: 33, height: 33, borderRadius: 17, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  checkBadgeText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  billingLine: { color: "#666666", fontSize: 13, marginTop: -11 },
  benefits: { marginTop: 10 },
  sectionTitle: { color: "#111111", fontSize: 24, fontWeight: "900", letterSpacing: -0.8, marginBottom: 8 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  benefitText: { color: "#292929", fontSize: 14, lineHeight: 20, fontWeight: "600" },
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
