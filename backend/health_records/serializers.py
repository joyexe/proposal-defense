from rest_framework import serializers
from .models import PermitRequest, RecentActivity
from website.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'username', 'role', 'guardian_email']

class PermitRequestSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    teacher = UserSerializer(read_only=True)
    provider = UserSerializer(read_only=True)
    faculty_decision_by = UserSerializer(read_only=True)
    clinic_assessment_by = UserSerializer(read_only=True)
    
    class Meta:
        model = PermitRequest
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'faculty_decision_at', 'clinic_assessment_at']

class CreatePermitRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitRequest
        fields = ['teacher', 'provider', 'date', 'time', 'grade', 'section', 'reason']

class UpdatePermitRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitRequest
        fields = ['faculty_decision'] 

class ClinicAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitRequest
        fields = [
            'vital_signs_bp', 'vital_signs_temp', 'vital_signs_pr', 'vital_signs_spo2',
            'nursing_intervention', 'diagnosis_code', 'diagnosis_name',
            'outcome', 'outcome_date', 'outcome_time', 'parent_email', 'reason'
        ]

class RecentActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecentActivity
        fields = ['id', 'activity_type', 'title', 'description', 'created_at']
        read_only_fields = ['created_at'] 