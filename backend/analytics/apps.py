from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'

    def ready(self):
        """Load fine-tuned BERT model when Django starts"""
        # Temporarily disabled for faster startup
        # The model will be loaded on-demand when needed
        pass