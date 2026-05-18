from django.db import models


class HelplineEntry(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50)
    region = models.CharField(max_length=200, blank=True)
    is_24_7 = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.phone}"
