# AI Triage & Mental Health Intake Research

Based on your request, I have researched how top competitors handle patient intake, reviewed recent clinical research on conversational AI for mental health, and mapped out a strategy to make your application uniquely efficient and supportive for both users and clinicians.

## 1. How Competitors Handle Intake

### BetterHelp
- **Process:** Relies entirely on a static, 2–3 minute multiple-choice questionnaire.
- **Data Collected:** Mental health goals, current challenges (anxiety, depression, etc.), demographic preferences (gender, age, religion of therapist).
- **Matching:** Algorithmic. Matches take anywhere from 12 to 48 hours to process.
- **Drawback:** It is a rigid, impersonal form that does not adapt to the user's emotional state in real-time.

### YourDOST
- **Process:** No mandatory intake form. Users browse expert profiles and select who they want to speak with.
- **Data Collected:** Offers optional "self-help assessments" (quizzes) that users can take for personal insight, but they aren't tied directly into a clinical intake flow.
- **Matching:** Manual browsing or instant connection to the next available expert.
- **Drawback:** Counselors often enter sessions "blind" without any structured background on the user's chief complaints.

---

## 2. What Recent Clinical Research Says About AI Triage
Recent studies and systematic reviews on Conversational AI (CA) in mental health highlight several key findings:
1. **Clinical Efficiency:** Tools like *Limbic Access* (used in the UK's NHS) show that conversational AI significantly reduces administrative burden by acting as a "supervised pre-consultation triage" agent. 
2. **Supervised Triage over Autonomous Diagnosis:** Research heavily advocates for a "Human-in-the-Loop" model. AI should summarize histories and flag symptoms, but humans must verify diagnoses and handle crises.
3. **Efficacy:** AI agents are highly effective at lowering the barrier to entry, helping users who might be too anxious to fill out a clinical form feel comfortable through a conversational interface.

---

## 3. How We Can Make Your App Better and Unique

By leveraging the Gemini API, we can build a dynamic intake flow that solves the drawbacks of both BetterHelp and YourDOST. Here is how we can implement AI throughout the platform:

### A. Dynamic AI Triage (The Intake Phase)
Instead of a static form, the user chats with an empathetic AI upon signing up.
- **Adaptive Questioning:** If a user mentions "I can't sleep and feel worthless," the AI dynamically pivots to ask questions loosely based on the PHQ-9 (Depression) scale. If they mention "panic," it pivots to GAD-7 (Anxiety) questions.
- **Auto-Generating the Intake Form:** The AI extracts the unstructured chat and securely POSTs a structured JSON object to your backend's `SessionIntakeView`. 
- **The Result:** The Counselor receives a perfectly formatted clinical summary (Chief Complaint, History, Risk Flags, Estimated Severity) *before* they even say hello, saving the first 15 minutes of the session.

### B. Live Session Assistance (The Counseling Phase)
- **Real-Time Highlighting:** We can use AI to monitor the chat stream. If the user sends a message indicating a crisis or high risk, the AI can trigger your existing `MessageHighlightView` backend endpoint to visually flag the message red for the counselor.
- **Smart Escalation Context:** If the Counselor needs to escalate the user to a Licensed Therapist, the AI can automatically draft the "Reason for Escalation" summary, ensuring the Therapist is fully briefed without the Counselor typing a paragraph.

### C. Post-Session Automation (The Documentation Phase)
- **Auto-Drafted Clinical Notes:** Documentation is a massive pain point for therapists. When a session ends, the AI can read the chat transcript and generate a draft clinical note (using the SOAP format: Subjective, Objective, Assessment, Plan). 
- **Integration:** It places this draft in your existing `SessionNoteListView` endpoint. The therapist simply reviews it, edits if necessary, and clicks "Save," cutting documentation time from 10 minutes down to 1 minute per session.

---

## Summary of AI Integration Points to Implement Next
1. **Update `TriageActiveView` (Backend/Frontend):** Integrate Gemini API to conduct the conversational intake and map it to a structured intake JSON.
2. **AI Intake Handoff:** Ensure the counselor's dashboard automatically displays the AI's summarized intake form when they accept a user.
3. **Post-Session Notes:** Add a "Draft Note with AI" button in the chat's Note Modal.
