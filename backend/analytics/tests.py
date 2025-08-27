from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import MentalHealthAlert
from .utils import is_duplicate_alert, create_alert_if_not_duplicate, cleanup_old_duplicates

User = get_user_model()


class AlertDuplicatePreventionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_is_duplicate_alert_keyword(self):
        """Test duplicate detection for keyword alerts"""
        # Create first alert
        alert1 = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Test Alert',
            description='Test description',
            related_keywords=['kill myself', 'suicide']
        )
        
        # Check if duplicate is detected for same keywords
        is_duplicate = is_duplicate_alert(
            self.user, 
            'keyword_detected', 
            ['kill myself', 'suicide']
        )
        self.assertTrue(is_duplicate)
        
        # Check if different keywords are not considered duplicate
        is_duplicate = is_duplicate_alert(
            self.user, 
            'keyword_detected', 
            ['different', 'keywords']
        )
        self.assertFalse(is_duplicate)
    
    def test_is_duplicate_alert_bert(self):
        """Test duplicate detection for BERT alerts"""
        # Create first BERT alert
        alert1 = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='bert_intent_detected',
            severity='high',
            title='BERT Alert',
            description='BERT detected high risk'
        )
        
        # Check if any BERT alert is considered duplicate
        is_duplicate = is_duplicate_alert(
            self.user, 
            'bert_intent_detected'
        )
        self.assertTrue(is_duplicate)
    
    def test_create_alert_if_not_duplicate(self):
        """Test alert creation with duplicate prevention"""
        alert_data = {
            'alert_type': 'keyword_detected',
            'severity': 'high',
            'title': 'Test Alert',
            'description': 'Test description',
            'related_keywords': ['test keyword']
        }
        
        # First alert should be created
        alert1, created1 = create_alert_if_not_duplicate(
            self.user, 
            alert_data, 
            ['test keyword']
        )
        self.assertTrue(created1)
        self.assertIsNotNone(alert1)
        
        # Second alert with same keywords should not be created
        alert2, created2 = create_alert_if_not_duplicate(
            self.user, 
            alert_data, 
            ['test keyword']
        )
        self.assertFalse(created2)
        self.assertIsNone(alert2)
    
    def test_time_window_duplicate_prevention(self):
        """Test that old alerts don't prevent new ones"""
        # Create old alert (outside time window)
        old_time = timezone.now() - timedelta(hours=2)
        old_alert = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Old Alert',
            description='Old description',
            related_keywords=['old keyword']
        )
        
        # Manually update the created_at field to be old
        old_alert.created_at = old_time
        old_alert.save()
        
        # Check if duplicate is detected (should not be, since it's old)
        is_duplicate = is_duplicate_alert(
            self.user, 
            'keyword_detected', 
            ['old keyword'],
            time_window_minutes=30  # 30 minute window
        )
        self.assertFalse(is_duplicate)
    
    def test_cleanup_old_duplicates(self):
        """Test cleanup of old duplicate alerts"""
        # Create some old duplicate alerts
        old_time = timezone.now() - timedelta(days=2)
        
        # First alert
        alert1 = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Old Alert 1',
            description='Old description 1',
            related_keywords=['duplicate keyword'],
            created_at=old_time
        )
        
        # Duplicate alert (same keywords)
        alert2 = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Old Alert 2',
            description='Old description 2',
            related_keywords=['duplicate keyword'],
            created_at=old_time + timedelta(minutes=5)
        )
        
        # Non-duplicate alert (different keywords)
        alert3 = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Old Alert 3',
            description='Old description 3',
            related_keywords=['different keyword'],
            created_at=old_time + timedelta(minutes=10)
        )
        
        # Run cleanup
        removed_count = cleanup_old_duplicates(days_back=7)
        
        # Should have removed 1 duplicate
        self.assertEqual(removed_count, 1)
        
        # Check that only the duplicate was removed
        remaining_alerts = MentalHealthAlert.objects.filter(student=self.user)
        self.assertEqual(remaining_alerts.count(), 2)
