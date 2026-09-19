/* global process */
import { Platform } from "react-native";

export const PRO_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim()
  || "seller_signal_pro";
export const PRO_TRIAL_DAYS = 7;

let purchasesModulePromise = null;

function getPurchasesModule() {
  purchasesModulePromise ??= import("react-native-purchases");
  return purchasesModulePromise;
}

function getPublicApiKey() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || null;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() || null;
  }
  return null;
}

export function getSubscriptionStoreLabel() {
  if (Platform.OS === "ios") return "App Store";
  if (Platform.OS === "android") return "Google Play";
  return "app store";
}

function isProCustomer(customerInfo) {
  return customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]?.isActive === true;
}

function getEntitlementExpiry(customerInfo) {
  return customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]?.expirationDate ?? null;
}

async function getMonthlyPackage() {
  const { default: Purchases } = await getPurchasesModule();
  const offerings = await Purchases.getOfferings();
  return offerings.current?.monthly ?? offerings.current?.availablePackages?.[0] ?? null;
}

function hasSevenDayAndroidTrial(subscriptionPackage) {
  const period = subscriptionPackage?.product?.defaultOption?.freePhase?.billingPeriod?.iso8601;
  return period === "P7D" || period === "P1W";
}

async function getTrialEligibility(subscriptionPackage) {
  if (!subscriptionPackage) return false;
  if (Platform.OS === "android") return hasSevenDayAndroidTrial(subscriptionPackage);
  if (Platform.OS !== "ios") return false;

  const introPrice = subscriptionPackage.product?.introPrice;
  const hasSevenDayIntro = introPrice?.price === 0
    && (introPrice.period === "P1W"
      || (introPrice.periodUnit === "DAY" && introPrice.periodNumberOfUnits === PRO_TRIAL_DAYS));
  if (!hasSevenDayIntro) return false;

  const { default: Purchases } = await getPurchasesModule();
  const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([
    subscriptionPackage.product.identifier,
  ]);
  const status = eligibility[subscriptionPackage.product.identifier]?.status;
  if (status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return true;
  if (status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN) return null;
  return false;
}

export async function configureMobileSubscriptions({ userId, email, displayName }) {
  const apiKey = getPublicApiKey();
  if (!apiKey || !userId) return false;

  const { default: Purchases } = await getPurchasesModule();
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({
      apiKey,
      appUserID: userId,
      automaticDeviceIdentifierCollectionEnabled: false,
      diagnosticsEnabled: Boolean(globalThis.__DEV__),
    });
  } else if ((await Purchases.getAppUserID()) !== userId) {
    await Purchases.logIn(userId);
  }

  const attributes = [];
  if (email) attributes.push(Purchases.setEmail(email));
  if (displayName) attributes.push(Purchases.setDisplayName(displayName));
  if (attributes.length) await Promise.all(attributes);
  return true;
}

export async function clearMobileSubscriptionUser() {
  if (!getPublicApiKey()) return;
  const { default: Purchases } = await getPurchasesModule();
  if (!(await Purchases.isConfigured())) return;
  const currentUserId = await Purchases.getAppUserID();
  if (!currentUserId.startsWith("$RCAnonymousID:")) await Purchases.logOut();
}

export async function getMobileSubscriptionSnapshot(user) {
  const configured = await configureMobileSubscriptions(user);
  if (!configured) {
    return {
      configured: false,
      canPurchase: false,
      customerInfo: null,
      entitlementExpiresAt: null,
      isPro: false,
      priceString: null,
      subscriptionPackage: null,
      trialEligible: null,
    };
  }

  const { default: Purchases } = await getPurchasesModule();
  const [customerInfo, subscriptionPackage] = await Promise.all([
    Purchases.getCustomerInfo(),
    getMonthlyPackage().catch(() => null),
  ]);
  const isPro = isProCustomer(customerInfo);
  return {
    configured: true,
    canPurchase: Boolean(subscriptionPackage),
    customerInfo,
    entitlementExpiresAt: getEntitlementExpiry(customerInfo),
    isPro,
    priceString: subscriptionPackage?.product?.priceString ?? null,
    subscriptionPackage,
    trialEligible: isPro
      ? false
      : subscriptionPackage
        ? await getTrialEligibility(subscriptionPackage).catch(() => null)
        : null,
  };
}

export async function purchaseMobilePro(user, subscriptionPackage) {
  if (!(await configureMobileSubscriptions(user))) {
    throw new Error("Mobile subscriptions are not configured for this build.");
  }
  const selectedPackage = subscriptionPackage || await getMonthlyPackage();
  if (!selectedPackage) {
    throw new Error("Repeat AI Pro is not available in this storefront yet.");
  }

  const { default: Purchases } = await getPurchasesModule();
  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  return {
    configured: true,
    canPurchase: true,
    customerInfo,
    entitlementExpiresAt: getEntitlementExpiry(customerInfo),
    isPro: isProCustomer(customerInfo),
    priceString: selectedPackage.product?.priceString ?? null,
    subscriptionPackage: selectedPackage,
    trialEligible: false,
  };
}

export async function restoreMobilePurchases(user) {
  if (!(await configureMobileSubscriptions(user))) {
    throw new Error("Mobile subscriptions are not configured for this build.");
  }

  const { default: Purchases } = await getPurchasesModule();
  const [customerInfo, subscriptionPackage] = await Promise.all([
    Purchases.restorePurchases(),
    getMonthlyPackage().catch(() => null),
  ]);
  const isPro = isProCustomer(customerInfo);
  return {
    configured: true,
    canPurchase: Boolean(subscriptionPackage),
    customerInfo,
    entitlementExpiresAt: getEntitlementExpiry(customerInfo),
    isPro,
    priceString: subscriptionPackage?.product?.priceString ?? null,
    subscriptionPackage,
    trialEligible: isPro
      ? false
      : subscriptionPackage
        ? await getTrialEligibility(subscriptionPackage).catch(() => null)
        : null,
  };
}

export async function showMobileSubscriptionManagement(user) {
  if (!(await configureMobileSubscriptions(user))) {
    throw new Error("Mobile subscriptions are not configured for this build.");
  }
  const { default: Purchases } = await getPurchasesModule();
  await Purchases.showManageSubscriptions();
}

export function isMobilePurchaseCancellation(error) {
  return Boolean(error?.userCancelled || String(error?.code ?? "") === "1");
}
