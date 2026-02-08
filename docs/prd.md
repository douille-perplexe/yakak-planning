# Yakak - Product Requirements Document (PRD)

**Version**: 1.0
**Last updated**: 2026-02-08
**Source**: [Product Brief](./product-brief.md)

---

## 1. Product Overview

### 1.1 Vision Statement

Yakak is a shared group calendar that replaces chaotic group chat planning with a dedicated, organized space where a friend group can propose outings, signal availability, and coordinate effortlessly.

### 1.2 Goals

| # | Goal | Measurable Target |
|---|------|-------------------|
| G1 | Replace group chat as the primary planning tool | 100% of outings created in Yakak instead of chat within 4 weeks of launch |
| G2 | Keep all members informed without manual follow-up | Every member receives relevant notifications for 100% of new events |
| G3 | Make availability visible to the group | At least 5 of 10 members post availability signals weekly within 6 weeks |
| G4 | Enable discussion without leaving the app | 80% of event-related discussions happen in Yakak threads (not chat) within 6 weeks |

### 1.3 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Monthly Active Users (MAU) | 10/10 members active per month | Supabase Auth — unique logins per 30-day window |
| Events created per month | >= 4 events/month | Database query: `COUNT(events) WHERE created_at > now() - 30 days` |
| RSVP rate | >= 70% of members RSVP per event | `COUNT(rsvps) / COUNT(members)` per event, averaged |
| Notification opt-in rate | >= 80% of members keep email notifications enabled | Settings table: `COUNT(email_enabled) / COUNT(members)` |
| Avg. comments per event | >= 3 comments per event | `COUNT(comments) / COUNT(events)` over 30 days |
| Page load time (dashboard) | < 2 seconds on 4G | Vercel Analytics or Lighthouse audit |

---

## 2. User Stories by Epic

### Epic 1: Authentication & Access Control

**US-1.1** — Google Sign-In
> As a visitor, I want to sign in with my Google account, so that I don't need to create a separate username/password.

| Acceptance Criteria |
|---------------------|
| **Given** a visitor on the login page, **When** they click "Sign in with Google", **Then** they are redirected to Google OAuth and back to Yakak. |
| **Given** a new Google user, **When** they complete OAuth, **Then** a registration request is created with status `pending` and they see a "Waiting for approval" screen. |
| **Given** the very first user to ever register, **When** their account is created, **Then** they are automatically assigned the `admin` role and approved without waiting. |

**US-1.2** — Admin Approval
> As the admin, I want to approve or deny registration requests, so that only my friends can access the app.

| Acceptance Criteria |
|---------------------|
| **Given** the admin is on the Settings page, **When** there are pending registration requests, **Then** each request shows the user's name, email, and Google avatar with "Approve" / "Deny" buttons. |
| **Given** the admin clicks "Approve", **When** the action completes, **Then** the user's status changes to `approved` and they can access the app on their next visit. |
| **Given** the admin clicks "Deny", **When** the action completes, **Then** the user's status changes to `denied` and they see a "Request denied" screen on login. |

**US-1.3** — Session Management
> As a member, I want to stay logged in across browser sessions, so that I don't have to sign in every time.

| Acceptance Criteria |
|---------------------|
| **Given** an approved member who previously logged in, **When** they revisit Yakak within 7 days, **Then** they are automatically authenticated without re-login. |
| **Given** a member clicks "Sign out", **When** the action completes, **Then** their session is invalidated and they are redirected to the login page. |

---

### Epic 2: Events (Outings)

**US-2.1** — Create Event
> As a member, I want to create an outing with a title, date, and location, so that I can propose plans to the group.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the Calendar or Dashboard page, **When** they click "New Event", **Then** a form appears with fields: Title (required, max 100 chars), Date (required), Location (required, max 200 chars), Description (optional, max 2000 chars), Reminder timing (default: 24 hours before). |
| **Given** the member submits a valid form, **When** the event is saved, **Then** it appears on the calendar for all members and notifications are sent per user preferences. |
| **Given** the member submits an incomplete form (missing required fields), **When** they click submit, **Then** inline validation errors are shown and the form is not submitted. |

**US-2.2** — View Event Detail
> As a member, I want to view the full details of an event, so that I know what's planned.

| Acceptance Criteria |
|---------------------|
| **Given** a member clicks on an event (from Calendar or Dashboard), **When** the detail view opens, **Then** it displays: title, date, location, description, creator name, RSVP summary (count per status), comment thread, and polls. |

**US-2.3** — Edit / Delete Event
> As the event creator, I want to edit or delete my event, so that I can update or cancel plans.

| Acceptance Criteria |
|---------------------|
| **Given** the event creator views their event, **When** they click "Edit", **Then** the form is pre-filled with current values and they can modify any field. |
| **Given** the event creator clicks "Delete", **When** they confirm the action, **Then** the event is soft-deleted and no longer visible. Notification is sent to all members who RSVP'd. |
| **Given** a member who did not create the event, **When** they view the event, **Then** "Edit" and "Delete" buttons are not shown. |
| **Given** the admin views any event, **When** they view the event, **Then** "Delete" button is shown (admin can delete any event). |

**US-2.4** — RSVP to Event
> As a member, I want to RSVP (yes / no / maybe) to an event, so that others know if I'm coming.

| Acceptance Criteria |
|---------------------|
| **Given** a member views an event, **When** they click "Yes", "No", or "Maybe", **Then** their RSVP is saved and the summary updates in real time. |
| **Given** a member already RSVP'd, **When** they click a different status, **Then** their RSVP is updated (not duplicated). |
| **Given** any member views the event detail, **When** the RSVP section loads, **Then** it shows each member's avatar + name grouped by status (Yes / Maybe / No / No response). |

---

### Epic 3: Availability Signals

**US-3.1** — Post Availability
> As a member, I want to mark a day as "available in [city]", so that friends can see I'm free and suggest plans.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the Calendar page, **When** they click on a day, **Then** they can add an availability signal with a city name (required, max 100 chars). |
| **Given** a member submits an availability signal, **When** the signal is saved, **Then** it appears on the calendar for all members as a distinct visual indicator (different from events). |
| **Given** a member already posted availability for a day, **When** they click on their signal, **Then** they can edit the city or remove it. |

**US-3.2** — View Availability Overlap
> As a member, I want to see who else is available on a given day and where, so that I can propose an outing.

| Acceptance Criteria |
|---------------------|
| **Given** a member views the calendar, **When** multiple members have availability on the same day, **Then** the day shows a count badge (e.g., "3 available") and clicking reveals each member's name + city. |

---

### Epic 4: Discussion Threads

**US-4.1** — Post Comment
> As a member, I want to comment on an event, so that I can discuss plans with the group.

| Acceptance Criteria |
|---------------------|
| **Given** a member views an event's detail page, **When** they type a message (max 2000 chars) and click "Send", **Then** the comment appears at the bottom of the thread with their avatar, name, and timestamp. |
| **Given** the comment author, **When** they click "Delete" on their own comment, **Then** the comment is removed from the thread. |

**US-4.2** — Emoji Reactions
> As a member, I want to react to a comment with an emoji, so that I can quickly express agreement or feelings.

| Acceptance Criteria |
|---------------------|
| **Given** a member hovers/taps on a comment, **When** they click the reaction button, **Then** an emoji picker appears with common emojis. |
| **Given** a member selects an emoji, **When** the reaction is saved, **Then** it appears under the comment with a count. Clicking the same emoji again removes the reaction (toggle). |

**US-4.3** — Image Sharing
> As a member, I want to share images in an event thread, so that I can share relevant photos or screenshots.

| Acceptance Criteria |
|---------------------|
| **Given** a member composing a comment, **When** they click the image upload button, **Then** they can select an image (JPEG, PNG, WebP; max 5 MB). |
| **Given** a valid image is selected, **When** the comment is posted, **Then** the image is uploaded to Supabase Storage and displayed inline in the thread. |
| **Given** total storage approaches 800 MB (80% of 1 GB limit), **When** a member uploads an image, **Then** a warning is shown to the admin on the Settings page. |

**US-4.4** — Polls
> As a member, I want to create a poll on an event, so that the group can vote on options.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the event detail page, **When** they click "Create Poll", **Then** a form appears with: Question (required, max 200 chars) and 2–6 options (each max 100 chars). |
| **Given** a poll is created, **When** any member views the event, **Then** they can vote on one option. Changing vote is allowed. Results are visible in real time (vote count + percentage per option). |
| **Given** the poll creator, **When** they click "Close Poll", **Then** no more votes are accepted and the final result is displayed. |

---

### Epic 5: Notifications

**US-5.1** — In-App Notifications
> As a member, I want to see a notification bell with an unread count, so that I know about new activity without checking every event.

| Acceptance Criteria |
|---------------------|
| **Given** a member is on any page, **When** new activity occurs (new event, comment, RSVP, poll, availability signal), **Then** the bell icon updates with an unread count. |
| **Given** a member clicks the bell, **When** the notification panel opens, **Then** it shows a chronological list of notifications with: type icon, short description, timestamp, and link to the relevant event. |
| **Given** a member clicks a notification, **When** they navigate to the event, **Then** that notification is marked as read. |
| **Given** a member clicks "Mark all as read", **When** the action completes, **Then** all notifications are marked as read and the count resets to 0. |

**US-5.2** — Email Notifications
> As a member, I want to receive email notifications for important activity, so that I stay informed even when not in the app.

| Acceptance Criteria |
|---------------------|
| **Given** a new event is created, **When** the system processes it, **Then** an email is sent to all members who have "New event" email notifications enabled. Email is sent within 5 minutes. |
| **Given** an event has a reminder set, **When** the reminder time is reached, **Then** an email is sent to all members who RSVP'd "Yes" or "Maybe" and have "Reminders" enabled. |

**US-5.3** — Notification Preferences
> As a member, I want to choose which notifications I receive (email and in-app separately), so that I'm not overwhelmed.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the Settings page, **When** they view notification preferences, **Then** they see toggles for each notification type, split into Email and In-App columns. |
| Notification types: New event created, Event updated, Event cancelled, Event reminder, New comment on event I RSVP'd to, New RSVP on event I created, Poll created, Poll closed, Availability signal from a member. |
| **Given** a member disables a specific notification type, **When** that event occurs, **Then** no notification of that type is sent to that member. |

---

### Epic 6: Dashboard

**US-6.1** — Dashboard Overview
> As a member, I want to see a dashboard with upcoming events and group activity, so that I get a quick overview.

| Acceptance Criteria |
|---------------------|
| **Given** a member navigates to the Dashboard (home page), **When** the page loads, **Then** it displays: upcoming events (next 5, sorted by date), user's RSVP status for each, group statistics, and the member's profile info. |
| Statistics shown: Total events this month, total events all-time, total members, members available today. |

**US-6.2** — Quick Actions from Dashboard
> As a member, I want to create an event or post availability directly from the dashboard, so that I don't need to navigate to the calendar first.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the Dashboard, **When** they click "New Event", **Then** the event creation form opens. |
| **Given** a member on the Dashboard, **When** they click "Set Availability", **Then** the availability form opens with today's date pre-selected. |

---

### Epic 7: Calendar View

**US-7.1** — Monthly Calendar
> As a member, I want to see a monthly calendar with all events and availability signals, so that I can plan ahead.

| Acceptance Criteria |
|---------------------|
| **Given** a member navigates to the Calendar page, **When** the page loads, **Then** it displays the current month with: events shown as colored badges on their date, availability signals shown as distinct indicators, and navigation arrows to browse previous/next months. |
| **Given** a member clicks on a day with events, **When** the detail panel opens, **Then** it lists all events and availability signals for that day. |
| **Given** a member clicks on an event in the calendar, **When** the event detail opens, **Then** it shows full event info, RSVP options, and discussion thread. |

---

### Epic 8: Settings & Admin

**US-8.1** — Profile Settings
> As a member, I want to view and manage my profile, so that my info is up to date.

| Acceptance Criteria |
|---------------------|
| **Given** a member on the Settings page, **When** they view their profile section, **Then** they see their Google avatar, name, and email (read-only from Google). |

**US-8.2** — Admin Panel
> As the admin, I want a dedicated section to manage members, so that I can control access.

| Acceptance Criteria |
|---------------------|
| **Given** the admin on the Settings page, **When** they view the Admin section, **Then** they see: pending registration requests (with Approve/Deny), list of current members (with option to remove), and storage usage indicator. |
| **Given** a non-admin member, **When** they visit Settings, **Then** the Admin section is not visible. |

---

## 3. Functional Requirements

### 3.1 Authentication

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | Google OAuth 2.0 via Supabase Auth as the sole authentication method |
| FR-AUTH-02 | New users receive `pending` status upon first sign-in |
| FR-AUTH-03 | The first ever user is auto-approved with `admin` role |
| FR-AUTH-04 | Admin can approve or deny pending users from the Settings page |
| FR-AUTH-05 | Denied users see a "Request denied" message on subsequent login attempts |
| FR-AUTH-06 | Sessions persist for 7 days via Supabase session tokens |
| FR-AUTH-07 | Approved users are assigned the `member` role by default |
| FR-AUTH-08 | Admin can remove an existing member (sets status to `removed`) |

### 3.2 File Handling

| ID | Requirement |
|----|-------------|
| FR-FILE-01 | Images uploaded to event threads are stored in Supabase Storage |
| FR-FILE-02 | Accepted formats: JPEG, PNG, WebP |
| FR-FILE-03 | Maximum file size per image: 5 MB |
| FR-FILE-04 | Images are served via Supabase Storage public URLs with RLS policies |
| FR-FILE-05 | Storage usage monitoring: warn admin at 800 MB (80% of 1 GB free tier) |
| FR-FILE-06 | Image thumbnails generated client-side before upload (max 1200px width) for performance |

### 3.3 Core Features

| ID | Requirement |
|----|-------------|
| FR-EVT-01 | Any approved member can create, edit, and delete their own events |
| FR-EVT-02 | Admin can delete any event |
| FR-EVT-03 | Events have: title (max 100 chars), date (required), location (max 200 chars), description (max 2000 chars, optional), reminder timing (default 24h) |
| FR-EVT-04 | RSVP options: Yes, No, Maybe — one per member per event, changeable |
| FR-EVT-05 | Availability signals: date + city (max 100 chars), one per member per day, editable/deletable |
| FR-EVT-06 | Comments: text (max 2000 chars), optional image attachment, deletable by author |
| FR-EVT-07 | Emoji reactions on comments, toggle behavior, with count display |
| FR-EVT-08 | Polls: question + 2–6 options, single vote per member, changeable, closeable by creator |
| FR-EVT-09 | Soft-delete for events (set `deleted_at` timestamp, exclude from queries) |

### 3.4 Notifications

| ID | Requirement |
|----|-------------|
| FR-NOTIF-01 | In-app notification system with bell icon and unread count on all pages |
| FR-NOTIF-02 | Email notifications sent via Supabase Edge Functions + Resend (free tier: 100 emails/day) or equivalent free email API |
| FR-NOTIF-03 | Email delivery within 5 minutes of triggering event |
| FR-NOTIF-04 | Event reminders triggered by Supabase cron (pg_cron) or Vercel Cron Jobs (limited to daily on free tier) |
| FR-NOTIF-05 | 9 configurable notification types (see US-5.3), each independently toggleable for email and in-app |
| FR-NOTIF-06 | Default notification preferences: all enabled for in-app, all enabled for email except "Availability signal" |

### 3.5 Payments

Not applicable — Yakak is a free personal project with no payment processing.

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | Dashboard initial load (LCP) | < 2.0 seconds on 4G connection |
| NFR-PERF-02 | Calendar page initial load (LCP) | < 2.5 seconds on 4G connection |
| NFR-PERF-03 | Event detail load | < 1.5 seconds on 4G connection |
| NFR-PERF-04 | API response time (p95) | < 500 ms |
| NFR-PERF-05 | Image upload + display | < 3 seconds for a 5 MB image on 4G |
| NFR-PERF-06 | Lighthouse Performance score | >= 90 on mobile |

### 4.2 Security

| ID | Requirement |
|----|-------------|
| NFR-SEC-01 | All data access controlled via Supabase Row Level Security (RLS) — only approved members can read/write |
| NFR-SEC-02 | No direct database access from the client; all mutations go through Supabase client SDK with RLS |
| NFR-SEC-03 | File uploads validated server-side: file type (MIME check), size (max 5 MB) |
| NFR-SEC-04 | User input sanitized to prevent XSS (comment text, event fields) |
| NFR-SEC-05 | HTTPS enforced (Vercel default) |
| NFR-SEC-06 | Supabase Storage buckets scoped with RLS: only approved members can upload/read |
| NFR-SEC-07 | OAuth tokens never exposed to client-side JavaScript; handled by Supabase Auth |

### 4.3 Scalability & Reliability

| ID | Requirement |
|----|-------------|
| NFR-SCALE-01 | Designed for 10 concurrent users — no horizontal scaling needed |
| NFR-SCALE-02 | Database size must stay under 500 MB (Supabase free tier) |
| NFR-SCALE-03 | Storage must stay under 1 GB (Supabase free tier) |
| NFR-SCALE-04 | Vercel serverless functions: stay within 100 GB-hours/month (free tier) |
| NFR-SCALE-05 | Application should degrade gracefully if Supabase free tier limits are approached (show warnings, not crashes) |

### 4.4 Accessibility & Responsiveness

| ID | Requirement |
|----|-------------|
| NFR-A11Y-01 | Fully responsive layout: desktop (1280px+), tablet (768px–1279px), mobile (320px–767px) |
| NFR-A11Y-02 | Touch-friendly targets: minimum 44x44px tap areas on mobile |
| NFR-A11Y-03 | Semantic HTML and ARIA labels for interactive elements |
| NFR-A11Y-04 | Color contrast ratio >= 4.5:1 for text (WCAG AA) |

---

## 5. Technical Constraints

### 5.1 Stack (Locked)

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend framework | Next.js (App Router) | 15.x |
| UI runtime | React | 19.x |
| Backend | Next.js API Routes + Supabase | — |
| Database | Supabase PostgreSQL | — |
| Auth | Supabase Auth (Google OAuth) | — |
| File storage | Supabase Storage | — |
| Email sending | Resend (free tier) or Supabase Edge Functions | — |
| Hosting | Vercel (free plan) | — |
| Language | TypeScript | 5.x |

### 5.2 External API & Service Limits

| Service | Free Tier Limit | Risk Level |
|---------|----------------|------------|
| **Supabase Database** | 500 MB | Low (10 users, text data) |
| **Supabase Storage** | 1 GB | Medium (image uploads) |
| **Supabase Auth** | 50,000 MAU | None |
| **Supabase Edge Functions** | 500,000 invocations/month | Low |
| **Supabase Realtime** | 200 concurrent connections | None |
| **Vercel** | 100 GB-hours serverless, 100 GB bandwidth | Low |
| **Vercel Cron Jobs** | 1 cron job, runs once/day (free tier) | Medium (limits reminder granularity) |
| **Resend (email)** | 100 emails/day, 3,000/month | Medium (if many events + comments) |

### 5.3 Timeline

| Milestone | Scope |
|-----------|-------|
| Phase 1 | Auth + Events + Calendar + Dashboard (core loop) |
| Phase 2 | Discussion threads (comments, reactions, images, polls) |
| Phase 3 | Notifications (in-app + email) + Settings |
| Phase 4 | Availability signals |

---

## 6. Out of Scope (v1)

The following are explicitly **not** included in v1:

- Multi-group / multi-tenancy support
- Native mobile applications (iOS / Android)
- Recurring events or event templates
- External calendar sync (Google Calendar, iCal export/import)
- Real-time collaborative editing of events
- Direct messaging between members
- Dark mode (possible future enhancement)
- Logo or custom branding assets
- Monetization, subscriptions, or premium features
- Social login providers other than Google (Apple, GitHub, etc.)
- Push notifications (browser or mobile)
- Event categories or tags
- Map integration for location display
- File attachments other than images (PDF, docs, etc.)

---

## 7. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | **Supabase Storage fills up** (1 GB limit) from image uploads | Medium | High — no more image uploads | Client-side image compression before upload (max 1200px width, ~200 KB). Admin storage dashboard with warning at 800 MB. Oldest images can be manually purged by admin. |
| R2 | **Email daily limit exceeded** (100/day Resend free tier) when many events/comments occur on the same day | Medium | Medium — some emails delayed or dropped | Batch email notifications (digest mode). Prioritize event creation + reminder emails over comment notifications. Queue emails and retry next day if limit hit. |
| R3 | **Vercel Cron limitation** (1 cron/day on free tier) prevents fine-grained event reminders | High | Medium — reminders limited to ~1/day granularity | Run daily cron at a fixed time (e.g., 8:00 AM) that processes all reminders due in the next 24 hours. Document this limitation to users. |
| R4 | **Google OAuth config changes** break authentication | Low | High — no one can log in | Supabase abstracts OAuth; monitor Supabase status page. Keep redirect URIs and Google Cloud Console config documented. |
| R5 | **Supabase free tier pauses** after 1 week of inactivity | Medium | High — app goes offline | Supabase free projects pause after 7 days of inactivity. Set up a simple health-check ping (e.g., Vercel Cron or external free service like UptimeRobot) to keep the project active. |
| R6 | **Low adoption** — friends don't switch from group chat | Medium | High — app unused | Onboard friends together in a single session. Seed the calendar with 2–3 real upcoming events before launch. Make the app feel fun (playful design, reactions, polls). |
| R7 | **Scope creep** delays delivery | Medium | Medium — project stalls | Strict phase-based delivery (see 5.3). No features beyond v1 scope until core is live and adopted. |
