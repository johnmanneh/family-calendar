# When — Schedule Scan Feature

## Overview

The scan feature lets a family member photograph a printed schedule (e.g. a school or kindergarten weekly plan) and import the events directly into a family calendar. The AI reads the photo, extracts events as suggestions, and the user reviews them before anything is saved.

---

## Architecture

```
User uploads photo
        ↓
POST /api/scan          → AI reads photo → returns suggestions (nothing saved)
        ↓
User reviews + approves
        ↓
POST /api/scan/import   → validates + saves approved events to database
```

Nothing is written to the database on the first call. The photo is held in memory only and never stored or logged.

---

## AI Provider

**Provider:** Groq  
**Model:** `qwen/qwen3.8-27b` (Qwen 3.8 27B — vision capable)  
**Cost:** Pay-as-you-go on Groq developer plan (~$0.80/$4.00 per 1M tokens — very cheap for family use)  
**Free tier:** Groq developer plan has generous rate limits

### Why Groq + Qwen

| Provider | Reason rejected |
|----------|----------------|
| Anthropic (Claude) | No free tier — requires paid credits |
| Google Gemini | Free tier hit 503 overload errors under light use |
| Groq + Llama | No vision-capable model available on developer plan |
| **Groq + Qwen** | Vision capable (20MB file limit), fast (450 t/sec), reliable |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Required — Groq API key from console.groq.com |
| `GROQ_MODEL` | Optional — overrides default model (`qwen/qwen3.8-27b`) |

---

## API Endpoints

### POST /api/scan

Reads a schedule photo and returns event suggestions. Nothing is saved.

**Auth:** Required (Bearer token)  
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | JPG, PNG, WEBP or GIF, max 8MB |
| `owner_id` | number | No | Whose calendar to add to (defaults to self) |
| `tz` | string | No | Timezone (defaults to `Europe/Zurich`) |

**Response:**
```json
{
  "owner_id": 3,
  "events": [
    {
      "title": "Elternabend",
      "all_day": false,
      "start_date": "2026-10-15T17:00:00.000Z",
      "end_date": "2026-10-15T18:00:00.000Z",
      "notes": null,
      "evidence": "Elternabend 19:00 Uhr",
      "ambiguous": false
    }
  ]
}
```

---

### POST /api/scan/import

Saves the approved events to the database. Safe to retry — duplicates are skipped.

**Auth:** Required (Bearer token)  
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | array | Yes | Approved events from the review screen |
| `owner_id` | number | No | Whose calendar to add to (defaults to self) |
| `tz` | string | No | Timezone (defaults to `Europe/Zurich`) |
| `category` | string | No | Category label for all imported events |

**Response:**
```json
{ "created": 4, "skipped": 1 }
```

---

## Controller

```
backend/src/controllers/scan/scan.js
```

Key functions:

| Function | Purpose |
|----------|---------|
| `readWithGroq()` | Calls Groq API with image + prompt, returns raw JSON |
| `clean()` | Validates and normalises one raw event entry |
| `extract` | Handler for `POST /api/scan` |
| `importEvents` | Handler for `POST /api/scan/import` |

---

## Security

- The image is never stored — held in memory only (`multer.memoryStorage()`)
- The AI prompt explicitly tells the model to ignore any instructions written in the photo
- The model output can only produce suggestions — it never controls ownership, visibility, or database actions
- Permission is checked via `canManageCalendar()` on both endpoints (not just the first one)
- Duplicate check on import: same `owner_id + title + start_date` → skip, so retries never double-insert

---

## Express Trust Proxy

Railway runs behind a load balancer. `app.set('trust proxy', 1)` is set in `createApp.js` so that `express-rate-limit` can read the real client IP from the `X-Forwarded-For` header correctly.
