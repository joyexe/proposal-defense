from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Admin'),
        ('faculty', 'Faculty'),
        ('clinic', 'Clinic'),
        ('counselor', 'Counselor'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    full_name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    residential = models.CharField(max_length=255, blank=True, null=True)
    permanent = models.CharField(max_length=255, blank=True, null=True)
    guardian_email = models.EmailField(blank=True, null=True)
    student_id = models.CharField(max_length=50, blank=True, null=True)
    grade = models.CharField(max_length=100, blank=True, null=True)
    section = models.CharField(max_length=100, blank=True, null=True)
    faculty_id = models.CharField(max_length=50, blank=True, null=True)
    accepted_terms = models.BooleanField(default=False)
    
    def __str__(self):
        return self.username