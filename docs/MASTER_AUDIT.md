# Seeker — Master Audit

**Date:** 2026-10-13 · **Updated:** 2026-10-23 (owner decisions, conflict review, corrections; code unchanged since the audit)
**Scope:** every doc, the whole Django backend, the Expo app in `frontend/`, the Next.js app in `web/`, infra and repo hygiene.
**Companion:** [PILOT_ROADMAP.md](PILOT_ROADMAP.md) is the phase plan built on this audit.

This document supersedes the status claims in all older audits and trackers, now under `docs/archive/`.

---

## 1. How this was checked

Five parallel read-only audits: docs, `core/`, the other backend apps plus infra, the mobile app, and the web app plus a frontend↔backend contract check. Nothing was modified.

Findings come from reading code, not from running the app:

- **Tests were not executed.** Settings require the Docker Postgres and Docker was not running. In a throwaway environment the 47 tests in `accounts`, `profiles`, `notifications`, `helpline` and `feedback` collected cleanly. `core` tests were assessed by reading only.
- **Migrations are consistent with the models**, but only because four untracked files (`core/migrations/0011`–`0014`) are on disk.
- **`manage.py check`** passes on a fresh install (which resolves to Django 6.0.9). `check --deploy` reports six security warnings.
- **Nothing was run on a device or against a live stack.** Items marked "verify" below are code-reading conclusions that need a runtime check.

## 2. Verdict

A broad, mostly wired prototype. It is not the "100% functional" state the Sep 22 banner in `docs/archive/Comprehensive_Audit_Report.md` claims, and it is not safe for real users yet. The blockers are open data access, crisis handling that alerts nobody, weak account security, and several core flows that cannot complete.

## 3. What is built and works (by code reading)

| Area | Working |
|---|---|
| Auth | 3-step email OTP registration for all three roles, login by email or username, token refresh, password reset, profile edit |
| Triage | Adaptive 4-phase AI intake on OpenAI `gpt-4o-mini`, severity scoring, routing, therapist matching |
| Live chat | WebSocket chat, history, 15-minute free timer, message hold for payment, REST send fallback |
| Counselor | Queue, atomic accept (`select_for_update`), availability toggle, private notes with sound access control, message highlight (backend) |
| Therapist | Weekly availability, bulk schedule, calendar day view, slot calculation, earnings list, escalation queue and accept |
| Discovery and booking | Typesense therapist search, slot listing, booking creation with intake text |
| Other | Mood check-in, breathing exercise, mentorship (apply, respond, chat), in-app notifications list, feedback submission, helpline API, Docker Compose stack, Swagger |

## 4. Critical findings

### 4.1 Data exposure — any logged-in user can

| Finding | Where |
|---|---|
| Read any chat's messages (no participant check; includes messages held for payment) | `core/views.py:408-435` |
| Read and write any other user's triage, including transcript and clinical dossier | `core/views.py:245-257`, `core/services/triage_service.py:372` |
| Read any session's metadata (seeker name, provider ids, crisis flag) | `core/views.py:962-971` |
| Mark any session as paid (no ownership check, no verification) | `core/views.py:266-309` |

Also: the seeker can read the clinician dossier and provisional conditions (`SessionIntakeView`, and `TriageSessionSerializer` on every triage reply). Owner decision (2026-10-23): clinicians only.

### 4.2 Crisis handling

| Finding | Where |
|---|---|
| Paywall runs before the crisis scan. After the free window a suicidal message gets "Message held. Please complete payment" with no scan and no alert | `core/consumers.py:87-97` |
| REST message POST skips the crisis scan | `core/views.py:437` |
| Triage never calls the keyword detector; it relies on the LLM. A crisis flag creates an ordinary waiting session with no alert | `core/services/triage_service.py:457-533` |
| If OpenAI fails or the key is missing, the user gets a canned reply every turn, then is routed to the counselor queue | `core/services/triage_service.py:210-220` |
| A crisis hit tells the sender "a counselor has been alerted" but alerts no provider. The only action is an email | `core/consumers.py:99-103` |
| Crisis emails go to every active row of `core.EmergencyContact`, a global staff email list managed in Django Admin. When that list is empty they fall back to a hardcoded personal Gmail, with user email and message text in plaintext | `core/services/crisis_detection.py:51-55` |
| The user's own emergency contacts (`accounts.EmergencyContact`, two required at registration) are stored and never used by anything. The two models share a name but are unrelated | `accounts/models.py`, `core/models.py:347` |
| Default email backend is console, so by default nothing is sent | `config/settings.py` |
| Panic button always answers "help is on the way"; only emails hardcoded `admin@seeker.app` with `fail_silently=True`; persists nothing without an active session | `core/views.py:662-710` |
| Crisis keywords exist only if `seed_crisis_keywords` is run by hand; 22 English phrases | `core/management/commands/` |
| Helpline has no seed data | `helpline/` |
| Waiting sessions, including crisis-flagged and therapist-requested, are ended silently after 60 minutes | `core/tasks.py:148` |
| Mobile: two "Crisis" buttons have no handler | `frontend/app/(app)/feedback/[id].js:48`, `notifications.js:127` |
| Mobile: `PanicButton` uses `Alert.alert` with buttons, likely a no-op on web (verify) | `frontend/components/PanicButton.js:10` |
| Crisis numbers hardcoded as "988 or 112" (988 is US-only) | `triage_service.py:127`, `frontend/app/(app)/triage.js:193` |

### 4.3 Account security

| Finding | Where |
|---|---|
| Reset OTP brute force: no attempt counter, no lockout, no dedicated throttle on verify / forgot / reset | `accounts/views.py:62,80,252` |
| New OTP does not invalidate earlier ones | `accounts/otp_service.py:40-54` |
| Reset OTP is reusable until expiry | `accounts/serializers.py:195` |
| `validate_password` is never called; reset has no minimum length | `accounts/serializers.py:182` |
| Logout-all and "invalidate all tokens" on reset write a Redis flag nothing reads | `accounts/token_service.py:103,109` |
| Refresh tokens keyed by user + User-Agent hash; a second device with the same build kills the first | `accounts/token_service.py:20-32` |
| Throttle rates hardcoded: login 100/min (docs say 5/min), register 100/hour | `accounts/throttles.py:8,23` |
| `NUM_PROXIES` unset, so throttles can be bypassed by spoofing `X-Forwarded-For` | `config/settings.py` |
| Account enumeration on forgot-password and request-otp | `accounts/serializers.py:173-176,228-232` |
| WebSocket middleware: `UnboundLocalError` on a bad token; accepts refresh tokens; no `is_active` check; no origin validator | `core/middleware.py:14-22`, `config/asgi.py` |
| Unverified counselors can see the queue, accept sessions and chat | `core/views.py:342,360` |
| `DEBUG` defaults True, `ALLOWED_HOSTS=['*']`, CORS allow-all, no HTTPS settings, public Swagger | `config/settings.py:10-13,181` |

### 4.4 Money

| Finding | Where |
|---|---|
| Payment is a mock; `razorpay` is installed but never imported | `core/views.py:261` |
| Therapists can create their own payouts of any amount, saved as PAID; update and delete also open | `core/views.py:1070-1079` |
| No live code path sets `start_time`, so every session ends with duration 0 and zero earnings. Queue-matched sessions also never become `ACTIVE` (booking start and therapist follow-up do set `ACTIVE`) | `core/services/matching_service.py:39`, `core/views.py:647,949`, `profiles/views.py:330` |
| Earnings: 20% fee hardcoded; therapists priced per-minute though they charge per session; only the counselor is paid after an escalation | `core/tasks.py:102-144` |
| Counselor earnings always show 0 (app calls therapist-only endpoints); a counselor withdrawal returns 500 | `frontend/app/(app)/counselor-profile.js:41-42,95` |
| `SeekerBillingRecord` is never written; billing list is always empty | `core/models.py:392` |

## 5. Flows that cannot complete

| Flow | Why |
|---|---|
| Starting a booked session | Seeker's "Join Session" opens the therapist availability editor (`BuddyDashboard.js:81`); therapist check uses a non-existent attribute and always returns 403 (`profiles/views.py:319`); the calendar passes a booking id as a session id (`therapist/calendar.js:122`) |
| Credential upload | `put_object` is given bytes, not a stream, so every upload fails (`accounts/services/file_upload.py:58-64`); a failed upload during registration leaves an orphan provider user (no transaction) |
| Public counselor profile | `GraduateCounselor` not imported; always 500 (`profiles/views.py:137`) |
| Public profile from the app | Numeric ids passed to slug endpoints; screen then shows fabricated content (`public-profile.js`, `book/[therapist_id].js:42`) |
| Staying logged in | `app/index.js:5` always redirects to login; restore calls non-existent `/api/accounts/profile/` (`app/_layout.js:53`); no route guard in `(app)/_layout.js` |
| Token refresh | New access token written to storage only, not Redux; sockets reconnect with the stale one (`api/axios.js:64`) |
| Push notifications | Import stubbed out (`hooks/usePushNotifications.native.js:4-5`); would send an Expo token to Firebase Admin, which would reject it |
| Backchannel | Button gated on `has_escalation`, which reads the legacy `EscalationEvent` and is always false (`core/views.py:970`) |
| Therapist intake view, follow-up, escalation alert | Only in unreachable code (`frontend/app/(app)/dashboard.js:318-655`) |
| Account deletion | App calls `/api/accounts/delete/`; real path is `/api/accounts/auth/delete/` (`settings.js:138`) |
| Session history | Calls non-existent `/api/core/sessions/`; filters on `COMPLETED`, which does not exist (`profile.js:23-25`) |
| Feedback | Answers mapped to the wrong fields (`feedback/[id].js:23-26`) |
| Therapist search filters | Input replaced by a chip after one character (`therapist-search.js:159-208`) |
| Next.js site | `params.slug` read without `await` (Next 16), so every dynamic page is "Not Found"; live `web/app/` has no root layout or CSS; Docker service looks for `package.json` at the repo root |

## 6. Other correctness problems

**Backend**
- Two parallel escalation systems: `EscalationEvent` (legacy) and `EscalationRequest` (live).
- Two parallel availability systems: `profiles.AvailabilitySlot` and `core.TherapistAvailability`.
- Free timer starts on first socket connect by anyone, including a seeker waiting in the queue (`core/consumers.py:141-149`).
- `set_payment_pending` overwrites `WAITING` and `ENDED` (`core/consumers.py:159-166`).
- `payment.required` is re-sent to every socket every 30 seconds.
- Chat can continue on an `ENDED` session.
- Counselors can accept therapist-directed sessions (`matching_service.py:19`).
- Escalation respond has no pending-state guard; a declined escalation can be accepted later (`core/views.py:888`).
- Triage handoff: picking a recommended therapist creates a second, unlinked session, so the therapist gets no dossier.
- Bulk availability: `session_duration <= 0` loops forever creating rows (`profiles/views.py:364-390`).
- Provider user without a profile can list and delete every therapist's slots (`profiles/views.py:158-163`).
- Booking creation has no validation: slot, past time, double booking, verified therapist (`profiles/serializers.py:31-61`).
- Timezones: naive slot times compared against UTC; off by 5.5 hours for India.
- `ClientTherapistRelationship` POST raises IntegrityError.
- `SessionNote.__str__` crashes for author-less triage notes (`core/models.py:100`).
- `queue_timeout_task` re-notifies every available counselor every minute.
- Push bodies contain message previews; no device unregister on logout; one FCM token can belong to several users.
- Debug `print()` at `core/views.py:1142,1148`.
- `SessionStateManager` is dead code; views write `status` directly.

**Mobile**
- Chat: no reconnect, no server message ids (live messages cannot be highlighted), history reads `timestamp` but the server sends `created_at` ("Invalid Date").
- Refresh: no single-flight lock; rotated refresh token not saved.
- Fabricated trust signals shown as real: "Verified Identity / Background checked", "Available Now", "University of Pennsylvania, Class of 2023", 2FA switch that is local state only.
- Fonts referenced (`Inter`, `Manrope`, `Outfit-*`) are never loaded; several undefined theme tokens.
- 97 `Alert.alert` calls remain in the web build.
- Escalation urgency values differ between the chat modal, `escalation.js` and the models.
- Branding mixes "Seeker" and "Buddy"; currency mixes `$` and `₹`.
- No `eas.json`, no icon or splash assets, API URL is a LAN IP over plain HTTP (`app.json:35`).
- No tests, lint, TypeScript or CI.

## 7. Planned and never built

Real Razorpay and weekly payouts · therapist 2FA at login · encryption of personal data at rest · CI and root README *(added in Phase 0)* · 90% coverage target · counselor orientation quiz and video · read receipts, typing events, live queue socket · video or audio · account data export and true deletion · the 5–10 real-user test · legal review.

## 8. Triage quality

Two saved persona runs (`test_results.json`, `test_results_v2.json`, Sep 5 2026):

| | Run 1 | Run 2 |
|---|---|---|
| Personas | 50 | 65 |
| Pass | 29 (58%) | 45 (69%) |
| Wrong routing | 15, all peer → therapist | 12: 10 therapist → peer, 2 the reverse |
| Incomplete | 6 | 8 |

The suicidal-teen and self-harm personas were routed correctly in both. The domestic-violence persona never completed in either. Run 2 completes most triages after a single message and gives `low` urgency to 36 of 65, including bulimia, bipolar and substance abuse.

## 9. Repo and infra

*As found on 2026-10-13. Phase 0 (branch `phase0/stabilise`) addressed the uncommitted work, tracked build output, dependency pinning, stale tests and the Docker build context. Still open: the API key rotation and the Docker hardening items.*

- **Uncommitted:** SDK 54 → 57 upgrade, web conversion, new features, backend changes and four required migrations, all in one working tree.
- **Secrets:** `.env.local` and `firebase-credentials.json` are ignored and were never committed. The Docker build copies `firebase-credentials.json` into the image (`.dockerignore` does not exclude it). The Google API key in the `fetch_*` scripts should be rotated.
- **Tracked, should not be:** `celerybeat-schedule`, `.coverage`, `staticfiles/`, `frontend/dist/`.
- **Dependencies:** nothing pinned, no lock file. Unused: `python-jose`, `python-decouple`, `brevo-python`, `django-filter`, `razorpay`, `google-generativeai`. Used but undeclared: `PyJWT`, `requests`. Missing test deps: `pytest-asyncio`, `pytest-cov`.
- **Tests:** three `core` test files are stale against the rewritten triage service or vacuous (`test_triage.py`, `test_triage_service.py`, `test_consumers.py`). No tests for any data-exposure hole, the consumers, or the WebSocket middleware.
- **Docker:** runs as root, no `migrate` or `collectstatic`, all ports published, Flower without auth, no-op healthchecks.
- **Runtime log (`django_logs.txt`, Jul 29 – Aug 14):** two import-time `NameError` outages (now fixed), 15 recurring Redis timeouts on the WebSocket path (unexplained), and the still-present `GraduateCounselor` NameError.
- **Docs:** four different phase schemes; no single source of truth; `WEBSOCKET_API.md` describes only the Sprint 1 echo.

## 10. Decisions taken

| Question | Decision | Date |
|---|---|---|
| Finish line | Closed pilot, 5–10 real users | 10-13 |
| Platforms | Android plus web; no iOS for now | 10-13 |
| Web | Both: Expo web for the logged-in app, Next.js (`web/`) for public pages | 10-13 |
| Payments | Mock stays for the pilot; fix the security holes around it | 10-13 |
| Crisis alerts | On-call staff / admin | 10-13 |
| Free window and fee | 15 minutes free, 15% platform fee | 10-13 |
| Unplanned features kept | Mentorship, mood and breathing, compliance screen | 10-13 |
| Unplanned features cut | Wallet withdrawals | 10-13 |
| Must-haves before real users | Encrypt personal data at rest, legal docs and consent, CI and test gate | 10-13 |
| Deferred | Therapist 2FA, iOS, real Razorpay | 10-13 |
| Where it runs | Development phase: locally on the LAN. A Cloudflare (or similar) tunnel may be opened to give outside testers a public URL | 10-23 |
| Email | Real email through the Gmail SMTP account in `.env.local` (not Mailhog) | 10-23 |
| Triage | Keep the adaptive flow (not "exactly 4 questions"); fix crisis handling and accuracy | 10-23 |
| AI provider | OpenAI `gpt-4o-mini` (current code). No Gemini code remains | 10-23 |
| Product name | "Buddy" in all visible text (screens, emails, web pages). Internal ids unchanged: `com.seeker.app`, `seeker://`, repo and code names | 10-23 |
| Counselor bookings | Counselors are bookable like therapists, at a fixed per-session price they set; live queue chats stay per-minute | 10-23 |
| Escalation | `EscalationRequest` is the single model; remove `EscalationEvent` | 10-23 |
| AI clinical summary | Clinicians only; the seeker never sees provisional conditions, severity or risk flags | 10-23 |
| Unverified providers | May log in, edit profile, upload documents and set availability; hidden from search and cannot take sessions | 10-23 |

## 11. Open questions

1. Who is on the on-call staff list, and what is the response-time target?
2. Which helpline numbers and regions apply?
3. Are migrations `0011`–`0014` applied to any shared database?
4. After a therapist accepts an escalation, does the counselor stay in the session, and who is paid?
5. Push: native FCM tokens or the Expo push service?
6. Should `/book/[slug]` on the web deep-link into the app or be a real booking page?
7. Is one account expected to be logged in on several devices at once?
8. With Expo web and Next.js both kept, which addresses do they use? Both currently expect port 3000.
9. What routing accuracy must the triage reach before the pilot (the two persona runs scored 58% and 69%)?
10. Is widening from 5–10 users to 50 (as `Info.md` plans) in scope after the pilot?

## 12. Conflicts between documents

How each conflict found in the docs is resolved. "Decision" means an owner decision in section 10.

| Topic | What the documents say | Resolution |
|---|---|---|
| Free window | 5 min (`Info.md`, roadmaps, design) vs 15 min (code, Phase 2 audit) | Decision: 15 min |
| Platform fee | 15% (Phase 2 roadmap) vs 20% (code, audits) | Decision: 15% (code still 20%) |
| AI provider | Claude (docx) vs Gemini (`Info.md`, Phase 2 docs) vs OpenAI (code, tracker) | Decision: OpenAI |
| Triage shape | "Exactly 4 questions" (`Info.md`, docx) vs adaptive phases (code) | Decision: adaptive |
| Crisis recipients | Therapist + clinical supervisor, emergency contacts if life-threatening (`Info.md` §3.1.6, docx) vs admin email (`Info.md` §3.1.1) vs staff list / personal Gmail (code) | Decision: on-call staff |
| Therapist 2FA | Mandatory (`Info.md`, docx) vs fields only (code) | Decision: deferred |
| Payments | Razorpay test mode in MVP (`Info.md`) vs mock (code) | Decision: mock for pilot |
| Web | Next.js SSR (`Info.md`, Phase 3 roadmap) vs Expo web, Next.js rejected (web conversion plan) | Decision: both. Open: addresses (Q8) |
| Hosting | Local Docker only (`Info.md`) vs AWS (docx) vs hosted server (this roadmap, Oct 13) | Decision: local + optional tunnel |
| Email | Mailhog (`Info.md`) vs Brevo/SendGrid (Phase 1 roadmap) vs Gmail SMTP (code, `.env.local`) | Decision: Gmail SMTP |
| Mood tracking | Post-MVP (`Info.md`) vs built (code) | Decision: kept |
| Counselor bookings | Weekly availability + booking link (`Info.md`) vs therapist-only `Booking` (code) | Decision: bookable, fixed price |
| Escalation | `EscalationEvent` (`Info.md`, Phase 2) vs `EscalationRequest` (Phase 3) | Decision: `EscalationRequest` |
| Product name | Seeker (all docs, `app.json`) vs Buddy (app UI, design system) | Decision: Buddy in visible text |
| Star ratings | Never (`Info.md`) vs star rating (docx, web conversion plan §4.1) | `Info.md` stands: no stars |
| Google OAuth | In MVP (`Info.md`) vs dropped for OTP (Phase 1 roadmap) | OTP only; OAuth deferred |
| CI | GitHub Actions in Phase 1 (`Info.md`) vs no CI (Phase 1 roadmap) | Added in Phase 0 |
| Status claims | "100% functional" (comprehensive audit banner), "all resolved" (tracker) vs this audit | This audit; both archived |
| Pilot size | 5–10 then 50 (`Info.md`) vs 5–10 (this roadmap) | Open (Q10) |
