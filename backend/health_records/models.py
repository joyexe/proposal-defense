from django.db import models
from website.models import User

# Create your models here.

class PermitRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('completed', 'Completed'),
    ]
    
    OUTCOME_CHOICES = [
        ('back_to_class', 'Back to Class'),
        ('send_home', 'Send Home'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permit_requests')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teacher_permit_requests', null=True, blank=True)
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='provider_permit_requests', null=True, blank=True)
    
    date = models.DateField()
    time = models.TimeField()
    grade = models.CharField(max_length=100)
    section = models.CharField(max_length=100)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Additional fields for tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Fields for faculty decision
    faculty_decision = models.CharField(max_length=20, choices=STATUS_CHOICES, null=True, blank=True)
    faculty_decision_at = models.DateTimeField(null=True, blank=True)
    faculty_decision_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='faculty_decisions')
    
    # Fields for clinic assessment
    vital_signs_bp = models.CharField(max_length=50, null=True, blank=True)
    vital_signs_temp = models.CharField(max_length=50, null=True, blank=True)
    vital_signs_pr = models.CharField(max_length=50, null=True, blank=True)
    vital_signs_spo2 = models.CharField(max_length=50, null=True, blank=True)
    nursing_intervention = models.TextField(null=True, blank=True)
    diagnosis_code = models.CharField(max_length=20, blank=True, null=True)  # ICD-11 diagnosis code
    diagnosis_name = models.CharField(max_length=255, blank=True, null=True)  # ICD-11 diagnosis name
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, null=True, blank=True)
    outcome_date = models.DateField(null=True, blank=True)
    outcome_time = models.TimeField(null=True, blank=True)
    parent_email = models.EmailField(null=True, blank=True, verbose_name="Parent/Guardian Email")
    clinic_assessment_at = models.DateTimeField(null=True, blank=True)
    clinic_assessment_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clinic_assessments')
    
    # Field for tracking student notification views
    student_viewed_at = models.DateTimeField(null=True, blank=True)
    
    # Field for tracking faculty notification views
    faculty_viewed_at = models.DateTimeField(null=True, blank=True)
    
    # Field for tracking clinic notification views
    clinic_viewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Permit Request - {self.student.full_name} - {self.date}"

class RecentActivity(models.Model):
    ACTIVITY_TYPES = [
        ('appointment_completed', 'Appointment Completed'),
        ('appointment_in_progress', 'Appointment In Progress'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('permit_back_to_class', 'Permit Back to Class'),
        ('permit_send_home', 'Permit Send Home'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    title = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    related_appointment = models.ForeignKey('appointments.Appointment', on_delete=models.CASCADE, null=True, blank=True)
    related_permit = models.ForeignKey(PermitRequest, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Recent Activities'
    
    def __str__(self):
        return f"{self.user.full_name} - {self.get_activity_type_display()} - {self.created_at}"
