# Design: single-event sharing, logistics fields and RSVP (planned, not built)

Status: planned (John, 15 Oct 2026). These are the features seen at KaiROS (kairoscalendar.com),
adapted to When. Pricing is excluded (John decides later). PDF/email import is in `04-document-email-import.md`.

Feature comparison and status

| Feature (KaiROS) | When today | Plan |
|---|---|---|
| Photo of a flyer → events | ✅ Scan schedule | done |
| PDF / email → events | – | doc 04 |
| Colour-coded per person | ✅ member colours, child colour follows | done |
| Tag kids without email invites | ✅ child profiles (no login) | done |
| Share one event with grandparents/sitter | – | **§1 below** |
| Who's driving / pickup | – | **§2** |
| What to bring / gear list | (tasks exist, but per event) | **§2** |
| RSVP (where/by when) | – | **§3** |
| Chores | ✅ tasks with assignee, accept/decline | improve later (recurring chores) |
| Meal planner (KaiROS "coming soon") | – | backlog, not designed |

---

## 1. Share a single event (with people outside the family)

Goal: "Share the event, not your whole life." Grandparents, a sitter or another parent see **one**
event, without an account and without seeing anything else.

- **Share button** on the event (owner/creator, or a manager of the child) → creates a share link:
  `https://its4us.app/e/<token>`. The token is long, random and unguessable.
- New table `event_shares` (id, event_id, token, created_by, created_at, expires_at,
  revoked_at, show_notes bool, show_location bool, allow_rsvp bool).
- **Public page** (web, no login): title, date/time, location, driver, bring list and, if allowed,
  notes. An "Add to my calendar" button downloads an `.ics` file. Nothing else from the family is visible.
- **The owner controls it:** list of active links, revoke anytime, optional expiry (default: 7 days
  after the event). Private events can't be shared by link.
- **Updates:** the link always shows the current version of the event. If the event is deleted,
  the page says "This event is no longer available".
- **Optional:** share by WhatsApp/SMS using the phone's share sheet (just sends the link).
- **Security:** read-only endpoint `GET /api/public/events/:token` returns a fixed, minimal set of
  fields (no IDs, emails or other events); rate limited; tokens never appear in logs. Can't be used
  to enumerate events.

## 2. Logistics fields: driver and "what to bring"

Built-in fields instead of a generic notes box.

- **Driver / pickup:** `events.driver_user_id` (a family member) or `driver_name` (free text,
  e.g. "Oma Beatrice"). Optionally separate **drop-off** and **pick-up** (`pickup_user_id`).
  - Shown on the event card ("🚗 John drives") and in the day list.
  - The assigned driver gets a notification and a reminder before the event.
  - Shown in the availability check: a driver who's busy at that time gets a warning.
- **What to bring:** a checklist per event, table `event_items` (id, event_id, text, done,
  assigned_to nullable).
  - Kids' events from a scan can pre-fill it ("Schwimmsachen", "Znüni") when the AI finds them.
  - Checked off on the phone; everyone in the family sees the progress.
  - Reuses the existing task UI patterns (tick, assignee).
- Both show in the single-event share page (§1), so the sitter knows who drives and what to bring.

## 3. RSVP

Two cases:

**a) An external RSVP (the school or club asks for an answer)**
- Fields: `rsvp_by` (deadline date), `rsvp_url` or `rsvp_contact` (email/phone), `rsvp_status`
  (open / answered / declined).
- A reminder before the deadline ("Answer the Laternenfest invitation by Friday").
- The scan/PDF/email import fills these when the document says "Anmeldung bis …".

**b) RSVP for people you shared with (§1)**
- On the share page, if `allow_rsvp`: "Coming / Not coming / Maybe" + name (no account needed).
- Table `event_share_responses` (share_id, name, response, created_at); the owner sees the
  list and gets a notification.
- Light anti-spam: rate limit and one response per browser.

(Family members already have Accept/Decline through invitations, which stays as is.)

## 4. Privacy / GDPR (EU focus)

- Share pages show only what the owner chose; private events are never shareable.
- External names in RSVPs are personal data: store the minimum, delete them with the event or
  30 days after it.
- Links can be revoked and expire; the privacy policy explains public links.

## 5. Build order (when approved)

1. Logistics fields: driver + bring list (web + mobile + scan pre-fill).
2. External RSVP fields + deadline reminder (+ import fills them).
3. Single-event share link + public page + .ics + revoke.
4. RSVP on the share page.
5. Later: recurring chores, meal planner (backlog).
