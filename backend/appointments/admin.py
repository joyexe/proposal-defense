from django.contrib import admin
from .models import Appointment, Availability

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'client', 'provider', 'date', 'time', 'service_type', 'status',
        'diagnosis_code', 'diagnosis_name', 'confidence_score', 'risk_level', 'created_at'
    ]
    list_filter = [
        'status', 'service_type', 'date', 'created_at', 'provider', 'client'
    ]
    search_fields = [
        'client__full_name', 'client__username', 'provider__full_name',
        'reason', 'documentation', 'diagnosis_code', 'diagnosis_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    
    def get_fieldsets(self, request, obj=None):
        """Custom fieldsets based on service type"""
        if obj and obj.service_type == 'mental':
            # For mental health appointments, show "Mental Health Coding"
            return [
                ('Appointment Information', {
                    'fields': ('client', 'provider', 'date', 'time', 'service_type', 'status')
                }),
                ('Reason & Documentation', {
                    'fields': ('reason', 'documentation'),
                    'classes': ('collapse',)
                }),
                ('Mental Health Coding (ICD-11)', {
                    'fields': ('diagnosis_code', 'diagnosis_name', 'confidence_score', 'risk_level'),
                    'classes': ('collapse',)
                }),
                ('Additional Information', {
                    'fields': ('referral', 'created_by', 'created_at', 'updated_at'),
                    'classes': ('collapse',)
                }),
            ]
        else:
            # For physical health appointments, show "Clinical Coding"
            return [
        ('Appointment Information', {
            'fields': ('client', 'provider', 'date', 'time', 'service_type', 'status')
        }),
        ('Reason & Documentation', {
            'fields': ('reason', 'documentation'),
            'classes': ('collapse',)
        }),
        ('Clinical Coding (ICD-11)', {
                    'fields': ('diagnosis_code', 'diagnosis_name', 'confidence_score'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('referral', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    ]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'client', 'provider', 'created_by'
        )

admin.site.register(Availability)
