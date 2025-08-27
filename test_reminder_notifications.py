#!/usr/bin/env python
"""
Test script to verify appointment reminder notifications work correctly.
This script will:
1. Find an upcoming appointment
2. Manually set a reminder timestamp
3. Test the notification API endpoints
"""

import os
import sys
import django
from datetime import timedelta

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from appointments.models import Appointment
from website.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

def test_reminder_notifications():
    print("Testing Appointment Reminder Notifications")
    print("=" * 50)
    
    # Find an upcoming appointment
    upcoming_appointments = Appointment.objects.filter(
        status='upcoming'
    ).select_related('client', 'provider')[:5]
    
    if not upcoming_appointments:
        print("No upcoming appointments found. Please create some appointments first.")
        return
    
    print(f"Found {len(upcoming_appointments)} upcoming appointments:")
    for i, appt in enumerate(upcoming_appointments, 1):
        print(f"{i}. {appt.client.full_name} with {appt.provider.full_name} on {appt.date} at {appt.time}")
    
    # Use the first appointment for testing
    test_appointment = upcoming_appointments[0]
    print(f"\nUsing appointment: {test_appointment.client.full_name} with {test_appointment.provider.full_name}")
    
    # Manually set a reminder timestamp (simulating that a reminder was sent)
    test_appointment.client_reminder_sent_at = timezone.now() - timedelta(minutes=5)
    test_appointment.provider_reminder_sent_at = timezone.now() - timedelta(minutes=5)
    test_appointment.save()
    
    print(f"✓ Set reminder timestamps for appointment {test_appointment.id}")
    
    # Test notification endpoints
    client = APIClient()
    
    # Test student notifications
    if test_appointment.client.role == 'student':
        print(f"\nTesting student notifications for {test_appointment.client.full_name}...")
        
        # Create a token for the student
        refresh = RefreshToken.for_user(test_appointment.client)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Get student notifications
        response = client.get('/api/appointments/student-notifications/')
        if response.status_code == 200:
            notifications = response.data
            print(f"✓ Student notifications API working. Found {len(notifications)} notifications")
            
            # Check for reminder notification
            reminder_notifications = [n for n in notifications if n.get('type') == 'appointment_reminder']
            if reminder_notifications:
                print(f"✓ Found {len(reminder_notifications)} reminder notification(s)")
                for reminder in reminder_notifications:
                    print(f"  - {reminder['text']}")
            else:
                print("⚠ No reminder notifications found")
        else:
            print(f"✗ Student notifications API failed: {response.status_code}")
    
    # Test faculty notifications
    if test_appointment.client.role == 'faculty':
        print(f"\nTesting faculty notifications for {test_appointment.client.full_name}...")
        
        # Create a token for the faculty
        refresh = RefreshToken.for_user(test_appointment.client)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Get faculty notifications
        response = client.get('/api/appointments/faculty-notifications/')
        if response.status_code == 200:
            notifications = response.data
            print(f"✓ Faculty notifications API working. Found {len(notifications)} notifications")
            
            # Check for reminder notification
            reminder_notifications = [n for n in notifications if n.get('type') == 'appointment_reminder']
            if reminder_notifications:
                print(f"✓ Found {len(reminder_notifications)} reminder notification(s)")
                for reminder in reminder_notifications:
                    print(f"  - {reminder['text']}")
            else:
                print("⚠ No reminder notifications found")
        else:
            print(f"✗ Faculty notifications API failed: {response.status_code}")
    
    # Test provider notifications
    if test_appointment.provider.role in ['clinic', 'counselor']:
        print(f"\nTesting {test_appointment.provider.role} notifications for {test_appointment.provider.full_name}...")
        
        # Create a token for the provider
        refresh = RefreshToken.for_user(test_appointment.provider)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Get provider notifications
        if test_appointment.provider.role == 'clinic':
            response = client.get('/api/appointments/clinic-notifications/')
        else:  # counselor
            response = client.get('/api/appointments/counselor-notifications/')
        
        if response.status_code == 200:
            notifications = response.data
            print(f"✓ {test_appointment.provider.role.capitalize()} notifications API working. Found {len(notifications)} notifications")
            
            # Check for reminder notification
            reminder_notifications = [n for n in notifications if n.get('type') == 'appointment_reminder']
            if reminder_notifications:
                print(f"✓ Found {len(reminder_notifications)} reminder notification(s)")
                for reminder in reminder_notifications:
                    print(f"  - {reminder['text']}")
            else:
                print("⚠ No reminder notifications found")
        else:
            print(f"✗ {test_appointment.provider.role.capitalize()} notifications API failed: {response.status_code}")
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\nTo clean up the test data, you can reset the reminder timestamps:")
    print(f"python manage.py shell -c \"from appointments.models import Appointment; appt = Appointment.objects.get(id={test_appointment.id}); appt.client_reminder_sent_at = None; appt.provider_reminder_sent_at = None; appt.save(); print('Reminder timestamps reset')\"")

if __name__ == '__main__':
    test_reminder_notifications()
