# helpline/models.py
from django.db import models


class HelplineCategory(models.Model):
    CRISIS = 'CRISIS'
    SUICIDE = 'SUICIDE'
    DOMESTIC = 'DOMESTIC'
    LGBTQ = 'LGBTQ'
    SUBSTANCE = 'SUBSTANCE'
    OTHER = 'OTHER'

    NAME_CHOICES = [
        (CRISIS, 'Crisis'),
        (SUICIDE, 'Suicide Prevention'),
        (DOMESTIC, 'Domestic Violence'),
        (LGBTQ, 'LGBTQ+'),
        (SUBSTANCE, 'Substance Abuse'),
        (OTHER, 'Other'),
    ]

    name = models.CharField(max_length=50, choices=NAME_CHOICES, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.get_name_display()

    class Meta:
        verbose_name = 'Helpline Category'
        verbose_name_plural = 'Helpline Categories'


class HelplineEntry(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50)
    region = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(
        HelplineCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='entries'
    )
    is_24_7 = models.BooleanField(default=False)
    language = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.phone}"

    class Meta:
        verbose_name = 'Helpline Entry'
        verbose_name_plural = 'Helpline Entries'
