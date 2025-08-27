"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, getSystemLogs, fetchWithAuth, getActiveSessions, getMonthlyStatistics } from "../../utils/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recentUsers, setRecentUsers] = useState([]);
  const [activityBatch, setActivityBatch] = useState(0);
  const activityBatchSize = 3;
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeSessions: 0,
    alertFlags: 0,
    incidentReports: 0,
    userGrowth: 0,
    incidentChangePercentage: 0,
    userStatistics: []
  });

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

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - logTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Function to refresh recent activity
  const refreshRecentActivity = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to calculate user statistics from users data
  const calculateUserStatistics = (users) => {
    const roleCounts = {
      'student': 0,
      'faculty': 0,
      'clinic': 0,
      'counselor': 0,
      'admin': 0
    };

    users.forEach(user => {
      if (user.role && roleCounts.hasOwnProperty(user.role)) {
        roleCounts[user.role]++;
      }
    });

    return [
      { role: "Students", count: roleCounts.student },
      { role: "Faculty", count: roleCounts.faculty },
      { role: "Nurses", count: roleCounts.clinic },
      { role: "Counselors", count: roleCounts.counselor },
      { role: "Admins", count: roleCounts.admin }
    ];
  };

  // Expose refresh function globally for other components to use
  if (typeof window !== 'undefined') {
    window.refreshAdminDashboardActivity = refreshRecentActivity;
  }

  // Function to process system logs for recent activity
  const processSystemLogs = async (logs, currentUserId, recentUsersList) => {
    
    const userActivities = logs.filter(log => {
      // Filter for successful Save Changes from Add User and Edit User modals
      const isUserCreation = log.action === 'POST' && (log.target === '/api/admin/users/' || log.target === '/api/admin/users');
      const isUserUpdate = log.action === 'PUT' && (log.target === '/api/admin/users/' || log.target === '/api/admin/users');
      
      // Also check for the actual logged format we see in the UI
      const isCreatedUser = log.action === 'Created User';
      const isUpdatedUser = log.action === 'Updated User';
      
      // Only show successful Save Changes activities (no failed attempts)
      const isSuccessfulSave = isUserCreation || isUserUpdate || isCreatedUser || isUpdatedUser;
      
      // Only show activities from the last 7 days (1 week)
      const logDate = new Date(log.datetime);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const isWithinLastWeek = logDate >= oneWeekAgo;
      
      return isSuccessfulSave && isWithinLastWeek;
    });

    // If no user management activities found, show empty state
    if (userActivities.length === 0) {
      return [];
    }
    
    // Process activities with async operations
    const processedActivities = [];
    
    for (const log of userActivities) {
      const isCreation = log.action === 'POST' || log.action === 'Created User';
      const isUpdate = log.action === 'PUT' || log.action === 'Updated User';
      
      // Try to extract role from different possible locations
      let role = 'user';
      
      // Try to find the role from recent users list based on timestamp
      const logTime = new Date(log.datetime);
      
      const recentUser = recentUsersList.find(user => {
        const userTime = new Date(user.created_at || user.timestamp || user.date_joined);
        const timeDiff = Math.abs(logTime - userTime);
        // If the times are within 10 minutes, consider it a match
        return timeDiff < 10 * 60 * 1000;
      });
      
      if (recentUser && recentUser.role) {
        role = recentUser.role;
      } else {
        // Fallback: Get the most recent user's role if this is a creation log
        if (log.action === 'Created User' && recentUsersList.length > 0) {
          const mostRecentUser = recentUsersList[0]; // Assuming the list is sorted by creation time
          if (mostRecentUser && mostRecentUser.role) {
            role = mostRecentUser.role;
          }
        } else {
          // Fallback to parsing from log details
          if (log.details && typeof log.details === 'string') {
            try {
              const detailsObj = JSON.parse(log.details);
              if (detailsObj.role) {
                role = detailsObj.role;
              }
            } catch (e) {
              if (log.details.includes('role')) {
                const roleMatch = log.details.match(/role["\s]*:["\s]*["']([^"']+)["']/);
                if (roleMatch) {
                  role = roleMatch[1];
                }
              }
            }
          } else if (log.details?.role) {
            role = log.details.role;
          }
        }
      }
      
      const formattedRole = formatRoleDisplay(role);
      
      // Get the admin's full name by looking up the user in recent users list
      let adminFullName = 'admin';
      
      // Try to find the admin user in the recent users list (fast lookup)
      const adminUser = recentUsersList.find(user => user.username === log.user);
      
      if (adminUser && adminUser.full_name) {
        adminFullName = adminUser.full_name;
      } else {
        // Fallback to username if full name not found (no API call for speed)
        adminFullName = log.user || 'admin';
      }
      
      processedActivities.push({
        id: log.id,
        icon: isCreation ? "user" : "edit",
        iconClass: isCreation ? "bi bi-person" : "bi bi-pencil",
        title: isCreation ? "New user registered" : "Update user registered",
        description: isCreation ? `${formattedRole} account created by Admin ${adminFullName}` : `${formattedRole} account updated by Admin ${adminFullName}`,
        timestamp: formatTimestamp(log.datetime)
      });
    }
    
    return processedActivities;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const profile = await getUserProfile();
        setUserProfile(profile);
        
        // Fetch system logs for recent activity
        const logs = await getSystemLogs();
        
        // Fetch active sessions count
        let activeSessions = 0;
        try {
          const activeSessionsResponse = await getActiveSessions();
          activeSessions = activeSessionsResponse.active_sessions || 0;
        } catch (error) {
          console.error('Error fetching active sessions:', error);
        }
        
        // Fetch monthly statistics
        let monthlyStats = { user_growth: 0, incident_change_percentage: 0 };
        try {
          const monthlyStatsResponse = await getMonthlyStatistics();
          monthlyStats = monthlyStatsResponse;
        } catch (error) {
          console.error('Error fetching monthly statistics:', error);
        }
        
        // Fetch all users to get role information (increased page size to get more users)
        let recentUsersList = [];
        try {
          const usersResponse = await fetchWithAuth('http://127.0.0.1:8080/api/admin/users/?page=1&page_size=50');
          recentUsersList = Array.isArray(usersResponse.results) ? usersResponse.results : [];
          setRecentUsers(recentUsersList);
          
          // Calculate real user statistics
          const userStatistics = calculateUserStatistics(recentUsersList);
          const totalUsers = recentUsersList.length;
          
          // Update dashboard data with real statistics
          setDashboardData(prev => ({
            ...prev,
            totalUsers: totalUsers,
            activeSessions: activeSessions,
            userGrowth: monthlyStats.user_growth || 0,
            incidentChangePercentage: monthlyStats.incident_change_percentage || 0,
            userStatistics: userStatistics
          }));
        } catch (error) {
          console.error('Error fetching recent users:', error);
        }
        
        const activities = await processSystemLogs(logs, profile.id, recentUsersList);
        setRecentActivity(activities);
        
        // Reset to first batch when activities change
        setActivityBatch(0);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to empty activities if logs fail to load
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, refreshTrigger]);

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Section with Welcome */}
      <div className="row mb-4">
        <div className="col-12">
          <div>
            <h2 className="fw-bold mb-1" style={{ fontSize: "1.8rem", color: "#171717" }}>
              Welcome, Admin {userProfile?.full_name || ""}!
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "1rem" }}>
              Manage system and view insights.
            </p>
          </div>
        </div>
      </div>

      {/* Data Summary Cards */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Users</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardData.totalUsers.toLocaleString()}</div>
            <div className="text-success small mt-1">
              {dashboardData.userGrowth > 0 ? '+' : ''}{dashboardData.userGrowth} from last month
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Active Sessions</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardData.activeSessions.toLocaleString()}</div>
            <div className="text-secondary small mt-1">Current users online</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Alert Flags</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardData.alertFlags}</div>
            <div className="text-danger small mt-1">Requires Attention</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Incident Report</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardData.incidentReports}</div>
            <div className="text-secondary small mt-1">
              {dashboardData.incidentChangePercentage > 0 ? '+' : ''}{dashboardData.incidentChangePercentage}% from last month
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="row">
        {/* Recent Activity Card */}
        <div className="col-md-6 mb-4">
          <div className="card" style={{ 
            backgroundColor: "#fff", 
            borderRadius: "12px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef"
          }}>
            <div className="card-body px-4 pt-4 pb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: "#171717" }}>
                    Recent Activity
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                    Latest System Events
                  </p>
                </div>
              </div>

              <div className="mb-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.slice(activityBatch * activityBatchSize, (activityBatch + 1) * activityBatchSize).map((activity) => (
                                                        <div key={activity.id} className="d-flex align-items-start mb-3">
                     <div className="me-3" style={{ fontSize: "1.2rem", color: "#6c757d" }}>
                       <i className={activity.iconClass}></i>
                     </div>
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-1" style={{ fontSize: "0.9rem", color: "#171717" }}>
                        {activity.title}
                      </h6>
                      <p className="text-muted mb-1" style={{ fontSize: "0.8rem" }}>
                        {activity.description}
                      </p>
                      <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {activity.timestamp}
                      </small>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted">
                    No recent activities
                  </div>
                )}
              </div>

              <div className="text-center">
                <button 
                  className="btn w-100 mt-2"
                  style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                  onClick={() => setActivityBatch(b => b + 1)}
                  disabled={((activityBatch + 1) * activityBatchSize) >= recentActivity.length}
                >
                  View More Logs
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics Card */}
        <div className="col-md-6 mb-4">
          <div className="card" style={{ 
            backgroundColor: "#fff", 
            borderRadius: "12px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef"
          }}>
            <div className="card-body px-4 pt-4 pb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: "#171717" }}>
                    User Statistics
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                    Distribution of users across roles
                  </p>
                </div>
              </div>

              <div className="mb-4">
                {dashboardData.userStatistics.map((stat, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-semibold" style={{ fontSize: "1.1rem", color: "#171717" }}>
                      {stat.role}
                    </span>
                    <span className="fw-normal" style={{ fontSize: "1.1rem", color: "#171717" }}>
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button 
                  className="btn btn-success px-4 py-2 fw-semibold" 
                  style={{ 
                  borderRadius: 10,
                  background: '#43c463',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 15
                  }}
                  onClick={() => router.push('/admin/users')}
                >
                  <i className="bi bi-person-plus me-2"></i>
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
