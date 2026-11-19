# Briefly: Stay Informed. Stay Ahead. Briefly.

A full-stack news app that shows the top 60 stories (30 India + 30 World), ranked, de-duplicated,
summarised, and linked to the original publishers. News is fetched live from news APIs and publisher
RSS feeds into PostgreSQL; **there is no sample or placeholder data anywhere in the code.** If the database
is empty the home page says so instead of faking content.

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui-style components · Lucide ·
Prisma + PostgreSQL · jose (JWT sessions) + bcryptjs · zod.

---

## Quick start

Requirements: Node 20+, a PostgreSQL database (local, Supabase, Neon, Railway…).

```bash
npm install
cp .env.example .env          # then edit it (see below)
npx prisma db push            # create tables  (or: npm run db:migrate for tracked migrations)
npm run db:seed               # categories + your admin account
npm run refresh               # fetch real news now (first load)
npm run dev                   # http://localhost:3000
```

Minimum `.env`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | `openssl rand -base64 48` (32+ chars) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for admin | used by `db:seed`; password 10+ chars |
| `GNEWS_API_KEY` | recommended | https://gnews.io (free tier) |
| `GUARDIAN_API_KEY` | recommended | https://open-platform.theguardian.com (free) |
| `NEWSAPI_KEY` | optional | newsapi.org; the free plan is for development only, so use a paid plan in production |
| `ANTHROPIC_API_KEY` | optional | AI summaries; otherwise the extractive fallback is used |
| `CRON_SECRET` | for scheduling | protects `/api/cron/refresh` |

**You can run with zero API keys:** 15 publisher RSS feeds (The Hindu, Indian Express, NDTV, Times of India,
Hindustan Times, Mint, BBC, Al Jazeera, Guardian, DW, NPR, France 24, NYT…) are enabled by default. Adding API
keys increases coverage. Publishers sometimes move or retire feeds; a dead feed shows as "failing" in the admin
dashboard and never affects the others. Edit `src/lib/news/feeds.ts` to change the list.

---

## How it works

```
providers (GNews · Guardian · NewsAPI · RSS)        src/lib/news/providers/*
        │  all implement NewsProvider { fetch(): RawArticle[] }
        ▼
ingest.ts  →  validate → normalise URL → classify → cluster duplicates → summarise → store
        ▼
rescoreAll() →  weighted score per article, one "primary" per event cluster
        ▼
PostgreSQL  ←  pages & API routes read from here only (never from external APIs)
```

* **Fast home page:** requests only read stored rows (plus a 60 s in-process cache). External APIs are touched
  only by the refresh job.
* **Provider failures:** each provider is isolated (`Promise.allSettled`). Failures are logged to the `AppError`
  table and the source's status. If *every* provider fails, nothing is deleted. The site keeps serving stored
  stories and shows a notice with the last successful update time.
* **Adding a provider:** implement `NewsProvider` and add it to `src/lib/news/providers/index.ts`.

### Ranking (`src/lib/news/rank.ts`)

Score 0–100 = recency 30 (8 h half-life) + coverage 25 (distinct credible publishers on the same event) +
importance 20 (consequential-event keywords) + publisher credibility 10 + India/world relevance 10 +
editorial effort 5 (image + substantive description). Weights are in one `WEIGHTS` constant.

* **Duplicates:** headlines are tokenised; articles in the same region within 48 h with Jaccard ≥ 0.5 and ≥ 3
  shared meaningful words join one cluster. Only the best-scoring article per cluster appears in feeds; the rest
  appear as "Related coverage" on the article page.
* **Labels are evidence-based:** *Breaking* = published < 3 h ago and either ≥ 2 distinct publishers or a credible
  publisher (≥ 0.8) using an explicit "breaking" marker. *Trending* = ≥ 3 distinct publishers within 24 h.
  Otherwise no label is shown.
* Publisher credibility defaults come from a small built-in table and can be edited in the admin dashboard.

### Summaries (`src/lib/news/summarize.ts`)

* With `ANTHROPIC_API_KEY`: the model is instructed to use only the supplied headline/description, to omit
  anything the text doesn't state, and to avoid quotes. Failures fall back silently.
* Without it: an extractive summary of 2–4 sentences taken verbatim from the publisher's own description.
* Each article page says which kind of summary it is. Full articles are never stored or shown.
* Honest limitation: some publishers provide one-line descriptions, so some summaries are short. The system
  does not pad them with invented detail.

---

## Features and where they live

| Feature | Location |
|---|---|
| Home: hero, featured story, Top 30 India + Top 30 World | `src/app/page.tsx`, `components/feed-section.tsx` |
| 12 category feeds (+ pagination) | `src/app/category/[slug]` |
| Search (headline, keyword, topic, country, publisher; date filter; relevance/latest; suggestions) | `src/app/search`, `/api/search`, `/api/search/suggest` |
| Article page: summary, key facts, related coverage, bookmark, share, original link | `src/app/article/[id]` |
| Auth, profile, preferences, bookmarks, reading history (all stored per account → cross-device) | `/api/auth/*`, `/api/bookmarks`, `/api/preferences`, `/api/history` |
| Admin: stats, source/API status, manual refresh, hide/delete stories, categories, publisher credibility, users, error log | `src/app/admin`, `/api/admin/*` |
| Light/dark mode | `next-themes`, CSS variables in `globals.css` |

### API reference

Public: `GET /api/news/top` · `GET /api/news?category=&page=&pageSize=` · `GET /api/search?q=&category=&region=&range=&sort=&page=` ·
`GET /api/search/suggest?q=` · `GET /api/articles/:id`
Signed in: `POST /api/auth/{signup,login,logout}` · `GET /api/auth/me` · `GET|POST|DELETE /api/bookmarks` ·
`GET|POST|DELETE /api/history` · `GET|PUT /api/preferences`
Scheduler: `GET|POST /api/cron/refresh` with `Authorization: Bearer $CRON_SECRET`
Admin: `/api/admin/{stats,refresh,articles,catalog,users,errors}`

---

## Scheduled refresh

* **Vercel:** `vercel.json` already schedules `/api/cron/refresh` every 30 minutes. Set `CRON_SECRET` in the project
  environment; Vercel sends it automatically as a Bearer token. (Hobby plans limit cron frequency; use a paid
  plan or an external scheduler for 30-minute runs.)
* **Self-hosted (Node server):** set `ENABLE_INTERNAL_CRON=true` (and optionally `REFRESH_INTERVAL_MINUTES`). The
  server refreshes shortly after boot and then on the interval.
* **Anything else:** `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your.site/api/cron/refresh`
  from cron, GitHub Actions, etc.

Stories older than 14 days are deleted automatically unless a user has bookmarked them.

---

## Deployment

**Vercel + Supabase/Neon (simplest)**
1. Create a Postgres database; copy its connection string (use the pooled/“transaction” URL on serverless).
2. Push the repo to GitHub and import it in Vercel.
3. Add the environment variables from `.env.example` (including `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`).
4. Run migrations once from your machine against the production DB: `DATABASE_URL=… npx prisma db push && npm run db:seed`.
5. Deploy. Trigger the first fill with the admin "Refresh news now" button or the cron endpoint.

**Self-hosted:** `npm run build && npm start` behind a reverse proxy with HTTPS; set `ENABLE_INTERNAL_CRON=true`.
Use `npm run db:deploy` for tracked migrations once you've created them with `npm run db:migrate`.

---

## Security notes

* Passwords hashed with bcrypt (cost 12); sessions are signed JWTs in `httpOnly`, `SameSite=Lax`, `Secure` (production) cookies, and the
  user/role are re-read from the database on every request, so revoking admin takes effect immediately.
* All inputs validated with zod; Prisma parameterises all queries; React escapes output; HTML from feeds is stripped to text.
* State-changing routes check `Origin`; security headers are set in `next.config.mjs`.
* API keys are read only on the server and never sent to the browser. The cron endpoint refuses to run without `CRON_SECRET`.
* Login/signup are rate-limited (10/min/IP); other API routes 60–120/min/IP.

## Known limitations (please read)

* **Rate limiting and caching are in-process.** Correct for one server; on serverless each instance has its own counters. Swap
  `src/lib/rate-limit.ts` and `src/lib/cache.ts` for Redis/Upstash if you need global limits.
* **Auth is built in (Postgres + JWT), not Supabase Auth.** There is no email verification or password reset yet.
* Search uses Postgres `ILIKE` with a bounded in-memory relevance re-rank. That is fine for tens of thousands of rows; add `pg_trgm`/full-text
  indexes beyond that.
* Read time is an estimate for the *original* article (we only hold a summary), floored at 2 minutes.
* Thumbnails are the publisher's own images, loaded through the Next.js optimiser. Stories without one show a plain text tile, never a stock photo.
* Headlines, descriptions and images belong to their publishers. Briefly shows short summaries with attribution and links out; check each
  provider's terms (especially NewsAPI's free tier) before commercial use.

## Tests

`npm test` runs unit tests for URL normalisation, duplicate clustering, ranking, label logic, classification and extractive summaries
(Node's built-in test runner, no extra dependencies).
