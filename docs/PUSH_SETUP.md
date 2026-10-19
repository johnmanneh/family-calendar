# Phone notifications (push) — setup and how it works

## How it works

1. Something happens (task assigned, event invite, pickup request/answer, chat message…).
2. The backend calls `notifyUser()` (inbox row + live update + push) or `sendPush()` (push only,
   used for chat) → Expo's push service → **Firebase (Android)** / **APNs (iPhone)** → the phone.
3. The app registers the phone's push address at login (`mobile/src/utils/registerPushToken.js`
   → `PUT /api/auth/push-token`).

Android channels (created by the app; the server picks one with `channelId`):

| Channel | Used for | Vibration |
|---|---|---|
| `default` | tasks, events, chat, pickup updates | short |
| `urgent` | "Pickup needed" (someone can't pick up) | long, strong |

While the app is open, notifications are still shown as a banner (`setNotificationHandler`).

What sends a push today:

| Event | Who gets it |
|---|---|
| Task assigned (event task or standalone) | the assignee |
| Task accepted / declined / counter-offer | the other person |
| Invited to an event | the invitee |
| Event / scanned events added to your calendar by someone else | you |
| Calendar access given | the delegate |
| Pickup request (in-app pickup person) | the pickup person |
| Pickup going / picked up / **can't (urgent)** | the parents |
| Chat message | everyone else in that family (push only, no inbox entry) |

## Status (19 Oct 2026)

- ✅ Server side and app code done.
- ❌ **Android: Firebase not set up** → phones can't get a push address, so no push arrives.
  (The app ignores this silently; the bell inbox still fills.)
- ⏳ **iPhone: needs the Apple push key** → after the Apple developer enrollment.

## Android: set up Firebase (one time, ~10 minutes)

1. Go to **console.firebase.google.com** → **Add project** → name it (e.g. "its for us") →
   Google Analytics can be off.
2. In the project: **Add app → Android**. Package name: **`com.songsanchaun.whenapp`**
   (must match `android.package` in `mobile/app.json`). Nickname optional. Skip the SHA-1.
3. **Download `google-services.json`** and put it in the `mobile/` folder
   (next to `app.json`). Then tell Claude — `app.json` needs
   `"android": { "googleServicesFile": "./google-services.json" }` (only add it once the file
   exists, or the build fails).
4. Firebase → ⚙️ **Project settings → Service accounts → Generate new private key**
   → downloads a JSON key. **Keep it private (never commit it).**
5. Give it to Expo: **expo.dev → your project → Credentials → Android →
   FCM V1 service account key → Upload** (or in the terminal: `eas credentials` → Android →
   Google Service Account → upload for push notifications).
6. Make a **new development build** (Firebase is built into the app; a reload is not enough):
   - EAS: `eas build --profile development --platform android`, or
   - locally with Android Studio installed: `npx expo run:android` (no EAS build credits needed).
7. Install it, open the app once, **allow notifications**, log in.

## Test

1. Phone: open the app once, then go to the home screen (app in the background).
2. Web or another phone, as Sarah: give John a task, or send a chat message in the same family.
3. The phone should show the notification and vibrate. Pickup "can't make it" vibrates longer.

## iPhone (later)

After the Apple developer enrollment: `eas credentials` → iOS → push key (Expo can create it),
then an iOS build. No code change needed.
