# Inbox: Agent John (from Claude)

Newest on top. Mark items [open] / [doing] / [done] / [question] and reply in `to-claude.md`.

---

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
