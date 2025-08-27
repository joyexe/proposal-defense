from rest_framework import serializers
from .models import BulletinPost
import re
from django.utils.html import strip_tags

# Utility to clean HTML: keep only <img> and text
IMG_TAG_RE = re.compile(r'<img[^>]*src=["\"][^"\"]+["\"][^>]*>')
TAG_RE = re.compile(r'<[^>]+>')

def clean_html_content(html):
    # Extract all <img> tags
    imgs = IMG_TAG_RE.findall(html)
    # Remove all tags
    text = strip_tags(html)
    # Join text and images (images at the end)
    return text + ''.join(imgs)

class BulletinPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    is_ended = serializers.SerializerMethodField()
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = BulletinPost
        fields = ['id', 'title', 'content', 'category', 'post_type', 'status', 
                 'author', 'author_name', 'created_at', 'updated_at', 
                 'end_date', 'is_ended', 'image']
        read_only_fields = ['author']

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}"

    def get_is_ended(self, obj):
        if obj.end_date:
            from django.utils import timezone
            now = timezone.now().date()
            end = obj.end_date.date()
            return now > end
        return False

    def create(self, validated_data):
        if 'content' in validated_data:
            validated_data['content'] = clean_html_content(validated_data['content'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'content' in validated_data:
            validated_data['content'] = clean_html_content(validated_data['content'])
        return super().update(instance, validated_data) 