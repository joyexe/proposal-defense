from django.contrib import admin
from .models import PermitRequest, RecentActivity

@admin.register(PermitRequest)
class PermitRequestAdmin(admin.ModelAdmin):
    list_display = [
        'student', 'date', 'time', 'grade', 'section', 'status', 
        'diagnosis_code', 'diagnosis_name',
        'faculty_decision_by', 'clinic_assessment_by', 'created_at'
    ]
    list_filter = [
        'status', 'faculty_decision', 'outcome', 'date', 'created_at', 
        'grade', 'section', 'teacher', 'provider', 'diagnosis_code'
    ]
    search_fields = [
        'student__full_name', 'student__username', 'teacher__full_name', 
        'provider__full_name', 'reason', 'grade', 'section', 'nursing_intervention',
        'diagnosis_code', 'diagnosis_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'faculty_decision_at', 
        'clinic_assessment_at'
    ]
    date_hierarchy = 'created_at'
    
    def get_fieldsets(self, request, obj=None):
        return [
            ('Basic Information', {
                'fields': ('student', 'teacher', 'provider', 'date', 'time', 'grade', 'section', 'reason', 'status')
            }),
            ('Faculty Decision', {
                'fields': ('faculty_decision', 'faculty_decision_by', 'faculty_decision_at'),
                'classes': ('collapse',)
            }),
            ('Clinic Assessment', {
                'fields': (
                    'vital_signs_bp', 'vital_signs_temp', 'vital_signs_pr', 'vital_signs_spo2',
                    'nursing_intervention', 'diagnosis_code', 'diagnosis_name', 'outcome',
                    'outcome_date', 'outcome_time', 'parent_email', 'clinic_assessment_by', 'clinic_assessment_at'
                ),
                'classes': ('collapse',)
            }),
            ('Notification Tracking', {
                'fields': ('student_viewed_at', 'faculty_viewed_at', 'clinic_viewed_at'),
                'classes': ('collapse',)
            }),
            ('Timestamps', {
                'fields': ('created_at', 'updated_at'),
                'classes': ('collapse',)
            }),
        ]

@admin.register(RecentActivity)
class RecentActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'title', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['user__full_name', 'user__username', 'title', 'description']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
