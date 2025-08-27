from django.db import models
from website.models import User

class MedicalExam(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_exams')
    
    # Raw OCR data
    raw_text = models.TextField(blank=True, null=True)
    processing_method = models.CharField(max_length=100, blank=True, null=True)
    extraction_timestamp = models.DateTimeField(null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Legacy fields (kept for backward compatibility)
    dob = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    civil_status = models.CharField(max_length=50, blank=True, null=True)
    telephone_number = models.CharField(max_length=50, blank=True, null=True)
    height = models.CharField(max_length=50, blank=True, null=True)
    weight = models.CharField(max_length=50, blank=True, null=True)
    blood_pressure = models.CharField(max_length=50, blank=True, null=True)
    pulse_rate = models.CharField(max_length=50, blank=True, null=True)
    temperature = models.CharField(max_length=50, blank=True, null=True)
    classification = models.CharField(max_length=50, blank=True, null=True)
    recommendation = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.full_name if self.student else 'Unknown Student'} - Medical Exam"

    @property
    def full_name(self):
        return self.student.full_name if self.student else ''
    
    @property
    def grade(self):
        return self.student.grade if self.student else ''
    
    @property
    def section(self):
        return self.student.section if self.student else ''

    class Meta:
        ordering = ['-created_at']