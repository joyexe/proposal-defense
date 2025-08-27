from django.db import models
from django.conf import settings
from django.utils import timezone

class AnonymizedConversationMetadata(models.Model):
    """Model to store anonymized conversation metadata without raw conversation text"""
    
    RISK_LEVEL_CHOICES = [
        ('high', 'High Risk'),
        ('moderate', 'Moderate Risk'),
        ('low', 'Low Risk'),
        ('general', 'General'),
    ]
    
    CONVERSATION_TYPE_CHOICES = [
        ('mood_checkin', 'Mood Check-in'),
        ('appointment', 'Appointment Booking'),
        ('general', 'General Conversation'),
        ('mental_health', 'Mental Health Support'),
        ('chat_with_me', 'Chat with Me'),
    ]
    
    # Anonymized user identifier (not linked to actual user)
    session_id = models.CharField(max_length=100, unique=True)
    
    # Metadata only - no raw conversation content
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='general')
    conversation_type = models.CharField(max_length=50, choices=CONVERSATION_TYPE_CHOICES, default='general')
    
    # Timestamps
    interaction_date = models.DateField(auto_now_add=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Analytics data (anonymized)
    intent_detection_method = models.CharField(max_length=50, default='keyword_fallback')  # 'bert' or 'keyword_fallback'
    confidence_score = models.FloatField(default=0.0)
    total_messages = models.IntegerField(default=0)
    
    # Wellness activity chosen (if applicable)
    chosen_activity = models.CharField(max_length=100, null=True, blank=True)
    
    # Flag for counselor alert (if high risk)
    alert_created = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Anonymized Conversation Metadata'
        verbose_name_plural = 'Anonymized Conversation Metadata'
    
    def __str__(self):
        return f"Session {self.session_id[:8]} - {self.risk_level} - {self.interaction_date}"



class KeywordFlag(models.Model):
    """Model to track keyword usage patterns (anonymized)"""
    keyword = models.CharField(max_length=100)
    category = models.CharField(max_length=50)  # stress, anxiety, depression, etc.
    session_id = models.CharField(max_length=100, null=True, blank=True)  # Anonymized session identifier
    detected_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-detected_at']
    
    def __str__(self):
        return f"{self.keyword} ({self.category}) - Session {self.session_id[:8]}"