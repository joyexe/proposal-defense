from django.urls import path
from . import views

urlpatterns = [
    path('start-conversation/', views.start_conversation, name='start_conversation'),
    path('log-message/', views.log_message, name='log_message'),
    path('end-conversation/', views.end_conversation, name='end_conversation'),
    path('conversations/', views.get_user_conversations, name='get_user_conversations'),
    path('alerts/', views.get_mental_health_alerts, name='get_mental_health_alerts'),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert, name='resolve_alert'),
    path('alerts/<int:alert_id>/assign/', views.assign_alert, name='assign_alert'),
    path('open-up-conversation/', views.handle_open_up_conversation, name='handle_open_up_conversation'),
    path('chat-with-me/', views.handle_chat_with_me_conversation, name='handle_chat_with_me_conversation'),
]

