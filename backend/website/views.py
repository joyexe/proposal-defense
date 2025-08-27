from django.contrib.auth import get_user_model, authenticate, login
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from django import forms
from django.utils import timezone
from datetime import timedelta
import random
import string
import time
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from logs.models import SystemLog

User = get_user_model()

def migrate_existing_ids():
    """Migrate existing users with old format IDs to new 5-digit format"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Migrate students with old format IDs (only if they need migration)
    students_with_old_ids = User.objects.filter(
        role='student',
        student_id__isnull=False
    ).exclude(student_id='')
    
    migrated_count = 0
    for student in students_with_old_ids:
        if student.student_id and student.student_id.isdigit():
            # Convert old format (0001) to new format (SID-2024-00001)
            old_number = int(student.student_id)
            new_id = f'SID-{current_year}-{old_number:05d}'
            student.student_id = new_id
            student.save()
            migrated_count += 1
    
    # Migrate faculty with old format IDs (only if they need migration)
    faculty_with_old_ids = User.objects.filter(
        role='faculty',
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    for faculty in faculty_with_old_ids:
        if faculty.faculty_id and faculty.faculty_id.isdigit():
            # Convert old format (0001) to new format (FID-2024-00001)
            old_number = int(faculty.faculty_id)
            new_id = f'FID-{current_year}-{old_number:05d}'
            faculty.faculty_id = new_id
            faculty.save()
            migrated_count += 1
    
    # Migrate counselors with old format IDs (only if they need migration)
    counselors_with_old_ids = User.objects.filter(
        role='counselor',
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    for counselor in counselors_with_old_ids:
        if counselor.faculty_id and counselor.faculty_id.isdigit():
            # Convert old format (0001) to new format (CID-2024-00001)
            old_number = int(counselor.faculty_id)
            new_id = f'CID-{current_year}-{old_number:05d}'
            counselor.faculty_id = new_id
            counselor.save()
            migrated_count += 1
    
    # Migrate admins with old format IDs (only if they need migration)
    admins_with_old_ids = User.objects.filter(
        role='admin',
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    for admin in admins_with_old_ids:
        if admin.faculty_id and admin.faculty_id.isdigit():
            # Convert old format (0001) to new format (AID-2024-00001)
            old_number = int(admin.faculty_id)
            new_id = f'AID-{current_year}-{old_number:05d}'
            admin.faculty_id = new_id
            admin.save()
            migrated_count += 1
    
    # Migrate clinic/nurse with old format IDs (only if they need migration)
    clinics_with_old_ids = User.objects.filter(
        role='clinic',
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    for clinic in clinics_with_old_ids:
        if clinic.faculty_id and clinic.faculty_id.isdigit():
            # Convert old format (0001) to new format (NID-2024-00001)
            old_number = int(clinic.faculty_id)
            new_id = f'NID-{current_year}-{old_number:05d}'
            clinic.faculty_id = new_id
            clinic.save()
            migrated_count += 1
    
    if migrated_count > 0:
        # Auto-migrated users to 5-digit ID format
        pass

def generate_student_id():
    """Generate automatic Student ID with format SID-2024-00001"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Get the highest existing student ID number for current year
    existing_students = User.objects.filter(
        role='student', 
        student_id__isnull=False
    ).exclude(student_id='')
    
    if not existing_students.exists():
        return f'SID-{current_year}-00001'
    
    # Extract numbers from existing IDs and find the highest for current year
    max_number = 0
    for student in existing_students:
        if student.student_id:
            # Handle both old format (0001) and new format (SID-2024-00001)
            if student.student_id.startswith(f'SID-{current_year}-'):
                try:
                    # Extract number after SID-2024-
                    number_part = student.student_id.split('-')[-1]
                    number = int(number_part)
                    max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue
            elif student.student_id.isdigit():
                # Handle old format (0001, 0002, etc.)
                try:
                    number = int(student.student_id)
                    max_number = max(max_number, number)
                except ValueError:
                    continue
    
    # Generate next number
    next_number = max_number + 1
    return f'SID-{current_year}-{next_number:05d}'

def generate_faculty_id():
    """Generate automatic Faculty ID with format FID-2024-00001"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Get the highest existing faculty ID number for current year
    existing_faculty = User.objects.filter(
        role='faculty', 
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    if not existing_faculty.exists():
        return f'FID-{current_year}-00001'
    
    # Extract numbers from existing IDs and find the highest for current year
    max_number = 0
    for faculty in existing_faculty:
        if faculty.faculty_id:
            # Handle both old format (0001) and new format (FID-2024-00001)
            if faculty.faculty_id.startswith(f'FID-{current_year}-'):
                try:
                    # Extract number after FID-2024-
                    number_part = faculty.faculty_id.split('-')[-1]
                    number = int(number_part)
                    max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue
            elif faculty.faculty_id.isdigit():
                # Handle old format (0001, 0002, etc.)
                try:
                    number = int(faculty.faculty_id)
                    max_number = max(max_number, number)
                except ValueError:
                    continue
    
    # Generate next number
    next_number = max_number + 1
    return f'FID-{current_year}-{next_number:05d}'

def generate_counselor_id():
    """Generate automatic Counselor ID with format CID-2024-00001"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Get the highest existing counselor ID number for current year
    existing_counselors = User.objects.filter(
        role='counselor', 
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    if not existing_counselors.exists():
        return f'CID-{current_year}-00001'
    
    # Extract numbers from existing IDs and find the highest for current year
    max_number = 0
    for counselor in existing_counselors:
        if counselor.faculty_id:
            # Handle both old format (0001) and new format (CID-2024-00001)
            if counselor.faculty_id.startswith(f'CID-{current_year}-'):
                try:
                    # Extract number after CID-2024-
                    number_part = counselor.faculty_id.split('-')[-1]
                    number = int(number_part)
                    max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue
            elif counselor.faculty_id.isdigit():
                # Handle old format (0001, 0002, etc.)
                try:
                    number = int(counselor.faculty_id)
                    max_number = max(max_number, number)
                except ValueError:
                    continue
    
    # Generate next number
    next_number = max_number + 1
    return f'CID-{current_year}-{next_number:05d}'

def generate_admin_id():
    """Generate automatic Admin ID with format AID-2024-00001"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Get the highest existing admin ID number for current year
    existing_admins = User.objects.filter(
        role='admin', 
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    if not existing_admins.exists():
        return f'AID-{current_year}-00001'
    
    # Extract numbers from existing IDs and find the highest for current year
    max_number = 0
    for admin in existing_admins:
        if admin.faculty_id:
            # Handle both old format (0001) and new format (AID-2024-00001)
            if admin.faculty_id.startswith(f'AID-{current_year}-'):
                try:
                    # Extract number after AID-2024-
                    number_part = admin.faculty_id.split('-')[-1]
                    number = int(number_part)
                    max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue
            elif admin.faculty_id.isdigit():
                # Handle old format (0001, 0002, etc.)
                try:
                    number = int(admin.faculty_id)
                    max_number = max(max_number, number)
                except ValueError:
                    continue
    
    # Generate next number
    next_number = max_number + 1
    return f'AID-{current_year}-{next_number:05d}'

def generate_clinic_id():
    """Generate automatic Clinic/Nurse ID with format NID-2024-00001"""
    from datetime import datetime
    current_year = datetime.now().year
    
    # Get the highest existing clinic ID number for current year
    existing_clinics = User.objects.filter(
        role='clinic', 
        faculty_id__isnull=False
    ).exclude(faculty_id='')
    
    if not existing_clinics.exists():
        return f'NID-{current_year}-00001'
    
    # Extract numbers from existing IDs and find the highest for current year
    max_number = 0
    for clinic in existing_clinics:
        if clinic.faculty_id:
            # Handle both old format (0001) and new format (NID-2024-00001)
            if clinic.faculty_id.startswith(f'NID-{current_year}-'):
                try:
                    # Extract number after NID-2024-
                    number_part = clinic.faculty_id.split('-')[-1]
                    number = int(number_part)
                    max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue
            elif clinic.faculty_id.isdigit():
                # Handle old format (0001, 0002, etc.)
                try:
                    number = int(clinic.faculty_id)
                    max_number = max(max_number, number)
                except ValueError:
                    continue
    
    # Generate next number
    next_number = max_number + 1
    return f'NID-{current_year}-{next_number:05d}'

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'role']
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].required = True
        self.fields['email'].required = True
        self.fields['full_name'].required = True
        self.fields['role'].required = True

@method_decorator(ensure_csrf_cookie, name='dispatch')
class GetCSRFToken(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        response = Response({'message': 'CSRF cookie set'})
        response['X-CSRFToken'] = get_token(request)
        response.set_cookie(
            'csrftoken',
            get_token(request),
            max_age=60 * 60 * 24 * 7,
            httponly=False,
            samesite='Lax',
            secure=False,
            path='/',
        )
        return response

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def generate_username(full_name, role=None):
    """
    Generate username based on role and full name
    Format: {role_prefix}.{fullname_cleaned}@amieti.com
    """
    if not full_name:
        return f"user@amieti.com"
    
    # Clean the full name - remove spaces and special characters
    cleaned_name = full_name.strip().lower().replace(' ', '').replace('-', '').replace('.', '').replace(',', '')
    
    # Role prefixes
    role_prefixes = {
        'student': 'student',
        'faculty': 'faculty', 
        'admin': 'admin',
        'clinic': 'nurse',
        'counselor': 'counselor'
    }
    
    # Get role prefix, default to 'user' if role not found
    role_prefix = role_prefixes.get(role, 'user') if role else 'user'
    
    # Generate username
    username = f"{role_prefix}.{cleaned_name}@amieti.com"
    
    # Check if username already exists and add number if needed
    counter = 1
    original_username = username
    while User.objects.filter(username=username).exists():
        username = f"{role_prefix}.{cleaned_name}{counter}@amieti.com"
        counter += 1
        if counter > 10:  # Prevent infinite loop
            break
    
    return username

def generate_random_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def send_credentials_email(user, password):
    subject = "Your Amieti Account Credentials"
    message = f"""Hello {user.full_name},
    
Your Amieti account has been {'created' if user._state.adding else 'updated'}.

Here are your login credentials:
Username: {user.username}
Password: {password}

Please log in at: http://localhost:3000/login

Please use these credentials to log in to your account.

Best regards,
Amieti Team"""

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .credentials {{ background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }}
            .footer {{ text-align: center; padding: 20px; font-size: 0.9em; color: #666; }}
            .button {{ 
                display: inline-block; 
                padding: 10px 20px; 
                background-color: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Amieti</h2>
            </div>
            <div class="content">
                <p>Hello {user.full_name},</p>
                <p>Your Amieti account has been {'created' if user._state.adding else 'updated'}.</p>
                
                <div class="credentials">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Password:</strong> {password}</p>
                </div>
                
                <p>Please click the button below to log in:</p>
                <a href="http://localhost:3000/login" class="button">Login to Amieti</a>
                
                <p>Please use these credentials to log in to your account.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br>Amieti Team</p>
            </div>
        </div>
    </body>
    </html>
    """

    max_retries = 3
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
                html_message=html_message
            )
            # Email sent successfully
            return True
        except Exception as e:
            # Email attempt failed
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                # All email attempts failed
                raise Exception(f"Failed to send email after {max_retries} attempts: {str(e)}")

def send_forgot_password_email(user, new_password):
    subject = "Your Amieti Password Has Been Reset"
    message = f"""Hello {user.full_name},
    
Your password has been reset.

Username: {user.username}
New Password: {new_password}

Please log in using these credentials."""

    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .credentials {{ background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }}
            .footer {{ text-align: center; padding: 20px; font-size: 0.9em; color: #666; }}
            .button {{ 
                display: inline-block; 
                padding: 10px 20px; 
                background-color: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Amieti</h2>
            </div>
            <div class="content">
                <p>Hello {user.full_name},</p>
                <p>Your password has been reset successfully.</p>
                
                <div class="credentials">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>New Password:</strong> {new_password}</p>
                </div>
                
                <p>Please click the button below to log in:</p>
                <a href="http://localhost:3000/login" class="button">Login to Amieti</a>
                
                <p>Please use these new credentials to log in to your account.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br>Amieti Team</p>
            </div>
        </div>
    </body>
    </html>
    """

    max_retries = 3
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
                html_message=html_message
            )
            # Email sent successfully
            return True
        except Exception as e:
            # Email attempt failed
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                # All email attempts failed
                raise Exception(f"Failed to send email after {max_retries} attempts: {str(e)}")

class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated]

    def check_admin_permission(self, request):
        if not request.user.is_authenticated or request.user.role != 'admin':
            return Response(
                {"error": "Only admin users can perform this action"},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def get(self, request):
        permission_error = self.check_admin_permission(request)
        if permission_error: return permission_error

        # Automatically migrate existing IDs to new format
        try:
            migrate_existing_ids()
        except Exception as e:
            # Auto-migration warning
            # Continue even if migration fails
            pass

        pagination = CustomPageNumberPagination()
        users = User.objects.all().order_by('-date_joined')
        paginated_users = pagination.paginate_queryset(users, request)
        
        results = []
        for user in paginated_users:
            results.append({
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'timestamp': user.date_joined,
                'last_login': user.last_login,
                'student_id': getattr(user, 'student_id', ''),
                'grade': getattr(user, 'grade', ''),
                'section': getattr(user, 'section', ''),
                'faculty_id': getattr(user, 'faculty_id', ''),
                'dob': getattr(user, 'dob', '')
            })
        
        return pagination.get_paginated_response(results)
    
    def post(self, request):
        permission_error = self.check_admin_permission(request)
        if permission_error: return permission_error

        full_name = request.data.get('full_name')
        email = request.data.get('email')
        role = request.data.get('role')
        student_id = request.data.get('student_id')
        grade = request.data.get('grade')
        section = request.data.get('section')
        faculty_id = request.data.get('faculty_id')
        dob = request.data.get('date_of_birth')

        if not full_name or not email or not role:
            return Response(
                {"error": "Full name, email, and role are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "User with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = generate_username(full_name, role)
        password = generate_random_password()
        warning_message = None

        # Auto-generate IDs if not provided
        if role == 'student' and not student_id:
            student_id = generate_student_id()
        elif role == 'faculty' and not faculty_id:
            faculty_id = generate_faculty_id()
        elif role == 'counselor' and not faculty_id:
            faculty_id = generate_counselor_id()
        elif role == 'admin' and not faculty_id:
            faculty_id = generate_admin_id()
        elif role == 'clinic' and not faculty_id:
            faculty_id = generate_clinic_id()

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                full_name=full_name,
                role=role,
                password=password,
                is_active=True,
                student_id=student_id if role == 'student' else '',
                grade=grade if role == 'student' else '',
                section=section if role == 'student' else '',
                faculty_id=faculty_id if role in ['faculty', 'counselor', 'admin', 'clinic'] else '',
                dob=dob
            )
            user.save()

            # Attempt to send email
            try:
                send_credentials_email(user, password)
            except Exception as e:
                warning_message = f"User created, but failed to send email: {str(e)}"
                # Log the warning

            # Return the created user data including the generated ID
            response_data = {
                "message": "User created successfully",
                "user": {
                    'id': user.id,
                    'username': user.username,
                    'full_name': user.full_name,
                    'email': user.email,
                    'role': user.role,
                    'is_active': user.is_active,
                    'student_id': user.student_id,
                    'grade': user.grade,
                    'section': user.section,
                    'faculty_id': user.faculty_id,
                    'dob': user.dob
                }
            }
            if warning_message:
                response_data["warning"] = warning_message

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Failed to create user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        permission_error = self.check_admin_permission(request)
        if permission_error: return permission_error

        user_id = request.data.get('user_id')
        full_name = request.data.get('full_name')
        email = request.data.get('email')
        role = request.data.get('role')
        student_id = request.data.get('student_id')
        grade = request.data.get('grade')
        section = request.data.get('section')
        faculty_id = request.data.get('faculty_id')
        dob = request.data.get('date_of_birth')

        if not user_id or not full_name or not email or not role:
            return Response(
                {"error": "User ID, full name, email, and role are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate new password for updated user
        new_password = generate_random_password()
        
        user.full_name = full_name
        user.email = email
        user.role = role
        
        # Preserve existing IDs - never change them during updates
        if role == 'student':
            # Keep existing student_id, only update grade and section
            user.grade = grade
            user.section = section
            user.faculty_id = ''
        elif role in ['faculty', 'counselor', 'admin', 'clinic']:
            # Keep existing faculty_id, clear student fields
            user.student_id = ''
            user.grade = ''
            user.section = ''
        else:
            # For other roles, clear student and faculty IDs
            user.student_id = ''
            user.faculty_id = ''
            user.grade = ''
            user.section = ''
            
        if dob:
            user.dob = dob
            
        # Set new password
        user.set_password(new_password)
        user.save()

        # Attempt to send email with new credentials
        warning_message = None
        try:
            send_credentials_email(user, new_password)
        except Exception as e:
            warning_message = f"User updated, but failed to send email: {str(e)}"
            # Log the warning

        # Return response
        response_data = {"message": "User updated successfully"}
        if warning_message:
            response_data["warning"] = warning_message

        return Response(response_data, status=status.HTTP_200_OK)

class AdminUserStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def check_admin_permission(self, request):
        if not request.user.is_authenticated or request.user.role != 'admin':
            return Response(
                {"error": "Only admin users can perform this action"},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def put(self, request, user_id):
        permission_error = self.check_admin_permission(request)
        if permission_error: return permission_error

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if 'disable' in request.path:
            user.is_active = False
            message = "User disabled successfully"
        elif 'restore' in request.path:
            user.is_active = True
            message = "User restored successfully"
        else:
            return Response(
                {"error": "Invalid action"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.save()
        return Response({"message": message}, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is not None:
            if user.is_active:
                # Update last_login
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                # Log successful login with real user and role
                SystemLog.objects.create(
                    user=user.username,
                    role=getattr(user, 'role', 'Unknown'),
                    action='Logged in',
                    target='System Login',
                    details=f'IP: {request.META.get("REMOTE_ADDR")}'
                )
                tokens = get_tokens_for_user(user)
                return Response({
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'is_active': user.is_active,
                        'accepted_terms': getattr(user, 'accepted_terms', False)
                    }
                })
            else:
                return Response(
                    {"error": "Your account is disabled. Please contact an administrator."},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "No user found with that email address"}, status=status.HTTP_404_NOT_FOUND)

        new_password = generate_random_password()
        user.set_password(new_password)
        user.save()

        try:
            send_forgot_password_email(user, new_password)
            return Response({"message": "Password reset successfully. Check your email for new credentials."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to send password reset email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        # This view seems redundant with AdminCreateUserView. 
        # Consider refactoring or removing if not explicitly needed.
        username = request.data.get('username')
        email = request.data.get('email')
        full_name = request.data.get('full_name')
        role = request.data.get('role')
        password = generate_random_password() # Generate a password for new users

        if not all([username, email, full_name, role]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                full_name=full_name,
                role=role,
                password=password,
                is_active=True
            )
            send_credentials_email(user, password) # Send credentials via email
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        # This view seems redundant with AdminCreateUserView's PUT method.
        # Consider refactoring or removing if not explicitly needed.
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        full_name = request.data.get('full_name', user.full_name)
        email = request.data.get('email', user.email)
        role = request.data.get('role', user.role)

        if user.email != email and User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user.full_name = full_name
        user.email = email
        user.role = role
        user.save()

        return Response({"message": "User updated successfully"}, status=status.HTTP_200_OK)

class TestEmailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            # Example usage: Replace with an actual user email for testing
            send_mail(
                'Test Subject',
                'This is a test email from Django.',
                settings.DEFAULT_FROM_EMAIL,
                ['recipient@example.com'], # Replace with your test email
                fail_silently=False,
            )
            return Response({"message": "Test email sent successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_sessions(request):
    """Get count of active sessions (users who are logged in until they logout)"""
    try:
        # Get all users who have logged in
        logged_in_users = User.objects.filter(
            last_login__isnull=False,
            is_active=True
        )
        
        # Get all logout events from SystemLog
        logout_events = SystemLog.objects.filter(
            action='Logged out'
        ).values_list('user', flat=True)
        
        # Count users who have logged in but haven't logged out
        active_users = 0
        for user in logged_in_users:
            # Check if this user has a logout event after their last login
            user_logout_events = SystemLog.objects.filter(
                user=user.username,
                action='Logged out',
                datetime__gte=user.last_login
            )
            
            # If no logout events after last login, consider user as active
            if not user_logout_events.exists():
                active_users += 1
        
        return Response({
            "active_sessions": active_users
        })
    except Exception as e:
        return Response({
            "active_sessions": 0,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Track user logout event"""
    try:
        user = request.user
        # Update user's last_logout field if it exists, otherwise just log the event
        # For now, we'll just log the logout event in SystemLog
        SystemLog.objects.create(
            user=user.username,
            role=user.role,
            action='Logged out',
            target='System Logout',
            details=f'User {user.username} logged out'
        )
        
        return Response({
            "message": "Logout tracked successfully"
        })
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_statistics(request):
    """Get monthly statistics for dashboard cards"""
    try:
        from datetime import datetime, timedelta
        
        # Get current date
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate last month
        if current_month_start.month == 1:
            last_month_start = current_month_start.replace(year=current_month_start.year - 1, month=12)
        else:
            last_month_start = current_month_start.replace(month=current_month_start.month - 1)
        
        # Calculate last month end
        if last_month_start.month == 12:
            last_month_end = last_month_start.replace(year=last_month_start.year + 1, month=1) - timedelta(days=1)
        else:
            last_month_end = last_month_start.replace(month=last_month_start.month + 1) - timedelta(days=1)
        
        # Current month user count
        current_month_users = User.objects.filter(
            date_joined__gte=current_month_start,
            is_active=True
        ).count()
        
        # Last month user count
        last_month_users = User.objects.filter(
            date_joined__gte=last_month_start,
            date_joined__lte=last_month_end,
            is_active=True
        ).count()
        
        # Calculate user growth
        user_growth = current_month_users - last_month_users
        
        # Calculate incident reports (using system logs as proxy)
        current_month_incidents = SystemLog.objects.filter(
            datetime__gte=current_month_start,
            action__icontains='incident'
        ).count()
        
        last_month_incidents = SystemLog.objects.filter(
            datetime__gte=last_month_start,
            datetime__lte=last_month_end,
            action__icontains='incident'
        ).count()
        
        # Calculate incident percentage change
        incident_change_percentage = 0
        if last_month_incidents > 0:
            incident_change_percentage = ((current_month_incidents - last_month_incidents) / last_month_incidents) * 100
        elif current_month_incidents > 0:
            incident_change_percentage = 100  # New incidents this month
        
        return Response({
            "user_growth": user_growth,
            "incident_change_percentage": round(incident_change_percentage, 1),
            "current_month_users": current_month_users,
            "last_month_users": last_month_users,
            "current_month_incidents": current_month_incidents,
            "last_month_incidents": last_month_incidents
        })
    except Exception as e:
        return Response({
            "user_growth": 0,
            "incident_change_percentage": 0,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    if request.method == 'GET':
        response_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'is_active': user.is_active,
            'gender': getattr(user, 'gender', ''),
            'dob': getattr(user, 'dob', ''),
            'mobile': getattr(user, 'mobile', ''),
            'residential': getattr(user, 'residential', ''),
            'permanent': getattr(user, 'permanent', ''),
            'guardianEmail': getattr(user, 'guardian_email', '') if user.role == 'student' else '',
            'student_id': getattr(user, 'student_id', '') if user.role == 'student' else '',
            'grade': getattr(user, 'grade', '') if user.role == 'student' else '',
            'section': getattr(user, 'section', '') if user.role == 'student' else '',
            'faculty_id': getattr(user, 'faculty_id', '') if user.role in ['faculty', 'counselor', 'admin', 'clinic'] else '',
        }
        # Debug: Print user response (only for debugging specific issues)
        # print(f"GET Response for user {user.id} (role: {user.role}): {response_data}")
        # print(f"faculty_id value: {getattr(user, 'faculty_id', 'NOT SET')}")
        return Response(response_data)
    elif request.method == 'PATCH':
        allowed_fields = ['gender', 'dob', 'mobile', 'residential', 'permanent']
        if user.role == 'student':
            allowed_fields.extend(['guardian_email', 'student_id', 'grade', 'section'])
        elif user.role in ['faculty', 'counselor', 'admin', 'clinic']:
            allowed_fields.extend(['faculty_id'])
        data = request.data
        # Debug: Print PATCH request data (only for debugging specific issues)
        # print(f"PATCH Request data: {data}")
        # print(f"User role: {user.role}")
        # print(f"Allowed fields: {allowed_fields}")
        updated = False
        for field in allowed_fields:
            # Accept both guardian_email and guardianEmail from frontend
            if field in data:
                setattr(user, field, data[field])
                updated = True
                # print(f"Updated field {field} to {data[field]}")
            if field == 'guardian_email' and 'guardianEmail' in data:
                setattr(user, field, data['guardianEmail'])
                updated = True
                # print(f"Updated guardian_email to {data['guardianEmail']}")
        if updated:
            user.save()
            # print(f"User saved. faculty_id is now: {getattr(user, 'faculty_id', 'NOT SET')}")
        response_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'is_active': user.is_active,
            'gender': getattr(user, 'gender', ''),
            'dob': getattr(user, 'dob', ''),
            'mobile': getattr(user, 'mobile', ''),
            'residential': getattr(user, 'residential', ''),
            'permanent': getattr(user, 'permanent', ''),
            'guardianEmail': getattr(user, 'guardian_email', '') if user.role == 'student' else '',
            'student_id': getattr(user, 'student_id', '') if user.role == 'student' else '',
            'grade': getattr(user, 'grade', '') if user.role == 'student' else '',
            'section': getattr(user, 'section', '') if user.role == 'student' else '',
            'faculty_id': getattr(user, 'faculty_id', '') if user.role in ['faculty', 'counselor', 'admin', 'clinic'] else '',
        }
        # print(f"PATCH Response: {response_data}")
        return Response(response_data)

class StudentListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        students = User.objects.filter(role='student')
        data = [
            {
                "id": s.id, 
                "full_name": s.full_name, 
                "email": s.email,
                "grade": getattr(s, 'grade', ''),
                "section": getattr(s, 'section', ''),
                "student_id": getattr(s, 'student_id', '')
            }
            for s in students
        ]
        return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_terms(request):
    """Accept terms and conditions for the authenticated user"""
    try:
        user = request.user
        user.accepted_terms = True
        user.save(update_fields=['accepted_terms'])
        
        # Log the action
        SystemLog.objects.create(
            user=user.username,
            role=user.role,
            action='Accepted Terms and Conditions',
            target='Terms & Conditions',
            details=f'User {user.username} accepted terms and conditions'
        )
        
        return Response({
            "message": "Terms and conditions accepted successfully",
            "accepted_terms": True
        })
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
