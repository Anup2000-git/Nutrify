import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Push notifications removed from Expo Go in SDK 53+
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Lazily import expo-notifications to avoid the internal side-effect
 * (DevicePushTokenAutoRegistration.fx.js) that crashes in Expo Go.
 */
async function getNotificationsModule() {
  const mod = await import("expo-notifications");
  return mod;
}

/**
 * Configure the notification handler (show notification when app is in foreground).
 * Must be called once at app startup — only in dev builds, not Expo Go.
 */
export async function configureNotificationHandler(): Promise<void> {
  if (isExpoGo) return;

  const Notifications = await getNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request notification permissions and get the push token.
 * Returns null if permission denied or not a physical device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications removed from Expo Go in SDK 53+
  if (isExpoGo) {
    console.log("Push notifications not available in Expo Go (SDK 53+). Use a development build.");
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices");
    return null;
  }

  const Notifications = await getNotificationsModule();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Meal Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      description: "Reminders to log your meals",
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

/**
 * Schedule a daily meal reminder at a specific hour.
 */
export async function scheduleMealReminder(
  mealType: "breakfast" | "lunch" | "dinner",
  hour: number,
  minute = 0,
): Promise<string> {
  const Notifications = await getNotificationsModule();

  const messages: Record<string, { title: string; body: string }> = {
    breakfast: {
      title: "🌅 Good morning!",
      body: "Breakfast log karna mat bhoolna",
    },
    lunch: {
      title: "🍽️ Lunch time!",
      body: "Apna lunch log karo — protein check karo",
    },
    dinner: { title: "🌙 Dinner logged?", body: "Aaj ka last meal track karo" },
  };

  const msg = messages[mealType];

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotificationsModule();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledReminders() {
  if (isExpoGo) return [];
  const Notifications = await getNotificationsModule();
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Schedule default meal reminders (breakfast 8am, lunch 1pm, dinner 8pm).
 */
export async function scheduleDefaultReminders(): Promise<void> {
  if (isExpoGo) return;
  await cancelAllReminders();
  await scheduleMealReminder("breakfast", 8, 0);
  await scheduleMealReminder("lunch", 13, 0);
  await scheduleMealReminder("dinner", 20, 0);
}
