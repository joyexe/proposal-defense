from django.urls import path
from .views import StudentListView

urlpatterns = [
    path('users/students/', StudentListView.as_view(), name='student-list'),
] 