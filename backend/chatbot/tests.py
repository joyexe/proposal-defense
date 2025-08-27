from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import AnonymizedConversationMetadata, MentalHealthAlert, KeywordFlag
from .utils import detect_keywords, calculate_risk_score, should_create_alert

User = get_user_model()

class ChatbotUtilsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='student',
            full_name='Test User'
        )
    
    def test_keyword_detection_stress(self):
        """Test detection of stress-related keywords"""
        message = "I'm feeling really stressed about my exams"
        flagged = detect_keywords(message)
        
        self.assertEqual(len(flagged), 1)
        self.assertEqual(flagged[0]['category'], 'stress')
        self.assertIn('stressed', flagged[0]['detected_words'])
    
    def test_keyword_detection_anxiety(self):
        """Test detection of anxiety-related keywords"""
        message = "I feel anxious and worried all the time"
        flagged = detect_keywords(message)
        
        self.assertEqual(len(flagged), 1)
        self.assertEqual(flagged[0]['category'], 'anxiety')
        self.assertIn('anxious', flagged[0]['detected_words'])
        self.assertIn('worried', flagged[0]['detected_words'])
    
    def test_keyword_detection_high(self):
        """Test detection of high severity keywords"""
        message = "I want to hurt myself"
        flagged = detect_keywords(message)
        
        self.assertTrue(len(flagged) > 0)
        high_flags = [f for f in flagged if f['severity'] == 'high']
        self.assertTrue(len(high_flags) > 0)
    
    def test_no_keywords_detected(self):
        """Test that normal messages don't trigger keywords"""
        message = "Hello, how are you today? I'm doing well."
        flagged = detect_keywords(message)
        
        self.assertEqual(len(flagged), 0)
    
    def test_risk_score_calculation(self):
        """Test risk score calculation for a user"""
        score = calculate_risk_score(self.user)
        
        # New user should have low risk score
        self.assertLessEqual(score, 3)
    
    def test_alert_creation_logic(self):
        """Test alert creation logic"""
        # Test with high severity keywords
        high_keywords = [{'category': 'suicidal', 'severity': 'high', 'detected_words': ['hurt myself']}]
        should_alert, alert_data = should_create_alert(self.user, high_keywords, 5)
        
        self.assertTrue(should_alert)
        self.assertEqual(alert_data['severity'], 'high')
        
        # Test with no keywords
        no_keywords = []
        should_alert, alert_data = should_create_alert(self.user, no_keywords, 3)
        
        self.assertFalse(should_alert)

class ChatbotModelsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='student',
            full_name='Test User'
        )
        self.conversation_metadata = AnonymizedConversationMetadata.objects.create(
            session_id='test-session-123',
            conversation_type='general',
            risk_level='low'
        )
    
    def test_conversation_metadata_creation(self):
        """Test anonymized conversation metadata creation"""
        self.assertEqual(self.conversation_metadata.session_id, 'test-session-123')
        self.assertEqual(self.conversation_metadata.conversation_type, 'general')
        self.assertEqual(self.conversation_metadata.risk_level, 'low')
        self.assertIsNotNone(self.conversation_metadata.started_at)
    
    def test_keyword_flag_creation(self):
        """Test keyword flag creation"""
        keyword_flag = KeywordFlag.objects.create(
            keyword='stress',
            category='stress',
            session_id=self.conversation_metadata.session_id
        )
        
        self.assertEqual(keyword_flag.keyword, 'stress')
        self.assertEqual(keyword_flag.category, 'stress')
        self.assertEqual(keyword_flag.session_id, self.conversation_metadata.session_id)
    
    def test_mental_health_alert_creation(self):
        """Test mental health alert creation"""
        alert = MentalHealthAlert.objects.create(
            student=self.user,
            alert_type='keyword_detected',
            severity='high',
            title='Test Alert',
            description='Test description',
            session_id=self.conversation_metadata.session_id
        )
        
        self.assertEqual(alert.student, self.user)
        self.assertEqual(alert.severity, 'high')
        self.assertEqual(alert.session_id, self.conversation_metadata.session_id)