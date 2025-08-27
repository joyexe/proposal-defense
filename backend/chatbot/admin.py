from django.contrib import admin
from .models import AnonymizedConversationMetadata, KeywordFlag

@admin.register(AnonymizedConversationMetadata)
class AnonymizedConversationMetadataAdmin(admin.ModelAdmin):
    list_display = ('session_id_short', 'risk_level', 'conversation_type', 'interaction_date', 'alert_created')
    list_filter = ('risk_level', 'conversation_type', 'interaction_date', 'alert_created', 'intent_detection_method')
    search_fields = ('session_id',)
    readonly_fields = ('started_at', 'interaction_date')
    date_hierarchy = 'interaction_date'
    
    def session_id_short(self, obj):
        return obj.session_id[:12] + '...' if len(obj.session_id) > 12 else obj.session_id
    session_id_short.short_description = 'Session ID'



@admin.register(KeywordFlag)
class KeywordFlagAdmin(admin.ModelAdmin):
    list_display = ('keyword', 'category', 'session_id_short', 'detected_at')
    list_filter = ('category', 'detected_at')
    search_fields = ('keyword', 'category', 'session_id')
    readonly_fields = ('detected_at',)
    date_hierarchy = 'detected_at'
    
    def session_id_short(self, obj):
        return obj.session_id[:12] + '...' if len(obj.session_id) > 12 else obj.session_id
    session_id_short.short_description = 'Session ID'