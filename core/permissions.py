from rest_framework import permissions
from accounts.models import User

class IsNoteOwnerOrTherapist(permissions.BasePermission):
    """
    Permission class to ensure that only the counselor who created the note
    or a licensed therapist assigned to the session can access it.
    General users are strictly blocked.
    """
    
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        # General users are NEVER allowed to access notes
        if request.user.role == User.GENERAL_USER:
            return False
            
        return True

    def has_object_permission(self, request, view, obj):
        # General users strictly blocked
        if request.user.role == User.GENERAL_USER:
            return False
            
        # If counselor, must be the author of the note
        if request.user.role == User.COUNSELOR:
            return obj.author == request.user
            
        # If therapist, they must be part of the session
        # or maybe we let any verified therapist access it?
        # The roadmap says "counselor who owns the note or therapist in the session"
        if request.user.role == User.THERAPIST:
            return obj.session.therapist == request.user.therapist_profile
            
        return False


def is_session_participant(user, session):
    """True if `user` is the seeker, the assigned counselor/therapist, or staff."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or session.user_id == user.id:
        return True
    counselor = getattr(user, 'counselor_profile', None)
    therapist = getattr(user, 'therapist_profile', None)
    return bool(
        (counselor and session.counselor_id == counselor.id)
        or (therapist and session.therapist_id == therapist.id)
    )


def is_session_provider(user, session):
    """True only for the assigned counselor/therapist (and staff), never the seeker."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    counselor = getattr(user, 'counselor_profile', None)
    therapist = getattr(user, 'therapist_profile', None)
    return bool(
        (counselor and session.counselor_id == counselor.id)
        or (therapist and session.therapist_id == therapist.id)
    )
