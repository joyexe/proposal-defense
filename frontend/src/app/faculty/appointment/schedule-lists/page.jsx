"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProviders, getProviderAvailableTimes, getStudents, getUserProfile, getAppointments, createAppointment } from "../../../utils/api";

const typeOptions = ["Type", "Physical Health", "Mental Health"];
const statusOptions = ["Status", "Upcoming", "Completed", "Cancelled", "In Progress"];

// Helper function for pagination (same as admin logs)
function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

function stripSeconds(time) {
  return time && typeof time === 'string' ? time.split(':').slice(0,2).join(':') : '';
}

function to12Hour(time) {
  if (!time) return '';
  let [h, m] = time.split(':');
  h = parseInt(h, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
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

function getProviderNameAndRole(appt, providers) {
  let provider = appt.provider;
  if (provider && typeof provider === 'object') {
    const name = provider.full_name || 'Provider';
    if (provider.role === 'clinic') return `Nurse ${name}`;
    if (provider.role === 'counselor') return `Counselor ${name}`;
    const role = provider.role ? provider.role.charAt(0).toUpperCase() + provider.role.slice(1) : '';
    return `${name}${role ? ' (' + role + ')' : ''}`;
  }
  // Try to find in providers list
  const found = providers && providers.find(p => String(p.id) === String(appt.provider_id));
  if (found) {
    const name = found.full_name || 'Provider';
    if (found.role === 'clinic') return `Nurse ${name}`;
    if (found.role === 'counselor') return `Counselor ${name}`;
    const role = found.role ? found.role.charAt(0).toUpperCase() + found.role.slice(1) : '';
    return `${name}${role ? ' (' + role + ')' : ''}`;
  }
  return typeof provider === 'string' ? provider : 'Provider';
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

export default function FacultyScheduleListsPage() {
  const [type, setType] = useState("Type");
  const [status, setStatus] = useState("Status");
  const [viewedAppointment, setViewedAppointment] = useState(null);
  const router = useRouter();
  const modalRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [referError, setReferError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAppointments()
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message || 'Failed to load appointments.'))
      .finally(() => setLoading(false));
    getProviders().then(setProviders);
    getUserProfile().then(setUserProfile);
  }, []);

  // Filtering and pagination logic (same as student)
  const filtered = appointments.filter(appt =>
    (type === "Type" || (type === "Physical Health" && appt.service_type && (appt.service_type.toLowerCase() === 'physical' || appt.service_type === 'Physical Health')) || (type === "Mental Health" && appt.service_type && (appt.service_type.toLowerCase() === 'mental' || appt.service_type === 'Mental Health'))) &&
    (status === "Status" || (status === "Upcoming" && appt.status && appt.status.toLowerCase() === 'upcoming') || (status === "Completed" && appt.status && appt.status.toLowerCase() === 'completed') || (status === "Cancelled" && appt.status && appt.status.toLowerCase() === 'cancelled') || (status === "In Progress" && (appt.status && (appt.status.toLowerCase() === 'in_progress' || appt.status.toLowerCase() === 'in progress'))))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;

  const handlePageChange = (page) => {
    const totalPages = Math.ceil(filtered.length / appointmentsPerPage);
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

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

  function handleStudentSearch(e) {
    const val = e.target.value.toLowerCase();
    setReferStudentName(val);
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val)));
  }

  function addAndSortAppointment(newAppt) {
    setAppointments(prev => {
      const updated = [...prev, newAppt];
      return updated.sort((a, b) => {
        // Sort by date descending, then time descending
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
    });
  }

  return (
    <div className="w-100" style={{ minHeight: '100vh', background: '#f8fafc', minWidth: 0 }}>
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
      {/* Tab Bar */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border bg-light text-dark`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              onClick={() => router.push('/faculty/appointment')}
              type="button"
            >
              Calendar
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border bg-success text-white`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              type="button"
            >
              List of Schedules
            </button>
          </li>
        </ul>
      </div>
      <div className="d-flex align-items-center mb-3" style={{ gap: 16 }}>
        <div style={{ position: 'relative', width: 180 }}>
          <select
            id="type-select"
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }}
          >
            {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
        <div style={{ position: 'relative', width: 180 }}>
          <select
            id="status-select"
            className="form-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }}
          >
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
      </div>
      <div className="bg-white rounded shadow-sm p-4" style={{ borderRadius: 16, marginTop: 0, minHeight: 350 }}>
        <div className="fw-bold mb-1" style={{ fontSize: 20 }}>All Appointments</div>
        <div className="text-muted mb-3" style={{ fontSize: 14 }}>Your scheduled appointments</div>
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ border: 'none' }}>Provider</th>
                <th style={{ border: 'none' }}>Date & Time</th>
                <th style={{ border: 'none' }}>Type</th>
                <th style={{ border: 'none' }}>Status</th>
                <th style={{ border: 'none' }}>Referral</th>
                <th style={{ border: 'none' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalPages = Math.ceil(filtered.length / appointmentsPerPage);
                const sortedAppointments = filtered
                  .slice()
                  .sort((a, b) => {
                    // Combine date and time for comparison - reverse chronological order (latest first)
                    const aDate = new Date(`${a.date}T${a.time}`);
                    const bDate = new Date(`${b.date}T${b.time}`);
                    return bDate - aDate; // Reverse order: latest first
                  });
                const pagedAppointments = getPagedData(sortedAppointments, currentPage, appointmentsPerPage);
                return pagedAppointments.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-4" style={{ border: 'none' }}>No appointments found.</td></tr>
              ) : (
                  pagedAppointments
                  .map((appt, idx) => {
                    return (
                  <tr key={idx}>
                        <td style={{ border: 'none' }}>{getProviderNameAndRole(appt, providers)}</td>
                        <td style={{ border: 'none' }}>
                          <div style={{ fontSize: 14 }}>
                            {appt.date ? new Date(appt.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            {appt.time ? to12Hour(appt.time) : '-'}
                          </div>
                        </td>
                        <td style={{ border: 'none' }}>{getTypeBadge(getTypeLabel(appt))}</td>
                    <td style={{ border: 'none' }}>{getStatusBadge(appt.status)}</td>
                        <td style={{ border: 'none' }}>{getReferralLabel(appt, userProfile?.id)}</td>
                    <td style={{ border: 'none' }}>
                      <button className="btn btn-sm" style={{ borderRadius: 8, fontWeight: 500, fontSize: 14, background: '#22c55e', color: '#fff' }} onClick={() => setViewedAppointment(appt)}>View</button>
                    </td>
                  </tr>
                    );
                  })
                );
              })()}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {(() => {
          const totalPages = Math.ceil(filtered.length / appointmentsPerPage);
          return totalPages > 1 ? (
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
          ) : null;
        })()}
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
      {/* Modal for viewing appointment details */}
      {viewedAppointment && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
              <div className="mb-3">
                <span className="fw-bold" style={{ fontSize: 20 }}>{getTypeLabel(viewedAppointment) === 'Physical Health' ? 'Annual Physical' : 'Annual Mental Health'}</span>
                <div className="text-muted" style={{ fontSize: 15 }}>Appointment details and information</div>
              </div>
              {/* Provider */}
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
                    {getProviderNameAndRole(viewedAppointment, providers)}
                  </div>
                </div>
                {/* Type */}
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>{getTypeBadge(getTypeLabel(viewedAppointment))}</div>
                </div>
              </div>
              {/* Date & Time and Status */}
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-calendar-event me-2"></i>{viewedAppointment.date ? new Date(viewedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-clock me-2"></i>{viewedAppointment.time ? to12Hour(stripSeconds(viewedAppointment.time)) : '-'}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Status</div>
                  <div>{getStatusBadge(viewedAppointment.status)}</div>
                </div>
              </div>
              {/* Referral */}
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Referral</div>
                  <div style={{ fontSize: 14 }}>{getReferralLabel(viewedAppointment, userProfile?.id)}</div>
                </div>
                {/* Location */}
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
                      let provider = viewedAppointment.provider;
                      if (provider && typeof provider === 'object' && provider.email) return provider.email;
                      const found = providers && providers.find(p => String(p.id) === String(viewedAppointment.provider_id));
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
                  {viewedAppointment.reason
                    ? viewedAppointment.reason.split('\n').map((line, idx) => (
                          <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'No reason provided.'}
                </div>
              </div>
              {/* Documentation */}
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Documentation</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 80 }}>
                  {viewedAppointment.documentation
                    ? viewedAppointment.documentation.split('\n').map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'Provider\'s documentation for this appointment is not yet completed.'}
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setViewedAppointment(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <ScheduleAppointmentModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onScheduled={addAndSortAppointment}
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
                    referral: 'Direct'
                  });
                  addAndSortAppointment(newAppt);
                  setShowReferModal(false);
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
      `}</style>
    </div>
  );
}