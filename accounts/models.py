# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Define roles
    GENERAL_USER = 'GENERAL_USER'
    COUNSELOR = 'COUNSELOR'
    THERAPIST = 'THERAPIST'
    
    ROLE_CHOICES = [
        (GENERAL_USER, 'General User'),
        (COUNSELOR, 'Counselor'),
        (THERAPIST, 'Therapist'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=GENERAL_USER)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = 'Seeker User'
        verbose_name_plural = 'Seeker Users'