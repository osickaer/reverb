import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const DAILY_REMINDER_HOUR = 19;
const DAILY_REMINDER_MINUTE = 0;
const DAILY_REMINDER_CHANNEL_ID = "daily-session-reminders";
const DAILY_REMINDER_TYPE = "daily-session-reminder";
const NOTIFICATIONS_ENABLED_KEY = "@reverb_notifications_enabled";

function getTodayReminderDate() {
  const reminderDate = new Date();
  reminderDate.setHours(DAILY_REMINDER_HOUR, DAILY_REMINDER_MINUTE, 0, 0);
  return reminderDate;
}

async function ensureNotificationPermission() {
  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return true;
  }

  if (!permissions.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function isNotificationPermissionUndetermined() {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === Notifications.PermissionStatus.UNDETERMINED;
}

export async function areDailyRemindersEnabled() {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored === "true";
}

export async function setDailyRemindersEnabled(enabled: boolean) {
  if (!enabled) {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
    await Notifications.cancelAllScheduledNotificationsAsync();
    return false;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
    return false;
  }

  await ensureAndroidChannel();
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
  return true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: "Daily session reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function triggerDebugNotification(seconds = 5) {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Reverb test notification",
      body: `This debug notification was scheduled ${seconds} seconds ago.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId:
        Platform.OS === "android" ? DAILY_REMINDER_CHANNEL_ID : undefined,
    },
  });

  return true;
}

async function findScheduledReminderId(dateKey: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.find((notification) => {
    const data = notification.content.data as
      | { type?: string; dateKey?: string }
      | undefined;

    return (
      data?.type === DAILY_REMINDER_TYPE &&
      data?.dateKey === dateKey
    );
  });

  return matching?.identifier ?? null;
}

export async function cancelDailySessionReminder(dateKey: string) {
  const existingId = await findScheduledReminderId(dateKey);
  if (!existingId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(existingId);
}

export async function syncDailySessionReminder(options: {
  dateKey: string;
  isCompleted: boolean;
  targetDate?: Date;
}) {
  const { dateKey, isCompleted, targetDate } = options;
  const remindersEnabled = await areDailyRemindersEnabled();

  if (!remindersEnabled) {
    await cancelDailySessionReminder(dateKey);
    return;
  }

  if (isCompleted) {
    await cancelDailySessionReminder(dateKey);
    return;
  }

  const reminderDate = targetDate ?? getTodayReminderDate();
  if (reminderDate.getTime() <= Date.now()) {
    return;
  }

  const existingId = await findScheduledReminderId(dateKey);
  if (existingId) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Reverb check-in 🧠",
      body: "Your daily workout is still waiting whenever you're ready.",
      data: {
        type: DAILY_REMINDER_TYPE,
        dateKey,
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      channelId:
        Platform.OS === "android" ? DAILY_REMINDER_CHANNEL_ID : undefined,
      date: reminderDate,
    },
  });
}
