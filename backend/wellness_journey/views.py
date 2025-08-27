from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Sum
from .models import WellnessProfile, DailyTask, WeeklyGoal, Achievement
from .serializers import WellnessProfileSerializer, DailyTaskSerializer, WeeklyGoalSerializer, AchievementSerializer
from rest_framework.settings import api_settings

# Create your views here.

class WellnessProfileViewSet(viewsets.ModelViewSet):
    queryset = WellnessProfile.objects.all()
    serializer_class = WellnessProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WellnessProfile.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        profile, created = WellnessProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class DailyTaskViewSet(viewsets.ModelViewSet):
    queryset = DailyTask.objects.all()
    serializer_class = DailyTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        today = timezone.now().date()
        # Ensure all 6 daily tasks exist for the user for today
        task_defs = [
            ("Mindful Meditation", 10),
            ("Active Achievement", 20),
            ("Hydration Goal", 5),
            ("Mood Check-In", 8),
            ("Gratitude Practice", 12),
            ("Nature Connection", 10),
        ]
        for task_name, xp in task_defs:
            DailyTask.objects.get_or_create(
                user=self.request.user,
                task=task_name,
                date=today,
                defaults={"xp": xp}
            )
        return DailyTask.objects.filter(user=self.request.user, date=today)

    @action(detail=False, methods=['post'])
    def complete(self, request):
        task_id = request.data.get('id')
        try:
            task = DailyTask.objects.get(id=task_id, user=request.user)
            if not task.completed:
                task.completed = True
                task.save()
                # Add XP to profile
                profile, _ = WellnessProfile.objects.get_or_create(user=request.user)
                profile.add_xp(task.xp)
                # Update last_login_date
                today = timezone.now().date()
                profile.last_login_date = today
                # Calculate day streak
                yesterday = today - timezone.timedelta(days=1)
                if profile.last_login_date == yesterday:
                    profile.day_streak += 1
                elif profile.last_login_date != today:
                    profile.day_streak = 1
                    profile.last_streak_reset = today
                # Update best streak
                if profile.day_streak > profile.best_streak:
                    profile.best_streak = profile.day_streak
                profile.save()
                # Update best streak using frontend logic
                profile.calculate_best_streak()
                # Update day streak and last streak reset using frontend logic
                profile.calculate_day_streak()
                # Always create a new achievement entry
                Achievement.objects.create(user=request.user, title=task.task, description=f'Completed {task.task} on {timezone.now().date()}')
            return Response({'status': 'completed'})
        except DailyTask.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

class WeeklyGoalViewSet(viewsets.ModelViewSet):
    queryset = WeeklyGoal.objects.all()
    serializer_class = WeeklyGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        week_start = timezone.now().date() - timezone.timedelta(days=timezone.now().date().weekday())
        # Define the weekly goals, targets, and XP
        goal_defs = [
            ("Meditation Master", 5, 50),
            ("Active Lifestyle", 4, 60),
            ("Transformation Seeker", 10, 120),
        ]
        # Ensure all 3 weekly goals exist for the user for the current week
        for goal_name, target, xp in goal_defs:
            WeeklyGoal.objects.get_or_create(
                user=self.request.user,
                goal=goal_name,
                week_start=week_start,
                defaults={"target": target, "xp": xp, "progress": 0, "completed": False}
            )
        return WeeklyGoal.objects.filter(user=self.request.user, week_start=week_start)

    @action(detail=False, methods=['post'])
    def progress(self, request):
        goal_id = request.data.get('id')
        try:
            goal = WeeklyGoal.objects.get(id=goal_id, user=request.user)
            if not goal.completed:
                goal.progress += 1
                if goal.progress >= goal.target:
                    goal.completed = True
                    # Add XP to profile
                    profile, _ = WellnessProfile.objects.get_or_create(user=request.user)
                    profile.add_xp(goal.xp)
                    # Achievement: always create a new one for each week
                    achievement = Achievement.objects.create(
                        user=request.user,
                        title=goal.goal,
                        description=f'Achieved {goal.goal} for the week starting {goal.week_start}.'
                    )
                goal.save()
            return Response({'status': 'progressed'})
        except WeeklyGoal.DoesNotExist:
            return Response({'error': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)

class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Disable pagination for achievements

    def get_queryset(self):
        return Achievement.objects.filter(user=self.request.user).order_by('-date_earned')

    # Custom endpoint to return all achievements for the user, no pagination
    @action(detail=False, methods=['get'])
    def all(self, request):
        achievements = Achievement.objects.filter(user=request.user).order_by('-date_earned')
        serializer = self.get_serializer(achievements, many=True)
        return Response(serializer.data)
