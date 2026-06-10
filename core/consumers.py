import json
import asyncio
import logging
from datetime import timedelta
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
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
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def timer_loop(self):
        try:
            while True:
                # Calculate time remaining
                time_remaining, is_paid = await self.get_timer_status()
                
                if time_remaining <= 0 and not is_paid:
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
            
            # Check payment status
            is_payment_pending = await self.check_payment_pending()
            
            if is_payment_pending:
                # Hold message
                await self.save_message(message, is_held=True)
                await self.send(text_data=json.dumps({
                    'type': 'payment.required',
                    'message': 'Message held. Please complete payment to deliver your message.'
                }))
                return

            # Scan for crisis
            is_crisis = await self.scan_for_crisis(message)
            if is_crisis:
                await self.send(text_data=json.dumps({
                    'type': 'system.alert',
                    'message': 'A counselor has been alerted to provide immediate assistance.'
                }))

            # Save and broadcast
            await self.save_message(message, is_held=False)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'message': message,
                    'sender': 'Other' 
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender = event.get('sender', 'System')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'message': message,
            'sender': sender
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
            timer, created = SessionTimer.objects.get_or_create(
                session=session,
                defaults={'end_time': timezone.now() + timedelta(minutes=15)}
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
            if session.status != Session.PAYMENT_PENDING:
                session.status = Session.PAYMENT_PENDING
                session.save(update_fields=['status'])
        except Session.DoesNotExist:
            pass

    @database_sync_to_async
    def check_payment_pending(self):
        from core.models import Session
        try:
            session = Session.objects.get(id=self.session_id)
            return session.status == Session.PAYMENT_PENDING
        except Session.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content, is_held):
        from core.models import Session, ChatMessage
        try:
            session = Session.objects.get(id=self.session_id)
            ChatMessage.objects.create(
                session=session,
                message_text=content,
                is_held_for_payment=is_held
            )
        except Session.DoesNotExist:
            pass

    @database_sync_to_async
    def scan_for_crisis(self, content):
        from core.models import Session
        from core.services.crisis_detection import CrisisDetectionService
        try:
            session = Session.objects.get(id=self.session_id)
            return CrisisDetectionService.scan_message(session, content)
        except Session.DoesNotExist:
            return False

