'use client';
import React, { useState, useEffect } from 'react';
import { getSystemLogs } from '@/app/utils/api';

const roles = ['All', 'Admin', 'Counselor', 'Faculty', 'Nurse', 'Student'];

function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

// Function to convert API endpoints to human-readable format
const convertActionToHumanReadable = (action) => {
  // Handle dynamic endpoints with IDs
  if (action && typeof action === 'string') {
    // Handle appointment actions with ID
    if (action.match(/^POST \/api\/appointments\/appointments\/\d+\/cancel\/$/)) {
      return 'Cancel Appointment';
    }
    if (action.match(/^POST \/api\/appointments\/appointments\/\d+\/mark_in_progress\/$/)) {
      return 'Mark Appointment In Progress';
    }
    if (action.match(/^POST \/api\/appointments\/appointments\/\d+\/mark_completed\/$/)) {
      return 'Mark Appointment Completed';
    }
    
    // Handle other dynamic endpoints
    if (action.match(/^GET \/api\/appointments\/appointments\/\d+\/$/)) {
      return 'View Appointment';
    }
    if (action.match(/^PUT \/api\/appointments\/appointments\/\d+\/$/)) {
      return 'Update Appointment';
    }
    if (action.match(/^PATCH \/api\/appointments\/appointments\/\d+\/$/)) {
      return 'Update Appointment';
    }
    if (action.match(/^DELETE \/api\/appointments\/appointments\/\d+\/$/)) {
      return 'Delete Appointment';
    }
    
    // Handle availability with ID
    if (action.match(/^GET \/api\/appointments\/availability\/\d+\/$/)) {
      return 'View Availability';
    }
    if (action.match(/^PUT \/api\/appointments\/availability\/\d+\/$/)) {
      return 'Update Availability';
    }
    if (action.match(/^PATCH \/api\/appointments\/availability\/\d+\/$/)) {
      return 'Update Availability';
    }
    if (action.match(/^DELETE \/api\/appointments\/availability\/\d+\/$/)) {
      return 'Delete Availability';
    }
    
    // Handle notes with ID
    if (action.match(/^GET \/api\/appointments\/notes\/\d+\/$/)) {
      return 'View Appointment Note';
    }
    if (action.match(/^PUT \/api\/appointments\/notes\/\d+\/$/)) {
      return 'Update Appointment Note';
    }
    if (action.match(/^PATCH \/api\/appointments\/notes\/\d+\/$/)) {
      return 'Update Appointment Note';
    }
    if (action.match(/^DELETE \/api\/appointments\/notes\/\d+\/$/)) {
      return 'Delete Appointment Note';
    }
    
    // Handle wellness journey with ID
    if (action.match(/^GET \/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'View Wellness Profile';
    }
    if (action.match(/^POST \/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'Create Wellness Profile';
    }
    if (action.match(/^PUT \/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'Update Wellness Profile';
    }
    if (action.match(/^PATCH \/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'Update Wellness Profile';
    }
    if (action.match(/^DELETE \/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'Delete Wellness Profile';
    }
    
    if (action.match(/^GET \/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'View Daily Task';
    }
    if (action.match(/^POST \/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'Create Daily Task';
    }
    if (action.match(/^PUT \/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'Update Daily Task';
    }
    if (action.match(/^PATCH \/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'Update Daily Task';
    }
    if (action.match(/^DELETE \/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'Delete Daily Task';
    }
    
    if (action.match(/^GET \/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'View Achievement';
    }
    if (action.match(/^POST \/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'Create Achievement';
    }
    if (action.match(/^PUT \/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'Update Achievement';
    }
    if (action.match(/^PATCH \/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'Update Achievement';
    }
    if (action.match(/^DELETE \/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'Delete Achievement';
    }
    
    if (action.match(/^GET \/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'View Weekly Goal';
    }
    if (action.match(/^POST \/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'Create Weekly Goal';
    }
    if (action.match(/^PUT \/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'Update Weekly Goal';
    }
    if (action.match(/^PATCH \/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'Update Weekly Goal';
    }
    if (action.match(/^DELETE \/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'Delete Weekly Goal';
    }
    
    // Handle health records with ID
    if (action.match(/^GET \/api\/health-records\/permit-requests\/\d+\/$/)) {
      return 'View Permit Request';
    }
    if (action.match(/^PUT \/api\/health-records\/permit-requests\/\d+\/update\/$/)) {
      return 'Update Permit Request';
    }
    if (action.match(/^PUT \/api\/health-records\/permit-requests\/\d+\/clinic-assessment\/$/)) {
      return 'Update Clinic Assessment';
    }
    if (action.match(/^POST \/api\/health-records\/permit-requests\/\d+\/parent-response\/$/)) {
      return 'Submit Parent Response';
    }
    
    // Handle bulletin with ID
    if (action.match(/^GET \/api\/bulletin\/posts\/\d+\/$/)) {
      return 'View Bulletin Post';
    }
    if (action.match(/^POST \/api\/bulletin\/posts\/\d+\/$/)) {
      return 'Create Bulletin Post';
    }
    if (action.match(/^PUT \/api\/bulletin\/posts\/\d+\/$/)) {
      return 'Update Bulletin Post';
    }
    if (action.match(/^PATCH \/api\/bulletin\/posts\/\d+\/$/)) {
      return 'Update Bulletin Post';
    }
    if (action.match(/^DELETE \/api\/bulletin\/posts\/\d+\/$/)) {
      return 'Delete Bulletin Post';
    }
    if (action.match(/^POST \/api\/bulletin\/posts\/\d+\/toggle_status\/$/)) {
      return 'Toggle Bulletin Post Status';
    }
    
    // Handle inventory with ID
    if (action.match(/^GET \/api\/inventory\/items\/\d+\/$/)) {
      return 'View Inventory Item';
    }
    if (action.match(/^POST \/api\/inventory\/items\/\d+\/$/)) {
      return 'Create Inventory Item';
    }
    if (action.match(/^PUT \/api\/inventory\/items\/\d+\/$/)) {
      return 'Update Inventory Item';
    }
    if (action.match(/^PATCH \/api\/inventory\/items\/\d+\/$/)) {
      return 'Update Inventory Item';
    }
    if (action.match(/^DELETE \/api\/inventory\/items\/\d+\/$/)) {
      return 'Delete Inventory Item';
    }
    
    if (action.match(/^GET \/api\/inventory\/logs\/\d+\/$/)) {
      return 'View Inventory Log';
    }
    if (action.match(/^POST \/api\/inventory\/logs\/\d+\/$/)) {
      return 'Create Inventory Log';
    }
    if (action.match(/^PUT \/api\/inventory\/logs\/\d+\/$/)) {
      return 'Update Inventory Log';
    }
    if (action.match(/^PATCH \/api\/inventory\/logs\/\d+\/$/)) {
      return 'Update Inventory Log';
    }
    if (action.match(/^DELETE \/api\/inventory\/logs\/\d+\/$/)) {
      return 'Delete Inventory Log';
    }
    
    // Handle admin users with ID
    if (action.match(/^PUT \/api\/admin\/users\/\d+\/disable\/$/)) {
      return 'Disable User';
    }
    if (action.match(/^PUT \/api\/admin\/users\/\d+\/restore\/$/)) {
      return 'Restore User';
    }
    
    // Handle health records general info with ID
    if (action.match(/^GET \/api\/health-records\/general-info\/\d+\/$/)) {
      return 'View General Health Info';
    }
    if (action.match(/^POST \/api\/health-records\/general-info\/\d+\/$/)) {
      return 'Create General Health Info';
    }
    if (action.match(/^PUT \/api\/health-records\/general-info\/\d+\/$/)) {
      return 'Update General Health Info';
    }
    if (action.match(/^PATCH \/api\/health-records\/general-info\/\d+\/$/)) {
      return 'Update General Health Info';
    }
    if (action.match(/^DELETE \/api\/health-records\/general-info\/\d+\/$/)) {
      return 'Delete General Health Info';
    }
    
    // Handle health records physical health with ID
    if (action.match(/^GET \/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'View Physical Health';
    }
    if (action.match(/^POST \/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'Create Physical Health';
    }
    if (action.match(/^PUT \/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'Update Physical Health';
    }
    if (action.match(/^PATCH \/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'Update Physical Health';
    }
    if (action.match(/^DELETE \/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'Delete Physical Health';
    }
  }
  
  const actionMap = {
    'GET': 'View',
    'POST': 'Create',
    'PUT': 'Update',
    'PATCH': 'Update',
    'DELETE': 'Delete',
    
    // Authentication & User Management
    'POST /api/login/': 'Login',
    'POST /api/forgot-password/': 'Forgot Password',
    'POST /api/logout/': 'Logout',
    'GET /api/token/refresh/': 'Refresh Token',
    'GET /api/get-csrf-token/': 'Get CSRF Token',
    'GET /api/user/profile/': 'View User Profile',
    'PUT /api/user/profile/': 'Update User Profile',
    'POST /api/admin/users/': 'Create User',
    'PUT /api/admin/users/': 'Update User',
    'DELETE /api/admin/users/': 'Delete User',
    'PUT /api/admin/users/disable/': 'Disable User',
    'PUT /api/admin/users/restore/': 'Restore User',
    
    // Mood Tracking
    'POST /api/submit-mood/': 'Submit Mood',
    'GET /api/mood-data/': 'View Mood Data',
    'GET /api/check-mood/': 'Check Mood Status',
    'GET /api/mood/week/': 'View Weekly Mood',
    'POST /api/mood/week/': 'Submit Weekly Mood',
    'GET /api/mood/submit-survey/': 'Submit Mood Survey',
    'POST /api/mood/submit-survey/': 'Submit Mood Survey',
    'GET /api/mood/latest-recommendation/': 'Get Mood Recommendation',
    'POST /api/mood/latest-recommendation/': 'Get Mood Recommendation',
    
    // Dashboards
    'GET /api/admin/dashboard/': 'View Admin Dashboard',
    'GET /api/clinic/dashboard/': 'View Clinic Dashboard',
    'GET /api/counselor/dashboard/': 'View Counselor Dashboard',
    'GET /api/faculty/dashboard/': 'View Faculty Dashboard',
    'GET /api/student/dashboard/': 'View Student Dashboard',
    
    // Wellness Journey
    'POST /api/wellness-journey/daily-tasks/complete/': 'Complete Daily Task',
    'GET /api/wellness-journey/daily-tasks/': 'View Daily Tasks',
    'POST /api/wellness-journey/daily-tasks/': 'Create Daily Task',
    'PUT /api/wellness-journey/daily-tasks/': 'Update Daily Task',
    'DELETE /api/wellness-journey/daily-tasks/': 'Delete Daily Task',
    'GET /api/wellness-journey/achievements/': 'View Achievements',
    'POST /api/wellness-journey/achievements/': 'Create Achievement',
    'PUT /api/wellness-journey/achievements/': 'Update Achievement',
    'DELETE /api/wellness-journey/achievements/': 'Delete Achievement',
    'GET /api/wellness-journey/profile/': 'View Wellness Profile',
    'POST /api/wellness-journey/profile/': 'Create Wellness Profile',
    'PUT /api/wellness-journey/profile/': 'Update Wellness Profile',
    'DELETE /api/wellness-journey/profile/': 'Delete Wellness Profile',
    'GET /api/wellness-journey/weekly-goals/': 'View Weekly Goals',
    'POST /api/wellness-journey/weekly-goals/': 'Create Weekly Goal',
    'PUT /api/wellness-journey/weekly-goals/': 'Update Weekly Goal',
    'DELETE /api/wellness-journey/weekly-goals/': 'Delete Weekly Goal',
    'POST /api/wellness-journey/weekly-goals/progress/': 'Update Weekly Goal Progress',
    
    // Appointments
    'GET /api/appointments/appointments/': 'View Appointments',
    'POST /api/appointments/appointments/': 'Create Appointment',
    'PUT /api/appointments/appointments/': 'Update Appointment',
    'DELETE /api/appointments/appointments/': 'Delete Appointment',
    'POST /api/appointments/appointments/cancel/': 'Cancel Appointment',
    'POST /api/appointments/appointments/mark_in_progress/': 'Mark Appointment In Progress',
    'POST /api/appointments/appointments/mark_completed/': 'Mark Appointment Completed',
    'GET /api/appointments/availability/': 'View Availability',
    'POST /api/appointments/availability/': 'Create Availability',
    'PUT /api/appointments/availability/': 'Update Availability',
    'DELETE /api/appointments/availability/': 'Delete Availability',
    'GET /api/appointments/providers/': 'View Providers',
    'POST /api/appointments/providers/': 'Create Provider',
    'PUT /api/appointments/providers/': 'Update Provider',
    'DELETE /api/appointments/providers/': 'Delete Provider',
    'GET /api/appointments/teachers/': 'View Teachers',
    'POST /api/appointments/teachers/': 'Create Teacher',
    'PUT /api/appointments/teachers/': 'Update Teacher',
    'DELETE /api/appointments/teachers/': 'Delete Teacher',
    'GET /api/appointments/notes/': 'View Appointment Notes',
    'POST /api/appointments/notes/': 'Create Appointment Note',
    'PUT /api/appointments/notes/': 'Update Appointment Note',
    'DELETE /api/appointments/notes/': 'Delete Appointment Note',
    'GET /api/appointments/faculty-dashboard-counts/': 'View Faculty Dashboard Counts',
    
    // Health Records
    'GET /api/health-records/permit-requests/': 'View Permit Requests',
    'POST /api/health-records/permit-requests/': 'Create Permit Request',
    'PUT /api/health-records/permit-requests/': 'Update Permit Request',
    'DELETE /api/health-records/permit-requests/': 'Delete Permit Request',
    'POST /api/health-records/permit-requests/create/': 'Create Health Permit',
    'GET /api/health-records/teachers/': 'View Health Records Teachers',
    'GET /api/health-records/providers/': 'View Health Records Providers',
    'GET /api/health-records/email-webhook/': 'View Email Webhook',
    'GET /api/health-records/general-info/': 'View General Health Info',
    'POST /api/health-records/general-info/': 'Create General Health Info',
    'PUT /api/health-records/general-info/': 'Update General Health Info',
    'PATCH /api/health-records/general-info/': 'Update General Health Info',
    'GET /api/health-records/physical-health/': 'View Physical Health',
    'POST /api/health-records/physical-health/': 'Create Physical Health',
    'PUT /api/health-records/physical-health/': 'Update Physical Health',
    'PATCH /api/health-records/physical-health/': 'Update Physical Health',
    'GET /api/health-records/physical-referral/': 'View Physical Referrals',
    'GET /api/health-records/mental-summary/': 'View Mental Summary',
    'GET /api/health-records/mental-referral/': 'View Mental Referrals',
    'GET /api/health-records/students-with-health-records/': 'View Students With Health Records',
    'GET /api/health-records/student-full-record/': 'View Student Full Record',
    
    // Bulletin
    'GET /api/bulletin/posts/': 'View Bulletin Posts',
    'POST /api/bulletin/posts/': 'Create Bulletin Post',
    'PUT /api/bulletin/posts/': 'Update Bulletin Post',
    'DELETE /api/bulletin/posts/': 'Delete Bulletin Post',
    'POST /api/bulletin/posts/toggle_status/': 'Toggle Bulletin Post Status',
    'GET /api/bulletin/posts/active_posts/': 'View Active Bulletin Posts',
    'POST /api/bulletin/upload-image/': 'Upload Bulletin Image',
    'GET /api/bulletin/ckeditor/': 'View Bulletin Editor',
    
    // Inventory
    'GET /api/inventory/items/': 'View Inventory Items',
    'POST /api/inventory/items/': 'Create Inventory Item',
    'PUT /api/inventory/items/': 'Update Inventory Item',
    'DELETE /api/inventory/items/': 'Delete Inventory Item',
    'GET /api/inventory/logs/': 'View Inventory Logs',
    'POST /api/inventory/logs/': 'Create Inventory Log',
    'PUT /api/inventory/logs/': 'Update Inventory Log',
    'DELETE /api/inventory/logs/': 'Delete Inventory Log',
    
    // System & Settings
    'GET /api/settings/system/': 'View System Settings',
    'POST /api/settings/system/': 'Update System Settings',
    'PUT /api/settings/system/': 'Update System Settings',
    'PATCH /api/settings/system/': 'Update System Settings',
    'GET /api/logs/': 'View System Logs',
    'POST /api/logs/': 'Create System Log',
    
    // Website
    'GET /api/website/users/students/': 'View Student Users',
    'POST /api/website/users/students/': 'Create Student User',
    'PUT /api/website/users/students/': 'Update Student User',
    'DELETE /api/website/users/students/': 'Delete Student User',
    
    // Test & Development
    'GET /api/test-email/': 'Test Email',
    
    // Dashboard Statistics
    'GET /api/monthly-statistics/': 'View Monthly Statistics',
    'GET /api/active-sessions/': 'View Active Sessions',
    
    // Referrals (if implemented)
    'GET /api/referrals/referrals/': 'View Referrals',
    'POST /api/referrals/referrals/': 'Create Referral',
    'PUT /api/referrals/referrals/': 'Update Referral',
    'DELETE /api/referrals/referrals/': 'Delete Referral',
    'GET /api/referrals/referrals/students_for_referral/': 'Search Students For Referral'
  };
  
  return actionMap[action] || action;
};

const convertTargetToHumanReadable = (target) => {
  // Handle dynamic endpoints with IDs
  if (target && typeof target === 'string') {
    // Handle provider available times with ID
    if (target.match(/^\/api\/appointments\/providers\/\d+\/available-times\/$/)) {
      return 'Provider Available Times';
    }
    
    // Handle permit requests with ID
    if (target.match(/^\/api\/health-records\/permit-requests\/\d+\/$/)) {
      return 'Health Permit Request';
    }
    if (target.match(/^\/api\/health-records\/permit-requests\/\d+\/update\/$/)) {
      return 'Update Health Permit';
    }
    if (target.match(/^\/api\/health-records\/permit-requests\/\d+\/clinic-assessment\/$/)) {
      return 'Clinic Assessment';
    }
    if (target.match(/^\/api\/health-records\/permit-requests\/\d+\/parent-response\/$/)) {
      return 'Parent Response';
    }
    
    // Handle appointments with ID
    if (target.match(/^\/api\/appointments\/appointments\/\d+\/$/)) {
      return 'Appointment';
    }
    if (target.match(/^\/api\/appointments\/appointments\/\d+\/cancel\/$/)) {
      return 'Cancel Appointment';
    }
    if (target.match(/^\/api\/appointments\/appointments\/\d+\/mark_in_progress\/$/)) {
      return 'Mark Appointment In Progress';
    }
    if (target.match(/^\/api\/appointments\/appointments\/\d+\/mark_completed\/$/)) {
      return 'Mark Appointment Completed';
    }
    if (target.match(/^\/api\/appointments\/availability\/\d+\/$/)) {
      return 'Appointment Availability';
    }
    if (target.match(/^\/api\/appointments\/notes\/\d+\/$/)) {
      return 'Appointment Note';
    }
    
    // Handle wellness journey with ID
    if (target.match(/^\/api\/wellness-journey\/profile\/\d+\/$/)) {
      return 'Wellness Profile';
    }
    if (target.match(/^\/api\/wellness-journey\/daily-tasks\/\d+\/$/)) {
      return 'Daily Task';
    }
    if (target.match(/^\/api\/wellness-journey\/achievements\/\d+\/$/)) {
      return 'Achievement';
    }
    if (target.match(/^\/api\/wellness-journey\/weekly-goals\/\d+\/$/)) {
      return 'Weekly Goal';
    }
    
    // Handle bulletin with ID
    if (target.match(/^\/api\/bulletin\/\d+\/$/)) {
      return 'Bulletin Post';
    }
    
    // Handle inventory with ID
    if (target.match(/^\/api\/inventory\/items\/\d+\/$/)) {
      return 'Inventory Item';
    }
    if (target.match(/^\/api\/inventory\/logs\/\d+\/$/)) {
      return 'Inventory Log';
    }
    
    // Handle admin users with ID
    if (target.match(/^\/api\/admin\/users\/\d+\/disable\/$/)) {
      return 'Disable User';
    }
    if (target.match(/^\/api\/admin\/users\/\d+\/restore\/$/)) {
      return 'Restore User';
    }
    
    // Handle health records with ID
    if (target.match(/^\/api\/health-records\/general-info\/\d+\/$/)) {
      return 'General Health Info';
    }
    if (target.match(/^\/api\/health-records\/physical-health\/\d+\/$/)) {
      return 'Physical Health';
    }
    if (target.match(/^\/api\/health-records\/student-full-record\/\d+\/$/)) {
      return 'Student Full Record';
    }
  }
  
  const targetMap = {
    // System & Settings
    '/api/settings/system/': 'System Settings',
    '/api/logs/': 'System Logs',
    '/api/test-email/': 'Email Testing',
    '/api/token/refresh/': 'Token Refresh',
    '/api/get-csrf-token/': 'CSRF Token',
    
    // Authentication & User Management
    '/api/login/': 'Login System',
    '/api/forgot-password/': 'Password Recovery',
    '/api/logout/': 'System Logout',
    '/api/user/profile/': 'User Profile',
    '/api/admin/users/': 'User Management',
    
    // Mood Tracking
    '/api/submit-mood/': 'Mood Submission',
    '/api/mood-data/': 'Mood Data',
    '/api/check-mood/': 'Mood Status Check',
    '/api/mood/week/': 'Weekly Mood Data',
    '/api/mood/submit-survey/': 'Submit Mood Survey',
    '/api/mood/latest-recommendation/': 'Latest Mood Recommendation',
    
    // Dashboards
    '/api/admin/dashboard/': 'Admin Dashboard',
    '/api/clinic/dashboard/': 'Clinic Dashboard',
    '/api/counselor/dashboard/': 'Counselor Dashboard',
    '/api/faculty/dashboard/': 'Faculty Dashboard',
    '/api/student/dashboard/': 'Student Dashboard',
    
    // Appointments
    '/api/appointments/appointments/': 'Appointments',
    '/api/appointments/availability/': 'Appointment Availability',
    '/api/appointments/notes/': 'Appointment Notes',
    '/api/appointments/providers/': 'Healthcare Providers',
    '/api/appointments/providers/available-times/': 'Provider Available Times',
    '/api/appointments/teachers/': 'Teachers List',
    '/api/appointments/faculty-dashboard-counts/': 'Faculty Dashboard Counts',
    
    // Health Records
    '/api/health-records/permit-requests/': 'Health Permit Requests',
    '/api/health-records/permit-requests/create/': 'Create Health Permit',
    '/api/health-records/permit-requests/update/': 'Update Health Permit',
    '/api/health-records/permit-requests/clinic-assessment/': 'Clinic Assessment',
    '/api/health-records/permit-requests/parent-response/': 'Parent Response',
    '/api/health-records/email-webhook/': 'Email Webhook',
    '/api/health-records/teachers/': 'Health Records Teachers',
    '/api/health-records/providers/': 'Health Records Providers',
    '/api/health-records/general-info/': 'General Health Info',
    '/api/health-records/physical-health/': 'Physical Health',
    '/api/health-records/physical-referral/': 'Physical Referrals',
    '/api/health-records/mental-summary/': 'Mental Summary',
    '/api/health-records/mental-referral/': 'Mental Referrals',
    '/api/health-records/students-with-health-records/': 'Students With Health Records',
    '/api/health-records/student-full-record/': 'Student Full Record',
    
    // Wellness Journey
    '/api/wellness-journey/achievements/all/': 'Wellness Achievements',
    '/api/wellness-journey/daily-tasks/': 'Daily Wellness Tasks',
    '/api/wellness-journey/profile/my_profile/': 'My Wellness Profile',
    '/api/wellness-journey/daily-tasks/complete/': 'Complete Daily Task',
    '/api/wellness-journey/weekly-goals/': 'Weekly Wellness Goals',
    '/api/wellness-journey/profile/': 'Wellness Profile',
    '/api/wellness-journey/achievements/': 'Wellness Achievements',
    '/api/wellness-journey/weekly-goals/progress/': 'Weekly Goal Progress',
    
    // Bulletin
    '/api/bulletin/': 'Bulletin Posts',
    '/api/bulletin/posts/': 'Bulletin Posts',
    '/api/bulletin/posts/active_posts/': 'Active Bulletin Posts',
    '/api/bulletin/posts/toggle_status/': 'Toggle Bulletin Post Status',
    '/api/bulletin/upload-image/': 'Upload Bulletin Image',
    '/api/bulletin/ckeditor/': 'Bulletin Editor',
    
    // Inventory
    '/api/inventory/items/': 'Inventory Items',
    '/api/inventory/logs/': 'Inventory Logs',
    
    // Website
    '/api/website/users/students/': 'Student Users',
    
    // Dashboard Statistics
    '/api/monthly-statistics/': 'Monthly Statistics',
    '/api/active-sessions/': 'Active Sessions',
    
    // Referrals (if implemented)
    '/api/referrals/referrals/': 'Referrals',
    '/api/referrals/referrals/students_for_referral/': 'Search Students For Referral'
  };
  
  return targetMap[target] || target;
};

// Function to format role display
const formatRoleDisplay = (role) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'faculty': return 'Faculty';
    case 'clinic': return 'Nurse';
    case 'counselor': return 'Counselor';
    case 'student': return 'Student';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [date, setDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    getSystemLogs()
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch logs');
        setLoading(false);
      });
  }, []);

  // Filtered logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesRole = role === 'All' || log.role === role;
    const matchesDate = !date || (log.datetime && log.datetime.startsWith(date));
    return matchesSearch && matchesRole && matchesDate;
  });
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const pagedLogs = getPagedData(filteredLogs, currentPage, logsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center mb-4">
        <div className="d-flex gap-2 align-items-center w-100">
          <div className="position-relative flex-grow-1" style={{ maxWidth: 400 }}>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search user or action..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ height: 40, borderRadius: 8 }}
            />
            <span style={{ position: 'absolute', left: 16, top: 10, color: '#bdbdbd', fontSize: 18 }}>
              <i className="bi bi-search"></i>
            </span>
          </div>
          <div style={{ position: 'relative', width: 160 }}>
            <select
              className="form-select"
              value={role}
              onChange={e => { setRole(e.target.value); setCurrentPage(1); }}
              style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
              <i className="bi bi-chevron-down"></i>
            </span>
          </div>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={e => { setDate(e.target.value); setCurrentPage(1); }}
            style={{ width: 150, borderRadius: 8 }}
          />
          <div className="flex-grow-1" />
          <button className="btn btn-success d-flex align-items-center px-3 ms-auto" style={{ borderRadius: 8 }}>
            <i className="bi bi-download me-2"></i> Export
          </button>
        </div>
      </div>
      <div className="bg-white rounded shadow-sm p-4" style={{ minHeight: 350 }}>
        <div className="table-responsive" style={{ overflow: 'visible' }}>
          <table className="table no-borders align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ border: 'none' }}>Date & Time</th>
                <th style={{ border: 'none' }}>User</th>
                <th style={{ border: 'none' }}>Role</th>
                <th style={{ border: 'none' }}>Action</th>
                <th style={{ border: 'none' }}>Target</th>
                <th style={{ border: 'none' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4" style={{ border: 'none' }}>Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center text-danger py-4" style={{ border: 'none' }}>{error}</td>
                </tr>
              ) : pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4" style={{ border: 'none' }}>No logs found.</td>
                </tr>
              ) : (
                pagedLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td style={{ border: 'none' }}>{log.datetime ? new Date(log.datetime).toLocaleString() : ''}</td>
                    <td style={{ border: 'none' }}>{log.user}</td>
                    <td style={{ border: 'none' }}>{formatRoleDisplay(log.role)}</td>
                    <td style={{ border: 'none' }}>{convertActionToHumanReadable(log.action)}</td>
                    <td style={{ border: 'none' }}>{convertTargetToHumanReadable(log.target)}</td>
                    <td style={{ border: 'none' }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
            <ul className="pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <a className="page-link" href="#" aria-label="Previous" onClick={e => { e.preventDefault(); handlePageChange(currentPage - 1); }}>
                  <span aria-hidden="true">Previous</span>
                </a>
              </li>
              {/* Compact pagination with ellipsis */}
              {totalPages <= 7 ? (
                Array.from({ length: totalPages }, (_, i) => (
                  <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                    <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(i + 1); }}>{i + 1}</a>
                  </li>
                ))
              ) : (
                <>
                  <li className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
                    <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(1); }}>1</a>
                  </li>
                  {currentPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                  {Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
                    .filter(page => page > 1 && page < totalPages)
                    .map(page => (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(page); }}>{page}</a>
                      </li>
                    ))}
                  {currentPage < totalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                  <li className={`page-item ${currentPage === totalPages ? 'active' : ''}`}>
                    <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</a>
                  </li>
                </>
              )}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <a className="page-link" href="#" aria-label="Next" onClick={e => { e.preventDefault(); handlePageChange(currentPage + 1); }}>
                  <span aria-hidden="true">Next</span>
                </a>
              </li>
            </ul>
          </nav>
        )}
        <style>{`
          .pagination .page-item .page-link {
            border-radius: 6px;
            margin: 0 2px;
            color: #198754;
            border: 1px solid #b2e6b2;
            background: #fff;
            transition: background 0.2s, color 0.2s;
          }
          .pagination .page-item.active .page-link {
            background: #198754;
            color: #fff;
            border-color: #198754;
          }
          .pagination .page-item .page-link:hover:not(.active) {
            background: #d4f8d4;
            color: #198754;
          }
          .pagination .page-item.disabled .page-link {
            color: #bdbdbd;
            background: #f8f9fa;
            border-color: #e0e0e0;
            cursor: not-allowed;
          }
        `}</style>
      </div>
      <style jsx global>{`
        .no-borders, .no-borders th, .no-borders td {
          border: none !important;
          box-shadow: none !important;
        }
        .no-borders thead th {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
