from helpline.crisis_support import get_crisis_helplines

SUPPORT_MESSAGE = (
    "You are not alone, and what you are feeling matters. Our support team has been told "
    "and will look at this. If you are in immediate danger, please call 112 now. "
    "You can also speak to someone right away on one of these free lines."
)


def support_payload():
    """What a person who may be in crisis is shown: a calm message plus real numbers."""
    return {'message': SUPPORT_MESSAGE, 'helplines': get_crisis_helplines()}
