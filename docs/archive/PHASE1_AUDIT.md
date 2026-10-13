# SEEKER — PHASE 1 AUDIT

**Project:** Seeker — Mental Wellness Platform MVP  
**Audit Date:** 2026-05-21  
**Roadmap Reference:** `PHASE1_ROADMAP.md` (14 tasks, Tasks 1–13 in scope)  
**Task 14 (Testing/CI):** Partial implementation; base auth tests added and verified in Docker, full CI pipeline still deferred.

---

## QUICK STATUS TABLE

| Task | Name                       | Status    | Notes                                                                  |
| ---- | -------------------------- | --------- | ---------------------------------------------------------------------- |
| T1   | Local Toolchain            | ✅ DONE   | Docker, Node, Python, Expo installed                                   |
| T2   | GitHub Repo                | ✅ DONE   | Private repo `seeker`, branches `main`/`develop`                       |
| T3   | Docker Compose             | ✅ DONE   | 10 services running                                                    |
| T4   | Django Project             | ✅ DONE   | Django 5, Daphne ASGI, CORS, JWT, Spectacular                          |
| T5   | Database Schema            | ✅ DONE   | 25+ models, fully migrated                                             |
| T6   | OTP Auth System            | ✅ DONE   | 3-step email OTP flow                                                  |
| T7   | JWT + Roles                | ✅ DONE   | Device-tracked JWT, 3 roles                                            |
| T8   | Admin Panel                | ✅ DONE   | Django Admin configured for all models                                 |
| T9   | Counselor/Therapist Upload | ✅ DONE   | MinIO file upload via `FileUploadService`                              |
| T10  | Admin Approval Workflow    | ✅ DONE   | Approve/reject with email notification                                 |
| T11  | Email Service              | ✅ DONE   | SMTP backend; OTP + approval emails                                    |
| T12  | React Native App Scaffold  | ✅ DONE   | Expo Router, Redux, Axios, full auth screens                           |
| T13  | API Integration (Auth)     | ✅ DONE   | Frontend fully wired to backend auth endpoints                         |
| T14  | Testing / CI               | ⏸ PARTIAL | Base auth tests added and verified in Docker; full CI pipeline pending |

---

## INFRASTRUCTURE (Tasks 1–3)

### Docker Services (10 active)

| Service              | Image              | Port      | Purpose                                        |
| -------------------- | ------------------ | --------- | ---------------------------------------------- |
| `seeker-django`      | Custom Dockerfile  | 8000      | Django/Daphne ASGI server                      |
| `seeker-postgres`    | postgres:16-alpine | 5432      | Primary database                               |
| `seeker-redis`       | redis:7-alpine     | 6379      | Cache + Celery broker                          |
| `seeker-celery`      | seeker-app:latest  | —         | Async task worker                              |
| `seeker-celery-beat` | seeker-app:latest  | —         | Periodic task scheduler                        |
| `seeker-flower`      | mher/flower:2.0    | 5555      | Celery monitoring UI                           |
| `seeker-minio`       | minio/minio:latest | 9000/9001 | Object storage (S3-compatible)                 |
| `seeker-mailhog`     | mailhog/mailhog    | 1025/8025 | Dev email catcher                              |
| `seeker-typesense`   | typesense:0.25.2   | 8108      | Search engine                                  |
| `seeker-nextjs`      | node:20-alpine     | 3000      | Next.js placeholder / public profiles scaffold |

> Note: `seeker-nextjs` container is defined but is a placeholder (no Next.js app built yet — public profile pages are Phase 2).

**Start command:** `docker compose up --build`  
**Health check:** `GET /api/accounts/health/` → `{"status": "ok", "app": "accounts"}`

---

## BACKEND (Tasks 4–11)

### Project Layout

```
seeker/                        # Django project root
├── config/                    # Django settings, urls, asgi, celery
├── accounts/                  # Auth, OTP, user models, JWT
│   ├── models.py              # User, GraduateCounselor, LicensedTherapist, EmergencyContact, OTPToken
│   ├── views.py               # 10 API views
│   ├── serializers.py         # 10 serializers
│   ├── urls.py                # 10 endpoints
│   ├── otp_service.py         # OTPService class
│   ├── token_service.py       # DeviceTokenService (Redis-backed)
│   ├── permissions.py         # IsGeneralUser, IsCounselor, IsTherapist
│   ├── throttles.py           # LoginThrottle, RegisterThrottle, RefreshThrottle
│   ├── admin.py               # Full admin registrations
│   └── services/
│       ├── email_service.py   # EmailService (SMTP backend, Mailhog locally)
│       └── file_upload.py     # FileUploadService (MinIO)
├── core/                      # Session, ChatMessage, SessionNote, EscalationEvent, EarningsRecord, PayoutRecord
├── profiles/                  # Specialization, TherapyModality, AvailabilitySlot, BlockedDate, Booking, IntakeResponse
├── feedback/                  # Review/rating models
├── notifications/             # UserDevice (FCM token storage)
├── helpline/                  # Crisis helpline models
├── requirements.txt
└── docker-compose.yml
```

### Database Models (25+)

**`accounts` app:**

- `User` — extends `AbstractUser`; fields: `email` (unique, LOGIN field), `role` (GENERAL_USER / COUNSELOR / THERAPIST), `phone`, `created_at`
- `GraduateCounselor` — one-to-one with User; fields: credentials (MinIO paths), academic info, bio, pricing, `is_verified`, `slug`
- `LicensedTherapist` — one-to-one with User; fields: license, modalities (JSONField), languages (JSONField), 2FA, pricing, `is_verified`, `slug`
- `EmergencyContact` — FK to User; min 2 enforced at serializer level
- `OTPToken` — email, otp_code, expires_at, is_verified; indexed on (email, otp_code)

**`core` app:**

- `Session` — user + counselor/therapist; status: WAITING→MATCHED→ACTIVE→PAYMENT_PENDING→PAID→ENDED; `is_crisis_flagged`
- `ChatMessage` — FK to Session; delivered_at, read_at
- `SessionNote` — private counselor/therapist notes linked to messages
- `EscalationEvent` — counselor-to-therapist escalation; urgency: LOW/MEDIUM/HIGH/CRITICAL
- `EarningsRecord` — per-session earnings with platform fee calculation
- `PayoutRecord` — payout lifecycle PENDING→PROCESSING→PAID

**`profiles` app:**

- `Specialization`, `TherapyModality` — reference lookup tables
- `AvailabilitySlot` — weekly recurring slots per counselor/therapist
- `BlockedDate` — date-level blocking
- `Booking` — scheduled therapist sessions; SCHEDULED→COMPLETED→CANCELLED
- `IntakeResponse` — JSONField questionnaire linked to booking

**`notifications` app:**

- `UserDevice` — FCM token + platform (IOS/ANDROID); unique on (user, fcm_token)

**`feedback` app:**
- `SessionFeedback` — one-to-one with Session; 4 open-ended question fields (`q1_before_session`, `q2_after_session`, `q3_what_helped`, `q4_what_improve`); `is_flagged` boolean

**`helpline` app:**
- `HelplineCategory` — categories: CRISIS, SUICIDE, DOMESTIC, LGBTQ, SUBSTANCE, OTHER
- `HelplineEntry` — helpline name, phone, region, is_24_7, language

### API Endpoints (accounts)

```
GET  /api/accounts/health/
POST /api/accounts/auth/login/
POST /api/accounts/auth/refresh/
POST /api/accounts/auth/logout/
POST /api/accounts/auth/logout-all/
GET  /api/accounts/auth/me/
POST /api/accounts/auth/register/request-otp/
POST /api/accounts/auth/register/verify-otp/
POST /api/accounts/auth/register/general-user/
POST /api/accounts/auth/register/counselor/
POST /api/accounts/auth/register/therapist/
```

Swagger/OpenAPI docs auto-generated via `drf-spectacular` at `/api/schema/`, `/api/docs/`.

### Authentication Flow

**Registration (3-step OTP):**

1. `POST /register/request-otp/` → generates 6-digit OTP, sends via Gmail SMTP, stores in `OTPToken` table
2. `POST /register/verify-otp/` → marks `OTPToken.is_verified = True`
3. `POST /register/{role}/` → validates email verified, creates `User` + profile, returns JWT

**Login:** Email or username + password → validates against DB → generates device-tracked JWT

**JWT Strategy (`DeviceTokenService`):**

- Tokens stored in Redis, keyed by `user_id + sha256(User-Agent)`
- Access token: short-lived (configurable)
- Refresh token: long-lived, device-specific
- Logout invalidates Redis entry for device; Logout-all clears all device keys

**Permissions:**

- `IsGeneralUser`, `IsGraduateCounselor`, `IsLicensedTherapist` — custom DRF permission classes (role-specific)
- `IsVerified` — checks `counselor_profile.is_verified` or `therapist_profile.is_verified`; General Users pass through
- Role stored on `User.role`, checked at view level

**Throttling:**

- `LoginThrottle` — rate-limits login attempts
- `RegisterThrottle` — rate-limits OTP requests and registrations
- `RefreshTokenThrottle` — rate-limits token refresh

### Admin Approval Workflow (Task 10)

When a Counselor or Therapist registers, `is_verified = False` by default.

Admin approves/rejects directly from **Django Admin panel** using bulk actions (not REST API endpoints):
- `approve_counselors` / `reject_counselors` actions on `GraduateCounselorAdmin`
- `approve_therapists` / `reject_therapists` actions on `LicensedTherapistAdmin`

Each action:
1. Sets `is_verified = True/False` and `verification_date`
2. Calls `EmailService.send_approval_email()` or `EmailService.send_rejection_email()`
3. Reports partial email failures in the admin message bar

Admin also has clickable file download links for uploaded credentials (degree files, license files).

### Known Backend Fix Applied

**Bug:** `OTPToken.MultipleObjectsReturned` when user requests OTP multiple times within the validity window.  
**Fix:** `OTPService.is_email_verified()` changed from `.get()` to `.filter().exists()` — safe for multiple records.

---

## FRONTEND (Tasks 12–13)

### Tech Stack

| Library                      | Version | Purpose                            |
| ---------------------------- | ------- | ---------------------------------- |
| Expo                         | ~51.0.0 | React Native managed workflow      |
| expo-router                  | ~3.5.0  | File-based navigation (Stack)      |
| React Native                 | 0.74.5  | Mobile UI framework                |
| Redux Toolkit                | ^2.2.5  | Global state (auth session)        |
| React Query (TanStack)       | ^5.45.1 | Server state / API calls           |
| Axios                        | ^1.7.2  | HTTP client                        |
| expo-secure-store            | ~13.0.2 | JWT token storage (encrypted)      |
| expo-linear-gradient         | ~13.0.2 | UI gradients                       |
| react-native-gesture-handler | ~2.16.1 | Required by expo-router navigation |

### File Structure

```
frontend/
├── app/
│   ├── _layout.js              # Root layout: GestureHandlerRootView + Redux Provider + ErrorBoundary
│   ├── index.js                # Entry: <Redirect to="/login" /> based on auth state
│   ├── (auth)/
│   │   ├── _layout.js          # Auth stack layout
│   │   ├── login.js            # Login screen
│   │   ├── request-otp.js      # Step 1: Enter email + role
│   │   ├── verify-otp.js       # Step 2: Enter 6-digit OTP
│   │   └── register.js         # Step 3: Complete profile (role-conditional form)
│   └── (app)/
│       ├── _layout.js          # Protected app stack layout (auth guard)
│       └── dashboard.js        # Post-login dashboard (role-aware)
├── api/
│   ├── axios.js                # Axios instance + JWT interceptors + 401 refresh logic
│   └── auth.js                 # All auth API functions + getErrorMessage helper
├── store/
│   ├── store.js                # Redux store configuration
│   └── authSlice.js            # Auth state: user, tokens, role, isAuthenticated
├── components/
│   ├── OTPInput.js             # 6-box OTP digit input component
│   ├── RoleSelector.js         # Role picker (GENERAL_USER / COUNSELOR / THERAPIST)
│   └── EmergencyContactForm.js # Dynamic emergency contact form (min 2 contacts)
├── hooks/
│   └── useAuth.js              # Auth state hook (reads Redux + SecureStore)
├── constants/
│   └── theme.js                # Design tokens: colors, spacing, typography (dark mode)
├── app.json                    # Expo config (name, slug, icons)
├── babel.config.js
└── package.json
```

### Navigation Architecture

```
/ (index.js)
└── Redirect → based on isAuthenticated
    ├── NOT AUTHENTICATED → /(auth)/login
    │   ├── /login
    │   ├── /request-otp
    │   ├── /verify-otp
    │   └── /register
    └── AUTHENTICATED → /(app)/dashboard
```

### Auth State (Redux `authSlice`)

```js
// State shape
{
  user: null | { id, email, username, role, first_name, last_name, ... },
  accessToken: null | string,
  refreshToken: null | string,
  deviceHash: null | string,
  isAuthenticated: false | true,
  isLoading: false | true,
  error: null | string,
  // Persists email/role between OTP registration screens
  registrationFlow: { email: null, role: null, otpVerified: false },
}

// Actions (actual exported names)
setTokens(payload)            // Sets access/refresh/deviceHash, isAuthenticated=true
setUser(payload)              // Sets user object
setLoading(bool)
setError(string)
clearError()
setRegistrationFlow(partial)  // Merges partial into registrationFlow
clearRegistrationFlow()
logout()                      // Clears all auth state
```

### Root Layout Providers (app/_layout.js)

Provider wrapping order (outermost → innermost):
```
GestureHandlerRootView (flex:1)
  └── Provider (Redux)
        └── QueryClientProvider (React Query, staleTime=30s, retry=1)
              └── SafeAreaProvider
                    └── StatusBar (style=light)
                          └── Stack (headerShown=false)
```
> `react-native-gesture-handler` is the **very first import** in the file (required by expo-router v3).

### Axios Interceptors (`api/axios.js`)

- **Request interceptor:** Reads `accessToken` from Redux store, attaches as `Authorization: Bearer <token>`
- **Response interceptor:** On 401, attempts silent token refresh via `POST /auth/refresh/`; on success retries original request; on failure clears credentials and redirects to login

### API Layer (`api/auth.js`)

```js
requestOTP(email, role);
verifyOTP(email, otp_code);
registerGeneralUser(payload); // { email, username, password, password_confirm, first_name, last_name, phone, emergency_contacts }
registerCounselor(formData); // multipart/form-data with optional file uploads
registerTherapist(formData); // multipart/form-data with optional file uploads
login(email, password);
getMe(token);
logoutUser();
logoutAllDevices();
getErrorMessage(error); // Extracts field-level errors from DRF 400 responses
```

### Registration Form (role-conditional)

- **GENERAL_USER:** Basic fields + dynamic emergency contacts (min 2, validated)
- **COUNSELOR:** Basic fields + academic info (graduation year, university, specialization, years experience, rate) + optional file uploads (degree, graduation certificate)
- **THERAPIST:** Basic fields + license number + modalities (multi-select) + languages (multi-select) + rates + optional license file upload

### Known Frontend Bugs Fixed

| Bug                                | Root Cause                                                                | Fix                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Blank blue screen on startup       | `router.replace()` inside `useEffect` is unreliable at root mount         | Replaced with declarative `<Redirect />` component                            |
| Blank blue screen (render crash)   | `react-native-gesture-handler` not initialized before `expo-router` Stack | Added `GestureHandlerRootView` as outermost wrapper in root `_layout.js`      |
| 400 Bad Request on registration    | Frontend not sending `password_confirm` field                             | Added `password_confirm` to all 3 registration payloads                       |
| 400 Bad Request on optional fields | Django serializer rejected empty strings for optional fields              | Added `allow_blank=True` to optional fields in all 3 registration serializers |
| 500 on registration verify check   | `OTPToken.objects.get()` throws `MultipleObjectsReturned`                 | Changed to `.filter().exists()` in `OTPService.is_email_verified()`           |
| Therapist arrays in multipart form | `JSON.stringify(array)` not parseable by DRF ListField                    | Changed to `.forEach((v) => formData.append('field', v))`                     |
| Generic "Something went wrong"     | `getErrorMessage` didn't parse DRF field-level error dicts                | Added loop to extract and format field errors                                 |

## TESTS (Partial — T14 Deferred)

Tests exist in `accounts/tests/` despite T14 being officially deferred:

**`accounts/tests/factories.py`** — `UserFactory` (factory-boy)

**`accounts/tests/test_auth.py`** — 7 pytest test cases:
| Test | Covers |
|------|--------|
| `test_request_otp_success` | OTP created, email sent |
| `test_verify_otp_invalid` | Wrong code → 400 |
| `test_verify_otp_expired` | Expired OTP → 400 |
| `test_register_counselor_unverified` | Counselor registered with `is_verified=False` |
| `test_emergency_contacts_minimum_2` | 1 contact → 400; 2 contacts → 201 |
| `test_login_success` | Login returns access + refresh tokens |
| `test_login_invalid_password` | Wrong password → 400 |
| `test_token_refresh` | Refresh token returns new access token |
| `test_general_user_me_endpoint_returns_no_counselor_profile` | Role isolation on `/me/` |

**Run:** `pytest accounts/tests/ -v`  
**Config:** `pytest.ini` at project root

---


The following was implemented beyond what `PHASE1_ROADMAP.md` explicitly specified:

| Addition                              | Detail                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `ErrorBoundary` in root layout        | Catches silent JS crashes and shows error details instead of blank screen             |
| `GestureHandlerRootView` wrapper      | Required by `react-native-gesture-handler` v2 — not in original plan                  |
| `getErrorMessage` field error parser  | Original plan had no field-level error extraction in frontend                         |
| `DeviceTokenService` Redis-backed JWT | Original plan specified JWT but not device-specific Redis storage                     |
| OTP duplicate token fix               | `filter().exists()` fix for production reliability                                    |
| Admin Approval email notifications    | `EmailService` sends HTML emails on approve/reject — beyond basic admin approval spec |
| `per_session_rate` on Therapist       | Therapists have both per-minute and per-session pricing (per model)                   |
| `is_crisis_flagged` on Session        | Crisis detection flag on session model                                                |
| `EscalationEvent` model               | Counselor → Therapist escalation workflow (model only, API in Phase 2)                |
| Throttling on all auth endpoints      | `LoginThrottle`, `RegisterThrottle`, `RefreshTokenThrottle`                           |

---

## WHAT IS NOT DONE (Phase 2+)

| Feature                                       | Scope          |
| --------------------------------------------- | -------------- |
| WebSocket chat (Channels + Redis)             | Phase 2        |
| Session matching algorithm                    | Phase 2        |
| Payment (Razorpay integration)                | Phase 2        |
| Push notifications (FCM)                      | Phase 2        |
| Typesense search index                        | Phase 2        |
| Public counselor/therapist profiles (Next.js) | Phase 2        |
| Feedback / review API                         | Phase 2        |
| Helpline API                                  | Phase 2        |
| Availability slot management API              | Phase 2        |
| Booking API                                   | Phase 2        |
| Dashboard screens beyond post-login stub      | Phase 2        |
| Automated tests / CI pipeline                 | Deferred (T14) |

---

## ENV VARS REQUIRED

```env
# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=seekerdb
DB_USER=seeker
DB_PASSWORD=seekerpass
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=app-password
DEFAULT_FROM_EMAIL=Seeker <your@gmail.com>

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=seeker-files

# Typesense
TYPESENSE_API_KEY=local-typesense-key
TYPESENSE_HOST=typesense

# Frontend
API_BASE_URL=http://192.168.x.x:8000   # Host machine LAN IP for mobile device
```

---

## HOW TO RUN

```bash
# Backend (from project root)
docker compose up --build

# Frontend (from /frontend)
npx expo start --clear
# Scan QR with Expo Go app (phone must be on same WiFi as host machine)
```

**Verify backend:** `curl http://localhost:8000/api/accounts/health/`  
**API docs:** `http://localhost:8000/api/docs/`

---

_End of Phase 1 Audit_
