# INV-001 — Family QR invite

**Status:** QR card + scan + login join-token in tree 2026-10-23. Camera needs a new native Expo build. Do not commit until John asks.
**Date:** 2026-10-23
**Inspiration:** WeChat "My QR Code" (Me → QR icon → card with photo, name, QR, "Scan / Save Image").

## Problem

The family join code is now a long token (e.g. `2TZJ2QYSqfa-47kTdSBiB-xW1BTRmlmZ`): hard to read, type or dictate (mixed case, l/I look-alikes, wraps over 3 lines). Web and app also showed different codes (old short `DBDE832F` on web).

## Idea

Replace "type a code" with a **QR invite card**, like WeChat:

1. **Family screen → "Invite" card** (where the code is today):
   - Family name + avatar/initials, the QR code, short hint "Scan to join Family Manneh".
   - Buttons: **Share** (share sheet: WhatsApp, etc.), **Save image**, **Scan**.
   - Small "Show code" link as fallback for typing (keep a short, readable code, see below).
2. **Join → "Scan QR"** with two ways:
   - **Camera**: scan someone's phone screen.
   - **From image (upload)**: pick a screenshot/photo from the gallery and the app reads the QR **directly from the image**, so no second phone is needed. (E.g. Oma gets the QR picture on WhatsApp, saves it, opens the app → Join → From image.)
3. The QR contains a **join link**, e.g. `https://its4us.app/join/<token>`:
   - Scanned inside the app → join screen ("Join Family Manneh?" → Join).
   - Scanned with the normal phone camera → opens the app (deep link) or the web join page / store link if the app isn't installed.

## Locked product calls (John, 2026-10-23)

1. Who shares: **owner/admins only**. Members do not see or mint the card.
2. Expiry: **until rotated**. Label **Replace invite**; warn that old links, pictures, and the typed code all die. Also an explicit revoke. No silent 7-day kill.
3. Owner approval: **no**. Confirm family name, then join. Rotate if a picture leaked.
4. Typed fallback: **keep** a short grouped code (uppercase, no 0/O/1/I/L). Also share a tappable link. Stop uppercasing join input (current long tokens are case-sensitive).

## Security rules

- Token in the QR stays long and random (nobody types it). Short code is a separate credential, not a truncation of the long token.
- Rotate long token and short code together. Rotation kills outstanding invites, not memberships.
- Join shows family name first, then joins. No pending-approval queue.
- Rate-limit every join/preview path (`POST /join` and `POST /family/join`).
- Only owner/admins retrieve, generate, or rotate invites. Close the `GET /family/all` invite_code leak; rotate any code that was already exposed.
- Children are added by parents, never via QR (enforce server-side too).
- Public preview: family name only — no members, events, or photo.

## Fallback code (for people who type)

- Short and readable: uppercase, no look-alikes (no 0/O, 1/I/L), grouped, e.g. `K7QM-4XPR-9TWD`.
- Same expiry and rate limit as the QR.

## Tech notes

- **Generate QR (mobile):** `react-native-qrcode-svg` (+ `react-native-svg`). Web: `qrcode` / `qrcode.react`.
- **Scan with camera (mobile):** `expo-camera` barcode scanning (`barcodeScannerSettings: { barcodeTypes: ['qr'] }`).
- **Scan from image (mobile):** `expo-image-picker` → `scanFromURLAsync(uri, ['qr'])` from `expo-camera` (reads QR from a picked image). Check it works in the current Expo SDK on Android + iOS.
- **Web:** upload image → decode with `jsQR` (or the browser `BarcodeDetector` where available); camera scan optional.
- **Save image:** render the card to PNG (`react-native-view-shot`) → `expo-media-library` / share sheet.
- **Deep links:** app scheme + universal/app links for `its4us.app/join/*`.
- **Backend (smallest):** keep one long token per family; add a uniquely indexed short-code alias; admin-only rotate/revoke both together; public preview by token; authenticated redeem. New invite table only if we later need several live invites. Keep existing join-by-code working during migration. One resolver so a family invite cannot become a group join.
- i18n: all new texts in en + de.

## Tests

- Backend: revoked token rejected, rate limit, preview leaks no private data, join adds to the right family, members cannot fetch the code, case preserved on long tokens, short code accepted.
- Mobile/web: decode QR from a sample image (including WhatsApp-compressed); join flow shows family name before joining.
