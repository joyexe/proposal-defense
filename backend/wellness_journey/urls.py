from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WellnessProfileViewSet, DailyTaskViewSet, WeeklyGoalViewSet, AchievementViewSet

router = DefaultRouter()
router.register(r'profile', WellnessProfileViewSet, basename='wellnessprofile')
router.register(r'daily-tasks', DailyTaskViewSet, basename='dailytask')
router.register(r'weekly-goals', WeeklyGoalViewSet, basename='weeklygoal')
router.register(r'achievements', AchievementViewSet, basename='achievement')

urlpatterns = [
    path('', include(router.urls)),
] 