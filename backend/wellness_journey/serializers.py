from rest_framework import serializers
from .models import WellnessProfile, DailyTask, WeeklyGoal, Achievement

class WellnessProfileSerializer(serializers.ModelSerializer):
    week_streak = serializers.SerializerMethodField()

    class Meta:
        model = WellnessProfile
        fields = '__all__'
        extra_fields = ['week_streak']

    def get_week_streak(self, obj):
        from django.utils import timezone
        from .models import DailyTask
        user = obj.user
        today = timezone.now().date()
        monday = today - timezone.timedelta(days=today.weekday())
        streak = 0
        for i in range(0, today.weekday() + 1):
            day = monday + timezone.timedelta(days=i)
            if DailyTask.objects.filter(user=user, date=day, completed=True).exists():
                streak += 1
        return streak

class DailyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTask
        fields = '__all__'

class WeeklyGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyGoal
        fields = '__all__'

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__' 