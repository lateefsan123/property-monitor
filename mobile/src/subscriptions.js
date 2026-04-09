import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

const env = globalThis.process?.env ?? {};
const TEST_API_KEY = env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim()
  || "test_NHynuKFdkhjanbNArVwGheRdkKG";
const APPLE_API_KEY = env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim() || "";
const GOOGLE_API_KEY = env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim() || "";

export const ENTITLEMENT_ID = env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim()
  || "seller_signal_pro";
export const ENTITLEMENT_DISPLAY_NAME = "seller signal Pro";

let configuredUserId = null;
let logLevelConfigured = false;

function isNativePurchasePlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function getPlatformReleaseApiKey() {
  if (Platform.OS === "ios") return APPLE_API_KEY;
  if (Platform.OS === "android") return GOOGLE_API_KEY;
  return "";
}

function getActiveApiKey() {
  if (globalThis.__DEV__ && TEST_API_KEY) return TEST_API_KEY;
  return getPlatformReleaseApiKey();
}

function getMissingConfig() {
  if (!isNativePurchasePlatform()) {
    return ["Native subscriptions are only available on iOS and Android builds."];
  }

  const missing = [];

  if (!ENTITLEMENT_ID) {
    missing.push("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID");
  }

  if (globalThis.__DEV__) {
    if (!getActiveApiKey()) {
      missing.push(
        "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY or a platform-specific RevenueCat API key",
      );
    }
    return missing;
  }

  if (Platform.OS === "ios" && !APPLE_API_KEY) {
    missing.push("EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY");
  }

  if (Platform.OS === "android" && !GOOGLE_API_KEY) {
    missing.push("EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY");
  }

  return missing;
}

function ensureConfiguredEnvironment() {
  const missing = getMissingConfig();
  if (!missing.length) return;

  throw new Error(
    missing.length === 1 && missing[0].startsWith("Native subscriptions")
      ? missing[0]
      : `Missing RevenueCat configuration: ${missing.join(", ")}.`,
  );
}

function getVerificationStatus(customerInfo) {
  return customerInfo?.entitlements?.verification
    || customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]?.verification
    || Purchases.VERIFICATION_RESULT.NOT_REQUESTED;
}

function getPackageMeta() {
  return {
    badge: "Monthly",
    description: "Flexible seller signal Pro access renewed through the store each month.",
    label: "Monthly",
  };
}

function toProductOption(subscriptionPackage) {
  const meta = getPackageMeta();

  if (!subscriptionPackage) {
    return {
      badge: meta.badge,
      description: `${meta.description} Configure this package in RevenueCat to make it available.`,
      id: "monthly",
      label: meta.label,
      priceLabel: "Not configured",
      productTitle: "",
      subscriptionPackage: null,
    };
  }

  return {
    badge: meta.badge,
    description: meta.description,
    id: "monthly",
    label: meta.label,
    priceLabel: subscriptionPackage.product?.priceString || "Configured in RevenueCat",
    productTitle: subscriptionPackage.product?.title?.trim() || "",
    subscriptionPackage,
  };
}

function getCurrentPackageMap(currentOffering) {
  if (!currentOffering) {
    return {
      monthly: null,
    };
  }

  return {
    monthly: currentOffering.monthly
      || currentOffering.availablePackages?.find(
        (subscriptionPackage) => subscriptionPackage.packageType === Purchases.PACKAGE_TYPE.MONTHLY,
      )
      || null,
  };
}

export function getSubscriptionStoreLabel() {
  if (Platform.OS === "ios") return "App Store";
  if (Platform.OS === "android") return "Google Play";
  return "mobile store";
}

export function hasActiveSubscription(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]?.isActive);
}

export function hasSubscriptionAccess(customerInfo) {
  return hasActiveSubscription(customerInfo)
    && getVerificationStatus(customerInfo) !== Purchases.VERIFICATION_RESULT.FAILED;
}

export function getSubscriptionVerificationWarning(customerInfo) {
  if (getVerificationStatus(customerInfo) !== Purchases.VERIFICATION_RESULT.FAILED) {
    return null;
  }

  return "RevenueCat could not verify this purchase securely. Access remains locked until verification succeeds.";
}

export function isPurchaseCancelledError(error) {
  return Boolean(
    error?.userCancelled
      || error?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      || error?.code === "1",
  );
}

export async function configureSubscriptionClient({ userId, email, displayName }) {
  ensureConfiguredEnvironment();

  if (!logLevelConfigured) {
    await Purchases.setLogLevel(
      globalThis.__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN,
    );
    logLevelConfigured = true;
  }

  const isConfigured = await Purchases.isConfigured();

  if (!isConfigured) {
    Purchases.configure({
      apiKey: getActiveApiKey(),
      appUserID: userId,
      diagnosticsEnabled: Boolean(globalThis.__DEV__),
      entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
    });
    configuredUserId = userId;
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }

  const attributeUpdates = [];
  if (email) attributeUpdates.push(Purchases.setEmail(email));
  if (displayName) attributeUpdates.push(Purchases.setDisplayName(displayName));

  if (attributeUpdates.length) {
    await Promise.all(attributeUpdates);
  }

  return Purchases.getCustomerInfo();
}

export function subscribeToSubscriptionUpdates(listener) {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function clearSubscriptionClient() {
  const isConfigured = await Purchases.isConfigured();
  configuredUserId = null;

  if (!isConfigured) return;

  try {
    await Purchases.logOut();
  } catch {
    // Ignore logout failures when the SDK was not initialized with a real user.
  }
}

export async function fetchSubscriptionStatus() {
  ensureConfiguredEnvironment();
  return Purchases.getCustomerInfo();
}

export async function fetchSubscriptionOfferings() {
  ensureConfiguredEnvironment();

  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;

  if (!currentOffering) {
    throw new Error("No current RevenueCat offering is configured for seller signal Pro.");
  }

  const packageMap = getCurrentPackageMap(currentOffering);

  return {
    currentOffering,
    packageMap,
    productOptions: [toProductOption(packageMap.monthly)],
  };
}

export async function purchaseSubscriptionPackage(subscriptionPackage) {
  ensureConfiguredEnvironment();

  if (!subscriptionPackage) {
    throw new Error("No RevenueCat package was provided for purchase.");
  }

  const result = await Purchases.purchasePackage(subscriptionPackage);
  return result.customerInfo;
}

export async function restoreSubscriptionPurchases() {
  ensureConfiguredEnvironment();
  return Purchases.restorePurchases();
}

export async function openSubscriptionCustomerCenter(callbacks) {
  ensureConfiguredEnvironment();

  if (callbacks) {
    return RevenueCatUI.presentCustomerCenter({ callbacks });
  }

  return RevenueCatUI.presentCustomerCenter();
}
