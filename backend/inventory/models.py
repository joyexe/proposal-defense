from django.db import models
from django.contrib.auth import get_user_model

class InventoryItem(models.Model):
    name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0)
    date_received = models.DateField()
    notes = models.TextField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class InventoryLog(models.Model):
    ACTION_CHOICES = [
        ("Added", "Added"),
        ("Used", "Used"),
        ("Updated", "Updated"),
        ("Removed", "Removed"),
    ]
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name="logs")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    quantity = models.IntegerField()
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    logged_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.item.name} - {self.action} ({self.quantity})"
