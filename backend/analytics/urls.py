from django.urls import path
from . import views, clinic_views, counselor_views, mental_health_views

urlpatterns = [
    # Physical Health Analytics (Clinic)
    path('physical-health-trends/', clinic_views.get_physical_health_trends, name='physical_health_trends'),
    path('export-physical-health-pdf/', views.export_physical_health_pdf, name='export_physical_health_pdf'),
    
    # ICD-11 Detection (Clinic)
    path('icd/detect/', clinic_views.detect_icd_codes, name='detect_icd_codes'),
    path('icd/detect-realtime/', clinic_views.detect_icd_codes_realtime, name='detect_icd_codes_realtime'),
    path('icd/search/', clinic_views.search_icd_codes, name='search_icd_codes'),
    path('appointments/<int:appointment_id>/documentation/', clinic_views.update_appointment_documentation, name='update_appointment_documentation'),
    path('health-records/<int:permit_id>/assessment/', clinic_views.update_health_record_assessment, name='update_health_record_assessment'),
    
    # ICD-11 System Management
    path('icd11/entity/<str:entity_id>/', views.get_icd11_entity, name='get_icd11_entity'),
    path('icd11-system-status/', views.get_icd11_system_status, name='get_icd11_system_status'),
    path('icd11/refresh/', views.refresh_icd11_cache, name='refresh_icd11_cache'),
    path('icd11/search/', views.search_icd11_entities, name='search_icd11_entities'),
    path('icd11/cleanup/', views.cleanup_icd11_cache, name='cleanup_icd11_cache'),
    path('icd11/stats/', views.get_icd11_stats, name='get_icd11_stats'),
    path('test-backend/', views.test_backend_connectivity, name='test_backend_connectivity'),
    
    # Mental Health Analytics (Counselor)
    path('mental-health/detect/', mental_health_views.detect_mental_health_realtime, name='detect_mental_health_realtime'),
    path('mental-health/save-diagnosis/', mental_health_views.save_mental_health_diagnosis, name='save_mental_health_diagnosis'),
    path('mental-health/trends/', mental_health_views.mental_health_trends, name='mental_health_trends'),
    path('mental-health/risk-distribution/', mental_health_views.risk_level_distribution, name='risk_level_distribution'),
    path('mental-health/alerts/', mental_health_views.mental_health_alerts, name='mental_health_alerts'),
    path('mental-health/chatbot-analytics/', mental_health_views.chatbot_mental_health_analytics, name='chatbot_mental_health_analytics'),
    path('mental-health/summary/', mental_health_views.mental_health_analytics_summary, name='mental_health_analytics_summary'),
    
    # Counselor Analytics (Legacy - keeping for backward compatibility)
    path('counselor/mental-health-trends/', counselor_views.mental_health_trends, name='counselor_mental_health_trends'),
    path('counselor/flagged-keywords/', counselor_views.flagged_keywords, name='flagged_keywords'),
    path('counselor/risk-assessment/', counselor_views.risk_assessment, name='risk_assessment'),
    path('counselor/analytics-summary/', counselor_views.analytics_summary, name='analytics_summary'),
    path('counselor/chatbot-engagement/', counselor_views.chatbot_engagement, name='chatbot_engagement'),
    path('counselor/generate-pdf-report/', counselor_views.generate_counselor_pdf_report, name='generate_counselor_pdf_report'),
    
    # Counselor Appointment Documentation
    path('counselor/appointments/<int:appointment_id>/documentation/', counselor_views.update_counselor_appointment_documentation, name='update_counselor_appointment_documentation'),
]