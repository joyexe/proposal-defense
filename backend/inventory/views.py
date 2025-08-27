from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import InventoryItem, InventoryLog
from .serializers import InventoryItemSerializer, InventoryLogSerializer

# Create your views here.

class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-last_updated')
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names = ['get', 'post', 'put', 'patch']

class InventoryLogViewSet(viewsets.ModelViewSet):
    queryset = InventoryLog.objects.select_related('item', 'logged_by').all().order_by('-date')
    serializer_class = InventoryLogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names = ['get', 'post']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('logged_by') and self.request.user.is_authenticated:
            serializer.save(logged_by=self.request.user)
        else:
            serializer.save()
