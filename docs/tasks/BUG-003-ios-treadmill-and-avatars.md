# BUG-003 — iOS: treadmill tilts the wrong way; member photos missing

**Status:** For agent John (Hermes) to fix. Test on the iPhone (TestFlight) AND the Samsung before committing.
**Reported:** 2026-10-30, first iOS TestFlight build (screenshot: Family Manneh home, iPhone)

## 1. Treadmill roll tilts the wrong way on iOS

**Seen:** a row rolling away at the top ("Ketamine 22:00") has its **top edge coming toward
the viewer** (card gets wider at the top). On Android the top edge **recedes** (correct).

**Cause (Claude, please verify):** `mobile/src/components/TreadmillList.js`
```js
export const TILT_DIR = Platform.OS === 'ios' ? -1 : 1;
```
This flip was added when iOS and Android applied `rotateX` in opposite directions. The app is
now on React Native 0.86 (new architecture), where both platforms rotate the same way, so the
flip now inverts iOS.

**Fix:** use the same direction on both platforms (`TILT_DIR = 1`, or remove it). Android must
stay exactly as it is today. Check both the top roll and the bottom roll (under the + button)
on iPhone. Also check `transformOrigin` ('top' / 'bottom') behaves the same on iOS.

## 2. Member photos don't show on iOS (John, Emmanuel blank; names only)

Avatar bubbles render `<Image source={{ uri: photoUri }}>` (HomeScreen `MemberBubble`).
Since `fbba6e7` (security hardening) avatars are Cloudinary **authenticated** assets with
**5-minute signed `private_download_url`s** (`backend/src/utils/avatarStore.js`).

**Possible causes to check:**
1. **Old photos not migrated:** John's/Emmanuel's photos were uploaded before the change as
   public `avatars/avatar-<id>`. `getAvatarUrl()` now signs the HMAC public id, which may not
   exist for old uploads → 404 → blank. (Would affect Android too once its cache expires.)
2. **`private_download_url` on iOS:** it points to the Cloudinary API download endpoint; iOS
   `Image` may not load it (redirect / content-type). A signed **delivery** URL
   (`cloudinary.url(id, { type: 'authenticated', sign_url: true, ... })`) may work better.
3. **Expiry + caching:** URLs expire after 5 min; a cached list (offline cache from PERF-001)
   can hand out expired URLs → blank. Refresh URLs when data is refetched, or longer expiry.

**Fix expectations:** photos show on iOS and Android, after app restart, after >5 minutes,
and from the offline cache; old uploads still work (migrate or fall back); initials shown
if the image fails (`onError`).

## Acceptance
- iPhone + Samsung: rows tip **away** at top and bottom, identical on both.
- iPhone + Samsung: all member photos visible on Home, Family screen, chat, pickup.
- Mobile unit tests pass; backend test for avatar URL generation (old + new uploads).
