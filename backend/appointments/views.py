from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Appointment, Availability
from .serializers import AppointmentSerializer, AvailabilitySerializer
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from rest_framework.views import APIView
from website.models import User
from bulletin.models import BulletinPost
from health_records.models import PermitRequest, RecentActivity
from django.utils import timezone
from datetime import date, datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

def format_relative_time(created_at):
    """Format datetime as relative time string"""
    now = timezone.now()
    diff = now - created_at
    
    if diff.days > 0:
        if diff.days == 1:
            return "1 day ago"
        else:
            return f"{diff.days} days ago"
    elif diff.seconds >= 3600:  # 1 hour = 3600 seconds
        hours = diff.seconds // 3600
        if hours == 1:
            return "1 hour ago"
        else:
            return f"{hours} hours ago"
    elif diff.seconds >= 60:  # 1 minute = 60 seconds
        minutes = diff.seconds // 60
        if minutes == 1:
            return "1 minute ago"
        else:
            return f"{minutes} minutes ago"
    else:
        return "Just now"

def create_appointment_activity(user, appointment, action):
    """Helper function to create appointment activity records"""
    try:
        client_name = appointment.client.full_name
        client_role = appointment.client.role
        
        if action == 'completed':
            activity_type = 'appointment_completed'
            title = 'Appointment Updated - Completed'
            if client_role == 'student':
                description = f'Appointment is Completed for Student {client_name}'
            elif client_role == 'faculty':
                description = f'Appointment Completed for Teacher {client_name}'
            else:
                description = f'Appointment Completed for {client_role.capitalize()} {client_name}'
        elif action == 'in_progress':
            activity_type = 'appointment_in_progress'
            title = 'Appointment Updated - In Progress'
            if client_role == 'student':
                description = f'Appointment is In Progress for Student {client_name}'
            elif client_role == 'faculty':
                description = f'Appointment Completed for Teacher {client_name}'
            else:
                description = f'Appointment Completed for {client_role.capitalize()} {client_name}'
        elif action == 'cancelled':
            activity_type = 'appointment_cancelled'
            title = 'Appointment Updated - Cancelled'
            if client_role == 'student':
                description = f'Appointment is Cancelled for Student {client_name}'
            elif client_role == 'faculty':
                description = f'Appointment Completed for Teacher {client_name}'
            else:
                description = f'Appointment Completed for {client_role.capitalize()} {client_name}'
        else:
            return
        
        RecentActivity.objects.create(
            user=user,
            activity_type=activity_type,
            title=title,
            description=description,
            related_appointment=appointment
        )
    except Exception as e:
        # Error creating appointment activity record
        pass

# Appointment Notification Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_appointment_notifications(request):
    """Get notifications for students (their own appointments)"""
    if request.user.role != 'student':
        return Response({'error': 'Only students can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get appointments where this student is the client
    appointments = Appointment.objects.filter(
        client=request.user
    ).order_by('-created_at')
    
    notifications = []
    for appointment in appointments:
        # Calculate relative time
        relative_time = format_relative_time(appointment.created_at)
        
        # Create notification text
        notification_text = f"New Appointment Just Scheduled for You"
        
        notifications.append({
            'id': appointment.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'appointment',
            'isRead': appointment.student_viewed_at is not None,
            'status': appointment.status,
            'appointment_data': {
                'date': appointment.date,
                'time': appointment.time,
                'service_type': appointment.get_service_type_display(),
                'reason': appointment.reason,
                'status': appointment.status,
                'provider_name': appointment.provider.full_name,
                'provider_role': appointment.provider.role,
                'client_name': appointment.client.full_name,
                'client_role': appointment.client.role,
                'created_at': appointment.created_at,
                'referral': appointment.referral
            }
        })
    
    return Response(notifications)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faculty_appointment_notifications(request):
    """Get notifications for faculty (their own appointments)"""
    if request.user.role != 'faculty':
        return Response({'error': 'Only faculty can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get appointments where this faculty is the client
    appointments = Appointment.objects.filter(
        client=request.user
    ).order_by('-created_at')
    
    notifications = []
    for appointment in appointments:
        # Calculate relative time
        relative_time = format_relative_time(appointment.created_at)
        
        # Create notification text
        notification_text = f"New Appointment Just Scheduled for You"
        
        notifications.append({
            'id': appointment.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'appointment',
            'isRead': appointment.faculty_viewed_at is not None,
            'status': appointment.status,
            'appointment_data': {
                'date': appointment.date,
                'time': appointment.time,
                'service_type': appointment.get_service_type_display(),
                'reason': appointment.reason,
                'status': appointment.status,
                'provider_name': appointment.provider.full_name,
                'provider_role': appointment.provider.role,
                'client_name': appointment.client.full_name,
                'client_role': appointment.client.role,
                'created_at': appointment.created_at,
                'referral': appointment.referral
            }
        })
    
    return Response(notifications)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_clinic_appointment_notifications(request):
    """Get notifications for clinic staff (appointments assigned to them)"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get appointments where this clinic user is the provider
    appointments = Appointment.objects.filter(
        provider=request.user,
        service_type='physical'
    ).order_by('-created_at')
    
    notifications = []
    for appointment in appointments:
        # Calculate relative time
        relative_time = format_relative_time(appointment.created_at)
        
        # Create notification text
        notification_text = f"New Appointment Just Scheduled for You"
        
        notifications.append({
            'id': appointment.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'appointment',
            'isRead': appointment.clinic_viewed_at is not None,
            'status': appointment.status,
            'appointment_data': {
                'date': appointment.date,
                'time': appointment.time,
                'service_type': appointment.get_service_type_display(),
                'reason': appointment.reason,
                'status': appointment.status,
                'provider_name': appointment.provider.full_name,
                'provider_role': appointment.provider.role,
                'client_name': appointment.client.full_name,
                'client_role': appointment.client.role,
                'created_at': appointment.created_at,
                'referral': appointment.referral
            }
        })
    
    return Response(notifications)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_counselor_appointment_notifications(request):
    """Get notifications for counselors (appointments assigned to them)"""
    if request.user.role != 'counselor':
        return Response({'error': 'Only counselors can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get appointments where this counselor is the provider
    appointments = Appointment.objects.filter(
        provider=request.user,
        service_type='mental'
    ).order_by('-created_at')
    
    notifications = []
    for appointment in appointments:
        # Calculate relative time
        relative_time = format_relative_time(appointment.created_at)
        
        # Create notification text
        notification_text = f"New Appointment Just Scheduled for You"
        
        notifications.append({
            'id': appointment.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'appointment',
            'isRead': appointment.counselor_viewed_at is not None,
            'status': appointment.status,
            'appointment_data': {
                'date': appointment.date,
                'time': appointment.time,
                'service_type': appointment.get_service_type_display(),
                'reason': appointment.reason,
                'status': appointment.status,
                'provider_name': appointment.provider.full_name,
                'provider_role': appointment.provider.role,
                'client_name': appointment.client.full_name,
                'client_role': appointment.client.role,
                'created_at': appointment.created_at,
                'referral': appointment.referral
            }
        })
    
    return Response(notifications)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_student_appointment_notifications_read(request):
    """Mark student appointment notifications as read"""
    if request.user.role != 'student':
        return Response({'error': 'Only students can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            appointment = Appointment.objects.get(
                id=notification_id,
                client=request.user
            )
            appointment.student_viewed_at = timezone.now()
            appointment.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read
            appointments = Appointment.objects.filter(
                client=request.user,
                student_viewed_at__isnull=True
            )
            
            for appointment in appointments:
                appointment.student_viewed_at = timezone.now()
                appointment.save()
        
        return Response({'message': 'Notifications marked as read'})
    except Appointment.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_faculty_appointment_notifications_read(request):
    """Mark faculty appointment notifications as read"""
    if request.user.role != 'faculty':
        return Response({'error': 'Only faculty can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            appointment = Appointment.objects.get(
                id=notification_id,
                client=request.user
            )
            appointment.faculty_viewed_at = timezone.now()
            appointment.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read
            appointments = Appointment.objects.filter(
                client=request.user,
                faculty_viewed_at__isnull=True
            )
            
            for appointment in appointments:
                appointment.faculty_viewed_at = timezone.now()
                appointment.save()
        
        return Response({'message': 'Notifications marked as read'})
    except Appointment.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_clinic_appointment_notifications_read(request):
    """Mark clinic appointment notifications as read"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            appointment = Appointment.objects.get(
                id=notification_id,
                provider=request.user
            )
            appointment.clinic_viewed_at = timezone.now()
            appointment.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read
            appointments = Appointment.objects.filter(
                provider=request.user,
                clinic_viewed_at__isnull=True
            )
            
            for appointment in appointments:
                appointment.clinic_viewed_at = timezone.now()
                appointment.save()
        
        return Response({'message': 'Notifications marked as read'})
    except Appointment.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_counselor_appointment_notifications_read(request):
    """Mark counselor appointment notifications as read"""
    if request.user.role != 'counselor':
        return Response({'error': 'Only counselors can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            appointment = Appointment.objects.get(
                id=notification_id,
                provider=request.user
            )
            appointment.counselor_viewed_at = timezone.now()
            appointment.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read
            appointments = Appointment.objects.filter(
                provider=request.user,
                counselor_viewed_at__isnull=True
            )
            
            for appointment in appointments:
                appointment.counselor_viewed_at = timezone.now()
                appointment.save()
        
        return Response({'message': 'Notifications marked as read'})
    except Appointment.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Create your views here.

class IsProviderOrClient(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admin users have access to all appointments
        if request.user.role == 'admin':
            return True
        # Other users only have access if they are provider, client, or referrer
        return (
            obj.provider == request.user or
            obj.client == request.user or
            obj.created_by == request.user
        )

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrClient]

    def get_queryset(self):
        user = self.request.user
        # Admin users can see all appointments
        if user.role == 'admin':
            return Appointment.objects.all()
        # Other users only see appointments where they are provider, client, or referrer
        return Appointment.objects.filter(
            Q(provider=user) | Q(client=user) | Q(created_by=user)
        ).distinct()

    def perform_create(self, serializer):
        request = self.request
        provider = serializer.validated_data['provider']
        client = serializer.validated_data['client']
        # Determine service_type
        if provider.role == 'clinic':
            service_type = 'physical'
        elif provider.role == 'counselor':
            service_type = 'mental'
        else:
            service_type = serializer.validated_data.get('service_type', '')
        # Determine referral
        if request.user == client:
            referral = 'Direct'
        else:
            referral = f"From {request.user.full_name} ({request.user.role.capitalize()})"
        serializer.save(
            created_by=request.user,
            service_type=service_type,
            referral=referral
        )

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        appt = self.get_object()
        appt.status = 'completed'
        appt.save()
        
        # Create activity record
        create_appointment_activity(request.user, appt, 'completed')
        
        return Response(self.get_serializer(appt).data)

    @action(detail=True, methods=['post'])
    def mark_in_progress(self, request, pk=None):
        appt = self.get_object()
        appt.status = 'in_progress'
        appt.save()
        
        # Create activity record
        create_appointment_activity(request.user, appt, 'in_progress')
        
        return Response(self.get_serializer(appt).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appt = self.get_object()
        appt.status = 'cancelled'
        appt.save()
        
        # Create activity record
        create_appointment_activity(request.user, appt, 'cancelled')
        
        return Response(self.get_serializer(appt).data)

class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Providers see their own, others see available slots
        if user.role in ['clinic', 'counselor']:
            return Availability.objects.filter(provider=user)
        return Availability.objects.filter(available=True)

class ProviderListView(APIView):
    def get(self, request):
        providers = User.objects.filter(role__in=["clinic", "counselor"], is_active=True)
        data = [
            {"id": u.id, "full_name": u.full_name, "role": u.role, "email": u.email}
            for u in providers
        ]
        return Response(data)

class TeacherListView(APIView):
    def get(self, request):
        teachers = User.objects.filter(role="faculty")
        data = [
            {"id": u.id, "full_name": u.full_name, "role": u.role}
            for u in teachers
        ]
        return Response(data)

class ProviderAvailableTimesView(APIView):
    def get(self, request):
        provider_id = request.query_params.get('provider_id')
        if not provider_id:
            return Response({'error': 'provider_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        slots = Availability.objects.filter(provider_id=provider_id, available=True)
        # Only unique times
        times = list(sorted(set(str(slot.time)[:5] for slot in slots)))
        return Response(times)

class FacultyDashboardCountsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'faculty':
            return Response({'error': 'Only faculty can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get faculty's upcoming appointments
        faculty_appointments = Appointment.objects.filter(
            client=request.user,
            status='upcoming'
        ).count()
        
        # Get faculty's referrals (appointments created by faculty for students)
        faculty_referrals = Appointment.objects.filter(
            created_by=request.user,
            client__role='student'
        ).filter(
            # Only show referrals from the last 7 days
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        )
        
        active_referrals = faculty_referrals.filter(
            status__in=['upcoming', 'in_progress', 'in progress']
        ).count()
        
        completed_referrals = faculty_referrals.filter(
            status='completed'
        ).count()
        
        total_referrals = faculty_referrals.count()
        
        # Get active announcements count
        active_announcements = BulletinPost.objects.filter(
            status='Posted',
            end_date__gt=timezone.now()
        ).count()
        
        # Get assigned students count (students with permit requests assigned to this faculty)
        assigned_students = PermitRequest.objects.filter(
            teacher=request.user,
            status__in=['pending', 'approved', 'denied', 'completed']
        ).values('student').distinct().count()
        
        return Response({
            'my_appointments': faculty_appointments,
            'student_referrals': {
                'total': total_referrals,
                'active': active_referrals,
                'completed': completed_referrals
            },
            'announcements': active_announcements,
            'health_records': assigned_students
        })

class ClinicTodayAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'clinic':
            return Response({'error': 'Only clinic staff can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        today = date.today()
        
        # Get today's appointments for the current clinic provider
        # Only physical health appointments
        today_appointments = Appointment.objects.filter(
            provider=request.user,
            date=today,
            service_type='physical',
            status__in=['upcoming', 'in_progress']
        ).order_by('status', 'time')  # Order by status first (upcoming comes before in_progress), then by time
        
        appointments_data = []
        for appointment in today_appointments:
            # Format appointment time
            time_str = appointment.time.strftime("%I:%M %p")
            
            # Format relative time when appointment was created
            created_time = format_relative_time(appointment.created_at)
            
            # Get client role and format display
            client_role = appointment.client.role
            if client_role == 'student':
                # Format: "Student, grade & section - Reason" or "Student, grade & section"
                grade = appointment.client.grade or ""
                section = appointment.client.section or ""
                level_section = f"{grade} {section}".strip()
                if appointment.reason:
                    role_display = f"Student, {level_section} - {appointment.reason}"
                else:
                    role_display = f"Student, {level_section}"
            elif client_role == 'faculty':
                # Format: "Teacher - Reason" or "Teacher"
                if appointment.reason:
                    role_display = f"Teacher - {appointment.reason}"
                else:
                    role_display = "Teacher"
            else:
                # For other roles, use the role name
                if appointment.reason:
                    role_display = f"{client_role.capitalize()} - {appointment.reason}"
                else:
                    role_display = client_role.capitalize()
            
            appointments_data.append({
                'id': appointment.id,
                'name': appointment.client.full_name,
                'role': role_display,
                'time': time_str,
                'created_time': created_time,
                'status': appointment.status,
                'reason': appointment.reason,
                'documentation': appointment.documentation,
                'diagnosis_code': appointment.diagnosis_code,
                'diagnosis_name': appointment.diagnosis_name
            })
        
        return Response(appointments_data)

class ClinicUpcomingAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'clinic':
            return Response({'error': 'Only clinic staff can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get ALL upcoming appointments for the current clinic provider
        # Only physical health appointments with upcoming status
        upcoming_appointments = Appointment.objects.filter(
            provider=request.user,
            service_type='physical',
            status='upcoming'
        ).order_by('date', 'time')  # Order by date first, then by time
        
        appointments_data = []
        for appointment in upcoming_appointments:
            # Format appointment time
            time_str = appointment.time.strftime("%I:%M %p")
            
            # Format appointment date
            date_str = appointment.date.strftime("%B %d, %Y")
            
            # Format relative time when appointment was created
            created_time = format_relative_time(appointment.created_at)
            
            # Get client role and format display
            client_role = appointment.client.role
            if client_role == 'student':
                # Format: "Student, grade & section - Reason" or "Student, grade & section"
                grade = appointment.client.grade or ""
                section = appointment.client.section or ""
                level_section = f"{grade} {section}".strip()
                if appointment.reason:
                    role_display = f"Student, {level_section} - {appointment.reason}"
                else:
                    role_display = f"Student, {level_section}"
            elif client_role == 'faculty':
                # Format: "Teacher - Reason" or "Teacher"
                if appointment.reason:
                    role_display = f"Teacher - {appointment.reason}"
                else:
                    role_display = "Teacher"
            else:
                # For other roles, use the role name
                if appointment.reason:
                    role_display = f"{client_role.capitalize()} - {appointment.reason}"
                else:
                    role_display = client_role.capitalize()
            
            appointments_data.append({
                'id': appointment.id,
                'name': appointment.client.full_name,
                'role': role_display,
                'date': date_str,
                'time': time_str,
                'created_time': created_time,
                'status': appointment.status,
                'reason': appointment.reason,
                'documentation': appointment.documentation,
                'diagnosis_code': appointment.diagnosis_code,
                'diagnosis_name': appointment.diagnosis_name
            })
        
        return Response(appointments_data)

class ClinicReferralsCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'clinic':
            return Response({'error': 'Only clinic staff can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all referrals made by faculty and counselors for students
        # that are assigned to the current clinic provider with physical health service type
        # and have upcoming or in_progress status
        referrals = Appointment.objects.filter(
            client__role='student',  # Only students
            provider=request.user,   # Assigned to current clinic user
            service_type='physical', # Physical health appointments only
            created_by__role__in=['faculty', 'counselor'],  # Created by faculty or counselors
            status__in=['upcoming', 'in_progress']  # Both upcoming and in_progress status
        ).count()
        
        return Response({
            'referrals_count': referrals
        })

class CounselorTodayAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'counselor':
            return Response({'error': 'Only counselors can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        today = date.today()
        
        # Get today's appointments for the current counselor provider
        # Only mental health appointments
        today_appointments = Appointment.objects.filter(
            provider=request.user,
            date=today,
            service_type='mental',
            status__in=['upcoming', 'in_progress']
        ).order_by('status', 'time')  # Order by status first (upcoming comes before in_progress), then by time
        
        appointments_data = []
        for appointment in today_appointments:
            # Format appointment time
            time_str = appointment.time.strftime("%I:%M %p")
            
            # Format relative time when appointment was created
            created_time = format_relative_time(appointment.created_at)
            
            # Get client role and format display
            client_role = appointment.client.role
            if client_role == 'student':
                # Format: "Student, grade & section - Reason" or "Student, grade & section"
                grade = appointment.client.grade or ""
                section = appointment.client.section or ""
                level_section = f"{grade} {section}".strip()
                if appointment.reason:
                    role_display = f"Student, {level_section} - {appointment.reason}"
                else:
                    role_display = f"Student, {level_section}"
            elif client_role == 'faculty':
                # Format: "Teacher - Reason" or "Teacher"
                if appointment.reason:
                    role_display = f"Teacher - {appointment.reason}"
                else:
                    role_display = "Teacher"
            else:
                # For other roles, use the role name
                if appointment.reason:
                    role_display = f"{client_role.capitalize()} - {appointment.reason}"
                else:
                    role_display = client_role.capitalize()
            
            appointments_data.append({
                'id': appointment.id,
                'name': appointment.client.full_name,
                'role': role_display,
                'time': time_str,
                'created_time': created_time,
                'status': appointment.status,
                'reason': appointment.reason,
                'documentation': appointment.documentation,
                'diagnosis_code': appointment.diagnosis_code,
                'diagnosis_name': appointment.diagnosis_name,
                'risk_level': appointment.risk_level,
                'confidence_score': appointment.confidence_score,
                'client': {
                    'full_name': appointment.client.full_name,
                    'email': appointment.client.email,
                    'role': appointment.client.role
                }
            })
        
        return Response(appointments_data)

class CounselorReferralsCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'counselor':
            return Response({'error': 'Only counselors can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all referrals made by faculty (appointments created by faculty for students)
        # that are assigned to the current counselor provider with upcoming status only
        faculty_referrals = Appointment.objects.filter(
            client__role='student',
            provider=request.user,
            service_type='mental',
            status='upcoming'
        ).count()
        
        return Response({
            'referrals_count': faculty_referrals
        })

class CounselorActiveCasesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != 'counselor':
            return Response({'error': 'Only counselors can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get ALL mental health appointments for the current counselor provider
        # with upcoming or in_progress status regardless of date
        active_cases = Appointment.objects.filter(
            provider=request.user,
            service_type='mental',
            status__in=['upcoming', 'in_progress']
        ).count()
        
        return Response({
            'active_cases_count': active_cases
        })
