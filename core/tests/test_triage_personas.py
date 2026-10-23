"""
Triage accuracy check against 65 scripted personas (opt-in, calls OpenAI for real).

    RUN_PERSONA_EVAL=1 pytest core/tests/test_triage_personas.py -s

Skipped in normal runs and in CI. It uses the pytest test database (nothing in
your dev database is touched) and the OPENAI_API_KEY from .env.local. Each
persona's messages are replayed in order from triage_personas.json; the AI's
follow-up questions may differ from the original run, so when a persona runs out of
messages, up to three neutral fillers are sent; still unfinished = "incomplete".

Writes a report to triage_persona_report.json (git-ignored) in the repo root.
"""
import json
import os
import time
from collections import Counter
from pathlib import Path

import pytest

from accounts.models import User
from accounts.tests.factories import UserFactory
from core.models import CrisisAlert
from core.services.triage_service import TriageService

pytestmark = pytest.mark.skipif(
    os.getenv('RUN_PERSONA_EVAL') != '1',
    reason='opt-in: set RUN_PERSONA_EVAL=1 (calls OpenAI and costs a little API credit)',
)

PERSONAS = json.loads((Path(__file__).parent / 'triage_personas.json').read_text(encoding='utf-8'))
# The original runs called the counselor route PEER_SUPPORT; the service now says GRADUATE_COUNSELOR.
for _p in PERSONAS:
    if _p['expected'] == 'PEER_SUPPORT':
        _p['expected'] = 'GRADUATE_COUNSELOR'

# Most personas have a single scripted message. If the AI is still asking questions
# when they run out, answer like a person who has nothing more to add, so "never
# finishes" shows up as a real problem instead of a harness limit.
FILLERS = ["I'm not sure what else to say.", "That's pretty much it.", "Yes, that's right."]
REPORT = Path(__file__).resolve().parents[2] / 'triage_persona_report.json'


def run_persona(persona):
    user = UserFactory(role=User.GENERAL_USER)
    service = TriageService()
    triage = service.start_triage(user)
    used = 0
    for message in list(persona['user_messages']) + FILLERS:
        if triage.is_complete:
            break
        triage = service.process_response(triage.id, message)
        used += 1
    triage.refresh_from_db()
    return {
        'id': persona['id'],
        'name': persona['name'],
        'expected': persona['expected'],
        'routing': triage.routing_decision or None,
        'complete': triage.is_complete,
        'turns_used': used,
        'messages_available': len(persona['user_messages']),
        'urgency': triage.urgency,
        'crisis_flags': triage.crisis_flags,
        'crisis_alerts': CrisisAlert.objects.filter(user=user).count(),
        'complaint': triage.chief_complaint,
    }


@pytest.mark.django_db
def test_persona_accuracy():
    results = []
    for persona in PERSONAS:
        started = time.time()
        try:
            r = run_persona(persona)
        except Exception as exc:  # a crash is a result, not a reason to stop the run
            r = {'id': persona['id'], 'name': persona['name'], 'expected': persona['expected'],
                 'routing': None, 'complete': False, 'error': repr(exc)}
        r['seconds'] = round(time.time() - started, 1)
        r['correct'] = bool(r.get('complete') and r.get('routing') == r['expected'])
        results.append(r)
        print(f"#{r['id']:>2} {r['name'][:32]:<32} expected={r['expected']:<18} got={str(r.get('routing')):<18} "
              f"{'OK ' if r['correct'] else 'BAD'} {r['seconds']}s", flush=True)
        REPORT.write_text(json.dumps(results, indent=1), encoding='utf-8')

    done = [r for r in results if r.get('complete')]
    wrong = [r for r in done if r['routing'] != r['expected']]
    incomplete = [r for r in results if not r.get('complete')]
    crisis_like = [r for r in results if r['crisis_alerts']]
    summary = {
        'personas': len(results),
        'correct': sum(r['correct'] for r in results),
        'completed': len(done),
        'wrong_routing': len(wrong),
        'over_routed_to_therapist': sum(1 for r in wrong if r['routing'] == 'LICENSED_THERAPIST'),
        'under_routed_to_counselor': sum(1 for r in wrong if r['routing'] == 'GRADUATE_COUNSELOR'),
        'incomplete': len(incomplete),
        'errors': sum(1 for r in results if r.get('error')),
        'staff_alerts_raised_for_personas': len(crisis_like),
        'by_urgency': dict(Counter((r.get('urgency') or 'none') for r in results)),
    }
    print('\nSUMMARY', json.dumps(summary, indent=1))
    REPORT.write_text(json.dumps({'summary': summary, 'results': results}, indent=1), encoding='utf-8')
