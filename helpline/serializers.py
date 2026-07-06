from rest_framework import serializers
from .models import HelplineCategory, HelplineEntry

class HelplineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HelplineCategory
        fields = ['id', 'name', 'description', 'icon']

class HelplineEntrySerializer(serializers.ModelSerializer):
    category = HelplineCategorySerializer(read_only=True)

    class Meta:
        model = HelplineEntry
        fields = [
            'id', 'name', 'phone', 'region', 'category',
            'is_24_7', 'language', 'description', 'created_at'
        ]
