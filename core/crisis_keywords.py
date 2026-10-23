"""
Built-in crisis phrases.

These ship with the code, so crisis detection works on a brand-new database with
nothing seeded. Staff can add more phrases in Django Admin (CrisisKeyword); both
lists are used together.

Text is normalised before matching: lower-cased, apostrophes removed, hyphens
turned into spaces, whitespace collapsed. So write phrases without apostrophes
("dont want to live") and with spaces ("self harm").

The matching is deliberately simple and errs on the side of alerting a human: it
does not try to understand negation ("I am not suicidal" still alerts).

NEEDS CLINICAL REVIEW before real users rely on it: add, remove and re-categorise
phrases (including Hindi/Hinglish and other regional languages) with a clinician.
"""

SUICIDE = 'SUICIDE'
SELF_HARM = 'SELF_HARM'
OVERDOSE = 'OVERDOSE'
ABUSE = 'ABUSE'
VIOLENCE = 'VIOLENCE'

BUILTIN_PHRASES = {
    SUICIDE: [
        'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life', 'ending my life',
        'take my own life', 'taking my own life', 'want to die', 'wanna die', 'wish i was dead',
        'wish i were dead', 'better off dead', 'better off without me', 'dont want to live',
        'do not want to live', 'no reason to live', 'not worth living', 'end it all', 'ending it all',
        'cant go on', 'hang myself', 'hanging myself', 'jump off a bridge', 'jump off the roof',
        'slit my wrists', 'shoot myself', 'shooting myself',
        # Romanised Hindi / Hinglish
        'marna chahta', 'marna chahti', 'mar jana chahta', 'mar jana chahti', 'mar jaana chahta',
        'mar jaana chahti', 'jeena nahi chahta', 'jeena nahi chahti', 'jine ka mann nahi',
        'khud ko khatam', 'apni jaan', 'suicide kar', 'zindagi khatam',
        # Devanagari
        'आत्महत्या', 'मरना चाहता', 'मरना चाहती', 'जान दे', 'खुद को खत्म', 'जीना नहीं चाहता', 'जीना नहीं चाहती',
    ],
    SELF_HARM: [
        'cut myself', 'cutting myself', 'hurt myself', 'hurting myself', 'harm myself', 'harming myself',
        'self harm', 'burn myself', 'burning myself',
        'khud ko hurt', 'apne aap ko nuksan',
    ],
    OVERDOSE: [
        'overdose', 'overdosed', 'took too many pills', 'swallowed all my pills', 'take all my pills',
        'taking all my pills',
    ],
    ABUSE: [
        'hit me', 'hits me', 'beating me', 'beats me', 'abuse', 'abused', 'abusing me', 'scared of him',
        'scared of her', 'raped', 'sexually assaulted',
    ],
    VIOLENCE: [
        'kill him', 'kill her', 'kill them', 'hurt them', 'hurt him', 'hurt her', 'shoot him',
        'shoot her', 'shoot them', 'want to kill someone',
    ],
}
