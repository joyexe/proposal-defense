"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { BsFillChatDotsFill, BsPlusLg, BsCheckCircleFill } from "react-icons/bs";
import { ProgressBar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { getUserProfile, submitMood, checkMoodSubmission, getMoodData, getAppointments, getProviders, getProviderAvailableTimes, createAppointment, getTeachers, createPermitRequest } from "../../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const moodOptions = [
  { label: 'Happy', img: '/img/happy.png' },
  { label: 'Good', img: '/img/good.png' },
  { label: 'Neutral', img: '/img/neutral.png' },
  { label: 'Sad', img: '/img/sad.png' },
  { label: 'Angry', img: '/img/angry.png' },
];

function getMoodIcon(label, size = 32) {
  if (!label) return null;
  const found = moodOptions.find((m) => m.label.toLowerCase() === label.toLowerCase());
  return found ? (
    <Image src={found.img} alt={label} width={size} height={size} style={{ objectFit: 'contain', width: 'auto', height: 'auto' }} />
  ) : null;
}

// Daily Mood Check-in component
function DailyMoodCheckin({
  moodOptions,
  selectedMood,
  setSelectedMood,
  moodNote,
  setMoodNote,
  loading,
  moodLoading,
  todayMood,
  todayNote,
  handleMoodSubmit
}) {
  // Use the top-level getMoodIcon function for correct emoji image
  return (
    <div className="card shadow-sm" style={{ borderRadius: 16 }}>
      <div className="card-body">
        <div className="fw-bold fs-5 mb-2">Daily Mood Check-in</div>
        <div className="mb-3" style={{ fontSize: 14, color: "#6c757d", marginBottom: 18, marginTop: 0 }}>How are you feeling today?</div>
        {moodLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : todayMood ? (
          <>
            <div className="d-flex align-items-center gap-3 mb-2 mt-3">
              <div className="d-flex flex-column align-items-center">
                <div style={{
                  background: '#e6f7f0',
                  borderRadius: 16,
                  border: '1.5px solid #b2e5d6',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 70,
                }}>
                  {getMoodIcon(todayMood, 40)}
                  <div className="fw-semibold" style={{ color: '#20bfa9', fontSize: 16, marginTop: 8, marginBottom: 0 }}>{typeof todayMood === 'string' ? capitalize(todayMood) : ''}</div>
                </div>
              </div>
              <div className="flex-grow-1 ms-2">
                <div className="fw-bold fs-5 mb-1">Today's Mood</div>
                {todayNote && todayNote.trim() !== "" && (
                  <div className="text-muted mt-2" style={{ fontSize: 15 }}>{todayNote}</div>
                )}
              </div>
            </div>
            <div className="bg-light border rounded p-2 mb-4 mt-3" style={{ fontSize: 14 }}>
              <span className="fw-semibold">Coming Up</span><br />
              Your wellness check-in is due tomorrow
            </div>
          </>
        ) : (
          <>
            <div className="d-flex gap-3 mb-3 justify-content-center">
              {moodOptions.map((mood, idx) => (
                <div
                  key={mood.label}
                  onClick={() => setSelectedMood(idx)}
                  style={{
                    cursor: 'pointer',
                    background: selectedMood === idx ? '#c6efe2' : '#e6f7f0',
                    borderRadius: 16,
                    padding: 16,
                    minWidth: 70,
                    minHeight: 70,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: selectedMood === idx ? '0 2px 12px rgba(32,191,169,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                    border: selectedMood === idx ? '2px solid #20bfa9' : '1.5px solid #b2e5d6',
                    transition: 'all 0.2s',
                    outline: selectedMood === idx ? '2px solid #20bfa9' : 'none',
                    margin: 4,
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedMood === idx}
                >
                  <Image src={mood.img} alt={mood.label} width={40} height={40} style={{ marginBottom: 8 }} />
                  <span style={{ fontSize: 16, color: '#20bfa9', fontWeight: 500 }}>{mood.label}</span>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <label htmlFor="moodNote" className="form-label">Mood Note (optional)</label>
              <textarea
                className="form-control"
                id="moodNote"
                name="moodNote"
                placeholder="Add a note about how you're feeling (optional)"
                value={moodNote || ""}
                onChange={e => setMoodNote(e.target.value)}
                style={{ borderRadius: 10, background: "#f6fef9" }}
                rows={2}
                disabled={loading}
                autoComplete="off"
                aria-label="Mood note"
              />
            </div>
            <button
              className="btn btn-success w-100"
              style={{ borderRadius: 10 }}
              onClick={handleMoodSubmit}
              disabled={selectedMood === null || loading}
              type="button"
            >
              {loading ? "Submitting..." : "Submit Mood"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const moodToValue = { Angry: 1, Sad: 2, Neutral: 3, Good: 4, Happy: 5 };
const valueToMood = { 1: 'Angry', 2: 'Sad', 3: 'Neutral', 4: 'Good', 5: 'Happy' };
const moodList = ['Happy', 'Good', 'Neutral', 'Sad', 'Angry'];

function getMoodNumeric(label) {
  return moodToValue[label] || null;
}

function getMoodLabel(val) {
  return valueToMood[val] || '';
}

// Helper to capitalize first letter
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
      
      // Dispatch real-time update events for both student and counselor dashboards
      window.dispatchEvent(new Event('student-appointment-updated'));
      window.dispatchEvent(new Event('counselor-appointment-updated'));
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule appointment.');
    }
  };

  if (!show) return null;
  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
        <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
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
                    <option key={p.id} value={p.id}>
                      {p.role === 'clinic' ? `Nurse ${p.full_name}` : p.role === 'counselor' ? `Counselor ${p.full_name}` : p.full_name}
                    </option>
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
                className="btn btn-cancel-light-green px-4"
                style={{ fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'background 0.2s, color 0.2s, border 0.2s', minWidth: 100, background: '#e6f0ea', border: '2px solid #38813A' }}
                onMouseOver={e => e.currentTarget.style.background = '#d1e7dd'}
                onMouseOut={e => e.currentTarget.style.background = '#e6f0ea'}
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

// Permit to leave classroom modal component
function PermitToLeaveModal({ show, onClose, onSubmit }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [providerId, setProviderId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [levelSection, setLevelSection] = useState("");
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (show) {
      // Set default values for first box
      setDate("");
      setTime("");
      
      setProviderId("");
      setTeacherId("");
      setReason("");
      
      // Load providers and teachers
      getProviders().then(providersData => {
        setProviders(providersData);
      });
      
      getTeachers().then(teachersData => {
        setTeachers(teachersData);
      });
      
      getUserProfile().then(profile => {
        setUserProfile(profile);
        setLevelSection(profile.grade || "");
        setSection(profile.section || "");
      });
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a reason for your request.");
      return;
    }
    
    setLoading(true);
    try {
      const permitData = {
        date,
        time,
        teacher: teacherId,
        provider: providerId,
        grade: userProfile?.grade || levelSection,
        section: userProfile?.section || section,
        reason
      };
      
      const response = await createPermitRequest(permitData);
      
      if (onSubmit) {
        onSubmit(response);
      }
      
      // Dispatch real-time update events for clinic dashboard
      window.dispatchEvent(new Event('clinic-appointment-updated'));
      
      onClose();
    } catch (error) {
      console.error("Failed to submit request:", error);
      // Don't show alert, just close modal
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ 
      background: "rgba(0,0,0,0.5)", 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100vw", 
      height: "100vh", 
      zIndex: 1050, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center" 
    }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 600, width: "100%" }}>
        <div className="modal-content" style={{ 
          borderRadius: 16, 
          boxShadow: "0 4px 32px rgba(0,0,0,0.15)", 
          background: "#fff",
          border: "none"
        }}>
          <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
            <h5 className="modal-title fw-bold" style={{ fontSize: "20px", color: "#222" }}>
              Permit to leave the classroom
            </h5>
          </div>
          
          <div className="modal-body" style={{ padding: "20px 24px 24px 24px" }}>
            <form onSubmit={handleSubmit}>
              {/* First Box */}
              <div style={{ 
                background: "#ffffff", 
                borderRadius: 12, 
                padding: "20px", 
                marginBottom: "20px",
                border: "1px solid #e9ecef"
              }}>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                      Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ 
                        borderRadius: 8, 
                        border: "1px solid #ddd",
                        fontSize: "14px",
                        padding: "8px 12px"
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                      Time
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      style={{ 
                        borderRadius: 8, 
                        border: "1px solid #ddd",
                        fontSize: "14px",
                        padding: "8px 12px"
                      }}
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                    Provider
                  </label>
                  <select
                    className="form-select"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    style={{ 
                      borderRadius: 8, 
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      padding: "8px 12px"
                    }}
                  >
                    <option value="">Select a provider</option>
                    {providers.filter(p => p.role === 'clinic').map(p => (
                      <option key={p.id} value={p.id}>
                        Nurse {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                    Teacher
                  </label>
                  <select
                    className="form-select"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    style={{ 
                      borderRadius: 8, 
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      padding: "8px 12px"
                    }}
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        Teacher {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                    Grade
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={levelSection}
                    onChange={(e) => setLevelSection(e.target.value)}
                    style={{ 
                      borderRadius: 8, 
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      padding: "8px 12px"
                    }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                    Section
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    style={{ 
                      borderRadius: 8, 
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      padding: "8px 12px"
                    }}
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                    Reason
                  </label>
                  <textarea
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Fill in the reason for the request (e.g., fever, headache, stomachache, etc.)"
                    rows={3}
                    style={{ 
                      borderRadius: 8, 
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      padding: "8px 12px",
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>
              

              
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  style={{ 
                    background: "#f8f9fa",
                    border: "1px solid #ddd",
                    color: "#000",
                    borderRadius: 8,
                    padding: "8px 20px",
                    fontSize: "14px",
                    fontWeight: 500
                  }}
                >
                  <span style={{ color: "#000" }}>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={loading}
                  style={{ 
                    background: "#28a745",
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "8px 20px",
                    fontSize: "14px",
                    fontWeight: 500
                  }}
                >
                  {loading ? "Requesting..." : "Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for date formatting
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

export default function StudentDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [moodLoading, setMoodLoading] = useState(true);
  const [todayMood, setTodayMood] = useState(null);
  const [todayNote, setTodayNote] = useState("");
  const [moodHistory, setMoodHistory] = useState([]);
  const [loadingMoodTrends, setLoadingMoodTrends] = useState(true);
  const [zoomRange, setZoomRange] = useState([0, Math.max(moodHistory.length - 1, 6)]);
  const chartContainerRef = useRef(null);
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [appointmentBatch, setAppointmentBatch] = useState(0);
  const batchSize = 5;
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
      getUserProfile()
        .then((data) => {
          setFullName(data.full_name || "");
          setUserId(data.id); // Save user id for filtering
        })
        .catch(() => setFullName(""));
      setMoodLoading(true);
      checkMoodSubmission()
        .then((data) => {
          if (typeof data === 'object' && data !== null && ('mood' in data || 'note' in data)) {
            let moodValue = data.mood;
            let noteValue = data.note;
            // If moodValue is a stringified dict, parse it
            if (typeof moodValue === 'string' && moodValue.startsWith("{'mood': ")) {
              try {
                const jsonStr = moodValue.replace(/'/g, '"');
                const parsed = JSON.parse(jsonStr);
                moodValue = parsed.mood;
                noteValue = parsed.note;
              } catch (e) {
                // fallback
              }
            }
            setTodayMood(typeof moodValue === 'string' ? moodValue : '');
            setTodayNote(typeof noteValue === 'string' ? noteValue : '');
          } else if (typeof data === 'string') {
            setTodayMood(data);
            setTodayNote('');
          } else {
            setTodayMood('');
            setTodayNote('');
          }
        })
        .finally(() => setMoodLoading(false));
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {

        return;
      }
      
      // Fetch mood history for trends
      setLoadingMoodTrends(true);
      getMoodData()
        .then((data) => {
          let history = Array.isArray(data.data) ? data.data : [];
          // Parse stringified moods if needed
          history = history.map(entry => {
            let mood = entry.mood;
            let note = entry.note;
            if (typeof mood === 'string' && mood.startsWith("{'mood': ")) {
              try {
                const jsonStr = mood.replace(/'/g, '"');
                const parsed = JSON.parse(jsonStr);
                mood = parsed.mood;
                note = parsed.note;
              } catch (e) {}
            }
            return { ...entry, mood, note };
          });
          history = history.reverse(); // oldest to newest for x-axis
          setMoodHistory(history);
          // Ensure zoomRange covers all data by default
          setTimeout(() => setZoomRange([0, Math.max(history.length - 1, 0)]), 0);
        })
        .finally(() => setLoadingMoodTrends(false));
      setLoading(true);
      getAppointments()
        .then(data => setAppointments(Array.isArray(data) ? data : []))
        .catch(err => setError(err.message || 'Failed to load appointments.'))
        .finally(() => setLoading(false));
    }
  }, [router]);

  // Real-time mood update listener
  useEffect(() => {
    const handleMoodUpdate = async (event) => {
      const { mood, note, date, type } = event.detail;
      
      // Update today's mood and note
      setTodayMood(mood);
      setTodayNote(note);
      
      // Update mood history for real-time chart updates
      if (type === 'mood-submitted' || type === 'survey-completed') {
        try {
          // Check if user is authenticated before making API calls
          const token = localStorage.getItem('token');
          if (!token) {
    
            return;
          }
          
          // Fetch fresh mood data to update the chart
          const freshData = await getMoodData();
          let history = Array.isArray(freshData.data) ? freshData.data : [];
          
          // Parse stringified moods if needed
          history = history.map(entry => {
            let mood = entry.mood;
            let note = entry.note;
            if (typeof mood === 'string' && mood.startsWith("{'mood': ")) {
              try {
                const jsonStr = mood.replace(/'/g, '"');
                const parsed = JSON.parse(jsonStr);
                mood = parsed.mood;
                note = parsed.note;
              } catch (e) {}
            }
            return { ...entry, mood, note };
          });
          
          history = history.reverse(); // oldest to newest for x-axis
          setMoodHistory(history);
          
          // Update zoom range to include new data
          setTimeout(() => setZoomRange([0, Math.max(history.length - 1, 0)]), 0);
          
        } catch (error) {
          console.error('Error updating mood history:', error);
        }
      }
    };

    window.addEventListener('mood-updated', handleMoodUpdate);
    return () => window.removeEventListener('mood-updated', handleMoodUpdate);
  }, []);

  // Real-time appointment update listener
  useEffect(() => {
    const handleAppointmentUpdate = async () => {
      try {
        // Check if user is authenticated before making API calls
        const token = localStorage.getItem('token');
        if (!token) {
  
          return;
        }
        
        // Fetch fresh appointment data
        const freshAppointments = await getAppointments();
        setAppointments(Array.isArray(freshAppointments) ? freshAppointments : []);
        

      } catch (error) {
        console.error('Error updating appointments:', error);
      }
    };

    window.addEventListener('student-appointment-updated', handleAppointmentUpdate);
    return () => window.removeEventListener('student-appointment-updated', handleAppointmentUpdate);
  }, []);

  // Clamp zoom range to valid values
  useEffect(() => {
    const min = 0;
    const max = Math.max(moodHistory.length - 1, 1);
    let [start, end] = zoomRange;
    if (start > end) [start, end] = [end, start];
    if (start < min) start = min;
    if (end > max) end = max;
    if (end - start < 1) end = start + 1 <= max ? start + 1 : start;
    setZoomRange([start, end]);
  }, [moodHistory.length]);

  // Mouse wheel zoom handler
  const handleWheel = (e) => {
    if (moodHistory.length <= 7) return; // No zoom if not enough data
    e.preventDefault();
    const [start, end] = zoomRange;
    const minWindow = 3; // Minimum days to show
    const maxWindow = moodHistory.length - 1;
    let windowSize = end - start;
    if (e.deltaY < 0 && windowSize > minWindow) {
      // Zoom in
      setZoomRange([start + 1, end - 1]);
    } else if (e.deltaY > 0 && windowSize < maxWindow) {
      // Zoom out
      setZoomRange([
        Math.max(0, start - 1),
        Math.min(moodHistory.length - 1, end + 1)
      ]);
    }
  };

  // Slice data for zoom
  const zoomedMoodTrendData = moodHistory.slice(zoomRange[0], zoomRange[1] + 1).map(entry => ({
    date: entry.date,
    mood: getMoodNumeric(entry.mood)
  }));

  // Prepare data for the graph
  const moodTrendData = moodHistory.map(entry => ({
    date: entry.date,
    mood: getMoodNumeric(entry.mood)
  }));

  // Prepare percentage breakdown
  const moodCounts = { Happy: 0, Good: 0, Neutral: 0, Sad: 0, Angry: 0 };
  moodHistory.forEach(entry => {
    if (moodCounts[entry.mood] !== undefined) moodCounts[entry.mood]++;
  });
  const total = moodHistory.length || 1;
  const moodPercentages = moodList.map(mood => ({
    mood,
    percent: Math.round((moodCounts[mood] / total) * 100)
  }));

  // Always provide at least 2 data points for recharts
  let chartData = zoomedMoodTrendData.filter(d => d && (typeof d.mood === 'number' || d.mood === null) && d.date);
  if (chartData.length < 2) {
    chartData = [
      chartData[0] || { date: 'No Data', mood: null },
      { date: 'No Data', mood: null }
    ];
  }

  // Add mood submit handler
  const handleMoodSubmit = async () => {
    if (selectedMood === null) return;
    setLoading(true);
    const moodLabel = moodOptions[selectedMood].label.toLowerCase();
    try {
      await submitMood({ mood: moodLabel, note: moodNote });
      setTodayMood(moodLabel);
      setTodayNote(moodNote);
      
      // Dispatch real-time update event
      const moodUpdateEvent = new CustomEvent('mood-updated', {
        detail: {
          mood: moodLabel,
          note: moodNote,
          date: new Date().toISOString().slice(0, 10),
          type: 'mood-submitted'
        }
      });
      window.dispatchEvent(moodUpdateEvent);
      
    } catch (err) {
      alert("Failed to submit mood. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter, sort, and select only personal, upcoming, clinic/counselor appointments
  const filteredAppointments = appointments
    .filter(appt =>
      appt.status === 'upcoming' &&
      appt.provider && (appt.provider.role === 'clinic' || appt.provider.role === 'counselor') &&
      appt.client && appt.client.id === userId
    )
    .sort((a, b) => {
      // Combine date and time for comparison
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);
      return aDate - bDate;
    });

  // Reset to first batch when appointments change
  useEffect(() => { setAppointmentBatch(0); }, [filteredAppointments.length]);

  if (!isLoggedIn) return null;

  return (
    <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Top: Welcome and Action Buttons */}
      <div className="row align-items-center mb-4 px-4 pt-4">
        <div className="col-lg-7 col-12 mb-2 mb-lg-0 overflow-hidden">
          <h3 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '100%' }}>Welcome, Student {fullName || ""}!</h3>
        </div>
        <div className="col-lg-5 col-12 d-flex justify-content-lg-end justify-content-start gap-2 mt-lg-0 mt-2 flex-nowrap align-items-stretch">
          <button 
            className="btn btn-success d-flex align-items-center justify-content-center gap-2" 
            style={{ background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, padding: '8px 24px', fontSize: 15, height: 38, boxShadow: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setShowPermitModal(true)}
          >
            Request to leave classroom
          </button>
          <button className="btn btn-success d-flex align-items-center justify-content-center gap-2" style={{ borderRadius: 10, whiteSpace: 'nowrap', fontSize: 14, minWidth: 120, height: 38, padding: '4px 10px' }} onClick={() => setShowScheduleModal(true)}>
            <BsPlusLg size={16} /> Schedule Appointment
          </button>
        </div>
      </div>
      {/* Modal for scheduling appointment */}
      {showScheduleModal && (
        <ScheduleAppointmentModal
          show={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={(newAppt) => {
            setAppointments(prevAppts => [...prevAppts, newAppt]);
          }}
        />
      )}
      {/* Modal for permit to leave classroom */}
      {showPermitModal && (
        <PermitToLeaveModal
          show={showPermitModal}
          onClose={() => setShowPermitModal(false)}
          onSubmit={(permitData) => {
    
            // Modal will close automatically on successful submission
          }}
        />
      )}
      <div className="row g-4">
        {/* Left: Mood Check-in & Support Resources */}
        <div className="col-lg-7 d-flex flex-column gap-4">
          {/* Mood Check-in */}
          <DailyMoodCheckin
            moodOptions={moodOptions}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            moodNote={moodNote}
            setMoodNote={setMoodNote}
            loading={loading}
            moodLoading={moodLoading}
            todayMood={todayMood}
            todayNote={todayNote}
            handleMoodSubmit={handleMoodSubmit}
          />
          {/* Support Resources */}
          <div className="card shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-body p-3" style={{ background: '#fff', borderRadius: 16 }}>
              <div className="fw-bold fs-5 mb-1">Support Resources</div>
              <div className="mb-3" style={{ fontSize: 14, color: "#6c757d", marginBottom: 18, marginTop: 0 }}>Help is always available</div>
              <div className="mb-3 p-3" style={{ border: '1px solid #e9ecef', borderRadius: 12 }}>
                <div className="fw-semibold">School Counseling Services</div>
                <div className="text-muted small">Mon-Sat, 7AM-5PM</div>
                <a href="#" className="small" style={{ color: '#20bfa9', textDecoration: 'none', fontWeight: 600 }} onClick={e => { e.preventDefault(); setShowScheduleModal(true); }}>Schedule an appointment</a>
              </div>
              <div className="mb-3 p-3" style={{ border: '1px solid #e9ecef', borderRadius: 12 }}>
                <div className="fw-semibold">Crisis Text Line</div>
                <div className="text-muted small">Text HOME to 741741<br />24/7 Support</div>
              </div>
              <div className="p-3" style={{ border: '1px solid #e9ecef', borderRadius: 12 }}>
                <div className="fw-semibold">National Suicide Prevention Lifeline</div>
                <div className="text-muted small">968<br />24/7 Support</div>
              </div>
            </div>
          </div>
        </div>
        {/* Right: Appointments & Achievements */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          {/* Upcoming Appointments - Redesigned */}
          <div className="shadow-sm" style={{ borderRadius: 16, background: "#e6f7ec", border: '2px solid #43c463' }}>
            <div className="p-4">
              <div className="fw-bold fs-5 mb-2">Upcoming Appointment</div>
              <div className="mb-3" style={{ fontSize: 14, color: "#6c757d", marginBottom: 18, marginTop: 0 }}>Your scheduled health appointments</div>
              <div className="d-flex flex-column gap-3">
                {filteredAppointments.slice(appointmentBatch * batchSize, (appointmentBatch + 1) * batchSize).map((appt, idx) => {
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
              </div>
              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setAppointmentBatch(b => b + 1)}
                disabled={((appointmentBatch + 1) * batchSize) >= filteredAppointments.length}
              >
                View More Appointments
              </button>
            </div>
          </div>
          {/* Top right buttons */}
          <div className="d-flex gap-2 justify-content-end mt-2">
            {/* Buttons moved to top, so this is now empty or can be removed */}
          </div>
        </div>
      </div>
    </div>
  );
}