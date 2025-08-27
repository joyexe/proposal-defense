from django.db import models
from django.conf import settings

class MoodEntry(models.Model):
    MOOD_CHOICES = [
        ('happy', 'Happy'),
        ('good', 'Good'),
        ('neutral', 'Neutral'),
        ('sad', 'Sad'),
        ('angry', 'Angry'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    answer_1 = models.PositiveSmallIntegerField(null=True, blank=True)
    answer_2 = models.PositiveSmallIntegerField(null=True, blank=True)
    answer_3 = models.PositiveSmallIntegerField(null=True, blank=True)
    recommendation = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        verbose_name = "Mood entry"
        verbose_name_plural = "Mood entries"

    def __str__(self):
        return f"{self.user} - {self.date} - {self.get_mood_display()}"

    def majority_score(self):
        scores = [self.answer_1, self.answer_2, self.answer_3]
        high = sum(1 for s in scores if s is not None and s >= 4)
        low = sum(1 for s in scores if s is not None and s <= 3)
        return 'high' if high >= 2 else 'low'
