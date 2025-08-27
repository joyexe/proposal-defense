from rest_framework import serializers
from .models import AnonymizedConversationMetadata, KeywordFlag
from analytics.models import MentalHealthAlert
from website.models import User

class AnonymizedConversationMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnonymizedConversationMetadata
        fields = [
            'id', 'session_id', 'risk_level', 'conversation_type', 'interaction_date',
            'started_at', 'ended_at', 'intent_detection_method', 'confidence_score',
            'total_messages', 'chosen_activity', 'alert_created'
        ]
        read_only_fields = ['started_at', 'interaction_date']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role']

class MentalHealthAlertSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    counselor = UserSerializer(read_only=True)
    resolved_by = UserSerializer(read_only=True)
    
    class Meta:
        model = MentalHealthAlert
        fields = [
            'id', 'student', 'counselor', 'alert_type', 'severity', 'title', 
            'description', 'status', 'session_id', 'related_keywords', 
            'risk_score', 'created_at', 'resolved_at', 'resolved_by', 'resolution_notes'
        ]
        read_only_fields = ['created_at', 'resolved_at']

class KeywordFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeywordFlag
        fields = ['id', 'keyword', 'category', 'session_id', 'detected_at']
        read_only_fields = ['detected_at']

