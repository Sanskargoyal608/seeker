# notifications/admin.py
from django.contrib import admin
from .models import UserDevice


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'platform', 'is_active', 'created_at', 'updated_at')
    list_filter = ('platform', 'is_active', 'created_at')
    search_fields = ('user__email', 'fcm_token')
