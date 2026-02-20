# Yakak - Cultural Recommendations Setup

This guide walks you through setting up the Cultural Recommendations feature, which lets group members discover and share movies, TV shows, anime, games, music, and books — powered by external APIs and a community feed.

---

## Prerequisites

- A working Yakak deployment (see [SETUP.md](./SETUP.md))
- The database migration `019_recommendations.sql` applied (see step 2)

---

## 1. Configure External API Keys

The Discover tab pulls content from four external services. Each is optional: categories with no configured API simply won't surface random picks, but manual submissions and the community feed still work.

### 1.1 TMDB (Movies, TV Series, Anime)

1. Go to [themoviedb.org](https://www.themoviedb.org/) and create a free account
2. Go to **Settings > API**
3. Request an API key (choose **Developer**)
4. Copy the **API Key (v3 auth)** value

```env
TMDB_API_KEY=your-tmdb-api-key
```

### 1.2 RAWG (Games)

1. Go to [rawg.io/apidocs](https://rawg.io/apidocs) and create a free account
2. Go to your account dashboard and copy your **API Key**

```env
RAWG_API_KEY=your-rawg-api-key
```

### 1.3 iTunes (Music tracks)

The iTunes Search API and RSS feeds are completely free and require no account or API key. No configuration needed — Music discovery works out of the box.

### 1.4 Google Books (Books)

The Google Books API works without a key for low-volume usage, but a key is strongly recommended to avoid rate limits.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project
3. Go to **APIs & Services > Library**, search for **Books API**, and enable it
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API key**
6. Copy the key (optionally restrict it to the Books API)

```env
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
```

> You can leave `GOOGLE_BOOKS_API_KEY` empty. The Books API will still work (unauthenticated) but may hit quota limits faster.

---

## 2. Run the Database Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/migrations/019_recommendations.sql` from this project
3. Copy the entire contents and paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify: go to **Table Editor** and confirm these tables exist:
   - `recommendations` — community-submitted recommendations
   - `recommendation_likes` — per-user likes on recommendations
   - `saved_recommendations` — each user's personal saved list

### What the migration creates

| Object | Purpose |
|--------|---------|
| `recommendations` table | Stores all user-submitted recommendations with category, source metadata, and optional image/URL |
| `recommendation_likes` table | Tracks which user liked which recommendation (unique constraint prevents duplicate likes) |
| `saved_recommendations` table | Denormalized personal list — stores copies of both API picks and user recs so saved items survive deletion |
| RLS policies | Approved members can view all recs and likes; each user can only insert/update/delete their own rows |
| Indexes | On `user_id`, `category`, and `created_at DESC` for fast feed queries |
| `new_recommendation` notification type | Added to `notifications` and `notification_preferences` type constraints |
| Notification preferences seeding | Existing approved members get `new_recommendation` preferences with `in_app_enabled = true` |

---

## 3. Add Environment Variables to `.env.local`

Open `.env.local` and add the keys from step 1:

```env
TMDB_API_KEY=your-tmdb-api-key
RAWG_API_KEY=your-rawg-api-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
```

> Music (iTunes) requires no API key and works immediately.

For production, add these same variables in your **Vercel project settings > Environment Variables**.

---

## 4. How It Works

### Feature overview

The `/recommendations` page has three tabs:

| Tab | What it shows |
|-----|---------------|
| **Discover** | Random picks fetched from external APIs. Users can spin the slot machine to get new suggestions, save any pick to their personal list, or submit it to the community feed. |
| **Community** | All recommendations submitted by group members. Sortable by most recent or most liked. Filterable by category. Liked recommendations are highlighted. |
| **Saved** | The current user's personal saved list (from both Discover picks and Community saves). |

### Supported categories

| Category | API source | Manual submission |
|----------|-----------|-------------------|
| Movies | TMDB | Yes |
| TV Series | TMDB | Yes |
| Anime | TMDB (JP animation filter) | Yes |
| Games | RAWG | Yes |
| Music | iTunes (top tracks by genre, no key needed) | Yes |
| Books | Google Books | Yes |
| Outings | — | Yes |
| Restaurants | — | Yes |
| Activities | — | Yes |
| Podcasts | — | Yes |
| Other | — | Yes |

Categories without an API source (Outings, Restaurants, etc.) are manual-only: users type the details themselves.

### Data flow

```
User opens Discover tab
  │
  ▼
getRandomRecommendations(category)   ← server action
  ├─ Movies/TV/Anime  ──► TMDB popular endpoint (random page)
  ├─ Games            ──► RAWG games endpoint (random page)
  ├─ Music            ──► iTunes RSS top tracks (random genre, no key needed)
  ├─ Books            ──► Google Books (random subject + offset)
  └─ All              ──► picks one source at random
  │
  ▼
Renders RecommendationSlotMachine
  ├─ "Save" button    ──► saveRecommendation() → saved_recommendations
  └─ "Submit" button  ──► opens SubmitRecommendationForm (pre-filled)

User submits to community
  │
  ▼
submitUserRecommendation()           ← server action
  ├─ inserts into recommendations
  └─ fires new_recommendation notifications to all approved members
```

### Notifications

When a user submits a recommendation to the community feed, all other approved members receive an in-app notification:

> 🎯 *Username* recommended "*Title*"

Email notifications for `new_recommendation` are **off by default**. Users can enable them in their notification preferences.

---

## 5. Verify Everything Works

1. Start the app (`pnpm dev`) with the API keys set
2. Navigate to **/recommendations**
3. On the **Discover** tab:
   - Select **Movies** and click spin — you should see 3 movie cards
   - Select **Games** and click spin — you should see 3 game cards
   - Select **Music** and click spin — you should see 3 track cards
   - Select **Books** and click spin — you should see 3 book cards
4. Save a pick → it should appear in the **Saved** tab
5. Submit a pick to the community → it should appear in the **Community** tab and trigger a notification for other members
6. Like a community recommendation → the like count should update

---

## Troubleshooting

### Discover shows "Failed to fetch recommendations"
- Check that the relevant API key is set in `.env.local`
- Restart the dev server after adding env vars (`pnpm dev`)
- Check the server console for the specific API error (e.g. `TMDB_API_KEY is not configured`)

### TMDB returns 401
- Your `TMDB_API_KEY` is invalid or was not copied correctly
- Make sure you're using the **v3 API Key**, not the v4 access token

### Music shows "Failed to fetch recommendations"
- iTunes requires no API key, so the issue is likely a network error or an Apple outage
- Check that your server can reach `itunes.apple.com` (some corporate proxies block it)
- Try again — transient Apple CDN errors usually resolve on retry

### RAWG returns 401 or 403
- Your `RAWG_API_KEY` is invalid
- Free RAWG keys are generated from [rawg.io/apidocs](https://rawg.io/apidocs) after creating an account

### Google Books returns 403 or quota errors
- Add or check your `GOOGLE_BOOKS_API_KEY`
- In Google Cloud Console, make sure the **Books API** is enabled for your project

### Community tab is empty after submitting
- Verify the migration ran successfully: check the `recommendations` table in Supabase Table Editor
- Check that your profile `status` is `approved` (RLS blocks non-approved users from reading)

### Notifications not appearing after submission
- Verify the migration updated the `notifications_type_check` constraint to include `new_recommendation`
- Check Supabase SQL Editor: `SELECT type FROM notification_preferences LIMIT 5;` should include `new_recommendation`
- The submitter does not receive their own notification — check from another user's account
