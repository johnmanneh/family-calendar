# Design: PDF and email import (planned, not built)

Status: planned (John, 15 Oct 2026). Extends the existing schedule scan (`docs/SCAN.md`).
Goal: besides photos, families can turn **PDFs** (school letters, term plans) and **emails**
(from school, kindergarten, clubs) into calendar events, with the same "review before saving" flow.

Context: competitor KaiROS (kairoscalendar.com, US) offers flyer, PDF and email parsing.
When's angle is the EU market, so privacy and GDPR are design requirements, not extras.

---

## 1. One pipeline, three inputs

```
Photo ─┐
PDF ───┼─► extract ─► AI → suggestions ─► review screen ─► POST /api/scan/import
Email ─┘   (text or     (same JSON         (existing,          (existing, unchanged:
            page images)  contract)          reused)             dedupe, owner, colour)
```

Everything after "suggestions" already exists: validation (`clean()`), the review UI
(web ScanModal, mobile ScanScreen), duplicate skipping, the child colour and notifications.
New work is only on the **input side**.

## 2. PDF import

- **Upload:** web file picker (`accept=".pdf"`); mobile `expo-document-picker`.
  Same endpoint family: `POST /api/scan` accepts `application/pdf` (max ~10 MB, max ~5 pages).
- **Server:**
  1. If the PDF has a text layer (most school letters): extract the text (e.g. `pdf-parse`)
     and send **text only** to the model. That's cheaper and more accurate than images.
  2. If it's a scanned PDF (no text): render pages to images and use the existing vision path.
- Nothing is stored: the file stays in memory and is dropped after the response, as with photos.

## 3. Email import

Two stages, simplest first:

**Stage A: forward to When (recommended first)**
- Each family (or each child) gets a private import address,
  e.g. `emmanuel-7f3k@in.its4us.app`. It's shown in the child profile with a Copy button.
- Parents forward school emails there, or set an auto-forward rule in their mail app.
- An inbound-mail service (e.g. Postmark or Mailgun inbound, EU region) POSTs the parsed email
  (text body + PDF/image attachments) to a webhook: `POST /api/inbound/email`.
- The server maps the address to the owner (the child), runs the body and attachments through
  the same pipeline, and saves the result as **pending suggestions**, not as events.
- The parent gets a notification ("3 dates found in 'Elternbrief Oktober'") and reviews them in
  the app; the existing import saves them.
- Needs a new table `import_suggestions` (id, family_id, owner_id, source, subject,
  received_at, payload JSONB, status pending/imported/dismissed, expires_at ~30 days).

**Stage B (later): share sheet**
- On the phone, "Share → When" from Mail, Gmail or Files (iOS share extension / Android intent).
  It opens the scan review with the shared text or PDF. Needs native config (EAS build).

## 4. Security and privacy (EU / GDPR)

- **Import addresses are secrets:** long random tokens, can be regenerated, and only accept mail
  that passes SPF/DKIM checks. Optionally only from senders the family allowed.
- Unknown or invalid addresses are silently dropped, with no bounce that reveals anything.
- Email content is **untrusted** (same rule as photos): never follow instructions in it, and
  validate everything.
- **Data minimisation:** don't store the raw emails or files. Keep only the extracted
  suggestions, and auto-delete them after 30 days.
- **Hosting/processors in the EU** where possible: Railway EU region, an EU inbound-mail region.
  The AI provider (currently Groq, US) needs a DPA and a transfer basis, or switch to an
  EU-hosted model (e.g. Mistral) for EU users. To be decided before launch.
- Update the privacy policy: what's processed, by whom, retention, and how to delete.

## 5. Cost and limits

- Text-only PDFs and emails are much cheaper than images.
- Counts against the same scan balance as photos (see the scan-packs plan): 1 import = 1 scan.
- Rate limit per family (e.g. 20 inbound emails a day) to stop abuse and forwarding loops.

## 6. Open decisions

1. One import address per **family** or per **child**? (Per child lets us set the owner automatically.)
2. Inbound provider: Postmark vs Mailgun (both have EU options).
3. AI provider for EU users: keep Groq with a DPA, or move to an EU-hosted model.
4. Stage B (share sheet) now or after launch?

## 7. Build order (when approved)

1. PDF upload with a text layer → existing review (web + mobile).
2. Scanned PDF → page images → vision.
3. Import address + inbound webhook + `import_suggestions` + notification + review list.
4. Share sheet (native).
