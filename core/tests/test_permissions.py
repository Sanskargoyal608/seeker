import pytest
from unittest.mock import Mock
from accounts.models import User
from core.permissions import IsNoteOwnerOrTherapist

class DummyRequest:
    def __init__(self, user):
        self.user = user

class DummyNote:
    def __init__(self, author, session):
        self.author = author
        self.session = session

class DummySession:
    def __init__(self, therapist):
        self.therapist = therapist

class DummyTherapistProfile:
    pass

def test_permissions():
    perm = IsNoteOwnerOrTherapist()
    
    # Unauthenticated
    req = DummyRequest(Mock(is_authenticated=False))
    assert not perm.has_permission(req, None)
    
    # General User
    gen_user = Mock(is_authenticated=True, role=User.GENERAL_USER)
    assert not perm.has_permission(DummyRequest(gen_user), None)
    assert not perm.has_object_permission(DummyRequest(gen_user), None, None)
    
    # Counselor Owner
    couns_user = Mock(is_authenticated=True, role=User.COUNSELOR)
    note = DummyNote(author=couns_user, session=None)
    assert perm.has_object_permission(DummyRequest(couns_user), None, note)
    
    # Counselor Not Owner
    couns_user2 = Mock(is_authenticated=True, role=User.COUNSELOR)
    assert not perm.has_object_permission(DummyRequest(couns_user2), None, note)
    
    # Therapist in session
    tp = DummyTherapistProfile()
    therapist_user = Mock(is_authenticated=True, role=User.THERAPIST, therapist_profile=tp)
    session = DummySession(therapist=tp)
    note2 = DummyNote(author=couns_user, session=session)
    assert perm.has_object_permission(DummyRequest(therapist_user), None, note2)
    
    # Therapist NOT in session
    tp2 = DummyTherapistProfile()
    therapist_user2 = Mock(is_authenticated=True, role=User.THERAPIST, therapist_profile=tp2)
    assert not perm.has_object_permission(DummyRequest(therapist_user2), None, note2)
    
    # Other role
    other_user = Mock(is_authenticated=True, role="ADMIN")
    assert not perm.has_object_permission(DummyRequest(other_user), None, note2)
