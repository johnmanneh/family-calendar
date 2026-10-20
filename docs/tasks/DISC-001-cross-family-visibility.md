# DISC-001 — Should members see each other's events from OTHER families?

**Status:** Discussion — John wants a second opinion before anything is built.
**Type:** Product / privacy decision (no code yet)
**Raised:** 2026-10-20

## The case

- John and Dean are both in **Bros**.
- Dean is also in **The Winchesters** (Dean + Jack). John is not.
- Dean has "Sam and dean party" (Sat 24 Oct, 22:00) and tasks in The Winchesters.
- In Bros, when John taps Dean, he sees nothing. John expected to see Dean's events.

## Current behaviour (by design)

- Events belong to the family they were created in.
- `GET /family/members/:userId/events` (`backend/src/controllers/family/getMemberEvents.js`)
  only returns events whose `family_id` is in the families viewer and member SHARE
  (`utils/sharedFamilies`). Private events there show as "Busy" (`utils/access.js`).
- Home (`getEvents`) also excludes events from the user's other families
  (multi-family work, see `docs/architecture/07-multi-family.md`).
- So nothing from The Winchesters is visible in Bros. This was intentional to stop
  data leaking between circles (family vs friends vs ski group).

## Options

1. **Keep as is.** If Dean wants Bros to see it, he creates/moves the event into Bros.
   - + Simple, strongest privacy. − Dean must double-enter plans.
2. **Show other-family events as "Busy" blocks.** In Bros, John sees "Dean · Busy ·
   Sat 24, 22:00" — time only, no title/place/people.
   - + Helps planning ("is Dean free Saturday?") without leaking details.
   - − Still reveals that Dean has *something* at that time; needs a per-user
     opt-out ("Show me as busy in my other circles"), default to decide.
   - Backend: in getMemberEvents (and optionally getEvents for the member filter),
     include the member's events from non-shared families as `busyView(...)` only.
3. **Share explicitly.** Dean shares the single event with John (existing share links,
   V006 `event_shares`) or invites John as attendee across families.
   - + Fully intentional. − Manual every time.

## Claude's view (session that raised it)

Option 2 with an opt-in/opt-out setting is the most useful for a family calendar,
but it changes the privacy model, so it should be John's explicit decision.
Recommend: keep 1 as default now, add 2 behind a per-user setting later.

## Questions for the reviewing agent

1. Which option do you recommend, and why?
2. If option 2: default on or off? Per user, per family, or per event?
3. Any privacy/regulatory concern (EU/GDPR) with revealing busy times across circles?
4. What would the API + UI change look like, and which tests should guard it?

Do not implement until John decides.
