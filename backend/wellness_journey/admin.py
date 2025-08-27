from django.contrib import admin
from .models import WellnessProfile, DailyTask, WeeklyGoal, Achievement

class WellnessProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'xp', 'level', 'stage', 'last_login_date', 'day_streak', 'best_streak', 'last_streak_reset')
    fields = ('user', 'xp', 'level', 'stage', 'last_login_date', 'day_streak', 'best_streak', 'last_streak_reset')
    search_fields = ('user__username', 'user__full_name')
    list_filter = ('level', 'stage')

class DailyTaskAdmin(admin.ModelAdmin):
    list_display = ('user', 'task', 'date', 'completed', 'xp')
    list_filter = ('task', 'completed', 'date')
    search_fields = ('user__username', 'user__full_name', 'task')
    date_hierarchy = 'date'

class WeeklyGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'goal', 'week_start', 'progress', 'target', 'completed', 'xp')
    list_filter = ('goal', 'completed', 'week_start')
    search_fields = ('user__username', 'user__full_name', 'goal')
    date_hierarchy = 'week_start'

class AchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'date_earned')
    list_filter = ('date_earned',)
    search_fields = ('user__username', 'user__full_name', 'title', 'description')
    date_hierarchy = 'date_earned'

admin.site.register(WellnessProfile, WellnessProfileAdmin)
admin.site.register(DailyTask, DailyTaskAdmin)
admin.site.register(WeeklyGoal, WeeklyGoalAdmin)
admin.site.register(Achievement, AchievementAdmin)
