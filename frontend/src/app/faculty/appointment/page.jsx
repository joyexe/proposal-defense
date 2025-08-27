"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { getProviders, getProviderAvailableTimes, getStudents, getUserProfile, getAppointments, createAppointment, cancelAppointment } from '../../utils/api';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const allowedTimes = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

function stripSeconds(time) {
  // Converts '07:00:00' to '07:00', leaves '07:00' unchanged
  return time.split(':').slice(0,2).join(':');
}

function to12Hour(time) {
  // Accepts '07:00' or '07:00:00', returns '7:00 AM', etc.
  let [h, m] = time.split(':');
  h = parseInt(h, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Extracted modal component for reuse (copied from student/appointment/page.jsx)
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
  const modalRef = useRef(null);

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
              <button type="button" className="btn btn-cancel-light-green px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success px-4">Schedule</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function FacultyAppointmentPage() {
  const [view, setView] = useState("calendar");
  const [showModal, setShowModal] = useState(false);
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const modalRef = useRef(null);
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const days = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const [appointments, setAppointments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [providerId, setProviderId] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [referError, setReferError] = useState(null);

  // For calendar grid: 0=Sunday, 1=Monday, ...
  const weeks = [];
  let week = [];
  let startOffset = (firstDayOfWeek + 6) % 7; // Make Monday=0
  for (let i = 0; i < startOffset; i++) {
    week.push(null);
  }
  days.forEach((date) => {
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    week.push(date);
  });
  while (week.length < 7) week.push(null);
  weeks.push(week);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  useEffect(() => {
    setLoading(true);
    getAppointments()
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message || 'Failed to load appointments.'))
      .finally(() => setLoading(false));
    getProviders().then(setProviders);
  }, []);

  useEffect(() => {
    if (providerId) {
      getProviderAvailableTimes(providerId).then(setAvailableTimes);
    } else {
      setAvailableTimes([]);
    }
  }, [providerId]);

  useEffect(() => {
    if (showReferModal) {
      getStudents().then(data => {
        setStudents(data);
        setFilteredStudents(data);
      });
      getProviders().then(setProviders);
      setReferTo(""); setReferDate(""); setReferTime(""); setReferStudentName(""); setReferNotes("");
    }
  }, [showReferModal]);

  useEffect(() => {
    if (referTo) {
      getProviderAvailableTimes(referTo).then(setReferAvailableTimes);
    } else {
      setReferAvailableTimes([]);
    }
  }, [referTo]);

  useEffect(() => {
    getUserProfile().then(setUserProfile);
  }, []);

  function handleStudentSearch(e) {
    const val = e.target.value.toLowerCase();
    setReferStudentName(val);
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val)));
  }

  function getAppointmentsForDay(dateStr) {
    return appointments.filter((a) => a.date === dateStr);
  }

  function getTypeByLabel(labelOrType, appt = {}) {
    if (appt.provider && appt.provider.role === 'clinic') return 'Physical Health';
    if (appt.provider && appt.provider.role === 'counselor') return 'Mental Health';
    if (appt.service_type === 'physical') return 'Physical Health';
    if (appt.service_type === 'mental') return 'Mental Health';
    if (labelOrType && typeof labelOrType === 'string') {
      if (labelOrType.toLowerCase().includes('mental')) return 'Mental Health';
      if (labelOrType.toLowerCase().includes('physical')) return 'Physical Health';
    }
    return labelOrType || '';
  }

  function getTypeBadge(type) {
    if (type === "Mental Health") return <span style={{ background: "#99f6e4", color: "#222", borderRadius: 12, padding: "2px 12px", fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
    if (type === "Physical Health") return <span style={{ background: "#bbf7d0", color: "#222", borderRadius: 12, padding: "2px 12px", fontSize: 14, fontWeight: 500 }}>Physical Health</span>;
    return <span>{type}</span>;
  }

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

  function getProviderNameAndRole(appt, providers) {
    let provider = appt.provider;
    let name = '';
    let roleLabel = '';
    if (provider && typeof provider === 'object') {
      name = provider.full_name || 'Provider';
      if (provider.role === 'clinic') roleLabel = 'Nurse';
      else if (provider.role === 'counselor') roleLabel = 'Counselor';
      else if (provider.role === 'faculty') roleLabel = 'Teacher';
      else if (provider.role === 'student') roleLabel = 'Student';
      else if (provider.role === 'admin') roleLabel = 'Admin';
      else if (provider.role) roleLabel = provider.role.charAt(0).toUpperCase() + provider.role.slice(1);
      return roleLabel ? `${roleLabel} ${name}` : name;
    }
    // Try to find in providers list
    const found = providers && providers.find(p => String(p.id) === String(appt.provider_id));
    if (found) {
      name = found.full_name || 'Provider';
      if (found.role === 'clinic') roleLabel = 'Nurse';
      else if (found.role === 'counselor') roleLabel = 'Counselor';
      else if (found.role === 'faculty') roleLabel = 'Teacher';
      else if (found.role === 'student') roleLabel = 'Student';
      else if (found.role === 'admin') roleLabel = 'Admin';
      else if (found.role) roleLabel = found.role.charAt(0).toUpperCase() + found.role.slice(1);
      return roleLabel ? `${roleLabel} ${name}` : name;
    }
    return typeof provider === 'string' ? provider : 'Provider';
  }

  function getReferralLabel(appt, userId) {
    if (!appt.created_by || !appt.client) return 'Direct';
    // Direct: faculty created for themselves
    if (appt.created_by.id === userId && appt.client.id === userId && appt.created_by.role === 'faculty') {
      return 'Direct';
    }
    // For student: faculty created for a student
    if (appt.created_by.id === userId && appt.client.role === 'student') {
      return `For Student ${appt.client.full_name}`;
    }
    // From: created by someone else for the logged-in user
    if (appt.client.id === userId && appt.created_by.id !== userId) {
      const name = appt.created_by.full_name || 'User';
      const role = appt.created_by.role ? appt.created_by.role.charAt(0).toUpperCase() + appt.created_by.role.slice(1) : '';
      return `From ${name}${role ? ' (' + role + ')' : ''}`;
    }
    // fallback
    return 'Direct';
  }

  function formatDateTime(date, time) {
    if (!date) return '-';
    const d = new Date(date + 'T' + (time || '00:00'));
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = d.toLocaleDateString(undefined, options);
    const timeStr = to12Hour(stripSeconds(time || '00:00'));
    return `${dateStr} | ${timeStr}`;
  }

  function getTypeLabel(appt) {
    if (appt.provider && appt.provider.role === 'clinic') return 'Physical Health';
    if (appt.provider && appt.provider.role === 'counselor') return 'Mental Health';
    if (appt.service_type === 'physical') return 'Physical Health';
    if (appt.service_type === 'mental') return 'Mental Health';
    return appt.type || '';
  }

  return (
    <div className="col-12 p-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold text-black" style={{ fontSize: 22 }}>Appointments</span>
          <div className="text-muted" style={{ fontSize: 14 }}>Schedule and manage your appointments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success px-4 py-2 fw-semibold" style={{ borderRadius: 8, background: '#14b8a6', color: '#fff', border: 'none' }} onClick={() => setShowReferModal(true)}>Refer a student</button>
          <button className="btn btn-success px-4 py-2 fw-semibold" style={{ borderRadius: 8 }} onClick={() => setShowModal(true)}>
            + Schedule Appointment
          </button>
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <ScheduleAppointmentModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onScheduled={newAppt => {
            setAppointments(prev => [...prev, newAppt]);
          }}
        />
      )}
      {showReferModal && (
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
                  setAppointments(prev => [...prev, newAppt]);
                  setShowReferModal(false);
                  // Optionally refresh appointments here
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
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowReferModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4">Send Referral</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Tab Bar */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${view === 'calendar' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              onClick={() => {
                if (view !== 'calendar') setView('calendar');
                router.push('/faculty/appointment');
              }}
              type="button"
            >
              Calendar
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${view === 'list' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              onClick={() => {
                if (view !== 'list') setView('list');
                router.push('/faculty/appointment/schedule-lists');
              }}
              type="button"
            >
              List of Schedules
            </button>
          </li>
        </ul>
      </div>
      {view === 'calendar' && (
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: 0 }}>
          <div className="bg-white p-4 shadow-sm" style={{ width: '100%', maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 8px 0 rgba(16,30,54,.06)', paddingLeft: 0, paddingRight: 0 }}>
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ paddingLeft: 32, paddingRight: 32 }}>
              <button className="btn calendar-nav-btn-green" onClick={handlePrevMonth}>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>&lt;</span>
              </button>
              <h4 className="fw-semibold mb-0">{monthNames[currentMonth]} {currentYear}</h4>
              <button className="btn calendar-nav-btn-green" onClick={handleNextMonth}>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>&gt;</span>
              </button>
            </div>
            <div className="table-responsive" style={{ overflowX: 'auto', paddingLeft: 32, paddingRight: 32 }}>
              <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="text-center text-secondary">
                    <th style={{ width: '14.28%' }}>MON</th>
                    <th style={{ width: '14.28%' }}>TUE</th>
                    <th style={{ width: '14.28%' }}>WED</th>
                    <th style={{ width: '14.28%' }}>THU</th>
                    <th style={{ width: '14.28%' }}>FRI</th>
                    <th style={{ width: '14.28%' }}>SAT</th>
                    <th style={{ width: '14.28%' }}>SUN</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, i) => (
                    <tr key={i}>
                      {week.map((date, j) => (
                        <td key={j} className="align-top" style={{ height: 90, verticalAlign: 'top', background: date && date.getMonth() === currentMonth ? '#fff' : '#f3f4f6' }}>
                          {date && (
                            <>
                              <div className={`fw-semibold ${date.getMonth() === currentMonth ? '' : 'text-muted'}`}>{date.getDate()}</div>
                              {getAppointmentsForDay(
                                date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                                  : ''
                              )
                                .slice()
                                .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
                                .map((appt, idx) => {
                                  // Custom plotting for 'Refer a student' by current faculty
                                  const isCreatedByCurrentFaculty = userProfile && appt.created_by && appt.created_by.id === userProfile.id && appt.created_by.role === 'faculty';
                                  const isForStudent = appt.client && appt.client.role === 'student';
                                  let displayText;
                                  if (isCreatedByCurrentFaculty && isForStudent) {
                                    displayText = `${to12Hour(stripSeconds(appt.time))} | For Student ${appt.client.full_name}`;
                                  } else {
                                    let providerInfo = providers.find(p => String(p.id) === String(appt.provider_id));
                                    const providerName = providerInfo && typeof providerInfo.full_name === 'string' ? providerInfo.full_name : (appt.provider && typeof appt.provider.full_name === 'string' ? appt.provider.full_name : 'Provider');
                                    let providerRole = providerInfo && typeof providerInfo.role === 'string' ? providerInfo.role : (appt.provider && typeof appt.provider.role === 'string' ? appt.provider.role : '');
                                    if (providerRole && providerRole.toLowerCase() === 'clinic') providerRole = 'Nurse';
                                    else if (providerRole && providerRole.toLowerCase() === 'faculty') providerRole = 'Teacher';
                                    else if (providerRole) providerRole = providerRole.charAt(0).toUpperCase() + providerRole.slice(1);
                                    displayText = `${to12Hour(stripSeconds(appt.time))} | With ${providerRole ? providerRole + ' ' : ''}${providerName}`;
                                  }
                                  let bgColor = '#bbf7d0';
                                  let textColor = '#222';
                                  if (appt.service_type === 'mental') {
                                    bgColor = '#5eead4';
                                    textColor = '#134e4a';
                                  }
                                return (
                                  <div
                                    key={idx}
                                    className="mt-1 px-2 py-1"
                                      style={{ background: bgColor, color: textColor, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', boxShadow: 'none' }}
                                      onClick={() => setSelectedAppointment({ ...appt, type: appt.service_type })}
                                    >
                                      <span style={{ color: textColor, fontSize: 14, fontWeight: 500 }}>{displayText}</span>
                                      {getStatusBadge(appt.status)}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="mb-3">
                <span className="fw-bold" style={{ fontSize: 20 }}>Appointment Details</span>
                <div className="text-muted" style={{ fontSize: 15 }}>Complete information about this appointment</div>
              </div>
              {/* Provider & Type */}
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>
                    <span style={{
                      background: '#fef9c3',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'inline-block',
                      marginRight: 8,
                      verticalAlign: 'middle'
                    }}></span>
                    {getProviderNameAndRole(selectedAppointment, providers)}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>{getTypeBadge(getTypeLabel(selectedAppointment))}</div>
                </div>
              </div>
              {/* Date & Time and Status */}
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-calendar-event me-2"></i>{selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-clock me-2"></i>{selectedAppointment.time ? to12Hour(stripSeconds(selectedAppointment.time)) : '-'}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Status</div>
                  <div>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>
              {/* Referral & Location */}
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Referral</div>
                  <div style={{ fontSize: 14 }}>{getReferralLabel(selectedAppointment, userProfile?.id)}</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Location</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-geo-alt me-2"></i>Health Center, Room 1</div>
                </div>
              </div>
              {/* Contact Information */}
              <div className="row mb-2">
                <div className="col-12">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Contact Information</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-envelope me-2"></i>
                    {(() => {
                      let provider = selectedAppointment.provider;
                      if (provider && typeof provider === 'object' && provider.email) return provider.email;
                      const found = providers && providers.find(p => String(p.id) === String(selectedAppointment.provider_id));
                      if (found && found.email) return found.email;
                      return 'No email available';
                    })()}
                  </div>
                </div>
              </div>
              {/* Reason */}
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Reason</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 32 }}>
                  {selectedAppointment.reason
                    ? selectedAppointment.reason.split('\n').map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'No reason provided.'}
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
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-warning px-4"
                  style={{ color: '#fff', fontWeight: 600 }}
                  onClick={async () => {
                    try {
                      await cancelAppointment(selectedAppointment.id);
                      setAppointments(prev => prev.map(appt =>
                        appt.id === selectedAppointment.id ? { ...appt, status: 'cancelled' } : appt
                      ));
                    } catch (err) {
                      alert('Failed to cancel appointment: ' + (err.message || err));
                    }
                    setSelectedAppointment(null);
                  }}
                >
                  Cancel Appointment
                </button>
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setSelectedAppointment(null)}>Close</button>
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
        .calendar-nav-btn-green {
          border-radius: 8px;
          border-width: 2px;
          background: #198754 !important;
          border: 2px solid #198754 !important;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 4px 0 rgba(16,30,54,.08);
          padding: 0.25rem 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .calendar-nav-btn-green:hover, .calendar-nav-btn-green:focus {
          background: #157347 !important;
          border-color: #157347 !important;
          box-shadow: 0 2px 8px 0 rgba(16,30,54,.12);
        }
      `}</style>
    </div>
  );
}