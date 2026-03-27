# Trendplate — Phase 1 Build Instructions for Claude Code

## What you are building

A Next.js web app called **Trendplate** — a viral recipe subscription service that:
1. Scrapes trending TikTok cooking videos weekly via the ScrapeCreators API
2. Sends the trend data to Claude Sonnet to generate 5 complete healthy recipes
3. Stores everything in Supabase (PostgreSQL)
4. Runs automatically every Monday at 6am UTC via a Vercel cron job

---

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Anthropic Claude Sonnet (`claude-sonnet-4-5`)
- **TikTok data**: ScrapeCreators API
- **Hosting/Cron**: Vercel
- **Payments** (Phase 2, not now): Stripe

---

## Environment variables required

Create `.env.local` with these keys (user will supply values):

```
SCRAPECREATORS_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

---

## Project structure to create

```
trendplate/
├── .env.local                          ← user fills this in
├── .env.local.example                  ← template with comments
├── vercel.json                         ← cron schedule config
├── package.json
├── next.config.js
├── supabase/
│   └── 001_phase1_schema.sql           ← run this in Supabase SQL editor
├── lib/
│   ├── scrapecreators.js               ← TikTok API wrapper
│   ├── recipe-generator.js             ← Claude recipe generation
│   └── supabase-server.js              ← DB read/write helpers
├── app/
│   ├── layout.js
│   ├── page.js                         ← simple landing/status page
│   └── api/
│       ├── cron/
│       │   └── weekly-trends/
│       │       └── route.js            ← THE MAIN PIPELINE
│       └── trends/
│           └── route.js                ← fetch recipes for frontend
└── scripts/
    └── trigger-cron.js                 ← local test runner
```

---

## File specifications

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-trends",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

### `supabase/001_phase1_schema.sql`

Create two tables:

**raw_trends** — stores raw TikTok video data before processing:
- id (uuid, primary key)
- week_of (date, not null)
- hashtag (text)
- video_id (text)
- title, description (text)
- view_count, like_count, share_count (bigint)
- author, video_url (text)
- scraped_at (timestamptz, default now())
- UNIQUE constraint on (week_of, video_id)

**recipes** — stores Claude-generated recipes:
- id (uuid, primary key)
- week_of (date, not null)
- rank (int, 1–5)
- title, description (text)
- ingredients (jsonb, default '[]')
- steps (jsonb, default '[]')
- macros (jsonb, default '{}')
- cook_time_mins (int)
- servings (int, default 2)
- estimated_cost (numeric 6,2)
- tiktok_views (bigint)
- source_hashtag (text)
- status (text, default 'draft', check: draft/published/archived)
- created_at (timestamptz)
- UNIQUE constraint on (week_of, rank)

Enable RLS on both tables. Published recipes readable by authenticated users. Only service_role can write.

---

### `lib/scrapecreators.js`

ScrapeCreators REST API base URL: `https://api.scrapecreators.com`
Auth header: `x-api-key: process.env.SCRAPECREATORS_API_KEY`

**Two endpoints to use:**

1. `GET /v1/tiktok/hashtags/popular?period=7&country=US`
   - Returns top trending hashtags
   - Filter results to cooking-related ones using regex: `/cook|recipe|food|meal|eat|kitchen|chef|healthy|dinner|lunch|breakfast/i`

2. `GET /v1/tiktok/search/hashtag?hashtag={tag}&count=20`
   - Returns videos for a specific hashtag
   - Normalize response to: `{ id, title, description, viewCount, likeCount, shareCount, author, videoUrl, hashtag }`

**Cooking hashtags to query** (run all 7 in parallel with Promise.allSettled):
`['cooking', 'healthyrecipes', 'easyrecipes', 'mealprep', 'foodtok', 'healthyfood', 'dinnerideas']`

**Main export**: `fetchWeeklyTrendingCookingVideos({ limit: 50 })`
- Queries all 7 hashtags in parallel
- De-duplicates by video ID
- Sorts by viewCount descending
- Returns top 50

---

### `lib/recipe-generator.js`

Anthropic API: `POST https://api.anthropic.com/v1/messages`
Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
Model: `claude-sonnet-4-5`
Max tokens: `4000`

**Main export**: `generateRecipesFromTrends(trendingVideos, weekOf)`

Build a prompt that:
1. Lists the top 30 trending videos as: `"Title" | #hashtag | X.XM views`
2. Instructs Claude to identify 5 DISTINCT recipe concepts (no duplicates)
3. Write complete healthy recipes for each
4. Return ONLY a valid JSON array — no markdown, no explanation

Each recipe object in the array must have:
```json
{
  "rank": 1,
  "title": "string",
  "description": "2-sentence hook",
  "source_hashtag": "string",
  "tiktok_views": 0,
  "cook_time_mins": 20,
  "servings": 2,
  "estimated_cost": 8.50,
  "ingredients": [{ "name": "", "amount": 0, "unit": "", "notes": "" }],
  "steps": [{ "step": 1, "instruction": "" }],
  "macros": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0 }
}
```

Strip any markdown fences from Claude's response before JSON.parse(). Attach `week_of` to each recipe after parsing.

---

### `lib/supabase-server.js`

Use `createClient` from `@supabase/supabase-js` with the SERVICE_ROLE_KEY.
Set `auth: { autoRefreshToken: false, persistSession: false }`.

**Three exports:**

1. `saveRawTrends(videos, weekOf)` — upsert to raw_trends, conflict on (week_of, video_id), ignoreDuplicates: true
2. `saveRecipes(recipes)` — upsert to recipes, conflict on (week_of, rank), status: 'published'
3. `recipesExistForWeek(weekOf)` — count query, returns true if count >= 5

---

### `app/api/cron/weekly-trends/route.js`

**GET handler** — the full weekly pipeline:

```
Step 0: Check Authorization header === `Bearer ${process.env.CRON_SECRET}` → 401 if wrong
Step 1: Calculate weekOf (Monday of current week, UTC, format YYYY-MM-DD)
Step 2: recipesExistForWeek(weekOf) → if true, return { skipped: true }
Step 3: fetchWeeklyTrendingCookingVideos({ limit: 50 })
Step 4: saveRawTrends(videos, weekOf)
Step 5: generateRecipesFromTrends(videos, weekOf)
Step 6: saveRecipes(recipes)
Step 7: Return JSON with success, weekOf, recipesGenerated count, and recipe titles
```

Log clearly at each step. Wrap everything in try/catch, return 500 with error message on failure.

---

### `app/api/trends/route.js`

GET handler. Optional `?week=YYYY-MM-DD` query param (defaults to current week's Monday).
Use `@supabase/ssr` with cookies for auth.
Check `supabase.auth.getUser()` — return 401 if not authenticated.
Query recipes table: `eq('week_of', weekOf)`, `eq('status', 'published')`, `order('rank', ascending)`.
Return `{ weekOf, count, recipes }`.

---

### `scripts/trigger-cron.js`

Node.js ESM script (`"type": "module"` in package.json).
Load `.env.local` using dotenv.
Make a fetch to `http://localhost:3000/api/cron/weekly-trends` with `Authorization: Bearer ${CRON_SECRET}`.
Support `--week=YYYY-MM-DD` CLI arg.
Print results clearly. Exit 1 on failure.

---

### `app/page.js`

Simple status page showing:
- App name "Trendplate" 
- Current week's Monday date
- A message: "Weekly recipe drop is live"
- Link to /api/trends for subscribers

---

## `package.json` dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "dotenv": "^16.0.0"
  }
}
```

---

## How to run and test locally

```bash
npm install
npm run dev          # terminal 1 — starts server at localhost:3000
node scripts/trigger-cron.js   # terminal 2 — fires the full pipeline
```

Expected output in terminal 2:
```
Triggering cron pipeline...
Pipeline succeeded! Generated 5 recipes.
  #1 [recipe title] — X.XM TikTok views
  ...
```

Then verify in Supabase Table Editor → recipes table → should show 5 rows.

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Add all 6 env vars in Vercel dashboard → Settings → Environment Variables.
The `vercel.json` cron config handles the Monday 6am UTC schedule automatically.

---

## Important implementation notes

- All Supabase writes use the SERVICE_ROLE_KEY (bypasses RLS for server writes)
- All frontend reads use ANON_KEY (respects RLS — only published recipes visible)
- The cron endpoint is idempotent — safe to run multiple times per week
- Use `Promise.allSettled` (not `Promise.all`) for hashtag fetches so one failure doesn't kill the run
- The `week_of` field always stores the MONDAY of that week in UTC
