import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env.local')

import sys
from django.core.exceptions import ImproperlyConfigured

TESTING = 'pytest' in sys.modules or 'test' in sys.argv


def _env_list(name):
    return [item.strip() for item in os.getenv(name, '').split(',') if item.strip()]


# Safe by default: debug mode is opt-in, and a real secret key is mandatory
# outside debug mode. Debug mode leaks settings and tracebacks, so never leave it
# on while the server is reachable through a tunnel or from the internet.
DEBUG = os.getenv('DEBUG', 'False') == 'True'

SECRET_KEY = os.getenv('SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = 'unsafe-local-secret'
    else:
        raise ImproperlyConfigured('SECRET_KEY must be set when DEBUG is not True.')

# Comma-separated host names, e.g. ALLOWED_HOSTS=localhost,192.168.1.20,my-tunnel.trycloudflare.com
# Unset in debug mode means "any host", so a phone on the LAN just works; unset
# outside debug mode means localhost only.
ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS') or (
    ['*'] if DEBUG else ['localhost', '127.0.0.1', '[::1]', 'django', 'testserver']
)

# Number of reverse proxies (e.g. a Cloudflare tunnel = 1) in front of Django.
# Without this, DRF trusts a client-supplied X-Forwarded-For and per-IP throttles
# can be dodged. 0 means: use the connecting address.
NUM_PROXIES = int(os.getenv('NUM_PROXIES', 0))

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'corsheaders',
    'channels',
    'django_celery_beat',
    'accounts',
    'core',
    'profiles',
    'notifications',
    'feedback',
    'helpline',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

AUTH_USER_MODEL = 'accounts.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB', 'seekerdb'),
        'USER': os.getenv('POSTGRES_USER', 'seeker'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'seekerpass'),
        'HOST': os.getenv('POSTGRES_HOST', 'postgres'),
        'PORT': int(os.getenv('POSTGRES_PORT', 5432)),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if TESTING:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [(os.getenv('REDIS_HOST', 'redis'), int(os.getenv('REDIS_PORT', 6379)))]},
        },
    }

# Redis Caching Configuration (for device-based token management)
if TESTING:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'seeker',
            'TIMEOUT': 300,
        }
    }

REST_FRAMEWORK = {
    'NUM_PROXIES': NUM_PROXIES,
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.SessionAwareJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/day',
        'user': '5000/day',
        # Per client IP. Generous enough for several pilot testers behind one network.
        'login': '10/min',
        'register': '30/hour',
        'refresh_token': '30/hour',
        # Per target email address
        'otp_request': '5/hour',
        'otp_verify': '20/hour',
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Seeker API',
    'DESCRIPTION': 'Mental wellness platform API',
    'VERSION': '1.0.0',
    'SERVERS': [{'url': 'http://localhost:8000', 'description': 'Local dev'}],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 1440))), # 24 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 30))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

# Browsers only (the Expo web build); native apps are not subject to CORS.
# Set CORS_ALLOWED_ORIGINS=http://localhost:8081,https://my-tunnel.example.com to restrict.
# Unset in debug mode means any origin.
CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_ALL_ORIGINS = DEBUG and not CORS_ALLOWED_ORIGINS

# Email Configuration - Gmail SMTP (set credentials in .env.local)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@seeker.local')

# OTP Configuration
OTP_LENGTH = int(os.getenv('OTP_LENGTH', 6))
OTP_VALIDITY_MINUTES = int(os.getenv('OTP_VALIDITY_MINUTES', 10))

# Celery Configuration
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

CELERY_BEAT_SCHEDULE = {
    'send-session-reminders-every-15-mins': {
        'task': 'notifications.tasks.send_scheduled_session_reminders',
        'schedule': 900.0,
    },
    'check-queue-timeout-every-minute': {
        'task': 'core.tasks.queue_timeout_task',
        'schedule': 60.0,
    },
    'auto-withdraw-stale-sessions-every-5-mins': {
        'task': 'core.tasks.auto_withdraw_stale_sessions',
        'schedule': 300.0,
    },
}

# Firebase Cloud Messaging
import firebase_admin
from firebase_admin import credentials

firebase_credentials_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
if firebase_credentials_path and os.path.exists(os.path.join(BASE_DIR, firebase_credentials_path)):
    try:
        cred = credentials.Certificate(os.path.join(BASE_DIR, firebase_credentials_path))
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")
else:
    print("Warning: FIREBASE_CREDENTIALS_PATH is not set or file does not exist.")

# Typesense Configuration
TYPESENSE_HOST = os.getenv('TYPESENSE_HOST', 'typesense')
TYPESENSE_PORT = os.getenv('TYPESENSE_PORT', '8108')
TYPESENSE_API_KEY = os.getenv('TYPESENSE_API_KEY', 'local-typesense-key')
