# helpline/admin.py
from django.contrib import admin
from .models import HelplineCategory, HelplineEntry


@admin.register(HelplineCategory)
class HelplineCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(HelplineEntry)
class HelplineEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'category', 'region', 'is_24_7', 'created_at')
    list_filter = ('category', 'is_24_7', 'created_at')
    search_fields = ('name', 'phone', 'region', 'language')
