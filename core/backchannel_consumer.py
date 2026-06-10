import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import User

logger = logging.getLogger(__name__)

class BackchannelConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'backchannel_{self.session_id}'

        # Ensure user is authenticated
        if not self.scope['user'].is_authenticated:
            await self.close(code=4001)
            return
            
        # Reject General Users immediately
        if self.scope['user'].role == User.GENERAL_USER:
            await self.close(code=4003)
            return
            
        # Check specific authorization
        is_authorized = await self.is_authorized_for_session()
        if not is_authorized:
            await self.close(code=4003)
            return

        # Join backchannel room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave backchannel room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')

        # Broadcast to backchannel
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'backchannel.message',
                'message': message,
                'sender_email': self.scope['user'].email,
                'sender_role': self.scope['user'].role
            }
        )

    # Receive message from room group
    async def backchannel_message(self, event):
        message = event['message']
        sender_email = event.get('sender_email', 'Unknown')
        sender_role = event.get('sender_role', 'Unknown')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'backchannel.message',
            'message': message,
            'sender_email': sender_email,
            'sender_role': sender_role
        }))

    @database_sync_to_async
    def is_authorized_for_session(self):
        from core.models import Session
        try:
            session = Session.objects.get(id=self.session_id)
            user = self.scope['user']
            
            if user.role == User.COUNSELOR:
                return session.counselor == user.counselor_profile
            elif user.role == User.THERAPIST:
                # Assuming therapist needs to be part of an escalation or session
                # For safety, let's say if the therapist has any escalations for this session OR is assigned to it
                from core.models import EscalationEvent
                if session.therapist == user.therapist_profile:
                    return True
                has_escalation = EscalationEvent.objects.filter(
                    session=session,
                    to_therapist=user.therapist_profile
                ).exists()
                return has_escalation
                
            return False
        except Session.DoesNotExist:
            return False
