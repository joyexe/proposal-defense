export async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch('http://127.0.0.1:8080/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const data = await response.json();
    localStorage.setItem('token', data.access);
    return data.access;
  } catch (error) {
    console.error('Token refresh error:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw error;
  }
}

export async function fetchWithAuth(url, options = {}) {
  // Auto-fix: Always use backend base URL for relative paths
  const BASE_URL = 'http://127.0.0.1:8080';
  if (!url.startsWith('http')) {
    // Remove leading slash if present to avoid double slashes
    url = url.startsWith('/') ? url.slice(1) : url;
    url = `${BASE_URL}/${url}`;
  }
  let token = localStorage.getItem('token');
  const defaultHeaders = {};
  
  // Only set Content-Type for non-FormData requests
  if (!options.body || !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Get CSRF token first if it's a modifying request
  if (options.method && options.method !== 'GET' && !options.ignoreCSRF) {
    try {
      await fetch('http://127.0.0.1:8080/api/get-csrf-token/', {
        credentials: 'include',
      });
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
      
      if (csrfToken) {
        defaultHeaders['X-CSRFToken'] = csrfToken;
      }
    } catch (error) {
      console.error('CSRF token error:', error);
      throw new Error('CSRF token required');
    }
  }

  // Add cache-busting headers for GET requests (but not for CSRF token requests)
  if (!options.method || options.method === 'GET') {
    defaultHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    defaultHeaders['Pragma'] = 'no-cache';
    defaultHeaders['Expires'] = '0';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  // For FormData, don't modify the body - let the browser handle it

  let response = await fetch(url, config);

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401) {
    try {
      const newToken = await refreshToken();
      config.headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, config);
    } catch (error) {
      // Don't redirect to login for every 401 error, just throw the error
      // Components should handle authentication gracefully
      throw new Error('Session expired. Please login again.');
    }
  }

  if (response.status === 403) {
    const errorText = await response.text();
    if (errorText.includes('CSRF')) {
      throw new Error('CSRF verification failed. Please refresh the page.');
    }
    throw new Error('Forbidden - You do not have permission to access this resource');
  }

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || errorData.message || 'Request failed');
    } catch {
      throw new Error(errorText || 'Request failed');
    }
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

// Mood Tracker API functions
export const submitMood = async ({ mood, note }) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/submit-mood/', {
    method: 'POST',
    body: JSON.stringify({ mood, note }),
  });
};

export const checkMoodSubmission = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/check-mood/');
};

export const getMoodData = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  return await fetchWithAuth(`http://127.0.0.1:8080/api/mood-data/?${queryParams}`);
};

export const getStudents = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/website/users/students/');
};

export const getUserProfile = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/user/profile/');
};

// General Information
export const saveGeneralInfo = async (data, id = null) => {
  if (id) {
    // PATCH update
    return await fetchWithAuth(`http://127.0.0.1:8080/api/health-records/general-info/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  } else {
    // POST create
    return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/general-info/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};

export const getGeneralInfo = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/general-info/');
};

// Physical Health
export const savePhysicalHealth = async (data, id = null) => {
  if (id) {
    // PATCH update
    return await fetchWithAuth(`http://127.0.0.1:8080/api/health-records/physical-health/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  } else {
    // POST create
    return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/physical-health/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};

export const getPhysicalHealth = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/physical-health/');
};

// Physical Health Referrals
export const getPhysicalReferrals = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/physical-referral/');
};

// Mental Health
export const getMentalSummary = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/mental-summary/');
};

export const getMentalReferrals = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/mental-referral/');
};

// Appointments
export const getAppointments = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/appointments/');
};

export const createAppointment = async (data) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/appointments/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAppointment = async (id, data) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/appointments/${id}/`, {
    method: 'PATCH',
    body: data,
  });
};

export const deleteAppointment = async (id) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/appointments/${id}/`, {
    method: 'DELETE',
  });
};

export const markAppointmentCompleted = async (id) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/appointments/${id}/mark_completed/`, {
    method: 'POST',
  });
};

export const markAppointmentInProgress = async (id) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/appointments/${id}/mark_in_progress/`, {
    method: 'POST',
  });
};

export const cancelAppointment = async (id) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/appointments/${id}/cancel/`, {
    method: 'POST',
  });
};

// Availability
export const getAvailability = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/availability/');
};

export const updateAvailability = async (id, data) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/availability/${id}/`, {
    method: 'PATCH',
    body: data,
  });
};

export const createAvailability = async (data) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/availability/', {
    method: 'POST',
    body: data,
  });
};

export const deleteAvailability = async (id) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/availability/${id}/`, {
    method: 'DELETE',
  });
};

export const getStudentsWithHealthRecords = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/students-with-health-records/');
};

export const getStudentFullHealthRecord = async (userId) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/health-records/student-full-record/${userId}/`);
};

// Referrals API functions
export const createReferral = async (data) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/referrals/referrals/', {
    method: 'POST',
    body: data,
  });
};

export const searchStudentsForReferral = async (query) => {
  const queryParams = new URLSearchParams({ search: query }).toString();
  return await fetchWithAuth(`http://127.0.0.1:8080/api/referrals/referrals/students_for_referral/?${queryParams}`);
};

// Bulletin API functions
export const createBulletinPost = async (postData) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/bulletin/posts/', {
    method: 'POST',
    body: postData,
  });
};

export const getBulletinPosts = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/bulletin/posts/');
};

export const updateBulletinPost = async (postId, postData) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/bulletin/posts/${postId}/`, {
    method: 'PATCH',
    body: postData,
  });
};

export const toggleBulletinPostStatus = async (postId) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/bulletin/posts/${postId}/toggle_status/`, {
    method: 'POST',
  });
};

export const getActiveBulletinPosts = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/bulletin/posts/active_posts/');
};

export const getSystemLogs = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/logs/');
};

export const getActiveSessions = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/active-sessions/');
};

export const getMonthlyStatistics = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/monthly-statistics/');
};

// System Theme API
export const getSystemTheme = async () => {
  const res = await fetchWithAuth('http://127.0.0.1:8080/api/settings/system/');
  return res.theme;
};

export const setSystemTheme = async (theme) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/settings/system/', {
    method: 'PATCH',
    body: JSON.stringify({ theme }),
  });
};

export const getProviders = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/providers/');
};

export const getTeachers = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/teachers/');
};

export const getProviderAvailableTimes = async (providerId) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/appointments/provider-times/?provider_id=${providerId}`);
};

export const getFacultyDashboardCounts = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/faculty-dashboard-counts/');
};

export const getClinicTodayAppointments = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/clinic-today-appointments/');
};

export const getClinicUpcomingAppointments = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/clinic-upcoming-appointments/');
};

export const getClinicReferralsCount = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/clinic-referrals-count/');
};

export const getCounselorTodayAppointments = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/counselor-today-appointments/');
};

export const getCounselorReferralsCount = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/counselor-referrals-count/');
};

export const getCounselorActiveCases = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/appointments/counselor-active-cases/');
};

export const getRecentActivities = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/health-records/recent-activities/');
};

// Inventory API
export const getInventoryItems = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/inventory/items/');
};

export const addInventoryItem = async (data) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/inventory/items/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateInventoryItem = async (id, data) => {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/inventory/items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const getInventoryLogs = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/inventory/logs/');
};

export const addInventoryLog = async (data) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/inventory/logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Wellness Journey API
export const getWellnessProfile = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/profile/my_profile/');
};

export const getDailyTasks = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/daily-tasks/');
};

export const completeDailyTask = async (id) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/daily-tasks/complete/', {
    method: 'POST',
    body: { id },
  });
};

export const getWeeklyGoals = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/weekly-goals/');
};

export const progressWeeklyGoal = async (id) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/weekly-goals/progress/', {
    method: 'POST',
    body: { id },
  });
};

export const getAchievements = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/wellness-journey/achievements/all/');
};

// Fetch moods for a specific week (Monday to Sunday)
export async function getWeekMoods({ start, end }) {
  return await fetchWithAuth(`http://127.0.0.1:8080/api/mood/week?start=${start}&end=${end}`);
}

export const submitMoodSurvey = async ({ mood_entry_id, answers }) => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/mood/submit-survey/', {
    method: 'POST',
    body: JSON.stringify({ mood_entry_id, answers }),
  });
};

export const getLatestMoodRecommendation = async () => {
  return await fetchWithAuth('http://127.0.0.1:8080/api/mood/latest-recommendation/');
};

// Real-time mood update utility functions
export const dispatchMoodUpdate = (moodData) => {
  const moodUpdateEvent = new CustomEvent('mood-updated', {
    detail: {
      mood: moodData.mood,
      note: moodData.note,
      date: moodData.date || new Date().toISOString().slice(0, 10),
      type: moodData.type || 'mood-submitted',
      recommendation: moodData.recommendation,
      answers: moodData.answers
    }
  });
  window.dispatchEvent(moodUpdateEvent);
};

export const subscribeToMoodUpdates = (callback) => {
  const handleMoodUpdate = (event) => {
    callback(event.detail);
  };
  
  window.addEventListener('mood-updated', handleMoodUpdate);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('mood-updated', handleMoodUpdate);
  };
};

// Permit Request API functions
export const createPermitRequest = async (data) => {
  return await fetchWithAuth('/api/health-records/permit-requests/create/', {
    method: 'POST',
    body: data,
  });
};

export const getPermitRequests = async () => {
  return await fetchWithAuth('/api/health-records/permit-requests/');
};

export const getPermitRequest = async (id) => {
  return await fetchWithAuth(`/api/health-records/permit-requests/${id}/`);
};

export const updatePermitRequest = async (id, data) => {
  return await fetchWithAuth(`/api/health-records/permit-requests/${id}/update/`, {
    method: 'PUT',
    body: data,
  });
};

export const updateClinicAssessment = async (id, data) => {
  return await fetchWithAuth(`/api/health-records/permit-requests/${id}/clinic-assessment/`, {
    method: 'PUT',
    body: data,
  });
};

export const submitParentResponse = async (id, response) => {
  return await fetchWithAuth(`/api/health-records/permit-requests/${id}/parent-response/`, {
    method: 'POST',
    body: { response },
  });
};

// Faculty Notifications API
export const getFacultyNotifications = async () => {
  return await fetchWithAuth('/api/health-records/faculty-notifications/');
};

export const markFacultyNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/health-records/faculty-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Student Notifications API
export const getStudentNotifications = async () => {
  return await fetchWithAuth('/api/health-records/student-notifications/');
};

export const markStudentNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/health-records/student-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Clinic Notifications API
export const getClinicNotifications = async () => {
  return await fetchWithAuth('/api/health-records/clinic-notifications/');
};

export const markClinicNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/health-records/clinic-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Appointment Notifications API
export const getStudentAppointmentNotifications = async () => {
  return await fetchWithAuth('/api/appointments/student-notifications/');
};

export const markStudentAppointmentNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/appointments/student-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getFacultyAppointmentNotifications = async () => {
  return await fetchWithAuth('/api/appointments/faculty-notifications/');
};

export const markFacultyAppointmentNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/appointments/faculty-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getClinicAppointmentNotifications = async () => {
  return await fetchWithAuth('/api/appointments/clinic-notifications/');
};

export const markClinicAppointmentNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/appointments/clinic-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getCounselorAppointmentNotifications = async () => {
  return await fetchWithAuth('/api/appointments/counselor-notifications/');
};

export const markCounselorAppointmentNotificationsRead = async (data = {}) => {
  return await fetchWithAuth('/api/appointments/counselor-notifications/mark-read/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Analytics API functions
export const getPhysicalHealthTrends = async (months = 6) => {
  return await fetchWithAuth(`/api/analytics/physical-health-trends/?months=${months}`);
};

// Export PDF from backend
export const exportPhysicalHealthPDF = async (months = 12) => {
  try {
    const BASE_URL = 'http://127.0.0.1:8080';
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${BASE_URL}/api/analytics/export-physical-health-pdf/?months=${months}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to export PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physical_health_analytics_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return { success: true };
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
};

// Mental Health Analytics API functions
export const detectMentalHealthRealtime = async (studentReason, counselorAssessment) => {
  return await fetchWithAuth('/api/analytics/mental-health/detect/', {
    method: 'POST',
    body: JSON.stringify({ 
      student_reason: studentReason, 
      counselor_assessment: counselorAssessment 
    }),
  });
};

export const saveMentalHealthDiagnosis = async (appointmentId, icd11Code, icd11Name, riskLevel, confidenceScore, interventions) => {
  return await fetchWithAuth('/api/analytics/mental-health/save-diagnosis/', {
    method: 'POST',
    body: JSON.stringify({ 
      appointment_id: appointmentId,
      icd11_code: icd11Code,
      icd11_name: icd11Name,
      risk_level: riskLevel,
      confidence_score: confidenceScore,
      interventions: interventions
    }),
  });
};

export const getMentalHealthTrends = async (months = 6) => {
  const timestamp = Date.now(); // Add cache-busting parameter
  return await fetchWithAuth(`/api/analytics/mental-health/trends/?months=${months}&_t=${timestamp}`);
};

export const getRiskLevelDistribution = async (months = 6) => {
  return await fetchWithAuth(`/api/analytics/mental-health/risk-distribution/?months=${months}`);
};

export const getMentalHealthAlertsAnalytics = async (months = 6) => {
  return await fetchWithAuth(`/api/analytics/mental-health/alerts/?months=${months}`);
};

export const getChatbotMentalHealthAnalytics = async (months = 6) => {
  return await fetchWithAuth(`/api/analytics/counselor/chatbot-engagement/?months=${months}`);
};

export const getMentalHealthAnalyticsSummary = async () => {
  return await fetchWithAuth('/api/analytics/mental-health/summary/');
};

export const getFlaggedKeywords = async (months = 12) => {
  return await fetchWithAuth(`/api/analytics/counselor/flagged-keywords/?months=${months}`);
};

export const generateCounselorPDFReport = async (timeRange = 6) => {
  // Use a separate function for file downloads that returns the raw response
  const BASE_URL = 'http://127.0.0.1:8080';
  const url = `${BASE_URL}/api/analytics/counselor/generate-pdf-report/`;
  
  let token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Get CSRF token
  try {
    await fetch('http://127.0.0.1:8080/api/get-csrf-token/', {
      credentials: 'include',
    });
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  } catch (error) {
    console.error('CSRF token error:', error);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ time_range: timeRange }),
    credentials: 'include',
  });

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401) {
    try {
      const newToken = await refreshToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ time_range: timeRange }),
        credentials: 'include',
      });
      return retryResponse;
    } catch (error) {
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};

// Chatbot API functions
export const startChatbotConversation = async (conversationType = 'general', sessionId = null) => {
  return await fetchWithAuth('/api/chatbot/start-conversation/', {
    method: 'POST',
    body: { conversation_type: conversationType, session_id: sessionId },
  });
};

export const logChatbotMessage = async (conversationId, content, sender = 'user') => {
  return await fetchWithAuth('/api/chatbot/log-message/', {
    method: 'POST',
    body: { conversation_id: conversationId, content, sender },
  });
};

export const endChatbotConversation = async (conversationId) => {
  return await fetchWithAuth('/api/chatbot/end-conversation/', {
    method: 'POST',
    body: { conversation_id: conversationId },
  });
};

export const handleOpenUpConversation = async (conversationId, message, step = 'open_up') => {
  return await fetchWithAuth('/api/chatbot/open-up-conversation/', {
    method: 'POST',
    body: { conversation_id: conversationId, message, step },
  });
};

export const handleChatWithMeConversation = async (conversationId, message, step = 'greeting') => {
  return await fetchWithAuth('/api/chatbot/chat-with-me/', {
    method: 'POST',
    body: { conversation_id: conversationId, message, step },
  });
};

export const getMentalHealthAlerts = async (status = 'active') => {
  return await fetchWithAuth(`/api/chatbot/alerts/?status=${status}`);
};

export const resolveAlert = async (alertId, notes = '') => {
  return await fetchWithAuth(`/api/chatbot/alerts/${alertId}/resolve/`, {
    method: 'POST',
    body: { notes },
  });
};

export const assignAlert = async (alertId, counselorId = null) => {
  return await fetchWithAuth(`/api/chatbot/alerts/${alertId}/assign/`, {
    method: 'POST',
    body: { counselor_id: counselorId },
  });
};

// ICD-11 API functions
export const detectICD11Conditions = async (text, sourceType = 'combined') => {
  return await fetchWithAuth('/api/analytics/icd/detect/', {
    method: 'POST',
    body: JSON.stringify({ text, source_type: sourceType }),
  });
};

// Real-time ICD-11 detection for frontend modals
export const detectICD11Realtime = async (studentReason, nurseDocumentation, vitalSigns = {}, sourceType = 'combined') => {
  return await fetchWithAuth('/api/analytics/icd/detect-realtime/', {
    method: 'POST',
    body: JSON.stringify({ 
      student_reason: studentReason, 
      nurse_documentation: nurseDocumentation, 
      vital_signs: vitalSigns, 
      source_type: sourceType 
    }),
  });
};

// Search ICD-11 codes
export const searchICD11Codes = async (query) => {
  return await fetchWithAuth('/api/analytics/icd/search/', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
};

// Update appointment documentation with ICD-11
export const updateAppointmentDocumentation = async (appointmentId, documentation, diagnosisCode = '', diagnosisName = '') => {
  return await fetchWithAuth(`/api/analytics/appointments/${appointmentId}/documentation/`, {
    method: 'POST',
    body: JSON.stringify({ 
      documentation, 
      diagnosis_code: diagnosisCode, 
      diagnosis_name: diagnosisName 
    }),
  });
};

// Update counselor appointment documentation with ICD-11
export const updateCounselorAppointmentDocumentation = async (appointmentId, documentation, diagnosisCode = '', diagnosisName = '') => {
  return await fetchWithAuth(`/api/analytics/counselor/appointments/${appointmentId}/documentation/`, {
    method: 'POST',
    body: JSON.stringify({ 
      documentation, 
      diagnosis_code: diagnosisCode, 
      diagnosis_name: diagnosisName 
    }),
  });
};

// Update health record assessment with ICD-11
export const updateHealthRecordAssessment = async (permitId, assessmentData) => {
  return await fetchWithAuth(`/api/analytics/health-records/${permitId}/assessment/`, {
    method: 'POST',
    body: JSON.stringify(assessmentData),
  });
};

export const getICD11Entity = async (entityId) => {
  return await fetchWithAuth(`/api/analytics/icd11/entity/${entityId}/`);
};

export const getICD11Status = async () => {
  return await fetchWithAuth('/api/analytics/icd11-system-status/');
};

export const refreshICD11Cache = async (limit = 50, force = false) => {
  return await fetchWithAuth('/api/analytics/icd11/refresh/', {
    method: 'POST',
    body: JSON.stringify({ limit, force }),
  });
};

export const searchICD11Entities = async (query, limit = 10) => {
  const queryParams = new URLSearchParams({ q: query, limit }).toString();
  return await fetchWithAuth(`/api/analytics/icd11/search/?${queryParams}`);
};

export const cleanupICD11Cache = async (daysOld = 30) => {
  return await fetchWithAuth('/api/analytics/icd11/cleanup/', {
    method: 'DELETE',
    body: JSON.stringify({ days_old: daysOld }),
  });
};

export const getICD11Stats = async () => {
  return await fetchWithAuth('/api/analytics/icd11/stats/');
};

// Test backend connectivity
export const testICD11Backend = async () => {
  return await fetchWithAuth('/api/analytics/test-backend/');
};

// Generate unified admin PDF report (combines all analytics sections)
export const generateUnifiedAdminPDFReport = async (timeRange = 12) => {
  try {
    const BASE_URL = 'http://127.0.0.1:8080';
    const url = `${BASE_URL}/api/analytics/admin/generate-unified-pdf-report/`;
    
    const response = await fetch(`${url}?months=${timeRange}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF generation failed:', response.status, errorText);
      throw new Error(errorText || 'Failed to generate unified PDF report');
    }

    // Check if response is a PDF file
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response; // Return the response object for blob handling
    } else {
      // Handle JSON error response
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate unified PDF report');
    }
  } catch (error) {
    console.error('Error generating unified PDF report:', error);
    throw new Error('Failed to generate unified PDF report. Please try again.');
  }
};