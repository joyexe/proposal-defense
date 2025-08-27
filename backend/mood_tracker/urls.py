from . import views
from django.urls import path

urlpatterns = [
    path('week/', views.get_week_moods),
    path('submit-survey/', views.submit_mood_survey),
    path('latest-recommendation/', views.get_latest_mood_recommendation),
] 