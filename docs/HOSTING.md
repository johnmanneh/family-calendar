# When App — Hosting & Deployment Guide

**Last updated:** October 2026  
**Domain:** its4us.app  
**App:** When — Family Calendar

---

## Architecture Overview

| Layer | Service | URL |
|-------|---------|-----|
| Frontend (React web) | Vercel | its4us.app |
| Backend (Node/Express) | Railway | family-calendar-production-33b3.up.railway.app |
| Database (PostgreSQL) | Railway | managed, internal |
| Mobile (iOS/Android) | App Store / Play Store | via EAS Build |

---

## 1. Domain — its4us.app

**Registrar:** Namecheap  
**Account:** osmanjohnmanneh@gmail.com  
**Cost:** $10.98/year (renews at $18.48/yr)  
**Order:** 216127538  
**Registered:** October 7, 2026

### Notes
- `.app` domains require HTTPS — SSL is handled automatically by Vercel
- Auto-Renew is enabled in Namecheap dashboard
- DNS records need to point to Vercel once frontend is deployed

---

## 2. Backend — Railway

**Service:** Railway.app  
**Repo:** github.com/johnmanneh/family-calendar  
**Root Directory:** `/backend`  
**Start Command:** `npm run start`  
**Region:** US East (Virginia)

### Setup Steps (one-time)

1. Go to **railway.app** → Sign up with GitHub
2. **New Project** → **GitHub Repository** → select `johnmanneh/family-calendar`
3. Inside the service → **Settings** → set **Root Directory** to `backend`
4. Set **Custom Start Command** to `npm run start`
5. Click **Deploy**

### Add PostgreSQL Database

1. Inside the Railway project → **New Service** → **Database** → **PostgreSQL**
2. Railway creates the database and auto-generates `DATABASE_URL`
3. Go to your backend service → **Variables** tab
4. Add the `DATABASE_URL` variable — Railway links it automatically from the PostgreSQL service

### Environment Variables (set in Railway Variables tab)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-filled by Railway PostgreSQL service |
| `JWT_SECRET` | Your long secret string (keep this private) |
| `PORT` | Leave empty — Railway sets this automatically |

### Run Database Migrations

After first deploy, run migrations via Railway Console:

1. Open your backend service → **Console** tab
2. Run each migration file in order:
```bash
psql $DATABASE_URL -f src/config/migrations/001_create_users.sql
psql $DATABASE_URL -f src/config/migrations/002_create_families.sql
# ... continue for all migration files in order
```

Or run them all at once:
```bash
for f in src/config/migrations/*.sql; do psql $DATABASE_URL -f "$f"; done
```

### Grant Database Permissions

After running migrations, grant permissions to your database user:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO family_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO family_admin;
```

---

## 3. Frontend — Vercel

**Service:** Vercel.com  
**Account:** mannelkuch@icloud.com (signed up Oct 8 2026 — GitHub connection failed, used email instead)  
**Team/Workspace:** when5  
**Project Name:** family-calendar  
**Live URL:** https://its4us.app  
**Vercel URL:** https://family-calendar-ruby.vercel.app  
**Project ID:** prj_OEraYAIaa6drTCnvI8wERI3xbnk3  
**Repo:** github.com/johnmanneh/family-calendar  
**Root Directory:** `web`  
**Build Command:** `npm run build` (auto-detected)  
**Output Directory:** `build` (auto-detected)

### Setup Steps (completed Oct 8 2026)

1. Signed up at vercel.com with `mannelkuch@icloud.com`
2. **New Project** → Import `johnmanneh/family-calendar`
3. Set **Root Directory** to `web`
4. Added environment variables (see below)
5. Deployed successfully

### Connect its4us.app Domain (completed)

DNS records added in Namecheap → Advanced DNS:

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | `216.198.79.1` |
| CNAME Record | `www` | `76abdbb8ea22ce70.vercel-dns-017.com.` |

Both `its4us.app` and `www.its4us.app` → Valid Configuration ✓

### Environment Variables (set in Vercel dashboard)

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://family-calendar-production-33b3.up.railway.app/api` |
| `CI` | `false` |

---

## 4. Mobile — EAS Build (Expo)

**Service:** Expo Application Services (EAS)  
**Account:** EAS project ID `926305bd-ac2a-414c-b6b0-04c45b48a607`  
**Bundle ID (iOS):** `com.songsanchaun.when`  
**Package (Android):** `com.songsanchaun.when`

### Build Commands

```bash
cd mobile

# Development build (for testing on device)
eas build --platform android --profile development
eas build --platform ios --profile development

# Production build (for App Store / Play Store)
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Update Backend URL in Mobile

The mobile app points to the backend. Update the API URL in:
```
mobile/src/api/axios.js  (or equivalent config)
```

Change `http://192.168.x.x:8000` to your Railway backend URL.

---

## 5. App Store Publishing

### Apple App Store

- **Account:** Apple Developer Program — $99/year
- **Enroll at:** developer.apple.com
- **Privacy Policy URL:** https://its4us.app/privacy.html
- **Support URL:** https://its4us.app
- **Submit with:** `eas submit --platform ios`

### Google Play Store

- **Account:** Google Play Console — $25 one-time
- **Enroll at:** play.google.com/console
- **Closed testing:** Recruit 20 testers, run for 14 days before production release
- **Privacy Policy URL:** https://its4us.app/privacy.html
- **Submit with:** `eas submit --platform android`

---

## 6. Privacy Policy

**File:** `web/public/privacy.html`  
**Live URL:** https://its4us.app/privacy.html  
**Contact:** osmanjohnmanneh@gmail.com

---

## 7. Key Accounts Summary

| Service | Account | Notes |
|---------|---------|-------|
| Namecheap (domain) | osmanjohnmanneh@gmail.com | its4us.app registered |
| Railway (backend) | GitHub login | johnmanneh |
| Vercel (frontend) | osmanjohnmanneh@gmail.com | Pending — retry after 48hrs |
| EAS / Expo | — | Project ID in app.json |
| Apple Developer | — | Enroll when ready to publish |
| Google Play | — | Enroll when ready to publish |

---

*Generated October 2026 — update this doc whenever a service changes.*
