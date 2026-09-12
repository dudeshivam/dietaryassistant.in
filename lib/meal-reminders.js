import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const MEAL_REMINDER_CHANNEL_ID = "meal-reminders";
const MAX_DAILY_MEAL_REMINDERS = 40;
const EXACT_ALARM_PROMPT_KEY = "dietary-assistant-exact-alarm-prompted";

function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function getMealReminderNotificationId(scheduledDate, index) {
  const dateNumber = Number(String(scheduledDate || "").replace(/\D/g, "")) || 0;
  return 100000000 + ((dateNumber % 900000) * 100) + index;
}

function getMealReminderIdsForDate(scheduledDate) {
  return Array.from({ length: MAX_DAILY_MEAL_REMINDERS }, (_, index) => ({
    id: getMealReminderNotificationId(scheduledDate, index)
  }));
}

async function ensureMealReminderPermissions() {
  const displayPermission = await LocalNotifications.checkPermissions();
  const requestedDisplayPermission = displayPermission.display === "granted"
    ? displayPermission
    : await LocalNotifications.requestPermissions();

  if (requestedDisplayPermission.display !== "granted") {
    return { granted: false, reason: "notification permission denied" };
  }

  if (Capacitor.getPlatform() !== "android") {
    return { granted: true };
  }

  await LocalNotifications.createChannel({
    id: MEAL_REMINDER_CHANNEL_ID,
    name: "Meal reminders",
    description: "Reminders for scheduled meals and hydration.",
    importance: 4,
    visibility: 1,
    sound: "default"
  });

  const exactAlarmPermission = await LocalNotifications.checkExactNotificationSetting();

  if (exactAlarmPermission.exact_alarm === "granted") {
    return { granted: true };
  }

  if (!window.sessionStorage.getItem(EXACT_ALARM_PROMPT_KEY)) {
    window.sessionStorage.setItem(EXACT_ALARM_PROMPT_KEY, "true");
    await LocalNotifications.changeExactNotificationSetting();
  }

  return { granted: false, reason: "exact alarm permission denied" };
}

function getReminderBody(meal) {
  const items = Array.isArray(meal.items) ? meal.items.filter(Boolean) : [];
  const summary = items.slice(0, 2).join(", ");
  return summary || "Open Dietary Assistant to check this meal.";
}

export async function scheduleMealReminders(meals, scheduledDate) {
  if (!isNativeApp()) {
    return { scheduled: 0, reason: "not a native platform" };
  }

  const permission = await ensureMealReminderPermissions();

  if (!permission.granted) {
    return { scheduled: 0, reason: permission.reason };
  }

  await LocalNotifications.cancel({
    notifications: getMealReminderIdsForDate(scheduledDate)
  });

  const now = new Date();
  const notifications = meals
    .map((meal, index) => {
      const at = meal.notificationAt instanceof Date ? meal.notificationAt : null;

      if (!at || Number.isNaN(at.getTime()) || at <= now || meal.status !== "pending") {
        return null;
      }

      return {
        id: getMealReminderNotificationId(meal.scheduled_date || scheduledDate, index),
        title: `Time for ${meal.name || "your meal"}`,
        body: getReminderBody(meal),
        schedule: {
          at,
          allowWhileIdle: true
        },
        channelId: MEAL_REMINDER_CHANNEL_ID,
        autoCancel: true,
        extra: {
          mealId: meal.id,
          scheduledDate: meal.scheduled_date || scheduledDate
        }
      };
    })
    .filter(Boolean);

  if (notifications.length === 0) {
    return { scheduled: 0 };
  }

  const result = await LocalNotifications.schedule({ notifications });
  const pending = await LocalNotifications.getPending();

  return {
    scheduled: result.notifications.length,
    pending: pending.notifications.length
  };
}
