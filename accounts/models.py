from django.db import models
from django.contrib.auth.models import AbstractUser


class PlaceholderUser(AbstractUser):
    """
    Custom User model for Seeker platform.
    Placeholder for Phase 1, will be extended with domain-specific fields in later phases.
    Inherits all required User fields from AbstractUser.
    """
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'Seeker User'
        verbose_name_plural = 'Seeker Users'
