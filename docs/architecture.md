# Yakak - Technical Architecture

**Version**: 1.0
**Last updated**: 2026-02-08
**Source**: [PRD](./prd.md) · [User Stories](./user-stories.md)

---

## 1. System Overview

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Hosting)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Next.js App (App Router)                  │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │   │
│  │  │   Server    │  │   Client   │  │  Server Actions   │  │   │
│  │  │ Components  │  │ Components │  │  (mutations)      │  │   │
│  │  │            │  │            │  │                   │  │   │
│  │  │ - Dashboard │  │ - Calendar │  │ - updateProfile   │  │   │
│  │  │ - Event     │  │ - RSVP     │  │ - createEvent     │  │   │
│  │  │   Detail    │  │   Buttons  │  │ - deleteEvent     │  │   │
│  │  │ - Settings  │  │ - Event    │  │ - upsertRsvp      │  │   │
│  │  │            │  │   Form     │  │                   │  │   │
│  │  └─────┬──────┘  └─────┬──────┘  └────────┬──────────┘  │   │
│  │        │               │                   │             │   │
│  │        │  Supabase SSR Client (cookies)     │             │   │
│  │        └───────────────┼───────────────────┘             │   │
│  │                        │                                 │   │
│  │  ┌─────────────────────┼─────────────────────────────┐   │   │
│  │  │     middleware.ts   │                              │   │   │
│  │  │  (auth check + route protection)                   │   │   │
│  │  └─────────────────────┼─────────────────────────────┘   │   │
│  │                        │                                 │   │
│  │  ┌─────────────────────┼─────────────────────────────┐   │   │
│  │  │   API Routes        │                              │   │   │
│  │  │                     │                              │   │   │
│  │  │  /auth/callback  ───┘  (OAuth redirect handler)    │   │   │
│  │  │  /api/cron/reminders   (Vercel Cron, daily 8AM)    │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Vercel Cron ─── triggers /api/cron/reminders once/day          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth         │  │  PostgreSQL  │  │  Storage             │  │
│  │               │  │              │  │                      │  │
│  │  Google OAuth │  │  profiles    │  │  comment-images      │  │
│  │  JWT tokens   │  │  events      │  │  (bucket, 1 GB max)  │  │
│  │  Session mgmt │  │  rsvps       │  │                      │  │
│  │               │  │  comments    │  │  RLS: approved       │  │
│  │               │  │  reactions   │  │  members only        │  │
│  │               │  │  polls       │  │                      │  │
│  │               │  │  poll_votes  │  └──────────────────────┘  │
│  │               │  │  availabil.. │                             │
│  │               │  │  notific..   │  ┌──────────────────────┐  │
│  │               │  │  notif_pr..  │  │  Database Triggers   │  │
│  │               │  │              │  │                      │  │
│  │               │  │  RLS on ALL  │  │  on_auth_user_created│  │
│  │               │  │  tables      │  │  → create profile    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                           │
                                           │ HTTPS (server-side only)
                                           ▼
                                  ┌──────────────────┐
                                  │  Resend (Email)   │
                                  │                  │
                                  │  100 emails/day  │
                                  │  3,000/month     │
                                  └──────────────────┘
```

### 1.2 Request Flow — Main User Journey

#### Flow 1: First-Time Sign-In (Admin Auto-Promotion)

```
Browser                    Vercel/Next.js              Supabase
  │                            │                          │
  │  GET /login                │                          │
  │ ◄──────────────────────────│  Login page (SSR)        │
  │                            │                          │
  │  Click "Sign in            │                          │
  │   with Google"             │                          │
  │ ──────────────────────────►│                          │
  │                            │  signInWithOAuth()       │
  │  ◄─ Redirect to Google ───►│ ────────────────────────►│
  │  ◄─ Google consent ──────► │                          │
  │  ◄─ Redirect to /auth/     │                          │
  │     callback?code=xxx      │                          │
  │ ──────────────────────────►│                          │
  │                            │  exchangeCodeForSession  │
  │                            │ ────────────────────────►│
  │                            │                          │  Creates auth.users row
  │                            │                          │  Trigger fires:
  │                            │                          │    profiles count = 0
  │                            │                          │    → role=admin
  │                            │                          │    → status=approved
  │                            │  ◄─── session cookie ────│
  │                            │                          │
  │  Middleware checks profile │                          │
  │  status = approved         │                          │
  │                            │                          │
  │  ◄── Redirect to / ───────│  Dashboard (SSR)         │
  │                            │                          │
```

#### Flow 2: Create Event → RSVP

```
Browser                    Vercel/Next.js              Supabase
  │                            │                          │
  │  Click "New Event"         │                          │
  │  Fill form + submit        │                          │
  │ ──────────────────────────►│                          │
  │                            │  Server Action:          │
  │                            │  createEvent()           │
  │                            │ ────────────────────────►│
  │                            │                          │  RLS check: is_approved?
  │                            │                          │  INSERT into events
  │                            │  ◄─── event row ─────────│
  │                            │                          │
  │  ◄── Redirect to          │                          │
  │      /events/[id]          │                          │
  │                            │                          │
  │  GET /events/[id]          │                          │
  │ ──────────────────────────►│                          │
  │                            │  SSR: fetch event +      │
  │                            │  rsvps + profile          │
  │                            │ ────────────────────────►│
  │                            │  ◄─── data ──────────────│
  │  ◄── Event detail page ───│                          │
  │                            │                          │
  │  Click "Yes" (RSVP)       │                          │
  │ ──────────────────────────►│                          │
  │                            │  Server Action:          │
  │                            │  upsertRsvp()            │
  │                            │ ────────────────────────►│
  │                            │                          │  RLS check: is_approved?
  │                            │                          │  UPSERT into rsvps
  │                            │  ◄─── rsvp row ──────────│
  │  ◄── UI updates (revalid.) │                          │
  │                            │                          │
```

### 1.3 Next.js App Router Structure

```
app/
├── (auth)/                          # Auth group (no app shell)
│   ├── login/page.tsx               # Google sign-in button
│   ├── pending/page.tsx             # "Waiting for approval" screen
│   ├── denied/page.tsx              # "Request denied" screen
│   └── auth/callback/route.ts       # OAuth code → session exchange
│
├── (app)/                           # App group (requires approved status)
│   ├── layout.tsx                   # Shell: nav bar, header, notification bell
│   ├── page.tsx                     # Dashboard (home)
│   ├── calendar/page.tsx            # Monthly calendar view
│   ├── events/
│   │   └── [id]/page.tsx            # Event detail + RSVP + thread
│   └── settings/page.tsx            # Profile + admin panel
│
├── api/
│   └── cron/
│       └── reminders/route.ts       # Vercel Cron (daily, server-only)
│
├── layout.tsx                       # Root layout (html, body, providers)
├── globals.css
└── middleware.ts                     # Auth + status check on every request
```

---

## 2. Database Schema

### 2.1 ER Diagram

```
auth.users (Supabase managed)
    │
    │ 1:1  (trigger: on_auth_user_created)
    ▼
profiles ─────────────────┬───────────────────────────────┐
    │                     │                               │
    │ 1:N                 │ 1:N                           │ 1:N
    ▼                     ▼                               ▼
  events              rsvps                        availability_signals
    │                (event_id + user_id unique)
    │
    ├── 1:N ──► comments ──── 1:N ──► reactions
    │
    ├── 1:N ──► polls ──── 1:N ──► poll_options ──── 1:N ──► poll_votes
    │
    └── 1:N ──► notifications
                notification_preferences (user_id + type unique)
```

### 2.2 Table Definitions

#### `profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | UNIQUE, NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Links to Supabase Auth |
| `display_name` | `text` | NOT NULL | From Google `full_name` |
| `avatar_url` | `text` | DEFAULT `''` | From Google `picture` |
| `email` | `text` | NOT NULL | From Google email |
| `role` | `text` | NOT NULL, DEFAULT `'member'`, CHECK IN (`'admin'`, `'member'`) | |
| `status` | `text` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'approved'`, `'denied'`, `'removed'`) | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: `profiles_user_id_idx` on `user_id` (unique), `profiles_status_idx` on `status`.

#### `events`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `title` | `varchar(100)` | NOT NULL | |
| `date` | `timestamptz` | NOT NULL | Event date + time |
| `location` | `varchar(200)` | NOT NULL | |
| `description` | `varchar(2000)` | NULLABLE | Optional |
| `reminder_hours` | `integer` | NOT NULL, DEFAULT `24` | Hours before event |
| `created_by` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `deleted_at` | `timestamptz` | NULLABLE | Soft delete |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: `events_date_idx` on `date`, `events_created_by_idx` on `created_by`.

#### `rsvps`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `status` | `text` | NOT NULL, CHECK IN (`'yes'`, `'no'`, `'maybe'`) | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: UNIQUE on `(event_id, user_id)`.

#### `comments` *(Phase 2)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `content` | `varchar(2000)` | NOT NULL | |
| `image_url` | `text` | NULLABLE | Supabase Storage URL |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: `comments_event_id_idx` on `event_id`.

#### `reactions` *(Phase 2)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `comment_id` | `uuid` | NOT NULL, FK → `comments(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `emoji` | `varchar(32)` | NOT NULL | Unicode emoji character |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: UNIQUE on `(comment_id, user_id, emoji)`.

#### `polls` *(Phase 2)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | Creator |
| `question` | `varchar(200)` | NOT NULL | |
| `is_closed` | `boolean` | NOT NULL, DEFAULT `false` | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

#### `poll_options` *(Phase 2)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `poll_id` | `uuid` | NOT NULL, FK → `polls(id)` ON DELETE CASCADE | |
| `label` | `varchar(100)` | NOT NULL | |
| `position` | `integer` | NOT NULL | Display order |

#### `poll_votes` *(Phase 2)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `poll_id` | `uuid` | NOT NULL, FK → `polls(id)` ON DELETE CASCADE | |
| `option_id` | `uuid` | NOT NULL, FK → `poll_options(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: UNIQUE on `(poll_id, user_id)` — one vote per user per poll.

#### `availability_signals` *(Phase 4)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `date` | `date` | NOT NULL | Calendar day |
| `city` | `varchar(100)` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Indexes**: UNIQUE on `(user_id, date)` — one signal per user per day.

#### `notifications` *(Phase 3)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | Recipient |
| `type` | `text` | NOT NULL | See enum below |
| `reference_id` | `uuid` | NULLABLE | FK to relevant entity |
| `message` | `text` | NOT NULL | Human-readable text |
| `read` | `boolean` | NOT NULL, DEFAULT `false` | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Type enum values**: `event_created`, `event_updated`, `event_cancelled`, `event_reminder`, `new_comment`, `new_rsvp`, `poll_created`, `poll_closed`, `availability_signal`.

**Indexes**: `notifications_user_id_read_idx` on `(user_id, read)`.

#### `notification_preferences` *(Phase 3)*

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | |
| `type` | `text` | NOT NULL | Same enum as notifications.type |
| `email_enabled` | `boolean` | NOT NULL, DEFAULT `true` | |
| `in_app_enabled` | `boolean` | NOT NULL, DEFAULT `true` | |

**Indexes**: UNIQUE on `(user_id, type)`.

### 2.3 Database Trigger: Auto-Create Profile on Sign-Up

```sql
-- Helper: create profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.profiles;

  INSERT INTO public.profiles (user_id, display_name, avatar_url, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      'User'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      ''
    ),
    COALESCE(NEW.email, ''),
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'member' END,
    CASE WHEN existing_count = 0 THEN 'approved' ELSE 'pending' END
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2.4 Database Trigger: Auto-Update `updated_at`

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 2.5 RLS Policies

#### Helper Functions

```sql
-- Check if the authenticated user is an approved member
CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND status = 'approved'
  );
$$;

-- Check if the authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
$$;

-- Get the profile id of the authenticated user
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;
```

#### `profiles` — RLS Policies

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can see their own profile (any status)
--         + all approved profiles (for RSVP lists, comments, etc.)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR status = 'approved'
  );

-- INSERT: blocked — profiles are created by the database trigger only
-- (no policy = denied by default with RLS enabled)

-- UPDATE: admin can update any profile's status and role
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: not allowed (no policy)
```

> **Note on pending users**: A pending user can see their own profile row (to display the "Waiting for approval" screen) but cannot see other members' profiles until approved.

#### `events` — RLS Policies

```sql
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- SELECT: approved members can read non-deleted events
CREATE POLICY "events_select"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND deleted_at IS NULL
  );

-- INSERT: approved members can create events
CREATE POLICY "events_insert"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND created_by = current_profile_id()
  );

-- UPDATE: only the creator can update their event, OR admin can update any
CREATE POLICY "events_update"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND (created_by = current_profile_id() OR is_admin())
  )
  WITH CHECK (
    is_approved_member()
    AND (created_by = current_profile_id() OR is_admin())
  );

-- DELETE: not used (soft delete via UPDATE on deleted_at)
```

#### `rsvps` — RLS Policies

```sql
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- SELECT: approved members can read all rsvps
CREATE POLICY "rsvps_select"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (is_approved_member());

-- INSERT: approved members can create their own rsvp
CREATE POLICY "rsvps_insert"
  ON public.rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- UPDATE: approved members can update their own rsvp
CREATE POLICY "rsvps_update"
  ON public.rsvps FOR UPDATE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  )
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- DELETE: approved members can remove their own rsvp
CREATE POLICY "rsvps_delete"
  ON public.rsvps FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
```

#### `comments` — RLS Policies *(Phase 2)*

```sql
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- SELECT: approved members can read comments on non-deleted events
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    is_approved_member()
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = comments.event_id
        AND events.deleted_at IS NULL
    )
  );

-- INSERT: approved members can create comments
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

-- DELETE: author can delete their own comments
CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
```

#### `reactions` — RLS Policies *(Phase 2)*

```sql
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select"
  ON public.reactions FOR SELECT
  TO authenticated
  USING (is_approved_member());

CREATE POLICY "reactions_insert"
  ON public.reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
  );

CREATE POLICY "reactions_delete"
  ON public.reactions FOR DELETE
  TO authenticated
  USING (
    is_approved_member()
    AND user_id = current_profile_id()
  );
```

#### `polls`, `poll_options`, `poll_votes` — RLS Policies *(Phase 2)*

```sql
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- polls: approved members can read; creator can insert; creator can update (close)
CREATE POLICY "polls_select" ON public.polls FOR SELECT TO authenticated
  USING (is_approved_member());
CREATE POLICY "polls_insert" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "polls_update" ON public.polls FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());

-- poll_options: approved members can read; creator of parent poll can insert
CREATE POLICY "poll_options_select" ON public.poll_options FOR SELECT TO authenticated
  USING (is_approved_member());
CREATE POLICY "poll_options_insert" ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_member()
    AND EXISTS (
      SELECT 1 FROM public.polls
      WHERE polls.id = poll_options.poll_id
        AND polls.user_id = current_profile_id()
    )
  );

-- poll_votes: approved members can read; members can insert/update own vote on open polls
CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT TO authenticated
  USING (is_approved_member());
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    is_approved_member()
    AND user_id = current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.polls WHERE polls.id = poll_votes.poll_id AND NOT polls.is_closed
    )
  );
CREATE POLICY "poll_votes_update" ON public.poll_votes FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id());
```

#### `availability_signals` — RLS Policies *(Phase 4)*

```sql
ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_select" ON public.availability_signals FOR SELECT TO authenticated
  USING (is_approved_member());
CREATE POLICY "availability_insert" ON public.availability_signals FOR INSERT TO authenticated
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "availability_update" ON public.availability_signals FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "availability_delete" ON public.availability_signals FOR DELETE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id());
```

#### `notifications` — RLS Policies *(Phase 3)*

```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = current_profile_id());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = current_profile_id())
  WITH CHECK (user_id = current_profile_id());

-- INSERT: handled by server-side (service role) — no client insert policy
```

#### `notification_preferences` — RLS Policies *(Phase 3)*

```sql
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select" ON public.notification_preferences FOR SELECT TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "notif_prefs_insert" ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
CREATE POLICY "notif_prefs_update" ON public.notification_preferences FOR UPDATE TO authenticated
  USING (is_approved_member() AND user_id = current_profile_id())
  WITH CHECK (is_approved_member() AND user_id = current_profile_id());
```

### 2.6 Storage Policies

```sql
-- Bucket: comment-images (created via Supabase dashboard or migration)

-- SELECT: approved members can read all images
CREATE POLICY "storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comment-images'
    AND (SELECT public.is_approved_member())
  );

-- INSERT: approved members can upload images (max 5 MB enforced at application level)
CREATE POLICY "storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comment-images'
    AND (SELECT public.is_approved_member())
  );

-- DELETE: users can delete their own uploads (path convention: user_id/filename)
CREATE POLICY "storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comment-images'
    AND (storage.foldername(name))[1] = (SELECT current_profile_id()::text)
  );
```

**Upload path convention**: `comment-images/{profile_id}/{timestamp}-{filename}`

---

## 3. API Routes

### 3.1 Public Routes (No Auth Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/login` | Login page with Google sign-in button |
| GET | `/pending` | "Waiting for approval" screen |
| GET | `/denied` | "Request denied" screen |
| GET | `/auth/callback` | OAuth callback — exchanges code for session |

### 3.2 Protected Routes (Approved Members Only)

All routes below are guarded by `middleware.ts` which checks:
1. Supabase session exists (else → `/login`)
2. Profile status = `approved` (else → `/pending` or `/denied`)

| Method | Path | Purpose | Data Source |
|--------|------|---------|-------------|
| GET | `/` | Dashboard | SSR: events (next 5), rsvps, profiles count |
| GET | `/calendar` | Calendar view | SSR: events for displayed month |
| GET | `/events/[id]` | Event detail | SSR: event + rsvps + comments + polls |
| GET | `/settings` | Settings + Admin panel | SSR: profile + pending users (if admin) + members |

### 3.3 Server Actions (Protected, Validated Server-Side)

Server Actions use `createServerClient` from `@supabase/ssr` with the user's session cookie. RLS enforces authorization.

| Action | File | Purpose | Validation |
|--------|------|---------|------------|
| `createEvent` | `actions/events.ts` | Insert new event | title ≤ 100, location ≤ 200, description ≤ 2000, date required |
| `updateEvent` | `actions/events.ts` | Update event fields | Same as create + creator/admin check via RLS |
| `deleteEvent` | `actions/events.ts` | Soft-delete (set `deleted_at`) | Creator or admin via RLS |
| `upsertRsvp` | `actions/rsvps.ts` | Create/update RSVP | status ∈ {yes, no, maybe} |
| `removeRsvp` | `actions/rsvps.ts` | Delete RSVP | Owner via RLS |
| `approveUser` | `actions/admin.ts` | Set profile status to `approved` | Admin via RLS |
| `denyUser` | `actions/admin.ts` | Set profile status to `denied` | Admin via RLS |
| `removeMember` | `actions/admin.ts` | Set profile status to `removed` | Admin via RLS |
| `createComment` | `actions/comments.ts` | Insert comment *(Phase 2)* | content ≤ 2000 |
| `deleteComment` | `actions/comments.ts` | Delete comment *(Phase 2)* | Author via RLS |
| `toggleReaction` | `actions/reactions.ts` | Add/remove reaction *(Phase 2)* | Valid emoji |
| `createPoll` | `actions/polls.ts` | Insert poll + options *(Phase 2)* | question ≤ 200, 2–6 options |
| `votePoll` | `actions/polls.ts` | Upsert vote *(Phase 2)* | Poll not closed |
| `closePoll` | `actions/polls.ts` | Close poll *(Phase 2)* | Creator via RLS |
| `setAvailability` | `actions/availability.ts` | Upsert signal *(Phase 4)* | city ≤ 100 |
| `removeAvailability` | `actions/availability.ts` | Delete signal *(Phase 4)* | Owner via RLS |
| `updateNotifPrefs` | `actions/notifications.ts` | Update preferences *(Phase 3)* | Valid type |
| `markNotifRead` | `actions/notifications.ts` | Mark as read *(Phase 3)* | Owner via RLS |
| `markAllNotifsRead` | `actions/notifications.ts` | Mark all as read *(Phase 3)* | Owner via RLS |

### 3.4 API Routes (Webhook / Cron)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/cron/reminders` | `CRON_SECRET` header | Vercel Cron — process event reminders due in next 24h. Sends emails via Resend. |

**Cron configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Cron route authorization**:
```typescript
// app/api/cron/reminders/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use Supabase service role client to query events + send emails
  // ...
}
```

---

## 4. Environment Variables

### 4.1 Server-Side Only (NOT prefixed with `NEXT_PUBLIC_`)

These are secrets that must NEVER be exposed to the browser.

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access (bypasses RLS) — used in cron route, triggers | Vercel env vars |
| `RESEND_API_KEY` | Resend email API authentication | Vercel env vars |
| `CRON_SECRET` | Secures `/api/cron/reminders` endpoint | Vercel env vars |

### 4.2 Client-Side Public Keys (Prefixed with `NEXT_PUBLIC_`)

These are safe to expose in the browser bundle.

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Vercel env vars + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (RLS-scoped) | Vercel env vars + `.env.local` |

### 4.3 `.env.local` Template

```env
# Public (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_xxxx
CRON_SECRET=a-random-secret-string-min-32-chars
```

### 4.4 `.env.local` in `.gitignore`

```gitignore
.env.local
.env.*.local
```

---

## 5. Security

### 5.1 Row Level Security (RLS)

- **Every table** has RLS enabled (see Section 2.5)
- **No table** is accessible without authentication
- **Helper functions** (`is_approved_member()`, `is_admin()`, `current_profile_id()`) use `SECURITY DEFINER` to avoid recursive RLS checks
- All helper functions set `search_path = public` to prevent search path injection
- The `anon` key used in the browser can only access data permitted by RLS policies

### 5.2 API Key Isolation

| Key | Accessible From | Can Bypass RLS |
|-----|-----------------|----------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | No — all requests go through RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes — used only in cron route and profile trigger |
| `RESEND_API_KEY` | Server only | N/A — email API |
| `CRON_SECRET` | Server only | N/A — route auth |

**Rules enforced**:
1. `SUPABASE_SERVICE_ROLE_KEY` is NEVER imported in any file under `app/(app)/` or any client component
2. All Server Actions use the user's session cookie (anon key + RLS), never the service role key
3. Only `/api/cron/reminders` and the database trigger use the service role key

### 5.3 Cron Route Protection

```
Request → /api/cron/reminders
  │
  ├── Header: Authorization: Bearer ${CRON_SECRET}
  │     ├── Match → Process reminders → 200
  │     └── No match → 401 Unauthorized
  │
  └── No header → 401 Unauthorized
```

Vercel automatically injects the `CRON_SECRET` header when invoking cron routes. External requests without the correct secret are rejected.

### 5.4 Middleware Auth Flow

```
Request → middleware.ts
  │
  ├── Path is /login, /pending, /denied, /auth/callback, /api/cron/*
  │     └── ALLOW (public routes)
  │
  ├── No Supabase session?
  │     └── REDIRECT → /login
  │
  ├── Has session → fetch profile from DB
  │     │
  │     ├── profile.status = 'pending'
  │     │     └── REDIRECT → /pending
  │     │
  │     ├── profile.status = 'denied' or 'removed'
  │     │     └── REDIRECT → /denied
  │     │
  │     ├── profile.status = 'approved'
  │     │     └── ALLOW (proceed to page)
  │     │
  │     └── No profile found (edge case)
  │           └── REDIRECT → /login (sign out)
```

### 5.5 Input Validation

All user input is validated in Server Actions before database writes:

| Field | Validation | Sanitization |
|-------|------------|--------------|
| Event title | Required, max 100 chars | Trim whitespace |
| Event location | Required, max 200 chars | Trim whitespace |
| Event description | Optional, max 2000 chars | Trim whitespace |
| Event date | Required, valid ISO date, must be in the future | — |
| Reminder hours | Integer, 1–720 (30 days max) | Default 24 |
| RSVP status | Must be `yes`, `no`, or `maybe` | — |
| Comment content | Required, max 2000 chars | HTML escaped before render |
| Poll question | Required, max 200 chars | Trim whitespace |
| Poll options | 2–6 items, each max 100 chars | Trim whitespace |
| City (availability) | Required, max 100 chars | Trim whitespace |
| Image upload | JPEG/PNG/WebP only, max 5 MB | MIME type checked server-side |

### 5.6 Additional Security Measures

| Measure | Implementation |
|---------|----------------|
| HTTPS | Enforced by Vercel (default) |
| CSRF protection | Next.js Server Actions include built-in CSRF tokens |
| XSS prevention | React auto-escapes JSX output; `dangerouslySetInnerHTML` never used |
| SQL injection | Supabase client SDK uses parameterized queries; no raw SQL in app code |
| OAuth token safety | Handled entirely by Supabase Auth; tokens stored in HTTP-only cookies |
| Storage abuse | 5 MB per file limit + client-side compression (max 1200px width) |
| Rate limiting | Supabase built-in rate limiting on Auth endpoints (anti-abuse) |
