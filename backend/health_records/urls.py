from django.urls import path
from . import views

urlpatterns = [
    path('permit-requests/', views.get_permit_requests, name='get_permit_requests'),
    path('permit-requests/create/', views.create_permit_request, name='create_permit_request'),
    path('permit-requests/<int:pk>/', views.get_permit_request, name='get_permit_request'),
    path('permit-requests/<int:pk>/update/', views.update_permit_request, name='update_permit_request'),
    path('permit-requests/<int:pk>/clinic-assessment/', views.update_clinic_assessment, name='update_clinic_assessment'),
    path('teachers/', views.get_teachers, name='get_teachers'),
    path('providers/', views.get_providers, name='get_providers'),
    path('recent-activities/', views.get_recent_activities, name='get_recent_activities'),
    path('faculty-notifications/', views.get_faculty_notifications, name='get_faculty_notifications'),
    path('faculty-notifications/mark-read/', views.mark_faculty_notifications_read, name='mark_faculty_notifications_read'),
    path('student-notifications/', views.get_student_notifications, name='get_student_notifications'),
    path('student-notifications/mark-read/', views.mark_student_notifications_read, name='mark_student_notifications_read'),
    path('clinic-notifications/', views.get_clinic_notifications, name='get_clinic_notifications'),
    path('clinic-notifications/mark-read/', views.mark_clinic_notifications_read, name='mark_clinic_notifications_read'),
] 