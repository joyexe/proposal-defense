from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import MoodEntry
from django.contrib.auth import get_user_model
from datetime import timedelta
from analytics.models import MentalHealthAlert, MentalHealthPattern
# Remove MoodSurveyResponse import and serializer import

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_mood(request):
    mood = request.data.get('mood')
    note = request.data.get('note', '')
    user = request.user
    today = timezone.now().date()
    # Updated recommendations per user request
    recommendation = None
    if mood == 'happy':
        recommendation = 'You\'re radiating positivity today! Consider channeling your good mood into a new activity or sharing your energy with others. Staying engaged helps maintain your well-being.'
    elif mood == 'good':
        recommendation = 'You\'re in a good place, keep nurturing your strengths. Maybe set a small goal or try a wellness activity to build on your positive momentum.'
    elif mood == 'neutral':
        recommendation = 'Feeling neutral is okay. Sometimes, a little self-reflection or a gentle activity can help you discover what you need today. Explore your wellness journey for inspiration.'
    elif mood == 'sad':
        recommendation = 'It\'s important to acknowledge when you\'re feeling down. Taking a small step, like writing your thoughts or scheduling an appointment with a counselor, can make a difference. Remember, support is available if you need it.'
    elif mood == 'angry':
        recommendation = 'Strong emotions are valid. Try a calming technique, like deep breathing or a short walk, to help process your feelings. If you\'d like, you can always reach out for guidance counselor, chat with AMIETI chatbot or explore resources in your wellness journey.'
    entry, created = MoodEntry.objects.update_or_create(
        user=user,
        date=today,
        defaults={'mood': mood, 'note': note, 'recommendation': recommendation}
    )
    
    # Check for negative mood patterns and create alerts
    check_negative_mood_patterns(user)
    
    return Response({'success': True, 'mood': mood, 'note': note, 'mood_entry_id': entry.id})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_mood_submission(request):
    user = request.user
    today = timezone.now().date()
    try:
        entry = MoodEntry.objects.get(user=user, date=today)
        return Response({
            'mood': entry.mood, 
            'note': entry.note,
            'answer_1': entry.answer_1,
            'answer_2': entry.answer_2,
            'answer_3': entry.answer_3,
            'recommendation': entry.recommendation
        })
    except MoodEntry.DoesNotExist:
        return Response({'mood': None, 'note': None, 'answer_1': None, 'answer_2': None, 'answer_3': None, 'recommendation': None})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mood_data(request):
    user = request.user
    start_date = request.GET.get('start')
    end_date = request.GET.get('end')
    
    if start_date and end_date:
        try:
            start = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
            end = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
            entries = MoodEntry.objects.filter(user=user, date__range=[start, end]).order_by('-date')
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)
    else:
        # Get all entries for the user
        entries = MoodEntry.objects.filter(user=user).order_by('-date')
    
    data = []
    for entry in entries:
        data.append({
            'date': entry.date,
            'mood': entry.mood,
            'note': entry.note,
            'answer_1': entry.answer_1,
            'answer_2': entry.answer_2,
            'answer_3': entry.answer_3,
            'recommendation': entry.recommendation
        })
    
    return Response({'data': data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_week_moods(request):
    user = request.user
    start = request.GET.get('start')
    end = request.GET.get('end')
    if not start or not end:
        return Response({'error': 'start and end date required'}, status=400)
    try:
        start_date = timezone.datetime.strptime(start, '%Y-%m-%d').date()
        end_date = timezone.datetime.strptime(end, '%Y-%m-%d').date()
    except Exception:
        return Response({'error': 'Invalid date format'}, status=400)
    # Get all entries for the week
    entries = MoodEntry.objects.filter(user=user, date__range=(start_date, end_date))
    entry_map = {str(e.date): {'mood': e.mood, 'note': e.note, 'date': str(e.date)} for e in entries}
    # Build week data
    days = []
    for i in range((end_date - start_date).days + 1):
        d = start_date + timedelta(days=i)
        d_str = str(d)
        if d_str in entry_map:
            days.append(entry_map[d_str])
        else:
            days.append({'mood': None, 'note': None, 'date': d_str})
    return Response({'week': days})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_mood_survey(request):
    user = request.user
    mood_entry_id = request.data.get('mood_entry_id')
    answers = request.data.get('answers')  # Should be a list of 3 integers or nulls
    if not mood_entry_id or not answers or len(answers) != 3:
        return Response({'error': 'Invalid data'}, status=400)
    try:
        mood_entry = MoodEntry.objects.get(id=mood_entry_id, user=user)
    except MoodEntry.DoesNotExist:
        return Response({'error': 'Mood entry not found'}, status=404)
    if all([mood_entry.answer_1, mood_entry.answer_2, mood_entry.answer_3]):
        return Response({'error': 'Survey already submitted for this mood entry'}, status=400)
    
    mood_entry.answer_1 = answers[0]
    mood_entry.answer_2 = answers[1]
    mood_entry.answer_3 = answers[2]
    
    # Check if survey was skipped (all answers are null)
    isSurveySkipped = all(answer is None for answer in answers)
    
    # Always generate recommendation based on mood (whether survey is completed or skipped)
    mood = mood_entry.mood
    
    if isSurveySkipped:
        # If survey was skipped, use default mood-based recommendation
        if mood == 'happy':
            recommendation = 'You\'re radiating positivity today! Consider channeling your good mood into a new activity or sharing your energy with others. Staying engaged helps maintain your well-being.'
        elif mood == 'good':
            recommendation = 'You\'re in a good place, keep nurturing your strengths. Maybe set a small goal or try a wellness activity to build on your positive momentum.'
        elif mood == 'neutral':
            recommendation = 'Feeling neutral is okay. Sometimes, a little self-reflection or a gentle activity can help you discover what you need today. Explore your wellness journey for inspiration.'
        elif mood == 'sad':
            recommendation = 'It\'s important to acknowledge when you\'re feeling down. Taking a small step, like writing your thoughts or scheduling an appointment with a counselor, can make a difference. Remember, support is available if you need it.'
        elif mood == 'angry':
            recommendation = 'Strong emotions are valid. Try a calming technique, like deep breathing or a short walk, to help process your feelings. If you\'d like, you can always reach out for guidance counselor, chat with AMIETI chatbot or explore resources in your wellness journey.'
        else:
            recommendation = 'Thank you for checking in today!'
    else:
        # If survey was completed, use survey-based recommendation
        scores = [answers[0], answers[1], answers[2]]
        high = sum(1 for s in scores if s >= 4)
        low = sum(1 for s in scores if s <= 3)
        majority = 'high' if high >= 2 else 'low'
        
        recommendation = ''
        if mood in ['happy', 'good']:
            if majority == 'high':
                recommendation = 'Your positive outlook is a great asset. Keep nurturing it by engaging in activities that bring you joy and meaning. Consider setting a new personal goal or supporting a friend today.'
            else:
                recommendation = 'It\'s okay if you\'re not feeling as upbeat as you\'d like. Try a self-care activity or reflect on what might help lift your mood. Remember, small steps can make a big difference.'
        elif mood == 'neutral':
            if majority == 'high':
                recommendation = 'You\'re maintaining a steady state. Sometimes, exploring new interests or setting a gentle challenge can add a spark to your day. Your wellness journey tab has ideas to try.'
            else:
                recommendation = 'If you\'re feeling off-balance, consider what might be affecting you. Journaling or talking with someone you trust can help clarify your feelings. Support is always available if you need it.'
        elif mood in ['sad', 'angry']:
            if majority == 'high':
                recommendation = 'It\'s important to care for yourself during tough times. Consider using a relaxation technique, or if you\'d like, schedule a confidential chat with a counselor for extra support.'
            else:
                recommendation = 'If you\'re feeling a bit better than your mood suggests, focus on what\'s going well today. Celebrate small wins and consider setting a gentle goal in your wellness journey.'
    
    mood_entry.recommendation = recommendation
    mood_entry.save()
    
    # Check for negative mood patterns and create alerts
    check_negative_mood_patterns(user)
    
    return Response({'success': True, 'recommendation': recommendation})

def check_negative_mood_patterns(user):
    """Check for negative mood patterns based on This Week's Pattern and create alerts if needed"""
    today = timezone.now().date()
    
    # Get the start of the current week (Monday)
    days_since_monday = today.weekday()
    start_of_week = today - timedelta(days=days_since_monday)
    end_of_week = start_of_week + timedelta(days=6)
    
    # Get mood entries for the current week
    week_entries = MoodEntry.objects.filter(
        user=user,
        date__gte=start_of_week,
        date__lte=end_of_week
    ).order_by('date')
    
    # Count negative moods in the week
    negative_moods = ['sad', 'angry']
    negative_entries = []
    total_entries = 0
    
    for entry in week_entries:
        total_entries += 1
        if entry.mood in negative_moods:
            negative_entries.append(entry)
    
    # Create alert if there are 3 or more negative moods in the week (This Week's Pattern)
    if len(negative_entries) >= 3:
        # Check if alert already exists for this pattern
        existing_alert = MentalHealthAlert.objects.filter(
            student=user,
            alert_type='mood_pattern',
            status='active'
        ).first()
        
        if not existing_alert:
            # Get the most recent negative mood for details
            latest_negative = negative_entries[-1]
            mood_selected = latest_negative.mood
            mood_note = latest_negative.note or "No note provided"
            
            # Get mood survey answers from all negative entries
            survey_answers = []
            for entry in negative_entries:
                if entry.answer_1 is not None and entry.answer_2 is not None and entry.answer_3 is not None:
                    survey_answers.append({
                        'date': entry.date,
                        'answers': [entry.answer_1, entry.answer_2, entry.answer_3]
                    })
            
            # Create pattern detection description based on This Week's Pattern
            pattern_description = f"Student has {len(negative_entries)} negative mood days this week (This Week's Pattern)"
            
            # Create comprehensive description
            description = f"""
Mood Pattern Detection Alert (This Week's Pattern):

Mood Selected: {mood_selected}
Mood Note: {mood_note}
Pattern Detection: {pattern_description}

Weekly Pattern Details:
- Total mood entries this week: {total_entries}
- Negative mood days: {len(negative_entries)}
- Negative mood types: {', '.join(set([entry.mood for entry in negative_entries]))}

Mood Survey Answers:
"""
            
            if survey_answers:
                for survey in survey_answers:
                    description += f"- {survey['date']}: {survey['answers']}\n"
            else:
                description += "- No survey answers provided\n"
            
            description += f"\nWeek period: {start_of_week} to {end_of_week}"
            
            # Create the alert
            alert = MentalHealthAlert.objects.create(
                student=user,
                alert_type='mood_pattern',
                severity='moderate',
                title=f'Negative Mood Pattern Detected: {len(negative_entries)} negative days this week',
                description=description,
                status='active',
                risk_level='moderate'
            )
            
            # Create pattern record
            MentalHealthPattern.objects.create(
                student=user,
                pattern_type='negative_mood',
                consecutive_days=len(negative_entries),
                start_date=start_of_week,
                end_date=end_of_week,
                severity_score=len(negative_entries) * 0.5,
                alert_created=True
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_latest_mood_recommendation(request):
    user = request.user
    today = timezone.now().date()
    try:
        mood_entry = MoodEntry.objects.get(user=user, date=today)
    except MoodEntry.DoesNotExist:
        mood_entry = MoodEntry.objects.filter(user=user).order_by('-date').first()
    if not mood_entry or not mood_entry.mood:
        return Response({'recommendation': None})
    # If survey answers exist (all not None) and recommendation is set, use it
    if all(ans is not None for ans in [mood_entry.answer_1, mood_entry.answer_2, mood_entry.answer_3]) and mood_entry.recommendation:
        return Response({'recommendation': mood_entry.recommendation})
    # If only mood exists or recommendation is empty, always return a default recommendation
    mood = mood_entry.mood
    if mood == 'happy':
        recommendation = 'You\'re radiating positivity today! Consider channeling your good mood into a new activity or sharing your energy with others. Staying engaged helps maintain your well-being.'
    elif mood == 'good':
        recommendation = 'You\'re in a good place, keep nurturing your strengths. Maybe set a small goal or try a wellness activity to build on your positive momentum.'
    elif mood == 'neutral':
        recommendation = 'Feeling neutral is okay. Sometimes, a little self-reflection or a gentle activity can help you discover what you need today. Explore your wellness journey for inspiration.'
    elif mood == 'sad':
        recommendation = 'It\'s important to acknowledge when you\'re feeling down. Taking a small step, like writing your thoughts or scheduling an appointment with a counselor, can make a difference. Remember, support is available if you need it.'
    elif mood == 'angry':
        recommendation = 'Strong emotions are valid. Try a calming technique, like deep breathing or a short walk, to help process your feelings. If you\'d like, you can always reach out for guidance counselor, chat with AMIETI chatbot or explore resources in your wellness journey.'
    else:
        recommendation = None
    return Response({'recommendation': recommendation})
