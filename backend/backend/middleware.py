from django.middleware.csrf import get_token
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from logs.models import SystemLog
from django.contrib.auth import get_user_model
import json

UserModel = get_user_model()

# Import BulletinPost for title lookup
try:
    from bulletin.models import BulletinPost
except ImportError:
    BulletinPost = None

# Helper to map method+path to human-readable action/target
def get_log_action_target(method, path, data=None, user=None):
    # Login
    if path.endswith('/api/login/') and method == 'POST':
        return 'Logged in', 'System Login'
    # Logout
    if path.endswith('/api/logout/') and method == 'POST':
        return 'Logged out', 'System Logout'
    # System Logs
    if path.startswith('/api/logs/') or path == '/api/logs/':
        if method == 'GET':
            return 'Viewed System Logs', 'System Logs'
    # Bulletin
    if path.startswith('/api/bulletin/posts/') or path == '/api/bulletin/posts/':
        # Try to extract bulletin ID from path
        bulletin_id = None
        path_parts = path.rstrip('/').split('/')
        if len(path_parts) > 4 and path_parts[4].isdigit():
            bulletin_id = path_parts[4]
        # For POST, use title from data
        if method == 'POST':
            title = (data or {}).get('title')
            return 'Created Bulletin', f'Bulletin: {title}' if title else 'Bulletin'
        # For PUT/PATCH/DELETE/GET on a specific bulletin, fetch title from DB
        if bulletin_id and BulletinPost:
            try:
                bulletin = BulletinPost.objects.get(pk=bulletin_id)
                title = bulletin.title
            except Exception:
                title = None
            if method in ['PUT', 'PATCH']:
                return 'Updated Bulletin', f'Bulletin: {title}' if title else 'Bulletin'
            if method == 'DELETE':
                return 'Deleted Bulletin', f'Bulletin: {title}' if title else 'Bulletin'
            if method == 'GET':
                return 'Viewed Bulletin', f'Bulletin: {title}' if title else 'Bulletin'
        # For GET all
        if method == 'GET':
            return 'Viewed Bulletins', 'All Bulletins'
    if path.startswith('/api/bulletin/posts/active_posts/') or path == '/api/bulletin/posts/active_posts/':
        if method == 'GET':
            return 'Viewed Active Bulletins', 'All Active Bulletins'
    # Health Records
    if path.startswith('/api/health-records/physical-health/'):
        if method == 'POST':
            return 'Created Physical Health Record', 'Physical Health Record'
        if method in ['PUT', 'PATCH']:
            return 'Updated Physical Health Record', 'Physical Health Record'
        if method == 'GET':
            return 'Viewed Physical Health Record', 'Physical Health Record'
    if path.startswith('/api/health-records/mental-summary/'):
        if method == 'POST':
            return 'Created Mental Health Summary', 'Mental Health Summary'
        if method in ['PUT', 'PATCH']:
            return 'Updated Mental Health Summary', 'Mental Health Summary'
        if method == 'GET':
            return 'Viewed Mental Health Summary', 'Mental Health Summary'
    if path.startswith('/api/health-records/appointments/'):
        if method == 'POST':
            return 'Created Appointment', 'Appointment'
        if method in ['PUT', 'PATCH']:
            return 'Updated Appointment', 'Appointment'
        if method == 'DELETE':
            return 'Deleted Appointment', 'Appointment'
        if method == 'GET':
            return 'Viewed Appointments', 'All Appointments'
    # Referrals
    if path.startswith('/api/referrals/'):
        if method == 'POST':
            return 'Created Referral', 'Referral'
        if method in ['PUT', 'PATCH']:
            return 'Updated Referral', 'Referral'
        if method == 'DELETE':
            return 'Deleted Referral', 'Referral'
        if method == 'GET':
            return 'Viewed Referrals', 'All Referrals'
    # Mood Tracker
    if path.startswith('/api/submit-mood/'):
        if method == 'POST':
            return 'Submitted Mood', 'Mood Entry'
    if path.startswith('/api/mood-data/'):
        if method == 'GET':
            return 'Viewed Mood Data', 'Mood Data'
    if path.startswith('/api/check-mood/'):
        if method == 'GET':
            return 'Checked Mood', 'Mood Check'
    # User Management
    if path.startswith('/api/admin/users/'):
        if method == 'POST':
            return 'Created User', 'User'
        if method in ['PUT', 'PATCH']:
            return 'Updated User', 'User'
        if method == 'DELETE':
            return 'Deleted User', 'User'
        if method == 'GET':
            return 'Viewed Users', 'All Users'
    # Dashboard
    if path.startswith('/api/admin/dashboard/'):
        return 'Viewed Admin Dashboard', 'Admin Dashboard'
    if path.startswith('/api/clinic/dashboard/'):
        return 'Viewed Clinic Dashboard', 'Clinic Dashboard'
    if path.startswith('/api/counselor/dashboard/'):
        return 'Viewed Counselor Dashboard', 'Counselor Dashboard'
    if path.startswith('/api/faculty/dashboard/'):
        return 'Viewed Faculty Dashboard', 'Faculty Dashboard'
    if path.startswith('/api/student/dashboard/'):
        return 'Viewed Student Dashboard', 'Student Dashboard'
    # Dashboard Statistics
    if path.startswith('/api/monthly-statistics/'):
        return 'Viewed Monthly Statistics', 'Monthly Statistics'
    if path.startswith('/api/active-sessions/'):
        return 'Viewed Active Sessions', 'Active Sessions'
    # Profile
    if path.startswith('/api/user/profile/'):
        return 'Viewed User Profile', 'User Profile'
    # Django Admin
    if path.startswith('/admin/logs/systemlog/'):
        return 'Viewed System Logs (Admin)', 'System Logs (Admin)'
    if path.startswith('/admin/'):
        return 'Viewed Django Admin', 'Django Admin'
    # Fallback for GET: always human readable
    if method == 'GET':
        return 'Viewed Page', path
    # Fallback for others
    return f'{method} {path}', path

class CustomCsrfMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Skip CSRF logic for JWT-authenticated API requests
        if request.META.get('HTTP_AUTHORIZATION'):
            return
        if request.META.get('HTTP_ORIGIN') in [
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ]:
            get_token(request)  # Ensure CSRF token is set

    def process_response(self, request, response):
        # Log system actions (ALL GET, POST, PUT, PATCH, DELETE, login)
        try:
            method = request.method
            path = request.path
            # Skip static/media/favicon/robots.txt requests
            if path.startswith('/favicon.ico') or path.startswith('/static/') or path.startswith('/media/') or path.startswith('/robots.txt'):
                return response
            user = getattr(request, 'user', None)
            username = user.username if user and user.is_authenticated else 'Unknown'
            role = getattr(user, 'role', None) if user and user.is_authenticated else 'Unknown'
            ip = request.META.get('REMOTE_ADDR')
            data = self._get_request_data(request)
            # Log all actions if authenticated
            if user and user.is_authenticated:
                action, target = get_log_action_target(method, path, data, user)
                SystemLog.objects.create(
                    user=username,
                    role=role,
                    action=action,
                    target=target,
                    details=f'IP: {ip}'
                )
        except Exception as e:
            pass  # Don't break the app if logging fails

        # Skip CSRF logic for JWT-authenticated API requests
        if request.META.get('HTTP_AUTHORIZATION'):
            return response
        if request.META.get('HTTP_ORIGIN') in [
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ]:
            response['Access-Control-Allow-Origin'] = request.META['HTTP_ORIGIN']
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Vary'] = 'Origin'
        return response

    def _get_request_data(self, request):
        try:
            if request.body:
                return json.loads(request.body.decode('utf-8'))
        except Exception:
            pass
        return {}
