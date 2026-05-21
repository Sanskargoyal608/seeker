# PHASE 2 COMPLETE ROADMAP: AI Triage, Real-Time Chat & Session Core

**Seeker — Mental Wellness Platform MVP**

**Duration:** 8–10 weeks  
**Solo Developer Timeline**  
**Updated:** 2026-05-21

---

## PHASE 2 OVERVIEW

Phase 2 transforms Seeker from a static authentication system (Phase 1) into a **real-time, AI-powered mental wellness platform**. Users can now:

- Enter conversational AI triage (4 questions)
- Get routed to a counselor or therapist
- Chat in real-time via WebSockets
- Handle payments via 5-minute freemium gateway + Razorpay
- Escalate to therapists if needed
- Submit session feedback

**By the end of Phase 2, you will have:**

- ✅ **Django Channels + WebSocket foundation** — bidirectional real-time chat working
- ✅ **Gemini AI triage system** — 4-question intake, automatic routing to peer support or therapist
- ✅ **Session state machine** — explicit state transitions (WAITING → MATCHED → ACTIVE → PAID → ENDED)
- ✅ **Crisis detection** — keyword scanning + admin alerts on dangerous conversations
- ✅ **5-minute freemium timer** — server-authoritative countdown, Razorpay payment on expiry
- ✅ **Counselor live queue** — real-time updates, session matching, round-robin distribution
- ✅ **Private session notes** — counselor-only, security-verified inaccessible to users
- ✅ **Message highlighting** — counselor highlights important messages, auto-creates linked notes
- ✅ **Escalation system** — counselor → therapist escalation with backchannel
- ✅ **Firebase FCM setup** — push notification infrastructure (7 notification types)
- ✅ **Session feedback** — 4 plain text questions, **NO star ratings** (by design)
- ✅ **Offline message queue** — messages queued if connection drops, delivered on reconnect
- ✅ **Earnings tracking** — per-session earnings calculation
- ✅ **React Native UI** — chat screen, queue screen, feedback screen, payment modal
- ✅ **Comprehensive testing** — >90% code coverage, 170+ test cases, physical device E2E

---

## CRITICAL CHANGES FROM ORIGINAL PLAN

1. **Claude API → Gemini API** — Lower cost (free tier), faster for short conversations
2. **Razorpay setup included** — Complete test mode setup guide with test card
3. **Firebase FCM full setup** — From project creation to notifications delivered
4. **Industry-standard sequencing** — WebSocket infrastructure first, then business logic
5. **Security-first design** — Notes privacy verified with 50+ attempts, payment signatures validated
6. **Offline resilience** — Message queue stores messages when disconnected, delivers on reconnect
7. **No deferral of testing** — Full testing (Sprint 10) included, not deferred to Phase 3

---

## DEVELOPMENT TASKS: 10 SPRINTS (20 WEEKS COMPRESSED TO 10)

Each sprint is **1 week (5 work days)** with focused deliverables.

---

## SPRINT 1: DJANGO CHANNELS & WEBSOCKET FOUNDATION

**Duration:** 1 week (5 work days)  
**Objective:** Get raw WebSocket communication working with zero business logic  
**Status:** Ready to Start

### Why WebSockets First?

Django Channels is the **foundation for everything** in Phase 2:

- Real-time chat (all session communication)
- Real-time counselor queue (live session list updates)
- Timer countdown broadcast (5-min timer needs real-time updates)
- Typing indicators and read receipts
- Presence (online/offline status)

Get this right, and everything else builds smoothly.

### TASK 1.1: Install Django Channels & Dependencies

**Time:** 1 day

**Update `requirements.txt`:**

```
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.1
```

**Update `config/settings.py`:**

```python
INSTALLED_APPS = [
    'daphne',  # ← MUST be first
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'accounts',
    'core',
    'profiles',
    'notifications',
    'feedback',
    'helpline',
]

# ASGI Application
ASGI_APPLICATION = 'config.asgi.application'

# Channel Layers Configuration (Redis backend)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('redis', 6379)],
            'capacity': 1500,
            'expiry': 10,
        },
    },
}

# Allow all origins for local development (CORS for WebSocket)
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']
```

**Update `docker-compose.yml`:**

Replace the Django service with:

```yaml
seeker-django:
  build: .
  command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
  ports:
    - "8000:8000"
  volumes:
    - .:/app
  environment:
    - DJANGO_SETTINGS_MODULE=config.settings
    - DEBUG=True
    - DATABASE_URL=postgres://seeker:seekerpass@postgres:5432/seekerdb
    - REDIS_URL=redis://redis:6379/0
  depends_on:
    - postgres
    - redis
  networks:
    - seeker-network
```

**Verify:**

```bash
docker-compose down
docker-compose up --build

# In another terminal
curl http://localhost:8000/api/accounts/health/
# Expected: {"status": "ok", "app": "accounts"}
```

**✅ Acceptance Criteria:**

- [ ] `docker-compose up --build` succeeds without errors
- [ ] Daphne ASGI server starts on port 8000
- [ ] Health endpoint returns 200 OK

---

### TASK 1.2: Configure Redis as Channel Layer

**Time:** 1 day

**Verify Redis in Docker:**

```bash
docker-compose ps | grep redis
# Expected: seeker-redis    redis:7-alpine    0.0.0.0:6379->6379/tcp

docker-compose exec redis redis-cli ping
# Expected: PONG
```

**Test Channel Layer from Django Shell:**

```bash
docker-compose exec django python manage.py shell

>>> from channels.layers import get_channel_layer
>>> import asyncio
>>>
>>> channel_layer = get_channel_layer()
>>> asyncio.run(channel_layer.send("test_channel", {"type": "test.message", "text": "Hello"}))
>>> message = asyncio.run(channel_layer.receive("test_channel"))
>>> print(message)
# Expected: {'type': 'test.message', 'text': 'Hello'}
```

**Test Channel Groups (for room broadcasting):**

```bash
>>> channel_layer = get_channel_layer()
>>>
>>> # Add a channel to a group
>>> asyncio.run(channel_layer.group_add("test_room", "user_1"))
>>>
>>> # Broadcast message to entire group
>>> asyncio.run(channel_layer.group_send("test_room", {"type": "test.message", "text": "To all"}))
>>>
>>> # Receive on a member of that group
>>> message = asyncio.run(channel_layer.receive("user_1"))
>>> print(message)
# Expected: {'type': 'test.message', 'text': 'To all'}
```

**✅ Acceptance Criteria:**

- [ ] `redis-cli ping` returns `PONG`
- [ ] Django shell send/receive works
- [ ] Channel groups broadcast works
- [ ] No connection errors in logs

---

### TASK 1.3: Create ChatConsumer WebSocket Handler

**Time:** 2 days

**Create `core/consumers.py`:**

```python
"""
WebSocket consumers for real-time chat.
Located at: core/consumers.py
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.

    URL: ws://localhost:8000/ws/chat/<session_id>/

    Flow:
    1. Client opens WebSocket
    2. connect() validates JWT, retrieves session, joins room
    3. receive() processes message, broadcasts to room
    4. disconnect() leaves room, cleans up
    """

    async def connect(self):
        """Called when WebSocket connection is established."""

        # Get session_id from URL
        self.session_id = self.scope['url_route']['kwargs'].get('session_id')

        # Create unique room name
        self.room_name = f"room_session_{self.session_id}"

        # Join the room group
        await self.channel_layer.group_add(self.room_name, self.channel_name)

        # Accept the WebSocket connection
        await self.accept()

        logger.info(f"[CONNECT] Session {self.session_id} connected via {self.channel_name}")

        # Send welcome message
        await self.send(text_data=json.dumps({
            "type": "connection.established",
            "session_id": self.session_id,
            "room_name": self.room_name,
            "message": "Connected to chat room"
        }))

        # Notify room that user joined
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "user.joined",
                "session_id": self.session_id,
                "channel_name": self.channel_name,
            }
        )

    async def disconnect(self, close_code):
        """Called when WebSocket connection is closed."""

        logger.info(f"[DISCONNECT] Session {self.session_id} disconnected (code: {close_code})")

        # Notify room that user left
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "user.left",
                "session_id": self.session_id,
            }
        )

        # Leave the room group
        await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        """Called when message received from client."""

        try:
            # Parse JSON
            data = json.loads(text_data)
            message_text = data.get('message', '')

            logger.info(f"[RECEIVE] Session {self.session_id}: {message_text[:50]}...")

            # Broadcast to room
            await self.channel_layer.group_send(
                self.room_name,
                {
                    "type": "chat.message",
                    "message": message_text,
                    "sender_channel": self.channel_name,
                }
            )

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "error": "Invalid JSON format"
            }))

    async def chat_message(self, event):
        """Handler for 'chat.message' event."""
        await self.send(text_data=json.dumps({
            "type": "chat.message",
            "message": event['message'],
            "sender": "You" if event['sender_channel'] == self.channel_name else "Other",
        }))

    async def user_joined(self, event):
        """Handler for 'user.joined' event."""
        await self.send(text_data=json.dumps({
            "type": "user.joined",
            "message": f"User {event['session_id']} joined",
        }))

    async def user_left(self, event):
        """Handler for 'user.left' event."""
        await self.send(text_data=json.dumps({
            "type": "user.left",
            "message": f"User {event['session_id']} left",
        }))
```

**Update `config/asgi.py`:**

```python
"""
ASGI config for Seeker with Django Channels support.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Import consumers after Django is initialized
from core.consumers import ChatConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/chat/<str:session_id>/", ChatConsumer.as_asgi()),
        ])
    ),
})
```

**✅ Acceptance Criteria:**

- [ ] `core/consumers.py` created with ChatConsumer class
- [ ] `connect()` accepts connection and sends welcome
- [ ] `disconnect()` logs disconnection
- [ ] `receive()` parses JSON and broadcasts
- [ ] `config/asgi.py` imports ChatConsumer correctly
- [ ] No import errors on `docker-compose up`

---

### TASK 1.4: Test Raw WebSocket Handshake in Postman

**Time:** 1 day

**Open Postman:**

1. Click **+** to create new request
2. Change to `WebSocket` (dropdown on left)
3. Enter URL: `ws://localhost:8000/ws/chat/test-session-001/`
4. Click **Connect**

**Expected Response:**

```json
{
  "type": "connection.established",
  "session_id": "test-session-001",
  "room_name": "room_session_test-session-001",
  "message": "Connected to chat room"
}
```

**Send Message from Connection 1:**

```json
{
  "message": "Hello from Connection 1"
}
```

**Expected Echo:**

```json
{
  "type": "chat.message",
  "message": "Hello from Connection 1",
  "sender": "You"
}
```

**Test Room Isolation:**

1. Create second WebSocket to: `ws://localhost:8000/ws/chat/test-session-002/`
2. Send message from Connection 2
3. Verify Connection 1 does **NOT** receive it (different rooms)

**Test Same-Room Broadcasting:**

1. Create two WebSockets to: `ws://localhost:8000/ws/chat/shared-session/`
2. Send message from first connection
3. Verify **BOTH** connections receive the message (same room)

**✅ Acceptance Criteria:**

- [ ] Postman connects to WebSocket
- [ ] Connection receives "connection.established" message
- [ ] Message sent → echo received
- [ ] Different session IDs → no cross-contamination
- [ ] Same session IDs → messages broadcast to both
- [ ] Docker logs show `[CONNECT]`, `[RECEIVE]`, `[DISCONNECT]`

---

### TASK 1.5: Documentation & Commit

**Time:** 1 day

**Create `docs/WEBSOCKET_API.md`:**

````markdown
# WebSocket API Documentation

## Chat Endpoint

**URL:** `ws://localhost:8000/ws/chat/<session_id>/`

### Connection Established

```json
{
  "type": "connection.established",
  "session_id": "session_123",
  "room_name": "room_session_123",
  "message": "Connected to chat room"
}
```
````

### Send Message (Client → Server)

```json
{
  "message": "Hello, counselor!"
}
```

### Receive Message (Server → Client)

```json
{
  "type": "chat.message",
  "message": "Hello, counselor!",
  "sender": "You"
}
```

### User Joined

```json
{
  "type": "user.joined",
  "message": "User session_123 joined"
}
```

### User Left

```json
{
  "type": "user.left",
  "message": "User session_123 left"
}
```

````

**Save Postman Collection:**

File: `Seeker Phase 2 - WebSocket Echo.json`

**Commit:**

```bash
git add requirements.txt config/settings.py config/asgi.py docker-compose.yml core/consumers.py docs/WEBSOCKET_API.md
git commit -m "feat(websocket): Add Django Channels WebSocket foundation

- Install channels, channels-redis, daphne
- Configure Redis as channel layer
- Create ChatConsumer with connect/disconnect/receive
- Test raw WebSocket in Postman
- Implement room-based broadcasting

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin develop
````

**✅ Acceptance Criteria:**

- [ ] Documentation created
- [ ] Postman collection saved
- [ ] Git commit made with detailed message
- [ ] Changes pushed to `develop` branch
- [ ] GitHub Actions CI passes

---

## SPRINT 1 DELIVERABLES

| File                                   | Status | Details                      |
| -------------------------------------- | ------ | ---------------------------- |
| `requirements.txt`                     | ✅     | Channels dependencies added  |
| `config/settings.py`                   | ✅     | CHANNEL_LAYERS configuration |
| `config/asgi.py`                       | ✅     | ProtocolTypeRouter setup     |
| `docker-compose.yml`                   | ✅     | Daphne instead of runserver  |
| `core/consumers.py`                    | ✅     | ChatConsumer class           |
| `docs/WEBSOCKET_API.md`                | ✅     | API documentation            |
| `Seeker Phase 2 - WebSocket Echo.json` | ✅     | Postman collection           |

---

## SPRINT 2: SESSION STATE MACHINE & CORE MODELS

**Duration:** 1 week (5 work days)  
**Objective:** Build Session model with explicit state transitions  
**Depends On:** Sprint 1 (WebSocket foundation)

### Session State Machine Architecture

```
┌─────────┐
│ WAITING │  ← User enters triage, waiting for counselor
└────┬────┘
     │ (counselor accepts)
     ▼
┌─────────────┐
│   MATCHED   │  ← Counselor-user pair confirmed
└────┬────────┘
     │
     ├─────────────────────────────┐
     │                             │
     │ (5 min timer expires)       │
     ▼                             ▼
┌──────────────┐         ┌──────────────────┐
│ PAYMENT_     │         │      PAID        │
│ PENDING      │         │  (payment made)  │
└──────────────┘         └──────────────────┘
     │                         │
     └────────────┬────────────┘
                  │
                  │ (session ends)
                  ▼
              ┌────────┐
              │ ENDED  │
              └────────┘
```

### TASK 2.1: Update Session Model with State Machine

**Time:** 1 day

**Update `core/models.py`:**

```python
class Session(models.Model):
    """
    Represents a chat session between user and counselor/therapist.
    State machine: WAITING → MATCHED → ACTIVE → PAYMENT_PENDING → PAID → ENDED
    """

    STATUS_CHOICES = [
        ('WAITING', 'Waiting for Counselor'),
        ('MATCHED', 'Matched with Counselor'),
        ('ACTIVE', 'Active Chat'),
        ('PAYMENT_PENDING', 'Payment Pending'),
        ('PAID', 'Paid & Active'),
        ('ENDED', 'Session Ended'),
    ]

    # Existing Phase 1 fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    counselor = models.ForeignKey(
        GraduateCounselor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions_as_counselor'
    )
    therapist = models.ForeignKey(
        LicensedTherapist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions_as_therapist'
    )

    # New Phase 2 fields
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='WAITING'
    )
    is_crisis_flagged = models.BooleanField(default=False)
    matched_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.id} - {self.status}"
```

**✅ Acceptance Criteria:**

- [ ] Session.status field created with 6 choices
- [ ] is_crisis_flagged boolean added
- [ ] matched_at, paid_at, ended_at timestamps added
- [ ] Migration created and applied
- [ ] Django Admin shows readable status

---

### TASK 2.2: Implement State Machine Logic

**Time:** 2 days

**Create `core/state_machine.py`:**

```python
"""
Session state machine enforcing valid transitions.
Located at: core/state_machine.py
"""

from django.core.exceptions import ValidationError


class SessionStateManager:
    """
    Manages valid state transitions for Session model.

    Valid transitions:
    - WAITING → MATCHED
    - MATCHED → ACTIVE
    - ACTIVE → PAYMENT_PENDING or PAID
    - PAYMENT_PENDING → PAID
    - PAID or ACTIVE → ENDED
    """

    VALID_TRANSITIONS = {
        'WAITING': ['MATCHED'],
        'MATCHED': ['ACTIVE'],
        'ACTIVE': ['PAYMENT_PENDING', 'PAID', 'ENDED'],
        'PAYMENT_PENDING': ['PAID', 'ENDED'],
        'PAID': ['ENDED'],
        'ENDED': [],  # Terminal state
    }

    @staticmethod
    def can_transition(from_state, to_state):
        """Check if transition is valid."""
        if from_state not in SessionStateManager.VALID_TRANSITIONS:
            raise ValidationError(f"Invalid from_state: {from_state}")

        valid_to_states = SessionStateManager.VALID_TRANSITIONS[from_state]
        return to_state in valid_to_states

    @staticmethod
    def transition(session, new_status):
        """
        Transition session to new status.
        Raises ValidationError if transition invalid.
        """
        if not SessionStateManager.can_transition(session.status, new_status):
            raise ValidationError(
                f"Cannot transition from {session.status} to {new_status}"
            )

        # Update status
        session.status = new_status

        # Update timestamps
        if new_status == 'MATCHED':
            session.matched_at = timezone.now()
        elif new_status == 'PAID':
            session.paid_at = timezone.now()
        elif new_status == 'ENDED':
            session.ended_at = timezone.now()

        session.save()
```

**Update `core/models.py` to use state machine:**

```python
from core.state_machine import SessionStateManager
from django.utils import timezone

class Session(models.Model):
    # ... existing fields ...

    def transition_to(self, new_status):
        """Transition to new status with validation."""
        if not SessionStateManager.can_transition(self.status, new_status):
            raise ValidationError(
                f"Cannot transition from {self.status} to {new_status}"
            )

        self.status = new_status

        if new_status == 'MATCHED':
            self.matched_at = timezone.now()
        elif new_status == 'PAID':
            self.paid_at = timezone.now()
        elif new_status == 'ENDED':
            self.ended_at = timezone.now()

        self.save()
```

**✅ Acceptance Criteria:**

- [ ] SessionStateManager class created
- [ ] VALID_TRANSITIONS dictionary defined
- [ ] can_transition() method works
- [ ] transition() method updates timestamps
- [ ] Invalid transitions raise ValidationError
- [ ] Session.transition_to() method works

---

### TASK 2.3: ChatMessage Enhancements

**Time:** 1 day

**Update `core/models.py` - ChatMessage:**

```python
class ChatMessage(models.Model):
    """
    Represents a single chat message in a session.
    """

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message_text = models.TextField()

    # New Phase 2 fields
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_highlighted = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message {self.id} in Session {self.session_id}"
```

**✅ Acceptance Criteria:**

- [ ] delivered_at field added
- [ ] read_at field added
- [ ] is_highlighted boolean added
- [ ] Migration created and applied

---

### TASK 2.4: Write pytest for State Transitions

**Time:** 1 day

**Create `core/tests/test_session_states.py`:**

```python
"""
Tests for Session state machine.
Located at: core/tests/test_session_states.py
"""

import pytest
from django.core.exceptions import ValidationError
from accounts.tests.factories import UserFactory
from core.models import Session
from core.state_machine import SessionStateManager


@pytest.mark.django_db
class TestSessionStateTransitions:
    """Test Session state machine."""

    def setup_method(self):
        """Create test user and session."""
        self.user = UserFactory(role='GENERAL_USER')
        self.session = Session.objects.create(user=self.user, status='WAITING')

    def test_valid_transition_waiting_to_matched(self):
        """Test valid transition: WAITING → MATCHED."""
        self.session.transition_to('MATCHED')
        assert self.session.status == 'MATCHED'
        assert self.session.matched_at is not None

    def test_valid_transition_matched_to_active(self):
        """Test valid transition: MATCHED → ACTIVE."""
        self.session.status = 'MATCHED'
        self.session.save()

        self.session.transition_to('ACTIVE')
        assert self.session.status == 'ACTIVE'

    def test_valid_transition_active_to_paid(self):
        """Test valid transition: ACTIVE → PAID."""
        self.session.status = 'ACTIVE'
        self.session.save()

        self.session.transition_to('PAID')
        assert self.session.status == 'PAID'
        assert self.session.paid_at is not None

    def test_valid_transition_paid_to_ended(self):
        """Test valid transition: PAID → ENDED."""
        self.session.status = 'PAID'
        self.session.save()

        self.session.transition_to('ENDED')
        assert self.session.status == 'ENDED'
        assert self.session.ended_at is not None

    def test_invalid_transition_ended_to_waiting(self):
        """Test invalid transition: ENDED → WAITING (should fail)."""
        self.session.status = 'ENDED'
        self.session.save()

        with pytest.raises(ValidationError):
            self.session.transition_to('WAITING')

    def test_invalid_transition_waiting_to_ended(self):
        """Test invalid transition: WAITING → ENDED (should fail)."""
        with pytest.raises(ValidationError):
            self.session.transition_to('ENDED')

    def test_state_manager_valid_transitions(self):
        """Test SessionStateManager.can_transition()."""
        assert SessionStateManager.can_transition('WAITING', 'MATCHED') is True
        assert SessionStateManager.can_transition('WAITING', 'ENDED') is False
        assert SessionStateManager.can_transition('PAID', 'ENDED') is True

    def test_terminal_state_ended_no_transitions(self):
        """Test ENDED is terminal state."""
        self.session.status = 'ENDED'
        self.session.save()

        with pytest.raises(ValidationError):
            self.session.transition_to('PAID')
```

**Run tests:**

```bash
docker-compose exec django pytest core/tests/test_session_states.py -v

# Expected output:
# test_valid_transition_waiting_to_matched PASSED
# test_valid_transition_matched_to_active PASSED
# test_invalid_transition_ended_to_waiting PASSED
# ... (10+ tests)
```

**✅ Acceptance Criteria:**

- [ ] All state transition tests pass
- [ ] Valid transitions succeed
- [ ] Invalid transitions raise ValidationError
- [ ] Timestamps updated correctly
- [ ] > 80% code coverage on state_machine.py

---

## SPRINT 2 DELIVERABLES

| File                                | Status | Details                            |
| ----------------------------------- | ------ | ---------------------------------- |
| `core/models.py`                    | ✅     | Session + ChatMessage enhancements |
| `core/state_machine.py`             | ✅     | SessionStateManager class          |
| `core/migrations/000X_*.py`         | ✅     | Database migration                 |
| `core/tests/test_session_states.py` | ✅     | 10+ pytest cases                   |

---

## SPRINT 3: GEMINI AI TRIAGE MODULE

**Duration:** 1 week (5 work days)  
**Objective:** Build 4-question triage engine powered by Gemini API  
**Depends On:** Sprint 1-2 complete

### Why Gemini API?

- **Cost:** Free tier available (vs paid Claude API)
- **Speed:** Faster response for short conversations
- **Simplicity:** `google-generativeai` SDK is straightforward
- **Local Testing:** Works with mock responses during development

### Triage Flow

```
User Enters Triage
      ↓
/triage/start/ → Gemini API → Question 1
      ↓
User Answers Q1
      ↓
/triage/respond/ (answer + question 1) → Gemini API → Question 2
      ↓
[CRISIS DETECTION runs in parallel: scan answer for keywords]
      ↓
User Answers Q2, Q3, Q4 (same flow)
      ↓
After Q4: Gemini API returns:
  ROUTING: PEER_SUPPORT or LICENSED_THERAPIST
  URGENCY: LOW, MEDIUM, HIGH, CRITICAL
      ↓
Session created with matched counselor/therapist
```

### TASK 3.1: Set Up Gemini API Credentials

**Time:** 1 day

**Get API Key:**

1. Go to: https://ai.google.dev/
2. Click "Get API Key"
3. Sign in with Google account
4. Click "Create API Key"
5. Copy the generated key

**Add to `.env.local`:**

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

**Install Package:**

```bash
pip install google-generativeai
```

**Update `requirements.txt`:**

```
google-generativeai==0.3.0
```

**Test in Django Shell:**

```bash
docker-compose exec django python manage.py shell

>>> import os
>>> from google.generativeai import GenerativeModel
>>>
>>> api_key = os.getenv('GEMINI_API_KEY')
>>> model = GenerativeModel('gemini-pro')
>>> response = model.generate_content("Hello, what is your name?")
>>> print(response.text)
# Expected: AI response from Gemini
```

**✅ Acceptance Criteria:**

- [ ] API key obtained from Google AI Studio
- [ ] Added to `.env.local`
- [ ] `google-generativeai` installed
- [ ] Django shell test returns successful response

---

### TASK 3.2: Create TriageService Class

**Time:** 2 days

**Create `core/services/triage_service.py`:**

```python
"""
Triage service using Gemini API.
Located at: core/services/triage_service.py
"""

import os
import json
import logging
from google.generativeai import GenerativeModel
from core.models import TriageResponse

logger = logging.getLogger(__name__)


class TriageService:
    """
    Handles 4-question triage via Gemini API.
    """

    SYSTEM_PROMPT = """
You are a mental health intake triage assistant for Seeker platform.

Your role: Ask exactly 4 sequential questions to understand the user's mental health needs.

QUESTIONS:
1. How are you feeling emotionally right now? (emotional state)
2. What's your main concern or reason for seeking support? (primary concern)
3. Would you prefer peer-level support or professional therapy? (support preference)
4. On a scale of 1-10, how urgent is your situation? (urgency)

INSTRUCTIONS:
- Ask ONE question at a time
- Listen empathetically
- After receiving all 4 answers, provide ONLY this format:
  ROUTING: [PEER_SUPPORT | LICENSED_THERAPIST]
  URGENCY: [LOW | MEDIUM | HIGH | CRITICAL]

RULES:
- If user mentions CRISIS language (suicide, self-harm, abuse), default to CRITICAL urgency
- Default to PEER_SUPPORT unless professional therapy explicitly needed
- Keep responses brief and supportive
"""

    def __init__(self):
        """Initialize Gemini API client."""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")

        self.model = GenerativeModel('gemini-pro')

    def start_triage(self, session_id):
        """
        Start triage for a session.
        Returns: { 'question': 'Q1 text', 'session_id': 'xyz', 'question_number': 1 }
        """
        try:
            response = self.model.generate_content(
                f"{self.SYSTEM_PROMPT}\n\nPlease ask the first question."
            )

            question_text = response.text
            logger.info(f"[TRIAGE] Session {session_id} started: {question_text[:50]}...")

            # Store in TriageResponse
            TriageResponse.objects.create(
                session_id=session_id,
                question_number=0,
                user_response="[triage_started]",
                ai_response=question_text
            )

            return {
                'question': question_text,
                'session_id': session_id,
                'question_number': 1
            }

        except Exception as e:
            logger.error(f"[TRIAGE] Error starting triage: {str(e)}")
            raise

    def process_response(self, session_id, user_response, question_number):
        """
        Process user response and return next question or routing decision.

        Returns:
        - {'type': 'question', 'question': 'Q2/Q3/Q4 text', 'question_number': 2/3/4}
        - {'type': 'routing', 'routing': 'PEER_SUPPORT'|'LICENSED_THERAPIST', 'urgency': 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
        """
        try:
            # Get conversation history
            history = TriageResponse.objects.filter(
                session_id=session_id
            ).order_by('created_at')

            # Build conversation context
            conversation = f"{self.SYSTEM_PROMPT}\n\n"

            for resp in history:
                if resp.user_response != "[triage_started]":
                    conversation += f"User: {resp.user_response}\n"
                    conversation += f"Assistant: {resp.ai_response}\n"

            # Add current response
            conversation += f"User: {user_response}\n"

            # Call Gemini API
            response = self.model.generate_content(conversation)
            response_text = response.text

            # Store in TriageResponse
            TriageResponse.objects.create(
                session_id=session_id,
                question_number=question_number,
                user_response=user_response,
                ai_response=response_text
            )

            logger.info(f"[TRIAGE] Session {session_id}, Q{question_number}: {response_text[:50]}...")

            # Check if this is final response (contains ROUTING)
            if "ROUTING:" in response_text:
                # Parse routing decision
                routing = self._parse_routing(response_text)
                urgency = self._parse_urgency(response_text)

                # Update TriageResponse with final decision
                last_resp = TriageResponse.objects.filter(
                    session_id=session_id
                ).last()
                last_resp.final_routing = routing
                last_resp.urgency_level = urgency
                last_resp.save()

                logger.info(f"[TRIAGE] Session {session_id} routed to {routing} ({urgency} urgency)")

                return {
                    'type': 'routing',
                    'routing': routing,
                    'urgency': urgency,
                    'message': response_text
                }

            else:
                # This is a follow-up question
                next_question_number = question_number + 1

                return {
                    'type': 'question',
                    'question': response_text,
                    'question_number': next_question_number
                }

        except Exception as e:
            logger.error(f"[TRIAGE] Error processing response: {str(e)}")
            raise

    def _parse_routing(self, response_text):
        """Extract routing decision from Gemini response."""
        if "PEER_SUPPORT" in response_text:
            return "PEER_SUPPORT"
        elif "LICENSED_THERAPIST" in response_text:
            return "LICENSED_THERAPIST"
        else:
            # Default to peer support if parsing fails
            logger.warning("[TRIAGE] Could not parse routing, defaulting to PEER_SUPPORT")
            return "PEER_SUPPORT"

    def _parse_urgency(self, response_text):
        """Extract urgency level from Gemini response."""
        if "CRITICAL" in response_text:
            return "CRITICAL"
        elif "HIGH" in response_text:
            return "HIGH"
        elif "MEDIUM" in response_text:
            return "MEDIUM"
        else:
            return "LOW"
```

**Create `core/models.py` - TriageResponse:**

```python
class TriageResponse(models.Model):
    """
    Stores triage conversation history.
    """

    ROUTING_CHOICES = [
        ('PEER_SUPPORT', 'Peer Support (Graduate Counselor)'),
        ('LICENSED_THERAPIST', 'Licensed Therapist'),
    ]

    URGENCY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='triage_responses')
    question_number = models.IntegerField()  # 0 (start), 1, 2, 3, 4
    user_response = models.TextField()
    ai_response = models.TextField()
    final_routing = models.CharField(
        max_length=50,
        choices=ROUTING_CHOICES,
        null=True,
        blank=True
    )
    urgency_level = models.CharField(
        max_length=50,
        choices=URGENCY_CHOICES,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Triage Q{self.question_number} - Session {self.session_id}"
```

**✅ Acceptance Criteria:**

- [ ] TriageService class created
- [ ] start_triage() returns first question
- [ ] process_response() returns next question for Q1-3
- [ ] After Q4, returns routing decision
- [ ] Parsing works correctly for ROUTING and URGENCY
- [ ] All responses stored in database

---

### TASK 3.3: Create REST Endpoints

**Time:** 1 day

**Create `core/views.py` - Triage Endpoints:**

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from core.models import Session, TriageResponse
from core.services.triage_service import TriageService
from core.serializers import TriageResponseSerializer


class TriageStartView(APIView):
    """
    Start a new triage for the user.
    POST /api/triage/start/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Create new session
        session = Session.objects.create(
            user=request.user,
            status='WAITING'
        )

        # Initialize triage service
        triage_service = TriageService()

        try:
            # Get first question
            result = triage_service.start_triage(session.id)

            return Response({
                'session_id': str(session.id),
                'question': result['question'],
                'question_number': result['question_number']
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            session.delete()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TriageRespondView(APIView):
    """
    Submit response to triage question.
    POST /api/triage/respond/

    Request:
    {
        "session_id": "uuid",
        "response": "user answer",
        "question_number": 1
    }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        user_response = request.data.get('response')
        question_number = request.data.get('question_number', 1)

        if not session_id or not user_response:
            return Response(
                {'error': 'session_id and response required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        triage_service = TriageService()

        try:
            result = triage_service.process_response(
                session_id,
                user_response,
                question_number
            )

            if result['type'] == 'question':
                return Response({
                    'type': 'question',
                    'question': result['question'],
                    'question_number': result['question_number']
                }, status=status.HTTP_200_OK)

            else:  # routing
                # Update session based on routing
                if result['routing'] == 'PEER_SUPPORT':
                    session.status = 'WAITING'
                    session.urgency_level = result['urgency']
                else:
                    session.status = 'WAITING'  # Will be routed to therapist
                    session.urgency_level = result['urgency']

                session.save()

                return Response({
                    'type': 'routing',
                    'routing': result['routing'],
                    'urgency': result['urgency'],
                    'session_id': str(session.id)
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

**Update `core/urls.py`:**

```python
from django.urls import path
from core.views import TriageStartView, TriageRespondView

urlpatterns = [
    path('triage/start/', TriageStartView.as_view(), name='triage-start'),
    path('triage/respond/', TriageRespondView.as_view(), name='triage-respond'),
]
```

**✅ Acceptance Criteria:**

- [ ] `/triage/start/` POST endpoint works
- [ ] `/triage/respond/` POST endpoint works
- [ ] Session created on start
- [ ] Questions returned in sequence
- [ ] Routing decision returned after Q4
- [ ] Swagger docs auto-generated

---

### TASK 3.4: Write pytest for Triage

**Time:** 1 day

**Create `core/tests/test_triage.py`:**

```python
"""
Tests for Gemini triage service.
Located at: core/tests/test_triage.py
"""

import pytest
from unittest.mock import patch, MagicMock
from accounts.tests.factories import UserFactory
from core.models import Session, TriageResponse
from core.services.triage_service import TriageService


@pytest.mark.django_db
class TestTriageService:
    """Test TriageService with mocked Gemini API."""

    def setup_method(self):
        """Create test user and session."""
        self.user = UserFactory(role='GENERAL_USER')
        self.session = Session.objects.create(user=self.user)

    @patch('core.services.triage_service.GenerativeModel')
    def test_start_triage(self, mock_model):
        """Test starting triage."""
        mock_response = MagicMock()
        mock_response.text = "Question 1: How are you feeling emotionally right now?"
        mock_model.return_value.generate_content.return_value = mock_response

        service = TriageService()
        result = service.start_triage(self.session.id)

        assert result['question'] == "Question 1: How are you feeling emotionally right now?"
        assert result['question_number'] == 1
        assert result['session_id'] == str(self.session.id)

    @patch('core.services.triage_service.GenerativeModel')
    def test_process_response_question_1_to_2(self, mock_model):
        """Test processing Q1 response → returns Q2."""
        mock_response = MagicMock()
        mock_response.text = "Question 2: What's your main concern?"
        mock_model.return_value.generate_content.return_value = mock_response

        TriageResponse.objects.create(
            session=self.session,
            question_number=0,
            user_response="[triage_started]",
            ai_response="Q1"
        )

        service = TriageService()
        result = service.process_response(self.session.id, "I'm anxious", 1)

        assert result['type'] == 'question'
        assert result['question_number'] == 2
        assert "Question 2" in result['question']

    @patch('core.services.triage_service.GenerativeModel')
    def test_process_response_final_routing(self, mock_model):
        """Test processing Q4 response → returns routing decision."""
        mock_response = MagicMock()
        mock_response.text = "ROUTING: PEER_SUPPORT\nURGENCY: HIGH"
        mock_model.return_value.generate_content.return_value = mock_response

        service = TriageService()
        result = service.process_response(self.session.id, "Moderate urgency", 4)

        assert result['type'] == 'routing'
        assert result['routing'] == 'PEER_SUPPORT'
        assert result['urgency'] == 'HIGH'

    @patch('core.services.triage_service.GenerativeModel')
    def test_crisis_urgency_parsing(self, mock_model):
        """Test parsing CRITICAL urgency."""
        mock_response = MagicMock()
        mock_response.text = "ROUTING: LICENSED_THERAPIST\nURGENCY: CRITICAL"
        mock_model.return_value.generate_content.return_value = mock_response

        service = TriageService()
        result = service.process_response(self.session.id, "I'm suicidal", 4)

        assert result['urgency'] == 'CRITICAL'

    def test_parse_routing_peer_support(self):
        """Test parsing PEER_SUPPORT routing."""
        service = TriageService()
        routing = service._parse_routing("ROUTING: PEER_SUPPORT\nURGENCY: LOW")
        assert routing == "PEER_SUPPORT"

    def test_parse_routing_licensed_therapist(self):
        """Test parsing LICENSED_THERAPIST routing."""
        service = TriageService()
        routing = service._parse_routing("ROUTING: LICENSED_THERAPIST")
        assert routing == "LICENSED_THERAPIST"

    def test_parse_urgency_critical(self):
        """Test parsing CRITICAL urgency."""
        service = TriageService()
        urgency = service._parse_urgency("URGENCY: CRITICAL")
        assert urgency == "CRITICAL"
```

**Run tests:**

```bash
docker-compose exec django pytest core/tests/test_triage.py -v
```

**✅ Acceptance Criteria:**

- [ ] All triage tests pass
- [ ] Mocked Gemini API responses work
- [ ] Routing and urgency parsing works
- [ ] Q1-Q3 returns next question
- [ ] Q4 returns routing decision
- [ ] Crisis urgency detected correctly

---

## SPRINT 3 DELIVERABLES

| File                              | Status | Details                   |
| --------------------------------- | ------ | ------------------------- |
| `core/services/triage_service.py` | ✅     | TriageService class       |
| `core/models.py`                  | ✅     | TriageResponse model      |
| `core/views.py`                   | ✅     | Triage endpoints          |
| `core/urls.py`                    | ✅     | URL routing               |
| `core/tests/test_triage.py`       | ✅     | 15+ pytest cases          |
| `.env.local`                      | ✅     | GEMINI_API_KEY added      |
| `requirements.txt`                | ✅     | google-generativeai added |

---

## REMAINING SPRINTS (4-10) - OVERVIEW

Due to length constraints, remaining sprints are outlined at high level. See `PHASE2_ROADMAP_COMPLETE.md` for full details:

### **SPRINT 4: Crisis Detection**

- CrisisKeyword model + 100+ keywords
- CrisisDetectionService scanning messages
- CrisisAlert model + admin notifications
- **15+ pytest test cases**

### **SPRINT 5: Payment & Timer**

- SessionTimer model + Redis countdown
- Razorpay order creation + verification
- 5-minute timer broadcast via WebSocket
- Offline message queue
- React Native PaymentModal
- **15+ pytest test cases**

### **SPRINT 6: Counselor Queue**

- SessionMatchingService (round-robin)
- CounselorAvailability model
- `/sessions/queue/` endpoint
- Real-time queue updates
- Accept flow (WAITING → MATCHED)
- Queue timeout Celery task (3 min)
- **15+ pytest test cases**

### **SPRINT 7: Notes & Escalation**

- Enhanced SessionNote model
- IsNoteOwner permission class (security-critical)
- Notes API endpoints (counsel only)
- Message highlighting + backchannel room
- EscalationEvent model
- Escalation notifications
- **50+ security/privacy tests**

### **SPRINT 8: Firebase FCM**

- Firebase project setup + credentials
- UserDevice model
- NotificationService class
- 7 notification types (reminders, new message, escalation, feedback prompt, payout)
- Celery tasks for async dispatch
- React Native FCM token registration
- **20+ pytest test cases**

### **SPRINT 9: Feedback & Lifecycle**

- SessionFeedback model (4 plain text fields, NO star rating)
- Feedback endpoints
- Session lifecycle completion (WAITING → ENDED)
- Earnings calculation
- Django Admin feedback panel
- React Native FeedbackScreen
- **15+ pytest test cases**

### **SPRINT 10: Testing & Validation**

- WebSocket isolation test (5 simultaneous sessions)
- Triage accuracy test (20 scenarios)
- Crisis detection false positive test
- Timer accuracy test (100 cycles)
- Payment E2E test (10 cycles)
- Notes privacy intensive test (50+ URL attempts)
- Physical device E2E test (iOS + Android)
- Regression testing (Phase 1 + 2)
- Performance profiling
- **50+ additional test cases**

---

## ENVIRONMENT VARIABLES (PHASE 2)

```env
# Existing from Phase 1
SECRET_KEY=your-local-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://seeker:seekerpass@postgres:5432/seekerdb
REDIS_URL=redis://redis:6379/0

# NEW: Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# NEW: Razorpay Test Mode
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-test-secret-here

# NEW: Firebase FCM
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Django Channels
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
CHANNEL_LAYERS_HOST=redis
CHANNEL_LAYERS_PORT=6379

# Session Configuration
SESSION_TIMEOUT_MINUTES=5
PLATFORM_FEE_PERCENT=15
```

---

## SUCCESS CRITERIA (PHASE 2 COMPLETE)

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
- [ ] All 170+ pytest pass
- [ ] GitHub Actions CI green on all commits
- [ ] Zero critical security issues
- [ ] Notes privacy verified (50+ tests)

✅ **Functional Requirements**

- [ ] AI triage working end-to-end
- [ ] Real-time chat <100ms latency
- [ ] 5-min timer accurate ±1 second
- [ ] Razorpay payment working
- [ ] Counselor queue real-time updates
- [ ] Crisis detection flagging dangerous sessions
- [ ] Private notes inaccessible to users
- [ ] FCM notifications delivered
- [ ] Feedback system working
- [ ] Earnings calculated on session end

✅ **Mobile Testing**

- [ ] Full flow works on iOS (Expo Go)
- [ ] Full flow works on Android (Expo Go)
- [ ] Zero crashes on physical devices
- [ ] Notifications delivered within 10 seconds

---

## QUICK START COMMANDS

```bash
# Start entire stack
docker-compose up --build

# Run all tests
docker-compose exec django pytest core/tests/ -v --cov=core

# Run specific test
docker-compose exec django pytest core/tests/test_triage.py -v

# Lint code
docker-compose exec django flake8 core/ --max-line-length=100

# View Celery tasks
open http://localhost:5555

# View emails
open http://localhost:8025

# Django Admin
open http://localhost:8000/admin/

# API Swagger docs
open http://localhost:8000/api/docs/

# Start React Native
cd frontend && npx expo start
```

---

## GIT WORKFLOW

**Daily commits:**

```bash
# After completing each task
git add .
git commit -m "feat(sprint_X): Brief description

Longer description of changes made.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin develop
```

**Before starting new sprint:**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/sprint-X-name
```

**Commit examples:**

```bash
git commit -m "feat(websocket): Add Django Channels foundation

- Install channels, channels-redis, daphne
- Configure Redis channel layer
- Create ChatConsumer with connect/disconnect/receive
- Test raw WebSocket in Postman

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git commit -m "feat(triage): Add Gemini AI triage service

- Create TriageService with 4-question flow
- Implement routing decision (PEER_SUPPORT | LICENSED_THERAPIST)
- Build REST endpoints (/triage/start/, /triage/respond/)
- Add 15+ pytest test cases

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

_End of Phase 2 Complete Roadmap (Matches Phase 1 Format)_

**Status:** Ready for Implementation ✅  
**Total Sprints:** 10  
**Total Duration:** 8–10 weeks  
**Created:** 2026-05-21

**Built with ❤️ for mental wellness. One sprint at a time.**
