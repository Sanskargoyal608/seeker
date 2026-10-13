// Web: No-op for push notifications (Phase 5 can add browser Web Push API)
export function usePushNotifications() {
  return { expoPushToken: null, notification: null };
}
