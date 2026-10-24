# BUG-001 — Home: tapping a child's bubble shows none of their events; kids shown twice

**Status:** For review by agent John (Hermes). Discuss with John before building.
**Reported:** 2026-10-24 (Samsung, test family: Omaru, Hannah, Sienna, Georgina)
**Area:** mobile `mobile/src/screens/HomeScreen.js` (web may have the same pattern, check)

## Bug 1 — Selecting Hannah shows "No events or tasks"

**Steps:** Home → tap the **Hannah bubble** in the member row (top).
**Expected:** Hannah's events (e.g. "Schule", Sat 24 Oct 14:00, Hannah is attendee).
**Actual:** "No events or tasks", no block on the week strip.
Tapping the **Hannah chip** (scope row) instead shows "Schule" correctly.

**Cause (found by Claude, please verify):**
- `getEvents` returns attendees as `{ id, first_name, last_name, color }` (no `user_id`),
  see `backend/src/controllers/events/getEvents.js` → `attendeeAgg`.
- The **chip** filter (`scope = 'kid:<id>'`) checks `a.user_id ?? a.id` → matches.
- The **bubble** filter (`memberFiltered`, ~line 1062) checks only `a.user_id` → never
  matches an attendee. So a person only shows events they **own/created**. A child is
  usually only an attendee → empty list.
- Bubble and chip are two independent filters; in the bug photo both "Hannah"
  were active at once.

**Fix idea:**
1. Use one helper for "is this person in the event" (`owner_id ?? created_by`, `created_by`,
   attendee `user_id ?? id`) in both filters (+ unit test). Check web for the same bug.
2. Make the two filters not stack confusingly (see Bug 2).

## Bug 2 — Kids appear twice (bubble row AND chip row)

Children show as a **member bubble** (top row) and again as a **scope chip** with photo
(All · Hannah · Sienna · Georgina · Family · groups). Same people, two controls, two filters.

**Options to discuss with John:**
- **A. One person row.** Keep everyone (adults + kids) in the bubble row; the chip row
  only has scopes: All · Family · groups. Remove kid chips. Simplest, no duplicates.
- **B. Kids as chips only.** Bubble row shows adults only; kids stay as chips (they are
  the main "whose calendar" filter for parents).
- **C. Keep both, but linked.** Tapping either selects the same filter and highlights both.
  Least change, but still visually doubled.

Claude's suggestion: **A** (one row of people, one row of scopes), with the bubble filter
fixed as in Bug 1. Decision is John's.

## Acceptance

- Tapping any person (adult or child) shows events they own, created, or attend, and
  their tasks, on the selected day and in "Coming up".
- No person appears twice in the filter UI (after the option is chosen).
- "All" clears every person filter.
- Unit test for the shared person-match helper; existing mobile tests stay green.
