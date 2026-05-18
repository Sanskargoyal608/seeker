from django.contrib import admin
from .models import PlaceholderUser


@admin.register(PlaceholderUser)
class PlaceholderUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name',
                    'is_active', 'created_at')
