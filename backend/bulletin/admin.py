from django.contrib import admin
from .models import BulletinPost
from django.core.files.base import ContentFile
import base64
import re
from django.utils.safestring import mark_safe

@admin.register(BulletinPost)
class BulletinPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'post_type', 'status', 'author', 'created_at', 'end_date')
    list_filter = ('post_type', 'status', 'category', 'created_at')
    search_fields = ('title', 'content', 'author__username', 'author__full_name')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Post Information', {
            'fields': ('title', 'content', 'category', 'post_type', 'status')
        }),
        ('Author & Dates', {
            'fields': ('author', 'created_at', 'updated_at', 'end_date'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        content = obj.content
        match = re.search(r'<img src="data:image/(?P<ext>[^;]+);base64,(?P<data>[^"]+)"', content)
        if match:
            ext = match.group('ext').split('/')[-1]
            data = match.group('data')
            image_data = base64.b64decode(data)
            file_name = f"bulletin_{obj.pk or 'new'}.{ext}"
            obj.image.save(file_name, ContentFile(image_data), save=False)
            obj.content = re.sub(
                r'<img src="data:image/[^>]+>"',
                f'<img src="/media/bulletin_images/{file_name}">',
                content
            )
        super().save_model(request, obj, form, change)

    def image_preview(self, obj):
        if hasattr(obj, 'image') and obj.image:
            url = obj.image.url
            return mark_safe(f'<a href="{url}" target="_blank"><img src="{url}" style="max-width: 300px; max-height: 300px;" /></a>')
        match = re.search(r'<img[^>]+src=["\"]([^"\"]+)["\"]', obj.content or '')
        if match:
            url = match.group(1)
            if url.startswith('/media/'):
                url = f'http://127.0.0.1:8080{url}'
            return mark_safe(f'<a href="{url}" target="_blank"><img src="{url}" style="max-width: 300px; max-height: 300px;" /></a>')
        return "-"
    image_preview.allow_tags = True
    image_preview.short_description = 'Current Image Preview'
