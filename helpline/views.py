from rest_framework import viewsets, permissions
from .models import HelplineEntry, HelplineCategory
from .serializers import HelplineEntrySerializer, HelplineCategorySerializer

class HelplineEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly accessible list of helpline entries.
    """
    queryset = HelplineEntry.objects.select_related('category').all()
    serializer_class = HelplineEntrySerializer
    permission_classes = [permissions.AllowAny]

class HelplineCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly accessible list of helpline categories.
    """
    queryset = HelplineCategory.objects.all()
    serializer_class = HelplineCategorySerializer
    permission_classes = [permissions.AllowAny]
