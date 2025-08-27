from django.urls import path
from .views import SystemSettingView

urlpatterns = [
    path('system/', SystemSettingView.as_view(), name='system-settings'),
] 