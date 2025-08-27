from django.db import models
from django.conf import settings
from django.utils import timezone

class ICD11Entity(models.Model):
    """Model to store ICD-11 entities from WHO API for local caching"""
    entity_id = models.CharField(max_length=50, unique=True, help_text="ICD-11 entity identifier")
    json_data = models.JSONField(default=dict, help_text="Raw API response from WHO ICD-11 API")
    last_updated = models.DateTimeField(auto_now=True, help_text="Last time this entity was updated")
    is_active = models.BooleanField(default=True, help_text="Whether this entity is still active")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'icd11_entities'
        ordering = ['-last_updated']
        indexes = [
            models.Index(fields=['entity_id']),
            models.Index(fields=['is_active']),
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        return f"ICD-11 Entity: {self.entity_id}"
    
    @property
    def is_stale(self) -> bool:
        """Check if entity data is stale (older than 7 days)"""
        return (timezone.now() - self.last_updated).days > 7

class ICD11Mapping(models.Model):
    """Enhanced model for ICD-11 mappings with local terms and NLP support"""
    code = models.CharField(max_length=20, unique=True, help_text="ICD-11 code")
    description = models.TextField(help_text="Official ICD-11 description")
    local_terms = models.JSONField(default=dict, help_text="Tagalog/English/Taglish terms mapping")
    confidence_score = models.FloatField(default=0.0, help_text="NLP confidence score")
    source = models.CharField(max_length=20, default='local', help_text="Source: local, api, hybrid")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'icd11_mappings'
        ordering = ['-confidence_score', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['source']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.code}: {self.description}"

class AnalyticsCache(models.Model):
    """Model to cache analytics data for performance optimization"""
    date = models.DateField(help_text="Date of the analytics data")
    icd_code = models.ForeignKey(ICD11Mapping, on_delete=models.CASCADE, related_name='analytics_cache')
    count = models.IntegerField(default=0, help_text="Number of cases for this ICD code on this date")
    trend_data = models.JSONField(default=dict, help_text="Pre-calculated trend analytics")
    source_type = models.CharField(max_length=20, default='combined', help_text="Source: appointment, health_record, combined")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytics_cache'
        unique_together = ('date', 'icd_code', 'source_type')
        ordering = ['-date', '-count']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['icd_code']),
            models.Index(fields=['source_type']),
            models.Index(fields=['count']),
        ]
    
    def __str__(self):
        return f"{self.date}: {self.icd_code.code} ({self.count} cases)"

class MentalHealthTrend(models.Model):
    """Model to store aggregated mental health trend data"""
    date = models.DateField()
    anxiety_count = models.IntegerField(default=0)
    depression_count = models.IntegerField(default=0)
    stress_count = models.IntegerField(default=0)
    general_wellness_count = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('date',)
        ordering = ['-date']
    
    def __str__(self):
        return f"Mental Health Trends - {self.date}"

class PhysicalHealthTrend(models.Model):
    """Model to store aggregated physical health trend data"""
    date = models.DateField()
    fever_count = models.IntegerField(default=0)
    headache_count = models.IntegerField(default=0)
    cough_count = models.IntegerField(default=0)
    stomach_pain_count = models.IntegerField(default=0)
    injury_count = models.IntegerField(default=0)
    respiratory_count = models.IntegerField(default=0)
    gastrointestinal_count = models.IntegerField(default=0)
    musculoskeletal_count = models.IntegerField(default=0)
    other_physical_count = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('date',)
        ordering = ['-date']
    
    def __str__(self):
        return f"Physical Health Trends - {self.date}"

class AnalyticsSnapshot(models.Model):
    """Model to store periodic analytics snapshots for performance"""
    SNAPSHOT_TYPE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    snapshot_type = models.CharField(max_length=20, choices=SNAPSHOT_TYPE_CHOICES)
    date = models.DateField()
    data = models.JSONField()  # Store aggregated analytics data
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('snapshot_type', 'date')
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.get_snapshot_type_display()} Analytics - {self.date}"

# Mental health alert model (updated to work with appointment diagnosis fields)

class MentalHealthAlert(models.Model):
    """Model to track mental health alerts for high-risk cases"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
    ]
    
    ALERT_TYPE_CHOICES = [
        ('appointment_diagnosis', 'Appointment Diagnosis'),
        ('chatbot_keyword', 'Chatbot Keyword Detection'),
        ('mood_pattern', 'Mood Pattern Detection'),
        ('manual_referral', 'Manual Referral'),
        ('keyword_detected', 'Keyword Detected'),
        ('risk_assessment', 'Risk Assessment'),
        ('repeated_negative_mood', 'Repeated Negative Mood'),
        ('survey_high_distress', 'High Distress Survey'),
        ('bert_intent_detected', 'BERT Intent Detected'),
    ]
    
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mental_health_alerts')
    counselor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_alerts')
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Related data
    related_appointment = models.ForeignKey('appointments.Appointment', on_delete=models.SET_NULL, null=True, blank=True)
    risk_level = models.CharField(max_length=20, choices=[
        ('high', 'High Risk'),
        ('moderate', 'Moderate Risk'),
        ('low', 'Low Risk')
    ], default='moderate')
    detected_keywords = models.JSONField(default=list, blank=True)
    related_keywords = models.JSONField(default=list, blank=True)  # For backward compatibility
    risk_score = models.IntegerField(default=0)
    
    # Chatbot-specific fields
    session_id = models.CharField(max_length=100, null=True, blank=True)  # Link to anonymized conversation
    
    # Follow-up information
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_appointment = models.ForeignKey('appointments.Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_up_alerts')
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'mental_health_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.student.username} - {self.title} ({self.get_status_display()})"

class RiskLevelDistribution(models.Model):
    """Model to track risk level distribution for analytics"""
    date = models.DateField()
    high_risk_count = models.IntegerField(default=0)
    moderate_risk_count = models.IntegerField(default=0)
    low_risk_count = models.IntegerField(default=0)
    total_assessments = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'risk_level_distribution'
        unique_together = ('date',)
        ordering = ['-date']
    
    def __str__(self):
        return f"Risk Level Distribution - {self.date}"

class MentalHealthPattern(models.Model):
    """Model to track negative mood patterns for early detection"""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mental_health_patterns')
    pattern_type = models.CharField(max_length=50, choices=[
        ('negative_mood', 'Negative Mood'),
        ('negative_notes', 'Negative Notes'),
        ('negative_survey', 'Negative Survey'),
        ('combined', 'Combined Pattern')
    ])
    consecutive_days = models.IntegerField(default=0, help_text="Number of consecutive days with negative pattern")
    start_date = models.DateField()
    end_date = models.DateField()
    severity_score = models.FloatField(default=0.0, help_text="Pattern severity score")
    alert_created = models.BooleanField(default=False, help_text="Whether alert was created for this pattern")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'mental_health_patterns'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['pattern_type']),
            models.Index(fields=['start_date']),
            models.Index(fields=['alert_created']),
        ]
    
    def __str__(self):
        return f"{self.student.username} - {self.pattern_type} ({self.consecutive_days} days)"