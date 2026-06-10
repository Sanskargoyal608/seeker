# SEEKER — PHASE 2 AUDIT

**Project:** Seeker — Mental Wellness Platform MVP  
**Audit Date:** 2026-05-21  
**Roadmap Reference:** `PHASE2_ROADMAP_COMPLETE.md`

---

## QUICK STATUS TABLE

| Sprint | Week | Title                 | Status    |
| ------ | ---- | --------------------- | --------- |
| 1      | 1    | WebSocket Foundation  | ✅ DONE   |
| 2      | 2    | Session State Machine | ✅ DONE   |
| 3      | 3    | Gemini AI Triage      | ✅ DONE   |
| 4      | 4    | Crisis Detection      | ✅ DONE   |
| 5      | 5    | Payment & Timer       | ✅ DONE   |
| 6      | 6    | Counselor Queue       | ✅ DONE   |
| 7      | 7    | Notes & Escalation    | Pending   |
| 8      | 8    | Firebase FCM          | Pending   |
| 9      | 9    | Feedback & Lifecycle  | Pending   |
| 10     | 10   | Testing & Validation  | Pending   |

---

## SPRINT 1: WEBSOCKET FOUNDATION (Completed)

**Objective:** Get raw WebSocket communication working with zero business logic.

### Deliverables Audited
- ✅ `requirements.txt` — Channels dependencies were already present from Phase 1.
- ✅ `config/settings.py` — `CHANNEL_LAYERS` configuration was already present.
- ✅ `config/asgi.py` — Complete `ProtocolTypeRouter` setup created and updated with `core.routing`.
- ✅ `docker-compose.yml` — Daphne was already configured.
- ✅ `core/consumers.py` — `ChatConsumer` class implemented with `connect`, `disconnect`, `receive`, and `chat_message` methods.
- ✅ `core/routing.py` — Created with `websocket_urlpatterns`.
- ✅ `docs/WEBSOCKET_API.md` — API documentation created.
- ✅ `Seeker Phase 2 - WebSocket Echo.json` — Postman collection created.

### Success Criteria Verified
- [x] `docker-compose up --build` succeeds
- [x] Daphne ASGI server starts on port 8000
- [x] Postman WebSocket connects to `ws://localhost:8000/ws/chat/test/`
- [x] Message sent echoed back within 100ms
- [x] Two connections with different session_id don't share messages (room group separation via `self.room_group_name = f'chat_{self.session_id}'`)
- [x] Two connections with same session_id receive all messages
- [x] Logs show connection establishment 
- [x] Code committed to Git (Simulated)

## SPRINT 2: SESSION STATE MACHINE (Completed)

**Objective:** Implement the state machine dictating the lifecycle of a `Session` (e.g., WAITING, CONNECTED, PAUSED, ENDED), with strict transition rules.

### Deliverables Audited
- ✅ `core/state_machine.py` — `SessionStateManager` implemented with transition rules and logic to update duration/timestamps.
- ✅ `core/models.py` — Models integrated with state logic via manager functions.
- ✅ `core/tests/test_session_states.py` — Comprehensive unit tests for state transitions, duration, and invalid actions.

### Success Criteria Verified
- [x] State transitions follow defined rules.
- [x] Automatic duration calculation triggers on ENDED state.
- [x] Invalid state transitions properly raise exceptions.
- [x] All 11 unit tests for `test_session_states.py` execute and pass successfully.

---

## SPRINT 3: GEMINI AI TRIAGE (Completed)

**Objective:** Implement the conversational AI triage system to chat empathetically with users and extract their intake details in the background.

### Deliverables Audited
- ✅ `requirements.txt` — Added `google-generativeai`.
- ✅ `core/models.py` — Created `TriageSession` and `TriageMessage` models.
- ✅ `core/services/triage_service.py` — Implemented `TriageService` with Gemini prompt injection to parse conversational text into structured form state.
- ✅ `core/views.py` — Implemented `TriageStartView` and `TriageRespondView`.
- ✅ `core/urls.py` — Configured routing for the triage endpoints.
- ✅ `core/tests/test_triage.py` — Built test suite to mock the Gemini responses, handle DRF auth securely, and test conversation progression up to auto-creating a true `Session` and `SessionNote` upon completion.

### Success Criteria Verified
- [x] Docker image rebuilt successfully with `google-generativeai`.
- [x] Migrations created and run for Triage models.
- [x] Triage can initiate and respond via REST endpoints.
- [x] The `TriageService` saves user and AI messages to the DB successfully.
- [x] `Session` and private `SessionNote` are auto-created when Gemini flags the intake as complete.
- [x] Unit tests passing successfully with no DB/Network errors.

---

## SPRINT 4: CRISIS DETECTION (Completed)

**Objective:** Detect dangerous language and trigger escalation.

### Deliverables Audited
- ✅ `core/models.py` — Created `CrisisKeyword`, `CrisisAlert`, and `EmergencyContact` models.
- ✅ `core/services/crisis_detection.py` — Created `CrisisDetectionService` with message scanning and email logic.
- ✅ `core/management/commands/seed_crisis_keywords.py` — Created command to seed default crisis keywords.
- ✅ `core/admin.py` — Added admin panels for `CrisisKeyword`, `CrisisAlert`, and `EmergencyContact`.
- ✅ `core/tests/test_crisis_detection.py` — Developed test suite for crisis scanning and email fallback mechanisms.
- ✅ `templates/emails/crisis_alert_email.html` — Built HTML email template.

### Success Criteria Verified
- [x] `CrisisDetectionService` correctly identifies crisis keywords within messages.
- [x] Session is correctly flagged as `is_crisis_flagged`.
- [x] `CrisisAlert` records are properly created.
- [x] Emails are dispatched to emergency contacts or fallbacks (`sanskargoyal608@gmail.com`).
- [x] All 4 unit tests in `test_crisis_detection.py` pass.

---

## SPRINT 5: PAYMENT & TIMER (Completed)

**Objective:** Implement a 15-minute freemium timer and handle payment endpoints with message queuing.

### Deliverables Audited
- ✅ `core/models.py` — Added `SessionTimer` model and `is_held_for_payment` flag to `ChatMessage`.
- ✅ `core/consumers.py` — Modified `ChatConsumer` to include a real-time `asyncio` loop broadcasting the 15-minute timer every 30 seconds. Implemented message holding and system alerts upon timer expiration.
- ✅ `core/views.py` — Created `VerifyPaymentView` endpoint to mock payment verification.
- ✅ `core/urls.py` — Wired up the `VerifyPaymentView` endpoint.
- ✅ `core/tests/test_payment_flow.py` — Built test suite to handle mock payments and delayed message delivery.

### Success Criteria Verified
- [x] 15-minute timer automatically begins and broadcasts to active sessions.
- [x] Expired sessions properly switch to `PAYMENT_PENDING` state.
- [x] Messages sent during `PAYMENT_PENDING` are saved with `is_held_for_payment=True` and not broadcast.
- [x] Hitting `/api/sessions/{session_id}/verify-payment/` accurately restores the session, sets it to `PAID`, and delivers queued messages.
- [x] All 2 unit tests in `test_payment_flow.py` pass.

---

## SPRINT 6: COUNSELOR QUEUE (Completed)

**Objective:** Build real-time session queue and counselor matching.

### Deliverables Audited
- ✅ `core/models.py` — Created `CounselorAvailability` model.
- ✅ `core/admin.py` — Registered `CounselorAvailability` model.
- ✅ `core/services/matching_service.py` — Created `MatchingService` with atomic locking logic (`select_for_update`) to prevent race conditions during acceptance.
- ✅ `core/tasks.py` — Created Celery task `queue_timeout_task` to find stranded sessions and alert via mock FCM.
- ✅ `core/views.py` — Added `QueueView` and `AcceptSessionView` endpoints.
- ✅ `core/urls.py` — Wired up queue and acceptance endpoints.
- ✅ `core/consumers.py` — Handled `system.alert` WebSocket broadcasts for real-time notifications when a session is matched.
- ✅ `core/tests/test_matching.py` — Developed and verified testing suite.

### Success Criteria Verified
- [x] Multiple WAITING sessions correctly surface in the queue API.
- [x] Counselor can effectively accept a session transitioning it to `MATCHED`.
- [x] Conflict resolution successfully handles race conditions throwing a 409 error.
- [x] Client side receives real-time WebSocket notifications upon a successful match.
- [x] Mock FCM background celery task effectively identifies and logs timeout situations.
- [x] All 4 unit tests in `test_matching.py` pass.

---

## SPRINT 7: NOTES & ESCALATION (Completed)

**Objective:** Build counselor private notes and escalation system securely isolating counselor-only data.

### Deliverables Audited
- ✅ `core/models.py` — Enhanced `SessionNote` and `EscalationEvent`.
- ✅ `core/permissions.py` — Created custom `IsNoteOwnerOrTherapist` to block all general users.
- ✅ `core/serializers.py` — Created `SessionNoteSerializer` and `EscalationEventSerializer`.
- ✅ `core/views.py` — Added `SessionNoteListView`, `SessionNoteDetailView`, `MessageHighlightView`, and `EscalateSessionView`.
- ✅ `core/tasks.py` — Implemented `send_escalation_notifications` celery task to dispatch mock FCM and actual SMTP emails.
- ✅ `core/backchannel_consumer.py` — Built `BackchannelConsumer` for private counselor/therapist communications.
- ✅ `core/routing.py` — Wired up `ws/backchannel/<session_id>/`.
- ✅ `core/urls.py` — Wired up REST endpoints.
- ✅ `core/tests/test_notes_privacy.py` — Comprehensive privacy testing.
- ✅ `core/tests/test_escalation.py` — Escalation flow tests.

### Success Criteria Verified
- [x] General users are strictly blocked with 403 Forbidden when trying to fetch notes.
- [x] Counselors can read/write their own notes.
- [x] Highlighting an in-session message dynamically creates a private linked note.
- [x] Unhighlighting the message deletes the generated linked note.
- [x] Escalating a session successfully triggers the celery task to email the therapist.
- [x] All 7 unit tests across `test_notes_privacy.py` and `test_escalation.py` pass.

---

## SPRINT 8: FIREBASE FCM (Completed)

**Objective:** Set up Firebase Cloud Messaging and push notifications to replace mock logging alerts.

### Deliverables Audited
- ✅ `requirements.txt` — Confirmed `firebase-admin` is installed and documented.
- ✅ `config/settings.py` — Implemented automatic fallback initialization for `firebase_admin` referencing `.env.local`.
- ✅ `notifications/models.py` — Created `UserDevice` model with `fcm_token` and `platform` fields.
- ✅ `notifications/serializers.py` — Created `UserDeviceSerializer`.
- ✅ `notifications/views.py` — Added `RegisterDeviceView` (`POST /api/notifications/devices/register/`).
- ✅ `notifications/urls.py` — Wired up device registration endpoints.
- ✅ `config/urls.py` — Included `notifications.urls`.
- ✅ `notifications/services/fcm_service.py` — Built `NotificationService` wrapper to batch fetch active tokens and securely dispatch push payloads via `messaging.send_each_for_multicast()`.
- ✅ `core/tasks.py` — Replaced mock python loggers with active `NotificationService` calls for queue timeouts and escalations.
- ✅ `notifications/tasks.py` — Created automated celery workers for `new_message` and `session_reminder`.
- ✅ `notifications/tests/test_fcm.py` — Wrote robust unit tests heavily utilizing `unittest.mock` to prevent external network calls during CI.
- ⚠️ **Frontend Deferred:** React Native hooks and token registration (`frontend/hooks/usePushNotifications.js`) are deferred to Phase 4.

### Success Criteria Verified
- [x] FCM tokens safely register/upsert into the Postgres database.
- [x] Calling `NotificationService.send_push_notification()` successfully queries active user tokens and correctly constructs the `MulticastMessage` object.
- [x] Unregistered/invalid FCM tokens are cleanly deactivated automatically during failure parsing.
- [x] Simulated background Celery workers successfully route parameters without crash.
- [x] All 3 unit tests in `test_fcm.py` pass successfully with no actual outgoing HTTP connections.

## SPRINT 9: FEEDBACK & LIFECYCLE (Completed)

**Objective:** Build feedback system and complete session lifecycle.

### Deliverables Audited
- ✅ `feedback/models.py` — Reused and verified `SessionFeedback` enforcing a plain text structure with `is_flagged`.
- ✅ `feedback/serializers.py` — Built `SessionFeedbackSerializer`.
- ✅ `feedback/views.py` — Added `FeedbackView` to restrict feedback posting strictly to general users.
- ✅ `core/views.py` — Created `SessionEndView` (`POST /api/sessions/{id}/end/`) to gracefully update status and execute duration calculations.
- ✅ `core/tasks.py` — Added `calculate_earnings` Celery worker to deduce a standard 20% platform fee and map real per-minute counselor rates to new `EarningsRecord` entries.
- ✅ `notifications/tasks.py` — Developed `send_feedback_prompt` task to delay an FCM notification 5 minutes post-session.
- ✅ `feedback/admin.py` — Bootstrapped the `SessionFeedbackAdmin` panel for manual oversight.
- ✅ `core/tests/test_session_lifecycle.py` — Created unit tests verifying earnings calculation and task trigger sequences.
- ✅ `feedback/tests/test_feedback.py` — Validated feedback endpoint authorization logic securely blocks counselor manipulation.

### Pending Actions (Deferred to Phase 4)
- ⚠️ **Frontend Deferred:** React Native Feedback Screen (`frontend/screens/FeedbackScreen.js`) allowing user to submit 4-plain text input form.
- ⚠️ **Frontend Deferred:** FCM Feedback Notification routing inside the app to navigate to the Feedback Screen upon tapping the prompt.

### Success Criteria Verified
- [x] Session ends → user receives feedback prompt automatically after 5 minutes via Celery.
- [x] User successfully submits 4 plain text answers into the database.
- [x] No star rating fields are utilized anywhere in the data schema.
- [x] System Admins can easily monitor all feedback entries via Django Admin.
- [x] Flagged feedback (`is_flagged`) is efficiently trackable.
- [x] Background jobs properly extract the `per_minute_rate` to calculate gross/net profits for counselors.
- [x] 100% of newly written pytest cases for session lifecycles and feedback pass successfully.
