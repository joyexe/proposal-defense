from .views import AppointmentViewSet, AvailabilityViewSet, ProviderListView, ProviderAvailableTimesView, TeacherListView, FacultyDashboardCountsView, ClinicTodayAppointmentsView, ClinicUpcomingAppointmentsView, ClinicReferralsCountView, CounselorTodayAppointmentsView, CounselorReferralsCountView, CounselorActiveCasesView, get_student_appointment_notifications, get_faculty_appointment_notifications, get_clinic_appointment_notifications, get_counselor_appointment_notifications, mark_student_appointment_notifications_read, mark_faculty_appointment_notifications_read, mark_clinic_appointment_notifications_read, mark_counselor_appointment_notifications_read
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet, basename='appointments')
router.register(r'availability', AvailabilityViewSet, basename='availability')

urlpatterns = [
    path('', include(router.urls)),
    path('providers/', ProviderListView.as_view(), name='provider-list'),
    path('provider-times/', ProviderAvailableTimesView.as_view(), name='provider-times'),
    path('teachers/', TeacherListView.as_view(), name='teacher-list'),
    path('faculty-dashboard-counts/', FacultyDashboardCountsView.as_view(), name='faculty-dashboard-counts'),
    path('clinic-today-appointments/', ClinicTodayAppointmentsView.as_view(), name='clinic-today-appointments'),
    path('clinic-upcoming-appointments/', ClinicUpcomingAppointmentsView.as_view(), name='clinic-upcoming-appointments'),
    path('clinic-referrals-count/', ClinicReferralsCountView.as_view(), name='clinic-referrals-count'),
    path('counselor-today-appointments/', CounselorTodayAppointmentsView.as_view(), name='counselor-today-appointments'),
    path('counselor-referrals-count/', CounselorReferralsCountView.as_view(), name='counselor-referrals-count'),
    path('counselor-active-cases/', CounselorActiveCasesView.as_view(), name='counselor-active-cases'),
    
    # Appointment Notification URLs
    path('student-notifications/', get_student_appointment_notifications, name='student-appointment-notifications'),
    path('student-notifications/mark-read/', mark_student_appointment_notifications_read, name='mark-student-appointment-notifications-read'),
    path('faculty-notifications/', get_faculty_appointment_notifications, name='faculty-appointment-notifications'),
    path('faculty-notifications/mark-read/', mark_faculty_appointment_notifications_read, name='mark-faculty-appointment-notifications-read'),
    path('clinic-notifications/', get_clinic_appointment_notifications, name='clinic-appointment-notifications'),
    path('clinic-notifications/mark-read/', mark_clinic_appointment_notifications_read, name='mark-clinic-appointment-notifications-read'),
    path('counselor-notifications/', get_counselor_appointment_notifications, name='counselor-appointment-notifications'),
    path('counselor-notifications/mark-read/', mark_counselor_appointment_notifications_read, name='mark-counselor-appointment-notifications-read'),
] 