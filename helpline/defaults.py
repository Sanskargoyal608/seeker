"""
India national helpline set shown to people in crisis.

!! VERIFY EVERY NUMBER before real users rely on it (numbers and hours change).
!! Staff can correct, add or remove entries in Django Admin at any time; this list
!! only seeds an empty table and is the last-resort fallback if the table is empty.
"""

# (name, phone, category, is_24_7, language, description)
INDIA_HELPLINES = [
    ('Emergency services', '112', 'CRISIS', True, 'All',
     'National emergency number (police, ambulance, fire).'),
    ('Tele-MANAS', '14416', 'SUICIDE', True, 'English, Hindi and regional languages',
     'Government of India 24x7 tele mental health support. Also 1-800-891-4416.'),
    ('KIRAN Mental Health Helpline', '1800-599-0019', 'CRISIS', True, 'English, Hindi and regional languages',
     'Ministry of Social Justice and Empowerment 24x7 helpline.'),
    ('iCall', '9152987821', 'CRISIS', False, 'English, Hindi',
     'TISS psychosocial helpline. Mon-Sat, daytime hours.'),
    ('Women Helpline', '181', 'DOMESTIC', True, 'All',
     'Support for women facing violence or abuse.'),
    ('Childline', '1098', 'CRISIS', True, 'All',
     'Support for children and young people in distress.'),
]

CATEGORY_DESCRIPTIONS = {
    'CRISIS': 'Immediate support in a crisis.',
    'SUICIDE': 'Suicide prevention and emotional support.',
    'DOMESTIC': 'Domestic violence and abuse.',
}

# Shown when the helpline table has no usable crisis entries at all.
FALLBACK = [
    {'name': 'Emergency services', 'phone': '112', 'is_24_7': True,
     'description': 'National emergency number.'},
    {'name': 'Tele-MANAS', 'phone': '14416', 'is_24_7': True,
     'description': 'Free 24x7 mental health support.'},
]
