from .models import Appointment, Availability
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class UserDisplaySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'role', 'email']

class AvailabilitySerializer(serializers.ModelSerializer):
    provider = UserDisplaySerializer(read_only=True)
    provider_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='provider', write_only=True)

    class Meta:
        model = Availability
        fields = ['id', 'provider', 'provider_id', 'date', 'time', 'available']

class AppointmentSerializer(serializers.ModelSerializer):
    provider = UserDisplaySerializer(read_only=True)
    provider_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='provider', write_only=True)
    client = UserDisplaySerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='client', write_only=True)
    created_by = UserDisplaySerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'provider', 'provider_id', 'client', 'client_id', 'date', 'time', 'service_type', 'status', 'reason', 'documentation', 'diagnosis_code', 'diagnosis_name', 'confidence_score', 'risk_level', 'referral', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at'] 