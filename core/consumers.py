import json
import asyncio
import logging
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4003)
            return

        self.session_id = self.scope['url_route']['kwargs']['session_id']
        
        # Check specific authorization
        is_authorized = await self.check_authorization()
        if not is_authorized:
            await self.close(code=4003)
            return

        self.room_group_name = f'chat_{self.session_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Start the timer task
        self.timer_task = asyncio.create_task(self.timer_loop())

    async def disconnect(self, close_code):
        if hasattr(self, 'timer_task'):
            self.timer_task.cancel()
            
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def timer_loop(self):
        try:
            while True:
                # Calculate time remaining
                time_remaining, is_paid = await self.get_timer_status()
                
                if time_remaining <= 0 and not is_paid and await self.is_crisis_flagged():
                    # A person in crisis is never put behind the paywall.
                    pass
                elif time_remaining <= 0 and not is_paid:
                    # Timer expired, request payment
                    await self.set_payment_pending()
                    await self.send(text_data=json.dumps({
                        'type': 'payment.required',
                        'message': 'Your 15-minute free session has ended. Please complete payment to continue.'
                    }))
                else:
                    # Broadcast time remaining
                    await self.send(text_data=json.dumps({
                        'type': 'timer.update',
                        'time_remaining_seconds': time_remaining
                    }))
                    
                await asyncio.sleep(30)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Timer loop error: {e}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')

        if message_type == 'message':
            message = text_data_json.get('message', '')

            if await self.is_session_ended():
                await self.send(text_data=json.dumps({
                    'type': 'system.alert',
                    'message': 'This session has ended. Messages can no longer be sent.'
                }))
                return

            # Safety first: look for crisis language BEFORE anything else, so the
            # payment hold below can never swallow a cry for help.
            support = await self.scan_for_crisis(message)
            if support:
                await self.send(text_data=json.dumps({
                    'type': 'crisis.support',
                    'message': support['message'],
                    'helplines': support['helplines'],
                }))

            # Check payment status (never applies to a crisis-flagged session)
            is_payment_pending = await self.check_payment_pending()
            
            if is_payment_pending:
                # Hold message
                await self.save_message(message, is_held=True)
                await self.send(text_data=json.dumps({
                    'type': 'payment.required',
                    'message': 'Message held. Please complete payment to deliver your message.'
                }))
                return

            # Save and broadcast
            await self.save_message(message, is_held=False)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'message': message,
                    'sender_id': self.scope['user'].id,
                    'sender_role': self.scope['user'].role
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender_id = event.get('sender_id')
        sender_role = event.get('sender_role')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'message': message,
            'sender_id': sender_id,
            'sender_role': sender_role
        }))

    # Receive system alert from room group
    async def system_alert(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'system.alert',
            'message': message
        }))


    @database_sync_to_async
    def get_timer_status(self):
        from core.models import Session, SessionTimer
        try:
            session = Session.objects.get(id=self.session_id)
            free_seconds = settings.FREE_CHAT_MINUTES * 60
            if session.start_time is None:
                # Nobody has accepted yet: the free time has not started to run.
                return free_seconds, False
            timer, created = SessionTimer.objects.get_or_create(
                session=session,
                defaults={'end_time': session.start_time + timedelta(minutes=settings.FREE_CHAT_MINUTES)}
            )
            
            if timer.is_paid:
                return 0, True
                
            remaining = (timer.end_time - timezone.now()).total_seconds()
            return max(0, int(remaining)), False
        except Session.DoesNotExist:
            return 0, False

    @database_sync_to_async
    def set_payment_pending(self):
        from core.models import Session
        try:
            session = Session.objects.get(id=self.session_id)
            # Only a running chat can run out of free time. A waiting or ended
            # session must keep its state.
            if session.status in (Session.MATCHED, Session.ACTIVE):
                session.status = Session.PAYMENT_PENDING
                session.save(update_fields=['status'])
        except Session.DoesNotExist:
            pass

    @database_sync_to_async
    def check_payment_pending(self):
        from core.models import Session
        try:
            session = Session.objects.get(id=self.session_id)
            return session.status == Session.PAYMENT_PENDING and not session.is_crisis_flagged
        except Session.DoesNotExist:
            return False

    @database_sync_to_async
    def is_session_ended(self):
        from core.models import Session
        return Session.objects.filter(id=self.session_id, status=Session.ENDED).exists()

    @database_sync_to_async
    def is_crisis_flagged(self):
        from core.models import Session
        return Session.objects.filter(id=self.session_id, is_crisis_flagged=True).exists()

    @database_sync_to_async
    def save_message(self, content, is_held):
        from core.models import Session, ChatMessage
        from notifications.tasks import send_new_message_notification
        try:
            session = Session.objects.get(id=self.session_id)
            user = self.scope['user']
            ChatMessage.objects.create(
                session=session,
                sender=user,
                message_text=content,
                is_held_for_payment=is_held
            )
            
            # Determine recipient for push notification
            recipient = None
            sender_name = "Someone"
            if user == session.user:
                if session.therapist:
                    recipient = session.therapist.user
                elif session.counselor:
                    recipient = session.counselor.user
                sender_name = user.first_name
            else:
                recipient = session.user
                if session.therapist and user == session.therapist.user:
                    sender_name = user.first_name
                elif session.counselor and user == session.counselor.user:
                    sender_name = user.first_name
            
            if recipient:
                # Trigger Celery task
                message_preview = (content[:47] + '...') if len(content) > 50 else content
                send_new_message_notification.delay(
                    recipient.id,
                    sender_name,
                    message_preview,
                    session.id
                )
                
        except Session.DoesNotExist:
            pass


    @database_sync_to_async
    def scan_for_crisis(self, content):
        """
        Scan what the SEEKER writes (a counselor asking about suicide is not a
        crisis). Returns None, or {'message', 'helplines'} to show the seeker.
        """
        from core.models import Session
        from core.services.crisis_detection import CrisisDetectionService
        from core.services.crisis_support import support_payload
        try:
            session = Session.objects.select_related('user').get(id=self.session_id)
        except Session.DoesNotExist:
            return None
        if self.scope['user'].id != session.user_id:
            return None
        if not CrisisDetectionService.scan_message(session, content):
            return None
        return support_payload()


    @database_sync_to_async
    def check_authorization(self):
        from core.models import Session
        from accounts.models import User
        try:
            session = Session.objects.get(id=self.session_id)
            user = self.scope['user']
            
            if user.role == User.GENERAL_USER:
                return session.user_id == user.id
            elif user.role == User.COUNSELOR:
                counselor = getattr(user, 'counselor_profile', None)
                return counselor is not None and session.counselor_id == counselor.id
            elif user.role == User.THERAPIST:
                therapist = getattr(user, 'therapist_profile', None)
                return therapist is not None and session.therapist_id == therapist.id
            elif user.is_staff:
                return True
            
            return False
        except Session.DoesNotExist:
            return False

class EscalationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        from accounts.models import User
        user = self.scope.get('user')
        if not user or not user.is_authenticated or getattr(user, 'role', '') not in [User.THERAPIST, User.COUNSELOR]:
            await self.close(code=4003)
            return

        # Use the appropriate profile ID
        try:
            if user.role == User.COUNSELOR:
                profile = await self.get_counselor_profile(user)
                self.room_group_name = f'escalations_counselor_{profile.id}'
            else:
                profile = await self.get_therapist_profile(user)
                self.room_group_name = f'escalations_therapist_{profile.id}'
        except Exception as e:
            logger.error(f"Error getting provider profile: {e}")
            await self.close(code=4003)
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive escalation event from room group
    async def escalation_alert(self, event):
        escalation_id = event['escalation_id']
        urgency = event['urgency']
        reason = event['reason']
        triage_session_id = event['triage_session_id']

        await self.send(text_data=json.dumps({
            'type': 'escalation.alert',
            'escalation_id': escalation_id,
            'urgency': urgency,
            'reason': reason,
            'triage_session_id': triage_session_id
        }))

    @database_sync_to_async
    def get_counselor_profile(self, user):
        return user.counselor_profile
        
    @database_sync_to_async
    def get_therapist_profile(self, user):
        return user.therapist_profile

