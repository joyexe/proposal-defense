"""
Django management command to send appointment reminders 10 minutes before appointments
Usage: python manage.py send_appointment_reminders
Can be used as a cron job to run every minute
"""

import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from appointments.models import Appointment
from website.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send appointment reminders 10 minutes before appointments'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending emails'
        )
        parser.add_argument(
            '--minutes-before',
            type=int,
            default=10,
            help='Minutes before appointment to send reminder (default: 10)'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        minutes_before = options['minutes_before']
        
        # Calculate the time window for appointments that need reminders
        now = timezone.now()
        reminder_time = now + timedelta(minutes=minutes_before)
        
        # Get appointments that are:
        # 1. Upcoming status
        # 2. Scheduled for the reminder time (within 1 minute window)
        # 3. Haven't been cancelled
        target_time_start = reminder_time.replace(second=0, microsecond=0)
        target_time_end = target_time_start + timedelta(minutes=1)
        
        appointments = Appointment.objects.filter(
            status='upcoming',
            date=reminder_time.date(),
            time__gte=target_time_start.time(),
            time__lt=target_time_end.time()
        ).select_related('client', 'provider')
        
        self.stdout.write(f"Found {appointments.count()} appointments needing reminders for {reminder_time.strftime('%Y-%m-%d %H:%M')}")
        
        sent_count = 0
        error_count = 0
        
        for appointment in appointments:
            try:
                # Send reminder to client (student/faculty)
                client_reminder_sent = self.send_client_reminder(appointment, dry_run)
                
                # Send reminder to provider (clinic/counselor)
                provider_reminder_sent = self.send_provider_reminder(appointment, dry_run)
                
                # Update reminder tracking fields if emails were sent successfully
                if not dry_run:
                    if client_reminder_sent:
                        appointment.client_reminder_sent_at = timezone.now()
                    if provider_reminder_sent:
                        appointment.provider_reminder_sent_at = timezone.now()
                    appointment.save()
                
                if client_reminder_sent or provider_reminder_sent:
                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Reminder sent for appointment {appointment.id}: "
                            f"{appointment.client.full_name} with {appointment.provider.full_name} "
                            f"at {appointment.time.strftime('%H:%M')}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠ No reminder sent for appointment {appointment.id} (dry run or no email)"
                        )
                    )
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Error sending reminder for appointment {appointment.id}: {str(e)}"
                    )
                )
                logger.error(f"Error sending appointment reminder for {appointment.id}: {str(e)}")
        
        # Summary
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"\nDRY RUN SUMMARY: Would send {sent_count} reminders, {error_count} errors"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSUMMARY: Sent {sent_count} reminders, {error_count} errors"
                )
            )
    
    def send_client_reminder(self, appointment, dry_run=False):
        """Send reminder email to the client (student/faculty)"""
        client = appointment.client
        
        # Skip if client has no email
        if not client.email:
            logger.warning(f"Client {client.username} has no email address")
            return False
        
        subject = f"Appointment Reminder - {appointment.get_service_type_display()}"
        
        # Format appointment time
        appointment_time = appointment.time.strftime('%I:%M %p')
        appointment_date = appointment.date.strftime('%A, %B %d, %Y')
        
        # Create message based on client role
        if client.role == 'student':
            message = f"""Hello {client.full_name},

This is a reminder that you have a {appointment.get_service_type_display()} appointment scheduled for:

Date: {appointment_date}
Time: {appointment_time}
Provider: {appointment.provider.full_name} ({appointment.provider.get_role_display()})

Please arrive 5-10 minutes before your scheduled time.

If you need to reschedule or cancel, please contact the health office as soon as possible.

Best regards,
IETI School Health Office"""
        else:  # faculty
            message = f"""Hello {client.full_name},

This is a reminder that you have a {appointment.get_service_type_display()} appointment scheduled for:

Date: {appointment_date}
Time: {appointment_time}
Provider: {appointment.provider.full_name} ({appointment.provider.get_role_display()})

Please arrive 5-10 minutes before your scheduled time.

If you need to reschedule or cancel, please contact the health office as soon as possible.

Best regards,
IETI School Health Office"""
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .appointment-details {{ background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; font-size: 0.9em; color: #666; }}
                .reminder {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>IETI School Health Office</h2>
                </div>
                <div class="content">
                    <p>Hello {client.full_name},</p>
                    
                    <div class="reminder">
                        <strong>⏰ Appointment Reminder</strong>
                    </div>
                    
                    <p>This is a reminder that you have a <strong>{appointment.get_service_type_display()}</strong> appointment scheduled for:</p>
                    
                    <div class="appointment-details">
                        <p><strong>Date:</strong> {appointment_date}</p>
                        <p><strong>Time:</strong> {appointment_time}</p>
                        <p><strong>Provider:</strong> {appointment.provider.full_name} ({appointment.provider.get_role_display()})</p>
                    </div>
                    
                    <p><strong>Please arrive 5-10 minutes before your scheduled time.</strong></p>
                    
                    <p>If you need to reschedule or cancel, please contact the health office as soon as possible.</p>
                </div>
                <div class="footer">
                    <p>Best regards,<br>IETI School Health Office</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        if not dry_run:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [client.email],
                    fail_silently=False,
                    html_message=html_message
                )
                return True
            except Exception as e:
                logger.error(f"Failed to send client reminder email to {client.email}: {str(e)}")
                return False
        else:
            self.stdout.write(f"  Would send client reminder to: {client.email}")
            return True
    
    def send_provider_reminder(self, appointment, dry_run=False):
        """Send reminder email to the provider (clinic/counselor)"""
        provider = appointment.provider
        
        # Skip if provider has no email
        if not provider.email:
            logger.warning(f"Provider {provider.username} has no email address")
            return False
        
        subject = f"Appointment Reminder - {appointment.get_service_type_display()}"
        
        # Format appointment time
        appointment_time = appointment.time.strftime('%I:%M %p')
        appointment_date = appointment.date.strftime('%A, %B %d, %Y')
        
        message = f"""Hello {provider.full_name},

This is a reminder that you have a {appointment.get_service_type_display()} appointment scheduled for:

Date: {appointment_date}
Time: {appointment_time}
Client: {appointment.client.full_name} ({appointment.client.get_role_display()})

Please be ready for the appointment.

Best regards,
IETI School Health Office"""
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .appointment-details {{ background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; font-size: 0.9em; color: #666; }}
                .reminder {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>IETI School Health Office</h2>
                </div>
                <div class="content">
                    <p>Hello {provider.full_name},</p>
                    
                    <div class="reminder">
                        <strong>⏰ Appointment Reminder</strong>
                    </div>
                    
                    <p>This is a reminder that you have a <strong>{appointment.get_service_type_display()}</strong> appointment scheduled for:</p>
                    
                    <div class="appointment-details">
                        <p><strong>Date:</strong> {appointment_date}</p>
                        <p><strong>Time:</strong> {appointment_time}</p>
                        <p><strong>Client:</strong> {appointment.client.full_name} ({appointment.client.get_role_display()})</p>
                    </div>
                    
                    <p><strong>Please be ready for the appointment.</strong></p>
                </div>
                <div class="footer">
                    <p>Best regards,<br>IETI School Health Office</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        if not dry_run:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [provider.email],
                    fail_silently=False,
                    html_message=html_message
                )
                return True
            except Exception as e:
                logger.error(f"Failed to send provider reminder email to {provider.email}: {str(e)}")
                return False
        else:
            self.stdout.write(f"  Would send provider reminder to: {provider.email}")
            return True
