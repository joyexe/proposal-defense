from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from analytics.models import MentalHealthAlert
from django.db.models import Q


class Command(BaseCommand):
    help = 'Clean up duplicate mental health alerts to prevent spam'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get alerts from the last 24 hours
        now = timezone.now()
        yesterday = now - timedelta(hours=24)
        
        recent_alerts = MentalHealthAlert.objects.filter(
            created_at__gte=yesterday
        ).order_by('student', 'alert_type', 'created_at')
        
        duplicates_found = 0
        duplicates_removed = 0
        
        # Group alerts by student and alert type
        current_student = None
        current_alert_type = None
        current_keywords = None
        last_alert_time = None
        
        for alert in recent_alerts:
            # Check if this is a potential duplicate
            is_duplicate = False
            
            if (current_student == alert.student and 
                current_alert_type == alert.alert_type):
                
                # For keyword alerts, check if keywords are the same
                if alert.alert_type == 'keyword_detected':
                    if (current_keywords and 
                        alert.related_keywords and 
                        set(current_keywords) == set(alert.related_keywords)):
                        is_duplicate = True
                
                # For BERT alerts, check if created within 30 minutes of last alert
                elif alert.alert_type == 'bert_intent_detected':
                    if (last_alert_time and 
                        (alert.created_at - last_alert_time).total_seconds() < 1800):  # 30 minutes
                        is_duplicate = True
            
            if is_duplicate:
                duplicates_found += 1
                self.stdout.write(
                    f'Duplicate found: {alert.student.username} - {alert.title} '
                    f'({alert.created_at})'
                )
                
                if not dry_run:
                    alert.delete()
                    duplicates_removed += 1
            else:
                # Update tracking variables
                current_student = alert.student
                current_alert_type = alert.alert_type
                current_keywords = alert.related_keywords
                last_alert_time = alert.created_at
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Found {duplicates_found} duplicate alerts that would be removed'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Removed {duplicates_removed} duplicate alerts'
                )
            )
