from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, InventoryLogViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'logs', InventoryLogViewSet, basename='inventorylog')

urlpatterns = [
    path('', include(router.urls)),
] 