# Yakak - Twitch Integration Setup

This guide walks you through setting up the Twitch API so that Yakak can monitor Twitch channels, show live streams on the dashboard, and auto-create events when a channel goes live.

---

## Prerequisites

- A working Yakak deployment (see [SETUP.md](./SETUP.md))
- A Twitch account
- The database migration `009_twitch_integration.sql` applied (see step 3)

---

## 1. Create a Twitch Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Sign in with your Twitch account
3. Click **Register Your Application**
4. Fill in the form:
   - **Name**: `Yakak` (or any name you like)
   - **OAuth Redirect URLs**: `http://localhost:3000` (this is not actually used for the server-to-server flow, but Twitch requires at least one)
   - **Category**: Choose **Application Integration**
   - **Client Type**: **Confidential**
5. Click **Create**
6. On the application page, click **Manage**
7. Copy the **Client ID**
8. Click **New Secret**, confirm, then copy the **Client Secret**

> Keep the Client Secret safe. You will not be able to see it again after leaving this page.

---

## 2. Configure Environment Variables

Add the following to your `.env.local` file (and to Vercel environment variables for production):

```env
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
```

These are **server-only** variables. Never prefix them with `NEXT_PUBLIC_`.

Make sure you also have `CRON_SECRET` set (used to authenticate the polling cron job):

```env
CRON_SECRET=a-random-secret-string-min-32-chars
```

---

## 3. Run the Database Migration

If you haven't already applied the Twitch migration:

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/migrations/009_twitch_integration.sql` from this project
3. Copy the entire contents and paste it into the SQL Editor
4. Click **Run**
5. Verify: go to **Table Editor** and confirm these tables exist:
   - `twitch_channels` - stores monitored channels and their live state
   - `twitch_app_tokens` - caches OAuth app tokens (service-role only)
6. Verify the `events` table now has a `twitch_stream_id` column

### What the migration creates

| Object | Purpose |
|--------|---------|
| `twitch_channels` table | Stores channels to monitor, their live status, and stream metadata |
| `twitch_app_tokens` table | Caches Twitch OAuth app tokens with expiry |
| `twitch_stream_id` column on `events` | Links auto-created events to a Twitch stream for deduplication |
| RLS policies | Approved members can view channels; only admins can add/update/delete |
| `updated_at` trigger | Auto-updates timestamp on channel row changes |

---

## 4. Set Up the Cron Job (Vercel)

The Twitch polling runs as a Vercel Cron job defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/twitch",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This polls every **5 minutes**. On each run:
1. Fetches all monitored channels from the database
2. Calls the Twitch Helix API to check live status
3. Updates channel state (live/offline, title, category, viewer count)
4. Auto-creates an event + sends notifications when a new stream starts (if enabled)

> Vercel Cron is available on the Hobby plan (limited to once/day) and Pro plan (every minute). If you're on the Hobby plan, consider changing the schedule to `0 * * * *` (hourly) or triggering it manually.

### Testing the cron job locally

You can trigger the cron endpoint manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/twitch
```

Expected response:

```json
{
  "success": true,
  "processed": 2,
  "eventsCreated": 0
}
```

---

## 5. Add Twitch Channels (Admin)

Once everything is configured:

1. Sign in to Yakak as an **admin**
2. Go to **Settings**
3. In the **Twitch Channels** section, type a Twitch channel name (e.g. `pokimane`)
4. Click **Add** - the app validates the channel exists via the Twitch API
5. The channel will appear in the list with:
   - Profile image and display name
   - A toggle for **auto-create events** (enabled by default)
   - A delete button

---

## 6. How It Works

### Architecture

```
Vercel Cron (every 5 min)
  │
  ▼
GET /api/cron/twitch
  │  (Bearer CRON_SECRET)
  ▼
pollTwitchChannels()
  ├─ getAppToken()          ──► Twitch OAuth2 (client_credentials)
  │    └─ cached in twitch_app_tokens (5-min safety margin)
  ├─ getStreams(channels)   ──► GET helix/streams?user_login=...
  └─ returns channel + stream data
  │
  ▼
Cron route processes results:
  ├─ Channel is live (new stream)
  │    ├─ Update twitch_channels row
  │    ├─ Create event: "{DisplayName} is live: {title}"
  │    └─ Notify all approved members
  ├─ Channel is live (same stream)
  │    └─ Update viewer count, title, category
  ├─ Channel went offline
  │    └─ Reset live fields to null/false
  └─ Channel still offline
       └─ Update last_checked_at
```

### Auto-created events

When a monitored channel starts a new stream and `auto_create_events` is enabled:

- **Title**: `"{DisplayName} is live: {stream title}"` (truncated to 100 chars)
- **Date**: stream start time
- **Location**: `https://twitch.tv/{channel_name}`
- **Description**: `"Streaming {game_name}"` (if a category is set)
- **Deduplication**: uses `twitch_stream_id` to prevent duplicate events for the same stream

### Dashboard widget

The dashboard fetches `twitch_channels` where `is_live = true` and displays a card for each live channel with:
- Channel avatar and name
- LIVE badge + viewer count
- Game/category
- Stream title
- Link to the Twitch channel

---

## 7. Verify Everything Works

1. Add at least one Twitch channel in Settings
2. Trigger the cron job manually (see step 4)
3. If the channel is live, check that:
   - The dashboard shows the live card
   - An event was auto-created (if auto-events is enabled)
   - Members received a notification
4. If the channel is offline, check that:
   - `last_checked_at` was updated in the `twitch_channels` table
   - No event was created

---

## Troubleshooting

### "Twitch token request failed: 401"
- Your `TWITCH_CLIENT_ID` or `TWITCH_CLIENT_SECRET` is wrong
- Go to the [Twitch Developer Console](https://dev.twitch.tv/console), regenerate the secret, and update your env vars

### "Twitch token request failed: 403"
- Your Twitch application may have been suspended
- Check the Twitch Developer Console for any notices

### Channel not found when adding
- Make sure you're entering the **login name** (lowercase URL slug), not the display name
- Example: use `pokimane` not `Pokimane`

### Cron job returns 401
- Your `CRON_SECRET` env var doesn't match between the cron caller and the app
- On Vercel, cron jobs use the `CRON_SECRET` env var automatically

### Events not being auto-created
- Check that `auto_create_events` is enabled for the channel (toggle in Settings)
- Check that the stream ID is new (events are deduplicated by `twitch_stream_id`)
- Check Vercel function logs for errors

### No live cards on dashboard
- The cron job may not have run yet - trigger it manually
- Check the `twitch_channels` table: `is_live` should be `true` and `current_stream_id` should be set
