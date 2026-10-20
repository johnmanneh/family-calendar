# DISC-001 — Should members see each other's events from OTHER families?

**Status:** Implemented and verified locally; final independent review passed. Not deployed.
**Type:** Product / privacy decision and implementation record
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

John approved implementation following the review. No live database migration or deployment is authorised by that approval.

## Approved design

- Keep event-detail visibility and family calendar lists isolated. Do not add other families' busy event objects to member profiles or calendars.
- Add a person's own availability opt-in per **receiving family**, default **off**. The grant applies to current and future members of that receiving family and to future commitments. Admins/delegates cannot set another adult's choice; managed children do not opt in through this adult endpoint.
- Example: John belongs to Manneh and Bros; Dean belongs to Winchester and Bros; IM belongs to Bros. Dean may opt in on his Bros membership. John/IM can then check Dean's busy status, never Jack's unrelated calendar, Winchester's identity or source event metadata.
- Count only a person's owned-calendar events and accepted attendance. Pending invitations, cancelled events and other family members' unrelated events do not block that person.
- `events.hide_cross_family_availability` excludes the event from cross-family checks without changing existing event visibility or the owner's own conflicts. It is not an additional secrecy rule for events already visible in the receiving family.
- Busy is a warning, not a restriction on sending invitations. Distinguish `busy`, `no_known_conflict` and `not_shared`; missing/error/loading information is never displayed as free.
- Expire ready availability snapshots after 30 seconds and revalidate on browser focus/visibility or mobile foreground changes.
- Explicit, accepted group-event sharing remains available. Group membership alone must not expose a person's other commitments. Remove the older automatic group-only busy-block listing path.

## Implementation interfaces

- V010 adds `family_members.share_availability BOOLEAN NOT NULL DEFAULT FALSE` and `events.hide_cross_family_availability BOOLEAN NOT NULL DEFAULT FALSE`.
- `GET /api/family/all` returns the signed-in user's own membership preferences.
- `PATCH /api/family/availability { family_id, share_availability }` changes only the signed-in adult's own membership. Unknown/other-user targeting fields and non-boolean settings are rejected.
- `POST /api/events/availability { start, end, user_ids, family_id, exclude_event_id?, tz? }` validates membership in the receiving family and returns `busy`, `not_shared` and `availability: [{ user_id, status }]`. No source event IDs, source family, title, location, attendees or tasks are returned.
- Legacy requests omitting `family_id` do not receive cross-family data. Current limits are 100 requested people and a 366-day window.
- Exclusion IDs are honoured only for an event the viewer can edit in the receiving family; guessed foreign IDs are ignored without a distinguishable response.
- Web: own-family sharing controls in SidebarFamily; advisory statuses and event exclusion in EventModal; API operations live in context.
- Mobile: own-family sharing controls in FamilyScreen; advisory statuses and event exclusion in EventFormScreen; availability service/hook handle requests and snapshot invalidation.

## Verification and release notes

Local checks completed successfully; final independent review passed with no blocking security or logic findings:

- Backend Jest: 109 tests.
- Isolated PostgreSQL availability suite: 27 tests; multi-family suite: 18 checks; delegation suite: 54 checks; event-sharing suite: 27 checks. Each suite used its own temporary cluster, which was stopped afterward.
- Web Jest: 68 tests; mobile focused Jest: 15 tests.
- Normal web production build succeeded with pre-existing lint/tooling warnings. Strict CI builds still treat the existing lint warnings as errors; unrelated warning cleanup is outside this change.
- Mobile scoped hooks lint passed without warnings. Expo exports succeeded for Android, iOS and web. No TypeScript check was applicable because this mobile project has no TypeScript configuration.

- New integration suite: `backend/tests/availability.test.js`, run with an explicitly isolated `TEST_DATABASE_URL` after loading `backend/src/config/migrations/000_initial_schema.sql`. Example from backend: `TEST_DATABASE_URL=postgresql://localhost/when_test node tests/availability.test.js`.
- Existing multi-family suite also checks default settings and own-membership reads: `TEST_DATABASE_URL=postgresql://localhost/when_test node tests/multifamily.test.js`. Each standalone suite expects its own empty test database.
- Backend unit tests: from backend, `npm test -- --runInBand`.
- Web tests: from web, `CI=true npm test -- --watchAll=false --runInBand`.
- Mobile focused tests use existing web tooling without installing dependencies: from mobile, `node ../web/node_modules/jest/bin/jest.js --config jest.availability.config.cjs --runInBand`.
- Apply V010 through the established migration process before running the updated controllers against an application database. Do not rewrite older migrations.
- Tests and exports are not a substitute for checking the UI on actual Android/iOS devices. No live database or deployment was touched during local implementation.
- Existing timed recurrence uses the request/viewer's timezone because events do not store an originating timezone. Origin-timezone semantics and month-end recurrence remain separate, pre-existing scheduling questions; do not claim full international recurrence support from this change.
- This implementation is not a regulatory compliance determination. The original EU/GDPR question still requires a jurisdiction-appropriate privacy review before release.
