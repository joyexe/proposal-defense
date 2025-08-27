from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Availability(models.Model):
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField(null=True, blank=True)  # If per-day, else leave null for recurring
    time = models.TimeField()
    available = models.BooleanField(default=True)

    class Meta:
        unique_together = ('provider', 'time')
        ordering = ['provider', 'date', 'time']

    def __str__(self):
        return f"{self.provider} - {self.date} {self.time} ({'Available' if self.available else 'Unavailable'})"

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    SERVICE_TYPE_CHOICES = [
        ('physical', 'Physical Health'),
        ('mental', 'Mental Health'),
    ]
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='provided_appointments')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField()
    time = models.TimeField()
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    reason = models.TextField(blank=True)  # Reason for appointment visit from client
    documentation = models.TextField(blank=True)  # Provider's documentation/notes
    diagnosis_code = models.CharField(max_length=20, blank=True, null=True)  # ICD-11 diagnosis code
    diagnosis_name = models.CharField(max_length=255, blank=True, null=True)  # ICD-11 diagnosis name
    confidence_score = models.FloatField(blank=True, null=True)  # Confidence score for diagnosis
    risk_level = models.CharField(max_length=20, blank=True, null=True, choices=[
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
    ])  # Risk level for mental health appointments
    referral = models.CharField(max_length=255, blank=True)  # e.g. 'Direct', 'From Counselor Johnson'
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Notification tracking fields
    student_viewed_at = models.DateTimeField(null=True, blank=True)
    faculty_viewed_at = models.DateTimeField(null=True, blank=True)
    clinic_viewed_at = models.DateTimeField(null=True, blank=True)
    counselor_viewed_at = models.DateTimeField(null=True, blank=True)
    
    # Reminder notification tracking fields
    client_reminder_sent_at = models.DateTimeField(null=True, blank=True)
    provider_reminder_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f"{self.date} {self.time} | {self.client} with {self.provider} ({self.get_service_type_display()})"
