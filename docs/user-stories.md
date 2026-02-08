# Yakak - MVP User Stories

**Version**: 1.0
**Last updated**: 2026-02-08
**Source**: [PRD](./prd.md)
**Scope**: 1-week MVP — MUST-HAVE features only
**Total story points**: 46 SP (12 stories)

---

## Story Point Reference

| Points | Complexity | Example |
|--------|------------|---------|
| 1 | Trivial | Config change, copy update |
| 2 | Simple | Single component, one DB query |
| 3 | Moderate | Form with validation, CRUD on one entity |
| 5 | Significant | Full feature with multiple components, auth flow |
| 8 | Complex | Multi-component feature with external integrations |

---

## Epic 1: Project Foundation

### US-001 — Initialize Project & Database Schema

> As a developer, I want the project scaffolded with Next.js, Supabase, and the core database schema, so that all other stories have a working foundation.

**Priority**: Must
**Story Points**: 5
**Dependencies**: None

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a fresh clone of the repo, **When** I run `npm install && npm run dev`, **Then** the app starts on `localhost:3000` with no errors. |
| 2 | **Given** the Supabase project is configured, **When** I check the database, **Then** the following tables exist with RLS enabled: `profiles` (id, user_id, display_name, avatar_url, email, role, status, created_at), `events` (id, title, date, location, description, reminder_hours, created_by, deleted_at, created_at, updated_at), `rsvps` (id, event_id, user_id, status, created_at, updated_at), `notifications` (id, user_id, type, reference_id, read, created_at), `notification_preferences` (id, user_id, type, email_enabled, in_app_enabled). |
| 3 | **Given** RLS policies are applied, **When** an unauthenticated request queries any table, **Then** it receives zero rows. |
| 4 | **Given** the Vercel project is linked, **When** I push to `main`, **Then** the app deploys successfully to Vercel. |

---

### US-002 — App Layout Shell & Navigation

> As a member, I want a consistent layout with navigation, so that I can move between Dashboard, Calendar, and Settings pages.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-001

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** an authenticated member on any page, **When** the page renders, **Then** a persistent navigation bar is visible with links to: Dashboard (home), Calendar, Settings. The active page is visually highlighted. |
| 2 | **Given** a mobile viewport (< 768px), **When** the page renders, **Then** navigation is displayed as a bottom tab bar with icons and labels. |
| 3 | **Given** a desktop viewport (>= 768px), **When** the page renders, **Then** navigation is displayed as a sidebar or top bar. |
| 4 | **Given** any page, **When** it loads, **Then** the layout includes a header showing the user's avatar and name, and a notification bell placeholder (non-functional in MVP). |

---

## Epic 2: Authentication & Access Control

### US-003 — Google Sign-In

> As a visitor, I want to sign in with my Google account, so that I can access Yakak without creating a separate account.

**Priority**: Must
**Story Points**: 5
**Dependencies**: US-001

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** an unauthenticated visitor, **When** they navigate to any page, **Then** they are redirected to the login page showing a "Sign in with Google" button and the Yakak name/branding. |
| 2 | **Given** a visitor clicks "Sign in with Google", **When** they complete Google OAuth, **Then** Supabase Auth creates a session and the app receives the user's Google name, email, and avatar. |
| 3 | **Given** a brand-new user (no row in `profiles`), **When** OAuth completes, **Then** a row is inserted into `profiles` with `status = 'pending'` and `role = 'member'`, and the user sees a "Waiting for approval" screen with their name and a message explaining admin approval is required. |
| 4 | **Given** zero existing rows in `profiles`, **When** the very first user completes OAuth, **Then** their profile is created with `status = 'approved'` and `role = 'admin'`. They are redirected to the Dashboard. |
| 5 | **Given** a user whose `status = 'denied'`, **When** they sign in, **Then** they see a "Your request was denied" screen with a sign-out button. |

---

### US-004 — Route Protection Middleware

> As the system, I want to protect all app routes so that only approved members can access content.

**Priority**: Must
**Story Points**: 2
**Dependencies**: US-003

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** an unauthenticated request to any route except `/login`, **When** the middleware runs, **Then** the user is redirected to `/login`. |
| 2 | **Given** an authenticated user with `status = 'pending'`, **When** they navigate to any app route, **Then** they are redirected to `/pending`. |
| 3 | **Given** an authenticated user with `status = 'denied'`, **When** they navigate to any app route, **Then** they are redirected to `/denied`. |
| 4 | **Given** an authenticated user with `status = 'approved'`, **When** they navigate to any app route, **Then** the page loads normally. |

---

### US-005 — Admin Approval of Members

> As the admin, I want to approve or deny pending registration requests, so that only my friends can access Yakak.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-003, US-004

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** the admin navigates to the Settings page, **When** there are users with `status = 'pending'`, **Then** a "Pending Requests" section displays each request with: Google avatar, display name, email, and "Approve" / "Deny" buttons. |
| 2 | **Given** the admin clicks "Approve" on a pending user, **When** the action completes, **Then** the user's `status` is updated to `approved` in the `profiles` table. The request disappears from the pending list. |
| 3 | **Given** the admin clicks "Deny" on a pending user, **When** the action completes, **Then** the user's `status` is updated to `denied`. The request disappears from the pending list. |
| 4 | **Given** a non-admin member navigates to Settings, **When** the page renders, **Then** the "Pending Requests" section is not visible. |
| 5 | **Given** no pending requests exist, **When** the admin views Settings, **Then** the section shows "No pending requests." |

---

### US-006 — Session Persistence & Sign-Out

> As a member, I want to stay logged in across browser sessions and be able to sign out, so that I don't re-authenticate every visit.

**Priority**: Must
**Story Points**: 1
**Dependencies**: US-003

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** an approved member who signed in previously, **When** they revisit Yakak within 7 days, **Then** they are automatically authenticated and see the Dashboard. |
| 2 | **Given** a member clicks "Sign out" (accessible from the header or Settings), **When** the action completes, **Then** the Supabase session is destroyed and they are redirected to `/login`. |

---

## Epic 3: Events (Outings)

### US-007 — Create Event

> As a member, I want to create an outing with a title, date, and location, so that I can propose plans to the group.

**Priority**: Must
**Story Points**: 5
**Dependencies**: US-001, US-004

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a member clicks "New Event" (from Dashboard or Calendar), **When** the form opens, **Then** it displays fields: Title (text, required), Date (date picker, required), Location (text, required), Description (textarea, optional), Reminder (number input, default 24, in hours). |
| 2 | **Given** the member fills all required fields and submits, **When** the event is saved, **Then** a row is inserted into the `events` table with `created_by = current user id` and the member is redirected to the new event's detail page. |
| 3 | **Given** the member submits with a missing required field, **When** they click submit, **Then** inline validation errors appear on the empty fields and the form is not submitted. |
| 4 | **Given** field length limits (title: 100, location: 200, description: 2000 chars), **When** the member types beyond the limit, **Then** input is capped and a character counter is shown. |

---

### US-008 — View Event Detail

> As a member, I want to view the full details of an event, so that I know what's planned and who's coming.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-007

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a member clicks on an event (from Calendar or Dashboard), **When** the detail page loads, **Then** it displays: title, date (formatted), location, description (if present), creator's name and avatar, and the RSVP section. |
| 2 | **Given** the event has RSVPs, **When** the detail page loads, **Then** a summary shows the count per status (Yes / Maybe / No) and a list of members grouped by their RSVP status with avatar + name. Members with no RSVP are listed under "No response". |
| 3 | **Given** the event's `deleted_at` is set, **When** a member navigates to its URL, **Then** they see a "This event has been cancelled" message. |

---

### US-009 — RSVP to Event

> As a member, I want to RSVP yes, no, or maybe to an event, so that the group knows if I'm coming.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-008

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a member views an event detail, **When** they see the RSVP section, **Then** three buttons are displayed: "Yes", "Maybe", "No". If the member has already RSVP'd, their current choice is visually highlighted. |
| 2 | **Given** a member clicks an RSVP button, **When** the action completes, **Then** a row is upserted in the `rsvps` table (event_id + user_id unique) and the RSVP summary on the page updates immediately without full page reload. |
| 3 | **Given** a member changes their RSVP (e.g., from "Yes" to "Maybe"), **When** they click the new status, **Then** the existing row is updated (not duplicated) and the UI reflects the change. |

---

### US-010 — Edit & Delete Event

> As the event creator, I want to edit or delete my event, so that I can update or cancel plans.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-008

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** the event creator views their event, **When** the detail page loads, **Then** "Edit" and "Delete" buttons are visible. |
| 2 | **Given** the creator clicks "Edit", **When** the edit form opens, **Then** all fields are pre-filled with current values. The creator can modify any field and save. The updated values are reflected immediately. |
| 3 | **Given** the creator clicks "Delete", **When** a confirmation dialog appears and they confirm, **Then** the event's `deleted_at` is set to the current timestamp (soft delete) and the member is redirected to the Dashboard. |
| 4 | **Given** a member who is NOT the creator and NOT admin, **When** they view the event, **Then** "Edit" and "Delete" buttons are hidden. |
| 5 | **Given** the admin views any event, **When** the detail page loads, **Then** the "Delete" button is visible (admin can delete any event). |

---

## Epic 4: Calendar View

### US-011 — Monthly Calendar

> As a member, I want to see a monthly calendar with all events, so that I can see what's coming up at a glance.

**Priority**: Must
**Story Points**: 5
**Dependencies**: US-007

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a member navigates to the Calendar page, **When** the page loads, **Then** the current month is displayed as a grid with day cells. Each day that has events shows a colored dot or badge with the event count. |
| 2 | **Given** the calendar is showing a month, **When** the member clicks the left/right navigation arrows, **Then** the calendar navigates to the previous/next month. A "Today" button returns to the current month. |
| 3 | **Given** a member clicks on a day cell, **When** the day has events, **Then** a panel or modal shows a list of that day's events (title + location). Clicking an event navigates to its detail page. |
| 4 | **Given** a day has no events, **When** the member clicks on it, **Then** the "New Event" form opens with that date pre-selected. |
| 5 | **Given** a mobile viewport, **When** the calendar renders, **Then** it is fully responsive — day cells are tappable (min 44px touch target) and event badges are legible. |

---

## Epic 5: Dashboard

### US-012 — Dashboard Home Page

> As a member, I want a dashboard showing upcoming events and group stats, so that I get a quick overview when I open the app.

**Priority**: Must
**Story Points**: 5
**Dependencies**: US-007, US-009

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** a member navigates to the Dashboard (root `/`), **When** the page loads, **Then** it displays: a "Welcome, [name]" greeting with their avatar, an "Upcoming Events" section, a "Stats" section, and a "New Event" quick-action button. |
| 2 | **Given** the "Upcoming Events" section, **When** it renders, **Then** it shows the next 5 future events sorted by date ascending. Each card shows: title, date, location, RSVP count summary (e.g., "4 going · 2 maybe"), and the current user's RSVP status badge. |
| 3 | **Given** the "Stats" section, **When** it renders, **Then** it displays: events this month (number), events all-time (number), total members (number). |
| 4 | **Given** there are no upcoming events, **When** the section renders, **Then** it shows an empty state: "No upcoming events — be the first to create one!" with a link to create an event. |
| 5 | **Given** a member clicks on an event card, **When** they click, **Then** they navigate to the event detail page (US-008). |

---

## Epic 6: Settings & Admin

### US-013 — Settings Page (Profile & Admin)

> As a member, I want a settings page to view my profile, and as the admin, I want to manage members from the same page.

**Priority**: Must
**Story Points**: 3
**Dependencies**: US-005

| # | Acceptance Criteria |
|---|---------------------|
| 1 | **Given** any member navigates to Settings, **When** the page loads, **Then** they see a "Profile" section showing their Google avatar, display name, and email (all read-only). |
| 2 | **Given** the admin navigates to Settings, **When** the page loads, **Then** they see an additional "Admin" section below Profile, containing: the pending requests list (US-005) and a "Members" list showing all approved members (avatar, name, email, role badge). |
| 3 | **Given** the admin views the Members list, **When** they click "Remove" on a member, **Then** a confirmation dialog appears. On confirm, the member's `status` is set to `removed` and they disappear from the list. |
| 4 | **Given** a non-admin member, **When** they view Settings, **Then** the "Admin" section is completely hidden. |

---

## Summary

### Story Point Breakdown

| Epic | Stories | Points |
|------|---------|--------|
| 1 — Project Foundation | US-001, US-002 | 8 |
| 2 — Authentication & Access Control | US-003, US-004, US-005, US-006 | 11 |
| 3 — Events (Outings) | US-007, US-008, US-009, US-010 | 14 |
| 4 — Calendar View | US-011 | 5 |
| 5 — Dashboard | US-012 | 5 |
| 6 — Settings & Admin | US-013 | 3 |
| **Total** | **13 stories** | **46 SP** |

### Dependency Graph

```
US-001 (Project Setup)
  ├── US-002 (Layout Shell)
  ├── US-003 (Google Sign-In)
  │     ├── US-004 (Route Protection)
  │     │     ├── US-005 (Admin Approval)
  │     │     │     └── US-013 (Settings Page)
  │     │     └── US-007 (Create Event)
  │     │           ├── US-008 (View Event Detail)
  │     │           │     ├── US-009 (RSVP)
  │     │           │     └── US-010 (Edit/Delete Event)
  │     │           ├── US-011 (Calendar View)
  │     │           └── US-012 (Dashboard)
  │     └── US-006 (Session & Sign-Out)
```

### Critical Path

**US-001 → US-003 → US-004 → US-007 → US-008 → US-009**

This is the shortest path to a working app where a user can sign in, create an event, view it, and RSVP — the core value loop.

---

## Deferred to Post-MVP

The following features from the PRD are explicitly **deferred** and NOT included in the 46 SP above:

| Feature | PRD Reference | MoSCoW | Rationale |
|---------|---------------|--------|-----------|
| Text comments on events | US-4.1 | Should | Core value works without discussion; add in Phase 2 |
| Emoji reactions | US-4.2 | Could | Enhancement to comments; depends on comments |
| Image sharing in threads | US-4.3 | Could | Enhancement to comments; adds storage complexity |
| Polls on events | US-4.4 | Could | Enhancement to comments; adds schema complexity |
| In-app notifications (bell + unread) | US-5.1 | Should | Important for engagement but not blocking core loop |
| Email notifications | US-5.2 | Should | Important for adoption but requires Resend setup |
| Notification preferences | US-5.3 | Should | Depends on notification system existing first |
| Availability signals | US-3.1, US-3.2 | Could | Nice-to-have; Phase 4 per PRD timeline |
| Dashboard quick actions | US-6.2 | Should | Convenience; "New Event" button covers this partially |
