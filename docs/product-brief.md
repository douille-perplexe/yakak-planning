# Yakak - Product Brief

## 1. Problem Statement

A group of ~10 friends currently organizes outings and events through scattered chat conversations. Important dates get lost in the noise, there is no shared persistent view of upcoming plans, and coordination is chaotic. There is no single place to propose events, see who's available, or track what's coming up.

## 2. Target Users

- **Primary users**: A single, closed friend group of approximately 10 people
- **Demographics**: Young adults in their twenties, highly comfortable with technology
- **Usage context**: Coordinating social outings, weekend plans, trips, and group activities

## 3. Value Proposition

Yakak is a shared group calendar that replaces chaotic group chat planning with a dedicated, organized space where friends can:

- Propose outings and see everything in one calendar view
- Signal their availability so others know when and where they're free
- RSVP to events and discuss plans with rich comment threads
- Stay informed through configurable email and in-app notifications

## 4. Core Features

### 4.1 Authentication & Access

- **Google authentication** (single sign-on via Google)
- **Registration with admin approval**: Users request access; the administrator approves or denies
- **Auto-admin**: The first registered user automatically receives administrator privileges
- **Admin rights**: Approve/deny registration requests, manage members

### 4.2 Events (Outings)

- **Any member** can create an event
- **Required fields**: Title, date, location
- **Optional fields**: Description
- **RSVP system**: Members can confirm attendance (yes / no / maybe)
- **Reminder timing**: Event creator sets reminder timing (default: 1 day before)

### 4.3 Availability Signals

- Members can mark days with a lightweight availability status
- Indicates: "I'm available in [city] — open to plans"
- Visible to all members on the calendar so others can spot overlap and propose outings

### 4.4 Discussion Threads (per outing)

- **Text comments** on each event, displayed as a discussion thread
- **Emoji reactions** on comments
- **Image sharing** within threads
- **Polls** (e.g., "Restaurant A or B?")

### 4.5 Notifications

#### Email Notifications
- New outing created
- Event reminders (timing set by event creator, default 1 day before)
- Configurable per interaction type (new comments, RSVPs, poll results, etc.)

#### In-App Notifications
- Internal notification system (bell icon / unread count)
- Highlights new activity the user hasn't viewed yet
- Granular per-interaction notification preferences in settings

### 4.6 Pages & Navigation

| Page | Content |
|------|---------|
| **Dashboard (Home)** | Statistics, upcoming outings, user info summary |
| **Calendar** | Calendar view with events and availability signals |
| **Settings** | Notification preferences, profile, admin panel (if admin) |

## 5. Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (React) |
| **Backend / API** | Next.js API routes + Supabase |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth with Google provider |
| **Email** | Supabase (or free email service) |
| **Hosting** | Vercel |
| **File storage** | Supabase Storage (for images) |

## 6. Constraints

- **Budget**: Free tier only (Vercel free, Supabase free plan)
- **Platform**: Web application only, fully responsive (mobile-first design)
- **Scope**: Single friend group, no multi-tenancy
- **Scale**: ~10 users, low traffic
- **Design**: Colorful and playful visual style
- **Simplicity**: Personal project — keep architecture and features lean

## 7. Supabase Free Tier Limits to Keep in Mind

- Database: 500 MB
- Storage: 1 GB
- Auth: 50,000 monthly active users (not a concern)
- Edge Functions: 500,000 invocations/month
- Realtime: 200 concurrent connections

## 8. Out of Scope (for now)

- Multi-group / multi-tenancy support
- Native mobile apps
- Monetization / premium features
- Logo / branding design
- Recurring events
- External calendar sync (Google Calendar, iCal)

## 9. Success Criteria

- All ~10 friends actively using the app to plan outings
- Events no longer get lost in group chat
- Members can see at a glance what's coming up and who's available
- Notification system keeps everyone informed without being noisy
