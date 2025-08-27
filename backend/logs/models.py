from django.db import models
from django.conf import settings

class SystemLog(models.Model):
    datetime = models.DateTimeField(auto_now_add=True)
    user = models.CharField(max_length=128)
    role = models.CharField(max_length=64)
    action = models.CharField(max_length=128)
    target = models.CharField(max_length=128)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-datetime']

    def __str__(self):
        return f"{self.datetime} - {self.user} - {self.action}"
