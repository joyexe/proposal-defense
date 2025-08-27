"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, getAppointments, getProviders, getProviderAvailableTimes, createAppointment, getStudents, getBulletinPosts, getFacultyDashboardCounts } from "../../utils/api";

// Extracted modal component for reuse (copied from faculty/appointment/page.jsx)
function ScheduleAppointmentModal({ show, onClose, onScheduled }) {
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [providers, setProviders] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [error, setError] = useState(null);
  const [clientId, setClientId] = useState("");
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    if (show) {
      getProviders().then(setProviders);
      setProviderId(""); setDate(""); setTime(""); setNotes(""); setError(null);
      getUserProfile().then(profile => setClientId(profile.id));
    }
  }, [show]);

  useEffect(() => {
    if (providerId) {
      getProviderAvailableTimes(providerId).then(setAvailableTimes);
    } else {
      setAvailableTimes([]);
    }
  }, [providerId]);

  function stripSeconds(time) {
    return time.split(':').slice(0,2).join(':');
  }
  function to12Hour(time) {
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedProvider = providers.find(p => String(p.id) === String(providerId));
      let serviceType = '';
      if (selectedProvider) {
        if (selectedProvider.role === 'clinic') serviceType = 'physical';
        else if (selectedProvider.role === 'counselor') serviceType = 'mental';
      }
      const newAppt = await createAppointment({
        provider_id: providerId,
        client_id: clientId,
        date,
        time,
        reason: notes,
        service_type: serviceType
      });
      if (onScheduled) onScheduled(newAppt);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule appointment.');
    }
  };

  if (!show) return null;
  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
        <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Schedule a New Appointment</h5>
          </div>
          <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Select your provider, date, and time.</div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Provider</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <select className="form-select" value={providerId} onChange={e => setProviderId(e.target.value)} required style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                  <option value="">Select a provider</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.role === 'clinic' ? `Nurse ${p.full_name}` : p.role === 'counselor' ? `Counselor ${p.full_name}` : p.full_name}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                  <i className="bi bi-chevron-down"></i>
                </span>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date</label>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Time</label>
              <select className="form-select" value={time} onChange={e => setTime(e.target.value)} required>
                <option value="">Select a time slot</option>
                {availableTimes.filter(t => allowedTimes.includes(stripSeconds(t))).map(t => (
                  <option key={t} value={t}>{to12Hour(stripSeconds(t))}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">Reason</label>
              <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional: Fill in the reason for the appointment visit." />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button 
                type="button" 
                style={{ 
                  background: '#e6f0ea', 
                  color: '#000', 
                  border: '2px solid #38813A', 
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  transition: 'background 0.2s, color 0.2s, border 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d1e7dd'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e6f0ea'}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success px-4">Schedule</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Refer Student Modal component
function ReferStudentModal({ show, onClose, onScheduled }) {
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [providers, setProviders] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [referError, setReferError] = useState(null);
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    if (show) {
      getStudents().then(data => {
        setStudents(data);
        setFilteredStudents(data);
      });
      getProviders().then(setProviders);
      setReferTo(""); setReferDate(""); setReferTime(""); setReferStudentName(""); setReferNotes("");
    }
  }, [show]);

  useEffect(() => {
    if (referTo) {
      getProviderAvailableTimes(referTo).then(setReferAvailableTimes);
    } else {
      setReferAvailableTimes([]);
    }
  }, [referTo]);

  function to12Hour(time) {
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  function handleStudentSearch(e) {
    const val = e.target.value.toLowerCase();
    setReferStudentName(val);
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val)));
  }

  if (!show) return null;
  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
        <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Refer Student</h5>
          </div>
          <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Refer a student to nurse or counselor</div>
          {referError && <div className="alert alert-danger py-2">{referError}</div>}
          <form onSubmit={async e => {
            e.preventDefault();
            setReferError(null);
            try {
              // Find selected student and provider objects
              const studentObj = students.find(s => s.full_name === referStudentName);
              const providerObj = providers.find(p => String(p.id) === String(referTo));
              if (!studentObj || !providerObj) throw new Error('Please select a valid student and provider.');
              let serviceType = '';
              if (providerObj.role === 'clinic') serviceType = 'physical';
              else if (providerObj.role === 'counselor') serviceType = 'mental';
              const newAppt = await createAppointment({
                provider_id: providerObj.id,
                client_id: studentObj.id,
                date: referDate,
                time: referTime,
                reason: referNotes,
                service_type: serviceType,
                referral: 'Direct' // or customize as needed
              });
              if (onScheduled) onScheduled(newAppt);
              onClose();
            } catch (err) {
              setReferError(err.message || 'Failed to send referral.');
            }
          }}>
            <div className="mb-3" style={{ position: 'relative' }}>
              <label className="form-label fw-semibold">Student Name</label>
              <input
                type="text"
                className="form-control"
                value={referStudentName}
                onChange={handleStudentSearch}
                onFocus={() => setStudentDropdownOpen(true)}
                onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                placeholder="Search student name..."
                autoComplete="off"
                required
              />
              {studentDropdownOpen && referStudentName.length > 0 && filteredStudents.length > 0 && (
                <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                  {filteredStudents.map(s => (
                    <li
                      key={s.id}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                      onMouseDown={() => { setReferStudentName(s.full_name); setStudentDropdownOpen(false); }}
                    >
                      {s.full_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Refer to</label>
              <select className="form-select" value={referTo} onChange={e => setReferTo(e.target.value)} required>
                <option value="">Select provider to refer to</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.role === 'clinic' ? `Nurse ${p.full_name}` : p.role === 'counselor' ? `Counselor ${p.full_name}` : p.full_name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date</label>
              <input type="date" className="form-control" value={referDate} onChange={e => setReferDate(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Time</label>
              <select className="form-select" value={referTime} onChange={e => setReferTime(e.target.value)} required>
                <option value="">Select a time slot</option>
                {referAvailableTimes.filter(t => allowedTimes.includes(t.split(':').slice(0,2).join(':'))).map(t => (
                  <option key={t} value={t}>{to12Hour(t.split(':').slice(0,2).join(':'))}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">Reason</label>
              <input type="text" className="form-control" value={referNotes} onChange={e => setReferNotes(e.target.value)} placeholder="Reason for referral" />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button 
                type="button" 
                style={{ 
                  background: '#e6f0ea', 
                  color: '#000', 
                  border: '2px solid #38813A', 
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  transition: 'background 0.2s, color 0.2s, border 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d1e7dd'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e6f0ea'}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success px-4">Send Referral</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const [userProfile, setUserProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [bulletinPosts, setBulletinPosts] = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState({
    my_appointments: 0,
    student_referrals: { total: 0, active: 0, completed: 0 },
    announcements: 0,
    health_records: 0
  });
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [appointmentBatch, setAppointmentBatch] = useState(0);
  const batchSize = 5;
  const [referralBatch, setReferralBatch] = useState(0);
  const referralBatchSize = 6;
  const router = useRouter();

  // Function to fetch dashboard counts
  const fetchDashboardCounts = async () => {
    try {
      setCountsLoading(true);
      const countsData = await getFacultyDashboardCounts();
      setDashboardCounts(countsData);
    } catch (error) {
      console.error('Error fetching dashboard counts:', error);
    } finally {
      setCountsLoading(false);
    }
  };

  // Function to refresh all data
  const refreshAllData = async () => {
    try {
      const [profile, appointmentsData, bulletinData, countsData] = await Promise.all([
        getUserProfile(),
        getAppointments(),
        getBulletinPosts(),
        getFacultyDashboardCounts()
      ]);
      
      setUserProfile(profile);
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      setBulletinPosts(Array.isArray(bulletinData) ? bulletinData : []);
      setDashboardCounts(countsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
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
        await refreshAllData();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time updates - refresh counts every 30 seconds
    const intervalId = setInterval(() => {
      fetchDashboardCounts();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [router]);

  // Filter appointments for faculty
  const facultyAppointments = appointments
    .filter(appt => 
      appt.client && appt.client.id === userProfile?.id && appt.status === 'upcoming'
    )
    .sort((a, b) => {
      // Combine date and time for comparison
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);
      return aDate - bDate;
    });

  // Reset to first batch when appointments change
  useEffect(() => { setAppointmentBatch(0); }, [facultyAppointments.length]);

  // Filter referrals made by faculty
  const facultyReferrals = appointments
    .filter(appt => 
      appt.created_by && appt.created_by.id === userProfile?.id && 
      appt.client && appt.client.role === 'student'
    )
    .filter(appt => {
      // Only show referrals from the last 7 days (1 week)
      const appointmentDate = new Date(`${appt.date}T${appt.time}`);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return appointmentDate >= oneWeekAgo;
    })
    .sort((a, b) => {
      // Status priority order: upcoming -> in_progress -> cancelled -> completed
      const statusPriority = {
        'upcoming': 1,
        'in_progress': 2,
        'in progress': 2,
        'cancelled': 3,
        'completed': 4
      };
      
      const aPriority = statusPriority[a.status?.toLowerCase()] || 5;
      const bPriority = statusPriority[b.status?.toLowerCase()] || 5;
      
      // First sort by status priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by date and time within the same status
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);
      return aDate - bDate;
    });

  // Reset to first batch when referrals change
  useEffect(() => { setReferralBatch(0); }, [facultyReferrals.length]);

  // Helper function to format appointment date
  function formatAppointmentDate(dateStr, timeStr) {
    const dateObj = new Date(`${dateStr}T${timeStr}`);
    const options = { weekday: 'long', year: undefined, month: 'long', day: 'numeric' };
    const datePart = dateObj.toLocaleDateString('en-US', options);
    let hours = dateObj.getHours();
    let minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${datePart} at ${hours}:${minuteStr} ${ampm}`;
  }

  // Helper function to get provider name and role
  function getProviderNameAndRole(appt) {
    if (appt.provider && typeof appt.provider === 'object') {
      const name = appt.provider.full_name || 'Provider';
      let roleLabel = '';
      if (appt.provider.role === 'clinic') roleLabel = 'Nurse';
      else if (appt.provider.role === 'counselor') roleLabel = 'Counselor';
      else if (appt.provider.role) roleLabel = appt.provider.role.charAt(0).toUpperCase() + appt.provider.role.slice(1);
      return roleLabel ? `${roleLabel} ${name}` : name;
    }
    return 'Provider';
  }

  if (loading) {
    return (
      <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Top Section with Welcome and Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        {/* Welcome Section */}
        <div>
          <h2 className="fw-bold mb-1" style={{ fontSize: 28, color: '#222' }}>
                            Welcome, Teacher {userProfile?.full_name || ""}!
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: 16 }}>Your health and wellness portal</p>
        </div>
        
        {/* Buttons */}
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success px-4 py-2 fw-semibold" 
            style={{ borderRadius: 8, background: '#14b8a6', color: '#fff', border: 'none' }} 
            onClick={() => setShowReferModal(true)}
          >
            Refer a student
          </button>
          <button 
            className="btn btn-success px-4 py-2 fw-semibold" 
            style={{ borderRadius: 8, border: 'none' }} 
            onClick={() => setShowScheduleModal(true)}
          >
            + Schedule Appointment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="fw-bold mb-1" style={{ fontSize: 18, color: '#222' }}>My Appointments</div>
            <div className="text-muted mb-2" style={{ fontSize: 14 }}>Monitor appointment</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardCounts.my_appointments}</div>
            <div className="text-muted small mt-1">Upcoming appointment</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="fw-bold mb-1" style={{ fontSize: 18, color: '#222' }}>Student Referrals</div>
            <div className="text-muted mb-2" style={{ fontSize: 14 }}>Make a referral for physical or mental concerns</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardCounts.student_referrals.total}</div>
            <div className="text-muted small mt-1">
              {dashboardCounts.student_referrals.active} active, {dashboardCounts.student_referrals.completed} completed
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="fw-bold mb-1" style={{ fontSize: 18, color: '#222' }}>Announcements</div>
            <div className="text-muted mb-2" style={{ fontSize: 14 }}>Stay updated with clinic and health bulletins</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardCounts.announcements}</div>
            <div className="text-muted small mt-1">New Announcements</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="fw-bold mb-1" style={{ fontSize: 18, color: '#222' }}>Health Records</div>
            <div className="text-muted mb-2" style={{ fontSize: 14 }}>View and monitor student medical history</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{dashboardCounts.health_records}</div>
            <div className="text-muted small mt-1">Assigned Students</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="row g-4">
        {/* Upcoming Appointment Section */}
        <div className="col-lg-6">
          <div className="shadow-sm" style={{ borderRadius: 16, background: "#e6f7ec", border: '2px solid #43c463' }}>
            <div className="p-4">
              <div className="fw-bold fs-5 mb-2">Upcoming Appointment</div>
              <div className="mb-3" style={{ fontSize: 14, color: "#6c757d", marginBottom: 18, marginTop: 0 }}>Your scheduled health appointments</div>
              <div className="d-flex flex-column gap-3">
                {facultyAppointments.slice(appointmentBatch * batchSize, (appointmentBatch + 1) * batchSize).map((appt, idx) => {
                  // Determine type, badge, and colors
                  const isPhysical = appt.service_type === 'physical';
                  const isMental = appt.service_type === 'mental';
                  const badgeColor = isPhysical ? '#43c463' : '#20bfa9';
                  const badgeBg = isPhysical ? '#e6f7ec' : '#e6f7f0';
                  const circleColor = isPhysical ? '#43c463' : '#20bfa9';
                  const badgeText = isPhysical ? 'Physical' : 'Mental';
                  const title = isPhysical ? 'Annual Physical' : 'Annual Mental Health';
                  let subtitle = '';
                  if (appt.provider && appt.provider.role === 'clinic') {
                    subtitle = `With: Nurse ${appt.provider.full_name}`;
                  } else if (appt.provider && appt.provider.role === 'counselor') {
                    subtitle = `With: Counselor ${appt.provider.full_name}`;
                  } else {
                    subtitle = 'With: ' + (appt.provider?.full_name || 'Provider');
                  }
                  const dateStr = formatAppointmentDate(appt.date, appt.time);
                  
                  return (
                    <div key={idx} className="d-flex align-items-center justify-content-between bg-white p-3" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(60,140,108,0.04)', border: '1.5px solid #e6f7ec', position: 'relative' }}>
                      {/* Left circle */}
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: circleColor, marginRight: 18, flexShrink: 0 }} />
                      {/* Main info */}
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold" style={{ color: '#222', fontSize: 17, marginBottom: 2 }}>{title}</div>
                        <div className="text-muted" style={{ fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
                        <div className="text-muted" style={{ fontSize: 13 }}>{dateStr}</div>
                      </div>
                      {/* Badge */}
                      <span style={{
                        background: isPhysical ? '#eafaf1' : '#eaf8fa',
                        color: badgeColor,
                        border: `1px solid ${badgeColor}22`, // very light border
                        borderRadius: 999,
                        fontWeight: 500,
                        fontSize: 13,
                        padding: '3px 18px',
                        marginLeft: 18,
                        minWidth: 70,
                        textAlign: 'center',
                        boxShadow: 'none',
                        display: 'inline-block',
                        letterSpacing: 0.2,
                        cursor: 'default',
                        userSelect: 'none',
                      }}>{badgeText}</span>
                    </div>
                  );
                })}
                {facultyAppointments.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No upcoming appointments
                  </div>
                )}
              </div>
              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setAppointmentBatch(b => b + 1)}
                disabled={((appointmentBatch + 1) * batchSize) >= facultyAppointments.length}
              >
                View More Appointments
              </button>
            </div>
          </div>
        </div>

        {/* Recent Referrals Section */}
        <div className="col-lg-6">
          <div className="bg-white shadow-sm" style={{ borderRadius: 16 }}>
            <div className="p-4">
              <div className="fw-bold fs-5 mb-2">Recent Referrals</div>
              <div className="mb-3" style={{ fontSize: 14, color: "#6c757d" }}>Student referrals you've submitted</div>
              <div className="d-flex flex-column gap-3">
                {facultyReferrals.slice(referralBatch * referralBatchSize, (referralBatch + 1) * referralBatchSize).map((referral, idx) => {
                  const studentName = referral.client?.full_name || 'Student';
                  
                  // Status badge function matching faculty appointment schedule-lists design
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
                    };
                    if (status.toLowerCase() === "upcoming") {
                      return <span style={{ ...styleBase, background: "#fff", color: "#222", border: "1px solid #bbb" }}>Upcoming</span>;
                    }
                    if (status.toLowerCase() === "completed") {
                      return <span style={{ ...styleBase, background: "#bbf7d0", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>✓</span> Completed
                      </span>;
                    }
                    if (status.toLowerCase() === "cancelled") {
                      return <span style={{ ...styleBase, background: "#fecaca", color: "#e11d48", border: "1px solid #fecaca" }}>
                        <span style={{ fontWeight: 700, fontSize: 16 }}>✗</span> Cancelled
                      </span>;
                    }
                    if (status.toLowerCase() === "in_progress" || status.toLowerCase() === "in progress") {
                      return <span style={{ ...styleBase, background: "#dbeafe", color: "#2563eb", border: "1px solid #dbeafe" }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>•</span> In Progress
                      </span>;
                    }
                    return <span style={styleBase}>{status}</span>;
                  }
                  
                  return (
                    <div key={idx} className="d-flex align-items-center justify-content-between p-3" style={{ borderRadius: 12, border: '1px solid #e9ecef' }}>
                      <div className="flex-grow-1">
                        <div className="fw-semibold" style={{ color: '#222', fontSize: 17, marginBottom: 2 }}>{studentName}</div>
                        <div className="text-muted" style={{ fontSize: 14 }}>
                          {referral.service_type === 'physical' ? 'Physical Health Referral' : 'Mental Health Referral'}
                        </div>
                      </div>
                      {getStatusBadge(referral.status)}
                    </div>
                  );
                })}
                {facultyReferrals.length === 0 && (
                  <div className="text-center py-4 text-muted">
                    No referrals submitted yet
                  </div>
                )}
              </div>
              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setReferralBatch(b => b + 1)}
                disabled={((referralBatch + 1) * referralBatchSize) >= facultyReferrals.length}
              >
                View More Referrals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleAppointmentModal
          show={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(newAppt) => {
            setAppointments(prevAppts => [...prevAppts, newAppt]);
            // Refresh dashboard counts immediately
            fetchDashboardCounts();
          }}
        />
      )}
      
      {showReferModal && (
        <ReferStudentModal
          show={showReferModal}
          onClose={() => setShowReferModal(false)}
          onScheduled={(newAppt) => {
            setAppointments(prevAppts => [...prevAppts, newAppt]);
            // Refresh dashboard counts immediately
            fetchDashboardCounts();
          }}
        />
      )}
    </div>
  );
}
