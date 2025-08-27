from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from website.views import (
    GetCSRFToken,
    LoginView, 
    ForgotPasswordView, 
    AdminCreateUserView,
    AdminUserStatusView,
    TestEmailView,
    user_profile,
    active_sessions,
    monthly_statistics,
    logout_user,
    accept_terms
)
from mood_tracker.views import submit_mood, check_mood_submission, get_mood_data
from dashboards import views as dashboards_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/get-csrf-token/', GetCSRFToken.as_view(), name='get_csrf_token'),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('api/admin/users/', AdminCreateUserView.as_view(), name='admin_users'),
    path('api/admin/users/<int:user_id>/disable/', AdminUserStatusView.as_view(), name='admin_user_disable'),
    path('api/admin/users/<int:user_id>/restore/', AdminUserStatusView.as_view(), name='admin_user_restore'),
    path('api/test-email/', TestEmailView.as_view(), name='test_email'),
    path('api/active-sessions/', active_sessions, name='active_sessions'),
    path('api/monthly-statistics/', monthly_statistics, name='monthly_statistics'),
    path('api/logout/', logout_user, name='logout_user'),
    path('api/accept-terms/', accept_terms, name='accept_terms'),
    path('api/submit-mood/', submit_mood, name='submit_mood'),
    path('api/check-mood/', check_mood_submission, name='check_mood'),
    path('api/mood-data/', get_mood_data, name='mood_data'),
    path('api/mood/', include('mood_tracker.urls')),
    path('api/admin/dashboard/', dashboards_views.admin_dashboard, name='admin_dashboard'),
    path('api/clinic/dashboard/', dashboards_views.clinic_dashboard, name='clinic_dashboard'),
    path('api/counselor/dashboard/', dashboards_views.counselor_dashboard, name='counselor_dashboard'),
    path('api/faculty/dashboard/', dashboards_views.faculty_dashboard, name='faculty_dashboard'),
    path('api/student/dashboard/', dashboards_views.student_dashboard, name='student_dashboard'),
    path('api/user/profile/', user_profile, name='user_profile'),
    # path('api/referrals/', include('referrals.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/bulletin/', include('bulletin.urls')),
    path('api/logs/', include('logs.urls')),
    path('api/settings/', include('settings.urls')),
    path('api/website/', include('website.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/wellness-journey/', include('wellness_journey.urls')),
    path('api/health-records/', include('health_records.urls')),
    path('api/medical-exams/', include('medical_exam.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/chatbot/', include('chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)