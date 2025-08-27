from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import BulletinPost
from .serializers import BulletinPostSerializer
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
import os

# Create your views here.

class BulletinPostViewSet(viewsets.ModelViewSet):
    queryset = BulletinPost.objects.all()
    serializer_class = BulletinPostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = BulletinPost.objects.all()
        user = self.request.user
        now = timezone.now()
        # Auto-archive posts whose end_date is in the past
        queryset.filter(status='Posted', end_date__lt=now).update(status='Archived')
        # Filter by post type based on user role
        if hasattr(user, 'role'):
            if user.role == 'clinic':
                queryset = queryset.filter(post_type='Physical')
            elif user.role == 'counselor':
                queryset = queryset.filter(post_type='Mental')
            # For students, show all posts (do not filter by status)
            # elif user.role == 'student':
            #     queryset = queryset.filter(status='Posted')
        
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'role'):
            if user.role == 'clinic':
                post_type = 'Physical'
            elif user.role == 'counselor':
                post_type = 'Mental'
            else:
                post_type = serializer.validated_data.get('post_type', 'Physical')
        else:
            post_type = serializer.validated_data.get('post_type', 'Physical')
        status = self.request.data.get('status', 'Posted')
        serializer.save(author=user, post_type=post_type, status=status)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        post = self.get_object()
        if post.status == 'Posted':
            post.status = 'Archived'
        else:
            post.status = 'Posted'
        post.save()
        return Response({'status': post.status})

    @action(detail=False, methods=['get'])
    def active_posts(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            status='Posted',
            end_date__gt=now
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class BulletinImageUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = []  # Allow unauthenticated access for image upload

    def post(self, request, format=None):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
        filename = default_storage.save(f'bulletin_images/{file_obj.name}', file_obj)
        file_url = os.path.join(settings.MEDIA_URL, filename)
        return Response({'url': file_url}, status=status.HTTP_201_CREATED)
