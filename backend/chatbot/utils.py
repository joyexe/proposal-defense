"""
Utility functions for chatbot keyword detection and mental health assessment
"""

import re
import json
import os
from typing import List, Dict, Tuple
from django.utils import timezone
from datetime import timedelta

def load_keywords_from_json():
    """
    Load keywords from keywords.json file
    """
    try:
        # Get the path to the keywords.json file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        keywords_file = os.path.join(current_dir, 'data', 'keywords.json')
        
        with open(keywords_file, 'r', encoding='utf-8') as f:
            keywords_data = json.load(f)
        
        return keywords_data
    except Exception as e:
        # Error loading keywords.json
        return {
            'high_risk': [],
            'moderate_risk': [],
            'low_risk': []
        }

def detect_keywords(message_content: str) -> List[Dict[str, any]]:
    """
    Detect mental health keywords in a message and return flagged categories with details
    
    Args:
        message_content (str): The message content to analyze
        
    Returns:
        List[Dict]: List of detected keyword information
    """
    flagged = []
    content_lower = message_content.lower()
    
    # Load keywords from JSON file
    keywords_data = load_keywords_from_json()
    
    # First, check for positive emotions and sentiments
    positive_keywords = [
        'happy', 'masaya', 'saya', 'joy', 'excited', 'excited ako', 'kinikilig',
        'good', 'mabuti', 'okay', 'ok', 'fine', 'ayos', 'ganda', 'beautiful',
        'great', 'maganda', 'wonderful', 'amazing', 'fantastic', 'super',
        'feeling good', 'feeling great', 'feeling happy', 'feeling okay',
        'im happy', 'im good', 'im okay', 'im fine', 'im great',
        'masaya ako', 'okay ako', 'mabuti ako', 'ayos ako', 'ganda ako',
        'feeling positive', 'positive vibes', 'good vibes', 'happy vibes',
        'blessed', 'grateful', 'thankful', 'pasalamat', 'swerte', 'lucky'
    ]
    
    # Check if message contains positive emotions
    positive_detected = []
    for keyword in positive_keywords:
        if keyword in content_lower:
            positive_detected.append(keyword)
    
    if positive_detected:
        flagged.append({
            'category': 'positive_emotion',
            'severity': 'positive',
            'detected_words': positive_detected,
            'responses': [
                "That's wonderful to hear! Your positive energy is contagious and can brighten your day and others around you. Keep nurturing that happiness!",
                "I'm so glad you're feeling this way! Your positive mood can help you accomplish great things today. What's contributing to your good feelings?",
                "It's fantastic that you're feeling good! Positive emotions like this can boost your creativity and motivation. Is there anything specific that's making you feel this way?"
            ]
        })
        # Return positive emotion first - don't check for negative keywords if positive ones are found
        return flagged
    
    # Check high risk keywords (high severity)
    high_risk_detected = []
    for keyword in keywords_data.get('high_risk', []):
        if keyword.lower() in content_lower:
            high_risk_detected.append(keyword)
    
    if high_risk_detected:
        flagged.append({
            'category': 'suicidal',
            'severity': 'high',
            'detected_words': high_risk_detected,
            'responses': [
                "These feelings are very serious, and you don't have to face them alone. I'm connecting you with immediate help.",
                "You're important and your life matters. Let me get you connected with someone who can help immediately.",
                "This is an emergency situation. I'm alerting a counselor right away."
            ]
        })
    
    # Check moderate risk keywords (moderate severity)
    moderate_risk_detected = []
    for keyword in keywords_data.get('moderate_risk', []):
        if keyword.lower() in content_lower:
            moderate_risk_detected.append(keyword)
    
    if moderate_risk_detected:
        flagged.append({
            'category': 'depression',
            'severity': 'moderate',
            'detected_words': moderate_risk_detected,
            'responses': [
                "I can tell you're going through a tough time. Your feelings are valid, and I'm here to listen.",
                "Would you like to talk more about what's been troubling you, or would you prefer some self-care tips that might help you right now?"
            ]
        })
    
    # Check low risk keywords (low severity)
    low_risk_detected = []
    for keyword in keywords_data.get('low_risk', []):
        if keyword.lower() in content_lower:
            low_risk_detected.append(keyword)
    
    if low_risk_detected:
        flagged.append({
            'category': 'stress',
            'severity': 'low',
            'detected_words': low_risk_detected,
            'responses': [
                "Thanks for sharing with me. I'm here if you want to talk more about your day, or I can suggest activities that might help you feel good right now."
            ]
        })
    
    return flagged

def analyze_sentiment(message_content: str) -> Dict[str, any]:
    """
    Analyze the sentiment of a message to determine if it's positive, negative, or neutral
    
    Args:
        message_content (str): The message content to analyze
        
    Returns:
        Dict: Sentiment analysis results
    """
    content_lower = message_content.lower()
    
    # Positive indicators
    positive_words = [
        'happy', 'masaya', 'saya', 'joy', 'excited', 'kinikilig', 'good', 'mabuti', 
        'okay', 'ok', 'fine', 'ayos', 'ganda', 'beautiful', 'great', 'maganda', 
        'wonderful', 'amazing', 'fantastic', 'super', 'love', 'mahal', 'like', 
        'gusto', 'enjoy', 'enjoying', 'fun', 'masaya', 'blessed', 'grateful', 
        'thankful', 'pasalamat', 'swerte', 'lucky', 'positive', 'good vibes'
    ]
    
    # Negative indicators
    negative_words = [
        'sad', 'lungkot', 'malungkot', 'depressed', 'depression', 'anxiety', 
        'worried', 'kabado', 'nervous', 'angry', 'galit', 'frustrated', 
        'stress', 'stressed', 'overwhelmed', 'tired', 'pagod', 'exhausted', 
        'lonely', 'alone', 'mag-isa', 'hate', 'hate ko', 'ayoko', 'don\'t like',
        'bad', 'masama', 'pangit', 'ugly', 'terrible', 'awful', 'horrible',
        'sick', 'sakit', 'pain', 'masakit', 'hurt', 'nasasaktan'
    ]
    
    # Count positive and negative words
    positive_count = sum(1 for word in positive_words if word in content_lower)
    negative_count = sum(1 for word in negative_words if word in content_lower)
    
    # Determine sentiment
    if positive_count > negative_count:
        sentiment = 'positive'
        confidence = min(0.9, 0.5 + (positive_count - negative_count) * 0.1)
    elif negative_count > positive_count:
        sentiment = 'negative'
        confidence = min(0.9, 0.5 + (negative_count - positive_count) * 0.1)
    else:
        sentiment = 'neutral'
        confidence = 0.5
    
    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'positive_count': positive_count,
        'negative_count': negative_count
    }

def get_contextual_response(flagged_keywords: List[Dict[str, any]]) -> str:
    """
    Get an appropriate response based on detected keywords
    
    Args:
        flagged_keywords (List[Dict]): List of flagged keyword information
        
    Returns:
        str: Appropriate response message
    """
    if not flagged_keywords:
        return "Thank you for sharing. How else can I help you today?"
    
    # Sort by severity (high > moderate > low)
    severity_order = {'high': 3, 'moderate': 2, 'low': 1}
    flagged_keywords.sort(key=lambda x: severity_order.get(x['severity'], 0), reverse=True)
    
    # Use the response from the highest severity keyword
    highest_severity = flagged_keywords[0]
    import random
    return random.choice(highest_severity['responses'])

def calculate_risk_score(user) -> int:
    """
    Calculate mental health risk score for a user based on various factors
    
    Args:
        user: User model instance
        
    Returns:
        int: Risk score (0-10, where 10 is highest risk)
    """
    from .models import KeywordFlag
    from analytics.models import MentalHealthAlert
    from mood_tracker.models import MoodEntry
    
    score = 0
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # 1. Recent negative moods (0-3 points)
    recent_negative_moods = MoodEntry.objects.filter(
        user=user,
        created_at__gte=week_ago,
        mood__in=['sad', 'angry']
    ).count()
    score += min(recent_negative_moods, 3)
    
    # 2. Flagged keywords in recent conversations (0-4 points) - using anonymized data
    recent_flagged_keywords = KeywordFlag.objects.filter(
        detected_at__gte=week_ago
    ).count()
    score += min(recent_flagged_keywords, 4)
    
    # 3. High distress survey scores (0-2 points)
    from django.db.models import Q as DjangoQ
    high_distress_entries = MoodEntry.objects.filter(
        user=user,
        created_at__gte=week_ago
    ).filter(
        DjangoQ(answer_1__gte=4) | DjangoQ(answer_2__gte=4) | DjangoQ(answer_3__gte=4)
    ).count()
    score += min(high_distress_entries, 2)
    
    # 4. Previous alerts in the last month (0-1 point)
    previous_alerts = MentalHealthAlert.objects.filter(
        student=user,
        created_at__gte=month_ago,
        severity='high'
    ).count()
    if previous_alerts > 0:
        score += 1
    
    return min(score, 10)  # Cap at 10

def should_create_alert(user, flagged_keywords: List[Dict[str, any]], risk_score: int = None) -> Tuple[bool, Dict[str, any]]:
    """
    Determine if an alert should be created based on keywords and risk factors
    (Now used as fallback when BERT detection is not available)
    
    Args:
        user: User model instance
        flagged_keywords (List[Dict]): Detected keywords
        risk_score (int, optional): Pre-calculated risk score
        
    Returns:
        Tuple[bool, Dict]: (should_create_alert, alert_data)
    """
    if not flagged_keywords:
        return False, {}
    
    if risk_score is None:
        risk_score = calculate_risk_score(user)
    
    # Check for high keywords (fallback detection)
    high_keywords = [k for k in flagged_keywords if k['severity'] == 'high']
    if high_keywords:
        # Get all detected keywords
        detected_words = [word for k in high_keywords for word in k['detected_words']]
        
        # Use utility function to check for duplicates
        from analytics.utils import is_duplicate_alert
        
        if is_duplicate_alert(user, 'keyword_detected', detected_words, 30):
            return False, {}
        
        return True, {
            'alert_type': 'keyword_detected',
            'severity': 'high',
            'title': 'High-Risk Mental Health Keywords Detected (Fallback)',
            'description': f"Student used high-risk keywords: {', '.join(detected_words)}",
            'related_keywords': detected_words,
            'risk_score': risk_score
        }
    
    # Only high-risk keywords should trigger alerts (no alerts for moderate or low risk)
    # Moderate and low risk keywords are tracked in analytics but don't create alerts
    
    return False, {}

def get_mental_health_insights(user) -> Dict[str, any]:
    """
    Get mental health insights for a specific user
    
    Args:
        user: User model instance
        
    Returns:
        Dict: Mental health insights data
    """
    from .models import KeywordFlag, AnonymizedConversationMetadata
    from analytics.models import MentalHealthAlert
    from mood_tracker.models import MoodEntry
    
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Recent mood distribution
    recent_moods = MoodEntry.objects.filter(
        user=user,
        created_at__gte=month_ago
    ).values_list('mood', flat=True)
    
    mood_counts = {}
    for mood in recent_moods:
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    # Recent keyword flags (anonymized)
    from django.db.models import Count
    recent_flags = KeywordFlag.objects.filter(
        detected_at__gte=month_ago
    ).values('category').annotate(
        count=Count('id')
    )
    
    # Risk trend (simplified)
    risk_score = calculate_risk_score(user)
    
    return {
        'risk_score': risk_score,
        'mood_distribution': mood_counts,
        'flagged_keywords': list(recent_flags),
        'total_conversations': AnonymizedConversationMetadata.objects.filter(
            started_at__gte=month_ago
        ).count(),
        'active_alerts': MentalHealthAlert.objects.filter(
            student=user,
            status='active'
        ).count()
    }
