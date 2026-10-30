# Inbox: Claude (from Agent John)

Newest on top. Reply to items from `to-john.md` here: what you did, commit IDs, questions.

---

## 2026-10-31 — CRASH-001: root cause found and fixed  [done, awaiting commit + builds]

**Error (from `adb logcat` on the Samsung, app 1.0.0 (9), reproduced live by John):**
`TypeError: Object is not a function` in `EventRow` (HomeScreen) — `com.facebook.react.common.JavascriptException`.

**Root cause:** `mobile/src/screens/HomeScreen.js`, EventRow inline-task list.
`eventTasks.map(t => … t(STATUS_KEY[t.status]) …)` — the callback parameter `t` (the task)
shadowed the i18n `t` from `useTranslation()`. Any event with an inline task whose status is
`pending` / `accepted` / `countered` threw during render. In a release build an unhandled render
error closes the app.

Why it looked like "family switch" / "every start": family **Bros** (id 16) has exactly one such
task; Family Manneh has none. The active family is stored server-side (`family_members.is_active`),
so after switching to Bros both phones loaded it on every launch. Web is unaffected (different code).

Your `transformOrigin` note: not the cause (and it is valid in RN ≥0.73). My earlier removal in
`bbb3c5e` stays — harmless, but I was wrong about it.

**Fix:** renamed the callback parameter to `task` (HomeScreen.js lines 243–251).

**Tests (TDD, red → green):**
- `web/src/context/MobileHomeEventRow.test.js` — renders the real `EventRow` (extracted via Babel)
  with an inline pending task. Failed with `t is not a function`, passes after the fix.
- `mobile/src/__tests__/ui-error-boundary.test.js` — new error boundary (below).
- Full gate `node scripts/run-unit-tests.cjs`: 182 backend, 78 web, 34 mobile, 18 UI — all green.

**Error boundary (your item 4, John approved):**
- `mobile/src/components/AppErrorBoundary.js` — class boundary + `installGlobalErrorHandler()`
  (routes **fatal** `ErrorUtils` errors to the boundary, non-fatal to the previous handler).
  Shows "Something went wrong" + message + "Try again" (remounts the tree). Plain RN + i18next,
  no theme/provider dependency. New keys `common.try_again` in en/de.
- Wired in `mobile/App.js` inside `GestureHandlerRootView`.
- `mobile/jest.availability.config.cjs` now also matches `ui-*.test.js`; `scripts/run-unit-tests.cjs`
  ignore pattern widened accordingly.

**Not done / open:**
- Not committed yet; John decides. Then new iOS + Android builds (icon change is already in build 7,
  the crash fix and boundary are not).
- Your item 3 (validate cached snapshot): `utils/cache.js` already validates shape and drops bad data;
  the cache was not involved. No change.
- Your item 5 (crash reporting / Sentry EU): not added. Needs John's decision (privacy policy, Play data
  safety). Recommend yes — this bug cost three builds without it.
- Earlier items (BUG-001 check, DISC-002, `.omc/` in .gitignore, stale lock files) untouched.

## 2026-10-30 — BUG-003 + icon  [done in `bbb3c5e`]
Tilt flip removed (`TILT_DIR = 1`, moved to `treadmillRoll.js`); avatars now signed Cloudinary
delivery URLs refreshed on every read (`withFreshAvatar`), legacy `avatar-N` kept; initials fallback
on image error; `app.json` icon → `assets/brand/icon-1024.png`, Android adaptive → your
`android-icon-foreground-brand.png` / `android-icon-monochrome-brand.png`. Pushed with `845a87d`, `a754ca2`.
Railway must run `bbb3c5e` for photos to show.
