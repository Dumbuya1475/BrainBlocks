import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DAILY_REMINDER_ID = 1001;

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function getNotificationPermissionStatus() {
  if (isNativePlatform()) {
    const result = await LocalNotifications.checkPermissions();
    return result.display;
  }

  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display;
  }

  if (typeof Notification === 'undefined') return false;
  const permission = await Notification.requestPermission();
  return permission;
}

export async function scheduleDailyReminder(time) {
  if (!isNativePlatform() || !time) return false;
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_ID,
        title: 'BrainBlocks Study Reminder 📚',
        body: 'Time to study! Open BrainBlocks and start your focus session.',
        schedule: {
          on: { hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
        smallIcon: 'ic_launcher',
      },
    ],
  });

  return true;
}

export async function cancelDailyReminder() {
  if (!isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
}
