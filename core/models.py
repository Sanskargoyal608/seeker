from django.db import models


class PlaceholderSession(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Placeholder Session'
