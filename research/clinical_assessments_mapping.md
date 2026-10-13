# AI Clinical Triage: Psychological Condition & Assessment Mapping

To build an efficient, research-backed conversational AI triage system, the AI must be trained to recognize specific symptomatic keywords in natural language and dynamically pivot its questioning strategy. 

Below is a comprehensive map of common psychological conditions, their gold-standard clinical screening tools, the conversational triggers the AI should listen for, and the specific fields the AI needs to populate for the counselor's intake form.

---

## 1. Major Depressive Disorder (MDD)
**Standard Clinical Tool:** PHQ-9 (Patient Health Questionnaire-9)
**Purpose:** Measures the severity of depression based on DSM-5 criteria.

### AI Trigger Keywords / Symptoms
- "I feel sad all the time", "I have no energy", "I feel empty", "I don't enjoy anything anymore", "I feel worthless", "I want to give up."

### AI Adaptive Questioning (Fields to Fill)
When triggered, the AI should seamlessly weave the following concepts into the conversation:
- **Anhedonia:** "Have you noticed a loss of interest or pleasure in things you usually enjoy?"
- **Mood:** "Have you been feeling down, depressed, or hopeless recently?"
- **Sleep:** "How has your sleep been? Trouble falling asleep, or sleeping too much?"
- **Energy:** "Have you been feeling tired or having little energy?"
- **Appetite:** "Have you experienced significant changes in your appetite or weight?"
- **Self-Worth:** "Have you been feeling bad about yourself, or that you are a failure?"
- **Concentration:** "Have you had trouble concentrating on things, like reading or watching TV?"
- **Psychomotor:** "Have you been moving or speaking much slower than usual, or being extremely fidgety?"
- **🚨 CRISIS FLAG (Suicidality):** "Have you had any thoughts that you would be better off dead, or of hurting yourself?"

---

## 2. Generalized Anxiety Disorder (GAD)
**Standard Clinical Tool:** GAD-7 (Generalized Anxiety Disorder-7)
**Purpose:** Screens for and measures the severity of anxiety.

### AI Trigger Keywords / Symptoms
- "I can't stop worrying", "I feel panicked", "My chest is tight", "I'm always on edge", "I feel overwhelmed", "I can't relax."

### AI Adaptive Questioning (Fields to Fill)
- **Nervousness:** "Have you been feeling nervous, anxious, or on edge?"
- **Worry Control:** "Have you felt like you can't stop or control your worrying?"
- **Different Worries:** "Have you been worrying too much about different things?"
- **Relaxation:** "Have you found it hard to relax?"
- **Restlessness:** "Have you been so restless that it's hard to sit still?"
- **Irritability:** "Have you been easily annoyed or irritable?"
- **Fear:** "Have you felt afraid, as if something awful might happen?"

---

## 3. Post-Traumatic Stress Disorder (PTSD)
**Standard Clinical Tool:** PCL-5 (PTSD Checklist for DSM-5)
**Purpose:** Assesses the presence and severity of PTSD symptoms following a traumatic event.

### AI Trigger Keywords / Symptoms
- "I can't forget what happened", "I have nightmares", "I get flashbacks", "I avoid places that remind me", "I'm always jumping at noises."

### AI Adaptive Questioning (Fields to Fill)
- **Intrusion:** "Do you have repeated, disturbing memories, thoughts, or images of a stressful experience from the past?"
- **Avoidance:** "Do you try to avoid memories, thoughts, or feelings about the stressful experience?"
- **Negative Mood/Cognition:** "Have you felt distant or cut off from other people? Have you had strong negative feelings like guilt, anger, or fear?"
- **Arousal/Reactivity:** "Have you felt super alert, watchful, or on guard? Have you been feeling jumpy or easily startled?"

---

## 4. Obsessive-Compulsive Disorder (OCD)
**Standard Clinical Tool:** Y-BOCS (Yale-Brown Obsessive Compulsive Scale)
**Purpose:** Measures the severity and type of obsessive thoughts and compulsive behaviors.

### AI Trigger Keywords / Symptoms
- "I have to do things a certain way", "I can't get this thought out of my head", "I keep checking things", "I'm afraid of contamination/germs", "I have weird intrusive thoughts."

### AI Adaptive Questioning (Fields to Fill)
- **Obsessions (Time/Distress):** "How much time do you spend having thoughts that you don't want but can't get rid of? How much do they bother you?"
- **Compulsions (Time/Control):** "How much time do you spend doing repetitive behaviors or mental acts that you feel driven to perform? How hard is it to stop them?"

---

## 5. Bipolar Disorder (Mania / Hypomania)
**Standard Clinical Tool:** MDQ (Mood Disorder Questionnaire)
**Purpose:** Screens for a lifetime history of manic or hypomanic episodes.

### AI Trigger Keywords / Symptoms
- "My mood swings are crazy", "I didn't sleep for 3 days and felt fine", "I made a lot of impulsive decisions", "My mind was racing", "I felt like I had superpowers."

### AI Adaptive Questioning (Fields to Fill)
- **Hyperactivity:** "Has there ever been a period where you felt so hyper or full of energy that you got into trouble, or people thought you weren't your normal self?"
- **Sleep Need:** "Have you ever found that you needed much less sleep than usual but still had plenty of energy?"
- **Racing Thoughts:** "Have you experienced your thoughts racing so fast you couldn't keep up?"
- **Impulsivity:** "Have you ever done things that were unusual for you or caused trouble, like spending money recklessly or engaging in risky behaviors?"

---

## 6. Adult ADHD (Attention-Deficit/Hyperactivity Disorder)
**Standard Clinical Tool:** ASRS v1.1 (Adult ADHD Self-Report Scale)
**Purpose:** Screens for symptoms of ADHD in adults.

### AI Trigger Keywords / Symptoms
- "I can't focus", "I procrastinate constantly", "I'm always losing my keys", "My mind wanders during conversations", "I feel restless all the time."

### AI Adaptive Questioning (Fields to Fill)
- **Inattention:** "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?"
- **Organization:** "How often do you have difficulty getting things in order when you have to do a task that requires organization?"
- **Memory/Misplacing:** "How often do you have problems remembering appointments or obligations?"
- **Hyperactivity:** "How often do you feel overly active and compelled to do things, like you were driven by a motor?"

---

## 7. Eating Disorders
**Standard Clinical Tool:** SCOFF Questionnaire or EAT-26 (Eating Attitudes Test)
**Purpose:** Screens for anorexia nervosa, bulimia nervosa, and general disordered eating.

### AI Trigger Keywords / Symptoms
- "I hate my body", "I binge eat", "I make myself throw up", "I'm obsessed with my weight", "I count every calorie", "I skip meals."

### AI Adaptive Questioning (Fields to Fill)
- **S**ick: "Do you ever make yourself sick (induce vomiting) because you feel uncomfortably full?"
- **C**ontrol: "Do you worry you have lost control over how much you eat?"
- **O**ne Stone: "Have you recently lost more than 14 pounds (one stone) in a 3-month period?"
- **F**at: "Do you believe yourself to be fat when others say you are too thin?"
- **F**ood: "Would you say that food dominates your life?"

---

## 8. Substance Use / Addiction
**Standard Clinical Tool:** CAGE-AID (Adapted to Include Drugs) or AUDIT
**Purpose:** Screens for alcohol and drug abuse/dependency.

### AI Trigger Keywords / Symptoms
- "I drink too much", "I can't stop using", "My drinking is ruining my relationships", "I get withdrawal symptoms", "I hide my drinking."

### AI Adaptive Questioning (Fields to Fill)
- **C**ut down: "Have you ever felt you ought to cut down on your drinking or drug use?"
- **A**nnoyed: "Have people annoyed you by criticizing your drinking or drug use?"
- **G**uilt: "Have you ever felt bad or guilty about your drinking or drug use?"
- **E**ye-opener: "Have you ever had a drink or used drugs first thing in the morning to steady your nerves or get rid of a hangover?"

---

## System Integration Note for AI Intake
The Gemini AI system prompt should be structured to use "Chain of Thought" reasoning during the chat:
1. **Listen:** Parse user's raw text.
2. **Classify:** Does this text map to any of the 8 Trigger Keyword categories above?
3. **Transition:** Use empathetic conversational phrasing to pivot into the relevant assessment. (e.g., "I'm so sorry to hear you're feeling on edge. Can I ask, have you felt like you can't stop or control your worrying recently?")
4. **Aggregate:** Once sufficient data is gathered, compile a structured JSON payload detailing the suspected condition and the severity score based on the clinical tool.
