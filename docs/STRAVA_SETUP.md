# Yakak - Strava Integration Setup

This guide walks you through connecting Yakak to the Strava API so that members can link their Strava account, log manual activities, and attach existing Strava activities to past events.

---

## Prerequisites

- A working Yakak deployment (see [SETUP.md](./SETUP.md))
- A Strava account
- The database migration `021_strava_integration.sql` applied

---

## 1. Create a Strava API Application

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and sign in
2. Fill in the form:
   - **Application Name**: `Yakak` (or any name)
   - **Category**: Choose any relevant category (e.g. *Training*)
   - **Club**: leave blank
   - **Website**: your app URL (e.g. `https://your-app.vercel.app` or `http://localhost:3000`)
   - **Authorization Callback Domain**: the **domain only** of your redirect URI:
     - Local dev: `localhost`
     - Production: `your-app.vercel.app` (no `https://`, no path)
3. Click **Create** (or **Update** if the app already exists)
4. Copy the **Client ID** and **Client Secret** shown on the page

> The **Authorization Callback Domain** field is what Strava validates against the `redirect_uri` you send during OAuth. It must match the domain of your callback URL (`/api/strava/callback`). This is the most common cause of the `redirect_uri invalid` error.

---

## 2. Configure Environment Variables

Add the following to your `.env.local` (and Vercel environment variables for production):

```env
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret

# Your app's public URL — no trailing slash
# Local:      http://localhost:3000
# Production: https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The callback URL that Yakak sends to Strava is:
```
{NEXT_PUBLIC_APP_URL}/api/strava/callback
```

So for local dev it will be `http://localhost:3000/api/strava/callback`, and the **Authorization Callback Domain** in Strava must be `localhost`.

---

## 3. Run the Database Migration

If you haven't already applied the Strava migration:

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/migrations/021_strava_integration.sql` from this project
3. Copy the entire contents and paste it into the SQL Editor
4. Click **Run**
5. Verify: go to **Table Editor** and confirm these tables exist:
   - `strava_tokens` — stores each member's OAuth tokens
   - `strava_activity_links` — links Strava activities to events

---

## 4. Connect Your Strava Account (Members)

1. Sign in to Yakak
2. Go to **Settings**
3. In the **Strava** section, click **Connect Strava**
4. You will be redirected to Strava to authorise the app
5. After authorising, you'll be sent back to Settings with a success message
6. The Strava section will now show your athlete name and a **Disconnect** button

---

## 5. How It Works

### OAuth flow

```
User clicks "Connect Strava"
  │
  ▼
GET /api/strava/callback?code=...   ◄── Strava redirects here after approval
  │
  ├─ Exchanges code for access_token + refresh_token
  ├─ Stores tokens in strava_tokens (upsert by user_id)
  └─ Redirects to /settings?strava=connected
```

### Token refresh

Strava access tokens expire after 6 hours. Yakak refreshes them automatically before each API call using the stored `refresh_token`.

### Activity linking (past events)

Once connected, a **Strava** section appears on any past event you attended. You can:
- **Log a manual activity** — fill in sport type, duration, etc. and Yakak creates it on Strava
- **Link an existing activity** — paste a Strava activity URL or ID to attach it to the event

---

## 6. Verify Everything Works

1. Set the env vars and restart the dev server
2. Go to Settings → click **Connect Strava**
3. Strava should ask you to authorise the app
4. After authorising, Settings should show your Strava name and a Disconnect button
5. Open a past event you RSVPed to → a Strava section should appear at the bottom

---

## Troubleshooting

### `redirect_uri invalid` (Bad Request from Strava)

This is the most common issue. Causes:

| Cause | Fix |
|-------|-----|
| `NEXT_PUBLIC_APP_URL` not set | Add it to `.env.local` (see step 2) |
| Wrong **Authorization Callback Domain** in Strava app | Must be the bare domain only — e.g. `localhost` or `your-app.vercel.app` |
| Trailing slash in `NEXT_PUBLIC_APP_URL` | Remove the trailing slash: `http://localhost:3000` ✓ |
| HTTP vs HTTPS mismatch | Strava allows `http://localhost` for dev; production must use `https://` |

### "Strava token exchange failed"

- Double-check `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` — they must match the values on [strava.com/settings/api](https://www.strava.com/settings/api)
- Make sure you're using the **Client Secret**, not the **Access Token** shown on the same page

### Settings shows "error" after connecting

- Check the Vercel / Next.js server logs for the `[strava-callback]` error line
- The most common cause is a wrong client secret or an expired authorization code (codes are single-use and expire quickly — don't refresh the callback URL)

### Activity not appearing after linking

- Only events you RSVPed to with **"yes"** and that are in the past show the Strava section
- The Strava activity date must be within a reasonable window of the event date
