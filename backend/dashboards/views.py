from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Create your views here.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    return Response({
        "total_users": 1256,
        "active_sessions": 1002,
        "alert_flags": 14,
        "incident_report": 23,
        "recent_activity": [
            {"event": "New user registered", "detail": "Student account created by admin"},
            {"event": "Alert Flag Triggered", "detail": "Counseling notified of potential concern"},
            {"event": "Health record updated", "detail": "New physical exam results"},
        ],
        "usage_chart": [],
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinic_dashboard(request):
    return Response({
        "todays_visit": 12,
        "pending_reports": 4,
        "active_cases": 8,
        "incident_report": 23,
        "appointments": [
            {"name": "Maria Garcia", "type": "Physical Examination", "time": "9:30 AM", "status": "New Appointment"},
            {"name": "James Wilson", "type": "Hypertension Follow-up", "time": "10:15 AM", "status": "Follow-up"},
        ],
        "recent_activity": [
            {"event": "Health Record Updated", "detail": "Medical record for Olivia Parker updated"},
        ],
        "clinic_visits_chart": [],
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_dashboard(request):
    return Response({
        "active_cases": 12,
        "todays_appointments": 4,
        "alert_flags": 7,
        "amie_engagement": 87,
        "appointments": [
            {"name": "Maria Garcia", "type": "Academic Stress", "time": "9:30 AM"},
        ],
        "attention_required": [
            {"name": "Rachel Kim", "detail": "AMIE detected concerning keywords in student interaction", "action": "Review"},
        ],
        "mood_chart": [],
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def faculty_dashboard(request):
    return Response({
        "referrals": [
            {"student": "Andrea Gomez", "date": "2025-05-29 10:14:22", "type": "Medical", "status": "Completed"},
            {"student": "Marcus Tan", "date": "2025-05-29 10:12:15", "type": "Counseling", "status": "In Progress"},
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request):
    return Response({
        "welcome": "Maria Garcia",
        "moods": [
            {"label": "Happy", "icon": "😊"},
            {"label": "Calm", "icon": "😌"},
            {"label": "Confident", "icon": "😎"},
            {"label": "Sad", "icon": "😔"},
            {"label": "Anxious", "icon": "😣"},
            {"label": "Stressed", "icon": "😫"},
        ]
    })
