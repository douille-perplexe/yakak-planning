# Yakak - Setup Guide

## Prerequisites

- Node.js 18+
- pnpm
- A Google account
- A GitHub account (for Vercel deployment)

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Name it `yakak` (or any name you prefer)
4. Set a strong database password (save it somewhere safe)
5. Choose the region closest to you
6. Click **Create new project** and wait for it to spin up

## 2. Configure Google OAuth

### 2.1 Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services > OAuth consent screen**
   - Choose **External**
   - Fill in the app name: `Yakak`
   - Add your email as support email
   - Add your email as developer contact
   - Click **Save and Continue** through the remaining steps
4. Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Name: `Yakak`
   - Authorized redirect URIs: add `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
     - You can find your project ref in Supabase Dashboard > Settings > General
   - Click **Create**
   - **Copy the Client ID and Client Secret**

### 2.2 Supabase Auth Settings

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Find **Google** and enable it
3. Paste the **Client ID** and **Client Secret** from the previous step
4. Click **Save**

## 3. Run Database Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql` from this project
3. Copy the entire contents and paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify: go to **Table Editor** and confirm the tables exist: `profiles`, `events`, `rsvps`

## 4. Get Your Supabase Keys

1. In Supabase Dashboard, go to **Settings > API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## 5. Set Up Local Environment

```bash
# Clone the repo
git clone <your-repo-url>
cd yakak-planning

# Install dependencies
pnpm install

# Create .env.local from template
cp .env.local.example .env.local
```

Edit `.env.local` and fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_xxxx
CRON_SECRET=generate-a-random-string-here
```

> For `CRON_SECRET`, generate a random string: `openssl rand -hex 32`
> `RESEND_API_KEY` is only needed for Phase 3 (email notifications). You can leave it blank for now.

## 6. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The first user to sign in with Google will automatically become the **admin**.

## 7. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. In **Environment Variables**, add all variables from your `.env.local`
4. Click **Deploy**
5. After deployment, update the Google OAuth redirect URI:
   - Go back to Google Cloud Console > Credentials > your OAuth client
   - Add `https://<your-vercel-domain>/auth/callback` as an authorized redirect URI
   - Also add `https://<your-supabase-ref>.supabase.co/auth/v1/callback` if not already there

## 8. Verify Everything Works

1. Visit your deployed URL
2. Sign in with Google — you should become admin automatically
3. Go to Settings — you should see the Admin panel
4. Ask a friend to sign in — they should see the "Waiting for approval" screen
5. Approve them from the Admin panel
6. They refresh and can now access the app

---

## Troubleshooting

### "Waiting for approval" shows for the first user
The database trigger may not have fired. Check:
1. SQL Editor > run: `SELECT * FROM profiles;`
2. If empty, the trigger didn't run. Re-run the migration SQL.
3. If a row exists with `status = 'pending'`, manually update it:
   ```sql
   UPDATE profiles SET status = 'approved', role = 'admin' WHERE email = 'your@email.com';
   ```

### Google sign-in redirects to error
- Check that the redirect URI in Google Cloud Console matches exactly
- Make sure the Google provider is enabled in Supabase Auth settings
- Check browser console for errors

### RLS errors (empty data)
- Make sure you ran the full migration SQL (including helper functions and policies)
- Check that your profile status is `approved`
