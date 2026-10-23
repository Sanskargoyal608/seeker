from helpline.defaults import FALLBACK
from helpline.models import HelplineEntry

CRISIS_CATEGORIES = ('CRISIS', 'SUICIDE')
MAX_SHOWN = 4


def get_crisis_helplines():
    """
    The numbers to show someone who may be in crisis: crisis and suicide-prevention
    lines first (24x7 ones before others), from the helpline table that staff
    maintain. If the table has none, a built-in minimum is returned, so a person in
    distress never sees an empty list.
    """
    entries = (
        HelplineEntry.objects.filter(category__name__in=CRISIS_CATEGORIES)
        .select_related('category')
        .order_by('-is_24_7', 'category__name', 'name')[:MAX_SHOWN]
    )
    result = [
        {'name': e.name, 'phone': e.phone, 'is_24_7': e.is_24_7, 'description': e.description}
        for e in entries
    ]
    return result or list(FALLBACK)
