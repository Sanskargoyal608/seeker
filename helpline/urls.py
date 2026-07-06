from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HelplineEntryViewSet, HelplineCategoryViewSet

router = DefaultRouter()
router.register(r'entries', HelplineEntryViewSet, basename='helpline-entry')
router.register(r'categories', HelplineCategoryViewSet, basename='helpline-category')

urlpatterns = [
    path('', include(router.urls)),
]
