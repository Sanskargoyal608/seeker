# SEEKER — Mental Wellness Platform
## MVP Blueprint · Local Testing Edition · v2.0 · 2025

> **Connecting People to the Right Support — AI-Powered, Human-Centered**

| Field | Details |
|---|---|
| **Document Type** | MVP Product & Engineering Blueprint |
| **Platform Name** | Seeker — Mental Wellness & Therapy Platform |
| **Version** | MVP 2.0 (Lean Core) |
| **Tech Stack** | Python/Django · React Native · PostgreSQL · Docker (Local) |
| **Target Users** | General Users · Graduate Counselors · Licensed Therapists |
| **MVP Test Scale** | 50 Users · 20 Therapists/Counselors |
| **Session Modes** | Text Chat Only |
| **Prepared For** | Founder — Internal Use |
| **Date** | 2025 |

---

## Table of Contents

1. [Introduction & Platform Overview](#1-introduction--platform-overview)
2. [MVP Scope — What's In & What's Out](#2-mvp-scope--whats-in--whats-out)
3. [Core Features — MVP](#3-core-features--mvp)
   - 3.1 General User Features
   - 3.2 Graduate Counselor Features
   - 3.3 Licensed Therapist Features
4. [Technology Stack — Local MVP](#4-technology-stack--local-mvp)
5. [Development Phases & Roadmap](#5-development-phases--roadmap)
6. [Local Docker Setup](#6-local-docker-setup)
7. [Risk Mitigations](#7-risk-mitigations)
8. [Post-MVP Roadmap](#8-post-mvp-roadmap)

---

## 1. Introduction & Platform Overview

### 1.1 What is Seeker?

Seeker is a digital mental wellness platform that bridges the gap between people seeking emotional and psychological support and the right kind of help — whether a peer graduate counselor or a licensed therapist. Built with accessibility, affordability, and clinical safety at its core, Seeker reimagines how mental health support is discovered, accessed, and maintained.

The platform serves three distinct user types:
- **General Users** who seek support
- **Graduate Counselors** (recent psychology graduates) who provide peer-level counseling
- **Licensed Therapists** who manage a professional client-facing practice

An AI-driven conversational intake triages users to the right level of care — not too clinical, not too informal.

### 1.2 The Problem Seeker Solves

- Long wait times and high costs make professional therapy inaccessible to millions.
- People in distress don't know where to start or which type of help they need.
- Recent psychology graduates lack platforms to build their early client base.
- Licensed therapists struggle with scheduling, client management, and digital presence.
- Continuity of care often breaks down after the first session.

### 1.3 The Seeker Solution

Seeker's core innovation is its AI-powered triage engine — a 4-question conversational chat interface that understands a user's needs and routes them to a graduate counselor or licensed therapist. This dramatically lowers the friction of first contact while maintaining clinical safety guardrails.

### 1.4 Platform Mission & Vision

| **Mission** | **Vision** |
|---|---|
| To make mental wellness support accessible, affordable, and stigma-free — at the right level of care, at the right time. | To become the most trusted platform for triage-first mental health support, uniting AI, peer counseling, and professional therapy under one roof. |

### 1.5 MVP Test Goals

| Target | Detail |
|---|---|
| **Users** | 50 general users |
| **Therapists/Counselors** | 20 (mix of graduate counselors and licensed therapists) |
| **Environment** | Fully local, Docker-based — zero cloud spend |
| **Session Type** | Text chat only |
| **Purpose** | Validate the core triage → session → feedback loop before adding anything else |

---

## 2. MVP Scope — What's In & What's Out

### ✅ What's IN the MVP

| Category | Included |
|---|---|
| **Infrastructure** | Local Docker — single `docker-compose up` starts everything |
| **Session Modes** | Text chat only (WebSocket) |
| **AI Triage** | Gemini API — 4-question intake, routing to counselor or therapist |
| **Crisis Detection** | Keyword detection running parallel to triage — immediate admin alert |
| **Real-time Chat** | Django Channels + WebSockets |
| **Auth** | JWT for all 3 roles; Google OAuth2; 2FA for therapists |
| **Payments** | Razorpay test mode — 5-minute free gateway + paid continuation |
| **Search** | Typesense (local Docker) — therapist/counselor discovery |
| **File Storage** | MinIO (local S3-compatible) — profile photos, credential uploads |
| **Email** | Mailhog (local catcher) — all transactional emails inspectable at `localhost:8025` |
| **Push Notifications** | Firebase FCM (free Spark plan) — session reminders, messages, escalation |
| **Feedback** | Simple 4-question qualitative form — stored as plain text, reviewed manually in Django Admin |
| **Scheduling** | Availability slots + booking with automated reminders |
| **Safety Features** | Mandatory emergency contacts, escalation button, crisis detection |
| **Counselor Tools** | Session notes, message highlighting, escalation button |
| **Therapist Portal** | Client list, private chat, session history, standard intake form, basic earnings |
| **Simple Public Profiles** | Next.js pages at `localhost:3000` — no SEO, no structured data |
| **Admin Panel** | Django Admin — approvals, escalation review, manual feedback review |
| **CI/CD** | GitHub Actions — `pytest` on every push |

### ❌ What's OUT of the MVP

| Removed | Reason |
|---|---|
| **Gamification** (points, activities, leaderboards, redemption) | Post-MVP — validate core session loop first |
| **Wellness Points & Activity System** | Post-MVP |
| **Streaks & Streak Rewards** | Post-MVP |
| **Audio Sessions / WebRTC** | Post-MVP — text chat only |
| **Video Sessions** | Post-MVP |
| **AI Feedback Analysis** (FeedbackTheme extraction, Celery analysis) | Post-MVP — feedback stored as plain text, reviewed manually |
| **AI Session Summaries** | Post-MVP — session ends cleanly, no auto-summary |
| **Dynamic Intake Form Builder** (JSON form builder, shareable token URLs) | Post-MVP — fixed standard intake form instead |
| **Counselor Peer Community** | Post-MVP |
| **SEO Optimization** (Schema.org, structured data, Google indexing) | Post-MVP — local profiles only for 50-user test |
| **Advanced Analytics** (earnings charts, return rate, session analytics) | Post-MVP — basic earnings total only |
| **Mood Journal** | Post-MVP |
| **Wellness Insights** (AI-generated weekly summaries) | Post-MVP |
| **Specialized Counseling Marketplace** (category-grouped specialist section) | Post-MVP — flat therapist list for MVP |
| **Certificates of Experience** | Post-MVP |
| **AWS (EC2, RDS, S3, EKS, KMS, SES, CloudFront)** | Replaced by local Docker equivalents |
| **Kubernetes** | Docker Compose is sufficient for 50-user local testing |
| **ML Fine-Tuning (Hugging Face + PEFT)** | Post-MVP — Claude API handles all AI |
| **Stripe** | Razorpay test mode only |
| **Elasticsearch** | Replaced by Typesense (lighter, Docker-ready) |
| **Datadog / Sentry** | Flower + Django logs sufficient locally |
| **Mixpanel / Amplitude** | Manual observation is fine for 50 users |
| **Multi-Language / i18n** | Post-MVP |
| **App Store / Play Store Submission** | Post-MVP |

---

## 3. Core Features — MVP

### 3.1 General User Features

#### 3.1.1 Conversational Onboarding & AI Triage

- New users enter a friendly AI-powered chat — no traditional form.
- The AI asks exactly **4 targeted questions**: emotional state, primary concern, preferred support type, urgency level.
- Based on responses, AI triages into:
  - Direct connection to an available graduate counselor (peer support)
  - Recommendation to a licensed therapist (professional help needed)
- Powered by **Gemini API** — analyzing sentiment, urgency, and topic category.
- **Crisis keyword detection** runs in parallel — critical language immediately flags the session, notifies admin via email, and surfaces the escalation pathway.

#### 3.1.2 Freemium Session Gateway

- First **5 minutes of chat are free** with any counselor or therapist.
- After 5 minutes, a non-intrusive popup appears within the chat with payment options.
- User pays via Razorpay (test mode) and continues — no redirect, no conversation disruption.
- Unpaid sessions end gracefully with an option to schedule a paid follow-up.

#### 3.1.3 User Dashboard & Session History

- Personalized dashboard showing counselors and therapists previously spoken with.
- Each past therapist card: name, photo, specialization, 'Chat Again' button.
- Session history and past session durations tracked.

#### 3.1.4 Therapist Discovery

- 'Browse Therapists' tab — all available counselors and therapists in a flat list.
- Each listing: profile photo, bio, specialization, per-minute rate, availability status.
- Basic filters: specialty, availability, price range.
- Full profile view before committing to a session.

#### 3.1.5 Session Feedback

- At session end, users are prompted to submit a simple **4-question qualitative form** (plain text — no star ratings, by design).
- Questions cover: how they felt before/after, what helped, what could improve, any concerns.
- Feedback stored as plain text. Visible to admin in Django Admin for manual review.
- Users can flag inappropriate behavior for admin escalation.

#### 3.1.6 Emergency Contact & Safety Features

- **Mandatory** minimum 2 emergency contacts (name + phone) at registration — cannot be skipped.
- Disclaimer: *"We will only contact your emergency contacts in a life-threatening situation."*
- A discreet **'I need urgent help'** button always accessible within the app.
- Escalation flow triggered by user action or counselor/therapist detecting critical risk signals.
- On escalation: therapist immediately notified → clinical supervisor looped in → if life-threatening, emergency contacts notified.

#### 3.1.7 In-App Helpline Directory

- Curated list of crisis helplines by region and category (crisis, suicide prevention, domestic, LGBTQ+).
- Seeded via Django management command. Accessible without login.
- Static data — no dynamic management needed for MVP.

---

### 3.2 Graduate Counselor Features

#### 3.2.1 Registration & Credential Verification

- Upload proof of psychology/counseling degree and graduation certificate to MinIO.
- Enter graduation year, university, specialization, years of experience.
- Admin verification in Django Admin before account activation.
- Mandatory orientation quiz — platform policies, ethical guidelines, escalation protocols.
- Mandatory orientation video (linked externally) covering sensitive topics and escalation steps.

#### 3.2.2 Live Session Queue & Management

- Dashboard shows real-time queue of users waiting (WebSocket-powered).
- Each queue entry: wait time, triage category (e.g., stress, family, grief), urgency level.
- Accept any available session with one tap.
- If no accept within 3 minutes, FCM push to all available counselors.
- Availability toggle: **Available / Busy / Away**.

#### 3.2.3 Public Profile (Simple — No SEO)

- Profile page: photo, bio, education, specializations, rates, availability.
- Accessible at `localhost:3000/counselor/[slug]` locally.
- Shareable link — no Google indexing for MVP.
- Slug auto-generated from name on profile save.

#### 3.2.4 Specialty & Availability Management

- Set preferred topic areas — up to 5 primary specialties. Matching engine uses these for routing.
- Set per-minute chat rate and weekly availability slots via calendar view.

#### 3.2.5 In-Session Tools — Notes & Highlighting

- **Split-panel view**: chat on one side, private notes panel on the other.
- Highlight any message → note auto-linked to that highlighted text.
- Real-time notes without interrupting conversation flow.
- All notes **strictly private** — enforced at queryset level. User's JWT cannot retrieve counselor notes under any condition or URL variation.
- Notes persist across sessions.

#### 3.2.6 Escalation

- **'Escalate This Session'** button always visible in session interface.
- Triggering notifies on-call licensed therapist and admin immediately.
- Counselor fills brief form: reason, urgency level, user's current state.
- Licensed therapist joins session, takes over, or advises in a **private backchannel** — user cannot see this channel.
- Every escalation logged in Django Admin.

#### 3.2.7 Basic Earnings

- `EarningsRecord` per session: duration, rate, gross, platform fee, net — calculated on session end.
- Simple list view of earnings per session and running total — no charts, no analytics.
- Weekly payout via Razorpay test mode (Celery task).

---

### 3.3 Licensed Therapist Features

#### 3.3.1 Professional Profile Management

- Full profile: license number, years of experience, therapeutic modalities (CBT, DBT, EMDR, etc.), languages, availability.
- Credential verification by admin before activation.
- Public profile at `localhost:3000/therapist/[slug]` — no SEO for MVP.

#### 3.3.2 Client Management & Private Chat

- Client list with full session history per client.
- Private, encrypted therapist-client chat channel per ongoing relationship.
- Therapists can message clients anytime; clients must schedule to initiate contact.
- Chat history accessible only to the therapist and client.

#### 3.3.3 Scheduling & Calendar Management

- Configure full availability calendar — recurring weekly slots or custom dates.
- Clients book directly through therapist profile or scheduling flow.
- Automatic reminders via FCM + Mailhog 24 hours and 1 hour before each session.
- Therapists can block time and set max sessions per day.

#### 3.3.4 Session Management (Chat Only)

- In-session tools: notes, message highlighting, escalation button — same as counselor tools.
- Session history stored per client, visible in therapist's dashboard.
- No auto-generated session summaries for MVP — therapist writes their own notes.

#### 3.3.5 Fixed Standard Intake Form

- A fixed platform-level intake form sent to new clients — reason for therapy, mental health history, current medications, emergency contact.
- No custom form builder for MVP — one standard form for all therapists.
- Responses stored securely and displayed on client profile in therapist's dashboard.
- Unique booking link per therapist — external visitors land on profile and intake flow without login.

#### 3.3.6 Escalation Intake from Graduate Counselors

- Receive escalation alerts in real-time via FCM + WebSocket.
- Join session, take it over, or advise in the private backchannel.
- All escalated cases documented in Django Admin.

#### 3.3.7 Basic Earnings

- Set own session rates (per session or per minute).
- Basic earnings list per session — platform fee shown transparently.
- Weekly payout via Razorpay test mode (Celery task).

#### 3.3.8 Two-Factor Authentication

- Mandatory 2FA for all licensed therapist accounts — enforced at login, cannot be bypassed.

---

## 4. Technology Stack — Local MVP

All services run locally via Docker Compose. **Zero cloud spend during MVP.**

### 4.1 Architecture Pattern

**Well-structured Django Monolith.** Ship fast, validate with real users, decompose into services only when traffic and complexity justify it.

### 4.2 MVP Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Mobile Frontend** | React Native (Expo) | Cross-platform iOS & Android; tested via Expo Go on physical device |
| **Web Frontend** | React.js (Next.js) | Simple public profiles for counselors and therapists |
| **Backend API** | Python + Django | Core business logic, REST APIs, auth, session management |
| **REST Framework** | Django REST Framework | Serializers, viewsets, permission classes, throttling |
| **Real-Time Chat** | Django Channels + WebSockets | Live bidirectional chat between users and counselors/therapists |
| **Task Queue** | Celery + Redis | Async tasks: reminders, payout processing, notifications |
| **Primary Database** | PostgreSQL | All relational data: users, sessions, profiles, bookings, feedback |
| **Cache & Channel Layer** | Redis | WebSocket channel layer, real-time presence (online/offline) |
| **AI Engine** | Gemini API (Google) | 4-question triage, crisis keyword detection |
| **Search** | Typesense (Docker) | Therapist/counselor discovery and filtering |
| **File Storage** | MinIO (Docker) | Profile photos, credential uploads — local S3-compatible |
| **Payments** | Razorpay (Test Mode) | 5-min free gateway, in-chat payment, weekly payouts |
| **Push Notifications** | Firebase FCM (Spark — Free) | Session reminders, new messages, escalation alerts |
| **Email (Local)** | Mailhog (Docker) | All transactional emails caught locally at `localhost:8025` |
| **Authentication** | JWT + OAuth2 + 2FA | Secure login, Google social auth, mandatory 2FA for therapists |
| **Container Runtime** | Docker + Docker Compose | Single `docker-compose up --build` starts the entire stack |
| **CI/CD** | GitHub Actions | Automated `pytest` on every push — failures block the branch |
| **API Docs** | DRF Spectacular + Swagger | Interactive docs at `localhost:8000/api/docs/` |
| **DB GUI** | TablePlus | Local PostgreSQL inspection |
| **Task Monitor** | Flower (Docker) | Celery task monitor at `localhost:5555` |

### 4.3 What Replaces What

| Original | MVP Replacement | Reason |
|---|---|---|
| AWS S3 | MinIO (Docker) | S3-compatible API, zero cost, runs locally |
| AWS RDS | PostgreSQL in Docker | Same engine, local container |
| AWS ElastiCache | Redis in Docker | Same protocol, local container |
| AWS EC2 / EKS | Docker Compose | No orchestration needed for 50 users |
| AWS SES | Mailhog | All emails caught locally |
| Kubernetes | Docker Compose | Kubernetes is for 1000+ container scale |
| Elasticsearch | Typesense (Docker) | Simpler, faster to set up, great for small datasets |
| WebRTC / Agora / mediasoup | *(Post-MVP)* | Text chat only |
| Hugging Face + PEFT | *(Post-MVP)* | Gemini API handles all AI |
| Datadog / Sentry | Flower + Django logs | Sufficient for local testing |
| Mixpanel / Amplitude | Manual observation | 50 users don't need an analytics platform |
| Stripe | *(Removed)* | Razorpay test mode only |

### 4.4 docker-compose.yml Services

```yaml
services:
  django:       # Backend API — port 8000
  postgres:     # Primary database — port 5432
  redis:        # Cache + WebSocket channel layer — port 6379
  celery:       # Async task worker
  celery-beat:  # Scheduled tasks (reminders, payouts)
  flower:       # Celery monitor — port 5555
  minio:        # Local file storage — port 9000 / console 9001
  mailhog:      # Local email catcher — port 8025
  typesense:    # Search engine — port 8108
  nextjs:       # Public profiles — port 3000
```

**Single command:** `docker-compose up --build`

### 4.5 Data Architecture

- All PII encrypted at rest using AES-256 — enforced from Phase 1, no exceptions.
- Chat messages end-to-end encrypted for licensed therapist sessions.
- Soft deletes throughout — no permanent data deletion.
- Separate schemas for user identity data and session content.

### 4.6 Core Database Models

```
accounts/
  User                 — base user (all 3 roles)
  GraduateCounselor    — extended counselor profile
  LicensedTherapist    — extended therapist profile
  EmergencyContact     — min 2 per user, enforced at serializer level

sessions/
  Session              — state machine: WAITING→MATCHED→ACTIVE→PAYMENT_PENDING→PAID→ENDED
  ChatMessage          — with is_highlighted boolean
  SessionNote          — private to counselor/therapist, linked to ChatMessage FK
  EscalationEvent      — counselor → therapist escalation log
  EarningsRecord       — per-session earnings
  PayoutRecord         — weekly payout aggregation

profiles/
  AvailabilitySlot     — weekly recurring availability
  BlockedDate          — one-off unavailability
  Booking              — confirmed session slot
  IntakeResponse       — fixed standard intake form answers (JSON)

feedback/
  SessionFeedback      — 4 plain text fields, no star rating

notifications/
  UserDevice           — FCM token per device per user

helpline/
  HelplineEntry        — seeded static data, no auth required
```

### 4.7 Mobile App Architecture

- **React Native + Expo** — physical device testing via Expo Go.
- **Redux Toolkit** — global state (auth, session, user profile).
- **React Query** — server-state management (API calls, caching, refetching).
- **React Navigation v6** — tab, stack, and modal navigation.
- **Socket.io client** — real-time WebSocket connection management.

---

## 5. Development Phases & Roadmap

**MVP Timeline: ~20–24 Weeks** (lean scope, solo developer)

| Metric | Value |
|---|---|
| **Total Timeline** | ~20–24 weeks to MVP ready for 50-user testing |
| **Developer** | Solo Founder-Developer — owns every layer |
| **Sprint Length** | 1-week personal sprints — one focused area per sprint |
| **Task Management** | Personal Kanban (Notion or Trello) — To Do / In Progress / Done / Blocked |
| **Testing Strategy** | Write tests as you build — `pytest` for backend, manual + Expo Go for mobile |
| **Phase Gate Rule** | Do NOT start next phase until current deliverables work and are tested |
| **Version Control** | Git + GitHub (private repo) — daily commits, one branch per feature |

---

### Phase 1: Foundation & Local Environment Setup
**Duration: 6–8 Weeks**

**Goals:**
- Full local Docker stack running with a single command
- Complete database schema for all 3 user types
- Authentication for all 3 roles
- Django Admin with credential verification workflow
- React Native scaffold with auth screens on a physical device
- GitHub Actions CI/CD green on every push

**Development Tasks:**

1. Install local toolchain: Docker Desktop, VS Code, Python 3.11+, Node.js, Expo CLI, TablePlus, Postman
2. Create GitHub private repo — branch protection: `main` (always deployable), `develop` (integration), `feature/*` (daily work)
3. Write `docker-compose.yml`: Django, PostgreSQL, Redis, Celery, Celery Beat, MinIO, Mailhog, Flower, Typesense, Next.js — all start with one command
4. Django project scaffold with modular apps: `accounts`, `sessions`, `profiles`, `notifications`, `feedback`, `helpline` — one app per domain
5. PostgreSQL full schema migrations: all models in section 4.6 above
6. JWT auth with refresh token rotation (`djangorestframework-simplejwt`) — test every token flow in Postman before moving on
7. Google OAuth2 via `django-allauth` — local dev credentials
8. Role-based registration for all 3 user types with DRF permission classes enforcing boundaries at the API layer
9. Emergency contact model — minimum 2 contacts enforced at serializer validation, not just frontend
10. Graduate counselor credential upload to MinIO — admin approval workflow in Django Admin
11. Django Admin: credential review queue, approval/rejection with Mailhog email notification
12. React Native scaffold with Expo: bottom tab navigator, auth stack navigator, Redux Toolkit, React Query pointing to `localhost:8000`
13. DRF Spectacular: Swagger docs at `/api/docs/` — document every endpoint as you build it
14. GitHub Actions: run `pytest` on every push to `develop` — failed tests block the branch
15. Base pytest fixtures: `UserFactory`, `GraduateCounselorFactory`, `LicensedTherapistFactory` via `factory_boy`

> **Solo Tip — Week 1:** Get `docker-compose up` running cleanly before writing a single line of app code. A stable local environment saves 10× the time later.

**Deliverables:**
- `docker-compose up --build` — all 10 services running cleanly
- All database tables verified in TablePlus
- Auth API tested in Postman for all 3 roles: register, login, refresh, logout
- Credential upload and admin approval flow end-to-end
- React Native on physical device via Expo Go with working auth screens
- CI pipeline green on GitHub Actions
- Swagger docs at `localhost:8000/api/docs/`

**Testing & QA:**
- Auth tests: register all 3 roles, login, token refresh, logout, duplicate email rejection, wrong password rejection
- Permission boundary tests: hit counselor-only endpoint with user token → expect 403. Repeat for every role boundary.
- Emergency contact validation: register without 2 contacts → expect 400 with clear error
- MinIO upload test: upload credential → verify stored in bucket → URL accessible
- Admin approval test: submit credential → admin approves → role activated → verify blocked before approval
- Database integrity: verify all FK constraints, null constraints, unique constraints hold in TablePlus
- React Native smoke test: navigate every screen via Expo Go — zero crashes
- CI gate: GitHub Actions passes on clean branch before Phase 2 begins

**Phase Gate:** All auth tests pass. CI green. ✅

---

### Phase 2: AI Triage, Real-Time Chat & Session Core
**Duration: 8–10 Weeks**

**Goals:**
- AI-powered 4-question triage via Claude API — the product's core identity
- Real-time bidirectional chat via Django Channels + WebSockets
- 5-minute freemium gateway with Razorpay (test mode)
- Counselor live session queue with real-time updates
- In-session private notes and message highlighting
- Complete session lifecycle: triage → match → active → payment → end → feedback prompt

**Development Tasks:**

1. Install and configure Django Channels with Redis channel layer — verify raw WebSocket handshake in Postman before any chat logic
2. `ChatConsumer` WebSocket handler: send message, receive message, typing indicator, read receipt, user presence (online/offline in Redis)
3. Session state machine as explicit model field: `WAITING → MATCHED → ACTIVE → PAYMENT_PENDING → PAID → ENDED` — invalid transitions rejected at API level
4. Gemini API triage module: system prompt engineered to ask 4 questions sequentially, parse final response for category (`peer_support / licensed_therapist`) and urgency (`low / medium / high / critical`)
5. Crisis keyword detection: runs parallel to triage — critical language at any point → session flagged in DB → admin notified via Mailhog → escalation pathway surfaced in UI
6. Triage routing: after 4th answer, route to correct pathway — display matched counselor info or 'Connecting...'
7. **5-minute session timer:** server-side countdown stored in Redis — cannot be tampered by client. Broadcast remaining time via WebSocket every 30 seconds.
8. Razorpay test mode: on timer expiry → create order → send `order_id` to React Native → payment modal → verify signature on backend before marking `PAID`
9. Post-payment: `PAYMENT_PENDING → PAID`, WebSocket maintained, chat continues — zero interruption to user
10. Counselor queue: WebSocket-powered real-time list of `WAITING` sessions for all online counselors — sorted by wait time
11. Counselor accept flow: tap session → `MATCHED` → user notified → both enter same chat room
12. Queue timeout Celery task: no accept within 3 minutes → FCM push to all available counselors
13. Session notes model: `private=True` enforced at queryset level — user's JWT cannot retrieve counselor notes under any condition or URL variation
14. Message highlighting: `is_highlighted` boolean on `ChatMessage` + linked `NoteEntry` FK — counselor highlights message, note auto-created
15. Split-panel React Native UI: chat on main panel, collapsible counselor-only notes panel — hidden completely from user, not just visually
16. Session end: status → `ENDED` → Celery task triggers feedback prompt FCM push to user after 5 minutes — one notification only, no spam
17. Offline message queue: disconnect mid-session → messages stored with `delivered=False` → delivered on reconnect in correct order
18. Feedback model: `SessionFeedback` with 4 plain text fields + `is_flagged` + `submitted_at` — **no star rating field**
19. Feedback submission API: user submits 4 answers → stored as plain text → visible in Django Admin for manual review
20. Mailhog: verify session confirmation and payment receipt emails render correctly at `localhost:8025`

> **Solo Tip:** Build the WebSocket consumer first and test it raw in Postman before adding any business logic. Get the plumbing right, then build the rooms.

**Deliverables:**
- AI triage working end-to-end in React Native: 4 questions → routing decision displayed
- Real-time WebSocket chat with typing indicators and read receipts — under 100ms on local network
- 5-minute countdown in UI, Razorpay test payment on expiry, session continuing without reload
- Counselor queue updating in real-time
- Private session notes persisting across sessions — verified inaccessible to users via API
- Session ends cleanly → feedback prompt delivered → plain text feedback stored

**Testing & QA:**
- WebSocket isolation test: 5 simultaneous sessions — messages delivered only to correct session, never cross-contaminated
- Triage accuracy: 20 scripted conversations via pytest with mock Claude API — verify correct routing for each
- Crisis detection test: insert crisis language mid-triage → Mailhog email, session flagged in DB, escalation shown in UI
- Timer integrity: attempt to extend timer via client-side WebSocket manipulation → server ignores it, timer holds
- Payment E2E: Razorpay test mode → expiry → popup → test card → backend verified → session continues without reload
- **Notes privacy test (critical):** 3 counselor notes → user JWT calls notes API → expect 403 on every attempt including creative URL variations
- Offline reconnect: disconnect mid-session, 3 messages sent, reconnect — all 3 delivered in correct order
- State machine test: attempt `ENDED → ACTIVE` via direct API call → expect 400 rejection
- Physical device test: complete full session flow on real iOS or Android device — no crashes, no visual glitches

**Phase Gate:** Full session lifecycle E2E on physical device. ✅

---

### Phase 3: Therapist Portal, Scheduling & Discovery
**Duration: 6–8 Weeks**

**Goals:**
- Complete licensed therapist portal
- Scheduling, booking, and automated reminders
- Fixed standard intake form
- Escalation intake from counselors to therapists
- Typesense-powered discovery search
- Simple public profiles via Next.js (local only, no SEO)

**Development Tasks:**

1. Licensed therapist portal: client list view, per-client session history panel, notes summary, feedback view — separate Django views, not one monolithic endpoint
2. Therapist-client private chat: therapist initiates anytime — client must schedule or request before the WebSocket room opens. Enforced in `ChatConsumer` permission check, not just frontend.
3. Availability model: `WeeklySlot` (therapist, day_of_week, start_time, end_time) + `BlockedDate` for one-off unavailability
4. Booking flow: client views calendar → selects open slot → confirms → slot marked booked → both receive confirmation (Mailhog) — written as a transactional DB operation to prevent race conditions
5. Session reminder Celery tasks: 24h before + 1h before — FCM push + Mailhog email
6. Fixed intake form: `IntakeResponse` model storing client answers as JSON for a fixed field set (reason, history, medications, emergency contact) — visible in therapist's client dashboard, not to client
7. Booking link: each therapist gets unique `/book/[therapist-slug]` URL — external visitors can book without login
8. Escalation model: `EscalationEvent` (counselor FK, therapist FK, session FK, urgency, status, notes) — triggers FCM push + Mailhog email to on-call therapist
9. Escalation backchannel: private WebSocket room separate from main session — counselor and therapist communicate without the user seeing it
10. Typesense local setup: `typesense-py`, therapist and counselor index schemas, Django signals to index profiles on save and delete
11. Discovery search API: proxy Typesense queries through Django REST endpoint — client never calls Typesense directly
12. React Native discovery screen: search bar with debounced query, filter drawer (specialty, availability, price), results list, skeleton loader
13. Next.js public profiles: `/pages/counselor/[slug].js` and `/pages/therapist/[slug].js` — SSR with `getServerSideProps` fetching from Django REST API. Simple layout, no Schema.org markup, no SEO for MVP.
14. Slug generation: Django signal on profile save → generate slug from name → stored as unique field
15. User dashboard: sessions grouped by therapist, sorted by last session date, 'Chat Again' CTA

> **Solo Tip:** Next.js is a separate project. `localhost:3000`. Django on `localhost:8000`. Next.js calls Django's public API. Never mix them.

**Deliverables:**
- Full therapist portal: client list, private chat, session history, intake responses visible
- Scheduling: therapist sets availability, client books, both receive confirmation, reminders sent by Celery
- Escalation E2E: counselor triggers → therapist receives FCM + email → joins backchannel → `EscalationEvent` logged in DB
- Standard intake form: client fills via booking link → stored → visible in therapist dashboard
- Typesense search returning accurate results for all filter combinations
- Next.js profiles rendering at `localhost:3000/counselor/[slug]` and `/therapist/[slug]`

**Testing & QA:**
- Booking conflict test: book a slot → attempt to book same slot again → expect rejection, no duplicate in DB
- Therapist chat restriction: client JWT attempts WebSocket with therapist without scheduled session → connection rejected
- Escalation E2E: `EscalationEvent` in DB, FCM notification received, backchannel functional, user's main session unaffected
- Intake form test: client fills via booking link → `IntakeResponse` stored → visible in therapist dashboard
- Typesense: 30 queries across all filter combinations — top 3 results relevant for each
- Reminder test: Celery task manually triggered → email in Mailhog + FCM delivered to device
- Mobile booking flow: external link → profile → availability → book → confirmation — no broken screens
- Regression: re-run all Phase 1 and Phase 2 pytest suites before marking Phase 3 complete

**Phase Gate:** Escalation works E2E. Booking conflict-safe. Discovery functional. ✅

---

### Phase 4: Earnings, Notifications & Real User Testing
**Duration: 4–6 Weeks**

**Goals:**
- Basic earnings tracking and payout (test mode) for counselors and therapists
- Complete FCM push notification system
- Helpline directory seeded and accessible
- Recruit 5–10 real users for end-to-end testing
- Fix all critical bugs before widening to 50-user rollout

**Development Tasks:**

1. `EarningsRecord` model: FK to session, duration_minutes, rate_per_minute, gross_amount, platform_fee_amount, net_amount — calculated on session end by Celery task
2. Payout Celery task: runs weekly Sunday midnight — aggregates unpaid `EarningsRecord` per counselor/therapist → creates `PayoutRecord` → Razorpay payout API test mode
3. Basic earnings screen in React Native: session list with amounts, running total, next payout date — no charts
4. Firebase FCM setup: `firebase-admin` SDK, `UserDevice` model (user FK, fcm_token, platform), `send_push_notification()` utility
5. All notification types implemented:
   - `session_reminder_24h` — 24h before scheduled session
   - `session_reminder_1h` — 1h before scheduled session
   - `new_message` — new chat message while app is backgrounded
   - `session_request` — new user waiting in queue (to counselors)
   - `escalation_alert` — escalation triggered (to therapist)
   - `feedback_prompt` — 5 minutes after session ends (to user)
   - `payout_processed` — payout record created (to counselor/therapist)
6. Notification Center screen in React Native: chronological list, tappable to navigate to relevant screen
7. Helpline directory: `HelplineEntry` model seeded via management command — name, phone, region, category, is_24_7, language — accessible without login

> **Solo Tip:** Get 5 real people through the full flow before widening to 50. A stranger's confusion is your most valuable data.

**Deliverables:**
- Earnings calculated accurately per session, payout task running in test mode, earnings screen showing correct totals
- All 7 notification types delivered to physical devices via FCM
- Helpline directory seeded and accessible without login
- 5–10 real people complete the full journey: register → triage → session → payment → feedback — no critical crashes
- All critical bugs from real-user testing resolved

**Testing & QA:**
- Payout calculation test: 10 sessions at varying rates → run payout task → each `PayoutRecord` = (rate × duration × (1 - platform_fee)) to the rupee
- Double-payout test: run payout task twice in same week → no duplicate `PayoutRecord`
- Earnings accuracy: sum all `EarningsRecord` net amounts per counselor → must match displayed total exactly
- Push notification delivery: trigger all 7 types → delivered to physical iOS and Android devices within 10 seconds
- Helpline test: verify all entries accessible at correct endpoint without auth token
- **Real user test (critical):** 5–10 real people → complete full journey → collect verbal feedback → fix every critical issue reported
- Regression: run all Phase 1, 2, and 3 pytest suites — all must pass before 50-user rollout begins

**Phase Gate:** Real users complete full journey. No critical bugs. 50-user rollout begins. ✅

---

## 6. Local Docker Setup

### 6.1 Prerequisites

```bash
Docker Desktop (latest)
Node.js v18+
Python 3.11+
Expo CLI:    npm install -g expo-cli
TablePlus   # DB GUI
Postman     # API testing
VS Code     # Editor
```

### 6.2 Environment Variables (.env.local)

```env
# Django
DEBUG=True
SECRET_KEY=your-local-secret-key-here
DATABASE_URL=postgres://seeker:seekerpass@postgres:5432/seekerdb
REDIS_URL=redis://redis:6379/0

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# MinIO (local S3)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=seeker-local

# Razorpay (test mode only)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-test-secret

# Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Typesense
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=local-typesense-key

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

> **CRITICAL: `.env.local` in `.gitignore` on Day 1. One accidental commit of a live API key and you rebuild trust from zero.**

### 6.3 Service Access URLs

| Service | URL | Purpose |
|---|---|---|
| Django API | `localhost:8000` | Backend REST API |
| Swagger Docs | `localhost:8000/api/docs/` | Interactive API documentation |
| Django Admin | `localhost:8000/admin/` | Approvals, escalations, feedback review |
| Next.js Profiles | `localhost:3000` | Counselor and therapist public profile pages |
| Mailhog | `localhost:8025` | Inspect all sent emails |
| MinIO Console | `localhost:9001` | File storage browser |
| Flower | `localhost:5555` | Celery task monitor |
| Typesense | `localhost:8108` | Search engine |
| PostgreSQL | `localhost:5432` | Direct DB access via TablePlus |
| Redis | `localhost:6379` | Cache and WebSocket channel layer |

### 6.4 Daily Development Workflow

```bash
# Start entire stack
docker-compose up --build

# Run all backend tests
docker-compose exec django pytest

# Run a specific test file
docker-compose exec django pytest accounts/tests/test_auth.py -v

# View all emails
open http://localhost:8025

# Monitor Celery tasks
open http://localhost:5555

# Django Admin
open http://localhost:8000/admin/

# Start React Native
cd mobile && expo start
# Scan QR with Expo Go on physical device
```

---

## 7. Risk Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI triage misrouting a crisis user | **Critical** | Crisis keyword detection runs independently of triage. Escalation button always visible. Human override always available. |
| Data breach / PII exposure | **Critical** | AES-256 from Phase 1. Strict queryset-level permission checks on notes and feedback. Secrets never in Git. |
| Counselor quality inconsistency | **High** | Mandatory quiz + orientation video before activation. Manual feedback review in Django Admin. Admin can suspend any account immediately. |
| Razorpay test mode issues | **Medium** | Test all payment flows with documented Razorpay test card numbers. Verify webhook signature on every flow. |
| WebSocket chat failure mid-session | **High** | Auto-reconnect with offline message queue. Connection status indicator visible to both participants. |
| Docker service crash | **Medium** | All services stateless except PostgreSQL and Redis. `restart: unless-stopped` on all containers. |
| Burnout (solo developer) | **Critical** | One feature per day. Rest deliberately. Scope is fixed within each phase. Pace is the only thing that gets you there. |

---

## 8. Post-MVP Roadmap

Everything below is explicitly **deferred** until the 50-user local MVP is validated.

### Next Layer — Features Cut From This MVP

These are not abandoned — just deferred until the core loop is proven with real users:

- **Gamification** — Wellness points, activity completion, streaks, leaderboard, session minute redemption
- **Audio Sessions** — Browser-native WebRTC (no Agora needed initially)
- **AI Feedback Analysis** — FeedbackTheme extraction via Gemini API, weekly Celery analysis task
- **AI Session Summaries** — Auto-generated post-session bullet points
- **Dynamic Intake Form Builder** — Therapist-configurable JSON forms with shareable token URLs
- **Counselor Peer Community** — Moderated forum for graduate counselors
- **SEO Optimization** — Schema.org JSON-LD, Google indexing, structured data on profiles
- **Specialized Counseling Marketplace** — Category-grouped specialist section
- **Mood Journal** — Private daily journaling with mood tracker
- **Wellness Insights** — Weekly AI-generated mental health summaries
- **Advanced Analytics** — Earnings charts, session analytics, return rate, trend analysis
- **Certificates of Experience** — Auto-generated after 50/100 sessions

### Production Phase — After MVP Validation

After validating with real users, move to a simple production setup — not AWS, not Kubernetes:

- **VPS Deployment** — DigitalOcean Droplet or Hetzner running Docker Compose; one server, managed PostgreSQL, managed Redis
- **Video Sessions** — Agora.io or 100ms.live after audio is validated
- **SendGrid** — Replace Mailhog with real transactional email delivery
- **Sentry** — Error tracking for production
- **App Store & Play Store Submission**
- **Multi-language Support** — English + Hindi

### Scale Phase — Month 12+

- ML Fine-Tuning (Hugging Face + PEFT) for domain-specific mental health NLP — Gemini API for all AI in MVP
- Voice-First Triage
- Insurance Integration for licensed therapists
- B2B Corporate Wellness plans
- International Expansion — Southeast Asia, then MENA
- Wearable Integration — Apple Health, Fitbit
- Research API — anonymized, consent-based data for academics

---

## Solo Developer Non-Negotiables

> These apply from Day 1. No exceptions.

- **Commit every day** — even a 20-line commit. The git log is your accountability system.
- **Security First** — No user data in plaintext. AES-256 from Phase 1. No exceptions.
- **Write the test before marking the feature done** — not after. A feature without a test is a bug waiting to happen.
- **Never store secrets in Git** — `.env.local` is gitignored on Day 1. No exceptions.
- **Phase gate is a hard gate** — do not start Phase 3 with broken Phase 2 features.
- **Local first, cloud never until validated** — every rupee saved on cloud is available for marketing, legal, or buffer.
- **Clinical safety is never deferred** — emergency contacts, escalation, and crisis detection are Phase 1 and 2 requirements. Not Phase 4 nice-to-haves.
- **No star ratings. Ever.** — Qualitative feedback is a deliberate product decision. Protect it.
- **Ship to real users by Phase 4** — 5 real people through the flow before widening to 50. Their confusion is your most valuable data.
- **Burnout is the biggest risk** — one feature per day, rest intentionally, scope is fixed per phase.
- **Legal before any public launch** — Privacy Policy, Terms of Service, and the graduate counselor legal definition (peer support, not licensed therapy) reviewed by a lawyer before any public user signs up.

---

*Confidential — Internal Use Only*

*Built by one person. Designed to help people when they need it most.*