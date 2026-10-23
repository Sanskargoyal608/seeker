# Things only you can do

Kept here so nothing gets lost. Tick them off as you go. Written 2026-10-23.

## Before anyone else uses the app

- [ ] **Fill the staff alert list.** Django Admin → *Emergency contacts* → add the email of everyone who must be told when someone may be in crisis. If this list is empty, nobody is emailed (the alert is still saved and the server logs an error).
- [ ] **Verify the helpline numbers** in `helpline/defaults.py` (112, Tele-MANAS 14416, KIRAN 1800-599-0019, iCall 9152987821, Women Helpline 181, Childline 1098). I wrote them from memory. Call or check each one; fix wrong ones in Django Admin → *Helpline entries*.
- [ ] **Have a clinician review the crisis phrase list** in `core/crisis_keywords.py` (add, remove, add regional languages). It deliberately errs on the side of alerting.
- [ ] **Try the Crisis button on your own phone.** I only checked that the screens compile. Open it from the dashboard, the triage chat, notifications and feedback, tap a number, and tap "Tell our support team". Check the email arrives.
- [ ] **Rotate the Google API key** used in `fetch_stitch.py`, `fetch_stitch.js` and `fetch_ps.ps1` (Google Cloud console). It was printed in an earlier tool output.

## After pulling these changes onto your machine

- [ ] **Rebuild and migrate** (dependencies and the database changed):
  `docker compose up -d --build` then `docker compose exec django python manage.py migrate`
  New migrations: accounts 0006 and 0007, core 0015, helpline 0002 (seeds the helplines). If your dev database never had core 0011–0014 applied, `migrate` applies those too.
- [ ] **Expect everyone to log in again once.** Old login tokens have no device id, so refreshing them fails by design.
- [ ] **Add to `.env.local`** if you use the tunnel (see below): `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `NUM_PROXIES`. See `.env.local.example`.

## Before opening a tunnel (Cloudflare / ngrok)

- [ ] Set `DEBUG=False` in `.env.local` (debug mode leaks settings and error pages).
- [ ] Set `ALLOWED_HOSTS` to your LAN address and the tunnel hostname, `CORS_ALLOWED_ORIGINS` to the tunnel URL, `NUM_PROXIES=1`.
- [ ] Point the tunnel at the Django port (8000) only. Never at Flower (5555), MinIO or Postgres.
- [ ] Don't share the link until Phase 3 is done (the app still has known broken flows).

## Git and GitHub

- [ ] Open a pull request for each branch if you want a record (the GitHub CLI isn't installed here, so use the links GitHub prints). Branches: `phase2/crisis` is **not merged into main yet**.
- [ ] Decide when to merge `phase2/crisis` into `main`.

## Added during Phase 3

- [ ] **Firebase file:** put your `google-services.json` in `frontend/` (it is secret-ish: do not commit it; I will add it to `.gitignore` when I wire push). Also keep `firebase-credentials.json` (the server key) in the repo root, as now.
- [ ] **Review the triage accuracy results** (65 simulated people, `triage_persona_report.json` after running `RUN_PERSONA_EVAL=1 pytest core/tests/test_triage_personas.py -s`): 75% routed as you labelled them. All 10 mistakes sent someone to a peer counselor who was labelled "needs a therapist" (e.g. agoraphobia, divorce + depression, complicated grief). A clinician should say whether those labels are right and what the safe default is.
- [ ] **Decide the accuracy bar** for the pilot, and whether an uncertain case should go to a therapist by default.
- [ ] After you apply Phase 3: run `docker compose exec django python manage.py migrate` again (new migrations: core 0016, 0017). The legacy EscalationEvent table is deleted.
- [ ] **Escalated patients are not charged extra:** I did not add any payment rule for the therapist session that follows an escalation. Tell me if it should be treated differently from a normal therapist session.

## Decisions I still need from you

- [ ] Who is on the on-call list and how fast must they respond?
- [ ] Which regions and languages do the helplines need to cover?
- [ ] Push notifications: native Firebase tokens, or Expo's push service?
- [ ] After a therapist accepts an escalation, does the counselor stay in the chat, and who is paid?
- [ ] What should the web page `/book/<name>` do: open the app, or be a real booking page?
- [ ] Expo web and the Next.js site both want port 3000. Which address should each use?
- [ ] What triage accuracy is good enough for the pilot? (See the persona results once the run finishes.)
- [ ] Is widening from 5–10 testers to 50 in scope after the pilot?

## Later phases (needs you)

- [ ] **Legal (Phase 5):** privacy policy, terms of service, and wording for the consent screen before intake text goes to OpenAI. A lawyer should review them before real users sign up.
- [ ] **Gmail sender:** decide whether OTP and crisis emails keep coming from your personal Gmail or a dedicated Buddy address; app passwords expire if the account changes.
- [ ] **Test devices:** a real Android phone for the Phase 3 and Phase 6 checks, and recruit the 5–10 pilot testers.
- [ ] **Credentials check:** confirm no key in `.env.local` (OpenAI, Gmail app password, Firebase) was shared outside your machine; rotate any that were.
