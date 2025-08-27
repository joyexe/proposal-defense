from rest_framework import serializers
from .models import MedicalExam
from website.models import User
from datetime import datetime

class MedicalExamSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(required=False, write_only=True)
    first_name = serializers.CharField(required=False, max_length=100)
    last_name = serializers.CharField(required=False, max_length=100)
    dob = serializers.DateField(required=False, input_formats=["%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"], error_messages={
        "invalid": "Date of birth must be in a valid date format."
    })

    class Meta:
        model = MedicalExam
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate_student_id(self, value):
        if value <= 0:
            raise serializers.ValidationError("Invalid student ID.")
        try:
            User.objects.get(id=value, role='student')
        except User.DoesNotExist:
            raise serializers.ValidationError("Student not found.")
        return value

    def validate(self, data):
        # Additional cross-field validation if needed
        if 'dob' in data and data['dob'] and data['dob'] > datetime.now().date():
            raise serializers.ValidationError({"dob": "Date of birth cannot be in the future."})
        return data

    def create(self, validated_data):
        student_id = validated_data.pop('student_id', None)
        if student_id:
            validated_data['student_id'] = student_id
        return super().create(validated_data)