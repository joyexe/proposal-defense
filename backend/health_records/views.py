from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import PermitRequest, RecentActivity
from .serializers import PermitRequestSerializer, CreatePermitRequestSerializer, UpdatePermitRequestSerializer, ClinicAssessmentSerializer, RecentActivitySerializer
from website.models import User
from django.db import models
from django.db.models import Count

def create_activity_record(user, activity_type, title, description, related_appointment=None, related_permit=None):
    """Helper function to create activity records"""
    try:
        RecentActivity.objects.create(
            user=user,
            activity_type=activity_type,
            title=title,
            description=description,
            related_appointment=related_appointment,
            related_permit=related_permit
        )
    except Exception as e:
        # Error creating activity record
        pass

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_permit_request(request):
    """Create a new permit request (Student only)"""
    if request.user.role != 'student':
        return Response({'error': 'Only students can create permit requests'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = CreatePermitRequestSerializer(data=request.data)
    if serializer.is_valid():
        permit_request = serializer.save(student=request.user)
        return Response(PermitRequestSerializer(permit_request).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_permit_requests(request):
    """Get permit requests based on user role"""
    if request.user.role == 'student':
        # Students can only see their own requests
        permit_requests = PermitRequest.objects.filter(student=request.user)
    elif request.user.role == 'faculty':
        # Teachers (faculty) can see all requests (pending, approved, denied, completed) where they are the assigned teacher
        permit_requests = PermitRequest.objects.filter(
            teacher=request.user,
            status__in=['pending', 'approved', 'denied', 'completed']
        )
    elif request.user.role == 'clinic':
        # Providers (nurses/clinic staff) can see approved and completed requests where they are the assigned provider
        permit_requests = PermitRequest.objects.filter(
            provider=request.user,
            status__in=['approved', 'completed']
        )
    elif request.user.role == 'admin':
        # Administrators can see all permit requests
        permit_requests = PermitRequest.objects.all()
    else:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = PermitRequestSerializer(permit_requests, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_permit_request(request, pk):
    """Get a specific permit request"""
    try:
        permit_request = PermitRequest.objects.get(pk=pk)
        
        # Check permissions
        if request.user.role == 'student' and permit_request.student != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'faculty':
            # Teachers (faculty) can only view requests where they are the assigned teacher
            if permit_request.teacher != request.user:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'clinic':
            # Providers (nurses/clinic staff) can only view requests where they are the assigned provider
            if permit_request.provider != request.user:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PermitRequestSerializer(permit_request)
        return Response(serializer.data)
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Permit request not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_permit_request(request, pk):
    """Update permit request (Teachers and Providers only)"""
    if request.user.role not in ['faculty', 'clinic']:
        return Response({'error': 'Only teachers and providers can update permit requests'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        permit_request = PermitRequest.objects.get(pk=pk)
        
        # Check if the user is the assigned teacher or provider
        if request.user.role == 'faculty' and permit_request.teacher != request.user:
            return Response({'error': 'Unauthorized - You can only update requests assigned to you as teacher'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'clinic' and permit_request.provider != request.user:
            return Response({'error': 'Unauthorized - You can only update requests assigned to you as provider'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = UpdatePermitRequestSerializer(permit_request, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Update faculty decision fields
            permit_request.faculty_decision_at = timezone.now()
            permit_request.faculty_decision_by = request.user
            
            # Update status based on faculty decision
            faculty_decision = serializer.validated_data.get('faculty_decision')
            if faculty_decision:
                permit_request.faculty_decision = faculty_decision
                # Update the main status based on faculty decision
                if faculty_decision == 'approved':
                    permit_request.status = 'approved'
                elif faculty_decision == 'denied':
                    permit_request.status = 'denied'
            
            permit_request.save()
            serializer.save()
            
            return Response(PermitRequestSerializer(permit_request).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Permit request not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_clinic_assessment(request, pk):
    """Update clinic assessment (Clinic staff only)"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can update clinic assessments'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        permit_request = PermitRequest.objects.get(pk=pk)
        
        # Check if the user is the assigned provider
        if permit_request.provider != request.user:
            return Response({'error': 'Unauthorized - You can only update requests assigned to you as provider'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if the request is approved
        if permit_request.status != 'approved':
            return Response({'error': 'Can only assess approved requests'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ClinicAssessmentSerializer(permit_request, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Update clinic assessment fields
            permit_request.clinic_assessment_at = timezone.now()
            permit_request.clinic_assessment_by = request.user
            
            # Set clinic assessment by information
            
            # Get the outcome and other fields
            outcome = serializer.validated_data.get('outcome')
            parent_email = serializer.validated_data.get('parent_email')
            outcome_date = serializer.validated_data.get('outcome_date')
            outcome_time = serializer.validated_data.get('outcome_time')
            reason = serializer.validated_data.get('reason')
            
            # Save outcome date and time for both outcomes
            if outcome_date:
                permit_request.outcome_date = outcome_date
            if outcome_time:
                permit_request.outcome_time = outcome_time
            
            # Update reason if provided
            if reason:
                permit_request.reason = reason
            
            if outcome == 'back_to_class':
                # Back to class - immediately complete
                permit_request.status = 'completed'
            elif outcome == 'send_home':
                # Send home - requires parent email
                if not parent_email:
                    return Response({'error': 'Parent/Guardian email is required for send home outcome'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Send email to parent
                try:
                    # Helper function to format time with AM/PM
                    def format_time_ampm(time_str):
                        if time_str:
                            try:
                                hour, minute = map(int, str(time_str).split(':'))
                                ampm = "AM" if hour < 12 else "PM"
                                display_hour = hour % 12
                                if display_hour == 0:
                                    display_hour = 12
                                return f"{display_hour:02d}:{minute:02d} {ampm}"
                            except Exception:
                                return time_str
                        return "N/A"
                    
                    # Helper function to format assessment time
                    def format_assessment_time(time_str):
                        if time_str:
                            try:
                                hour, minute = map(int, str(time_str).split(':'))
                                ampm = "AM" if hour < 12 else "PM"
                                display_hour = hour % 12
                                if display_hour == 0:
                                    display_hour = 12
                                return f"{display_hour:02d}:{minute:02d} {ampm}"
                            except Exception:
                                return time_str
                        return "N/A"
                    
                    # Prepare vital signs text
                    vital_signs_text = ""
                    vital_signs_bp = serializer.validated_data.get('vital_signs_bp')
                    vital_signs_temp = serializer.validated_data.get('vital_signs_temp')
                    vital_signs_pr = serializer.validated_data.get('vital_signs_pr')
                    vital_signs_spo2 = serializer.validated_data.get('vital_signs_spo2')
                    nursing_intervention = serializer.validated_data.get('nursing_intervention')
                    
                    if vital_signs_bp or vital_signs_temp or vital_signs_pr or vital_signs_spo2:
                        vital_signs_parts = []
                        if vital_signs_bp:
                            vital_signs_parts.append(f"BP: {vital_signs_bp}")
                        if vital_signs_temp:
                            vital_signs_parts.append(f"Temperature: {vital_signs_temp}°C")
                        if vital_signs_pr:
                            vital_signs_parts.append(f"Pulse Rate: {vital_signs_pr} bpm")
                        if vital_signs_spo2:
                            vital_signs_parts.append(f"SpO2: {vital_signs_spo2}%")
                        vital_signs_text = ", ".join(vital_signs_parts)
                    else:
                        vital_signs_text = "Not recorded"
                    
                    send_mail(
                        subject='Student Sent Home - Notification',
                        message=f'''
Dear Parent/Guardian,

Your child {permit_request.student.full_name} has been assessed by the school nurse and requires to be sent home for medical attention.

Student Details:
- Name: {permit_request.student.full_name}
- Date: {permit_request.date}
- Time: {format_time_ampm(permit_request.time)}
- Reason: {permit_request.reason}
- Vital Signs: {vital_signs_text}
- Nursing Intervention: {nursing_intervention if nursing_intervention else 'Not recorded'}
- Assessment Date: {outcome_date}
- Assessment Time: {format_assessment_time(outcome_time)}

Please arrange to pick up your child from school.

Thank you,
IETI School Health Office
                        ''',
                        from_email=settings.EMAIL_HOST_USER,
                        recipient_list=[parent_email],
                        fail_silently=False,
                    )
                    # Set status to completed immediately after successful assessment
                    permit_request.status = 'completed'
                except Exception as e:
                    return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            permit_request.save()
            serializer.save()
            
            # Create activity record based on outcome
            if outcome == 'back_to_class':
                create_activity_record(
                    user=request.user,
                    activity_type='permit_back_to_class',
                    title='Health Record Updated - Back to Class',
                    description=f'Outcome Back to Class for Student {permit_request.student.full_name}',
                    related_permit=permit_request
                )
            elif outcome == 'send_home':
                create_activity_record(
                    user=request.user,
                    activity_type='permit_send_home',
                    title='Health Record Updated - Send Home',
                    description=f'Outcome Send Home for Student {permit_request.student.full_name}',
                    related_permit=permit_request
                )
            
            return Response(PermitRequestSerializer(permit_request).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Permit request not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teachers(request):
    """Get all teachers for dropdown"""
    if request.user.role not in ['student', 'faculty']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    teachers = User.objects.filter(role='faculty')
    return Response([{
        'id': teacher.id,
        'full_name': teacher.full_name,
        'username': teacher.username
    } for teacher in teachers])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_providers(request):
    """Get all clinic providers for dropdown"""
    if request.user.role not in ['student', 'faculty']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    providers = User.objects.filter(role='clinic')
    return Response([{
        'id': provider.id,
        'full_name': provider.full_name,
        'username': provider.username,
        'role': provider.role
    } for provider in providers])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_activities(request):
    """Get recent activities for the current user"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get recent activities for the current user from the last 7 days (1 week)
    from datetime import timedelta
    one_week_ago = timezone.now() - timedelta(days=7)
    activities = RecentActivity.objects.filter(
        user=request.user,
        created_at__gte=one_week_ago
    ).order_by('-created_at')
    
    # Format activities with relative time
    from datetime import datetime
    activities_data = []
    for activity in activities:
        # Calculate relative time
        now = timezone.now()
        diff = now - activity.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                relative_time = "1 day ago"
            else:
                relative_time = f"{diff.days} days ago"
        elif diff.seconds >= 3600:  # 1 hour = 3600 seconds
            hours = diff.seconds // 3600
            if hours == 1:
                relative_time = "1 hour ago"
            else:
                relative_time = f"{hours} hours ago"
        elif diff.seconds >= 60:  # 1 minute = 60 seconds
            minutes = diff.seconds // 60
            if minutes == 1:
                relative_time = "1 minute ago"
            else:
                relative_time = f"{minutes} minutes ago"
        else:
            relative_time = "Just now"
        
        activities_data.append({
            'id': activity.id,
            'title': activity.title,
            'description': activity.description,
            'time': relative_time,
            'activity_type': activity.activity_type
        })
    
    return Response(activities_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faculty_notifications(request):
    """Get notifications for faculty (permit requests assigned to them)"""
    if request.user.role != 'faculty':
        return Response({'error': 'Only faculty can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get permit requests assigned to this faculty member
    permit_requests = PermitRequest.objects.filter(
        teacher=request.user
    ).order_by('-created_at')
    
    notifications = []
    for permit in permit_requests:
        # Calculate relative time
        now = timezone.now()
        diff = now - permit.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                relative_time = "1 day ago"
            else:
                relative_time = f"{diff.days} days ago"
        elif diff.seconds >= 3600:  # 1 hour = 3600 seconds
            hours = diff.seconds // 3600
            if hours == 1:
                relative_time = "1 hour ago"
            else:
                relative_time = f"{hours} hours ago"
        elif diff.seconds >= 60:  # 1 minute = 60 seconds
            minutes = diff.seconds // 60
            if minutes == 1:
                relative_time = "1 minute ago"
            else:
                relative_time = f"{minutes} minutes ago"
        else:
            relative_time = "Just now"
        
        # Create notification text based on status
        if permit.status == 'pending':
            notification_text = f"Permit to leave the classroom - Student {permit.student.full_name}"
        elif permit.status == 'approved':
            notification_text = f"Permit to leave the classroom (Approved) - Student {permit.student.full_name}"
        elif permit.status == 'denied':
            notification_text = f"Permit to leave the classroom (Denied) - Student {permit.student.full_name}"
        elif permit.status == 'completed':
            if permit.outcome == 'back_to_class':
                notification_text = f"Permit to leave the classroom - Student {permit.student.full_name} (Completed: Back to Class)"
            elif permit.outcome == 'send_home':
                notification_text = f"Permit to leave the classroom - Student {permit.student.full_name} (Completed: Sent Home)"
            else:
                notification_text = f"Permit to leave the classroom - Student {permit.student.full_name} (Completed)"
        else:
            notification_text = f"Permit to leave the classroom - Student {permit.student.full_name}"
        
        notifications.append({
            'id': permit.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'permit',
            'isRead': permit.faculty_viewed_at is not None,  # Mark as read if faculty has viewed it
            'status': permit.status,
            'permit_data': {
                'date': permit.date,
                'time': permit.time,
                'student_name': permit.student.full_name,
                'grade': permit.grade,
                'section': permit.section,
                'reason': permit.reason,
                'status': permit.status,  # Add status field
                'faculty_decision': permit.faculty_decision,
                'faculty_decision_at': permit.faculty_decision_at,
                'faculty_decision_by': permit.faculty_decision_by.full_name if permit.faculty_decision_by else None,
                'clinic_assessment_by': permit.clinic_assessment_by.full_name if permit.clinic_assessment_by else None,  # Add clinic_assessment_by field
                'outcome': permit.outcome,
                'outcome_date': permit.outcome_date,
                'outcome_time': permit.outcome_time,
                'parent_email': permit.parent_email,  # Add parent_email field
                'vital_signs_bp': permit.vital_signs_bp,
                'vital_signs_temp': permit.vital_signs_temp,
                'vital_signs_pr': permit.vital_signs_pr,
                'vital_signs_spo2': permit.vital_signs_spo2,
                'nursing_intervention': permit.nursing_intervention
            }
        })
        
        # Debug: Print permit status for completed requests (only for debugging specific issues)
        # if permit.status == 'completed':
        #     print(f"Faculty notification - Completed permit {permit.id}: status={permit.status}, outcome={permit.outcome}, clinic_assessment_by={permit.clinic_assessment_by}")
    
    return Response(notifications)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_faculty_notifications_read(request):
    """Mark faculty notifications as read"""
    if request.user.role != 'faculty':
        return Response({'error': 'Only faculty can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get notification ID from request if provided
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            permit_request = PermitRequest.objects.get(
                id=notification_id,
                teacher=request.user
            )
            # Set the faculty_viewed_at field to mark as read
            permit_request.faculty_viewed_at = timezone.now()
            permit_request.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read (existing behavior)
            permit_requests = PermitRequest.objects.filter(
                teacher=request.user,
                faculty_viewed_at__isnull=True
            )
            
            # Set faculty_viewed_at for all unread notifications
            for permit in permit_requests:
                permit.faculty_viewed_at = timezone.now()
                permit.save()
            
            return Response({'message': 'Notifications marked as read'})
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_notifications(request):
    """Get notifications for students (their own permit requests)"""
    if request.user.role != 'student':
        return Response({'error': 'Only students can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get permit requests created by this student
    permit_requests = PermitRequest.objects.filter(
        student=request.user
    ).order_by('-created_at')
    
    notifications = []
    for permit in permit_requests:
        # Calculate relative time
        now = timezone.now()
        diff = now - permit.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                relative_time = "1 day ago"
            else:
                relative_time = f"{diff.days} days ago"
        elif diff.seconds >= 3600:  # 1 hour = 3600 seconds
            hours = diff.seconds // 3600
            if hours == 1:
                relative_time = "1 hour ago"
            else:
                relative_time = f"{hours} hours ago"
        elif diff.seconds >= 60:  # 1 minute = 60 seconds
            minutes = diff.seconds // 60
            if minutes == 1:
                relative_time = "1 minute ago"
            else:
                relative_time = f"{minutes} minutes ago"
        else:
            relative_time = "Just now"
        
        # Create notification text based on status
        if permit.status == 'pending':
            notification_text = f"Permit to leave the classroom - Pending approval for Teacher {permit.teacher.full_name if permit.teacher else 'assigned teacher'}"
        elif permit.status == 'approved':
            notification_text = f"Permit to leave the classroom - Approved by Teacher {permit.faculty_decision_by.full_name if permit.faculty_decision_by else 'teacher'}"
        elif permit.status == 'denied':
            notification_text = f"Permit to leave the classroom - Denied by Teacher {permit.faculty_decision_by.full_name if permit.faculty_decision_by else 'teacher'}"
        elif permit.status == 'completed':
            if permit.outcome == 'back_to_class':
                notification_text = f"Permit to leave the classroom - Completed: Back to class"
            elif permit.outcome == 'send_home':
                notification_text = f"Permit to leave the classroom - Completed: Sent home"
            else:
                notification_text = f"Permit to leave the classroom - Completed"
        else:
            notification_text = f"Permit to leave the classroom - Status: {permit.status}"
        
        # Debug: Print permit status for completed requests (only for debugging specific issues)
        # if permit.status == 'completed':
        #     print(f"Completed permit {permit.id}: status={permit.status}, outcome={permit.outcome}, clinic_assessment_by={permit.clinic_assessment_by}")
        
        notifications.append({
            'id': permit.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'permit',
            'isRead': permit.student_viewed_at is not None,  # Mark as read if student has viewed it
            'status': permit.status,
            'permit_data': {
                'date': permit.date,
                'time': permit.time,
                'student_name': permit.student.full_name,
                'grade': permit.grade,
                'section': permit.section,
                'reason': permit.reason,
                'status': permit.status,  # Add status field
                'faculty_decision': permit.faculty_decision,
                'faculty_decision_at': permit.faculty_decision_at,
                'faculty_decision_by': permit.faculty_decision_by.full_name if permit.faculty_decision_by else None,
                'teacher_name': permit.teacher.full_name if permit.teacher else None,
                'provider_name': permit.provider.full_name if permit.provider else None,
                'outcome': permit.outcome,
                'outcome_date': permit.outcome_date,
                'outcome_time': permit.outcome_time,
                'parent_email': permit.parent_email,  # Add parent_email field
                'clinic_assessment_by': permit.clinic_assessment_by.full_name if permit.clinic_assessment_by else None,  # Add clinic_assessment_by field
                'vital_signs_bp': permit.vital_signs_bp,
                'vital_signs_temp': permit.vital_signs_temp,
                'vital_signs_pr': permit.vital_signs_pr,
                'vital_signs_spo2': permit.vital_signs_spo2,
                'nursing_intervention': permit.nursing_intervention
            }
        })
    
    return Response(notifications)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_student_notifications_read(request):
    """Mark student notifications as read"""
    if request.user.role != 'student':
        return Response({'error': 'Only students can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get notification ID from request if provided
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            permit_request = PermitRequest.objects.get(
                id=notification_id,
                student=request.user
            )
            # Set the student_viewed_at field to mark as read
            permit_request.student_viewed_at = timezone.now()
            permit_request.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all pending notifications as read (existing behavior)
            permit_requests = PermitRequest.objects.filter(
                student=request.user,
                student_viewed_at__isnull=True
            )
            
            # Set student_viewed_at for all unread notifications
        for permit in permit_requests:
                permit.student_viewed_at = timezone.now()
                permit.save()
        
        return Response({'message': 'Notifications marked as read'})
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_clinic_notifications(request):
    """Get notifications for clinic staff (approved and completed permit requests)"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can access notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get approved and completed permit requests that clinic staff should see
    permit_requests = PermitRequest.objects.filter(status__in=['approved', 'completed']).order_by('-created_at')
    
    # Debug: Print the count of approved and completed permit requests found (only for debugging specific issues)
    # print(f"Found {permit_requests.count()} approved and completed permit requests for clinic notifications")
    
    notifications = []
    for permit in permit_requests:
        # Calculate relative time
        now = timezone.now()
        diff = now - permit.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                relative_time = "1 day ago"
            else:
                relative_time = f"{diff.days} days ago"
        elif diff.seconds >= 3600:  # 1 hour = 3600 seconds
            hours = diff.seconds // 3600
            if hours == 1:
                relative_time = "1 hour ago"
            else:
                relative_time = f"{hours} hours ago"
        elif diff.seconds >= 60:  # 1 minute = 60 seconds
            minutes = diff.seconds // 60
            if minutes == 1:
                relative_time = "1 minute ago"
            else:
                relative_time = f"{minutes} minutes ago"
        else:
            relative_time = "Just now"
        
        # Create notification text based on status
        if permit.status == 'approved':
            teacher_name = permit.faculty_decision_by.full_name if permit.faculty_decision_by else 'Unknown Teacher'
            notification_text = f"Permit to leave the classroom for Student {permit.student.full_name} - Approved by Teacher {teacher_name}"
        elif permit.status == 'completed':
            if permit.outcome == 'back_to_class':
                notification_text = f"Permit to leave the classroom for Student {permit.student.full_name} - Completed: Back to class"
            elif permit.outcome == 'send_home':
                notification_text = f"Permit to leave the classroom for Student {permit.student.full_name} - Completed: Sent home"
            else:
                notification_text = f"Permit to leave the classroom for Student {permit.student.full_name} - Completed"
        
        notifications.append({
            'id': permit.id,
            'text': notification_text,
            'timestamp': relative_time,
            'type': 'permit',
            'isRead': permit.clinic_viewed_at is not None,  # Mark as read if clinic has viewed it
            'status': permit.status,
            'permit_data': {
                'date': permit.date,
                'time': permit.time,
                'student_name': permit.student.full_name,
                'grade': permit.grade,
                'section': permit.section,
                'reason': permit.reason,
                'status': permit.status,  # Add status to permit_data
                'faculty_decision': permit.faculty_decision,
                'faculty_decision_at': permit.faculty_decision_at,
                'faculty_decision_by': permit.faculty_decision_by.full_name if permit.faculty_decision_by else None,
                'teacher_name': permit.teacher.full_name if permit.teacher else None,
                'provider_name': permit.provider.full_name if permit.provider else None,
                'clinic_assessment_by': permit.clinic_assessment_by.full_name if permit.clinic_assessment_by else None,
                'outcome': permit.outcome,
                'outcome_date': permit.outcome_date,
                'outcome_time': permit.outcome_time,
                'parent_email': permit.parent_email or (permit.student.guardian_email if permit.student else None),  # Add parent_email field with fallback to student's guardian email
                'vital_signs_bp': permit.vital_signs_bp,
                'vital_signs_temp': permit.vital_signs_temp,
                'vital_signs_pr': permit.vital_signs_pr,
                'vital_signs_spo2': permit.vital_signs_spo2,
                'nursing_intervention': permit.nursing_intervention,
                'diagnosis_code': permit.diagnosis_code,
                'diagnosis_name': permit.diagnosis_name
            }
        })
        
        # Debug: Print parent email information (only for debugging specific issues)
        # parent_email = permit.parent_email or (permit.student.guardian_email if permit.student else None)
        # print(f"Permit {permit.id}: parent_email={permit.parent_email}, student_guardian_email={permit.student.guardian_email if permit.student else None}, final_parent_email={parent_email}")
    
    # Debug: Print the final notifications count (only for debugging specific issues)
    # print(f"Returning {len(notifications)} notifications")
    
    return Response(notifications)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_clinic_notifications_read(request):
    """Mark clinic notifications as read"""
    if request.user.role != 'clinic':
        return Response({'error': 'Only clinic staff can mark notifications as read'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get notification ID from request if provided
        notification_id = request.data.get('notification_id')
        
        if notification_id:
            # Mark specific notification as read
            permit_request = PermitRequest.objects.get(
                id=notification_id
            )
            # Set the clinic_viewed_at field to mark as read
            permit_request.clinic_viewed_at = timezone.now()
            permit_request.save()
            return Response({'message': 'Notification marked as read'})
        else:
            # Mark all unread notifications as read (existing behavior)
            permit_requests = PermitRequest.objects.filter(
                clinic_viewed_at__isnull=True
            )
            
            # Set clinic_viewed_at for all unread notifications
            for permit in permit_requests:
                permit.clinic_viewed_at = timezone.now()
                permit.save()
            
            return Response({'message': 'Notifications marked as read'})
    except PermitRequest.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
