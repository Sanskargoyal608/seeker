# PHASE 1 COMPLETE ROADMAP: Foundation & Local Environment Setup

**Seeker — Mental Wellness Platform MVP**

**Duration:** 6–8 weeks  
**Solo Developer Timeline**  
**Updated:** 2025

---

## PHASE 1 OVERVIEW

Phase 1 is the foundation layer. Every line of code after this depends on getting this right.

**By the end of Phase 1, you will have:**

- ✅ Full local Docker environment (10 services) running with one command
- ✅ Complete database schema with 25+ models created and migrated
- ✅ **OTP-based user registration** (NO Google OAuth)
- ✅ JWT authentication working for all 3 user roles
- ✅ Role-based permission boundaries enforced at API level
- ✅ Graduate Counselor credential upload + Admin approval workflow
- ✅ React Native app running on physical device with working auth screens
- ✅ Swagger API documentation auto-generated
- ✅ Base test fixtures and testing framework in place

---

## CRITICAL CHANGES FROM ORIGINAL PLAN

1. **NO Google OAuth** → Using **OTP-based registration** (email service)
2. **NO CI/CD in Phase 1** → Manual testing only for MVP
3. **App renamed** → `sessions` → `core` (avoids Django built-in conflict)
4. **ALL 25+ models created in Phase 1** (even if not featured until Phase 2)
5. **Email service** → Brevo or SendGrid (user provides credentials)

---

## DEVELOPMENT TASKS: 14 TOTAL

### WEEK 1-2: ENVIRONMENT & INFRASTRUCTURE

#### TASK 1: Install & Configure Local Toolchain

**Time: 1-2 hours**

**Install these tools:**

```
✓ Docker Desktop (latest)
✓ Python 3.11+
✓ Node.js v18+
✓ Expo CLI: npm install -g expo-cli
✓ Postman (API testing)
✓ TablePlus (Database GUI)
✓ VS Code + extensions:
  - Python (Microsoft)
  - Django (official)
  - REST Client
  - Prettier
```

**Verify all work:**

```bash
docker --version
python --version
node --version
npm --version
expo --version
```

**Check ports are free:** 3000, 5432, 5555, 6379, 8000, 8025, 8108, 9000, 9001

---

#### TASK 2: Create GitHub Repo

**Time: 30 minutes**

**Steps:**

1. Create private repo: `seeker`
2. Clone locally: `git clone ...`
3. Create branches:
   - `main` (always deployable)
   - `develop` (integration branch)
4. Create `.gitignore`:

   ```
   .env.local
   .env
   *.pyc
   __pycache__/
   .DS_Store
   node_modules/
   .expo/
   .venv/
   ```

5. Create `.env.local` (NEVER commit):

   ```env
   DEBUG=True
   SECRET_KEY=your-local-secret-key-change-on-prod
   DATABASE_URL=postgres://seeker:seekerpass@postgres:5432/seekerdb
   REDIS_URL=redis://redis:6379/0

   # AI integration deferred until later; current setup works without an AI API key.
   # Future AI provider may be Gemini API, but not required in Phase 1.

   # File Storage (MinIO - local S3)
   MINIO_ENDPOINT=minio:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET=seeker-local

   # Payment (Razorpay test mode)
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=test_secret

   # Firebase
   FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

   # Search (Typesense)
   TYPESENSE_HOST=typesense
   TYPESENSE_PORT=8108
   TYPESENSE_API_KEY=local-typesense-key

   # EMAIL SERVICE - USER PROVIDES CREDENTIALS
   EMAIL_SERVICE=brevo  # or 'sendgrid'
   BREVO_API_KEY=placeholder_add_actual_key
   BREVO_SENDER_EMAIL=noreply@seeker-test.local
   # OR for SendGrid:
   # SENDGRID_API_KEY=placeholder_add_actual_key
   # SENDGRID_FROM_EMAIL=noreply@seeker-test.local

   # OTP Configuration
   OTP_LENGTH=6
   OTP_VALIDITY_MINUTES=10

   # JWT
   JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
   JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
   ```

**Verify:** `.env.local` in `.gitignore` ✓

---

#### TASK 3: Write docker-compose.yml

**Time: 2-3 hours**

**All 10 Services:**

1. **django** — Backend API (port 8000)
2. **postgres** — Database (port 5432)
3. **redis** — Cache & WebSocket (port 6379)
4. **celery** — Async tasks (no port)
5. **celery-beat** — Scheduled tasks (no port)
6. **flower** — Celery monitor (port 5555)
7. **minio** — Local S3 (port 9000, console 9001)
8. **mailhog** — Email catcher (port 8025) - Used for OTP emails too
9. **typesense** — Search engine (port 8108)
10. **nextjs** — Public profiles (port 3000)

**Each service must have:**

- Health checks
- Environment variables from `.env.local`
- Persistent volumes (postgres, redis, minio)
- `restart: unless-stopped`
- Network connectivity to other services

**Verify it works:**

```bash
docker-compose up --build  # Should start all 10 services
docker-compose exec django python manage.py --help  # Django accessible
docker-compose exec postgres psql -U seeker -d seekerdb  # DB accessible
redis-cli -h localhost ping  # Redis responding
curl localhost:8000/  # Django running
```

---

### WEEK 2-3: DJANGO BACKEND SETUP

#### TASK 4: Django Project Scaffold with Modular Apps

**Time: 1.5-2 hours**

**Create Django project:**

```bash
django-admin startproject config .
```

**Create 6 modular apps:**

```bash
python manage.py startapp accounts      # Users, auth, OTP
python manage.py startapp core          # Chat, sessions (NOT 'sessions' app!)
python manage.py startapp profiles      # Therapist/counselor profiles
python manage.py startapp notifications # FCM, push notifications
python manage.py startapp feedback      # Session feedback
python manage.py startapp helpline      # Crisis helpline directory
```

**Install dependencies in `requirements.txt`:**

```
Django==5.0+
djangorestframework==3.14+
djangorestframework-simplejwt==5.3+
django-cors-headers
django-filter==24.1+
psycopg2-binary==2.9+
redis==5.0+
celery==5.3+
django-celery-beat==2.5+
channels==4.0+
channels-redis==4.1+
drf-spectacular==0.27+
factory-boy==3.3+
pytest==7.4+
pytest-django==4.7+
minio==7.2+
python-jose==3.3+
# AI dependencies deferred until later; implement Gemini API if/when needed.
typesense==1.6+
razorpay==1.3+
firebase-admin==6.4+
python-decouple==3.8+
brevo-python==2.3+
```

**Update `settings.py`:**

```python
INSTALLED_APPS = [
    'daphne',  # Channels
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'channels',
    'accounts',
    'core',            # IMPORTANT: NOT 'sessions'
    'profiles',
    'notifications',
    'feedback',
    'helpline',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'seekerdb',
        'USER': 'seeker',
        'PASSWORD': 'seekerpass',
        'HOST': 'postgres',
        'PORT': 5432,
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [('redis', 6379)]},
    },
}

ASGI_APPLICATION = 'config.asgi.application'
```

**Verify:**

```bash
python manage.py check  # Should pass with zero errors
```

---

#### TASK 5: PostgreSQL Schema Migrations - Create ALL 25+ Models

**Time: 3-4 hours**

**Models in `accounts/models.py`:**

```python
User (abstract base)
  - username, email, password
  - role: GENERAL_USER, COUNSELOR, THERAPIST
  - first_name, last_name, phone
  - created_at, is_active

GraduateCounselor (extends User)
  - degree_file (MinIO path)
  - graduation_year, university, specialization, years_experience
  - is_verified, verification_date
  - per_minute_rate, bio, profile_photo
  - slug (unique, auto-generated from name, used for public profiles)

LicensedTherapist (extends User)
  - license_number, license_file
  - modalities (JSONField: CBT, DBT, EMDR, etc.)
  - languages (JSONField: English, Hindi, etc.)
  - is_verified, verification_date
  - per_minute_rate, per_session_rate, bio, profile_photo
  - two_factor_enabled, two_factor_phone
  - slug (unique, auto-generated from name, used for public profiles)

EmergencyContact
  - user FK (OneToOne parent)
  - name, phone, relationship
  - ⚠️ CONSTRAINT: Minimum 2 per user (enforced at serializer)

OTPToken
  - email, otp_code (6 digits)
  - created_at, expires_at
  - is_verified (boolean)
  - ⚠️ Stores temporary OTP codes for registration
```

**Models in `core/models.py`:**

```python
Session
  - user FK, counselor/therapist FK (polymorphic)
  - status: WAITING, MATCHED, ACTIVE, PAYMENT_PENDING, PAID, ENDED
  - start_time, end_time, duration_minutes
  - is_crisis_flagged
  - created_at, updated_at

ChatMessage
  - session FK, sender FK (user or counselor/therapist)
  - message_text, is_highlighted
  - delivered_at, read_at, created_at

SessionNote
  - session FK, counselor/therapist FK
  - note_text, linked_message FK (optional)
  - is_private = True (⚠️ enforced at queryset level)
  - created_at, updated_at

EscalationEvent
  - session FK, from_counselor FK, to_therapist FK
  - reason, urgency (LOW, MEDIUM, HIGH, CRITICAL)
  - status: PENDING, ACCEPTED, COMPLETED
  - created_at

EarningsRecord
  - session FK, counselor/therapist FK
  - duration_minutes, rate_per_minute
  - gross_amount, platform_fee_percent, net_amount
  - created_at

PayoutRecord
  - counselor/therapist FK
  - total_amount, status (PENDING, PROCESSING, PAID)
  - payout_date, created_at
```

**Models in `profiles/models.py`:**

```python
AvailabilitySlot
  - counselor/therapist FK
  - day_of_week (0-6)
  - start_time, end_time
  - is_active, created_at

BlockedDate
  - counselor/therapist FK
  - date, reason (optional), created_at

Booking
  - user FK, therapist FK
  - scheduled_datetime, duration_minutes
  - status: SCHEDULED, COMPLETED, CANCELLED
  - created_at, updated_at

IntakeResponse
  - booking FK (or user FK)
  - responses_json (JSONField)
  - submitted_at

Specialization
  - name (Anxiety, Depression, Grief, etc.)
  - description
  - Used for filtering

TherapyModality
  - name (CBT, DBT, EMDR, etc.)
  - description
  - Used for therapist profiles
```

**Models in `feedback/models.py`:**

```python
SessionFeedback
  - session FK, user FK
  - q1_before_session, q2_after_session (plain text)
  - q3_what_helped, q4_what_improve (plain text)
  - is_flagged (boolean)
  - submitted_at, created_at
```

**Models in `notifications/models.py`:**

```python
UserDevice
  - user FK
  - fcm_token (max 500 chars)
  - platform (IOS, ANDROID)
  - is_active, created_at, updated_at
```

**Models in `helpline/models.py`:**

```python
HelplineEntry
  - name, phone, region, category FK
  - is_24_7 (boolean), language, description
  - created_at

HelplineCategory
  - name (CRISIS, SUICIDE, DOMESTIC, LGBTQ, SUBSTANCE, etc.)
  - description, icon (optional)
```

**Create & run migrations:**

```bash
python manage.py makemigrations
python manage.py migrate
```

**Verify in TablePlus:**

- Connect to `postgres://seeker:seekerpass@postgres:5432/seekerdb`
- See ~25 tables created
- All foreign keys, constraints in place
- django_migrations table shows all migrations

---

#### TASK 6: JWT Authentication with Refresh Token Rotation

**Time: 2-3 hours**

**Configure in `settings.py`:**

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}
```

**Create `accounts/views.py` endpoints:**

- `POST /api/auth/login/` → email + password → JWT tokens
- `POST /api/auth/refresh/` → refresh token → new access token
- `POST /api/auth/logout/` → invalidate token
- `GET /api/auth/me/` → current user profile

**Create `accounts/permissions.py`:**

```python
class IsGeneralUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.GENERAL_USER

class IsGraduateCounselor(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.COUNSELOR

class IsLicensedTherapist(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.THERAPIST

class IsVerified(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_verified
```

**Test in Postman:**
✓ Login → get access token
✓ Call `/api/auth/me/` with token
✓ Call `/api/auth/refresh/` with refresh token
✓ Call `/api/auth/logout/` → token invalidated

---

#### TASK 7: OTP-Based Registration via Email Service

**Time: 2.5-3 hours**

**⚠️ CRITICAL: This replaces Google OAuth**

**Install email client:**

```bash
pip install brevo-python  # or sendgrid
```

**Create `accounts/services/otp_service.py`:**

```python
import secrets
from datetime import timedelta
from django.utils import timezone
from accounts.models import OTPToken

class OTPService:
    @staticmethod
    def generate_otp():
        """Generate 6-digit OTP"""
        return ''.join(secrets.choice('0123456789') for _ in range(6))

    @staticmethod
    def create_otp_for_email(email):
        """Create OTP, save to DB, return code"""
        otp_code = OTPService.generate_otp()
        validity = timezone.now() + timedelta(minutes=10)

        token = OTPToken.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=validity,
            is_verified=False
        )
        return otp_code, token

    @staticmethod
    def verify_otp(email, otp_code):
        """Verify OTP code"""
        try:
            token = OTPToken.objects.get(
                email=email,
                otp_code=otp_code,
                is_verified=False,
                expires_at__gt=timezone.now()
            )
            token.is_verified = True
            token.save()
            return True
        except OTPToken.DoesNotExist:
            return False
```

**Create `accounts/services/email_service.py`:**

```python
import brevo_python  # or sendgrid

class EmailService:
    @staticmethod
    def send_otp_email(email, otp_code):
        """Send OTP via Brevo/SendGrid"""
        # Implementation varies by service
        # Send HTML email with 6-digit code
        pass
```

**Create API endpoints:**

- `POST /api/auth/register/request-otp/`
  - Input: `{ email, role }`
  - Output: `{ message: "OTP sent to email" }`
  - Side effect: OTP created, email sent

- `POST /api/auth/register/verify-otp/`
  - Input: `{ email, otp_code }`
  - Output: `{ status: "verified" }`
  - Side effect: OTPToken.is_verified = True

- `POST /api/auth/register/[general-user|counselor|therapist]/`
  - Input: Full registration data + verified email
  - Output: `{ access, refresh, user }`
  - Side effect: User created with is_active=True

**Test flow in Postman:**

1. Request OTP → get "OTP sent"
2. Check Mailhog (localhost:8025) for email
3. Verify OTP → get "OTP verified"
4. Complete registration → get JWT tokens
5. Login with JWT

---

#### TASK 8: Role-Based Registration & Permission Boundaries

**Time: 1.5 hours**

**Create role-specific registration:**

- `POST /api/auth/register/general-user/`
  - Password, name, 2 emergency contacts
- `POST /api/auth/register/counselor/`
  - - Degree file, graduation year, university, specialization
  - ⚠️ is_verified=False until admin approves
- `POST /api/auth/register/therapist/`
  - - License number, license file, modalities, 2FA phone
  - ⚠️ is_verified=False until admin approves

**Enforce boundaries:**

```python
# Counselor-only endpoint example
class CounselorQueueView(APIView):
    permission_classes = [IsAuthenticated, IsGraduateCounselor, IsVerified]

    def get(self, request):
        # Only verified counselors can access
        ...
```

**Test:**

- User token on counselor endpoint → 403
- Unverified counselor on counselor endpoint → 403
- Verified counselor on counselor endpoint → 200

---

#### TASK 9: Emergency Contact Model & Validation

**Time: 1-1.5 hours**

**Model already created in Task 5: EmergencyContact**

**Enforce minimum 2 in serializer:**

```python
class EmergencyContactSerializer(Serializer):
    name = CharField()
    phone = CharField(validators=[phone_regex])
    relationship = CharField()

class RegisterSerializer(Serializer):
    email = EmailField()
    password = CharField()
    emergency_contacts = EmergencyContactSerializer(many=True, min_length=2)

    def validate_emergency_contacts(self, value):
        if len(value) < 2:
            raise ValidationError("Minimum 2 emergency contacts required")
        return value
```

**Test:**

- Register without contacts → 400
- Register with 1 contact → 400
- Register with 2+ contacts → 200, user created

---

### WEEK 3-4: FILE STORAGE & ADMIN

#### TASK 10: Graduate Counselor Credential Upload to MinIO

**Time: 2 hours**

**MinIO already in docker-compose.yml**

**Create bucket via MinIO console (localhost:9001):** `seeker-local`

**Create `accounts/services/file_upload.py`:**

```python
from minio import Minio
from uuid import uuid4
import os

class FileUploadService:
    def __init__(self):
        self.client = Minio(
            os.getenv('MINIO_ENDPOINT'),
            access_key=os.getenv('MINIO_ACCESS_KEY'),
            secret_key=os.getenv('MINIO_SECRET_KEY'),
            secure=False  # Local, no HTTPS
        )
        self.bucket = os.getenv('MINIO_BUCKET')

    def upload_file(self, file_obj, folder, filename):
        """Upload file to MinIO"""
        object_name = f"{folder}/{uuid4()}/{filename}"
        self.client.put_object(
            self.bucket,
            object_name,
            file_obj,
            length=file_obj.size
        )
        return f"minio://{self.bucket}/{object_name}"
```

**Add file fields to GraduateCounselor registration:**

```python
class CounselorRegistrationSerializer(Serializer):
    email = EmailField()
    password = CharField()
    degree_file = FileField()          # Degree proof
    graduation_certificate = FileField()  # Certificate proof
    # ... other fields

    def create(self, validated_data):
        files = {
            'degree_file': validated_data.pop('degree_file'),
            'graduation_certificate': validated_data.pop('graduation_certificate'),
        }

        service = FileUploadService()
        paths = {}
        for key, file in files.items():
            paths[key] = service.upload_file(file, 'counselor_credentials', file.name)

        counselor = GraduateCounselor.objects.create(
            **validated_data,
            **paths,
            is_verified=False
        )
        return counselor
```

**Test:**

- Upload 2 files → files in MinIO console
- Path stored in DB as `minio://seeker-local/counselor_credentials/[uuid]/[filename]`

---

#### TASK 11: Django Admin Credential Review & Approval Workflow

**Time: 2-2.5 hours**

**Create `accounts/admin.py`:**

```python
from django.contrib import admin
from accounts.models import GraduateCounselor, LicensedTherapist

class GraduateCounselorAdmin(admin.ModelAdmin):
    list_display = ('user', 'university', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('user__email', 'user__first_name')
    readonly_fields = ('created_at', 'degree_file_link')

    fieldsets = (
        ('User', {'fields': ('user', 'created_at')}),
        ('Credentials', {'fields': ('degree_file_link', 'graduation_certificate')}),
        ('Profile', {'fields': ('university', 'specialization', 'years_experience')}),
        ('Approval', {'fields': ('is_verified', 'verification_date')}),
    )

    def degree_file_link(self, obj):
        if obj.degree_file:
            return format_html(f'<a href="{obj.degree_file}" target="_blank">Download</a>')
        return "-"

    actions = ['approve_counselors', 'reject_counselors']

    def approve_counselors(self, request, queryset):
        for counselor in queryset:
            counselor.is_verified = True
            counselor.verification_date = timezone.now()
            counselor.save()
            # Send approval email
            send_approval_email(counselor.user.email)

admin.site.register(GraduateCounselor, GraduateCounselorAdmin)
```

**Admin workflow:**

1. Access `/admin/`
2. See pending counselors
3. Click → view credentials
4. Approve/Reject
5. Email sent to counselor

**Test:**

- Create test counselor with credentials
- Approve via admin
- Check Mailhog for approval email
- Unverified counselor cannot access counselor endpoints
- After approval, can access

---

### WEEK 4-5: REACT NATIVE & TESTING

#### TASK 12: React Native Scaffold with Expo & Auth Screens

**Time: 3-4 hours**

**Initialize:**

```bash
cd /path/to/seeker
npx create-expo-app mobile
cd mobile
npm install
```

**Install dependencies:**

```bash
npm install expo-router @react-navigation/bottom-tabs
npm install @react-navigation/native react-navigation
npm install redux @reduxjs/toolkit react-redux
npm install @tanstack/react-query
npm install axios socket.io-client
npm install expo-secure-store  # Store JWT tokens securely
```

**Directory structure:**

```
mobile/
├── app/
│   ├── (auth)/
│   │   ├── request-otp.js      # Enter email + role
│   │   ├── verify-otp.js       # Enter OTP code
│   │   ├── register.js         # Complete registration
│   │   ├── login.js            # Email + password
│   │   └── _layout.js
│   ├── (app)/
│   │   ├── dashboard.js        # Main app screen
│   │   └── _layout.js
│   └── _layout.js              # Root layout
├── store/
│   ├── authSlice.js            # Redux auth state
│   └── store.js
├── api/
│   ├── axios.js                # Configured axios
│   └── auth.js                 # Auth API calls
└── app.json
```

**Auth flow:**

1. Splash: Check SecureStore for JWT
2. If JWT exists → validate with `/api/auth/me/` → Dashboard
3. If no JWT → Request OTP screen

**Request OTP screen:**

```jsx
// Email input + role dropdown
// POST /api/auth/register/request-otp/
// Show "OTP sent to email"
```

**Verify OTP screen:**

```jsx
// Email + OTP code inputs
// POST /api/auth/register/verify-otp/
// Show "OTP verified"
```

**Register screen (role-specific):**

```jsx
// Password + name + emergency contacts (2 required)
// POST /api/auth/register/[role]/
// Store JWT in SecureStore
// Navigate to Dashboard
```

**Login screen:**

```jsx
// Email + password
// POST /api/auth/login/
// Store JWT in SecureStore
// Navigate to Dashboard
```

**Test on physical device:**

```bash
npm start  # or expo start
# Scan QR with Expo Go
# Test all auth screens
```

---

#### TASK 13: DRF Spectacular — Swagger Docs Auto-Generation

**Time: 1 hour**

**Already installed in Task 4:** `drf-spectacular==0.27+`

**Configure `settings.py`:**

```python
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Seeker API',
    'DESCRIPTION': 'Mental wellness platform API',
    'VERSION': '1.0.0',
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Local dev'},
    ],
}
```

**Add to `urls.py`:**

```python
from drf_spectacular.views import SpectacularSwaggerView, SpectacularAPIView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]
```

**Document endpoints:**

```python
class LoginView(APIView):
    """
    POST /api/auth/login/

    Login with email and password.
    Returns access and refresh tokens.
    """
    def post(self, request):
        ...
```

**Verify:**

- Visit `localhost:8000/api/docs/`
- See all endpoints
- "Try it out" button works

---

#### TASK 14: Base pytest Fixtures — Factories for All User Types

**Time: 2-2.5 hours**

**Already installed:** `factory-boy==3.3+`, `pytest-django==4.7+`

**Create `accounts/tests/factories.py`:**

```python
import factory
from accounts.models import (
    User, GraduateCounselor, LicensedTherapist,
    EmergencyContact, OTPToken
)

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n}@test.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = 'testpass123'
    role = User.GENERAL_USER
    is_active = True

class EmergencyContactFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmergencyContact

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('name')
    phone = '9876543210'
    relationship = 'Family'

class GraduateCounselorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = GraduateCounselor

    user = factory.SubFactory(UserFactory, role=User.COUNSELOR)
    university = 'XYZ University'
    graduation_year = 2023
    specialization = 'Anxiety'
    years_experience = 2
    is_verified = True
    per_minute_rate = 2.5

class LicensedTherapistFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LicensedTherapist

    user = factory.SubFactory(UserFactory, role=User.THERAPIST)
    license_number = 'LIC-12345'
    modalities = ['CBT', 'DBT']
    is_verified = True
    per_minute_rate = 5.0
    two_factor_enabled = True
```

**Create `accounts/tests/test_auth.py`:**

```python
import pytest
from accounts.tests.factories import (
    UserFactory, GraduateCounselorFactory,
    EmergencyContactFactory
)

@pytest.mark.django_db
class TestOTPRegistration:
    def test_request_otp_success(self):
        # POST /api/auth/register/request-otp/
        # Verify: OTPToken created, email sent
        pass

    def test_verify_otp_invalid(self):
        # Wrong OTP code
        # Verify: 400 error
        pass

    def test_verify_otp_expired(self):
        # OTP past expiry
        # Verify: 400 error
        pass

    def test_register_counselor_unverified(self):
        # Register → counselor created, is_verified=False
        pass

    def test_counselor_cannot_access_queue_unverified(self):
        # Unverified counselor on protected endpoint
        # Verify: 403
        pass

@pytest.mark.django_db
class TestLogin:
    def test_login_success(self):
        # Create user via factory
        # POST /api/auth/login/
        # Verify: access token returned
        pass

    def test_login_invalid_password(self):
        # Wrong password
        # Verify: 401
        pass

    def test_token_refresh(self):
        # POST /api/auth/refresh/
        # Verify: new access token issued
        pass

@pytest.mark.django_db
class TestPermissions:
    def test_general_user_cannot_access_counselor(self):
        # User token on counselor endpoint
        # Verify: 403
        pass

    def test_emergency_contacts_minimum_2(self):
        # Register with < 2 contacts
        # Verify: 400 error
        pass
```

**Run tests:**

```bash
pytest accounts/tests/test_auth.py -v
```

---

## PHASE 1 COMPLETE DELIVERABLES

**By end of Phase 1, verify:**

### ✅ Infrastructure

- [ ] `docker-compose up --build` starts all 10 services cleanly
- [ ] Django accessible: `localhost:8000`
- [ ] PostgreSQL in TablePlus with ~25 tables
- [ ] Redis: `redis-cli -h localhost ping`
- [ ] MinIO console: `localhost:9001`
- [ ] Mailhog: `localhost:8025`
- [ ] Flower: `localhost:5555`

### ✅ Authentication

- [ ] OTP request endpoint working
- [ ] OTP verification working
- [ ] All 3 roles can register
- [ ] Login working
- [ ] JWT refresh working
- [ ] Role boundaries enforced (403 errors work)

### ✅ Database

- [ ] All ~25 models migrated
- [ ] Emergency contact minimum 2 enforced
- [ ] Foreign keys and constraints in place
- [ ] OTPToken model working

### ✅ Admin

- [ ] Django Admin: `/localhost:8000/admin/`
- [ ] Counselor approval workflow E2E
- [ ] Approval emails in Mailhog
- [ ] Verified counselor can access counselor endpoints

### ✅ Mobile App

- [ ] React Native running on physical device
- [ ] All auth screens working
- [ ] Request OTP → Verify OTP → Register → Login
- [ ] Zero crashes
- [ ] Token stored securely in SecureStore

### ✅ API Documentation

- [ ] Swagger at `localhost:8000/api/docs/`
- [ ] All endpoints documented
- [ ] "Try it out" button functional

### ✅ Testing

- [ ] Base factories created
- [ ] At least 20 tests written
- [ ] All tests passing locally

---

## TESTING CHECKLIST

### OTP Tests

- [ ] Request OTP → email sent
- [ ] Verify OTP → success
- [ ] Invalid OTP → 400
- [ ] Expired OTP → 400
- [ ] Already verified OTP → cannot verify again

### Auth Tests

- [ ] Login with valid credentials → 200 + tokens
- [ ] Login with invalid password → 401
- [ ] Login with non-existent email → 401
- [ ] Token refresh → new access token
- [ ] Logout → token blacklisted
- [ ] Old token after logout → 401

### Permission Tests

- [ ] User token on counselor endpoint → 403
- [ ] Unverified counselor on counselor endpoint → 403
- [ ] Verified counselor on counselor endpoint → 200
- [ ] User token on user endpoint → 200

### Model Tests

- [ ] Register with < 2 emergency contacts → 400
- [ ] Register with 2+ emergency contacts → 200
- [ ] Counselor files → MinIO ✓
- [ ] Admin approve → email sent ✓

### Mobile Tests

- [ ] Complete auth flow on iOS device
- [ ] Complete auth flow on Android device
- [ ] Zero crashes

---

## TIMELINE

| Week | Focus                              | Milestone                 |
| ---- | ---------------------------------- | ------------------------- |
| 1    | Environment (Tasks 1-3)            | Docker running            |
| 2    | Django setup (Tasks 4-5)           | Models migrated           |
| 3    | Auth + OTP (Tasks 6-9)             | Registration working      |
| 4    | Admin + Files (Tasks 10-11)        | Credential workflow E2E   |
| 5    | Mobile + Tests (Tasks 12-14)       | App on device, tests pass |
| 6-8  | Buffer, refinement, security audit | Phase 1 complete          |

---

## PHASE 1 PHASE GATE ✅

**Do NOT proceed to Phase 2 unless ALL of these are true:**

- [ ] All 14 tasks completed
- [ ] All deliverables verified
- [ ] All auth tests passing
- [ ] All 3 roles can register → login → access role endpoints
- [ ] OTP flow works end-to-end
- [ ] Counselor credential upload → admin approval → activation
- [ ] React Native app on physical device with working auth
- [ ] **Owner approval:** You've tested everything end-to-end

**ONLY after FULL green checkmark: Proceed to Phase 2**

---

## CRITICAL REMINDERS

1. **Commit every day** — your git log is your accountability
2. **Security first** — NO plaintext secrets in code or repo
3. **Write tests as you build** — not after
4. **Docker stable before moving on** — invest time here
5. **OTP emails must arrive** — test with Mailhog thoroughly
6. **Physical device testing** — not just simulator/Expo Web
7. **No Google OAuth** — OTP-based registration only
8. **No CI/CD yet** — manual testing for MVP
9. **Phase gate is HARD** — don't skip with broken features

---

## Email Service Credentials NEEDED

**You must provide (via .env.local):**

- EMAIL_SERVICE: brevo or sendgrid
- API credentials for chosen service
- Sender email address

**Currently in .env.local as placeholders:**

```env
EMAIL_SERVICE=brevo
BREVO_API_KEY=placeholder_add_actual_key
BREVO_SENDER_EMAIL=noreply@seeker-test.local
```

---

**Phase 1 is the foundation. Build it solid, test thoroughly, then move forward.**

**Ready to start Phase 1?**
