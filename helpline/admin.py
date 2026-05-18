from django.contrib import admin
from .models import HelplineEntry


@admin.register(HelplineEntry)
class HelplineEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'region', 'is_24_7', 'created_at')
