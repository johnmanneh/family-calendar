# Design: pickup confirmation (planned, not built)

Status: planned (John, 16 Oct 2026). Wait for John's go before building.

**Goal:** when someone else picks up a child, everyone sees at a glance that it's handled, without
texting. Buttons and a coloured status only. If people want to explain something, they use WhatsApp.

The pickup person can be **anyone**: a grandparent (in our family usually Oma), a babysitter,
another family member, a friend's parent. Some have the app, many don't. Both must work the same way.

---

## 1. Pickup people (per family)

A saved list, so choosing the person is one tap.

- **In the app:** anyone already in the family or a shared group.
- **Outside the app:** name + phone number (used only to open WhatsApp with the link).
- Order is up to the parent (the person used most often comes first).
- Table `pickup_people` (id, family_id, user_id nullable, name, phone nullable, sort_order,
  created_by, created_at). Exactly one of `user_id` or `name` is set.
- Only parents/managers of a child can edit the list (same rules as `managesChild`).

## 2. Asking someone to pick up

On an event for a child (e.g. "Kita · Emmanuel · 12:00"): **Pickup by → choose a person**.

- In-app person: gets a push notification with the buttons.
- Outside the app: **Send** opens WhatsApp with a short ready message and a personal link
  `https://its4us.app/p/<token>`. The parent just taps send.
- Table `pickups` (id, event_id, child_id, person_id → pickup_people, token, status,
  status_at, created_by, created_at, expires_at, revoked_at).
- One active pickup per event. Asking someone else replaces it (the old link stops working).

## 3. The pickup person's buttons (no typing)

| Step | Buttons |
|---|---|
| Asked | **Yes, I'll go** · **Can't** |
| Agreed | **Picked up** · **Can't make it anymore** |
| Done | (nothing, shows "Thank you") |

They can cancel at any time before "Picked up" (emergencies). No reason field.

## 4. What the family sees

One status chip on the event card, day list and event screen. Icons are from the icon set the app
already uses (MaterialCommunityIcons on mobile, matching SVGs added to the web `Icon` component),
not emoji.

| Status | Icon | Colour | Text |
|---|---|---|---|
| Asked | `clock-outline` | grey #8E8E93 | Asked · Oma |
| Going | `account-check` | teal #1a8fa8 | Oma's going |
| Picked up | `check-circle` | green #3B8456 | Picked up 12:08 |
| Pickup needed | `alert-circle` | red #D93025 | Pickup needed + **Ask someone else** |

Buttons for the pickup person use the same icons: `check` (Yes, I'll go), `close` (Can't),
`human-male-child` (Picked up), `alert-octagon-outline` (Can't make it anymore).

**Notifications** to every parent/manager of the child, one per status change:
- "Oma is going to pick up Emmanuel (12:00)"
- "Oma picked up Emmanuel at 12:08"
- **Urgent** (high priority push): "Oma can't pick up Emmanuel (12:00)"
- Nudge if nobody has said yes 2 hours before the pickup time.

**Ask someone else** (on the red status): opens the pickup people list, the parent chooses. The app
never asks the next person automatically; with children, a parent decides.

## 5. Safety

- Each link is for **one pickup only** and expires at the end of that day. Revoked when the parent
  asks someone else or cancels.
- The pickup page shows only: child's **first name**, time, place name, and who asked. No notes,
  no address details beyond the place, no other events, no family members.
- Tokens: 32 random bytes (64 hex chars), checked by format before any lookup, never logged;
  the public endpoints are rate limited.
- Private events can't have an outside pickup link.
- Every status change is stored with time (who/when), so parents can look back.

## 6. API (sketch)

```
POST   /api/events/:id/pickup            { person_id }   parent/manager only → creates pickup (+ link)
DELETE /api/events/:id/pickup                            cancel / revoke
GET    /api/pickup-people                                 list for the family
POST   /api/pickup-people                { name, phone } or { user_id }
PATCH  /api/pickup-people/:id  · DELETE /api/pickup-people/:id
POST   /api/pickups/:id/respond          { action }       in-app person: accept | decline | picked_up | cancel
GET    /api/public/pickups/:token                         outside person: page data
POST   /api/public/pickups/:token        { action }       outside person: same actions
```

Status rules (server): asked → going | declined; going → picked_up | cancelled.
declined/cancelled show as **Pickup needed**. Actions not allowed from the current status are refused.

## 7. Build order

1. Backend: tables (versioned migration), endpoints, status rules, notifications, tests.
2. Mobile: pickup people list, "Pickup by" on the event, status chip, in-app buttons.
3. Web: public pickup page `/p/:token` (the outside person's buttons), status chip on web.
4. Later: "Home safe" step, weekly plans (Oma every Tuesday), missed-pickup reminder.
