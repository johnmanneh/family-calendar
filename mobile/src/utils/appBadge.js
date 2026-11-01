/**
 * setAppBadge — the red number on the app icon (like other apps show).
 * Set to the number of unread notifications; 0 removes it.
 * Never throws; skipped in Expo Go (no native notifications module there).
 */
import Constants from 'expo-constants';

export async function setAppBadge(count) {
  try {
    if (Constants.appOwnership === 'expo') return;
    const Notifications = require('expo-notifications');
    const n = Math.max(0, Number(count) || 0);
    await Notifications.setBadgeCountAsync(n);
  } catch { /* badge is a nicety; never break the app for it */ }
}
