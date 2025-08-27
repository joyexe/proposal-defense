from django.contrib import admin
from .models import MoodEntry
from django import forms

@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'mood_display', 'note', 'answer_1', 'answer_2', 'answer_3', 'recommendation')
    list_filter = ('mood', 'date', 'user')
    search_fields = ('user__email', 'note')
    ordering = ('-date',)
    fieldsets = (
        (None, {
            'fields': ('user', 'date', 'mood', 'note', 'answer_1', 'answer_2', 'answer_3', 'recommendation')
        }),
    )
    
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name in ['answer_1', 'answer_2', 'answer_3']:
            kwargs['widget'] = admin.widgets.AdminRadioSelect(choices=[(i, str(i)) for i in range(1, 6)])
        return super().formfield_for_dbfield(db_field, request, **kwargs)
    
    def mood_display(self, obj):
        return obj.get_mood_display() if obj.mood else '-'
    mood_display.short_description = 'Mood'