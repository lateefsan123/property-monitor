import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
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

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: "4cae8513-9326-42eb-8cdb-3b07f6785b71",
  });

  return token || null;
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
