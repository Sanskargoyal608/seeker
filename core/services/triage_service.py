import os
import json
import google.generativeai as genai
from django.conf import settings
from core.models import TriageSession, TriageMessage, Session, SessionNote

class TriageService:
    def __init__(self):
        # Configure the Gemini API
        api_key = getattr(settings, 'GEMINI_API_KEY', os.getenv('GEMINI_API_KEY'))
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash') # Recommended for fast text tasks
        else:
            self.model = None

    def get_system_prompt(self):
        return """You are a highly empathetic mental health intake triage assistant for the Seeker platform.

Your role: Have a natural, friendly chat with the user. Do NOT ask them a rigid list of questions all at once. 
Act like a human.
In the background, your goal is to extract exactly 4 pieces of information from the user:
1. emotional_state (e.g., "anxious", "depressed", "stressed")
2. primary_concern (e.g., "work stress", "relationship issues")
3. support_preference (e.g., "peer support", "professional therapy")
4. urgency (e.g., "low", "medium", "high", "critical")

IMPORTANT RULES:
- Ask ONE question or follow-up at a time.
- If the user mentions crisis keywords (suicide, self-harm, abuse), flag urgency as CRITICAL.
- If the user does not specify a support preference, you can gently ask if they want a peer to talk to or a licensed therapist.
- Once you feel you have gathered all 4 pieces of information (or enough to make a safe routing decision), set 'is_complete' to true.
- If 'is_complete' is true, provide a 'routing_decision' which MUST be either "PEER_SUPPORT" or "LICENSED_THERAPIST". Default to PEER_SUPPORT unless professional therapy is explicitly needed or requested.

YOU MUST OUTPUT STRICT VALID JSON MATCHING THIS EXACT SCHEMA:
{
  "message_to_user": "Your empathetic response here",
  "form_state": {
    "emotional_state": "extracted text or null",
    "primary_concern": "extracted text or null",
    "support_preference": "extracted text or null",
    "urgency": "extracted text or null"
  },
  "is_complete": false,
  "routing_decision": null
}

Do not include markdown blocks, just the JSON string."""

    def _call_gemini(self, history):
        if not self.model:
            # Fallback mock for testing when API key is missing
            user_msg_count = sum(1 for msg in history if msg.role == 'user')
            
            if user_msg_count <= 1:
                return json.dumps({
                    "message_to_user": "I'm here to help. Could you tell me a little bit about what's been bothering you lately?",
                    "form_state": {},
                    "is_complete": False,
                    "routing_decision": None
                })
            elif user_msg_count == 2:
                return json.dumps({
                    "message_to_user": "Thank you for sharing that. Do you feel like you need to talk to a licensed professional, or would a peer counselor be okay?",
                    "form_state": {"primary_concern": "User shared concern"},
                    "is_complete": False,
                    "routing_decision": None
                })
            else:
                return json.dumps({
                    "message_to_user": "I understand. I'm going to connect you with someone who can support you right now.",
                    "form_state": {
                        "primary_concern": "User shared concern",
                        "support_preference": "Peer or Professional",
                        "emotional_state": "Distressed",
                        "urgency": "Medium"
                    },
                    "is_complete": True,
                    "routing_decision": "PEER_SUPPORT"
                })

        prompt = self.get_system_prompt() + "\n\nConversation History:\n"
        for msg in history:
            prompt += f"{msg.role.upper()}: {msg.content}\n"
            
        prompt += "\nNow, provide the next JSON response based on the latest user input."

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse output safely
        try:
            return response.text
        except Exception:
            return "{}"

    def start_triage(self, user):
        """Starts a new triage session and returns the first AI message."""
        triage_session = TriageSession.objects.create(user=user)
        
        # Initiate conversation
        first_user_msg = TriageMessage.objects.create(
            triage_session=triage_session, role="user", content="Hi, I need someone to talk to."
        )
        history = [first_user_msg]
        
        raw_response = self._call_gemini(history)
        parsed = json.loads(raw_response)
        
        ai_message = parsed.get("message_to_user", "Hi there, I'm here to listen. How are you feeling today?")
        
        TriageMessage.objects.create(
            triage_session=triage_session, role="model", content=ai_message
        )
        
        return triage_session

    def process_response(self, triage_session_id, user_message):
        """Processes a user response, updates the internal form, and potentially completes the triage."""
        triage_session = TriageSession.objects.get(id=triage_session_id)
        
        if triage_session.is_complete:
            return triage_session

        # Save user message
        TriageMessage.objects.create(
            triage_session=triage_session, role="user", content=user_message
        )
        
        history = triage_session.messages.all()
        
        raw_response = self._call_gemini(history)
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {
                "message_to_user": "I'm sorry, I couldn't process that. Can you tell me more?",
                "form_state": {},
                "is_complete": False,
                "routing_decision": None
            }
            
        ai_message = parsed.get("message_to_user", "Please continue...")
        
        # Save AI message
        TriageMessage.objects.create(
            triage_session=triage_session, role="model", content=ai_message
        )
        
        # Update form state
        form_state = parsed.get("form_state", {})
        if form_state:
            triage_session.emotional_state = form_state.get("emotional_state") or triage_session.emotional_state
            triage_session.primary_concern = form_state.get("primary_concern") or triage_session.primary_concern
            triage_session.support_preference = form_state.get("support_preference") or triage_session.support_preference
            triage_session.urgency = form_state.get("urgency") or triage_session.urgency
            
        triage_session.is_complete = parsed.get("is_complete", False)
        
        if triage_session.is_complete:
            triage_session.routing_decision = parsed.get("routing_decision")
            
            # Create real session
            new_session = Session.objects.create(
                user=triage_session.user,
                status=Session.WAITING
            )
            triage_session.resulting_session = new_session
            
            # Generate SessionNote for the counselor
            note_content = (
                f"--- AI Intake Summary ---\n"
                f"Emotional State: {triage_session.emotional_state}\n"
                f"Primary Concern: {triage_session.primary_concern}\n"
                f"Support Preference: {triage_session.support_preference}\n"
                f"Urgency: {triage_session.urgency}\n"
                f"Routing Decision: {triage_session.routing_decision}\n"
            )
            SessionNote.objects.create(
                session=new_session,
                note_text=note_content,
                is_private=True
            )
            
        triage_session.save()
        return triage_session
