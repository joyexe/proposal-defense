"""
Response Manager for Hybrid Chatbot
Contains structured responses for different mental health categories
"""

import random
from typing import Dict, List, Tuple

class ResponseManager:
    def __init__(self):
        self.responses = self._load_responses()
    
    def _load_responses(self) -> Dict[str, Dict]:
        """Load structured responses for each category"""
        return {
            'high_risk': {
                'initial': [
                    "These feelings are very serious, and you don't have to face them alone. I'm connecting you with immediate help. I've notified a counselor who may reach out to you soon. You are not alone.",
                    "Your life has incredible value, and these feelings won't last forever. I'm getting you connected with professional help right away. You deserve support and care.",
                    "I hear how much pain you're in, and I want you to know that help is available. I'm alerting a counselor immediately because your safety and well-being matter so much."
                ],
                'escalation': [
                    "I've notified a counselor who may reach out to you soon. You are not alone. If you are in immediate danger, please reach out to a suicide prevention hotline right now.",
                    "Help is on the way. A counselor has been notified and will reach out to you. Remember, you are not alone in this struggle.",
                    "I've immediately alerted our counseling team. They will reach out to you soon. Your safety and well-being are our top priority."
                ],
                'hotline': [
                    "If you are in immediate danger, please reach out to a suicide prevention hotline right now.\n\nLocal Hotlines:\n\nNational Center for Mental Health (NCMH) Crisis Hotline: 1553 (toll-free landline) para sa mobile: (02) 1553\n\nNatasha Goulbourn Foundation (HOPELINE): (02) 8804-4673, 0917 558 HOPE (4673), 0918 873 HOPE (4673)\n\nManila Lifeline Centre: (02) 8896-9191\n\nIn Touch Community Services Crisis Hotline: (02) 8893 7603, 0917 800 1123, 0922 893 8944",
                    "Please call one of these crisis hotlines immediately if you're in danger:\n\n• NCMH Crisis Hotline: 1553 (landline) or (02) 1553 (mobile)\n• HOPELINE: (02) 8804-4673, 0917 558 HOPE (4673)\n• Manila Lifeline Centre: (02) 8896-9191\n• In Touch Crisis Hotline: (02) 8893 7603, 0917 800 1123",
                    "Emergency hotlines are available 24/7:\n\nNCMH: 1553 (landline) / (02) 1553 (mobile)\nHOPELINE: (02) 8804-4673, 0917 558 HOPE (4673)\nManila Lifeline: (02) 8896-9191\nIn Touch: (02) 8893 7603, 0917 800 1123"
                ],
                'supportive': [
                    "You are incredibly brave for reaching out. These dark moments don't define you, and they won't last forever. Professional help can make a real difference in how you feel.",
                    "Your feelings are valid, but they don't have to control your life. With the right support, you can find hope and healing. You deserve to feel better.",
                    "I want you to know that you matter, your life matters, and there are people who care deeply about you. Professional help can provide the tools you need to overcome these feelings.",
                    "It takes tremendous courage to acknowledge these feelings and seek help. You're taking the right steps toward healing. Professional support can help you find your way back to hope.",
                    "These feelings are temporary, even though they feel overwhelming right now. With professional help, you can learn to manage them and find joy in life again."
                ],
                'follow_up': [
                    "A counselor will be reaching out to you soon. In the meantime, please stay safe and remember that you are not alone. Your life has value and meaning.",
                    "Help is on the way. Please stay with us and know that professional support can make a real difference in your journey toward healing.",
                    "The counselor will contact you shortly. Please remember that these feelings are treatable and you deserve to feel better. You're taking important steps toward healing."
                ]
            },
            'moderate_risk': {
                'initial': [
                    "I can tell you're going through a tough time. Your feelings are valid, and I'm here to listen. Would you like to talk more about what's been troubling you, or would you prefer some self-care tips that might help you right now?",
                    "I hear that you're struggling, and I want you to know that your feelings matter. You don't have to face this alone. Would you like to share more about what's been difficult, or would you like some coping strategies?",
                    "It sounds like you're dealing with some really challenging emotions. I'm here to support you. Would you like to talk more about what's been troubling you, or would you prefer some self-care suggestions?"
                ],
                'supportive': [
                    "Your feelings are completely understandable given what you're going through. It's okay to not be okay sometimes. You're showing real strength by acknowledging these difficult emotions.",
                    "What you're experiencing is valid and many people go through similar struggles. You're not alone in this, and there are healthy ways to cope with these feelings.",
                    "It's normal to feel overwhelmed when dealing with difficult situations. Your emotions are a natural response to stress, and they don't make you weak or broken.",
                    "I can see how much this is affecting you, and I want you to know that your feelings are important. You deserve support and understanding during this challenging time.",
                    "What you're going through sounds really difficult, and it's completely normal to feel this way. You're showing courage by talking about it, and that's a positive step."
                ],
                'coping_strategies': {
                    'stress': [
                        "Here are some stress management techniques that might help:\n\n• Deep breathing exercises: Take slow, deep breaths for 5-10 minutes\n• Progressive muscle relaxation: Tense and relax each muscle group\n• Mindfulness meditation: Focus on the present moment\n• Physical activity: Even a short walk can help reduce stress\n• Journaling: Write down your thoughts and feelings\n• Talking to someone you trust\n• Taking breaks when you feel overwhelmed",
                        "Try these stress relief techniques:\n\n• Box breathing: Inhale for 4, hold for 4, exhale for 4, hold for 4\n• 5-4-3-2-1 grounding: Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste\n• Gentle stretching or yoga\n• Listening to calming music\n• Spending time in nature\n• Practicing gratitude by listing 3 good things",
                        "Here are some effective stress management strategies:\n\n• Time management: Break tasks into smaller, manageable parts\n• Setting boundaries: Learn to say no when needed\n• Regular exercise: Even 10-15 minutes daily helps\n• Adequate sleep: Aim for 7-9 hours per night\n• Healthy eating: Regular meals with balanced nutrition\n• Social connection: Reach out to friends or family"
                    ],
                    'sadness': [
                        "Here are some ways to cope with sadness:\n\n• Allow yourself to feel: It's okay to be sad, don't suppress your emotions\n• Express your feelings: Talk to someone, write, or create art\n• Practice self-compassion: Be kind to yourself\n• Engage in activities you usually enjoy\n• Connect with others: Reach out to friends or family\n• Get some sunlight and fresh air\n• Try gentle exercise like walking or yoga",
                        "Try these strategies for managing sadness:\n\n• Create a comfort routine: Warm tea, cozy blanket, favorite music\n• Practice gratitude: Write down 3 things you're thankful for\n• Help someone else: Acts of kindness can lift your mood\n• Listen to uplifting music or podcasts\n• Spend time with pets or animals\n• Try creative activities like drawing or writing",
                        "Here are some helpful approaches for sadness:\n\n• Validate your feelings: Sadness is a normal human emotion\n• Seek social support: Don't isolate yourself\n• Maintain routine: Keep up with daily activities\n• Practice mindfulness: Focus on the present moment\n• Consider professional help if sadness persists\n• Remember that feelings are temporary"
                    ],
                    'anxiety': [
                        "Here are some anxiety management techniques:\n\n• Deep breathing: Slow, controlled breathing to calm your nervous system\n• Grounding exercises: Focus on your senses and surroundings\n• Progressive muscle relaxation: Tense and release muscle groups\n• Challenge anxious thoughts: Ask yourself if they're realistic\n• Limit caffeine and alcohol\n• Practice regular exercise\n• Maintain a consistent sleep schedule",
                        "Try these anxiety relief strategies:\n\n• 4-7-8 breathing: Inhale for 4, hold for 7, exhale for 8\n• 5-4-3-2-1 sensory grounding technique\n• Write down your worries and set aside 'worry time'\n• Practice acceptance: Acknowledge anxiety without fighting it\n• Use calming essential oils like lavender\n• Try guided meditation or relaxation apps",
                        "Here are some effective anxiety management approaches:\n\n• Cognitive behavioral techniques: Identify and challenge negative thoughts\n• Regular physical activity: Exercise reduces anxiety naturally\n• Time management: Reduce overwhelm by planning ahead\n• Social support: Talk to trusted friends or family\n• Professional techniques: Consider therapy for persistent anxiety\n• Lifestyle changes: Balanced diet, adequate sleep, reduced stress"
                    ],
                    'anger': [
                        "Here are some anger management techniques:\n\n• Take a timeout: Step away from the situation\n• Deep breathing: Slow, controlled breaths to calm down\n• Count to 10 or 20 before responding\n• Use 'I' statements: 'I feel...' instead of 'You make me...'\n• Physical activity: Exercise can help release tension\n• Practice relaxation techniques\n• Consider the consequences before acting",
                        "Try these anger management strategies:\n\n• Progressive muscle relaxation: Release physical tension\n• Write down your feelings in a journal\n• Talk to someone you trust about what's bothering you\n• Use humor to diffuse the situation\n• Practice empathy: Try to see the other person's perspective\n• Take a walk or engage in physical activity\n• Use calming techniques like meditation",
                        "Here are some helpful approaches for managing anger:\n\n• Identify triggers: Know what situations make you angry\n• Develop healthy outlets: Sports, art, music, writing\n• Practice communication skills: Express feelings calmly\n• Use stress management techniques regularly\n• Consider professional help if anger is affecting relationships\n• Remember that anger is a normal emotion, but how you express it matters"
                    ],
                    'loneliness': [
                        "Here are some ways to cope with loneliness:\n\n• Reach out to friends or family, even if it feels difficult\n• Join clubs or groups with similar interests\n• Volunteer in your community\n• Practice self-compassion and self-care\n• Engage in activities you enjoy\n• Consider getting a pet if possible\n• Use technology to stay connected with loved ones",
                        "Try these strategies for managing loneliness:\n\n• Start small: Send a text or make a short call\n• Join online communities with shared interests\n• Take classes or workshops to meet new people\n• Practice gratitude for the relationships you do have\n• Focus on personal growth and hobbies\n• Consider professional help if loneliness persists\n• Remember that feeling lonely is common and temporary",
                        "Here are some helpful approaches for loneliness:\n\n• Build meaningful connections: Quality over quantity\n• Practice vulnerability: Share your feelings with trusted people\n• Engage in social activities: Even small interactions help\n• Develop a strong relationship with yourself\n• Seek professional support if needed\n• Remember that everyone feels lonely sometimes"
                    ]
                },
                'encouragement': [
                    "You're showing real strength by acknowledging these difficult feelings. That's the first step toward feeling better.",
                    "It's okay to not have all the answers right now. Healing takes time, and you're making progress by reaching out.",
                    "You're not alone in this struggle. Many people go through similar challenges and find their way through them.",
                    "Your feelings are valid, and you deserve support. You're taking important steps toward your well-being.",
                    "Remember that difficult times don't last forever. You have the strength to get through this."
                ]
            },
            'low_risk': {
                'initial': [
                    "Thanks for sharing with me. I'm here if you want to talk more about your day, or I can suggest activities that might help you feel good right now.",
                    "I appreciate you opening up to me. Would you like to continue our conversation, or would you like some wellness activities to boost your mood?",
                    "Thanks for chatting with me. I'm here to listen if you want to talk more, or I can share some positive activities that might help you feel better."
                ],
                'supportive': [
                    "It sounds like you're going through a normal part of life. These feelings are common and usually temporary.",
                    "What you're experiencing is completely normal. Everyone has ups and downs, and it's okay to not feel great sometimes.",
                    "You're handling this situation well. These kinds of feelings are part of being human, and they usually pass with time.",
                    "I can see you're dealing with some challenges, but you seem to have good perspective on things.",
                    "It's normal to feel this way sometimes. You're showing good self-awareness by recognizing these feelings."
                ],
                'encouragement': [
                    "You're doing great! Keep up the positive attitude and self-care.",
                    "Remember that every day is a new opportunity to feel better.",
                    "You have the strength to handle whatever comes your way.",
                    "Keep focusing on the things that bring you joy and peace.",
                    "You're making good choices for your well-being."
                ],
                'wellness_activities': [
                    "Here are some activities that might help you feel good:\n\n• Take a walk outside and enjoy nature\n• Listen to your favorite music\n• Call or text a friend\n• Try a new hobby or activity\n• Practice gratitude by listing things you're thankful for\n• Do something creative like drawing or writing\n• Exercise or do some gentle stretching",
                    "Try these mood-boosting activities:\n\n• Spend time with pets or animals\n• Cook or bake something you enjoy\n• Watch a funny movie or show\n• Read a good book\n• Take a relaxing bath or shower\n• Practice mindfulness or meditation\n• Organize or clean your space",
                    "Here are some positive activities to try:\n\n• Volunteer or help someone else\n• Learn something new online\n• Dance to your favorite music\n• Write in a journal\n• Take photos of things that make you happy\n• Plan something fun to look forward to\n• Connect with family or friends"
                ]
            },
            'positive_emotion': {
                'initial': [
                    "That's wonderful to hear! Your positive energy is contagious and can brighten your day and others around you. Keep nurturing that happiness!",
                    "I'm so glad you're feeling this way! Your positive mood can help you accomplish great things today. What's contributing to your good feelings?",
                    "It's fantastic that you're feeling good! Positive emotions like this can boost your creativity and motivation. Is there anything specific that's making you feel this way?"
                ],
                'supportive': [
                    "Your positive attitude is truly inspiring! It's amazing how your good mood can influence your entire day and the people around you.",
                    "I love seeing you in such a great mood! Positive emotions like this can help you tackle challenges with confidence and creativity.",
                    "Your happiness is well-deserved! When you're feeling good, it shows in everything you do and can inspire others too.",
                    "It's wonderful that you're feeling this way! Your positive energy can help you make the most of every opportunity that comes your way.",
                    "Your good mood is a gift to yourself and others! Keep spreading that positive energy wherever you go."
                ],
                'encouragement': [
                    "Keep that positive energy flowing! Your happiness is a superpower that can help you achieve amazing things.",
                    "You're radiating positivity! Use this good mood to make today even more wonderful.",
                    "Your positive attitude is your greatest strength! Keep shining and inspiring others.",
                    "This happiness is well-earned! Let it fuel your creativity and drive to accomplish your goals.",
                    "You're doing amazing! Your positive mindset is a beautiful thing to nurture and share."
                ],
                'wellness_activities': [
                    "Since you're feeling great, here are some activities to amplify your positive energy:\n\n• Share your good mood with friends and family\n• Try something new that excites you\n• Express your creativity through art or music\n• Help someone else feel good too\n• Plan something fun for later this week\n• Take photos to capture this happy moment\n• Write about what's making you feel so good",
                    "Your positive energy is perfect for these uplifting activities:\n\n• Dance to your favorite upbeat music\n• Call someone you care about and share your joy\n• Start a project you've been excited about\n• Go for a walk and appreciate the beauty around you\n• Cook or bake something delicious\n• Learn something new that interests you\n• Volunteer and spread your positive vibes",
                    "Here are some great ways to make the most of your good mood:\n\n• Set new goals while you're feeling motivated\n• Organize your space to match your positive energy\n• Try a new hobby or skill you've been curious about\n• Connect with people who bring out the best in you\n• Plan a fun adventure or outing\n• Express gratitude for this wonderful feeling\n• Create something beautiful to remember this moment"
                ]
            },
            'general': {
                'greeting': [
                    "Hi! I'm here to listen and support you. How are you feeling today?",
                    "Hello! I'm ready to chat and help you with whatever's on your mind. What would you like to talk about?",
                    "Hi there! I'm here to support you. How can I help you today?"
                ],
                'listening': [
                    "I'm here to listen. Tell me more about what's on your mind.",
                    "I'm listening. Please share whatever you're comfortable with.",
                    "I'm here for you. What would you like to talk about?"
                ],
                'closing': [
                    "Thank you for chatting with me today. Remember, your thoughts and feelings matter.",
                    "Thanks for sharing with me. Take care of yourself, and know that I'm here if you need to talk again.",
                    "Thank you for our conversation. Remember that you're not alone, and help is always available."
                ]
            }
        }
    
    def get_response(self, category: str, response_type: str, emotion: str = None) -> str:
        """
        Get a response for the specified category and type
        
        Args:
            category (str): 'high_risk', 'moderate_risk', 'low_risk', or 'general'
            response_type (str): Type of response needed
            emotion (str): Specific emotion for coping strategies (optional)
            
        Returns:
            str: Appropriate response
        """
        if category not in self.responses:
            category = 'general'
        
        category_responses = self.responses[category]
        
        if response_type == 'coping_strategies' and emotion:
            if 'coping_strategies' in category_responses and emotion in category_responses['coping_strategies']:
                return random.choice(category_responses['coping_strategies'][emotion])
            else:
                # Fallback to general coping strategies
                return random.choice(category_responses.get('coping_strategies', {}).get('stress', ["I understand you're going through a difficult time. Would you like to talk more about it?"]))
        
        if response_type in category_responses:
            return random.choice(category_responses[response_type])
        
        # Fallback to general response
        return random.choice(category_responses.get('initial', ["I'm here to listen and support you."]))
    
    def get_emotion_based_coping(self, emotion: str) -> str:
        """
        Get coping strategies for a specific emotion
        
        Args:
            emotion (str): The emotion to get coping strategies for
            
        Returns:
            str: Coping strategies for the emotion
        """
        emotion_mapping = {
            'stress': 'stress',
            'sadness': 'sadness', 
            'depression': 'sadness',
            'anxiety': 'anxiety',
            'worry': 'anxiety',
            'anger': 'anger',
            'frustration': 'anger',
            'loneliness': 'loneliness',
            'alone': 'loneliness'
        }
        
        mapped_emotion = emotion_mapping.get(emotion.lower(), 'stress')
        return self.get_response('moderate_risk', 'coping_strategies', mapped_emotion)

# Global instance
response_manager = ResponseManager()

def get_response_manager() -> ResponseManager:
    """Get the global response manager instance"""
    return response_manager
