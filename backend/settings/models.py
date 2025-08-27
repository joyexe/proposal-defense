from django.db import models

# Create your models here.

class SystemSetting(models.Model):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
    ]
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')

    def __str__(self):
        return "System Settings"

    class Meta:
        verbose_name_plural = "System Settings"
