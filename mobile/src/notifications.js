import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import { supabase } from "./supabase";

let notificationsModulePromise = null;
let notificationHandlerConfigured = false;

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

function hasNativePushModules() {
  const pushTokenManager = requireOptionalNativeModule("ExpoPushTokenManager");
  const serverRegistrationModule = requireOptionalNativeModule("ExpoServerRegistrationModule");
  return Boolean(pushTokenManager && serverRegistrationModule);
}

async function getNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }
  return notificationsModulePromise;
}

async function ensureNotificationHandlerConfigured() {
  if (notificationHandlerConfigured) return;

  const Notifications = await getNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

export async function registerForPushNotifications() {
  if (Platform.OS === "web") return null;
  if (Constants.expoGoConfig) {
    console.warn("Remote push notifications are unavailable in Expo Go. Use a development build.");
    return null;
  }
  if (!hasNativePushModules()) {
    console.warn(
      "Push notifications are unavailable in this installed app binary. Rebuild the development app after adding expo-notifications.",
    );
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Push notifications are not configured because the EAS project ID is missing.");
    return null;
  }

  try {
    const Notifications = await getNotificationsModule();
    await ensureNotificationHandlerConfigured();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("price-drops", {
        name: "Price Drops",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token || null;
  } catch (error) {
    console.warn("Failed to register for push notifications.", error);
    return null;
  }
}

export async function saveTokenToSupabase(expoPushToken) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !expoPushToken) return;

  await supabase.from("notification_tokens").upsert(
    { user_id: user.id, expo_push_token: expoPushToken },
    { onConflict: "user_id,expo_push_token" },
  );
}

export async function removeTokenFromSupabase(expoPushToken) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !expoPushToken) return;

  await supabase
    .from("notification_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("expo_push_token", expoPushToken);
}
