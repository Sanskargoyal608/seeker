import os
import json
import requests
import logging
from django.conf import settings
from core.models import TriageSession, TriageMessage, Session, SessionNote

logger = logging.getLogger(__name__)

# Life-stress categories that belong to Graduate Counselors (peer/life guidance)
LIFE_STRESS_TAGS = {
    'burnout', 'stress', 'loneliness', 'grief', 'relationship', 'career',
    'academic', 'financial', 'identity', 'family conflict', 'work stress',
    'exam stress', 'relationship distress', 'career confusion', 'homesickness',
    'adjustment', 'venting', 'life stress', 'overwhelm', 'pet loss',
    'breakup', 'divorce stress', 'parental conflict', 'bullying', 'mild anxiety',
}

# Clinical conditions strictly requiring Licensed Psychologists / Therapists
CLINICAL_TAGS = {
    'depression', 'major depressive disorder', 'mdd', 'gad',
    'generalized anxiety disorder', 'ptsd', 'post-traumatic stress disorder',
    'ocd', 'obsessive-compulsive disorder', 'bipolar',
    'eating disorder', 'bulimia', 'anorexia', 'binge eating',
    'substance use', 'addiction', 'alcoholism', 'panic disorder',
    'agoraphobia', 'body dysmorphic disorder', 'postpartum depression',
    'self-harm', 'suicidal ideation', 'psychosis', 'severe trauma',
}

SOFT_TURN_LIMIT = 4
HARD_TURN_LIMIT = 6

class TriageService:
    def __init__(self):
        self.api_key = getattr(settings, 'OPENAI_API_KEY', os.getenv('OPENAI_API_KEY'))
        self.rag_context = self._load_rag_context()

    def _load_rag_context(self):
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            filepath = os.path.join(base_dir, 'research', 'clinical_assessments_mapping.md')
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to load RAG context: {e}")
            return "No specific clinical research available."

    def get_system_prompt(self, phase="OPENING", turn_count=1):
        turn_guidance = f"CURRENT PROGRESS: Turn {turn_count} (Soft Target: 4 turns, Hard Cap: 6 turns)."
        if turn_count >= HARD_TURN_LIMIT:
            turn_guidance += " CRITICAL: Hard turn limit reached! You MUST transition to CLOSING now, synthesize what you have, and set is_complete: true."
        elif turn_count >= SOFT_TURN_LIMIT:
            turn_guidance += " Soft limit reached: If you have identified the core problem and timeline, transition to CLOSING on this turn."

        prompt = f"""You are the Advanced Clinical Intake & Triage Specialist on the Seeker mental health platform.

═══════════════════════════════════════════════════
MISSION: CONVERSATIONAL INTAKE FORM REPLACEMENT
═══════════════════════════════════════════════════
Instead of forcing patients to fill out a long 20-question static intake form (like BetterHelp or Talkspace), you conduct a warm, high-efficiency, empathetic clinical intake via chat in 4 to 6 turns.
Your dual objectives are:
1. Give the patient a safe, compassionate space where they feel heard without interrogation.
2. Silently assemble an executive Clinical Intake Dossier for the consulting psychologist/counselor, so the practitioner knows the patient's full context before the first session begins.

{turn_guidance}

═══════════════════════════════════════════════════
CORE INTERACTION RULES
═══════════════════════════════════════════════════
- **Ask ONLY ONE clear, open-ended question at a time.** Never ask bulleted or compound questions.
- **Dynamic Suggested Chips:** On EVERY turn, you MUST provide 3 to 4 short, empathetic suggested response chips (1-4 words each) under "suggested_chips". These give low-energy, distressed, or overwhelmed users an effortless way to respond with one tap.
- **Handling "I don't know", "No", or Evasiveness ("Soft Pivot"):**
  - If a patient answers "I don't know", "no", or is vague, NEVER press them or repeat the question.
  - Validate them warmly (e.g. "That is completely okay, you don't have to have all the answers right now.").
  - Record the field as "unspecified" or "non_symptomatic" in extracted_data.
  - Shift from abstract psychological terms to concrete daily experiences (e.g., "How has your day-to-day energy been feeling lately?").
- **Multi-Intent Extraction:** Extract as much information as possible from EVERY message. If the user shares their problem, duration, and sleep issues in their first message, populate all fields immediately and advance your questioning.
- **Do NOT provide therapy or medical advice.** Do not say "you should try breathing exercises" or "talk to a professional" — YOU are conducting the intake that connects them to the right professional.

═══════════════════════════════════════════════════
PROVIDER TIER SELECTION (STRICT CRITERIA)
═══════════════════════════════════════════════════
We prioritize **GRADUATE COUNSELORS** for general support, life challenges, and preventative wellness:
- **GRADUATE_COUNSELOR**: Life transitions, exam/academic stress, loneliness, career burnout, grief/loss, relationship issues, breakup, venting, adjustment, mild-to-moderate situational anxiety/sadness.
- **LICENSED_THERAPIST**: Reserved ONLY when clinical indicators demonstrate diagnosed/probable clinical disorder requiring specialized psychotherapy:
  - Major Depressive Disorder (MDD) with significant functional impairment
  - Post-Traumatic Stress Disorder (PTSD) or severe acute trauma
  - Obsessive-Compulsive Disorder (OCD) with severe rituals/obsessions
  - Panic Disorder with frequent panic attacks or agoraphobia
  - Bipolar Disorder or Psychosis indicators
  - Eating disorders (Anorexia, Bulimia)
  - Active self-harm, suicidal ideation, or crisis indicators

═══════════════════════════════════════════════════
INTAKE PHASES & BRANCHING
═══════════════════════════════════════════════════
CURRENT PHASE: {phase}

- **OPENING (Turn 1)**:
  - Welcome the patient with warmth and open space.
  - Elicit the presenting problem (chief complaint) and emotional state.
  - Suggested chips should capture common presenting reasons.

- **EXPLORATION (Turn 2)**:
  - Understand the chronicity/duration ("How long has this been going on?") and core triggers.
  - Suggested chips should offer clear timeline options.

- **DEEPENING (Turn 3–4)**:
  - Dynamically branch into relevant clinical criteria from the CLINICAL RAG CONTEXT below.
  - Inquire about functional impairment (impact on work, school, relationships, sleep, or energy).
  - Check treatment goals / what kind of support they are hoping for.
  - Suggested chips should provide functional/impact options.

- **CLOSING (Turn 4–6)**:
  - DO NOT ask any more questions.
  - Warmly thank the patient, summarize what you understood with profound empathy, and state: "I have prepared your intake summary. I am now connecting you with the right specialist."
  - Set "is_complete": true.
  - Formulate the comprehensive "intake_dossier" in clean Markdown.

═══════════════════════════════════════════════════
CRISIS PROTOCOL (OVERRIDE ANY PHASE)
═══════════════════════════════════════════════════
If active suicidal thoughts, self-harm intent, abuse, or violence are detected:
1. Set urgency = "critical", add flags to crisis_flags.
2. Set provider_tier_recommendation = "LICENSED_THERAPIST".
3. Set is_complete = true immediately.
4. Response: "I hear you, and please know you matter. Because your safety is our top priority, if you're in immediate danger, please reach out to emergency services (call 988 or 112). I am also immediately connecting you with professional crisis care."

═══════════════════════════════════════════════════
CLINICAL RAG CONTEXT
═══════════════════════════════════════════════════
{self.rag_context}

═══════════════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════════════
Respond with this exact JSON format (no markdown code fence around the json):

{{
  "message_to_user": "Warm empathetic message. Max ONE question, or wrap-up statement if closing.",
  "suggested_chips": ["Short chip 1", "Short chip 2", "Short chip 3"],
  "internal_reasoning": "Clinical differential analysis and turn tracking.",
  "extracted_data": {{
    "chief_complaint": "string or null",
    "emotional_state": "string or null",
    "primary_concern": "string or null",
    "duration": "string or null",
    "triggers": ["string"],
    "sleep_quality": "string or null",
    "appetite_change": "string or null",
    "social_functioning": "string or null",
    "physical_symptoms": ["string"],
    "functional_impairment": {{
      "occupational": "string or null",
      "social": "string or null",
      "daily_living": "string or null"
    }},
    "provisional_conditions": ["e.g. Situational Adjustment Stress, Social Anxiety, etc."],
    "suspected_conditions": ["string tags matching LIFE_STRESS or CLINICAL_TAGS"],
    "therapy_goals": ["string"],
    "recommended_modalities": ["CBT", "ACT", "Supportive Counseling", "Mindfulness"],
    "specialization_tags": ["anxiety", "career-burnout", "grief"],
    "provider_tier_recommendation": "GRADUATE_COUNSELOR or LICENSED_THERAPIST",
    "urgency": "low | medium | high | critical",
    "crisis_flags": ["string"]
  }},
  "intake_dossier": "Mandatory Markdown briefing for the practitioner if closing, else null. MUST start with: '> [!NOTE]\\n> **AI-Assisted Provisional Assessment**\\n> *For clinical guidance only; requires formal practitioner evaluation.*'",
  "is_complete": false,
  "clinical_summary": "Short 2-sentence clinical summary or null"
}}
"""
        return prompt

    def _call_openai(self, history, triage_session=None):
        phase = 'OPENING'
        turn_count = 1
        if triage_session:
            phase = triage_session.conversation_phase
            turn_count = triage_session.turn_count + 1

        system_instruction = self.get_system_prompt(phase, turn_count)
        messages = [{"role": "system", "content": system_instruction}]

        for msg in history:
            text = msg.content
            if msg.role == "model":
                text = json.dumps({
                    "message_to_user": text,
                    "internal_reasoning": "Continuing conversation...",
                    "extracted_data": {},
                    "is_complete": False
                })
            messages.append({"role": "user" if msg.role == "user" else "assistant", "content": text})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.7
        }

        try:
            response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data, timeout=60)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return json.dumps({
                "message_to_user": "I am here with you. Could you share a little more about what has been on your mind lately?",
                "suggested_chips": ["Feeling overwhelmed", "Struggling with stress", "Just need to talk", "Not sure where to start"],
                "internal_reasoning": "API fallback",
                "extracted_data": {},
                "intake_dossier": None,
                "is_complete": False,
                "clinical_summary": None
            })

    def _match_therapists(self, triage_session):
        """
        Finds matching licensed therapists using Typesense with fallback to Django ORM.
        Matches by specialization_tags and recommended_modalities.
        """
        matched = []
        tags = triage_session.specialization_tags or []
        modalities = triage_session.recommended_modalities or []
        query_terms = " ".join(tags + modalities).strip() or "*"

        try:
            from profiles.services.typesense_service import TypesenseService
            ts = TypesenseService()
            results = ts.search_therapists(query=query_terms, per_page=4)
            hits = results.get('hits', [])
            for hit in hits:
                doc = hit.get('document', {})
                matched.append({
                    'id': int(doc.get('id')),
                    'name': doc.get('name', 'Licensed Therapist'),
                    'bio': doc.get('bio', ''),
                    'per_session_rate': float(doc.get('per_session_rate', 0.0)),
                    'languages': doc.get('languages', []),
                    'modalities': doc.get('modalities', []),
                    'match_reason': f"Specializes in {', '.join(tags[:2])}" if tags else "Verified Clinical Therapist"
                })
        except Exception as e:
            logger.warning(f"Typesense match failed, falling back to ORM: {e}")

        # Fallback to Django ORM if Typesense returns nothing
        if not matched:
            from accounts.models import LicensedTherapist
            therapists = LicensedTherapist.objects.filter(is_verified=True).select_related('user')[:4]
            for t in therapists:
                matched.append({
                    'id': t.id,
                    'name': f"{t.user.first_name} {t.user.last_name}".strip() or "Licensed Therapist",
                    'bio': t.bio or "",
                    'per_session_rate': float(t.per_session_rate or t.per_minute_rate * 50 or 100.0),
                    'languages': t.languages or ['English'],
                    'modalities': t.modalities or ['CBT'],
                    'match_reason': "Verified Clinical Specialist"
                })

        return matched

    def _determine_routing_and_severity(self, triage_session, extracted):
        """
        Calculates severity score and strictly determines whether patient requires
        LICENSED_THERAPIST or GRADUATE_COUNSELOR based on clinical criteria.
        """
        score = 0
        urgency = (triage_session.urgency or "").lower()
        crisis = triage_session.crisis_flags or []

        # 1. Immediate Crisis Override
        if urgency == "critical" or len(crisis) > 0:
            return 10, "LICENSED_THERAPIST"

        # 2. Clinical Condition Check
        suspected = [s.lower().strip() for s in (triage_session.suspected_conditions or [])]
        provisional = [p.lower().strip() for p in (triage_session.provisional_conditions or [])]
        all_conditions = set(suspected + provisional)

        has_clinical_condition = False
        for condition in all_conditions:
            if any(clinical_tag in condition for clinical_tag in CLINICAL_TAGS):
                has_clinical_condition = True
                score += 4
                break

        # 3. Chronicity & Functional Impairment
        duration = (triage_session.duration or "").lower()
        if any(w in duration for w in ["month", "year", "several", "chronic"]):
            score += 2
        elif any(w in duration for w in ["week", "few weeks"]):
            score += 1

        if urgency == "high":
            score += 2
        elif urgency == "medium":
            score += 1

        # Check functional impairment
        fi = triage_session.functional_impairment or {}
        has_impairment = any(
            isinstance(v, str) and v.lower() not in ["none", "normal", "unspecified", "null", ""]
            for v in fi.values()
        )
        if has_impairment:
            score += 2

        # 4. Strict Routing Decision
        # Priority to GRADUATE_COUNSELOR unless verified clinical condition or severe impairment
        suggested_tier = extracted.get("provider_tier_recommendation", "")
        if (has_clinical_condition and score >= 4) or suggested_tier == "LICENSED_THERAPIST" and score >= 4:
            return max(score, 4), "LICENSED_THERAPIST"
        else:
            return score, "GRADUATE_COUNSELOR"

    def _generate_fallback_dossier(self, triage_session):
        """Fallback dossier generator if AI did not produce Markdown."""
        return (
            f"> [!NOTE]\n"
            f"> **AI-Assisted Provisional Assessment**\n"
            f"> *For clinical guidance only; requires formal practitioner evaluation.*\n\n"
            f"### Clinical Intake Overview\n"
            f"- **Presenting Complaint:** {triage_session.chief_complaint or 'Unspecified life distress'}\n"
            f"- **Emotional State:** {triage_session.emotional_state or 'Distressed / Seeking support'}\n"
            f"- **Timeline / Duration:** {triage_session.duration or 'Unknown / Unspecified'}\n"
            f"- **Primary Concern:** {triage_session.primary_concern or 'Support & guidance'}\n"
            f"- **Provisional Impression:** {', '.join(triage_session.provisional_conditions) if triage_session.provisional_conditions else 'General Life Stress'}\n"
            f"- **Symptomatic Notes:** Sleep: {triage_session.sleep_quality or 'Not reported'}, Appetite: {triage_session.appetite_change or 'Not reported'}\n"
            f"- **Urgency Level:** {triage_session.urgency or 'Medium'}\n"
            f"- **Recommended Modality:** {', '.join(triage_session.recommended_modalities) if triage_session.recommended_modalities else 'Supportive Counseling'}\n"
            f"- **Practitioner Note:** Client completed conversational intake. Initial session should review presenting context and formulate collaborative goals."
        )

    def start_triage(self, user):
        triage_session = TriageSession.objects.create(
            user=user,
            conversation_phase="OPENING",
            turn_count=0,
            suggested_chips=["Feeling overwhelmed", "Struggling with anxiety", "Just need to talk to someone", "Relationship stress"]
        )

        first_user_msg = TriageMessage.objects.create(
            triage_session=triage_session, role="user", content="Hi, I need someone to talk to."
        )
        history = [first_user_msg]

        raw_response = self._call_openai(history, triage_session)
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {}

        ai_message = parsed.get("message_to_user", "Hi there, I'm here with you. Can you tell me a little about what's been on your mind lately?")
        chips = parsed.get("suggested_chips", ["Feeling overwhelmed", "Struggling with stress", "Just need to talk", "Not sure where to start"])

        triage_session.suggested_chips = chips
        triage_session.save(update_fields=['suggested_chips'])

        TriageMessage.objects.create(
            triage_session=triage_session, role="model", content=ai_message
        )

        return triage_session

    def process_response(self, triage_session_id, user_message):
        triage_session = TriageSession.objects.get(id=triage_session_id)

        if triage_session.is_complete:
            return triage_session

        # Increment turn count
        triage_session.turn_count += 1

        TriageMessage.objects.create(
            triage_session=triage_session, role="user", content=user_message
        )

        history = triage_session.messages.all()
        raw_response = self._call_openai(history, triage_session)

        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError:
            parsed = {
                "message_to_user": "I hear you. Could you share a bit more about what you're experiencing?",
                "suggested_chips": ["It's hard to explain", "Just started recently", "A few months now", "I'd rather skip this"],
                "extracted_data": {},
                "is_complete": False
            }

        ai_message = parsed.get("message_to_user", "I'm listening, please continue...")
        chips = parsed.get("suggested_chips", ["Tell me more", "I'm not sure", "Skip this question", "Ready for a counselor"])

        TriageMessage.objects.create(
            triage_session=triage_session, role="model", content=ai_message
        )

        # ═══════════════════════════════════════
        # MERGE EXTRACTED CLINICAL DATA
        # ═══════════════════════════════════════
        extracted = parsed.get("extracted_data", {})
        if extracted:
            triage_session.chief_complaint = extracted.get("chief_complaint") or triage_session.chief_complaint
            triage_session.emotional_state = extracted.get("emotional_state") or triage_session.emotional_state
            triage_session.primary_concern = extracted.get("primary_concern") or triage_session.primary_concern
            triage_session.duration = extracted.get("duration") or triage_session.duration
            triage_session.sleep_quality = extracted.get("sleep_quality") or triage_session.sleep_quality
            triage_session.appetite_change = extracted.get("appetite_change") or triage_session.appetite_change
            triage_session.social_functioning = extracted.get("social_functioning") or triage_session.social_functioning
            triage_session.urgency = extracted.get("urgency") or triage_session.urgency

            for list_field in ['triggers', 'physical_symptoms', 'suspected_conditions', 'crisis_flags',
                               'provisional_conditions', 'therapy_goals', 'recommended_modalities', 'specialization_tags']:
                val = extracted.get(list_field)
                if isinstance(val, list) and len(val) > 0:
                    setattr(triage_session, list_field, val)

            fi = extracted.get("functional_impairment")
            if isinstance(fi, dict) and fi:
                triage_session.functional_impairment = fi

        triage_session.suggested_chips = chips
        triage_session.clinical_summary = parsed.get("clinical_summary") or triage_session.clinical_summary

        # ═══════════════════════════════════════
        # ADAPTIVE STATE MACHINE WITH TURN LIMITS
        # ═══════════════════════════════════════
        def is_valid(val):
            if not val: return False
            if isinstance(val, str):
                return val.lower().strip() not in ["", "null", "none", "unknown", "unspecified"]
            if isinstance(val, list):
                return len(val) > 0 and val[0].lower().strip() not in ["", "null", "none", "unknown", "unspecified"]
            return True

        current_phase = triage_session.conversation_phase
        new_phase = "OPENING"

        has_problem = is_valid(triage_session.chief_complaint) or is_valid(triage_session.emotional_state) or is_valid(triage_session.primary_concern)
        has_timeline = is_valid(triage_session.duration)
        has_symptoms = is_valid(triage_session.sleep_quality) or is_valid(triage_session.appetite_change) or is_valid(triage_session.physical_symptoms) or bool(triage_session.functional_impairment)

        if has_problem:
            new_phase = "EXPLORATION"
        if has_timeline:
            new_phase = "DEEPENING"
        if (has_symptoms and triage_session.turn_count >= SOFT_TURN_LIMIT) or triage_session.turn_count >= HARD_TURN_LIMIT:
            new_phase = "CLOSING"

        # Hard Turn Limit or Crisis Override
        has_crisis = len(triage_session.crisis_flags or []) > 0
        if triage_session.turn_count >= HARD_TURN_LIMIT or has_crisis:
            new_phase = "CLOSING"

        # Never regress phase
        phase_order = ["OPENING", "EXPLORATION", "DEEPENING", "CLOSING"]
        if phase_order.index(new_phase) > phase_order.index(current_phase):
            triage_session.conversation_phase = new_phase

        # ═══════════════════════════════════════
        # COMPLETION & DOSSIER SYNTHESIS
        # ═══════════════════════════════════════
        is_ai_complete = parsed.get("is_complete", False)
        has_crisis = len(triage_session.crisis_flags or []) > 0
        can_complete_early = is_ai_complete and has_problem and (has_timeline or has_symptoms)

        if can_complete_early or (triage_session.conversation_phase == "CLOSING" and (is_ai_complete or triage_session.turn_count >= HARD_TURN_LIMIT)) or has_crisis:
            triage_session.is_complete = True
            triage_session.conversation_phase = "CLOSING"
        else:
            triage_session.is_complete = False

        if triage_session.is_complete:
            # Capture or generate Intake Dossier
            dossier = parsed.get("intake_dossier")
            if not dossier or not isinstance(dossier, str) or len(dossier.strip()) < 50:
                dossier = self._generate_fallback_dossier(triage_session)
            
            # Ensure mandatory clinical disclaimer is present
            if "AI-Assisted Provisional Assessment" not in dossier:
                disclaimer = (
                    "> [!NOTE]\n"
                    "> **AI-Assisted Provisional Assessment**\n"
                    "> *For clinical guidance only; requires formal practitioner evaluation.*\n\n"
                )
                dossier = disclaimer + dossier

            triage_session.intake_dossier = dossier

            # Calculate Severity & Provider Tier
            severity_score, routing = self._determine_routing_and_severity(triage_session, extracted)
            triage_session.routing_decision = routing
            triage_session.ai_confidence = float(severity_score)

            # ═══════════════════════════════════════
            # ROUTING OUTCOME HANDOFF
            # ═══════════════════════════════════════
            if routing == "GRADUATE_COUNSELOR":
                # Automatically place into active counselor queue
                new_session = Session.objects.create(
                    user=triage_session.user,
                    status=Session.WAITING
                )
                triage_session.resulting_session = new_session

                SessionNote.objects.create(
                    session=new_session,
                    note_text=dossier,
                    is_private=True
                )
            elif routing == "LICENSED_THERAPIST":
                # Match verified licensed therapists for recommendation popup
                matched_therapists = self._match_therapists(triage_session)
                triage_session.recommended_therapists = matched_therapists

                # Also create waiting session pre-attached with dossier so user can proceed
                new_session = Session.objects.create(
                    user=triage_session.user,
                    status=Session.WAITING
                )
                triage_session.resulting_session = new_session

                SessionNote.objects.create(
                    session=new_session,
                    note_text=dossier,
                    is_private=True
                )

        triage_session.save()
        return triage_session
