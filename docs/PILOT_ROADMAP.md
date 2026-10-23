# Seeker — Pilot Roadmap

**Date:** 2026-10-13 · **Updated:** 2026-10-23
**Basis:** [MASTER_AUDIT.md](MASTER_AUDIT.md)
**Finish line:** a closed pilot with 5–10 real users on Android and web, run from a local machine on the LAN, with a Cloudflare (or similar) tunnel for testers outside it.

This roadmap replaces the phase numbering in the older documents now under `docs/archive/`.

## Scope decisions

Full list with dates in [MASTER_AUDIT.md §10](MASTER_AUDIT.md#10-decisions-taken).

- Android plus web. Expo web for the logged-in app; Next.js (`web/`) for public profile and booking pages.
- Development phase: everything runs locally. No cloud hosting before the pilot is validated.
- Real email through Gmail SMTP, so OTP codes and crisis alerts arrive.
- Payments stay mocked for the pilot.
- Crisis alerts go to on-call staff / admin.
- 15 minutes free, 15% platform fee. Booked sessions (therapist or counselor) have a fixed per-session price.
- AI triage: keep the adaptive flow on OpenAI `gpt-4o-mini`. The clinical summary is for clinicians only.
- `EscalationRequest` is the only escalation model.
- Unverified providers can set up their profile and schedule but are hidden from search and cannot take sessions.
- The product is called "Buddy" in all visible text; internal ids stay `seeker`.
- Kept: mentorship, mood and breathing, compliance screen. Cut: wallet withdrawals.
- Must-haves: encryption of personal data at rest, legal docs and consent, CI and test gate.

Each phase is a hard gate: do not start the next until the "done when" line is met.

---

## Phase 0 — Stabilise the repo

Nothing else is safe to build until the working tree is committed and tests can run.

- [x] Split and commit the uncommitted work as separate commits: SDK 54 → 57 upgrade, web conversion, new features, backend changes.
- [x] Commit `core/migrations/0011`–`0014` together with the model changes.
- [x] Untrack `celerybeat-schedule`, `.coverage`, `staticfiles/`, `frontend/dist/` and the stray `frontend/%ProgramData%` file; extend `.gitignore`.
- [x] Pin dependencies with a lock file; choose Django 5.x or 6.0; declare `PyJWT`, `requests`, `pytest-asyncio`; drop unused packages.
- [x] Make tests runnable outside Docker: Postgres and Redis hosts from env vars; CI starts both as services.
- [x] Fix or delete the three stale `core` test files (`test_triage.py`, `test_triage_service.py`, `test_consumers.py`).
- [x] Add GitHub Actions running the test suite on every push. *(First run passed on 2026-10-13.)*
- [ ] Rotate the Google API key in the `fetch_*` scripts (owner action, in the Google Cloud console).
- [x] Exclude `firebase-credentials.json` and logs from the Docker build.
- [x] Root README; bring `.env.local.example` in line with the variables the code reads.

**Done when:** a fresh clone builds, migrates and passes the test suite in CI.

**Status (2026-10-13):** 108 tests pass locally against Postgres 16 and Redis 7 on Django 5.2.18; the Docker image builds. CI is green on `phase0/stabilise`. Open: the API key rotation.

## Phase 1 — Close the security holes

- [x] Participant and ownership checks on chat messages, session detail, triage respond and the mock `verify-payment`.
- [x] Clinical summary for clinicians only: stop returning dossier, provisional conditions, severity and crisis flags to the seeker (triage replies and `sessions/<id>/intake/`).
- [x] Unverified providers: allow profile, document upload and availability setup; block queue, accept, escalate, respond, follow-up and bookings; keep them out of search results and the Typesense index. Only verified therapists as escalation and booking targets.
- [x] Keep therapist-directed sessions out of the counselor queue.
- [x] Disable wallet withdrawals: payouts endpoint read-only; remove the withdraw buttons.
- [x] OTP and password reset:
  - [x] attempt limits and lockout
  - [x] invalidate old codes on reissue
  - [x] single-use reset codes
  - [x] dedicated throttles
  - [x] apply the password validators
- [x] Make logout-all and reset-time token invalidation real; each login is its own device session (several devices per account), so one phone no longer logs out another.
- [x] WebSocket auth:
  - [x] fix the middleware crash on bad tokens
  - [x] accept access tokens only
  - [x] check `is_active`
  - [x] validate origin
- [x] Correct the throttle rates (read from settings: login 10/min, register 30/hour, per-email OTP limits) and set the proxy count (`NUM_PROXIES`, 0 on the LAN, 1 behind a tunnel).
- [x] Remove account-enumeration responses and raw exception text from error bodies.
- [x] Remove fake trust signals in the app: "Verified Identity / Background checked", "Available Now", "Accepting New Clients", invented trait badges, the invented university, the non-functional 2FA switch, "Last updated 3 months ago". The compliance identity card now shows real status.
- [x] Safe to expose through a tunnel: `DEBUG` off by default, a real `SECRET_KEY` required, `ALLOWED_HOSTS` and CORS read from env, Swagger only in debug mode. (Flower is not reachable through a tunnel that points at port 8000.)

**Done when:** each hole has a test that fails before the fix and passes after, and no tunnel link is shared until this phase is done.

**Status (2026-10-23):** all items done on branch `phase1/security`; 172 backend tests pass. Not yet done: a check of the changed screens on an Android device, and the in-app "pending approval" screen (Phase 3).

## Phase 2 — Make crisis handling real

- [x] Crisis scan before the payment hold, and on the REST message path; never paywall a crisis-flagged session.
- [x] Keyword check on triage input independent of the AI; set the crisis flag and alert when it fires.
- [x] Alert a configured on-call staff list by push and email, with a persistent alert record; remove the hardcoded personal Gmail and `admin@seeker.app`. The existing `core.EmergencyContact` admin list (staff emails) is the starting point; consider renaming it to avoid confusion with users' own emergency contacts.
- [x] Panic button: real recipients, persisted without an active session, honest response message.
- [x] Replace `Alert.alert` in `PanicButton` with a modal that works on web; wire the two dead Crisis buttons.
- [x] Seed crisis keywords and helpline entries at deploy time; expand the keyword list beyond 22 English phrases.
- [x] Stop auto-ending crisis-flagged and therapist-requested waiting sessions; notify the seeker when a session is withdrawn.
- [x] Define behaviour when OpenAI is down.
- [ ] Re-run the persona simulation; agree an acceptance bar; fix the personas that never complete.

**Done when:** a crisis message at any point (triage, free chat, after the free window, panic button) produces a staff alert in a test environment.

**Status (2026-10-23):** all items done except the persona re-run (needs the OpenAI key and the simulation script, which is not in the repo; spends real API credit). Verified by automated tests for every path. Not yet verified: the new crisis screens on a real Android device and in a browser. The staff alert list (Django Admin > Emergency contacts) must be filled in before the pilot; the helpline numbers must be verified by a person.

## Phase 3 — Make the core flows work end to end

**Sessions and money**
- [x] Move sessions to `ACTIVE` with a start time on match.
- [x] Start the free timer at match; stop it overwriting `WAITING` and `ENDED`.
- [x] Platform fee 20% → 15%; therapist and booked sessions priced per session. (No split is needed after an escalation: the therapist gets a new session of their own, see the escalation block.)
- [x] Counselor earnings view.

**Booking**
- [x] Fix the therapist start check (`profiles/views.py:319`) and the booking-id/session-id mix-up in the calendar.
- [ ] Point the seeker's "Join Session" at the real start call. *(backend start/rejoin done; the app button still opens the wrong screen)*
- [ ] Validate bookings: slot exists, future time, no double booking, verified provider.
- [ ] Timezone handling.
- [ ] Counselor bookings: `Booking` and slot calculation support counselors; counselors set a fixed per-session price; counselor public profile "Book" buttons work in the app and on the web.

**Escalation and therapist tools**
- [x] Remove `EscalationEvent` and its endpoint; move `has_escalation` and backchannel authorisation onto `EscalationRequest`. When a therapist accepts, the patient gets a NEW therapist session, the counselor's session ends, and the counselor keeps the backchannel (owner decision).
- [x] Pending-state guard; decline feedback to the counselor.
- [ ] Restore the therapist intake view, follow-up and escalation alert from the dead `dashboard.js` code; delete the dead code.
- [~] Link the triage dossier to the session the therapist receives. (Done for escalations: the new therapist session inherits the briefing. Still open for a seeker who picks a therapist from the triage recommendations.)

**Mobile app**
- [ ] Auth gate and role guards; fix session restore (`/api/accounts/auth/me/`).
- [ ] Single-flight token refresh, saved to Redux; sockets reconnect with a fresh token.
- [ ] Chat: reconnect with backoff, server message ids and timestamps, "Invalid Date", live-message highlight.
- [ ] Enable push on Android; agree the token type with the backend.
- [ ] Contract fixes: account deletion path, session history, feedback field mapping, public profile ids, helpline categories path, therapist search filters.

**Uploads and profiles**
- [ ] Fix the MinIO upload call; wrap registration in a transaction; validate file size and type.
- [ ] Fix the public counselor profile 500.
- [ ] Compliance screen with real per-document status; pending-verification experience.

**Done when:** each of the six journeys in `docs/archive/Info.md` can be completed on an Android device without a workaround.

## Phase 4 — Web

- [ ] Expo web: remaining `Alert.alert` calls, register upload, time picker, active-nav highlight, sidebar logout and crisis.
- [ ] Next.js: `await params`, one app directory with a root layout, Docker service, not-found and error pages.
- [ ] Give Expo web and Next.js separate addresses; both currently expect port 3000.
- [ ] Decide what `/book/[slug]` does.

**Done when:** both web builds run from Docker and the public profile pages render real data.

## Phase 5 — Privacy and compliance

- [ ] Encrypt chat messages, notes, dossiers and contact details at rest.
- [ ] Privacy policy and terms; explicit consent before intake text is sent to OpenAI.
- [ ] Real account deletion or anonymisation, with re-authentication.
- [ ] Push privacy: unregister on logout, one owner per token, no message previews, honour preferences.
- [ ] Hash OTPs at rest; stop logging email addresses.

**Done when:** a legal reviewer has signed off the documents and the consent screens are live.

## Phase 6 — Local pilot readiness and pilot

- [ ] API and WebSocket address configurable per environment (LAN IP or tunnel URL) instead of the hardcoded IP in `app.json`.
- [ ] Android builds testers can install: allow plain HTTP to the LAN address for development builds; use the tunnel's HTTPS address for outside testers.
- [ ] Real email: Gmail SMTP configured for OTP codes, crisis alerts and reminders; one sender address used everywhere.
- [ ] Tunnel runbook: how to open and close it, which hostnames to allow, what must be off before sharing a link.
- [ ] Startup on the pilot machine: migrate, seed crisis keywords and helplines, and a backup of the local database before and during the pilot.
- [ ] Finish the kept extras: mentorship (role checks, realtime chat), mood and breathing.
- [ ] "Buddy" in all visible text (app name, screens, emails, web pages); internal ids unchanged. Currency ₹; one version string.
- [ ] Regression on physical Android devices and target browsers.
- [ ] Run the pilot with 5–10 users and a written on-call rota.

## Deferred past the pilot

Cloud hosting, domain, HTTPS and production monitoring · real Razorpay and automated payouts · wallet withdrawals · therapist 2FA · iOS · video and audio · Google OAuth · orientation quiz and video · gamification · i18n · calendar sync · read receipts · admin dashboard.
