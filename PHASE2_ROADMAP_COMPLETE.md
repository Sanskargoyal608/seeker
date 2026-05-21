# SEEKER — PHASE 2 COMPLETE ROADMAP

## AI Triage, Real-Time Chat & Session Core

**Project:** Seeker — Mental Wellness Platform MVP  
**Phase:** 2 (Foundation Complete ✅)  
**Duration:** 8–10 Weeks (Solo Developer, 1-week sprints)  
**Created:** 2026-05-21  
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Phase 2 Overview](#phase-2-overview)
3. [Architecture & Technology](#architecture--technology)
4. [Sprint-by-Sprint Breakdown](#sprint-by-sprint-breakdown)
5. [Sprint 1: WebSocket Foundation](#sprint-1-websocket-foundation)
6. [Sprint 2: Session State Machine](#sprint-2-session-state-machine)
7. [Sprint 3: Gemini AI Triage](#sprint-3-gemini-ai-triage)
8. [Sprint 4: Crisis Detection](#sprint-4-crisis-detection)
9. [Sprint 5: Payment & Timer](#sprint-5-payment--timer)
10. [Sprint 6: Counselor Queue](#sprint-6-counselor-queue)
11. [Sprint 7: Notes & Escalation](#sprint-7-notes--escalation)
12. [Sprint 8: Firebase FCM](#sprint-8-firebase-fcm)
13. [Sprint 9: Feedback & Lifecycle](#sprint-9-feedback--lifecycle)
14. [Sprint 10: Testing & Validation](#sprint-10-testing--validation)
15. [Database Models](#database-models)
16. [API Endpoints](#api-endpoints)
17. [Testing Strategy](#testing-strategy)
18. [Deployment & DevOps](#deployment--devops)
19. [Risk Management](#risk-management)
20. [Success Criteria](#success-criteria)

---

## EXECUTIVE SUMMARY

### What is Phase 2?

Phase 2 transforms Seeker from a static auth system (Phase 1) into a **real-time, AI-powered mental wellness platform**. Users can now enter conversations, get triaged by AI, and connect with counselors/therapists in real-time.

### Why These 10 Features?

The 10-sprint sequence follows **industry-standard architecture patterns**:

1. **Infrastructure First** (WebSockets, state machines)
2. **Core Value** (AI triage, crisis detection)
3. **Business Logic** (payments, queue management)
4. **Tools** (notes, escalation, notifications)
5. **Quality** (testing, validation)

### Timeline

- **Total:** 8–10 weeks (solo developer)
- **Parallel Sprints:** 4, 6, 7, 8 can run after Sprint 2 completes
- **Critical Path:** Sprints 1→2→3→5→9→10 (~5 weeks minimum)

### Key Technologies

| Layer         | Technology                   | Purpose               |
| ------------- | ---------------------------- | --------------------- |
| **Real-Time** | Django Channels + WebSockets | Bidirectional chat    |
| **AI**        | Gemini API                   | 4-question triage     |
| **Payments**  | Razorpay (test mode)         | Freemium gateway      |
| **Push**      | Firebase FCM                 | Notifications         |
| **Cache**     | Redis                        | Channel layer + cache |
| **DB**        | PostgreSQL                   | Persistence           |

---

## PHASE 2 OVERVIEW

### Goals (What You're Building)

✅ **Real-time bidirectional chat** — user ↔ counselor via WebSockets  
✅ **Gemini AI-powered triage** — 4 questions → routing decision  
✅ **5-minute freemium session** — timer + Razorpay payment  
✅ **Counselor live queue** — real-time updates, session matching  
✅ **Private session notes** — counselor-only, security-verified inaccessible to users  
✅ **Crisis detection** — keyword scanning + admin alert  
✅ **Offline message queue** — resilient chat on poor connections  
✅ **Firebase FCM setup** — push notifications infrastructure  
✅ **Feedback system** — 4 plain text questions, no star ratings  
✅ **Complete session lifecycle** — triage → match → active → payment → ended → feedback

### What's NOT in Phase 2

❌ Therapist portal (Phase 3)  
❌ Scheduling & bookings (Phase 3)  
❌ Typesense search (Phase 3)  
❌ Public profiles via Next.js (Phase 3)  
❌ Earnings payouts (Phase 4)  
❌ Real user testing (Phase 4)

### Deliverables at End of Phase 2

**Backend:**

- 15+ new Django models
- 20+ new REST API endpoints
- WebSocket consumer with room management
- Gemini triage service
- Crisis detection service
- Payment verification service
- Notification service
- Session state machine
- > 90% test coverage

**Frontend:**

- Chat screen (iOS & Android)
- Queue screen (counselor)
- Feedback screen
- Payment modal (Razorpay)
- Notification handling

**Infrastructure:**

- Daphne ASGI server
- Redis channel layer
- Firebase FCM integration
- Razorpay test account
- Celery tasks for background jobs

---

## ARCHITECTURE & TECHNOLOGY

### WebSocket Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  React Native Client (iOS/Android)                      │
│  ├─ ChatScreen opens WebSocket connection              │
│  ├─ Sends: { type: "message", text: "Hello" }          │
│  └─ Receives: real-time messages, typing indicators    │
└───────────────┬─────────────────────────────────────────┘
                │ ws://localhost:8000/ws/chat/session_123/
                ▼
┌─────────────────────────────────────────────────────────┐
│  Daphne ASGI Server (Django Channels)                  │
│  ├─ ChatConsumer.connect() → join room                 │
│  ├─ ChatConsumer.receive() → parse & broadcast         │
│  ├─ ChatConsumer.disconnect() → leave room             │
│  └─ Redis Channel Layer for room management            │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Redis (Channel Layer)                                 │
│  ├─ room_session_123: [user_1, counselor_2]            │
│  ├─ session_123_timer: 240 seconds remaining           │
│  ├─ user_1_presence: online                            │
│  └─ Message queue for offline delivery                 │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  PostgreSQL (Persistence)                              │
│  ├─ Session table (state machine)                      │
│  ├─ ChatMessage table                                  │
│  ├─ SessionNote (counselor private)                    │
│  ├─ SessionFeedback (4 plain text Qs)                  │
│  └─ EarningsRecord                                     │
└─────────────────────────────────────────────────────────┘
```

### Session State Machine

```
┌─────────┐
│ WAITING │  ← User enters triage, waiting for counselor
└────┬────┘
     │
     │ (counselor accepts)
     ▼
┌─────────────┐
│   MATCHED   │  ← Counselor-user pair confirmed
└────┬────────┘
     │
     ├─────────────────────────┐
     │                         │
     │ (5 min timer expires)   │
     ▼                         ▼
┌──────────────┐      ┌──────────────────┐
│ PAYMENT_     │      │      PAID        │
│ PENDING      │      │  (payment made)  │
└──────────────┘      └──────────────────┘
     │                         │
     └────────────┬────────────┘
                  │
                  │ (session ends)
                  ▼
              ┌────────┐
              │ ENDED  │
              └────────┘
```

### Triage Flow

```
User Starts App
      ↓
AI asks Question 1: "How are you feeling emotionally?"
      ↓
User Answers (Gemini receives)
      ↓
AI asks Question 2: "What's your main concern?"
      ↓
[CRISIS DETECTION runs in parallel]
      ↓
User Answers Q2, Q3, Q4
      ↓
Gemini API: Parse final response → routing decision
      ↓
├─ PEER_SUPPORT → Graduate Counselor (Session created, WAITING)
│  └─ Added to counselor queue
│
└─ LICENSED_THERAPIST → Licensed Therapist
   └─ Recommend booking
```

### API Request/Response Flow

```
Client (React Native)
      │
      ├─ POST /api/triage/start/
      │  └─ Response: { question: "Q1: How are you feeling?", session_id: "xyz" }
      │
      ├─ POST /api/triage/respond/
      │  └─ Request: { session_id: "xyz", response: "I'm anxious" }
      │  └─ Response: { question: "Q2: What's your main concern?", session_id: "xyz" }
      │
      ├─ WebSocket: ws://localhost:8000/ws/chat/session_xyz/
      │  └─ Send: { type: "message", message: "Hello counselor" }
      │  └─ Receive: { type: "chat.message", message: "Hi there!", sender: "Other" }
      │
      ├─ PATCH /api/sessions/xyz/highlight-message/
      │  └─ Request: { message_id: 123, note: "Important point" }
      │  └─ Response: { success: true, note_id: 456 }
      │
      ├─ POST /api/sessions/xyz/verify-payment/
      │  └─ Request: { order_id: "order_123", signature: "sig_xyz" }
      │  └─ Response: { status: "PAID", message: "Payment verified" }
      │
      └─ POST /api/sessions/xyz/feedback/
         └─ Request: { q1: "Felt better", q2: "More supported", q3: "Counselor was kind", q4: "Keep availability longer" }
         └─ Response: { success: true, feedback_id: 789 }
```

---

## SPRINT-BY-SPRINT BREAKDOWN

### Quick Reference Table

| Sprint | Week | Title                 | Effort | Status                 |
| ------ | ---- | --------------------- | ------ | ---------------------- |
| 1      | 1    | WebSocket Foundation  | 5 days | Pending                |
| 2      | 2    | Session State Machine | 5 days | Pending                |
| 3      | 3    | Gemini AI Triage      | 5 days | Pending                |
| 4      | 4    | Crisis Detection      | 5 days | Pending (can parallel) |
| 5      | 5    | Payment & Timer       | 5 days | Pending                |
| 6      | 6    | Counselor Queue       | 5 days | Pending (can parallel) |
| 7      | 7    | Notes & Escalation    | 5 days | Pending (can parallel) |
| 8      | 8    | Firebase FCM          | 5 days | Pending (can parallel) |
| 9      | 9    | Feedback & Lifecycle  | 5 days | Pending                |
| 10     | 10   | Testing & Validation  | 5 days | Pending                |

### Critical Path (Minimum 5 Weeks)

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 5 → Sprint 9 → Sprint 10

Optional Parallelization (Sprints 4, 6, 7, 8 start after Sprint 2 done)
```

---

## SPRINT 1: WEBSOCKET FOUNDATION

**Duration:** Week 1 (5 days)  
**Objective:** Get raw WebSocket communication working with zero business logic  
**Owner:** Solo Developer  
**Status:** Ready to Start

### Sprint 1 Tasks

| Day | Task                          | Details                                                                | Acceptance Criteria                                                         |
| --- | ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Install Django Channels       | Add to requirements.txt; update settings.py; update docker-compose.yml | `docker-compose up` works; Daphne starts on 8000                            |
| 2   | Configure Redis Channel Layer | Verify Redis connection; test channel layer from Django shell          | `redis-cli ping` returns PONG; Django shell channel layer test passes       |
| 3   | Create ChatConsumer           | Write connect/disconnect/receive methods; implement room management    | ChatConsumer class imports without errors; methods are async                |
| 4   | Test WebSocket in Postman     | Open connection; send message; verify echo; test room isolation        | Postman connects; message echoed; 2 different rooms don't cross-contaminate |
| 5   | Documentation & Commit        | Write WebSocket API docs; save Postman collection; commit to Git       | docs/WEBSOCKET_API.md created; Postman collection saved; git commit made    |

### Sprint 1 Deliverables

- ✅ `requirements.txt` — Channels dependencies added
- ✅ `config/settings.py` — CHANNEL_LAYERS configuration
- ✅ `config/asgi.py` — Complete ProtocolTypeRouter setup
- ✅ `docker-compose.yml` — Daphne instead of runserver
- ✅ `core/consumers.py` — ChatConsumer class
- ✅ `docs/WEBSOCKET_API.md` — API documentation
- ✅ `Seeker Phase 2 - WebSocket Echo.json` — Postman collection

### Sprint 1 Success Criteria

- [ ] `docker-compose up --build` succeeds
- [ ] Daphne ASGI server starts on port 8000
- [ ] Postman WebSocket connects to `ws://localhost:8000/ws/chat/test/`
- [ ] Message sent echoed back within 100ms
- [ ] Two connections with different session_id don't share messages
- [ ] Two connections with same session_id receive all messages
- [ ] Logs show `[CONNECT]`, `[RECEIVE]`, `[DISCONNECT]`
- [ ] Code committed to Git with detailed message

---

## SPRINT 2: SESSION STATE MACHINE

**Duration:** Week 2 (5 days)  
**Objective:** Build Session model with explicit state transitions  
**Owner:** Solo Developer  
**Status:** Pending Sprint 1

### Sprint 2 Tasks

| Task                         | Type    | Effort | Details                                                                                        |
| ---------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------- |
| Update Session Model         | Backend | 1 day  | Add `status` field with choices: `WAITING → MATCHED → ACTIVE → PAYMENT_PENDING → PAID → ENDED` |
| State Machine Logic          | Backend | 2 days | Create `SessionStateManager` class; enforce valid transitions; reject invalid ones             |
| ChatMessage Enhancements     | Backend | 1 day  | Add `delivered_at`, `read_at`, `is_highlighted` fields                                         |
| Write State Transition Tests | Testing | 1 day  | 10+ pytest cases for valid/invalid transitions                                                 |

### Sprint 2 Deliverables

- ✅ `core/models.py` — Updated Session model with state machine
- ✅ `core/state_machine.py` — SessionStateManager class
- ✅ `core/tests/test_session_states.py` — pytest cases
- ✅ Database migration file

### Sprint 2 Success Criteria

- [ ] `session.status` defaults to `WAITING`
- [ ] Valid transitions (`WAITING → MATCHED → ACTIVE → PAYMENT_PENDING → PAID → ENDED`) all pass
- [ ] Invalid transitions (e.g., `ENDED → MATCHED`) raise ValidationError
- [ ] Django Admin shows current status with readable label
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 3: GEMINI AI TRIAGE

**Duration:** Week 3 (5 days)  
**Objective:** Build 4-question triage engine powered by Gemini API  
**Owner:** Solo Developer  
**Status:** Pending Sprint 2

### Gemini API Integration Details

#### Why Gemini?

- **Cost:** Free tier available (vs paid Claude API)
- **Speed:** Faster response for short conversations
- **Simplicity:** `google-generativeai` SDK is easy to use
- **Local Testing:** Works with mock responses during dev

#### Installation & Setup

```bash
# Install package
pip install google-generativeai

# Get API key
# Visit: https://ai.google.dev/
# Click "Get API Key"
# Create new API key in Google AI Studio
# Add to .env.local: GEMINI_API_KEY=your_key_here
```

#### Architecture

```python
# TriageService flow:

class TriageService:
    def start_triage(session_id):
        # Call Gemini with system prompt
        # Return: Question 1
        # Store: TriageResponse with question_1_text

    def process_response(session_id, user_response, question_number):
        # Retrieve conversation history
        # Check for crisis keywords (parallel)
        # Call Gemini with full context
        # If final response: extract routing + urgency
        # Return: Next question OR routing decision
```

#### System Prompt (Gemini)

```
You are a mental health intake triage assistant for Seeker platform.

Your role: Ask exactly 4 sequential questions to understand the user's mental health needs.

QUESTIONS:
1. How are you feeling emotionally right now? (emotional state)
2. What's your main concern or reason for seeking support? (primary concern)
3. Would you prefer peer-level support or professional therapy? (support preference)
4. On a scale of 1-10, how urgent is your situation? (urgency)

AFTER ALL 4 ANSWERS:
Provide ONLY this format:
ROUTING: [PEER_SUPPORT | LICENSED_THERAPIST]
URGENCY: [LOW | MEDIUM | HIGH | CRITICAL]

IMPORTANT:
- Ask ONE question at a time
- Listen empathetically
- If user mentions crisis keywords (suicide, self-harm, abuse), flag as CRITICAL
- Default to PEER_SUPPORT unless professional therapy is explicitly needed
```

### Sprint 3 Tasks

| Task                        | Type    | Effort | Details                                                 |
| --------------------------- | ------- | ------ | ------------------------------------------------------- |
| Set Up Gemini API           | Setup   | 1 day  | Get API key; test in Django shell                       |
| Create TriageService        | Backend | 2 days | Implement start_triage() and process_response() methods |
| Create Models & Serializers | Backend | 1 day  | TriageResponse model; serializers for API               |
| Build REST Endpoints        | Backend | 1 day  | /triage/start/ and /triage/respond/                     |
| Write Pytest                | Testing | 1 day  | Mock Gemini API; test 5 conversation paths              |

### Sprint 3 Deliverables

- ✅ `core/services/triage_service.py` — TriageService class
- ✅ `core/models.py` — TriageResponse model
- ✅ `core/serializers.py` — TriageResponseSerializer
- ✅ `core/views.py` — Triage endpoints
- ✅ `core/tests/test_triage.py` — pytest cases
- ✅ `.env.local` — GEMINI_API_KEY added
- ✅ `requirements.txt` — google-generativeai added

### Sprint 3 Success Criteria

- [ ] Gemini API successfully called from Django
- [ ] `/triage/start/` returns first question
- [ ] `/triage/respond/` with answer returns next question
- [ ] After 4th question, returns routing decision (peer_support / licensed_therapist)
- [ ] All pytest cases pass (15+ test cases)
- [ ] System prompt tested with 5 different conversation paths
- [ ] Git commit made

---

## SPRINT 4: CRISIS DETECTION

**Duration:** Week 4 (5 days)  
**Objective:** Detect dangerous language and trigger escalation  
**Owner:** Solo Developer  
**Status:** Can start after Sprint 2

### Crisis Detection Architecture

```
User sends message in triage or chat
      ↓
CrisisDetectionService.scan_message()
      ↓
Check against CrisisKeyword table (100+ keywords)
      ↓
├─ Match found?
│  ├─ YES: Set session.is_crisis_flagged = True
│  │       Send email to admin
│  │       Create CrisisAlert record
│  │       Show escalation pathway in UI
│  │
│  └─ NO: Continue normally
│
└─ Return crisis_detected: bool
```

### Sprint 4 Tasks

| Task                     | Type    | Effort | Details                                                                                              |
| ------------------------ | ------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Create Crisis Keyword DB | Backend | 1 day  | Model: CrisisKeyword; seed with 100+ keywords; categories: SUICIDE/SELF_HARM/ABUSE/VIOLENCE/OVERDOSE |
| Build Detection Service  | Backend | 1 day  | CrisisDetectionService with scan_message() method                                                    |
| Integrate into Triage    | Backend | 1 day  | Run detection on each triage response                                                                |
| Create Admin Alert       | Backend | 1 day  | Email to admin on detection; CrisisAlert model                                                       |
| Write Pytest             | Testing | 1 day  | Test 30+ crisis phrases; verify low false positive rate                                              |

### Sprint 4 Deliverables

- ✅ `core/models.py` — CrisisKeyword, CrisisAlert models
- ✅ `core/services/crisis_detection.py` — Detection service
- ✅ `core/management/commands/seed_crisis_keywords.py` — Keyword seeding
- ✅ `core/admin.py` — CrisisAlertAdmin panel
- ✅ `core/tests/test_crisis_detection.py` — pytest cases
- ✅ Email template — crisis_alert_email.html

### Sprint 4 Success Criteria

- [ ] Keyword "suicide" in any message → session flagged
- [ ] Case-insensitive matching works
- [ ] False positive rate < 5%
- [ ] Admin receives email within 10 seconds
- [ ] Django Admin shows flagged sessions in real-time
- [ ] All pytest cases pass (30+ test cases)
- [ ] Git commit made

---

## SPRINT 5: PAYMENT & TIMER

**Duration:** Week 5 (5 days)  
**Objective:** Implement 5-minute freemium timer and Razorpay payment  
**Owner:** Solo Developer  
**Status:** Can start after Sprint 2

### Payment Flow

```
Session starts
      ↓
Server-side Redis timer: 300 seconds
      ↓
Every 30 seconds: broadcast remaining time to client via WebSocket
      ↓
At 0 seconds: timer expires
      ↓
Create Razorpay order
      ↓
Send order_id to React Native client
      ↓
Client shows payment modal (Razorpay SDK)
      ↓
User enters test card: 4111 1111 1111 1111
      ↓
Backend verifies signature
      ↓
├─ Valid: session.status = PAID; resume chat
│
└─ Invalid: reject; show error
```

### Razorpay Test Setup

1. **Create Razorpay Test Account**
   - Go to: https://dashboard.razorpay.com
   - Create account → choose "Test Mode"
   - Get: Key ID and Key Secret

2. **Test Credentials**

   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=rzp_test_secret_xxxxx
   ```

3. **Test Payment Card**
   - Number: `4111111111111111`
   - Expiry: `12/25`
   - CVV: `123`
   - Always succeeds in test mode

### Sprint 5 Tasks

| Task                       | Type     | Effort | Details                                                                  |
| -------------------------- | -------- | ------ | ------------------------------------------------------------------------ |
| Set Up Razorpay            | Setup    | 1 day  | Create test account; add credentials to .env                             |
| Create Timer Model         | Backend  | 1 day  | SessionTimer: session_id, start_time, end_time, is_paid                  |
| Server-Side Timer (Redis)  | Backend  | 2 days | Store in Redis; broadcast remaining time every 30s; server-authoritative |
| Razorpay Order API         | Backend  | 1 day  | Create order on timer expiry; send order_id to client                    |
| Payment Verification       | Backend  | 1 day  | Verify Razorpay signature; update session.status                         |
| React Native Payment Modal | Frontend | 1 day  | Display on timer expiry; integrate Razorpay SDK                          |
| Offline Message Queue      | Backend  | 1 day  | Store messages while unpaid; flush on payment                            |
| Write Pytest               | Testing  | 1 day  | Test timer accuracy; payment verification; offline queue                 |

### Sprint 5 Deliverables

- ✅ Razorpay account credentials in `.env.local`
- ✅ `core/models.py` — SessionTimer model
- ✅ `core/services/payment_service.py` — RazorpayPaymentService
- ✅ `core/consumers.py` — Timer countdown broadcast
- ✅ `core/views.py` — `/sessions/{id}/verify-payment/` endpoint
- ✅ `frontend/components/PaymentModal.js` — Razorpay UI
- ✅ `core/tests/test_payment_flow.py` — pytest cases

### Sprint 5 Success Criteria

- [ ] Timer countdown broadcasts every 30 seconds
- [ ] At 0 seconds, Razorpay order created
- [ ] React Native shows payment modal on expiry
- [ ] Test card accepted in Razorpay
- [ ] Backend signature verification passes
- [ ] Session.status updated to PAID
- [ ] Chat resumes without reload
- [ ] Offline messages queued and delivered
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 6: COUNSELOR QUEUE

**Duration:** Week 6 (5 days)  
**Objective:** Build real-time session queue and counselor matching  
**Owner:** Solo Developer  
**Status:** Can start after Sprint 2

### Queue Architecture

```
User enters triage → Matched to counselor
      ↓
Session created with status=WAITING
      ↓
Session added to Redis queue: "queue:waiting:sessions"
      ↓
All online counselors see queue in real-time (WebSocket)
      ↓
Counselor taps "Accept" session
      ↓
session.status = MATCHED
      ↓
User notified → both join same chat room
      ↓
Queue removed from counselor view (still in Redis but marked MATCHED)
```

### Sprint 6 Tasks

| Task                      | Type     | Effort | Details                                                                   |
| ------------------------- | -------- | ------ | ------------------------------------------------------------------------- |
| Matching Algorithm        | Backend  | 2 days | Match user to available counselor; fairness: round-robin or load-balanced |
| Availability Toggle       | Backend  | 1 day  | CounselorAvailability model; status: AVAILABLE/BUSY/AWAY                  |
| Queue Endpoint            | Backend  | 1 day  | GET /sessions/queue/ — list all WAITING sessions                          |
| Accept Flow               | Backend  | 1 day  | PATCH /sessions/{id}/accept/ → update status → notify user                |
| Room Management           | Backend  | 1 day  | Create named room; user + counselor join same room                        |
| Queue Timeout Task        | Backend  | 1 day  | No accept within 3 min → FCM push to all counselors                       |
| React Native Queue Screen | Frontend | 1 day  | Real-time list; accept button; wait time + triage category                |
| React Native Chat Screen  | Frontend | 1 day  | Chat UI; messages; input; highlighting toggle; escalation button          |
| Write Pytest              | Testing  | 1 day  | Test matching fairness; room isolation; timeout                           |

### Sprint 6 Deliverables

- ✅ `core/models.py` — CounselorAvailability model
- ✅ `core/services/matching_service.py` — Matching logic
- ✅ `core/views.py` — Queue + accept endpoints
- ✅ `core/consumers.py` — Room management
- ✅ `core/tasks.py` — queue_timeout_task
- ✅ `frontend/screens/CounselorQueueScreen.js`
- ✅ `frontend/screens/ChatScreen.js`
- ✅ `core/tests/test_matching.py`

### Sprint 6 Success Criteria

- [ ] Multiple WAITING sessions appear in queue in real-time
- [ ] Counselor accepts → user notified within 2 seconds
- [ ] User + counselor in same WebSocket room
- [ ] No message cross-contamination
- [ ] 3-minute timeout triggers FCM push
- [ ] Chat screen works on mobile
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 7: NOTES & ESCALATION

**Duration:** Week 7 (5 days)  
**Objective:** Build counselor private notes and escalation system  
**Owner:** Solo Developer  
**Status:** Can start after Sprint 2

### Security: Notes Privacy

**CRITICAL:** Users MUST NOT access counselor notes under ANY circumstance.

```
Attempt 1: GET /sessions/{id}/notes/ with user JWT
Response: 403 Forbidden (IsNoteOwner permission check)

Attempt 2: GET /sessions/{id}/notes/?user_id=123
Response: 403 Forbidden (same check)

Attempt 3: GET /sessions/{id}/messages/?include=notes
Response: 403 Forbidden (custom query serializer)

Attempt 4: GET /sessions/{id}/
Response: 200 OK (session data only, no notes field)
```

### Sprint 7 Tasks

| Task                     | Type     | Effort | Details                                                               |
| ------------------------ | -------- | ------ | --------------------------------------------------------------------- |
| Update SessionNote Model | Backend  | 1 day  | Add private=True queryset filter; enforce at view level               |
| Privacy Permission Class | Backend  | 1 day  | Create IsNoteOwner; block all user access                             |
| Notes Endpoints          | Backend  | 1 day  | GET/POST/DELETE /sessions/{id}/notes/ (counselor only)                |
| Highlighting Endpoint    | Backend  | 1 day  | PATCH /messages/{id}/highlight/ → auto-create linked note             |
| Escalation Model         | Backend  | 1 day  | EscalationEvent: counselor → therapist; urgency; reason               |
| Escalation Notifications | Backend  | 1 day  | FCM + email to therapist on escalation                                |
| Backchannel Room         | Backend  | 1 day  | Private WebSocket room for counselor + therapist (user cannot access) |
| React Native Notes Panel | Frontend | 1 day  | Split-panel UI; collapsible notes (hidden from user)                  |
| React Native Escalation  | Frontend | 1 day  | Escalate button; reason form; confirmation                            |
| Security Tests           | Testing  | 1 day  | 50+ attempts to access notes via different paths → all 403            |

### Sprint 7 Deliverables

- ✅ `core/models.py` — Enhanced SessionNote, EscalationEvent
- ✅ `core/permissions.py` — IsNoteOwner permission
- ✅ `core/views.py` — Notes + escalation endpoints
- ✅ `core/consumers.py` — Backchannel room logic
- ✅ `frontend/screens/ChatScreen.js` — Notes panel
- ✅ `core/tests/test_notes_privacy.py` (50+ test cases)
- ✅ `core/tests/test_escalation.py`

### Sprint 7 Success Criteria

- [ ] Counselor can create/read/delete notes
- [ ] User JWT cannot retrieve notes (403 on all attempts)
- [ ] Message highlighting creates linked note
- [ ] Escalation triggered → therapist receives FCM + email
- [ ] Backchannel WebSocket isolated (user cannot join)
- [ ] All privacy tests pass (50+ attempts, all 403)
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 8: FIREBASE FCM

**Duration:** Week 8 (5 days)  
**Objective:** Set up Firebase Cloud Messaging and push notifications  
**Owner:** Solo Developer  
**Status:** Can start after Sprint 2

### Firebase Setup

#### Step 1: Create Firebase Project

```
1. Go to: https://console.firebase.google.com/
2. Click "Create a project"
3. Name: "Seeker Local"
4. Create project
5. Wait for initialization
```

#### Step 2: Generate Service Account Key

```
1. In Firebase Console → Project Settings (gear icon)
2. Go to "Service Accounts" tab
3. Click "Generate New Private Key"
4. Download JSON file → move to project as firebase-credentials.json
5. Add to .gitignore: firebase-credentials.json
```

#### Step 3: Add to Django Settings

```python
# settings.py
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate(
    os.path.join(BASE_DIR, 'firebase-credentials.json')
)
firebase_admin.initialize_app(cred)
```

### Sprint 8 Tasks

| Task                    | Type     | Effort | Details                                                     |
| ----------------------- | -------- | ------ | ----------------------------------------------------------- |
| Create Firebase Project | Setup    | 1 day  | Set up project; enable FCM; download credentials            |
| Install Firebase SDK    | Backend  | 1 day  | `pip install firebase-admin`; initialize in settings        |
| UserDevice Model        | Backend  | 1 day  | Store FCM tokens; platform (iOS/Android); last_used_at      |
| NotificationService     | Backend  | 1 day  | send_push_notification() method using Firebase Admin SDK    |
| Notification Types      | Backend  | 2 days | Implement 7 notification types (see below)                  |
| Celery Tasks            | Backend  | 1 day  | Async tasks for each notification type                      |
| React Native FCM        | Frontend | 1 day  | Call /devices/register/ on app launch; send FCM token       |
| Physical Device Test    | Testing  | 1 day  | Trigger each notification; verify delivery on iOS + Android |
| Write Pytest            | Testing  | 1 day  | Mock Firebase; test notification methods                    |

### 7 Notification Types

| Type                   | Trigger                                 | Recipients               |
| ---------------------- | --------------------------------------- | ------------------------ |
| `session_reminder_24h` | 24h before scheduled session            | Client                   |
| `session_reminder_1h`  | 1h before scheduled session             | Client                   |
| `new_message`          | New chat message while app backgrounded | Both users               |
| `session_request`      | New user waiting in queue               | All available counselors |
| `escalation_alert`     | Escalation triggered                    | On-call therapist        |
| `feedback_prompt`      | 5 min after session ends                | User                     |
| `payout_processed`     | Weekly payout created                   | Counselor/therapist      |

### Sprint 8 Deliverables

- ✅ Firebase project credentials in `.env.local`
- ✅ `firebase-credentials.json` created and gitignored
- ✅ `notifications/models.py` — UserDevice model
- ✅ `notifications/services/notification_service.py` — NotificationService
- ✅ `notifications/tasks.py` — All 7 Celery tasks
- ✅ `notifications/views.py` — Device registration endpoint
- ✅ `frontend/hooks/usePushNotifications.js` — FCM token registration
- ✅ `core/tests/test_fcm.py` — Pytest cases
- ✅ `requirements.txt` — firebase-admin added

### Sprint 8 Success Criteria

- [ ] Firebase project created
- [ ] Service account credentials downloaded
- [ ] Firebase Admin SDK initialized in Django
- [ ] React Native calls `/devices/register/` on launch
- [ ] Manual notification trigger sends FCM push
- [ ] Notification received on physical iOS device within 10 seconds
- [ ] Notification received on physical Android device within 10 seconds
- [ ] All 7 notification types tested
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 9: FEEDBACK & LIFECYCLE

**Duration:** Week 9 (5 days)  
**Objective:** Build feedback system and complete session lifecycle  
**Owner:** Solo Developer  
**Status:** Depends on Sprint 5

### Session Lifecycle

```
1. WAITING      — User enters triage
2. MATCHED      — Counselor accepts
3. ACTIVE       — Chat starts
4. PAYMENT_PENDING OR PAID — Timer + payment handled
5. ENDED        — Both disconnect or forced end
6. FEEDBACK_PENDING → User gets FCM prompt
7. FEEDBACK_SUBMITTED → EarningsRecord calculated
```

### Sprint 9 Tasks

| Task                         | Type     | Effort | Details                                                                                                           |
| ---------------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Update SessionFeedback Model | Backend  | 1 day  | 4 plain text fields: q1_before, q2_after, q3_what_helped, q4_what_improve; is_flagged boolean; **NO star rating** |
| Feedback Endpoints           | Backend  | 1 day  | POST /sessions/{id}/feedback/ (user role); GET (retrieve submitted feedback)                                      |
| Session End Flow             | Backend  | 1 day  | Graceful disconnection → update status to ENDED                                                                   |
| Feedback Prompt Task         | Backend  | 1 day  | Celery: 5 min after ENDED → send FCM feedback prompt                                                              |
| Earnings Calculation         | Backend  | 1 day  | Celery: Calculate per-session earnings; store in EarningsRecord                                                   |
| Django Admin Panel           | Backend  | 1 day  | SessionFeedbackAdmin: list all feedback; flag/unflag; search by user/counselor                                    |
| React Native Feedback Screen | Frontend | 1 day  | 4-text-input form; submit button; confirmation message                                                            |
| FCM Feedback Notification    | Frontend | 1 day  | On notification tap → navigate to feedback screen                                                                 |
| E2E Lifecycle Test           | Testing  | 1 day  | Complete full flow: triage → match → chat → payment → feedback                                                    |
| Write Pytest                 | Testing  | 1 day  | Test full lifecycle; earnings calculation; feedback storage                                                       |

### Sprint 9 Deliverables

- ✅ `core/models.py` — Enhanced SessionFeedback
- ✅ `core/views.py` — Feedback endpoints
- ✅ `core/tasks.py` — Finalize session + earnings tasks
- ✅ `core/admin.py` — SessionFeedbackAdmin
- ✅ `frontend/screens/FeedbackScreen.js`
- ✅ `core/tests/test_session_lifecycle.py`
- ✅ `core/tests/test_feedback.py`

### Sprint 9 Success Criteria

- [ ] Session ends → user receives feedback prompt after 5 min
- [ ] User submits 4 plain text answers
- [ ] Feedback stored in DB
- [ ] No star rating fields anywhere
- [ ] Admin can view all feedback
- [ ] Flagged feedback highlighted
- [ ] Earnings calculated correctly on session end
- [ ] Full E2E lifecycle works on mobile
- [ ] All pytest cases pass
- [ ] Git commit made

---

## SPRINT 10: TESTING & VALIDATION

**Duration:** Week 10 (5 days)  
**Objective:** Comprehensive testing and quality gates  
**Owner:** Solo Developer  
**Status:** Depends on all previous sprints

### Sprint 10 Tasks

| Task                     | Type    | Effort | Details                                                                               |
| ------------------------ | ------- | ------ | ------------------------------------------------------------------------------------- |
| WebSocket Isolation Test | Testing | 1 day  | 5 simultaneous sessions; 100 messages each; verify zero cross-contamination           |
| Triage Accuracy Test     | Testing | 1 day  | 20 scripted conversations; verify correct routing (peer_support / licensed_therapist) |
| Crisis Detection Test    | Testing | 1 day  | 100+ non-crisis messages; verify no false positives                                   |
| Timer Accuracy Test      | Testing | 1 day  | 10 timer cycles; verify accuracy within 1 second                                      |
| Payment E2E Test         | Testing | 1 day  | 10 payment flows; test card; verify signature verification                            |
| Notes Privacy Test       | Testing | 1 day  | 50+ URL variations; all must return 403                                               |
| Counselor Queue Test     | Testing | 1 day  | 100 waiting sessions; 10 counselors; verify fair distribution                         |
| Physical Device E2E Test | Testing | 2 days | Complete flow on iOS (Expo Go) + Android (Expo Go)                                    |
| Performance Profiling    | Testing | 1 day  | Identify bottlenecks; optimize hot paths                                              |
| Regression Testing       | Testing | 1 day  | Re-run all Phase 1 + Phase 2 pytest suites                                            |

### Coverage Goals

- ✅ >90% code coverage on Phase 2 code
- ✅ All critical paths tested (security, payments, chat)
- ✅ No crashes on physical devices
- ✅ WebSocket latency <100ms
- ✅ Payment verification 100% accurate
- ✅ Notes privacy 100% secure

### Sprint 10 Deliverables

- ✅ `core/tests/` — 100+ new test cases
- ✅ Performance benchmarks report
- ✅ Security audit report
- ✅ Physical device test results
- ✅ Bug report + fixes applied
- ✅ Postman test collection updated
- ✅ `coverage/` — HTML coverage report

### Sprint 10 Success Criteria

- [ ] All pytest pass (Phase 1 + Phase 2)
- [ ] Code coverage >90%
- [ ] Zero crashes on iOS device
- [ ] Zero crashes on Android device
- [ ] Full session flow works end-to-end
- [ ] WebSocket chat responsive (<100ms)
- [ ] Notes privacy verified (50+ attempts, all 403)
- [ ] Timer accurate within 1 second
- [ ] Payment verification 100%
- [ ] Postman collection passes all requests
- [ ] GitHub Actions CI passes on all commits
- [ ] Git commit made

---

## DATABASE MODELS

### New Models in Phase 2

#### Session Enhancements

```python
class Session(models.Model):
    # Phase 1 fields + new fields:
    STATUS_CHOICES = [
        ('WAITING', 'Waiting for Counselor'),
        ('MATCHED', 'Matched with Counselor'),
        ('ACTIVE', 'Active Chat'),
        ('PAYMENT_PENDING', 'Payment Pending'),
        ('PAID', 'Paid & Active'),
        ('ENDED', 'Session Ended'),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    is_crisis_flagged = models.BooleanField(default=False)
    matched_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
```

#### ChatMessage Enhancements

```python
class ChatMessage(models.Model):
    # Phase 1 fields + new fields:
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_highlighted = models.BooleanField(default=False)
```

#### New Models

```python
class SessionTimer(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=300)  # 5 min
    is_paid = models.BooleanField(default=False)
    payment_order_id = models.CharField(max_length=100, null=True, blank=True)

class TriageResponse(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    question_number = models.IntegerField(1-4)
    user_response = models.TextField()
    final_routing = models.CharField(max_length=50, null=True, choices=[
        ('PEER_SUPPORT', 'Peer Support'),
        ('LICENSED_THERAPIST', 'Licensed Therapist'),
    ])
    urgency_level = models.CharField(max_length=50, null=True, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

class CrisisKeyword(models.Model):
    keyword = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=[
        ('SUICIDE', 'Suicide'),
        ('SELF_HARM', 'Self Harm'),
        ('ABUSE', 'Abuse'),
        ('VIOLENCE', 'Violence'),
        ('OVERDOSE', 'Overdose'),
    ])
    severity = models.CharField(max_length=50, choices=[
        ('LOW', 'Low'),
        ('HIGH', 'High'),
    ])

class CrisisAlert(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    triggered_by = models.CharField(max_length=50)  # "triage" or "chat"
    keyword_match = models.CharField(max_length=100)
    admin_notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class SessionNote(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, null=True)
    note_text = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        permissions = [
            ('view_own_notes', 'Can view own notes only'),
        ]

class EscalationEvent(models.Model):
    URGENCY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    from_counselor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='escalations_sent')
    to_therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='escalations_received')
    urgency = models.CharField(max_length=50, choices=URGENCY_CHOICES)
    reason = models.TextField()
    status = models.CharField(max_length=50, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

class SessionFeedback(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE)
    q1_before_session = models.TextField()  # How did you feel before?
    q2_after_session = models.TextField()   # How do you feel after?
    q3_what_helped = models.TextField()     # What helped most?
    q4_what_improve = models.TextField()    # What could improve?
    is_flagged = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)

class EarningsRecord(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    duration_minutes = models.FloatField()
    rate_per_minute = models.DecimalField(max_digits=10, decimal_places=2)
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee_percent = models.FloatField(default=15)  # 15%
    platform_fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

class UserDevice(models.Model):
    PLATFORM_CHOICES = [
        ('IOS', 'iOS'),
        ('ANDROID', 'Android'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fcm_token = models.CharField(max_length=200, unique=True)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'fcm_token')
```

---

## API ENDPOINTS

### Triage Endpoints

```
POST   /api/triage/start/
       Request: { }
       Response: { question: "Q1: ...", session_id: "xyz" }

POST   /api/triage/respond/
       Request: { session_id: "xyz", response: "user answer" }
       Response: { question: "Q2: ..." } or { routing: "PEER_SUPPORT", urgency: "HIGH" }
```

### Session Endpoints

```
POST   /api/sessions/
       Request: { user_id, counselor_id, session_type }
       Response: { session_id, status, created_at }

GET    /api/sessions/{id}/
       Response: { id, status, user, counselor, created_at }

PATCH  /api/sessions/{id}/
       Request: { status: "MATCHED" }
       Response: { id, status, updated_at }

GET    /api/sessions/queue/
       Response: [{ id, wait_time, triage_category, urgency }, ...]

PATCH  /api/sessions/{id}/accept/
       Response: { status: "MATCHED", matched_at }

POST   /api/sessions/{id}/verify-payment/
       Request: { order_id, payment_id, signature }
       Response: { status: "PAID", verified_at }

POST   /api/sessions/{id}/escalate/
       Request: { reason, urgency }
       Response: { escalation_id, therapist_notified }

POST   /api/sessions/{id}/feedback/
       Request: { q1, q2, q3, q4, is_flagged }
       Response: { feedback_id, submitted_at }
```

### Notes Endpoints

```
GET    /api/sessions/{id}/notes/
       Response: [{ id, note_text, created_by, created_at }, ...]

POST   /api/sessions/{id}/notes/
       Request: { note_text, message_id }
       Response: { id, note_text, created_at }

DELETE /api/sessions/{id}/notes/{note_id}/
       Response: { deleted: true }
```

### Chat Endpoints

```
POST   /api/messages/
       Request: { session_id, message_text }
       Response: { id, session_id, sender, text, created_at }

PATCH  /api/messages/{id}/highlight/
       Request: { }
       Response: { is_highlighted: true }

GET    /api/messages/?session_id=xyz
       Response: [{ id, text, sender, is_highlighted, created_at }, ...]
```

### Notification Endpoints

```
POST   /api/devices/register/
       Request: { fcm_token, platform: "IOS" or "ANDROID" }
       Response: { id, user_id, fcm_token, platform, created_at }

GET    /api/notifications/
       Response: [{ id, type, title, body, data, created_at }, ...]
```

### WebSocket Endpoints

```
ws://localhost:8000/ws/chat/<session_id>/
   Message format: { type: "message", message: "text" }
   Echo: { type: "chat.message", message: "text", sender: "You" or "Other" }

ws://localhost:8000/ws/queue/<counselor_id>/
   Receives: [{ id, wait_time, triage_category }, ...]
```

---

## TESTING STRATEGY

### Unit Tests

```
core/tests/
├── test_triage.py (20+ cases)
├── test_crisis_detection.py (30+ cases)
├── test_session_states.py (10+ cases)
├── test_payment_flow.py (15+ cases)
├── test_notes_privacy.py (50+ cases)
├── test_matching.py (15+ cases)
├── test_notifications.py (20+ cases)
└── test_feedback.py (10+ cases)

TOTAL: 170+ unit test cases
```

### Integration Tests

```
test_session_lifecycle.py — Full E2E from triage to feedback
test_websocket_isolation.py — 5 simultaneous sessions
test_escalation_workflow.py — Counselor → Therapist
test_offline_queue.py — Disconnection resilience
```

### E2E Tests (Physical Device)

```
iOS (Expo Go):
  - Open app
  - Register as user
  - Enter triage (4 questions)
  - Get matched to counselor (queue)
  - Chat for 5+ minutes
  - Payment popup
  - Continue chat after payment
  - End session
  - Submit feedback
  - Zero crashes

Android (Expo Go):
  - Same flow
  - Verify notifications delivered
```

### Security Tests

```
test_notes_privacy.py:
  - GET /notes/ with user JWT → 403
  - GET /notes/?user_id=X → 403
  - GET /sessions/?include=notes → 403
  - GET /messages/123/note/ → 403
  - 50+ URL variations, all 403

test_payment_verification.py:
  - Invalid signature → 400 Bad Request
  - Tampered order_id → 400
  - Missing signature → 400
  - Correct signature → 200 OK
```

### Performance Tests

```
WebSocket latency: <100ms
Timer accuracy: ±1 second over 5 minutes
Database queries per chat message: <5
Memory per active connection: <2MB
```

---

## DEPLOYMENT & DEVOPS

### Docker Compose Stack

```yaml
services:
  seeker-django:
    image: seeker-app:latest
    command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
    ports: ["8000:8000"]
    depends_on: [postgres, redis]

  seeker-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: seekerdb
      POSTGRES_USER: seeker
      POSTGRES_PASSWORD: seekerpass
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  seeker-redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  seeker-celery:
    image: seeker-app:latest
    command: celery -A config worker -l info
    depends_on: [postgres, redis]

  seeker-celery-beat:
    image: seeker-app:latest
    command: celery -A config beat -l info
    depends_on: [redis]

  seeker-flower:
    image: mher/flower:2.0
    ports: ["5555:5555"]
    command: celery --broker=redis://redis:6379 flower

  seeker-mailhog:
    image: mailhog/mailhog
    ports: ["1025:1025", "8025:8025"]

  seeker-minio:
    image: minio/minio:latest
    command: server /data
    volumes: [minio_data:/data]
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin

  seeker-typesense:
    image: typesense:0.25.2
    volumes: [typesense_data:/data]
    ports: ["8108:8108"]
```

### GitHub Actions CI/CD

```yaml
name: Phase 2 CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run migrations
        run: python manage.py migrate

      - name: Run pytest
        run: pytest core/tests/ --cov=core --cov-report=html

      - name: Run linting
        run: flake8 core/ --max-line-length=100

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## RISK MANAGEMENT

| Risk                                   | Impact   | Mitigation                                                                 |
| -------------------------------------- | -------- | -------------------------------------------------------------------------- |
| WebSocket connection drops mid-session | High     | Offline message queue; auto-reconnect; connection status indicator         |
| Timer drifts > 1 second                | Medium   | Use server-side epoch timestamp (not client); validate on backend          |
| Crisis detection false positives       | High     | Use NLP sentiment analysis; keyword + context matching                     |
| Payment signature verification fails   | Critical | Test with Razorpay test card; log all failures; manual verification option |
| Notes accidentally exposed to user     | Critical | Queryset-level filtering + permission class; 50+ security tests            |
| Celery task failures (notifications)   | Medium   | Task retry logic; DLQ (dead letter queue); Flower monitoring               |
| Firebase FCM down                      | Medium   | Graceful degradation; local notification fallback; retry                   |
| Session state corruption               | Critical | Explicit state machine; test all transitions; database constraints         |

---

## SUCCESS CRITERIA

### Phase 2 Complete When:

✅ **All 10 Sprints Delivered**

- [ ] Sprint 1: WebSocket Foundation
- [ ] Sprint 2: Session State Machine
- [ ] Sprint 3: Gemini AI Triage
- [ ] Sprint 4: Crisis Detection
- [ ] Sprint 5: Payment & Timer
- [ ] Sprint 6: Counselor Queue
- [ ] Sprint 7: Notes & Escalation
- [ ] Sprint 8: Firebase FCM
- [ ] Sprint 9: Feedback & Lifecycle
- [ ] Sprint 10: Testing & Validation

✅ **Quality Gates**

- [ ] > 90% code coverage on Phase 2 code
- [ ] All pytest pass (170+ test cases)
- [ ] GitHub Actions CI green on all commits
- [ ] Zero critical security issues
- [ ] Notes privacy verified (50+ tests)
- [ ] Payment verification 100% accurate

✅ **Functional Requirements**

- [ ] AI triage working end-to-end
- [ ] Real-time chat <100ms latency
- [ ] 5-min timer accurate ±1 second
- [ ] Razorpay payment integration
- [ ] Counselor queue real-time updates
- [ ] Crisis detection flagging dangerous sessions
- [ ] Private notes inaccessible to users
- [ ] FCM notifications delivered
- [ ] Feedback system capturing 4 questions
- [ ] Earnings calculated on session end

✅ **Mobile Testing**

- [ ] Full flow works on iOS (Expo Go)
- [ ] Full flow works on Android (Expo Go)
- [ ] Zero crashes on physical devices
- [ ] Notifications delivered within 10 seconds
- [ ] WebSocket chat responsive

✅ **Documentation & DevOps**

- [ ] WebSocket API documented
- [ ] Postman collection updated (100+ requests)
- [ ] Database schema documented
- [ ] API endpoints documented
- [ ] Deployment guide created
- [ ] Troubleshooting guide created

✅ **Git & Commits**

- [ ] Daily commits on `develop` branch
- [ ] 70+ commits total (10 per sprint)
- [ ] Clear commit messages with scope
- [ ] All commits reference Co-authored-by
- [ ] No secrets in Git history

---

## NEXT: PHASE 3 (Preview)

Once Phase 2 is validated and all gates pass:

### Phase 3: Therapist Portal, Scheduling & Discovery

**Duration:** 6–8 weeks

- Licensed therapist portal (client list, session history)
- Availability management + booking calendar
- Fixed standard intake form (client fills via booking link)
- Escalation backchannel (private WebSocket room)
- Typesense search & discovery (therapist/counselor filtering)
- Public profiles via Next.js (localhost:3000)
- Session reminders (24h + 1h before booking)
- Slug generation for profiles

**Phase 3 Timeline:** Weeks 11–18

---

## APPENDIX: QUICK START COMMANDS

```bash
# Start entire stack
docker-compose up --build

# Run backend tests
docker-compose exec django pytest core/tests/ -v

# Run linting
docker-compose exec django flake8 core/ --max-line-length=100

# View emails
open http://localhost:8025

# Monitor Celery tasks
open http://localhost:5555

# Django Admin
open http://localhost:8000/admin/

# API Swagger docs
open http://localhost:8000/api/docs/

# Start React Native
cd frontend && npx expo start

# Django shell
docker-compose exec django python manage.py shell

# Create superuser
docker-compose exec django python manage.py createsuperuser
```

---

## APPENDIX: ENVIRONMENT VARIABLES

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://seeker:seekerpass@postgres:5432/seekerdb
DB_NAME=seekerdb
DB_USER=seeker
DB_PASSWORD=seekerpass
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret-here

# Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_PROJECT_ID=your-project-id

# Channels
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
CHANNEL_LAYERS_HOST=redis
CHANNEL_LAYERS_PORT=6379

# Session Config
SESSION_TIMEOUT_MINUTES=5
PLATFORM_FEE_PERCENT=15
```

---

## FINAL NOTES

### For Solo Developer

- **Commit daily** — your git log is your portfolio
- **Test as you build** — write pytest before shipping features
- **Break deliberately** — burnout is the #1 risk
- **Phase gate is hard** — don't start Phase 3 until Phase 2 is 100% done
- **Security first** — AES-256 encryption, no plaintext PII, zero secrets in Git

### Key Success Factors

1. **WebSocket foundation solid** (Sprint 1) — everything builds on this
2. **State machine enforced** (Sprint 2) — prevents data corruption
3. **AI triage working** (Sprint 3) — core value proposition
4. **Crisis detection verified** (Sprint 4) — safety-critical
5. **Testing comprehensive** (Sprint 10) — >90% coverage, 170+ test cases

### Support Resources

- Django Channels docs: https://channels.readthedocs.io
- Gemini API docs: https://ai.google.dev/
- Razorpay test mode: https://razorpay.com/docs
- Firebase FCM: https://firebase.google.com/docs/cloud-messaging

---

## APPROVAL & SIGN-OFF

**Phase 2 Roadmap Created:** 2026-05-21  
**Total Sprints:** 10  
**Total Weeks:** 8–10  
**Estimated Lines of Code:** 5,000–7,000  
**Estimated Test Cases:** 170+  
**Status:** Ready for Implementation ✅

---

_End of Phase 2 Complete Roadmap_

**Questions?** Review each sprint's section in detail. Each sprint has day-by-day tasks, detailed deliverables, and success criteria.

**Ready to start Sprint 1?** Run: `docker-compose up --build` and begin the WebSocket setup.

---

**Built with ❤️ for mental wellness. One sprint at a time.**
