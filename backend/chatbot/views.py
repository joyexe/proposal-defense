from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from datetime import timedelta
import json
import random

from .models import AnonymizedConversationMetadata, KeywordFlag
from analytics.models import MentalHealthAlert
from .utils import detect_keywords, get_contextual_response, calculate_risk_score, should_create_alert
from website.models import User
from mood_tracker.models import MoodEntry

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_conversation(request):
    """Start a new anonymized chatbot conversation session"""
    conversation_type = request.data.get('conversation_type', 'general')
    session_id = request.data.get('session_id', None)
    
    if not session_id:
        return Response({'error': 'Session ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Clean up old sessions (older than 24 hours) to prevent database bloat
    try:
        from datetime import timedelta
        cutoff_time = timezone.now() - timedelta(hours=24)
        AnonymizedConversationMetadata.objects.filter(
            created_at__lt=cutoff_time,
            ended_at__isnull=False
        ).delete()
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error cleaning up old sessions: {e}")
    
    # Check if session_id already exists
    try:
        conversation_metadata = AnonymizedConversationMetadata.objects.get(session_id=session_id)
        # If session exists, update the conversation type if needed
        if conversation_metadata.conversation_type != conversation_type:
            conversation_metadata.conversation_type = conversation_type
            conversation_metadata.save()
    except AnonymizedConversationMetadata.DoesNotExist:
        # Create new anonymized conversation metadata
        conversation_metadata = AnonymizedConversationMetadata.objects.create(
            session_id=session_id,
            conversation_type=conversation_type
        )
    
    return Response({
        'conversation_id': conversation_metadata.id,
        'session_id': session_id,
        'message': 'Anonymized conversation session started successfully'
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_message(request):
    """Process a chatbot message for keywords and update anonymized metadata"""
    conversation_id = request.data.get('conversation_id')
    content = request.data.get('content', '')
    sender = request.data.get('sender', 'user')
    
    if not conversation_id:
        return Response({'error': 'Conversation ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        conversation_metadata = AnonymizedConversationMetadata.objects.get(id=conversation_id)
    except AnonymizedConversationMetadata.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update message count in metadata
    conversation_metadata.total_messages += 1
    conversation_metadata.save()
    
    # Process user messages with BERT as primary detection, keywords as fallback
    if sender == 'user' and content.strip():
        # Primary: BERT Intent Detection
        from .bert_intent_detector import get_intent_detector
        intent_detector = get_intent_detector()
        bert_result = intent_detector.detect_intent(content)
        
        # Fallback: Keyword Detection (for analytics tracking)
        flagged_keywords = detect_keywords(content)
        
        # Create anonymized keyword flags for tracking (always track for analytics)
        if flagged_keywords:
            for keyword_data in flagged_keywords:
                for word in keyword_data['detected_words']:
                    KeywordFlag.objects.create(
                        keyword=word,
                        category=keyword_data['category'],
                        session_id=conversation_metadata.session_id
                    )
        
        # Check if BERT detected high-risk intent
        bert_high_risk = bert_result.get('primary_intent') == 'high_risk' and bert_result.get('confidence', 0) > 0.6
        
        # Check if keywords also detected high-risk (fallback)
        keyword_high_risk = any(k.get('severity') == 'high' for k in flagged_keywords) if flagged_keywords else False
        
        # Create alert if either BERT or keywords detect high risk
        if (bert_high_risk or keyword_high_risk) and not conversation_metadata.alert_created:
            risk_score = calculate_risk_score(request.user)
            
            # Prefer BERT alert if available, otherwise use keyword alert
            if bert_high_risk:
                alert_data = {
                    'alert_type': 'bert_intent_detected',
                    'severity': 'high',
                    'title': 'High-Risk Mental Health Intent Detected',
                    'description': f"BERT model detected high-risk intent with {bert_result.get('confidence', 0):.2f} confidence. User message: {content[:100]}...",
                    'related_keywords': [word for k in flagged_keywords for word in k.get('detected_words', [])] if flagged_keywords else [],
                    'risk_score': risk_score
                }
            else:
                # Fallback to keyword-based alert
                should_alert, alert_data = should_create_alert(request.user, flagged_keywords, risk_score)
                if not should_alert:
                    alert_data = None
            
            if alert_data:
                # Use utility function to prevent duplicates
                from analytics.utils import create_alert_if_not_duplicate
                
                alert, created = create_alert_if_not_duplicate(
                    user=request.user,
                    alert_data={**alert_data, 'session_id': conversation_metadata.session_id},
                    keywords=alert_data.get('related_keywords'),
                    time_window_minutes=30
                )
                
                if created:
                    # Update metadata to indicate alert was created
                    conversation_metadata.alert_created = True
                    conversation_metadata.save()
                
                return Response({
                    'flagged_keywords': flagged_keywords,
                    'contextual_response': get_contextual_response(flagged_keywords) if flagged_keywords else "I'm here to support you.",
                    'alert_created': True,
                    'alert_id': alert.id if created else None,
                    'risk_score': risk_score,
                    'bert_detection': bert_result
                })
        
        # Calculate risk score for response
        risk_score = calculate_risk_score(request.user)
        return Response({
            'flagged_keywords': flagged_keywords,
            'contextual_response': get_contextual_response(flagged_keywords) if flagged_keywords else "I'm here to support you.",
            'alert_created': False,
            'risk_score': risk_score,
            'bert_detection': bert_result
        })
    
    return Response({
        'message_id': None,  # No message ID since we're not storing individual messages
        'flagged_keywords': [],
        'alert_created': False,
        'risk_score': 0  # Default risk score when no keywords detected
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_conversation(request):
    """End an anonymized chatbot conversation session"""
    conversation_id = request.data.get('conversation_id')
    
    try:
        conversation_metadata = AnonymizedConversationMetadata.objects.get(id=conversation_id)
        conversation_metadata.ended_at = timezone.now()
        conversation_metadata.save()
        
        return Response({'message': 'Anonymized conversation session ended successfully'})
    except AnonymizedConversationMetadata.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_conversations(request):
    """Get anonymized conversation metadata (no personal data)"""
    # Since we're using anonymized data, we return general analytics instead
    # of personal conversation history
    
    # Get overall statistics for the user's session
    total_sessions = AnonymizedConversationMetadata.objects.count()
    high_risk_sessions = AnonymizedConversationMetadata.objects.filter(risk_level='high').count()
    moderate_risk_sessions = AnonymizedConversationMetadata.objects.filter(risk_level='moderate').count()
    low_risk_sessions = AnonymizedConversationMetadata.objects.filter(risk_level='low').count()
    
    data = {
        'analytics': {
            'total_sessions': total_sessions,
            'high_risk_sessions': high_risk_sessions,
            'moderate_risk_sessions': moderate_risk_sessions,
            'low_risk_sessions': low_risk_sessions,
        },
        'message': 'Conversation data is anonymized for privacy protection'
    }
    
    return Response(data)

# Mental Health Alert Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mental_health_alerts(request):
    """Get mental health alerts (for counselors)"""
    if request.user.role != 'counselor':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    status_filter = request.GET.get('status', 'active')
    
    # For active tab, only show mood patterns and chatbot keywords
    if status_filter == 'active':
        alerts = MentalHealthAlert.objects.filter(
            status=status_filter,
            alert_type__in=['mood_pattern', 'chatbot_keyword', 'keyword_detected']
        ).order_by('-created_at')
    else:
        # For pending and resolved tabs, show all alert types except appointment_diagnosis
        alerts = MentalHealthAlert.objects.filter(
            status=status_filter,
            alert_type__in=['chatbot_keyword', 'mood_pattern', 'manual_referral', 'keyword_detected', 'risk_assessment', 'survey_high_distress', 'bert_intent_detected']
        ).order_by('-created_at')
    
    data = []
    for alert in alerts:
        data.append({
            'id': alert.id,
            'student': {
                'id': alert.student.id,
                'username': alert.student.username,
                'full_name': alert.student.full_name
            },
            'alert_type': alert.get_alert_type_display(),
            'severity': alert.get_severity_display(),
            'title': alert.title,
            'description': alert.description,
            'status': alert.get_status_display(),
            'related_keywords': alert.related_keywords,
            'risk_score': alert.risk_score,
            'created_at': alert.created_at,
            'counselor': {
                'id': alert.counselor.id,
                'full_name': alert.counselor.full_name
            } if alert.counselor else None
        })
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    """Resolve a mental health alert"""
    if request.user.role != 'counselor':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        alert = MentalHealthAlert.objects.get(id=alert_id)
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.resolution_notes = request.data.get('notes', '')
        alert.save()
        
        return Response({'message': 'Alert resolved successfully'})
    except MentalHealthAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_alert(request, alert_id):
    """Assign an alert to a counselor"""
    if request.user.role not in ['counselor', 'admin']:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        alert = MentalHealthAlert.objects.get(id=alert_id)
        counselor_id = request.data.get('counselor_id')
        
        if counselor_id:
            counselor = User.objects.get(id=counselor_id, role='counselor')
            alert.counselor = counselor
        else:
            alert.counselor = request.user if request.user.role == 'counselor' else None
        
        # Change status to 'pending' when alert is assigned to a counselor
        alert.status = 'pending'
        alert.save()
        
        return Response({'message': 'Alert assigned successfully and status changed to pending'})
    except (MentalHealthAlert.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'Alert or counselor not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_open_up_conversation(request):
    """
    Handle the rule-based chatbot conversation flow for steps 3-6
    This endpoint processes the student's free-text message and provides mood-based responses
    """
    conversation_id = request.data.get('conversation_id')
    user_message = request.data.get('message', '')
    step = request.data.get('step', 'open_up')  # Current step in conversation
    
    # Process request
    
    if not conversation_id:
        return Response({'error': 'Conversation ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        conversation_metadata = AnonymizedConversationMetadata.objects.get(id=conversation_id)
    except AnonymizedConversationMetadata.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update message count in metadata (no raw content stored)
    if user_message.strip():
        conversation_metadata.total_messages += 1
        conversation_metadata.save()
    
    # Get today's mood entry for personalized responses
    today = timezone.now().date()
    try:
        mood_entry = MoodEntry.objects.get(user=request.user, date=today)
        current_mood = mood_entry.mood
    except MoodEntry.DoesNotExist:
        # If no mood entry today, get the most recent one
        mood_entry = MoodEntry.objects.filter(user=request.user).order_by('-date').first()
        current_mood = mood_entry.mood if mood_entry else 'neutral'
    
    # Define comforting messages by mood
    comforting_messages = {
        'happy': "It's wonderful to hear that you're feeling this way. Your positive energy can brighten your day and others around you. Keep nurturing it, you deserve it!",
        'good': "It's wonderful to hear that you're feeling this way. Your positive energy can brighten your day and others around you. Keep nurturing it, you deserve it!",
        'neutral': "I hear you. Feeling neutral is okay, it's a sign of balance but it's also a chance to find something that sparks joy today.",
        'sad': "I'm really glad you shared that with me. Your feelings are valid, and it's okay to have tough days. You're not alone, I'm here for you.",
        'angry': "Thank you for telling me how you feel. It's okay to feel frustrated, I'm here to help you find ways to calm and refocus."
    }
    
    # Define wellness activities by mood (shorter titles for UI)
    wellness_activities = {
        'happy': [
            "Creative hobbies",
            "Nature walk",
            "Gratitude journaling",
            "Call a friend"
        ],
        'good': [
            "Creative hobbies",
            "Nature walk", 
            "Gratitude journaling",
            "Call a friend"
        ],
        'neutral': [
            "Light exercise",
            "Try something new",
            "Listen to music",
            "Organize space"
        ],
        'sad': [
            "Breathing exercises",
            "Gentle walk",
            "Watch something fun",
            "Write feelings"
        ],
        'angry': [
            "Physical activity",
            "Express through art",
            "Vent in journal",
            "Deep breathing"
        ]
    }
    
    # Define detailed activity instructions by mood (3 variations each)
    activity_instructions = {
        'happy': {
            "Creative hobbies": [
                "🎨 Set aside 30 minutes to create something beautiful! Find a quiet space, gather your art supplies, and let your imagination flow. Don't worry about perfection - focus on the joy of creating. Try drawing your happy thoughts, painting with bright colors, or crafting something that makes you smile.",
                "✨ Grab your favorite art materials and spend 30 minutes in creative flow. Whether it's sketching, painting, or crafting, let your positive energy guide your hands. Create something that reflects your current happiness - maybe a colorful mandala or a joyful doodle.",
                "🌟 Take 30 minutes to explore your creative side! You could try watercolor painting, digital art, or even making a collage. The key is to enjoy the process and let your creativity express the joy you're feeling inside."
            ],
            "Nature walk": [
                "🌿 Step outside and take a 20-minute walk in nature. Notice the beauty around you - the trees, flowers, birds, and sky. Take deep breaths of fresh air. Let the natural world remind you of the simple joys in life. Walk at your own pace and enjoy the moment.",
                "🍃 Head outdoors for a 20-minute nature stroll. Look for signs of life - blooming flowers, singing birds, or rustling leaves. Let the sunshine warm your face and the breeze refresh your spirit. Nature has a way of amplifying our positive feelings.",
                "🌱 Take a leisurely 20-minute walk in a park or garden. Pay attention to the small wonders - a butterfly, a beautiful cloud, or the way light filters through leaves. Let nature's beauty mirror and enhance your inner happiness."
            ],
            "Gratitude journaling": [
                "📝 Grab a notebook and write down 5 things you're grateful for today. Be specific - instead of 'family', write 'my sister's laugh' or 'mom's cooking'. Reflect on why each thing brings you joy. This practice helps strengthen your positive mindset.",
                "💛 Take 15 minutes to journal about gratitude. Write down 3-5 things that made you smile today, no matter how small. Maybe it was a kind word from someone, a delicious meal, or simply feeling good. Describe why each moment mattered to you.",
                "🌟 Spend 15 minutes writing about what you're thankful for right now. Focus on the present moment and the people, experiences, or things that are bringing you joy. Be detailed about why each item on your list makes your heart happy."
            ],
            "Call a friend": [
                "📞 Reach out to a friend or family member and share your good mood! Tell them about something that made you happy today. Your positive energy is contagious and can brighten someone else's day too.",
                "🤗 Pick up the phone and call someone you care about. Share your positive energy by telling them about a happy moment from your day. Your good mood can inspire and uplift others around you.",
                "💫 Connect with a loved one through a phone call. Share what's making you feel so good today - whether it's an achievement, a beautiful moment, or just general contentment. Spread your positive vibes!"
            ]
        },
        'good': {
            "Creative hobbies": [
                "🎨 Set aside 30 minutes to create something beautiful! Find a quiet space, gather your art supplies, and let your imagination flow. Don't worry about perfection - focus on the joy of creating. Try drawing your happy thoughts, painting with bright colors, or crafting something that makes you smile.",
                "✨ Grab your favorite art materials and spend 30 minutes in creative flow. Whether it's sketching, painting, or crafting, let your positive energy guide your hands. Create something that reflects your current happiness - maybe a colorful or a joyful doodle.",
                "🌟 Take 30 minutes to explore your creative side! You could try watercolor painting, digital art, or even making a collage. The key is to enjoy the process and let your creativity express the joy you're feeling inside."
            ],
            "Nature walk": [
                "🌿 Step outside and take a 20-minute walk in nature. Notice the beauty around you - the trees, flowers, birds, and sky. Take deep breaths of fresh air. Let the natural world remind you of the simple joys in life. Walk at your own pace and enjoy the moment.",
                "🍃 Head outdoors for a 20-minute nature stroll. Look for signs of life - blooming flowers, singing birds, or rustling leaves. Let the sunshine warm your face and the breeze refresh your spirit. Nature has a way of amplifying our positive feelings.",
                "🌱 Take a leisurely 20-minute walk in a park or garden. Pay attention to the small wonders - a butterfly, a beautiful cloud, or the way light filters through leaves. Let nature's beauty mirror and enhance your inner happiness."
            ],
            "Gratitude journaling": [
                "📝 Grab a notebook and write down 5 things you're grateful for today. Be specific - instead of 'family', write 'my sister's laugh' or 'mom's cooking'. Reflect on why each thing brings you joy. This practice helps strengthen your positive mindset.",
                "💛 Take 15 minutes to journal about gratitude. Write down 3-5 things that made you smile today, no matter how small. Maybe it was a kind word from someone, a delicious meal, or simply feeling good. Describe why each moment mattered to you.",
                "🌟 Spend 15 minutes writing about what you're thankful for right now. Focus on the present moment and the people, experiences, or things that are bringing you joy. Be detailed about why each item on your list makes your heart happy."
            ],
            "Call a friend": [
                "📞 Reach out to a friend or family member and share your good mood! Tell them about something that made you happy today. Your positive energy can brighten someone else's day too.",
                "🤗 Pick up the phone and call someone you care about. Share your positive energy by telling them about a happy moment from your day. Your good mood can inspire and uplift others around you.",
                "💫 Connect with a loved one through a phone call. Share what's making you feel so good today - whether it's an achievement, a beautiful moment, or just general contentment. Spread your positive vibes!"
            ]
        },
        'neutral': {
            "Light exercise": [
                "🧘‍♀️ Try some gentle yoga or stretching for 15-20 minutes. Start with simple poses like child's pose, cat-cow stretches, or gentle twists. Focus on your breath and how your body feels. This can help you feel more connected to yourself.",
                "⚖️ Spend 15-20 minutes doing light stretching or yoga. Try poses that feel comfortable and natural to you. Pay attention to how each movement affects your body and mind. This gentle movement can help bring clarity to your thoughts.",
                "🌊 Take 15-20 minutes for some gentle physical activity. You could try simple stretches, or a slow walk. The goal is to move your body mindfully and notice how it makes you feel more present and balanced."
            ],
            "Try something new": [
                "🔍 Spend 30 minutes exploring something new that interests you. It could be reading about a topic you're curious about, watching a tutorial, or trying a new skill. Learning something new can spark excitement and curiosity.",
                "🌟 Dedicate 30 minutes to discovering something new. Maybe learn a few words in a new language, try a new recipe, or explore a hobby you've been curious about. New experiences can help shift your energy and bring fresh perspective.",
                "🚀 Take 30 minutes to step outside your comfort zone with something new. It could be as simple as trying a different route to work, listening to a new genre of music, or attempting a new craft. Novel experiences can awaken your sense of wonder."
            ],
            "Listen to music": [
                "🎵 Create a playlist of songs that make you feel good and listen to it for 20 minutes. Choose music that lifts your spirits or brings back happy memories. Let the rhythm and lyrics help shift your energy.",
                "🎶 Spend 20 minutes listening to music that resonates with your current mood. Whether it's calming instrumental pieces, upbeat tunes, or songs that bring back good memories, let the music guide your emotions.",
                "🎼 Take 20 minutes to immerse yourself in music. Choose songs that help you feel more centered and present. Let the melodies and rhythms help you connect with your inner self and find your natural rhythm."
            ],
            "Organize space": [
                "📦 Take 30 minutes to organize a small area of your space. Start with your desk, a drawer, or a corner of your room. Creating order in your physical space can help create clarity in your mind.",
                "🏠 Spend 30 minutes tidying up one area of your living space. Whether it's your bedroom, study area, or kitchen, creating physical order can help bring mental clarity and a sense of accomplishment.",
                "✨ Dedicate 30 minutes to organizing your environment. Choose one space that feels cluttered and bring order to it. The act of organizing can be meditative and help you feel more in control and centered."
            ]
        },
        'sad': {
            "Breathing exercises": [
                "🫁 Find a comfortable position and practice deep breathing for 10 minutes. Inhale slowly for 4 counts, hold for 4, exhale for 6. Focus only on your breath. This simple practice can help calm your mind and reduce stress.",
                "💙 Sit comfortably and spend 10 minutes focusing on your breath. Try the 4-7-8 technique: inhale for 4, hold for 7, exhale for 8. Let each breath bring you back to the present moment and offer gentle comfort.",
                "🌊 Take 10 minutes for a breathing meditation. Find a quiet spot and practice slow, deep breathing. Imagine each inhale bringing in peace and each exhale releasing tension. Your breath is always there to support you."
            ],
            "Gentle walk": [
                "🌱 Take a gentle 15-minute walk outside, even if it's just around your neighborhood. Notice the small things - a flower, a bird, the way the light falls. Being in nature can have a soothing effect on your mood.",
                "🍃 Go for a slow 15-minute walk in a peaceful place. Take your time and notice the world around you - the sound of leaves rustling, the feel of the breeze, the colors you see. Let nature's gentle energy support you.",
                "🌿 Spend 15 minutes walking slowly in a quiet area. Pay attention to your surroundings without judgment. Notice the sky, the ground beneath your feet, and the simple beauty of being outside. Walking can help clear your mind."
            ],
            "Watch something fun": [
                "📺 Choose a feel-good movie, TV show, or YouTube video that makes you laugh or feel warm inside. Sometimes a good story or humor can help lift your spirits and provide a temporary escape.",
                "😊 Pick something light and entertaining to watch for 30 minutes. Whether it's a comedy, a heartwarming story, or funny videos, let yourself be entertained and distracted from your worries for a little while.",
                "🌟 Find something uplifting to watch that brings you comfort. It could be an old favorite movie, a funny show, or even cute animal videos. Sometimes a little entertainment can help shift your mood and give you a break."
            ],
            "Write feelings": [
                "📖 Write freely about how you're feeling for 15 minutes. Don't worry about grammar or structure - just let your thoughts flow onto paper. Sometimes putting feelings into words can help process them.",
                "💙 Take 15 minutes to write about what's on your mind and heart. You don't need to share this with anyone - it's just for you. Writing can help you understand your feelings better and release emotional tension.",
                "🖊️ Spend 15 minutes journaling about your emotions. Write whatever comes to mind without censoring yourself. Sometimes seeing your thoughts on paper can help you gain perspective and feel lighter."
            ]
        },
        'angry': {
            "Physical activity": [
                "🏃‍♀️ Channel your energy into physical movement for 20-30 minutes. Go for a run, dance to loud music, or try shadow boxing. Physical activity helps release tension and can help you feel more in control.",
                "💪 Spend 20-30 minutes doing intense physical activity. You could go for a vigorous walk, do jumping jacks, or dance energetically. Use your anger as fuel for movement and let the physical exertion help release the tension.",
                "🔥 Take 20-30 minutes to move your body vigorously. Whether it's running, dancing, or doing a workout, let your physical activity help burn off the angry energy. Movement can help you feel more powerful and in control."
            ],
            "Express through art": [
                "🎨 Use art to express what you're feeling. Draw or paint with bold colors and strong strokes. Don't worry about creating something beautiful - focus on releasing your emotions through creativity.",
                "🖼️ Take 30 minutes to create art that expresses your anger. Use dark colors, bold strokes, or abstract shapes. The goal isn't to make something pretty, but to channel your emotions into creative expression.",
                "✨ Spend 30 minutes making art that reflects your current emotions. You could paint, draw, or even scribble aggressively. Let your art be a safe outlet for your feelings without hurting anyone."
            ],
            "Vent in journal": [
                "📝 Write down everything that's making you angry for 15 minutes. Be completely honest and don't hold back. After writing, you can choose to keep it or tear it up. This helps release pent-up emotions.",
                "💥 Take 15 minutes to write out all your angry thoughts and feelings. Don't censor yourself - write exactly what you're thinking. When you're done, you can decide whether to keep the writing or destroy it.",
                "🖊️ Spend 15 minutes journaling about what's making you angry. Write freely without worrying about being polite or reasonable. Sometimes getting it all out on paper can help you feel calmer and more clear-headed."
            ],
            "Deep breathing": [
                "🫁 Sit comfortably and practice deep breathing for 10 minutes. Inhale deeply through your nose, hold for 4 counts, then exhale slowly through your mouth. Focus on each breath to help calm your nervous system.",
                "💙 Find a quiet place and spend 10 minutes doing deep breathing exercises. Try inhaling for 4 counts, holding for 4, and exhaling for 6. Let each breath help you feel more centered and less reactive.",
                "🌊 Take 10 minutes to practice calming breathing techniques. Sit in a comfortable position and focus on slow, deep breaths. Imagine each exhale carrying away your anger and each inhale bringing in peace."
            ]
        }
    }
    
    # Activity-specific mindfulness tips and quotes by mood (9 different tips per activity - 3 for each instruction variation)
    activity_mindfulness_tips = {
        'happy': {
            "Creative hobbies": [
                # Tips for instruction variation 1 (Set aside 30 minutes...)
                "🎨 'Creativity is intelligence having fun.' - Albert Einstein. Your creative spirit is a gift to the world!",
                "✨ 'Every artist was first an amateur.' - Ralph Waldo Emerson. Your artistic journey is uniquely beautiful.",
                "🌟 'Art enables us to find ourselves and lose ourselves at the same time.' - Thomas Merton. Trust your creative flow!",
                # Tips for instruction variation 2 (Grab your favorite art materials...)
                "🎭 'The artist is nothing without the gift, but the gift is nothing without work.' - Emile Zola. Your dedication to creativity is inspiring!",
                "🌈 'Color is a power which directly influences the soul.' - Wassily Kandinsky. Your colorful expressions touch hearts!",
                "🎪 'Art is the lie that enables us to realize the truth.' - Pablo Picasso. Your creative truth is beautiful!",
                # Tips for instruction variation 3 (Take 30 minutes to explore...)
                "🎯 'Creativity takes courage.' - Henri Matisse. Your courage to create is admirable!",
                "🎨 'Art is not what you see, but what you make others see.' - Edgar Degas. You help others see beauty!",
                "✨ 'The purpose of art is washing the dust of daily life off our souls.' - Pablo Picasso. Your art refreshes the world!"
            ],
            "Nature walk": [
                # Tips for instruction variation 1 (Step outside and take a 20-minute walk...)
                "🌿 'In every walk with nature, one receives far more than he seeks.' - John Muir. Nature's wisdom is always available to you.",
                "🍃 'Look deep into nature, and then you will understand everything better.' - Albert Einstein. You are part of nature's beautiful design.",
                "🌱 'The earth has music for those who listen.' - George Santayana. Your connection to nature brings harmony to your soul.",
                # Tips for instruction variation 2 (Head outdoors for a 20-minute nature stroll...)
                "🌸 'Nature always wears the colors of the spirit.' - Ralph Waldo Emerson. Your spirit colors the world beautifully!",
                "🌳 'In nature, nothing is perfect and everything is perfect.' - Alice Walker. You are perfectly imperfect and beautiful!",
                "🌺 'The clearest way into the Universe is through a forest wilderness.' - John Muir. Your path through nature leads to wisdom.",
                # Tips for instruction variation 3 (Take a leisurely 20-minute walk...)
                "🦋 'Just living is not enough... one must have sunshine, freedom, and a little flower.' - Hans Christian Andersen. You bring sunshine wherever you go!",
                "🌿 'Adopt the pace of nature: her secret is patience.' - Ralph Waldo Emerson. Your patience with yourself is growing!",
                "🌼 'Nature does not hurry, yet everything is accomplished.' - Lao Tzu. Your natural pace is perfect!"
            ],
            "Gratitude journaling": [
                # Tips for instruction variation 1 (Grab a notebook and write down 5 things...)
                "📝 'Gratitude turns what we have into enough.' - Melody Beattie. Your thankful heart attracts more blessings.",
                "💛 'When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in.' - Kristin Armstrong. Your gratitude practice is transforming your life.",
                "🌟 'Gratitude is the fairest blossom which springs from the soul.' - Henry Ward Beecher. Your grateful heart is a beautiful flower in bloom.",
                # Tips for instruction variation 2 (Take 15 minutes to journal about gratitude...)
                "💝 'Gratitude is riches. Complaint is poverty.' - Doris Day. Your gratitude makes you rich in spirit!",
                "🙏 'Gratitude is the healthiest of all human emotions.' - Zig Ziglar. Your gratitude is healing your soul!",
                "💎 'Gratitude is the memory of the heart.' - Jean-Baptiste Massieu. Your heart remembers every blessing!",
                # Tips for instruction variation 3 (Spend 15 minutes writing about what you're thankful for...)
                "🌈 'Gratitude is the open door to abundance.' - Yogi Bhajan. Your gratitude opens doors to more joy!",
                "✨ 'The more grateful I am, the more beauty I see.' - Mary Davis. Your gratitude reveals beauty everywhere!",
                "🌺 'Gratitude is the sweetest thing in a seeker's life.' - Sri Chinmoy. Your grateful heart is a sweet blessing!"
            ],
            "Call a friend": [
                # Tips for instruction variation 1 (Reach out to a friend or family member...)
                "📞 'Friendship is the only cement that will ever hold the world together.' - Woodrow Wilson. Your connections make the world stronger.",
                "💫 'A real friend is one who walks in when the rest of the world walks out.' - Walter Winchell. You are that kind of friend to others.",
                "🤗 'Friendship is born at that moment when one person says to another, 'What! You too? I thought I was the only one.' - C.S. Lewis. Your friendships bring understanding and joy.",
                # Tips for instruction variation 2 (Pick up the phone and call someone...)
                "💖 'Friendship is the golden thread that ties the heart of all the world.' - John Evelyn. You are part of this golden thread!",
                "🌟 'A friend is someone who gives you total freedom to be yourself.' - Jim Morrison. You give others this precious gift!",
                "🌻 Friendship is the comfort of knowing that even when you feel alone, you aren't. You bring this comfort to others!",
                # Tips for instruction variation 3 (Connect with a loved one through a phone call...)
                "💫 'Friendship is the greatest of worldly goods.' - C.S. Lewis. You are a worldly good to those around you!",
                "🌈 'A true friend is someone who thinks that you are a good egg even though he knows that you are slightly cracked.' - Bernard Meltzer. You accept others' cracks beautifully!",
                "✨ 'Friendship is the only thing in the world concerning the usefulness of which all mankind are agreed.' - Marcus Tullius Cicero. Your friendships are universally valuable!"
            ]
        },
        'good': {
            "Creative hobbies": [
                "🎨 'Creativity is intelligence having fun.' - Albert Einstein. Your creative spirit is a gift to the world!",
                "✨ 'Every artist was first an amateur.' - Ralph Waldo Emerson. Your artistic journey is uniquely beautiful.",
                "🌟 'Art enables us to find ourselves and lose ourselves at the same time.' - Thomas Merton. Trust your creative flow!"
            ],
            "Nature walk": [
                "🌿 'In every walk with nature, one receives far more than he seeks.' - John Muir. Nature's wisdom is always available to you.",
                "🍃 'Look deep into nature, and then you will understand everything better.' - Albert Einstein. You are part of nature's beautiful design.",
                "🌱 'The earth has music for those who listen.' - George Santayana. Your connection to nature brings harmony to your soul."
            ],
            "Gratitude journaling": [
                "📝 'Gratitude turns what we have into enough.' - Melody Beattie. Your thankful heart attracts more blessings.",
                "💛 'When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in.' - Kristin Armstrong. Your gratitude practice is transforming your life.",
                "🌟 'Gratitude is the fairest blossom which springs from the soul.' - Henry Ward Beecher. Your grateful heart is a beautiful flower in bloom."
            ],
            "Call a friend": [
                "📞 'Friendship is the only cement that will ever hold the world together.' - Woodrow Wilson. Your connections make the world stronger.",
                "💫 'A real friend is one who walks in when the rest of the world walks out.' - Walter Winchell. You are that kind of friend to others.",
                "🤗 'Friendship is born at that moment when one person says to another, 'What! You too? I thought I was the only one.' - C.S. Lewis. Your friendships bring understanding and joy."
            ]
        },
        'neutral': {
            "Light exercise": [
                "🧘‍♀️ 'The body achieves what the mind believes.' - Napoleon Hill. Your gentle movements are creating harmony within.",
                "⚖️ 'Balance is not something you find, it's something you create.' - Jana Kingsford. You are creating perfect balance in your life.",
                "🌊 'Movement is a medicine for creating change in your body, mind, and spirit.' - Carol Welch. Your movement is healing you."
            ],
            "Try something new": [
                "🔍 'The only way to do great work is to love what you do.' - Steve Jobs. Your curiosity is leading you to greatness.",
                "🌟 'Life begins at the end of your comfort zone.' - Neale Donald Walsch. You are expanding your horizons beautifully.",
                "🚀 'Adventure is not outside man; it is within.' - George Eliot. Your inner explorer is awakening."
            ],
            "Listen to music": [
                "🎵 'Music is the divine way to tell beautiful, poetic things to the heart.' - Pablo Casals. Your soul is being nourished by melody.",
                "🎶 'Where words fail, music speaks.' - Hans Christian Andersen. Music is speaking directly to your heart.",
                "🎼 'Music is the language of the spirit. It opens the secret of life bringing peace, abolishing strife.' - Kahlil Gibran. Your spirit is finding its voice."
            ],
            "Organize space": [
                "📦 'Outer order contributes to inner calm.' - Gretchen Rubin. Your organized space is creating inner peace.",
                "🏠 'Your home should tell the story of who you are, and be a collection of what you love.' - Nate Berkus. You are creating your perfect sanctuary.",
                "✨ 'Simplicity is the ultimate sophistication.' - Leonardo da Vinci. Your organized space reflects your inner wisdom."
            ]
        },
        'sad': {
            "Breathing exercises": [
                "🫁 Breath of Life: 'Breathing is the greatest pleasure in life.' - Giovanni Papini. Each breath is bringing you back to yourself.",
                "💙 Gentle Healing: Your breath is a constant companion, always there to comfort and center you.",
                "🌊 Ocean Breathing: Like the ocean's waves, your breath is steady and reliable. Trust in its rhythm."
            ],
            "Gentle walk": [
                "🌱 Step by Step: 'Every step you take is a step toward healing.' Let nature's gentle energy support your journey.",
                "🍃 Walking Meditation: Each step is an opportunity to leave behind what no longer serves you.",
                "🌿 Natural Comfort: Nature doesn't judge your sadness - it simply offers its peaceful presence."
            ],
            "Watch something fun": [
                "📺 Laughter Medicine: 'Laughter is the best medicine.' Let joy find its way back to your heart.",
                "😊 Light Moment: Sometimes the best healing comes from simply allowing yourself to be entertained.",
                "🌟 Joy Reminder: Laughter and joy are still possible, even in difficult times."
            ],
            "Write feelings": [
                "📖 Emotional Release: 'Writing is the painting of the voice.' - Voltaire. Your words are healing your heart.",
                "💙 Self-Expression: Every word you write is a step toward understanding and accepting your feelings.",
                "🖊️ Healing Through Words: Your journal is a safe space where all emotions are welcome and valid."
            ]
        },
        'angry': {
            "Physical activity": [
                "🏃‍♀️ Energy Transformation: 'Anger is energy. Use it to fuel positive change.' Channel your energy into powerful movement.",
                "💪 Strength Through Motion: Your physical activity is transforming anger into strength and power.",
                "🔥 Fire to Fuel: Like a blacksmith, you're using the heat of anger to forge something stronger."
            ],
            "Express through art": [
                "🎨 Creative Release: 'Art is the lie that enables us to realize the truth.' - Pablo Picasso. Your art is speaking your truth.",
                "🖼️ Emotional Canvas: Every stroke is releasing what's inside. Your creativity is your emotional outlet.",
                "✨ Transformative Art: You're turning difficult emotions into something beautiful and meaningful."
            ],
            "Vent in journal": [
                "📝 Emotional Alchemy: 'Writing is the only way I have to explain my own life to myself.' - Pat Conroy. Your words are transforming anger into understanding.",
                "🖊️ Safe Expression: Your journal is a judgment-free zone where all emotions are valid and welcome.",
                "💥 Release and Relief: Every word you write is releasing the pressure and bringing you closer to peace."
            ],
            "Deep breathing": [
                "🫁 Calm Within: 'Peace comes from within. Do not seek it without.' - Buddha. Your breath is your anchor to peace.",
                "🌊 Wave of Calm: Each breath is washing away the anger, leaving clarity in its place.",
                "💙 Self-Soothing: You have the power to calm yourself. Your breath is your most reliable tool."
            ]
        }
    }
    
    bot_response = ""
    next_step = None
    options = None
    
    if step == 'open_up' or step == 'waiting_for_input':
        # Step 3: Open-Up Handling
        comforting_msg = comforting_messages.get(current_mood, comforting_messages['neutral'])
        activities = wellness_activities.get(current_mood, wellness_activities['neutral'])
        
        bot_response = f"{comforting_msg}\n\nHere are 4 wellness activities that might help you today:"
        
        # Create options for all 4 activities
        options = activities[:4]
        
        next_step = 'waiting_for_activity_choice'
        
    elif step == 'activity_instruction':
        # Handle activity instruction response
        activity_instructions_dict = activity_instructions.get(current_mood, activity_instructions['neutral'])
        activity_instruction_list = activity_instructions_dict.get(user_message, ["I'm sorry, I don't have specific instructions for that activity."])
        
        # Randomly select one of the 3 instruction variations
        if isinstance(activity_instruction_list, list) and len(activity_instruction_list) > 0:
            instruction = random.choice(activity_instruction_list)
        else:
            instruction = "I'm sorry, I don't have specific instructions for that activity."
        
        # Store the chosen activity in the conversation context
        conversation_metadata.chosen_activity = user_message
        conversation_metadata.save()
        
        bot_response = instruction
        next_step = 'follow_up'
        
    elif step == 'follow_up':
        # Step 4: Optional Follow-Up
        bot_response = "Would you like me to share a mindfulness tip or quote to keep you going today?"
        next_step = 'waiting_for_follow_up_response'
        options = ['Yes', 'No']
        
    elif step == 'follow_up_response':
        # Handle follow-up response
        if user_message.lower() in ['yes', 'y', 'sure', 'okay', 'ok']:
            # Get the chosen activity from the conversation context
            chosen_activity = conversation_metadata.chosen_activity
            
            if chosen_activity:
                # Get activity-specific mindfulness tips
                mood_activity_tips = activity_mindfulness_tips.get(current_mood, {})
                activity_tips = mood_activity_tips.get(chosen_activity, [])
                
                if activity_tips:
                    # Since we don't store message content anymore, use random selection
                    tip = random.choice(activity_tips)
                    bot_response = tip
                else:
                    # Fallback to general mood tips
                    fallback_tips = [
                        "🌟 Take a moment to appreciate how far you've come today.",
                        "💫 You're doing great! Keep moving forward with kindness.",
                        "✨ Remember, every small step counts toward your well-being."
                    ]
                    bot_response = random.choice(fallback_tips)
            else:
                # Fallback if we can't determine the activity
                fallback_tips = [
                    "🌟 Take a moment to appreciate how far you've come today.",
                    "💫 You're doing great! Keep moving forward with kindness.",
                    "✨ Remember, every small step counts toward your well-being."
                ]
                bot_response = random.choice(fallback_tips)
        else:
            bot_response = "That's okay. Remember, you can always come back and chat anytime."
        
        next_step = 'feedback_check'
        
    elif step == 'feedback_check':
        # Step 5: Quick Feedback Check
        bot_response = "Was this helpful for you today?"
        next_step = 'waiting_for_feedback_response'
        options = ['Yes', 'No']
        
    elif step == 'feedback_response':
        # Handle feedback response
        if user_message.lower() in ['yes', 'y', 'sure', 'okay', 'ok']:
            bot_response = "I'm glad to hear that! 💚 Your well-being matters to me."
        else:
            bot_response = "Thank you for letting me know. I'll do my best to improve our conversations for you."
        
        next_step = 'closing'
        
    elif step == 'closing':
        # Step 6: Closing Message
        bot_response = "Thank you for sharing with me today. Take care of yourself."
        next_step = 'completed'
    
    return Response({
        'response': bot_response,
        'next_step': next_step,
        'options': options,
        'conversation_completed': next_step == 'completed'
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_chat_with_me_conversation(request):
    """
    Handle the hybrid BERT + rule-based chatbot conversation flow for "Chat with me" button
    Uses BERT model for intent detection and structured responses for different mental health categories
    """
    conversation_id = request.data.get('conversation_id')
    user_message = request.data.get('message', '')
    step = request.data.get('step', 'greeting')  # Current step in conversation
    
    if not conversation_id:
        return Response({'error': 'Conversation ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        conversation_metadata = AnonymizedConversationMetadata.objects.get(id=conversation_id)
    except AnonymizedConversationMetadata.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Import the new modules
    from .bert_intent_detector import get_intent_detector
    from .response_manager import get_response_manager
    
    # Get instances
    intent_detector = get_intent_detector()
    response_manager = get_response_manager()
    
    # Update message count in metadata (no raw content stored)
    if user_message.strip():
        conversation_metadata.total_messages += 1
        
        # Process user message for keywords (for analytics only)
        flagged_keywords = detect_keywords(user_message)
        
        if flagged_keywords:
            # Create anonymized keyword flags for tracking
            for keyword_data in flagged_keywords:
                for word in keyword_data['detected_words']:
                    KeywordFlag.objects.create(
                        keyword=word,
                        category=keyword_data['category'],
                        session_id=conversation_metadata.session_id
                    )
    
    bot_response = ""
    next_step = None
    options = None
    risk_level = None
    alert_created = False
    
    if step == 'greeting':
        # Step 1: Greeting
        bot_response = response_manager.get_response('general', 'greeting')
        next_step = 'intent_detection'
        
        # Update conversation metadata
        conversation_metadata.conversation_type = 'chat_with_me'
        conversation_metadata.save()
        
    elif step == 'intent_detection':
        # Step 2: BERT Intent Detection
        if not user_message.strip():
            bot_response = response_manager.get_response('general', 'greeting')
            next_step = 'intent_detection'
        else:
            # Use BERT model to detect intent
            intent_result = intent_detector.detect_intent(user_message)
            primary_intent = intent_result['primary_intent']
            confidence = intent_result['confidence']
            
            # Check for positive emotions first
            from .utils import analyze_sentiment
            sentiment_result = analyze_sentiment(user_message)
            
            if sentiment_result['sentiment'] == 'positive' and sentiment_result['confidence'] > 0.6:
                # Positive emotion detected - use positive_emotion responses
                bot_response = response_manager.get_response('positive_emotion', 'initial')
                next_step = 'positive_emotion_support'
                options = ['Share More', 'Wellness Activities']
                
                # Update metadata
                conversation_metadata.risk_level = 'low'
                conversation_metadata.intent_detection_method = 'sentiment_analysis'
                conversation_metadata.confidence_score = sentiment_result['confidence']
                conversation_metadata.save()
                
            else:
                # Map intent to risk level
                intent_to_risk = {
                    'high_risk': 'high',
                    'moderate_risk': 'moderate',
                    'low_risk': 'low',
                    'general': 'low'
                }
                risk_level = intent_to_risk.get(primary_intent, 'low')
                
                # Handle different intents
                if primary_intent == 'high_risk':
                    # High Risk Path - Immediate escalation
                    bot_response = response_manager.get_response('high_risk', 'initial')
                    
                    # Create alert for counselor only if no alert has been created for this session yet
                    if not conversation_metadata.alert_created:
                        # Use utility function to prevent duplicates
                        from analytics.utils import create_alert_if_not_duplicate
                        
                        risk_score = calculate_risk_score(request.user)
                        alert_data = {
                            'alert_type': 'bert_intent_detected',
                            'severity': 'high',
                            'title': 'High-Risk Mental Health Intent Detected',
                            'description': f"BERT model detected high-risk intent with {confidence:.2f} confidence. User message: {user_message[:100]}...",
                            'related_keywords': [],
                            'risk_score': risk_score
                        }
                        
                        alert, created = create_alert_if_not_duplicate(
                            user=request.user,
                            alert_data={**alert_data, 'session_id': conversation_metadata.session_id},
                            time_window_minutes=30
                        )
                        
                        if created:
                            alert_created = True
                            # Update metadata to indicate alert was created
                            conversation_metadata.alert_created = True
                    
                    # Update metadata regardless of alert creation
                    conversation_metadata.risk_level = risk_level
                    conversation_metadata.intent_detection_method = intent_result.get('detection_method', 'keyword_fallback')
                    conversation_metadata.confidence_score = confidence
                    conversation_metadata.save()
                    
                    next_step = 'high_risk_escalation'
                    
                elif primary_intent == 'moderate_risk':
                    # Moderate Risk Path - Support and coping strategies
                    bot_response = response_manager.get_response('moderate_risk', 'initial')
                    next_step = 'moderate_risk_support'
                    options = ['Talk More', 'Self-Care Tips']
                    
                    # Update metadata
                    conversation_metadata.risk_level = risk_level
                    conversation_metadata.intent_detection_method = intent_result.get('detection_method', 'keyword_fallback')
                    conversation_metadata.confidence_score = confidence
                    conversation_metadata.save()
                    
                elif primary_intent == 'low_risk':
                    # Low Risk Path - General support and encouragement
                    bot_response = response_manager.get_response('low_risk', 'initial')
                    next_step = 'low_risk_support'
                    options = ['Talk More', 'Wellness Activities']
                    
                    # Update metadata
                    conversation_metadata.risk_level = risk_level
                    conversation_metadata.intent_detection_method = intent_result.get('detection_method', 'keyword_fallback')
                    conversation_metadata.confidence_score = confidence
                    conversation_metadata.save()
                    
                else:  # general
                    # General Path - Basic support
                    bot_response = response_manager.get_response('low_risk', 'initial')
                    next_step = 'low_risk_support'
                    options = ['Talk More', 'Wellness Activities']
                    
                    # Update metadata
                    conversation_metadata.risk_level = risk_level
                    conversation_metadata.intent_detection_method = intent_result.get('detection_method', 'keyword_fallback')
                    conversation_metadata.confidence_score = confidence
                    conversation_metadata.save()
    
    elif step == 'high_risk_escalation':
        # High Risk Path - Escalation message
        bot_response = response_manager.get_response('high_risk', 'escalation')
        next_step = 'high_risk_hotline'
        
    elif step == 'high_risk_hotline':
        # High Risk Path - Hotline information
        bot_response = response_manager.get_response('high_risk', 'hotline')
        next_step = 'high_risk_supportive'
        
    elif step == 'high_risk_supportive':
        # High Risk Path - Supportive message
        bot_response = response_manager.get_response('high_risk', 'supportive')
        next_step = 'high_risk_follow_up'
        
    elif step == 'high_risk_follow_up':
        # High Risk Path - Follow-up message
        bot_response = response_manager.get_response('high_risk', 'follow_up')
        next_step = 'closing'
        
    elif step == 'moderate_risk_support':
        # Moderate Risk Path - Handle user choice
        if user_message.lower() in ['talk more', 'talk more about it']:
            bot_response = response_manager.get_response('moderate_risk', 'supportive')
            next_step = 'moderate_risk_listening'
        elif user_message.lower() in ['self-care tips', 'self care tips']:
            # Detect specific emotion for targeted coping strategies
            emotion_keywords = {
                'stress': ['stress', 'stressed', 'pressure', 'overwhelmed'],
                'sadness': ['sad', 'depressed', 'down', 'blue', 'melancholy'],
                'anxiety': ['anxious', 'worried', 'nervous', 'fear', 'panic'],
                'anger': ['angry', 'mad', 'frustrated', 'irritated', 'upset'],
                'loneliness': ['lonely', 'alone', 'isolated', 'abandoned']
            }
            
            detected_emotion = 'stress'  # default
            for emotion, keywords in emotion_keywords.items():
                if any(keyword in user_message.lower() for keyword in keywords):
                    detected_emotion = emotion
                    break
            
            bot_response = response_manager.get_emotion_based_coping(detected_emotion)
            next_step = 'moderate_risk_encouragement'
        else:
            bot_response = response_manager.get_response('moderate_risk', 'initial')
            next_step = 'moderate_risk_support'
            options = ['Talk More', 'Self-Care Tips']
    
    elif step == 'moderate_risk_listening':
        # Moderate Risk Path - Continue listening
        bot_response = response_manager.get_response('moderate_risk', 'supportive')
        next_step = 'moderate_risk_encouragement'
        
    elif step == 'moderate_risk_encouragement':
        # Moderate Risk Path - Encouragement
        bot_response = response_manager.get_response('moderate_risk', 'encouragement')
        next_step = 'closing'
        
    elif step == 'low_risk_support':
        # Low Risk Path - Handle user choice
        if user_message.lower() in ['talk more', 'talk more about it']:
            bot_response = response_manager.get_response('low_risk', 'supportive')
            next_step = 'low_risk_encouragement'
        elif user_message.lower() in ['wellness activities', 'activities']:
            bot_response = response_manager.get_response('low_risk', 'wellness_activities')
            next_step = 'low_risk_encouragement'
        else:
            bot_response = response_manager.get_response('low_risk', 'initial')
            next_step = 'low_risk_support'
            options = ['Talk More', 'Wellness Activities']
    
    elif step == 'low_risk_encouragement':
        # Low Risk Path - Encouragement
        bot_response = response_manager.get_response('low_risk', 'encouragement')
        next_step = 'closing'
        
    elif step == 'positive_emotion_support':
        # Positive Emotion Path - Handle user choice
        if user_message.lower() in ['share more', 'share more about it', 'tell you more']:
            bot_response = response_manager.get_response('positive_emotion', 'supportive')
            next_step = 'positive_emotion_encouragement'
        elif user_message.lower() in ['wellness activities', 'activities']:
            bot_response = response_manager.get_response('positive_emotion', 'wellness_activities')
            next_step = 'positive_emotion_encouragement'
        else:
            bot_response = response_manager.get_response('positive_emotion', 'initial')
            next_step = 'positive_emotion_support'
            options = ['Share More', 'Wellness Activities']
    
    elif step == 'positive_emotion_encouragement':
        # Positive Emotion Path - Encouragement
        bot_response = response_manager.get_response('positive_emotion', 'encouragement')
        next_step = 'closing'
        
    elif step == 'closing':
        # Closing message
        bot_response = response_manager.get_response('general', 'closing')
        
        # For chat_with_me flow, reset to greeting for continuous conversation
        # For other flows, end the conversation
        if conversation_metadata.conversation_type == 'chat_with_me':
            next_step = 'greeting'
            # Don't end the conversation - keep it open
        else:
            next_step = 'completed'
            # End the conversation
            conversation_metadata.ended_at = timezone.now()
            conversation_metadata.save()
    
    return Response({
        'response': bot_response,
        'next_step': next_step,
        'options': options,
        'risk_level': risk_level,
        'alert_created': alert_created,
        'conversation_completed': next_step == 'completed' and conversation_metadata.conversation_type != 'chat_with_me'
    })