from django.db import models
from django.contrib.auth import get_user_model
import re, base64
from django.core.files.base import ContentFile

User = get_user_model()

class BulletinPost(models.Model):
    POST_TYPES = (
        ('Physical', 'Physical Health'),
        ('Mental', 'Mental Health'),
    )
    
    STATUS_CHOICES = (
        ('Posted', 'Posted'),
        ('Archived', 'Archived'),
    )

    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=30, default='Advisory')
    post_type = models.CharField(max_length=10, choices=POST_TYPES, default='Physical')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Posted')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bulletin_posts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_post_type_display()}"

    def extract_and_save_base64_image(self):
        match = re.search(r'<img src="data:image/(?P<ext>[^;]+);base64,(?P<data>[^"]+)"', self.content)
        if match:
            ext = match.group('ext').split('/')[-1]
            data = match.group('data')
            image_data = base64.b64decode(data)
            file_name = f"bulletin_{self.pk or 'new'}.{ext}"
            self.image.save(file_name, ContentFile(image_data), save=False)
            self.content = re.sub(
                r'<img src="data:image/[^>]+>"',
                f'<img src="/media/bulletin_images/{file_name}">',
                self.content
            )
