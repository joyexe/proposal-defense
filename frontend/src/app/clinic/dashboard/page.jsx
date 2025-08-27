"use client";
import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaExclamationCircle, FaFileAlt, FaUserMd } from 'react-icons/fa';
import { getUserProfile, getClinicTodayAppointments, getClinicUpcomingAppointments, getClinicReferralsCount, getRecentActivities, updateAppointment, markAppointmentCompleted, markAppointmentInProgress, cancelAppointment, getAppointments, detectICD11Realtime, updateAppointmentDocumentation } from "../../utils/api";
import { useRouter } from "next/navigation";

export default function ClinicDashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appointmentBatch, setAppointmentBatch] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayVisits: 0,
    pendingVisits: 0,
    activeCases: 0,
    referralsSent: 0
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDiagnosisOptions, setShowDiagnosisOptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestedDiagnoses, setSuggestedDiagnoses] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityBatch, setActivityBatch] = useState(0);
  const batchSize = 4;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profile, todayAppointments, upcomingAppointments, referralsData, activitiesData] = await Promise.all([
          getUserProfile(),
          getClinicTodayAppointments(),
          getClinicUpcomingAppointments(),
          getClinicReferralsCount(),
          getRecentActivities()
        ]);
        setUserProfile(profile);
        
        // Sort appointments: upcoming first, then in_progress, both sorted by time
        const sortedAppointments = todayAppointments.sort((a, b) => {
          // First sort by status: upcoming comes before in_progress
          if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
          if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
          
          // If same status, sort by time (earliest first)
          const timeA = new Date(`2000-01-01T${a.time}`);
          const timeB = new Date(`2000-01-01T${b.time}`);
          return timeA - timeB;
        });
        

        setAppointments(sortedAppointments);
        
        // Calculate stats from appointments
        const todayVisits = todayAppointments.length;
        const todayUpcoming = todayAppointments.filter(apt => apt.status === 'upcoming').length;
        const todayInProgress = todayAppointments.filter(apt => apt.status === 'in_progress').length;
        const pendingVisits = upcomingAppointments.length; // Use ALL upcoming appointments count
        const activeCases = todayAppointments.filter(apt => apt.status === 'in_progress').length;
        
        setStats({
          todayVisits,
          todayUpcoming,
          todayInProgress,
          pendingVisits,
          activeCases,
          referralsSent: referralsData.referrals_count || 0
        });
        
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to format time to 12-hour format
  function to12Hour(time) {
    if (!time) return '';
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  // Helper function to get status badge
  function getStatusBadge(status) {
    if (!status) return <span>-</span>;
    const styleBase = {
      borderRadius: 12,
      padding: "2px 12px",
      fontSize: 14,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      border: undefined,
      background: undefined,
      color: undefined,
    };
    if (status.toLowerCase() === "upcoming") {
      return <span style={{ ...styleBase, background: '#fff', color: '#14b8a6', border: '1.5px solid #14b8a6' }}>Upcoming</span>;
    }
    if (status.toLowerCase() === "completed") {
      return <span style={{ ...styleBase, color: '#16a34a', border: '1.5px solid #16a34a', background: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>✓</span> Completed
      </span>;
    }
    if (status.toLowerCase() === "cancelled") {
      return <span style={{ ...styleBase, background: "#fde8e8", color: "#e11d48", border: "1.5px solid #e11d48" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>✗</span> Cancelled
      </span>;
    }
    if (status.toLowerCase() === "in_progress" || status.toLowerCase() === "in progress") {
      return <span style={{ ...styleBase, background: "#dbeafe", color: "#2563eb", border: "1.5px solid #2563eb" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>•</span> In Progress
      </span>;
    }
    return <span style={styleBase}>{status}</span>;
  }

  // Mock appointments removed - now using real data from API

  // Helper function to get activity icon based on activity type
  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'appointment_completed':
      case 'appointment_in_progress':
      case 'appointment_cancelled':
        return <FaCalendarAlt className="text-success" />;
      case 'permit_back_to_class':
      case 'permit_send_home':
        return <FaFileAlt className="text-primary" />;
      default:
        return <FaFileAlt className="text-primary" />;
    }
  };

  const handleSaveDocumentation = async () => {
    if (!additionalNotes.trim()) {
      alert('Please enter documentation before saving.');
      return;
    }

    try {
      const response = await updateAppointmentDocumentation(
        selectedAppointment.id,
        additionalNotes,
        selectedDiagnosis?.code || '',
        selectedDiagnosis?.name || ''
      );

      // The response is already parsed JSON from fetchWithAuth
      if (response && response.status === 'success') {
        setShowAddNotesModal(false);
        setAdditionalNotes('');
        setSelectedDiagnosis(null);
        setShowDiagnosisOptions(true);
        // Keep the appointment details modal open and refresh the selected appointment data
        try {
          const updatedTodayAppointments = await getClinicTodayAppointments();

          
          // Sort appointments: upcoming first, then in_progress, both sorted by time
          const sortedAppointments = updatedTodayAppointments.sort((a, b) => {
            // First sort by status: upcoming comes before in_progress
            if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
            if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
            
            // If same status, sort by time (earliest first)
            const timeA = new Date(`2000-01-01T${a.time}`);
            const timeB = new Date(`2000-01-01T${b.time}`);
            return timeA - timeB;
          });
          
          setAppointments(sortedAppointments);
          
          // Update the selected appointment with fresh data
          const updatedAppointment = sortedAppointments.find(apt => apt.id === selectedAppointment.id);
          if (updatedAppointment) {
            setSelectedAppointment(updatedAppointment);
          }
        } catch (error) {
          console.error('Error refreshing appointments:', error);
        }
      } else {
        alert('Failed to save documentation. Please try again.');
      }
    } catch (error) {
      console.error('Error saving documentation:', error);
      alert('An error occurred while saving documentation.');
    }
  };

  const handleDiagnosisSelect = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDiagnosisOptions(false);
  };

  const handleChangeDiagnosis = () => {
    setShowDiagnosisOptions(true);
    setSelectedDiagnosis(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Mock search results - in real implementation, this would call an API
      const mockResults = [
        { code: '4A84.Z', name: 'Allergy, unspecified', confidence: '95%' },
        { code: 'CA23.0', name: 'Allergic asthma', confidence: '88%' },
        { code: 'NE61', name: 'Food allergy', confidence: '76%' },
        { code: '4A85.Z', name: 'Drug allergy', confidence: '82%' },
        { code: '4A86.Z', name: 'Environmental allergy', confidence: '79%' }
      ].filter(item => 
        item.code.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(mockResults);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchResultSelect = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDiagnosisOptions(false);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCloseModal = () => {
    setShowAddNotesModal(false);
    setAdditionalNotes('');
    setSelectedDiagnosis(null);
    setShowDiagnosisOptions(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSuggestedDiagnoses([]);
    setIsDetecting(false);
  };

  // Detect ICD-11 conditions based on patient reason and clinical assessment
  const detectICD11Conditions = async () => {
    if (!selectedAppointment) return;
    
    setIsDetecting(true);
    try {
      const studentReason = selectedAppointment.reason || '';
      const nurseDocumentation = additionalNotes || '';
      
      // Prepare vital signs for detection (empty for dashboard since we don't have vital signs)
      const vitalSignsData = {};
      
      const response = await detectICD11Realtime(
        studentReason, 
        nurseDocumentation, 
        vitalSignsData,
        'dashboard'
      );
      
      // Check if response is already a data object (not a fetch Response)
      if (response && typeof response === 'object' && response.suggested_diagnoses) {
        // Response is already parsed data with suggested_diagnoses
        setSuggestedDiagnoses(response.suggested_diagnoses);
      } else if (response && response.status >= 200 && response.status < 300) {
        // Response is a fetch Response object
        const data = await response.json();
        
        if (data && data.suggested_diagnoses) {
          setSuggestedDiagnoses(data.suggested_diagnoses);
        } else {
          useFallbackSuggestions(studentReason);
        }
      } else {
        console.error('Dashboard API failed with status:', response?.status);
        useFallbackSuggestions(studentReason);
      }
    } catch (error) {
      console.error('Error detecting ICD-11 conditions:', error);
      const studentReason = selectedAppointment.reason || '';
      useFallbackSuggestions(studentReason);
    } finally {
      setIsDetecting(false);
    }
  };

  const useFallbackSuggestions = (studentReason) => {
    if (studentReason.toLowerCase().includes('tiyan') || studentReason.toLowerCase().includes('stomach')) {
      setSuggestedDiagnoses([
        { code: 'DA92.0', name: 'Abdominal pain', confidence: '95%' },
        { code: 'DA32.0', name: 'Functional dyspepsia', confidence: '88%' },
        { code: 'MD90.1', name: 'Nausea', confidence: '76%' }
      ]);
    } else if (studentReason.toLowerCase().includes('lagnat') || studentReason.toLowerCase().includes('fever')) {
      setSuggestedDiagnoses([
        { code: 'MD90.0', name: 'Fever', confidence: '95%' },
        { code: 'CA00.0', name: 'Acute upper respiratory infection', confidence: '88%' },
        { code: '1E32.0', name: 'Influenza due to unidentified influenza virus', confidence: '76%' }
      ]);
    } else if (studentReason.toLowerCase().includes('ulo') || studentReason.toLowerCase().includes('headache')) {
      setSuggestedDiagnoses([
        { code: '8A80.0', name: 'Headache', confidence: '95%' },
        { code: '8A80.1', name: 'Migraine', confidence: '88%' },
        { code: '8A80.2', name: 'Dizziness', confidence: '76%' }
      ]);
    } else {
      setSuggestedDiagnoses([
        { code: 'QA00.0', name: 'General medical examination', confidence: '50%' },
        { code: 'MD90.6', name: 'General symptoms', confidence: '45%' },
        { code: 'QA00.1', name: 'Prophylactic measure', confidence: '40%' }
      ]);
    }
  };

  // Detect conditions when modal opens
  useEffect(() => {
    if (showAddNotesModal && selectedAppointment) {
      detectICD11Conditions();
    }
  }, [showAddNotesModal, selectedAppointment]);

  // Detect conditions when clinical assessment changes
  useEffect(() => {
    if (showAddNotesModal && selectedAppointment && additionalNotes) {
      const timeoutId = setTimeout(() => {
        detectICD11Conditions();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [additionalNotes]);

  // Function to fetch full appointment data when modal opens
  const handleViewAppointment = async (appointment) => {
    try {
      // Fetch all appointments to get the full data including client email
      const allAppointments = await getAppointments();
      const fullAppointment = allAppointments.find(apt => apt.id === appointment.id);
      if (fullAppointment) {
        setSelectedAppointment(fullAppointment);
      } else {
        setSelectedAppointment(appointment);
      }
    } catch (err) {
      console.error('Error fetching full appointment data:', err);
      setSelectedAppointment(appointment);
    }
  };

  // Function to open Add Documentation modal with existing data if available
  const handleOpenAddDocumentation = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAddNotesModal(true);
    
    // Populate form with existing data if available
    if (appointment.documentation) {
      setAdditionalNotes(appointment.documentation);
    } else {
      setAdditionalNotes('');
    }
    
    if (appointment.diagnosis_code && appointment.diagnosis_name) {
      setSelectedDiagnosis({
        code: appointment.diagnosis_code,
        name: appointment.diagnosis_name
      });
      setShowDiagnosisOptions(false);
    } else {
      setSelectedDiagnosis(null);
      setShowDiagnosisOptions(true);
    }
  };

  const handleStatusUpdate = async (action) => {
    if (!selectedAppointment) return;
    try {
      if (action === 'completed') {
        await markAppointmentCompleted(selectedAppointment.id);
      } else if (action === 'in_progress') {
        await markAppointmentInProgress(selectedAppointment.id);
      } else if (action === 'cancelled') {
        await cancelAppointment(selectedAppointment.id);
      }
      // Refresh appointments and update stats in real-time
      const todayAppointments = await getClinicTodayAppointments();
      
      // Sort appointments: upcoming first, then in_progress, both sorted by time
      const sortedAppointments = todayAppointments.sort((a, b) => {
        // First sort by status: upcoming comes before in_progress
        if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
        if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
        
        // If same status, sort by time (earliest first)
        const timeA = new Date(`2000-01-01T${a.time}`);
        const timeB = new Date(`2000-01-01T${b.time}`);
        return timeA - timeB;
      });
      
      setAppointments(sortedAppointments);
      
      // Update stats in real-time
      const todayVisits = todayAppointments.length;
      const pendingVisits = todayAppointments.filter(apt => apt.status === 'upcoming').length;
      const activeCases = todayAppointments.filter(apt => apt.status === 'in_progress').length;
      
      // Refresh referrals count and activities
      const [referralsData, activitiesData] = await Promise.all([
        getClinicReferralsCount(),
        getRecentActivities()
      ]);
      
      setStats({
        todayVisits,
        pendingVisits,
        activeCases,
        referralsSent: referralsData.referrals_count || 0
      });
      
      setActivities(activitiesData);
      
      // Close modal
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to update status. Please try again.');
    }
  };

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Section with Welcome */}
      <div className="row mb-4">
        <div className="col-12">
          <div>
            <h2 className="fw-bold mb-1" style={{ fontSize: "1.8rem", color: "#171717" }}>
              Welcome, Nurse {userProfile?.full_name || ""}!
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "1rem" }}>
              Physical health monitoring and care.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Today's Visit</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.todayVisits}</div>
            <div className="text-secondary small mt-1">{stats.todayUpcoming} upcoming, {stats.todayInProgress} in progress</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Pending Visits</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.pendingVisits}</div>
            <div className="text-secondary small mt-1">Requires Documentation</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Active Cases</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.activeCases}</div>
            <div className="text-secondary small mt-1">Today's ongoing treatment</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Referrals Sent</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.referralsSent}</div>
            <div className="text-secondary small mt-1">Require attention</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="row g-4">
        {/* Today's Appointment Section */}
        <div className="col-lg-6">
          <div className="shadow-sm" style={{ borderRadius: 16, background: "#e6f7ec", border: '2px solid #a8e6cf' }}>
            <div className="p-4">
              <div className="fw-bold fs-5 mb-2">Today's Appointment</div>
              
              <div className="d-flex flex-column gap-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status" style={{ color: '#43c463' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No appointments scheduled for today</p>
                  </div>
                ) : (
                  appointments.slice(appointmentBatch * batchSize, (appointmentBatch + 1) * batchSize).map((appointment, index) => (
                    <div key={appointment.id || index} className="d-flex align-items-center p-3" style={{ borderRadius: 12, position: 'relative' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#43c463', marginRight: 18, flexShrink: 0 }} />
                    
                    {/* First Column - Patient Name and Reason */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold" style={{ color: '#222', fontSize: 17, marginBottom: 2 }}>
                        {appointment.client?.full_name || appointment.name || 'Unknown Patient'}
                      </div>
                      <div className="text-muted" style={{ fontSize: 14 }}>
                        {appointment.role || 'No details available'}
                      </div>
                    </div>
                    
                      {/* Second Column - Time and Created Time */}
                    <div className="text-center" style={{ minWidth: 120 }}>
                      <div className="text-muted" style={{ fontSize: 15 }}>{appointment.time}</div>
                        <div className="text-muted" style={{ fontSize: 13 }}>{appointment.created_time}</div>
                    </div>
                    
                    {/* Third Column - View Button */}
                    <div className="ms-3">
                      <button className="btn btn-sm" 
                              style={{ 
                                background: '#43c463', 
                                color: 'white', 
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 12px',
                                fontSize: '0.8rem'
                                }}
                                onClick={() => handleViewAppointment(appointment)}>
                        View
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
              
              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setAppointmentBatch(b => b + 1)}
                disabled={((appointmentBatch + 1) * batchSize) >= appointments.length}
              >
                View More Appointments
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="col-lg-6">
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
                    Latest clinic interactions
                  </p>
                </div>
              </div>

                            <div className="mb-4">
                {activities.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No recent activities</p>
                  </div>
                ) : (
                  activities.slice(activityBatch * batchSize, (activityBatch + 1) * batchSize).map((activity, index) => (
                    <div key={activity.id || index} className="d-flex align-items-start mb-3">
                      <div className="me-3" style={{ fontSize: "1.2rem", color: "#6c757d" }}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-1" style={{ fontSize: "0.9rem", color: "#171717" }}>
                          {activity.title}
                        </h6>
                        <p className="text-muted mb-1" style={{ fontSize: "0.8rem" }}>
                          {activity.description}
                        </p>
                        <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {activity.time}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {activities.length >= batchSize && (
                <button
                  className="btn w-100 mt-2"
                  style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                  onClick={() => setActivityBatch(b => b + 1)}
                  disabled={((activityBatch + 1) * batchSize) >= activities.length}
                >
                  View More Activities
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, minWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea", minHeight: 520 }}>
              <div className="mb-3">
                <span className="fw-bold" style={{ fontSize: 20 }}>Appointment Details</span>
                <div className="text-muted" style={{ fontSize: 15 }}>Complete information about this appointment</div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>
                    <span style={{ background: '#fef9c3', borderRadius: '50%', width: 24, height: 24, display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }}></span>
                    {selectedAppointment.client && typeof selectedAppointment.client === 'object' && selectedAppointment.client.role && selectedAppointment.client.full_name
                      ? (selectedAppointment.client.role === 'faculty' ? 'Teacher' : 'Student') + ' ' + selectedAppointment.client.full_name
                      : (selectedAppointment.client && typeof selectedAppointment.client === 'object' && selectedAppointment.client.full_name
                      ? selectedAppointment.client.full_name
                          : (typeof selectedAppointment.client === 'string' ? selectedAppointment.client : selectedAppointment.name || ''))}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>
                    <span style={{ background: '#bbf7d0', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Physical Health</span>
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-calendar-event me-2"></i>Today, {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-clock me-2"></i>{selectedAppointment.time ? to12Hour(selectedAppointment.time) : '-'}</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Status</div>
                  <div>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Location</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-geo-alt me-2"></i>Health Center, Room 1</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Contact Information</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-envelope me-2"></i>
                    {selectedAppointment.client && selectedAppointment.client.email ? selectedAppointment.client.email : 'No email available'}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Patient Reason</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 32 }}>
                  {selectedAppointment.reason
                    ? selectedAppointment.reason.split('\n').map((line, idx) => (
                          <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'No reason provided.'}
                </div>
              </div>
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Clinical Coding</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 32 }}>
                  {selectedAppointment.diagnosis_code && selectedAppointment.diagnosis_name
                    ? `${selectedAppointment.diagnosis_code} - ${selectedAppointment.diagnosis_name}`
                    : 'No diagnosis code assigned.'}
                </div>
              </div>
              {/* Documentation */}
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Documentation</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 80 }}>
                  {selectedAppointment.documentation
                    ? selectedAppointment.documentation.split('\n').map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'Provider\'s documentation for this appointment is not yet completed.'}
                </div>
              </div>
              {/* Action buttons row 1 */}
              <div className="d-flex justify-content-start gap-2 mb-3">
                <button type="button" className="btn btn-success px-2 flex-grow-1" style={{ fontWeight: 700, background: '#22c55e', color: '#222', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('completed')}>Mark as Completed</button>
                <button type="button" className="btn btn-warning px-2 flex-grow-1" style={{ fontWeight: 700, background: '#fde047', color: '#222', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('in_progress')}>Mark as In progress</button>
                <button type="button" className="btn px-2 flex-grow-1" style={{ fontWeight: 600, background: '#ff7043', color: '#fff', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('cancelled')}>Cancel Appointment</button>
              </div>
              {/* Action buttons row 2 */}
              <div className="d-flex justify-content-between align-items-center gap-2">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setSelectedAppointment(null)}>Close</button>
                <button type="button" className="btn btn-teal px-4 d-flex align-items-center" style={{ background: '#14b8a6', color: '#fff', fontWeight: 600, border: 'none' }} onClick={() => handleOpenAddDocumentation(selectedAppointment)}>
                  <span style={{ fontSize: 20, marginRight: 8, lineHeight: 1, fontWeight: 700 }}>+</span> {selectedAppointment?.documentation ? 'Edit' : 'Add'} documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Documentation Modal */}
      {showAddNotesModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, minWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#f6fff4" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold" style={{ fontSize: 22 }}>{selectedAppointment?.documentation ? 'Edit' : 'Add'} Documentation</span>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>{selectedAppointment?.documentation ? 'Edit' : 'Add'} documentation for the appointment</div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Patient Reason</label>
                <input type="text" className="form-control" value={selectedAppointment?.reason ? selectedAppointment.reason : 'No reason provided.'} disabled style={{ background: '#e0ece3', fontSize: 15 }} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Clinical Coding</label>
                {showDiagnosisOptions ? (
                  <div className="position-relative">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search ICD-11 or type code..." 
                      style={{ fontSize: 15 }}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {showSearchResults && searchResults.length > 0 && (
                       <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                         {searchResults.map(item => (
                           <li
                             key={item.code}
                             className="list-group-item list-group-item-action"
                             style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                             onMouseDown={() => handleSearchResultSelect(item)}
                           >
                             <div style={{ fontSize: 13, color: '#6c757d' }}>
                               <span style={{ fontWeight: 700, color: '#222' }}>{item.code}</span> - {item.name} ({item.confidence})
                             </div>
                           </li>
                         ))}
                       </ul>
                     )}
                  </div>
                ) : (
                  <div className="p-3" style={{ background: '#e0ece3', borderRadius: 6, border: '1px solid #d1e7dd' }}>
                    <div style={{ fontSize: 13, color: '#6c757d', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={true}
                        style={{ marginRight: '8px' }}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleChangeDiagnosis();
                          }
                        }}
                      />
                      <span>{selectedDiagnosis.code} - {selectedDiagnosis.name}</span>
                    </div>
                  </div>
                )}
              </div>
              {showDiagnosisOptions && (
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: 15 }}>
                    Suggested Diagnoses
                    {isDetecting && <span style={{ fontSize: 12, color: '#6c757d', marginLeft: 8 }}>(Detecting...)</span>}
                  </label>
                  <div style={{ fontSize: 13, color: '#6c757d' }}>
                    {suggestedDiagnoses.length > 0 ? (
                      suggestedDiagnoses.map((diagnosis, index) => (
                        <div key={index} style={{ marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        style={{ marginRight: '8px' }}
                        onChange={(e) => {
                          if (e.target.checked) {
                                handleDiagnosisSelect(diagnosis);
                          }
                        }}
                      />
                          <span style={{ color: '#6c757d' }}>
                            {diagnosis.code} - {diagnosis.name} ({diagnosis.confidence})
                          </span>
                    </div>
                      ))
                    ) : (
                      <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
                        {isDetecting ? 'Analyzing symptoms...' : 'No suggestions available. Enter clinical assessment to get ICD-11 suggestions.'}
                    </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Clinical Assessment</label>
                <div className="text-muted mb-2" style={{ fontSize: 14 }}>Document your assessment, observations, and interventions for accurate patient record documentation.</div>
                <textarea className="form-control" rows={4} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Enter documentation for this appointment..." style={{ fontSize: 15 }} />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={handleCloseModal}>Cancel</button>
                <button type="button" className="btn btn-success px-4" style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }} onClick={handleSaveDocumentation}>Save Documentation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .btn-cancel-light-green {
          background-color: #e6f0ea !important;
          color: #171717 !important;
          border: 2px solid #38813A !important;
          font-weight: 600 !important;
          transition: background 0.2s, color 0.2s, border 0.2s;
        }
        .btn-cancel-light-green:hover, .btn-cancel-light-green:focus {
          background-color: #d1e7dd !important;
          color: #222 !important;
          border: 2.5px solid #2e7d32 !important;
        }
        /* Custom checkbox styling */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #ccc;
          border-radius: 3px;
          background-color: white;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }
        input[type="checkbox"]:checked {
          background-color: #22c55e;
          border-color: #22c55e;
        }
        input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: -2px;
          left: 1px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        input[type="checkbox"]:hover {
          border-color: #22c55e;
        }
      `}</style>
    </div>
  );
}

