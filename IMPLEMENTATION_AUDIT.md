# Seeker Implementation Audit

**Date**: May 19, 2026  
**Purpose**: Document the current implementation state for AI assistants and development continuity.

---

## Project Overview

**Seeker** is a Django-based mental health counseling platform that connects users with graduate counselors and licensed therapists. It supports real-time sessions, payments, feedback, and emergency escalation.

**Tech Stack**:

- Backend: Django 5.0 + Django REST Framework
- Real-time: Daphne (ASGI) + Channels 4.0
- Database: PostgreSQL 16
- Cache & Queue: Redis 7
- Task Queue: Celery 5.3 + Celery Beat
- Search: Typesense 0.25.2
- File Storage: MinIO
- Email: Brevo (with Mailhog for local dev)
- Payments: Razorpay
- Push Notifications: Firebase Admin
- API Docs: drf-spectacular (Swagger/OpenAPI)
- Frontend: Next.js placeholder (port 3000)
- Monitoring: Flower (Celery UI)

---

## Architecture Overview

### Multi-Service Docker Compose Setup

The application runs in containers with health checks for all services. Service dependencies are defined (e.g., Django waits for PostgreSQL and Redis).

**Running Services** (docker-compose.yml):

1. **django** (port 8000) - Daphne ASGI server with live code reload
2. **postgres** (port 5432) - PostgreSQL database
3. **redis** (port 6379) - Cache & message broker
4. **celery** - Async task worker
5. **celery-beat** - Scheduled tasks
6. **flower** (port 5555) - Celery monitoring
7. **minio** (port 9000/9001) - Object storage for files/credentials
8. **mailhog** (port 1025/8025) - Local email testing
9. **typesense** (port 8108) - Full-text search
10. **nextjs** (port 3000) - Frontend placeholder

---

## Database Models

### 1. **accounts** App

Custom authentication and role-based user management.

#### **User** (extends AbstractUser)

- Email-based login (replaces username)
- Roles: GENERAL_USER, COUNSELOR, THERAPIST
- Fields: email, role, phone, created_at

#### **GraduateCounselor** (OneToOne with User)

- Credentials stored as MinIO paths: degree_file, graduation_certificate
- Academic: graduation_year, university, specialization, years_experience
- Profile: bio, profile_photo, per_minute_rate
- Verification: is_verified, verification_date
- Public slug for profiles

#### **LicensedTherapist** (OneToOne with User)

- License: license_number, license_file
- Specializations: modalities (JSON), languages (JSON)
- Profile: bio, profile_photo, per_minute_rate, per_session_rate
- 2FA support: two_factor_enabled, two_factor_phone
- Public slug for profiles

#### **EmergencyContact**

- Min 2 per user (enforced at serializer, not DB)
- Fields: name, phone, relationship

#### **OTPToken**

- Email-based OTP for authentication
- Indexed on (email, otp_code) for fast lookup
- expires_at for TTL enforcement

---

### 2. **core** App

Session management, messaging, and escalation.

#### **Session**

- Status flow: WAITING → MATCHED → ACTIVE → PAYMENT_PENDING → PAID → ENDED
- Polymorphic provider: either counselor OR therapist (not both)
- Tracks: start_time, end_time, duration_minutes, is_crisis_flagged
- Ordered by -created_at

#### **ChatMessage**

- Parent: Session
- Sender: User
- Tracking: is_highlighted, delivered_at, read_at
- Ordered by created_at (chronological)

#### **SessionNote**

- Private notes only (is_private always True)
- Can be linked to ChatMessage
- Author: provider/admin only

#### **EscalationEvent**

- Escalates from Counselor → Therapist
- Urgency: LOW, MEDIUM, HIGH, CRITICAL
- Status: PENDING, ACCEPTED, COMPLETED
- Use case: When counselor needs therapist intervention

#### **EarningsRecord**

- Per-session earnings for providers
- Tracks: duration_minutes, rate_per_minute, gross_amount, platform_fee_percent (20%), net_amount
- Polymorphic: either counselor OR therapist

#### **PayoutRecord**

- Aggregated earnings payout
- Status: PENDING, PROCESSING, PAID
- Tracks payout_date

---

### 3. **profiles** App

Availability and scheduling.

#### **Specialization** & **TherapyModality**

- Reference data (CBT, DBT, Psychodynamic, etc.)

#### **AvailabilitySlot**

- Recurring weekly availability for counselor OR therapist
- Day of week (0-6), start_time, end_time
- is_active for soft disable

#### **BlockedDate**

- One-off unavailability (vacation, illness)
- Reason field for context

#### **Booking**

- User books therapist for scheduled_datetime
- Status: SCHEDULED, COMPLETED, CANCELLED
- duration_minutes (default 60)

#### **IntakeResponse**

- Pre-session questionnaire responses
- Linked to Booking OR standalone User intake
- responses_json stores form data

---

### 4. **notifications** App

#### **UserDevice**

- FCM tokens for push notifications
- Platform: IOS or ANDROID
- Unique constraint on (user, fcm_token)
- is_active for toggling notifications

---

### 5. **feedback** App

#### **SessionFeedback**

- OneToOne per Session
- 4 survey questions (q1_before, q2_after, q3_what_helped, q4_what_improve)
- is_flagged for QA review
- submitted_at for timestamp

---

### 6. **helpline** App

Crisis resources (not user-generated).

#### **HelplineCategory**

- Categories: CRISIS, SUICIDE, DOMESTIC, LGBTQ, SUBSTANCE, OTHER
- Curated reference data

#### **HelplineEntry**

- Phone, region, language, is_24_7 flag
- Linked to category

---

## Configuration

### settings.py Highlights

**Security**:

- ALLOWED_HOSTS = ['*'] (permissive for local dev, tighten in production)
- SECRET_KEY from env (unsafe local fallback)
- DEBUG from env (defaults to True)

**Authentication**:

- AUTH_USER_MODEL = 'accounts.User'
- JWT with simplejwt and token blacklist
- 4 password validators enabled

**Installed Apps** (in order):

- daphne (ASGI)
- Django core
- DRF + drf-spectacular
- CORS + channels
- Custom apps: accounts, core, profiles, notifications, feedback, helpline

**Middleware**:

- CorsMiddleware (first)
- Security, WhiteNoise (static files)
- Session, auth, messages
- Clickjacking protection

**Database**: PostgreSQL (config from env, defaults in code)

**Media/Static Files**:

- Handled by WhiteNoise
- MinIO for credential files

---

## API Structure

### URL Routing (config/urls.py)

Currently minimal:

```
/admin/               - Django admin
/api/schema/          - OpenAPI schema
/api/docs/            - Swagger UI
/api/accounts/health/ - Health check
```

**TODO**: Majority of app endpoints not yet exposed. Future routes expected:

- /api/accounts/ (auth, registration, user management)
- /api/core/ (sessions, messages, escalations)
- /api/profiles/ (bookings, availability, therapist directory)
- /api/notifications/ (device management, push)
- /api/feedback/ (session feedback)
- /api/helpline/ (crisis resources)

---

## Dependency Overview

### Core Dependencies

- **Django 5.0**: Web framework
- **djangorestframework 3.14**: REST API
- **djangorestframework-simplejwt 5.3**: JWT auth
- **drf-spectacular 0.27**: Auto OpenAPI docs

### Real-time & Async

- **channels 4.0**: WebSocket support
- **channels-redis 4.1**: Redis backend for channels
- **daphne 4.0**: ASGI server
- **celery 5.3**: Task queue
- **django-celery-beat 2.5**: Scheduled tasks

### External Services

- **psycopg2-binary 2.9**: PostgreSQL driver
- **redis 5.0**: Redis client
- **minio 7.2**: Object storage
- **razorpay 1.3**: Payment gateway
- **firebase-admin 6.4**: Push notifications
- **brevo-python 2.3**: Email service
- **python-jose 3.3**: JWT handling
- **typesense 1.6**: Full-text search

### Utilities

- **python-decouple 3.8**: Env var loading
- **python-dotenv 1.0**: .env file support
- **cryptography 42.0**: Encryption
- **whitenoise 6.0**: Static file serving
- **django-cors-headers 4.0**: CORS support
- **django-filter 24.1**: API filtering

### Testing

- **pytest 7.4**: Test framework
- **pytest-django 4.7**: Django integration
- **factory-boy 3.3**: Test fixtures

---

## Implementation Status

### ✅ Completed

1. **Database Models** - All 16 models fully defined with relationships
2. **Custom User Model** - Role-based (GENERAL_USER, COUNSELOR, THERAPIST)
3. **Docker Setup** - 10-service docker-compose with health checks
4. **ORM Relationships**:
   - Session ↔ (Counselor OR Therapist)
   - Booking ↔ Therapist
   - EscalationEvent: Counselor → Therapist
5. **Earnings & Payout** - Complete financial tracking models
6. **Crisis & Helpline** - Pre-built crisis resources
7. **Notifications** - FCM device token management
8. **Search Index Ready** - Typesense configured

### ⚠️ Partial/Not Started

1. **Serializers** - No DRF serializers yet (auth, models)
2. **Views & ViewSets** - Core endpoints missing
3. **Authentication Endpoints** - Login, registration, JWT refresh
4. **Session APIs** - Messaging, matching, escalation workflows
5. **WebSocket/Channels** - Real-time chat infrastructure not implemented
6. **Celery Tasks** - No async tasks defined (notifications, email, payments)
7. **Search Integration** - Typesense configured but not integrated with APIs
8. **Payment Integration** - Razorpay configured but no checkout flow
9. **File Upload** - MinIO configured but no upload endpoints
10. **Test Suite** - No test files created

---

## File Organization

```
seeker/
├── config/                    # Django config
│   ├── settings.py           # Core settings
│   ├── urls.py               # API routes (minimal)
│   ├── asgi.py               # Daphne entry point
│   ├── wsgi.py               # WSGI entry point
│   └── celery.py             # Celery config
│
├── accounts/                 # Authentication & user roles
│   ├── models.py             # User, Counselor, Therapist, EmergencyContact, OTPToken
│   ├── views.py              # Health check only
│   ├── urls.py               # Health endpoint
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── core/                     # Sessions & messaging
│   ├── models.py             # Session, ChatMessage, SessionNote, Escalation, Earnings, Payout
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── profiles/                 # Availability & booking
│   ├── models.py             # Specialization, TherapyModality, AvailabilitySlot, BlockedDate, Booking, IntakeResponse
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── notifications/            # Push notifications
│   ├── models.py             # UserDevice
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── feedback/                 # Session feedback
│   ├── models.py             # SessionFeedback
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── helpline/                 # Crisis resources
│   ├── models.py             # HelplineCategory, HelplineEntry
│   ├── admin.py              # (empty)
│   └── migrations/
│
├── manage.py                 # Django CLI
├── Dockerfile                # Python 3.11 + pip deps
├── docker-compose.yml        # 10-service orchestration
├── requirements.txt          # Python dependencies
├── .env.local.example        # Env template
├── .dockerignore              # Docker build excludes
│
├── staticfiles/              # (generated)
├── celerybeat-schedule       # (generated)
└── Info.md & PHASE1_ROADMAP.md # (documentation)
```

---

## Key Design Decisions

### 1. **Polymorphic Providers**

Sessions don't use a generic "provider" model. Instead, they have NULL-able ForeignKeys to both counselor and therapist. One must be set. Validation happens at the serializer/view level.

**Rationale**: Simpler queries (no content_type), preserves role-specific data access.

### 2. **Credentials as MinIO Paths**

Counselor/Therapist models store file paths as CharField (max 500), not Django FileFields.

**Rationale**: Supports external MinIO storage, avoids coupling to Django's file handling.

### 3. **OTP Tokens in DB**

OTP codes are stored in a dedicated table with expiry, not cached.

**Rationale**: Persistent across restarts, queryable history.

### 4. **Emergency Contacts Min Requirement**

Minimum 2 emergency contacts enforced at serializer level, not database constraint.

**Rationale**: Allows flexibility for APIs that don't require full enforcement.

### 5. **SessionNote is_private Always True**

Boolean field with default=True. Private notes are never exposed to users.

**Rationale**: Ensures therapist/counselor private documentation.

### 6. **Slug Generation Utility**

Helper function `_unique_slug()` auto-generates unique slugs for public profiles (Counselor/Therapist).

**Rationale**: Supports SEO-friendly URLs.

---

## Known Gaps & Next Steps

### High Priority

1. **Authentication Endpoints**
   - POST /api/accounts/register/ (email-based, OTP)
   - POST /api/accounts/login/
   - POST /api/accounts/verify-otp/
   - POST /api/accounts/refresh-token/
   - POST /api/accounts/logout/

2. **Session Matching**
   - Algorithm to match users with available counselors/therapists
   - Real-time availability check against AvailabilitySlot + BlockedDate
   - Queue management (WAITING → MATCHED)

3. **Real-time Chat**
   - WebSocket consumers using Channels
   - Message broadcast to session participants
   - Delivery & read receipts

4. **Payment Integration**
   - Razorpay checkout endpoint
   - Webhook for payment status
   - Session status update (PAYMENT_PENDING → PAID)

### Medium Priority

5. **File Upload Endpoints**
   - Credential verification uploads (credentials to MinIO)
   - Profile photo upload

6. **Celery Tasks**
   - Email notifications (OTP, session reminders)
   - Push notifications via Firebase
   - Payment reminders
   - Scheduled availability checks

7. **Search Integration**
   - Index therapists in Typesense
   - Search/filter API

### Lower Priority

8. **Admin Interface**
   - Register Django admin for all models
   - Custom admin actions (verify counselor, escalate session)

9. **Test Suite**
   - Unit tests for models
   - Integration tests for APIs
   - E2E tests for key workflows

10. **Frontend (Next.js)**
    - Public therapist directory
    - User dashboard
    - Session interface
    - Payment flow

---

## Environment Variables Required

Create `.env.local` with:

```
SECRET_KEY=your-secret-key
DEBUG=True
POSTGRES_DB=seekerdb
POSTGRES_USER=seeker
POSTGRES_PASSWORD=seekerpass
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

REDIS_URL=redis://redis:6379/0

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=http://minio:9000

RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret

FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email

BREVO_API_KEY=your-key

TYPESENSE_API_KEY=local-typesense-key
```

---

## Testing & Verification

### Current State

- No tests written yet
- Manual health check: `curl http://localhost:8000/api/accounts/health/`

### Next Steps

1. Migrate database: `docker-compose exec django python manage.py migrate`
2. Create superuser: `docker-compose exec django python manage.py createsuperuser`
3. Access Django admin: `http://localhost:8000/admin/`

---

## Notes for AI Assistants

- All models are already migrated (0001_initial.py exists)
- No serializers exist yet → all API features are blocked
- The codebase is **model-complete but endpoint-incomplete**
- Channels is installed but no consumers defined
- Celery is ready to receive task definitions
- This is an excellent state to start building views/serializers
- Production readiness: Set DEBUG=False, tighten ALLOWED_HOSTS, rotate SECRET_KEY
