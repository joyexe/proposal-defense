from django.db import models
from django.conf import settings
from django.utils import timezone

# Create your models here.

class WellnessProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wellness_profile')
    xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    stage = models.CharField(max_length=32, default='Egg Stage')
    last_login_date = models.DateField(null=True, blank=True)
    day_streak = models.PositiveIntegerField(default=0)
    best_streak = models.PositiveIntegerField(default=0)
    last_streak_reset = models.DateField(null=True, blank=True)

    def add_xp(self, amount):
        self.xp += amount
        # Level up logic: Level 1 (0-999 XP), Level 2 (1000+ XP)
        if self.xp >= 1000 and self.level < 2:
            self.level = 2
            self.stage = 'Caterpillar Stage'
        elif self.xp < 1000:
            self.level = 1
            self.stage = 'Egg Stage'
        self.save()

    def calculate_best_streak(self):
        from .models import DailyTask
        # Get all dates with completed daily tasks for this user
        completed_dates = DailyTask.objects.filter(user=self.user, completed=True).values_list('date', flat=True).distinct()
        if not completed_dates:
            self.best_streak = 0
            self.save()
            return 0
        # Convert to sorted list of date objects
        dates = sorted([d for d in completed_dates])
        best = 1
        current = 1
        for i in range(1, len(dates)):
            if (dates[i] - dates[i-1]).days == 1:
                current += 1
                if current > best:
                    best = current
            else:
                current = 1
        self.best_streak = min(best, 7)
        self.save()
        return self.best_streak

    def calculate_day_streak(self):
        from .models import DailyTask
        from django.utils import timezone
        today = timezone.now().date()
        # Get all unique dates with completed daily tasks for this user, up to today
        completed_dates = set(DailyTask.objects.filter(user=self.user, completed=True, date__lte=today).values_list('date', flat=True))
        if not completed_dates:
            self.day_streak = 0
            self.last_streak_reset = None
            self.save()
            return 0
        streak = 0
        for i in range(0, 7):
            day = today - timezone.timedelta(days=i)
            if day in completed_dates:
                streak += 1
            else:
                break
        self.day_streak = streak
        # Find the last reset date (the day before the current streak started)
        if streak > 0:
            self.last_streak_reset = today - timezone.timedelta(days=streak)
        else:
            self.last_streak_reset = today
        self.save()
        return streak

    def __str__(self):
        return f"{self.user.username} Wellness Profile"

class DailyTask(models.Model):
    TASK_CHOICES = [
        ("Mindful Meditation", "Mindful Meditation"),
        ("Active Achievement", "Active Achievement"),
        ("Hydration Goal", "Hydration Goal"),
        ("Mood Check-In", "Mood Check-In"),
        ("Gratitude Practice", "Gratitude Practice"),
        ("Nature Connection", "Nature Connection"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_tasks')
    task = models.CharField(max_length=32, choices=TASK_CHOICES)
    date = models.DateField(default=timezone.now)
    completed = models.BooleanField(default=False)
    xp = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "task", "date")

    def __str__(self):
        return f"{self.user.username} - {self.task} ({self.date})"

class WeeklyGoal(models.Model):
    GOAL_CHOICES = [
        ("Meditation Master", "Meditation Master"),
        ("Active Lifestyle", "Active Lifestyle"),
        ("Transformation Seeker", "Transformation Seeker"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='weekly_goals')
    goal = models.CharField(max_length=32, choices=GOAL_CHOICES)
    week_start = models.DateField()
    progress = models.PositiveIntegerField(default=0)
    target = models.PositiveIntegerField(default=1)
    completed = models.BooleanField(default=False)
    xp = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("user", "goal", "week_start")

    def __str__(self):
        return f"{self.user.username} - {self.goal} ({self.week_start})"

class Achievement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=64)
    description = models.TextField(blank=True)
    date_earned = models.DateTimeField(default=timezone.now)  # allow editing in admin

    class Meta:
        ordering = ['-date_earned']

    def __str__(self):
        return f"{self.user.username} - {self.title}"
