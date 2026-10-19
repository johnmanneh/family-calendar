/**
 * registerPushToken
 *
 * Requests notification permission, gets the Expo push token, then saves
 * it to the backend via PUT /api/auth/push-token.
 *
 * Push tokens only work in standalone/development builds — not in Expo Go.
 * We skip before ever touching the expo-notifications module so the native
 * runtime is never initialised in Expo Go (avoids "runtime not ready" error).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import API from '../api/axios';

export async function registerPushToken() {
  try {
    // Bail out before touching expo-notifications in Expo Go.
    // The native module requires a standalone/dev build to work.
    if (Constants.appOwnership === 'expo') return;

    // Dynamic require — module is never loaded in Expo Go
    const Notifications = require('expo-notifications');

    // Show notifications even while the app is open (otherwise a push that
    // arrives in the foreground is silently dropped — no banner, no sound)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      // Everyday notifications: tasks, events, chat, pickup updates
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a8fa8',
      });
      // Urgent: "pickup needed" — longer, stronger vibration. The server picks
      // this channel with channelId 'urgent' (backend/src/utils/sendPush.js)
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent (pickup needed)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 200, 600, 200, 600],
        lightColor: '#D93025',
        sound: 'default',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData?.data;
    if (!token) return;

    await API.put('/auth/push-token', { push_token: token });
  } catch {
    // Silently ignore — push is non-critical
  }
}
