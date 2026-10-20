# PERF-001 — Make switching family feel instant (mobile)

**Status:** Done — cache-first family switch; extra onSelect fetch removed. Optimistic switchFamily not done.
**Area:** mobile (`mobile/src/screens/HomeScreen.js`, `mobile/src/context/FamilyContext.js`)
**Reported:** 2026-10-20 — switching between families on Home (e.g. Family Manneh ↔ Bros) takes several seconds and shows a spinner.

## Why it is slow (findings)

1. **Two round trips in a row.** `FamilyFilterBar.onSelect` does
   `await switchFamily(id); fetchEvents();` — it waits for `PATCH /family/active`
   to finish before anything loads, then loads `/events`, `/tasks/family`, `/groups`.
2. **Double / wasted fetch.** The `onSelect` call to `fetchEvents()` runs right after
   `switchFamily` resolves, often before React has re-rendered, so `familyIdRef`
   still holds the OLD scope → it fetches the old family (wasted). Then the effect
   keyed on `activeScope` (HomeScreen ~line 980) fetches again for the new family.
3. **Blank list + spinner.** Since b9afba2, a scope change in `fetchEvents` clears
   events/tasks and sets `loading`. The per-family offline snapshot
   (`utils/cache.js`, keyed `[userId, familyId]`) already exists on the phone but is
   only read when the network fails.

## What to build

1. **Show the cached snapshot immediately on a scope change** (stale-while-revalidate):
   when `dataScope.current !== familyId`, after the synchronous reset, `loadCache(familyId)`
   and, if still current (`isCurrent()`), show it with the "last updated" label while
   the network refresh runs. Replace with fresh data when it arrives.
   - Must stay account+family scoped. Never show another family's snapshot.
   - Keep the existing rule: a partial response never overwrites a good snapshot.
2. **Remove the extra `fetchEvents()` from `FamilyFilterBar.onSelect`** —
   the `activeScope` effect already refreshes once, for the right family.
3. **Optional (ask John first): optimistic switch** in `FamilyContext.switchFamily`:
   set the active family/members locally first, then `PATCH /family/active` in the
   background; on failure roll back and show an error.

## Acceptance

- Switching family shows that family's last-known events/tasks within ~100 ms
  (no spinner when a snapshot exists), then updates silently.
- Exactly one `/events` + `/tasks/family` + `/groups` round per switch (check logs).
- No data from family A is ever visible while family B is active, including
  after rapid A→B→A switching (existing `requestId` / `isCurrent` guards stay).
- Offline: switching still shows the cached snapshot with the offline banner.
- Treadmill list behaves the same in every family (see `components/treadmillRoll.js`).

## Tests

- Add mobile unit tests (`mobile/src/**/*.test.js`, run by the pre-commit gate)
  for the scope-change + cache-seed logic. Consider extracting it into a pure
  helper like `utils/homeRefresh.js` (which already has tests).
- Run `node scripts/run-unit-tests.cjs` before committing.

## Notes

- Do not touch the unrelated, uncommitted Android card overflow change in
  `HomeScreen.js` / `HomeScreen.styles.js` unless John says so.
- Mobile app only; no backend changes needed.
