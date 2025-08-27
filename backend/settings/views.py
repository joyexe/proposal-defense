from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SystemSetting
from .serializers import SystemSettingSerializer

# Create your views here.

class SystemSettingView(APIView):
    def get(self, request, *args, **kwargs):
        # Get the first setting object, or create it if it doesn't exist
        settings, created = SystemSetting.objects.get_or_create(pk=1)
        serializer = SystemSettingSerializer(settings)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        settings, created = SystemSetting.objects.get_or_create(pk=1)
        serializer = SystemSettingSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
