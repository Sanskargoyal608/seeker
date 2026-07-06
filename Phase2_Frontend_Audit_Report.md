# Seeker Platform: Phase 1 & 2 Frontend Audit Report

**Date:** June 2026
**Scope:** Frontend Architecture, Phase 1 (AI Triage & Onboarding), and Phase 2 (Core Chat & Provider Tools).
**Environment:** React Native (Expo) - `frontend/` directory.

---

## 1. Executive Summary
This audit report outlines the exact frontend architecture and the granular implementation details of all features completed across Phase 1 and Phase 2. The frontend is built using **React Native with Expo Router** and manages state via **Redux Toolkit**. It communicates with the Django backend via an intercepted **Axios API client** and establishes real-time capabilities via **WebSockets**.

By the end of Phase 2, the app successfully supports three distinct user roles (`GENERAL_USER`, `COUNSELOR`, `THERAPIST`), routing them seamlessly from login to AI-powered intake (Triage), into a real-time matching queue, and finally into a fully functional real-time clinical chat environment complete with timers, notes, and escalation pathways.

---

## 2. Global Architecture & Networking

### 2.1 File & Routing Structure (Expo Router)
The app uses file-based routing divided into two primary groups to handle unauthenticated vs. authenticated states securely:
*   `app/(auth)/`: Unauthenticated screens (`login.js`, `register.js`).
*   `app/(app)/`: Authenticated screens requiring a valid JWT (`_layout.js`, `dashboard.js`, `triage.js`, `chat/[id].js`, `counselor-queue.js`).

### 2.2 Networking & API Interceptors (`api/axios.js`)
All HTTP requests to the backend are routed through a customized Axios instance that ensures strict security and seamless user experience.
*   **Request Interceptor:** Automatically injects the JWT `access_token` (retrieved from `expo-secure-store`) into the `Authorization: Bearer <token>` header of every outgoing request.
*   **Response Interceptor (Auto-Refresh):** If the backend returns a `401 Unauthorized` error indicating an expired access token, the interceptor automatically pauses the request, posts the `refresh_token` to `/api/accounts/auth/refresh/`, updates the secure store with the newly minted access token, and securely replays the original request. If the refresh fails, the tokens are flushed, forcing a re-login.

### 2.3 State Management (`store/authSlice.js`)
**Redux Toolkit** is utilized to keep track of the global user state. The Redux store maintains:
*   `user`: The complete user object, including their unique ID, email, and their highly critical `role` (`GENERAL_USER`, `COUNSELOR`, `THERAPIST`).
*   `accessToken`: Readily available in memory to avoid asynchronous disk lookups where possible.
*   `isAuthenticated`: A boolean determining whether the user should be allowed into the `(app)` router segment.

---

## 3. Phase 1: Onboarding & AI Triage

### 3.1 Role-Based Registration & Login
*   **`register.js`**: Users can dynamically select their role via segmented buttons. The app handles the creation of a base user and immediately invokes the OTP (One-Time Password) flow. The UI shifts to an OTP validation screen where users type the 6-digit code mailed to them to finalize activation.
*   **`login.js`**: Standard email/password authentication. Upon success, Redux is populated, and SecureStore saves the JWT tokens.

### 3.2 AI Triage Engine (`triage.js`)
Instead of static forms, `GENERAL_USER` accounts are greeted with a chat-based intake powered by the Gemini AI API (proxied via Django).
*   **Behavior**: The UI looks like a standard chat interface. The AI asks exactly 4 questions sequentially (e.g., emotional state, primary concern, support type, urgency).
*   **Crisis Detection**: As the user types, their input is processed. If critical keywords (e.g., self-harm) are detected, the app surfaces an immediate `🚨 Panic Button` and `Emergency Services` UI, alongside alerting backend admins asynchronously.
*   **Final Routing**: After 4 responses, the triage ends. A modal is presented assigning them to either "Peer Support" (Counselors) or "Professional Care" (Therapists), transitioning the user into a `WAITING` session.

---

## 4. Phase 2: Core Chat, Queueing & Provider Tools

### 4.1 Counselor Queue (`counselor-queue.js`)
*   **Audience**: Exclusively accessible to Graduate Counselors (`role === 'COUNSELOR'`).
*   **Functionality**: Displays a real-time list of all sessions currently stuck in the `WAITING` status (from users who just finished triage).
*   **Action**: Counselors tap "Accept", which fires an API `PATCH /api/core/sessions/<id>/accept/`, transitions the session status to `MATCHED`, and automatically reroutes the counselor into `chat/[id].js`.

### 4.2 Dashboard Management (`dashboard.js`)
A centralized hub that conditionally renders based on the user's role.
*   **Session Lifecycle Visibility**: Displays cards for all sessions assigned to the user (`WAITING`, `MATCHED`, `ACTIVE`, `PAYMENT_PENDING`, `PAID`, `ENDED`).
*   **Click-to-Chat**: Users can click active sessions to enter the real-time chat. As of recent bug-fixes, users and therapists can also click `ENDED` sessions to review past historical transcripts.
*   **Therapist Features**: 
    *   **Direct Booking Inbox:** If a user direct-books a therapist, it appears as `WAITING`. Therapists have a dynamic **"✅ Accept Request"** button directly on the dashboard card to match the session.
    *   **Clinical Log Access:** Both Counselors and Therapists see a **"📝 View Notes"** button to open past private clinical notes in a dedicated modal.

### 4.3 Real-Time Chat Environment (`chat/[id].js`)
The most complex technical component of the application. It handles live messaging, WebSocket state management, billing events, and provider toolsets.

#### 4.3.1 WebSocket Implementation
*   **Connection Lifecycle:** Mounts a raw `WebSocket` connection targeting `ws://localhost:8000/ws/chat/<id>/?token=<JWT>`. 
*   **Event Handling (`onmessage`)**: 
    *   `chat.message`: Inbound messages from the other participant. Appends strictly to the React `messages` state array and updates the `FlatList` UI.
    *   `timer.update`: Inbound integer representing remaining session time in seconds.
    *   `payment.required`: Inbound trigger fired when the 5-minute freemium timer exhausts.
    *   `system.alert`: Renders simple React Native `Alert.alert` dialogs for server-side notices.

#### 4.3.2 Freemium Timer & Payment Gates
*   The top header displays the live countdown timer parsed from the `timer.update` WS events.
*   Upon exhaustion, the WebSocket halts chat permissions and fires the `payment.required` flag.
*   **For Users:** Displays a payment blockage UI ("Pay Now"). Clicking "Pay Now" mocks the Razorpay gateway by pinging `/api/core/sessions/<id>/verify-payment/`, successfully unlocking the chat and resuming the flow to `PAID` without reloading the page.
*   **For Providers:** Displays a silent, non-blocking alert that the user is currently paying.

#### 4.3.3 Conditional Provider Tools (`isProvider` logic)
The UI dynamically reacts depending on whether the viewer is the patient or the provider. Providers see a toolbar below the chat input:
*   **Add Note Modal**: Counselors and Therapists can tap "📝 Add Note" to open a modal, type a private clinical note, and submit it to the backend `SessionNote` API.
*   **Escalate Session Modal**: *Strictly available to Counselors only.* Counselors who feel out of their depth can tap "🚨 Escalate". This opens a complex modal that:
    1.  Fetches a live list of `Licensed Therapists` via `api/core.js`.
    2.  Prompts the counselor to select an Urgency (`LOW`, `MEDIUM`, `CRITICAL`).
    3.  Collects a clinical reason.
    4.  Submits an `EscalationEvent` payload to transition care to a specialized professional.

#### 4.3.4 Post-Session Feedback
When the session is formally concluded via the red "End" button:
*   **Providers**: Simply redirected to their `dashboard.js`.
*   **General Users**: Automatically intercepted by a 4-question Feedback Modal ("How did you feel before?", "How do you feel after?", etc.) to collect qualitative success metrics.

---

## 5. Design System & Aesthetics (`constants/theme.js`)
To ensure a calming, premium, and trustworthy mental wellness aesthetic, the frontend strictly adheres to a predefined token system:
*   **Palette**: Soft grayish-blue backgrounds (`#F7F9FC`), gentle calm blue primary elements (`#4A90E2`), soft teal/green success accents (`#50E3C2`), and muted text colors to reduce eye strain.
*   **Typography**: Scaled font sizes and standardized weights.
*   **Radii & Spacing**: Abundant use of `borderRadius: 14/18` for rounded, friendly bubbles and wide spacing (`SPACING.md`) for a breathable, uncluttered layout.

## 6. Audit Conclusion
The Phase 1 & 2 frontend architecture successfully supports concurrent user roles, robust global state management, and real-time clinical workflows. The application safely handles disconnections, authenticates intelligently behind the scenes, securely prevents general users from accessing clinical notes, and effectively mocks payment continuity. The frontend is fully primed for **Phase 3: Therapist Scheduling, Availability, and Next.js Public Portals**.
