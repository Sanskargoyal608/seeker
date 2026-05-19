# accounts/permissions.py
from rest_framework.permissions import IsAuthenticated
from accounts.models import User


class IsGeneralUser(IsAuthenticated):
    """
    Permission to check if user is a general user.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.GENERAL_USER


class IsGraduateCounselor(IsAuthenticated):
    """
    Permission to check if user is a graduate counselor.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.COUNSELOR


class IsLicensedTherapist(IsAuthenticated):
    """
    Permission to check if user is a licensed therapist.
    """

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.THERAPIST


class IsVerified(IsAuthenticated):
    """
    Permission to check if provider (counselor/therapist) is verified.
    Only applies to COUNSELOR and THERAPIST roles.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.user.role == User.GENERAL_USER:
            return True

        if request.user.role == User.COUNSELOR:
            try:
                return request.user.counselor_profile.is_verified
            except:
                return False

        if request.user.role == User.THERAPIST:
            try:
                return request.user.therapist_profile.is_verified
            except:
                return False

        return False
