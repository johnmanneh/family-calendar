/**
 * registerPushToken
 *
 * Requests notification permission, gets the Expo push token, then saves
 * it to the backend via PUT /api/auth/push-token.
 *
 * Push tokens only work in standalone/development builds — not in Expo Go.
 * We skip silently when running inside Expo Go so no warnings appear.
 *
 * Call this once after the user successfully logs in.
 * Failures are silently swallowed so they never break the login flow.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import API from '../api/axios';

export async function registerPushToken() {
  try {
    // Push tokens require a real standalone/dev build.
    // Expo Go cannot obtain them — skip to avoid the warning.
    if (Constants.appOwnership === 'expo') return;

    // On Android, a notification channel is required for the OS to deliver sounds/banners.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a8fa8',
      });
    }

    // Ask for permission — user may decline; we handle that gracefully.
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // projectId is needed by getExpoPushTokenAsync in SDK 50+
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    // Get the Expo push token (works on real devices; simulators return null).
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData?.data;
    if (!token) return;

    // Save to backend — fire and forget, don't block the caller.
    await API.put('/auth/push-token', { push_token: token });
  } catch {
    // Silently ignore — push is non-critical.
  }
}
