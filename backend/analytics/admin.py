from django.contrib import admin
from .models import (
    MentalHealthTrend, AnalyticsSnapshot, ICD11Entity, ICD11Mapping, 
    AnalyticsCache, PhysicalHealthTrend, MentalHealthAlert, RiskLevelDistribution, 
    MentalHealthPattern
)

@admin.register(MentalHealthTrend)
class MentalHealthTrendAdmin(admin.ModelAdmin):
    list_display = ('date', 'anxiety_count', 'depression_count', 'stress_count', 'general_wellness_count', 'total_students')
    list_filter = ('date',)
    readonly_fields = ('created_at',)

@admin.register(PhysicalHealthTrend)
class PhysicalHealthTrendAdmin(admin.ModelAdmin):
    list_display = ('date', 'fever_count', 'headache_count', 'cough_count', 'stomach_pain_count', 'injury_count', 'total_students')
    list_filter = ('date',)
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Physical Health Counts', {
            'fields': ('date', 'fever_count', 'headache_count', 'cough_count', 'stomach_pain_count', 'injury_count')
        }),
        ('Category Counts', {
            'fields': ('respiratory_count', 'gastrointestinal_count', 'musculoskeletal_count', 'other_physical_count')
        }),
        ('Summary', {
            'fields': ('total_students',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    list_display = ('snapshot_type', 'date', 'created_at')
    list_filter = ('snapshot_type', 'date')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Snapshot Information', {
            'fields': ('snapshot_type', 'date'),
            'description': 'Analytics snapshots store periodic aggregated data for performance optimization and historical reporting'
        }),
        ('Data', {
            'fields': ('data',),
            'classes': ('collapse',),
            'description': 'JSON data containing aggregated analytics information'
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(ICD11Entity)
class ICD11EntityAdmin(admin.ModelAdmin):
    list_display = ('entity_id', 'is_active', 'last_updated', 'created_at')
    list_filter = ('is_active', 'last_updated', 'created_at')
    search_fields = ('entity_id',)
    readonly_fields = ('created_at', 'last_updated')
    
    def has_add_permission(self, request):
        # Disable manual addition - entities should be created via API
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup purposes
        return True

@admin.register(ICD11Mapping)
class ICD11MappingAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'confidence_score', 'source', 'is_active', 'created_at')
    list_filter = ('source', 'is_active', 'confidence_score', 'created_at')
    search_fields = ('code', 'description', 'local_terms')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('ICD-11 Information', {
            'fields': ('code', 'description', 'confidence_score', 'source')
        }),
        ('Local Terms', {
            'fields': ('local_terms',),
            'description': 'Tagalog/English terms that map to this ICD-11 code'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request)
    
    def has_add_permission(self, request):
        # Allow manual addition for testing and customization
        return True
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup purposes
        return True

@admin.register(AnalyticsCache)
class AnalyticsCacheAdmin(admin.ModelAdmin):
    list_display = ('date', 'icd_code', 'count', 'source_type', 'created_at')
    list_filter = ('date', 'source_type', 'icd_code', 'created_at')
    search_fields = ('icd_code__code', 'icd_code__description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-date', '-count')
    
    fieldsets = (
        ('Analytics Data', {
            'fields': ('date', 'icd_code', 'count', 'source_type')
        }),
        ('Trend Data', {
            'fields': ('trend_data',),
            'classes': ('collapse',),
            'description': 'Pre-calculated trend analytics data'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('icd_code')
    
    def has_add_permission(self, request):
        # Allow manual addition for testing
        return True
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup purposes
        return True



@admin.register(MentalHealthAlert)
class MentalHealthAlertAdmin(admin.ModelAdmin):
    list_display = ('student', 'alert_type', 'severity', 'status', 'risk_level', 'created_at')
    list_filter = ('alert_type', 'severity', 'status', 'risk_level', 'created_at')
    search_fields = ('student__username', 'student__full_name', 'title', 'description')
    readonly_fields = ('created_at', 'resolved_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Alert Information', {
            'fields': ('student', 'counselor', 'alert_type', 'severity', 'title', 'description', 'status')
        }),
        ('Risk Assessment', {
            'fields': ('risk_level', 'risk_score', 'detected_keywords', 'related_keywords')
        }),
        ('Related Data', {
            'fields': ('related_appointment', 'session_id'),
            'classes': ('collapse',)
        }),
        ('Follow-up', {
            'fields': ('follow_up_required', 'follow_up_date', 'follow_up_appointment'),
            'classes': ('collapse',)
        }),
        ('Resolution', {
            'fields': ('resolved_at', 'resolved_by', 'resolution_notes'),
            'classes': ('collapse',)
        }),
    )

@admin.register(RiskLevelDistribution)
class RiskLevelDistributionAdmin(admin.ModelAdmin):
    list_display = ('date', 'high_risk_count', 'moderate_risk_count', 'low_risk_count', 'total_assessments')
    list_filter = ('date',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'date'

@admin.register(MentalHealthPattern)
class MentalHealthPatternAdmin(admin.ModelAdmin):
    list_display = ('student', 'pattern_type', 'consecutive_days', 'start_date', 'end_date', 'severity_score', 'alert_created')
    list_filter = ('pattern_type', 'alert_created', 'start_date', 'end_date')
    search_fields = ('student__username', 'student__full_name')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'