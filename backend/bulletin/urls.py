from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BulletinPostViewSet, BulletinImageUploadView

router = DefaultRouter()
router.register(r'posts', BulletinPostViewSet, basename='bulletin-post')

urlpatterns = [
    path('', include(router.urls)),
    path('upload-image/', BulletinImageUploadView.as_view(), name='bulletin-image-upload'),
] 