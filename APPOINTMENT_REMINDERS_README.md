# Appointment Reminder System

This system automatically sends email reminders to students, faculty, and healthcare providers 10 minutes before their scheduled appointments.

## Features

- **Email Reminders**: Sends HTML-formatted email reminders to both clients (students/faculty) and providers (clinic/counselor)
- **Notification Integration**: Reminder notifications appear in the web interface alongside regular appointment notifications
- **Configurable Timing**: Can be configured to send reminders at different intervals (default: 10 minutes)
- **Tracking**: Tracks when reminders were sent to avoid duplicate emails

## Setup Instructions

### 1. Email Configuration

The system uses Django's email backend. Make sure your email settings are configured in `backend/backend/settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'Amieti <your-email@gmail.com>'
```

### 2. Database Migration

Run the database migration to add reminder tracking fields:

```bash
cd backend
python manage.py migrate
```

### 3. Testing the Reminder System

Test the reminder system with a dry run:

```bash
python manage.py send_appointment_reminders --dry-run
```

This will show what reminders would be sent without actually sending emails.

### 4. Setting Up Automated Reminders

#### Option A: Cron Job (Recommended for Production)

Add a cron job to run the reminder command every minute:

```bash
# Edit crontab
crontab -e

# Add this line to run every minute
* * * * * cd /path/to/your/amieti/backend && python manage.py send_appointment_reminders
```

#### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create a new Basic Task
3. Set trigger to run every minute
4. Set action to start a program:
   - Program: `python`
   - Arguments: `manage.py send_appointment_reminders`
   - Start in: `C:\path\to\your\amieti\backend`

#### Option C: Manual Testing

For testing purposes, you can run the command manually:

```bash
# Send reminders for appointments in 10 minutes
python manage.py send_appointment_reminders

# Send reminders for appointments in 5 minutes
python manage.py send_appointment_reminders --minutes-before 5
```

## How It Works

### 1. Reminder Detection

The system checks for appointments that are:
- Status: "upcoming"
- Scheduled for the reminder time (within 1 minute window)
- Haven't been cancelled

### 2. Email Sending

For each appointment, the system sends:
- **Client Reminder**: To students/faculty about their upcoming appointment
- **Provider Reminder**: To clinic/counselor staff about their upcoming appointment

### 3. Notification Integration

Reminder notifications appear in the web interface:
- **Student Dashboard**: Shows appointment reminders in the notifications section
- **Faculty Dashboard**: Shows appointment reminders in the notifications section
- **Clinic Dashboard**: Shows appointment reminders in the notifications section
- **Counselor Dashboard**: Shows appointment reminders in the notifications section

### 4. Tracking

The system tracks:
- `client_reminder_sent_at`: When client reminder was sent
- `provider_reminder_sent_at`: When provider reminder was sent

This prevents duplicate reminders from being sent.

## Email Templates

### Client Reminder Email

**Subject**: "Appointment Reminder - [Service Type]"

**Content**:
- Greeting with client name
- Appointment details (date, time, provider)
- Instructions to arrive 5-10 minutes early
- Contact information for rescheduling

### Provider Reminder Email

**Subject**: "Appointment Reminder - [Service Type]"

**Content**:
- Greeting with provider name
- Appointment details (date, time, client)
- Instructions to be ready for the appointment

## Troubleshooting

### Common Issues

1. **No emails being sent**
   - Check email configuration in settings.py
   - Verify SMTP credentials
   - Check if users have email addresses

2. **Reminders not appearing in notifications**
   - Ensure the appointment has `client_reminder_sent_at` or `provider_reminder_sent_at` set
   - Check that the appointment status is "upcoming"

3. **Cron job not working**
   - Verify the path to the Django project
   - Check cron logs: `tail -f /var/log/cron`
   - Test the command manually first

### Debugging

Enable debug logging by adding to `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'appointments.management.commands.send_appointment_reminders': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Customization

### Changing Reminder Timing

Modify the `--minutes-before` parameter:

```bash
# Send reminders 15 minutes before
python manage.py send_appointment_reminders --minutes-before 15

# Send reminders 5 minutes before
python manage.py send_appointment_reminders --minutes-before 5
```

### Customizing Email Templates

Edit the email templates in `backend/appointments/management/commands/send_appointment_reminders.py`:

- `send_client_reminder()` method for client emails
- `send_provider_reminder()` method for provider emails

### Adding Multiple Reminder Times

To send multiple reminders (e.g., 24 hours and 10 minutes before), create additional cron jobs:

```bash
# 24 hours before (run daily at 9 AM)
0 9 * * * cd /path/to/amieti/backend && python manage.py send_appointment_reminders --minutes-before 1440

# 10 minutes before (run every minute)
* * * * * cd /path/to/amieti/backend && python manage.py send_appointment_reminders --minutes-before 10
```

## Security Considerations

1. **Email Credentials**: Store email passwords securely using environment variables
2. **Rate Limiting**: The system includes retry logic for failed email sends
3. **Logging**: Failed email attempts are logged for debugging
4. **Dry Run**: Always test with `--dry-run` before deploying to production

## Support

For issues or questions about the appointment reminder system, check:
1. Django logs for error messages
2. Email server logs for delivery issues
3. Database for reminder tracking data
