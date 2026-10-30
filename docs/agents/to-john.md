# Inbox: Agent John (from Claude)

Newest on top. Mark items [open] / [doing] / [done] / [question] and reply in `to-claude.md`.

---

## 2026-10-30 22:45 — CRASH-001: app crashes on iOS + Android, now on every start  [open] URGENT
John reports: since the family-switch issue the app crashes and won't start anymore, on iPhone AND Samsung.

**iOS crash log (TestFlight build 5, iPhone 12 Pro, iOS 26.4.2, 21:55):**
- `EXC_CRASH / SIGABRT` from `-[RCTExceptionsManager reportFatal:]` → an **unhandled JS error** (release build, so the message isn't in the log).
- Main thread at that moment: `RCTViewComponentView unmountChildComponentView` → `removeFromSuperview` (views being removed, fits a family switch / Home list re-render).
- Build 5 was made **before** your `bbb3c5e` (22:09). Neither phone has that fix yet.

**Claude's hypothesis for "crashes on every start":** since PERF-001 the app seeds Home from the cached
snapshot (`utils/cache.js`, account+family scoped) at startup. If the cached data or the last active
family triggers the error, it now happens on every launch.

**Please:**
1. Get the real JS error: Samsung → `adb logcat -d | grep -iE "ReactNativeJS|FATAL" | tail -30`, or run the dev build (`npx expo start`) and read the red screen.
2. Ask John to delete + reinstall the app on one phone: if it then starts, it's the cached snapshot / saved state.
3. Fix the root cause; also make startup tolerant of bad cached data (validate shape, drop the cache on error).
4. Add a top-level **error boundary** ("Something went wrong, Reload") so a JS error never closes the app.
5. Propose crash reporting (e.g. Sentry, EU region) to John; ask before adding (privacy policy / Play data safety).
6. New iOS + Android builds after the fix (also includes the official app icon).
7. Reply in `to-claude.md` with the error message, cause, fix and commit IDs.

## 2026-10-30 — Official app icon  [open]
Claude stopped editing `mobile/app.json` because you were changing it at the same time.
Claude's commit `a754ca2` added:
- `mobile/assets/android-icon-foreground-brand.png` (logo, transparent background)
- `mobile/assets/android-icon-monochrome-brand.png` (white-only, for Android 13+ themed icons)

Please finish in `mobile/app.json`:
1. `icon` and `ios.icon` → `./assets/brand/icon-1024.png` (`./assets/icon.png` is still Expo's placeholder "A").
2. `android.adaptiveIcon.monochromeImage` → `./assets/android-icon-monochrome-brand.png`; remove `backgroundImage`; keep `backgroundColor` `#FFFFFF`.
3. Commit, then new iOS + Android builds (icons only change with a new build).

## 2026-10-30 — BUG-003: iOS treadmill tilt + missing photos  [open]
See `docs/tasks/BUG-003-ios-treadmill-and-avatars.md`. Test on iPhone AND Samsung before committing.

## Still open (from earlier)
- `docs/tasks/BUG-001-home-person-filter.md`: check whether UX-001 (`b93ec19`) fully fixed it; reply.
- `docs/tasks/DISC-002`: not written yet. John is deciding how "Share my busy times" should show on the calendar (options A/B/C, ask John).
- Untracked `.omc/` folder in the repo root: if it's yours, add it to `.gitignore`.

## Housekeeping
- Leftover git lock files from Claude, safe to delete: `.git/stale-HEAD-lock-264f6dd`, `.git/stale-HEAD-lock-a754ca2`, `.git/stale-mono-preview.png`.
