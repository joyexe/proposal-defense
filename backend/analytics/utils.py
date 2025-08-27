from django.utils import timezone
from datetime import timedelta
from .models import MentalHealthAlert


def is_duplicate_alert(user, alert_type, keywords=None, time_window_minutes=30):
    """
    Check if a similar alert was created recently for the same user
    
    Args:
        user: User model instance
        alert_type: Type of alert ('keyword_detected', 'bert_intent_detected', etc.)
        keywords: List of keywords (for keyword_detected alerts)
        time_window_minutes: Time window to check for duplicates (default 30 minutes)
        
    Returns:
        bool: True if duplicate exists, False otherwise
    """
    now = timezone.now()
    time_threshold = now - timedelta(minutes=time_window_minutes)
    
    # Get recent alerts of the same type for this user
    recent_alerts = MentalHealthAlert.objects.filter(
        student=user,
        alert_type=alert_type,
        created_at__gte=time_threshold
    )
    
    if not recent_alerts.exists():
        return False
    
    # For keyword alerts, check if keywords are the same
    if alert_type == 'keyword_detected' and keywords:
        for alert in recent_alerts:
            if alert.related_keywords and set(keywords) == set(alert.related_keywords):
                return True
    
    # For BERT alerts, check if any recent BERT alert exists (within time window)
    elif alert_type == 'bert_intent_detected':
        # BERT alerts are considered duplicates if any recent BERT alert exists
        # This prevents multiple BERT alerts for the same user in a short time
        return True
    
    return False


def create_alert_if_not_duplicate(user, alert_data, keywords=None, time_window_minutes=30):
    """
    Create an alert only if no duplicate exists within the time window
    
    Args:
        user: User model instance
        alert_data: Dictionary containing alert data
        keywords: List of keywords (for keyword_detected alerts)
        time_window_minutes: Time window to check for duplicates
        
    Returns:
        tuple: (alert_instance, created) where created is True if alert was created
    """
    alert_type = alert_data.get('alert_type')
    
    if not alert_type:
        return None, False
    
    # Check for duplicates
    if is_duplicate_alert(user, alert_type, keywords, time_window_minutes):
        return None, False
    
    # Create the alert
    alert = MentalHealthAlert.objects.create(
        student=user,
        **alert_data
    )
    
    return alert, True


def cleanup_old_duplicates(days_back=7):
    """
    Clean up duplicate alerts older than specified days
    
    Args:
        days_back: Number of days to look back for duplicates
        
    Returns:
        int: Number of duplicates removed
    """
    cutoff_date = timezone.now() - timedelta(days=days_back)
    
    # Get all alerts from the specified period
    recent_alerts = MentalHealthAlert.objects.filter(
        created_at__gte=cutoff_date
    ).order_by('student', 'alert_type', 'created_at')
    
    duplicates_removed = 0
    current_student = None
    current_alert_type = None
    current_keywords = None
    last_alert_time = None
    
    for alert in recent_alerts:
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
                    (alert.created_at - last_alert_time).total_seconds() < 1800):
                    is_duplicate = True
        
        if is_duplicate:
            alert.delete()
            duplicates_removed += 1
        else:
            # Update tracking variables
            current_student = alert.student
            current_alert_type = alert.alert_type
            current_keywords = alert.related_keywords
            last_alert_time = alert.created_at
    
    return duplicates_removed
