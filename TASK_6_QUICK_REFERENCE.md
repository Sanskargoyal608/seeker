# Task 6 Quick Reference - JWT Authentication

## What's New?

### 5 New API Endpoints

```
POST /api/accounts/auth/login/      → access, refresh tokens + user profile
POST /api/accounts/auth/refresh/    → new access token
POST /api/accounts/auth/logout/     → logout current device
POST /api/accounts/auth/logout-all/ → logout all devices
GET  /api/accounts/auth/me/         → current user full profile
```

### 6 New Files Created

1. `accounts/permissions.py` - Role-based permissions (IsGeneralUser, IsGraduateCounselor, IsLicensedTherapist, IsVerified)
2. `accounts/serializers.py` - 9 serializers for auth flows
3. `accounts/token_service.py` - Device-based token management with Redis
4. `accounts/throttles.py` - Rate limiting (5/min login, 30/hr refresh)
5. `accounts/JWT_AUTH_IMPLEMENTATION.md` - Full documentation
6. `TASK_6_COMPLETION_SUMMARY.md` - This summary

### 3 Files Modified

1. `accounts/views.py` - Added 5 API endpoints
2. `accounts/urls.py` - Added 5 URL routes
3. `config/settings.py` - Added Redis cache, JWT config, rate limiting
4. `requirements.txt` - Added django-redis

---

## Key Features Implemented

✅ **Device-Based Tokens** - Each device gets unique token pair  
✅ **Redis Storage** - Fast token validation, no DB queries  
✅ **Rate Limiting** - Prevents brute-force attacks  
✅ **Email/Username Login** - Flexible credential acceptance  
✅ **Full User Profile** - Includes role-specific data (counselor/therapist)  
✅ **Global Logout** - Logout from all devices  
✅ **Role Permissions** - IsVerified, IsGeneralUser, etc.

---

## How Device-Based Tokens Work

1. **Login** → User-Agent hashed → Device tokens generated → Stored in Redis
2. **Access Token** → Valid for 1 hour
3. **Refresh Token** → Valid for 7 days (per device)
4. **Token Validation** → Check Redis for device match
5. **Logout** → Remove token from Redis
6. **Auto-Expiry** → Redis clears after 10 days

---

## Testing Quick Start

```bash
# Start services
docker-compose up -d

# Migrate database
docker-compose exec django python manage.py migrate

# Create test user (via Django admin or direct SQL)
docker-compose exec django python manage.py createsuperuser

# Test login
curl -X POST http://localhost:8000/api/accounts/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email_or_username":"admin","password":"password"}'

# Copy access token from response

# Test auth/me
curl -X GET http://localhost:8000/api/accounts/auth/me/ \
  -H "Authorization: Bearer <paste_access_token_here>"

# Should return full user profile
```

---

## Configuration Highlights

```python
# settings.py - JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# settings.py - Rate Limiting
'DEFAULT_THROTTLE_RATES': {
    'login': '5/min',
    'register': '10/hour',
    'refresh_token': '30/hour',
}

# settings.py - Redis Caching
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
    }
}
```

---

## Permission Classes Available

```python
from accounts.permissions import (
    IsGeneralUser,       # Only general users (patients)
    IsGraduateCounselor, # Only counselors
    IsLicensedTherapist, # Only therapists
    IsVerified,          # Only verified providers
)

# Usage in views
class TherapyView(APIView):
    permission_classes = [IsAuthenticated, IsLicensedTherapist, IsVerified]
```

---

## Error Responses

### 401 Unauthorized

```json
{ "detail": "Invalid or expired token for this device." }
```

### 429 Too Many Requests

```json
{ "detail": "Request was throttled. Expected available in 50 seconds." }
```

### 400 Bad Request

```json
{ "detail": "Invalid email/username or password" }
```

---

## What's NOT Implemented Yet (Task 7+)

- ❌ OTP Registration (Task 7)
- ❌ Email Service Integration (Task 7)
- ❌ 2FA on Login (Task 7)
- ❌ Password Reset (Future)
- ❌ Social OAuth (Out of scope)

---

## Redis Keys Format

```
auth_token:{user_id}:{device_hash}    → Token data + expiry
auth_token:blacklist:{user_id}        → User blacklist (logout all)
```

Example:

```
auth_token:1:a1b2c3d4e5f6g7h8 → {"access": "...", "refresh": "..."}
```

---

## Next: Task 7 - OTP Registration

After verifying Task 6:

1. Create `accounts/services/otp_service.py` - OTP generation
2. Create `accounts/services/email_service.py` - Email sending
3. Create registration endpoints (general-user, counselor, therapist)
4. Integrate Brevo/SendGrid
5. Add emergency contact validation

---

## Files Changed Summary

| File                      | Type     | Changes                        |
| ------------------------- | -------- | ------------------------------ |
| accounts/permissions.py   | Created  | 5 permission classes           |
| accounts/serializers.py   | Created  | 9 serializers                  |
| accounts/token_service.py | Created  | Device token management        |
| accounts/throttles.py     | Created  | Rate limiting                  |
| accounts/views.py         | Modified | Added 5 endpoints (+130 lines) |
| accounts/urls.py          | Modified | Added 5 routes                 |
| config/settings.py        | Modified | Cache + throttle config        |
| requirements.txt          | Modified | Added django-redis             |

---

## Commit Message

```
feat(auth): JWT authentication with device-based token management

- Add JWT login/refresh/logout endpoints
- Implement device-specific token storage in Redis
- Add rate limiting (5/min login, 30/hr refresh)
- Add role-based permission classes
- Add full user profile serializer with role-specific data
- Add throttle configuration for auth endpoints
- Add Redis caching configuration

Includes:
- Token rotation and automatic expiry
- Email or username login support
- Global logout across all devices
- Comprehensive JWT documentation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

**Status**: ✅ Task 6 Complete and Ready for Testing
