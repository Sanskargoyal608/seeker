# Seeker — Phase 3 Roadmap: Therapist Portal, Scheduling & Discovery

**Goal:** Transform the platform from an immediate, text-based triage service into a comprehensive, scheduled mental wellness network. Phase 3 introduces advanced scheduling, Typesense-powered discovery, public Next.js web profiles, and an advanced clinical backchannel for escalated cases.

---

## Sprint 1: Availability & The Booking Engine
**Objective:** Allow therapists to set their working hours, and let users browse availability to book scheduled appointments instead of just immediate triage.

### 1. Backend Models & APIs (Django)
*   **`WeeklySlot` Model:** Tracks a therapist's recurring weekly availability (e.g., Monday 9 AM - 5 PM).
*   **`BlockedDate` Model:** Allows therapists to override weekly slots for vacations or specific days off.
*   **`IntakeResponse` Model:** Stores structured JSON data from a fixed set of questions (Reason, Medical History, Medications, Emergency Contact) submitted during booking.
*   **Booking API:** 
    *   Endpoint to fetch available slots for a specific therapist (calculated on the fly using `WeeklySlot` minus `BlockedDate` and existing `Session` overlaps).
    *   Endpoint to confirm a booking and save the `IntakeResponse`.

### 2. Automated Reminders (Celery)
*   **24-Hour & 1-Hour Reminders:** Build periodic Celery tasks (`celery beat`) that scan upcoming scheduled sessions and dispatch FCM Push Notifications and Mailhog emails to both the user and the assigned therapist.

### 3. Frontend App Integrations (React Native)
*   **Therapist Settings:** A new screen for therapists to configure their `WeeklySlot`s.
*   **Client Booking Flow:** A user-facing calendar and time-picker UI, followed by the mandatory Intake Form, leading to a session confirmation.

---

## Sprint 2: The Typesense Discovery Engine
**Objective:** Move away from manual assignments and allow users to search, filter, and discover therapists on their own using a high-performance local search engine.

### 1. Infrastructure Setup
*   **Typesense Docker:** Integrate Typesense into the `docker-compose.yml` stack alongside Postgres and Redis.

### 2. Django Indexing & Signals
*   **Profile Indexing:** Create a Typesense schema for Therapists (and Counselors).
*   **Django Signals:** Whenever a `LicensedTherapist` profile is created, updated, or deleted in Postgres, automatically sync that change to the Typesense collection.
*   **Search Proxy API:** Build a Django API endpoint (`/api/core/search/`) that securely queries the internal Typesense container and returns formatted results, preventing the frontend from talking to Typesense directly.

### 3. Frontend Discovery Tab (React Native)
*   **Search UI:** Build a dedicated "Discover" tab.
*   **Live Search:** A debounced search bar.
*   **Filters Drawer:** Options to filter therapists by Language, Modality (e.g., CBT, EMDR), and Price/Budget.
*   **Skeleton Loaders:** Smooth loading states while fetching Typesense results.

---

## Sprint 3: Next.js Public Web Portal
**Objective:** Create SEO-friendly (for future use), public-facing web profiles for therapists to share externally, allowing new users to book directly from the web.

### 1. Initialization
*   Bootstrap a brand new Next.js application inside `e:\Seeker\web` (running on `localhost:3000`).

### 2. Server-Side Rendered Profiles
*   Create dynamic routes: `/therapist/[slug]` and `/counselor/[slug]`.
*   **Django Slugs:** Implement a Django backend signal that auto-generates a unique URL slug (e.g., `dr-jane-doe`) when a therapist profile is saved.
*   **Next.js Data Fetching:** Use `getServerSideProps` to fetch profile data from the Django REST API and render beautiful, public-facing profile cards.

### 3. External Web Booking Link
*   **Booking Gateway:** Visitors to `/book/[therapist-slug]` will be presented with a booking calendar.
*   *Note on Limitations:* For Phase 3, users can **only** book from the web. After Phase 4, we will introduce a web-based chat panel. Until then, the web serves strictly as a booking and discovery gateway.

---

## Sprint 4: Advanced Clinical Chat & Dashboard
**Objective:** Build out the professional tools necessary for complex care, including counselor-to-therapist handoffs and continuous client care.

### 1. The Escalation Backchannel (React Native + Django)
*   **New WebSocket Room:** When a counselor escalates a session to a therapist, create a completely separate WebSocket channel (`ws://.../ws/escalation/<id>/`).
*   **Private UI:** Build a UI in the React Native app where the Counselor and Therapist can chat privately regarding the patient's case, completely hidden from the user's main session.

### 2. Therapist-Initiated Chat
*   **Open Access:** Update WebSocket authentication rules to allow Therapists to initiate a chat with any of their past or current clients at any time, without requiring a newly booked or paid session (for the duration of the MVP).

### 3. Therapist Dashboard Enhancements
*   **Client History View:** Instead of a simple chronological list of sessions, allow therapists to group their dashboard by "Client". 
*   **Intake Form Access:** Allow therapists to view the JSON `IntakeResponse` submitted by the client during the Sprint 1 booking flow.
*   **"Chat Again" CTA:** Quick-action buttons to leverage the new therapist-initiated chat feature.
