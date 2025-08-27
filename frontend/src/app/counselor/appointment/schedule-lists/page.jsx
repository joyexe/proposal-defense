"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ManageAvailability from "../availability/page";
import { getStudents, getProviders, getProviderAvailableTimes, createAppointment, getAppointments, getUserProfile, markAppointmentCompleted, markAppointmentInProgress, cancelAppointment } from '../../../utils/api';

const typeOptions = ["Client Type", "Student", "Faculty"];
const statusOptions = ["Status", "Upcoming", "Completed", "Cancelled", "In Progress"];

function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

function getTypeBadge(type) {
  if (type === "Student") return <span style={{ background: "#2196f3", color: "#fff", borderRadius: 12, padding: "2px 16px", fontSize: 14, fontWeight: 500 }}>Student</span>;
  if (type === "Faculty") return <span style={{ background: "#a21caf", color: "#fff", borderRadius: 12, padding: "2px 16px", fontSize: 14, fontWeight: 500 }}>Faculty</span>;
  return <span>{type}</span>;
}

function getStatusBadge(status) {
  if (!status) return <span>-</span>;
  const styleBase = {
    borderRadius: 12,
    padding: '2px 12px',
    fontSize: 14,
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
  if (status.toLowerCase() === 'upcoming') {
    return <span style={{ ...styleBase, background: '#fff', color: '#222', border: '1px solid #bbb' }}>Upcoming</span>;
  }
  if (status.toLowerCase() === 'completed') {
    return <span style={{ ...styleBase, background: '#bbf7d0', color: '#16a34a', border: '1px solid #bbf7d0' }}><span style={{ fontWeight: 700, fontSize: 16 }}>✓</span> Completed</span>;
  }
  if (status.toLowerCase() === 'cancelled') {
    return <span style={{ ...styleBase, background: '#fecaca', color: '#e11d48', border: '1px solid #fecaca' }}><span style={{ fontWeight: 700, fontSize: 16 }}>✗</span> Cancelled</span>;
  }
  if (status.toLowerCase() === 'in_progress' || status.toLowerCase() === 'in progress') {
    return <span style={{ ...styleBase, background: '#dbeafe', color: '#2563eb', border: '1px solid #dbeafe' }}><span style={{ fontSize: 16, fontWeight: 700 }}>•</span> In Progress</span>;
  }
  return <span style={styleBase}>{status}</span>;
}

function getServiceTypeBadge(type) {
  if (!type) return <span>-</span>;
  if (type.toLowerCase() === 'mental' || type === 'Mental Health') return <span style={{ background: '#99f6e4', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
  if (type.toLowerCase() === 'physical' || type === 'Physical Health') return <span style={{ background: '#bbf7d0', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Physical Health</span>;
  return <span>{type}</span>;
}

export default function CounselorScheduleListsPage() {
  const [type, setType] = useState("Type");
  const [status, setStatus] = useState("Status");
  const [viewedAppointment, setViewedAppointment] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const modalRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [view, setView] = useState("list");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [newNotes, setNewNotes] = useState("");

  const filtered = appointments.filter(appt =>
    (type === "Client Type" || (type === "Student" && appt.client && appt.client.role === 'student') || (type === "Faculty" && appt.client && appt.client.role === 'faculty') || type === "Type") &&
    (status === "Status" || (status === "Upcoming" && appt.status && appt.status.toLowerCase() === 'upcoming') || (status === "Completed" && appt.status && appt.status.toLowerCase() === 'completed') || (status === "Cancelled" && appt.status && appt.status.toLowerCase() === 'cancelled') || (status === "In Progress" && (appt.status && (appt.status.toLowerCase() === 'in_progress' || appt.status.toLowerCase() === 'in progress'))))
  );

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;
  
  // Sort appointments by date and time in reverse chronological order (latest first)
  const sortedAppointments = filtered
    .slice()
    .sort((a, b) => {
      // Combine date and time for comparison - reverse chronological order (latest first)
      const aDate = new Date(`${a.date}T${a.time}`);
      const bDate = new Date(`${b.date}T${b.time}`);
      return bDate - aDate; // Reverse order: latest first
    });
  
  const totalPages = Math.ceil(sortedAppointments.length / appointmentsPerPage);
  const paginatedAppointments = getPagedData(sortedAppointments, currentPage, appointmentsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => {
    setLoading(true);
    getAppointments()
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getUserProfile().then(setUserProfile);
  }, []);

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

  function to12Hour(time) {
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  const handleStatusUpdate = async (action, appt) => {
    if (!appt) return;
    try {
      if (action === 'completed') {
        await markAppointmentCompleted(appt.id);
      } else if (action === 'in_progress') {
        await markAppointmentInProgress(appt.id);
      } else if (action === 'cancelled') {
        await cancelAppointment(appt.id);
      }
      // Refresh appointments
      const updatedAppointments = await getAppointments();
      setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
      // Dispatch real-time update event
      window.dispatchEvent(new Event('counselor-appointment-updated'));
      // Close modal
      setViewedAppointment(null);
    } catch (err) {
      alert('Failed to update status. Please try again.');
    }
  };

  const handleSaveNotes = async () => {
    if (!viewedAppointment) return;
    try {
      await handleStatusUpdate('completed', viewedAppointment);
      const updatedAppointments = await getAppointments();
      setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
      window.dispatchEvent(new Event('counselor-appointment-updated'));
      setShowAddNotesModal(false);
    } catch (err) {
      alert('Failed to save notes. Please try again.');
    }
  };

  return (
    <div className="w-100" style={{ minHeight: '100vh', background: '#f8fafc', minWidth: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold text-black" style={{ fontSize: 22 }}>Appointments</span>
          <div className="text-muted" style={{ fontSize: 14 }}>Schedule and manage your appointments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success px-4 py-2 fw-semibold" style={{ borderRadius: 8, background: '#14b8a6', color: '#fff', border: 'none' }} onClick={() => setShowReferModal(true)}>Refer a student</button>
        </div>
      </div>
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
        <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
          onClick={() => router.push('/counselor/appointment')}
        >
          Calendar
        </button>
          </li>
          <li className="nav-item flex-fill">
        <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment/availability' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }}
          onClick={() => router.push('/counselor/appointment/availability')}
        >
          Manage Availability
        </button>
          </li>
          <li className="nav-item flex-fill">
        <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment/schedule-lists' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
          onClick={() => router.push('/counselor/appointment/schedule-lists')}
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
      {view === 'availability' && (
        <ManageAvailability />
      )}
      {view === 'list' && (
        <div className="bg-white rounded shadow-sm p-4" style={{ borderRadius: 16, marginTop: 0, minHeight: 350 }}>
          <div className="fw-bold mb-1" style={{ fontSize: 20 }}>All Appointments</div>
          <div className="text-muted mb-3" style={{ fontSize: 14 }}>Your scheduled appointments</div>
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ border: 'none' }}>Client</th>
                  <th style={{ border: 'none' }}>Provider</th>
                  <th style={{ border: 'none' }}>Date & Time</th>
                  <th style={{ border: 'none' }}>Type</th>
                  <th style={{ border: 'none' }}>Status</th>
                  <th style={{ border: 'none' }}>Referral</th>
                  <th style={{ border: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4" style={{ border: 'none' }}>No appointments found.</td></tr>
                ) : (
                  paginatedAppointments.map((appt, idx) => (
                    <tr key={idx}>
                      <td style={{ border: 'none' }}>{appt.client && typeof appt.client === 'object' && appt.client.full_name ? `${appt.client.role ? (appt.client.role.toLowerCase() === 'clinic' ? 'Nurse ' : appt.client.role.toLowerCase() === 'faculty' ? 'Teacher ' : appt.client.role.charAt(0).toUpperCase() + appt.client.role.slice(1) + ' ') : ''}${appt.client.full_name}` : (typeof appt.client === 'string' ? appt.client : 'Unknown')}</td>
                      <td style={{ border: 'none' }}>{appt.provider && typeof appt.provider === 'object' && appt.provider.full_name ? `${appt.provider.role ? (appt.provider.role.toLowerCase() === 'clinic' ? 'Nurse ' : appt.provider.role.charAt(0).toUpperCase() + appt.provider.role.slice(1) + ' ') : ''}${appt.provider.full_name}` : (typeof appt.provider === 'string' ? appt.provider : 'Unknown')}</td>
                      <td style={{ border: 'none' }}>
                        <div style={{ fontSize: 14 }}>
                          {appt.date ? new Date(appt.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {appt.time ? to12Hour(appt.time) : '-'}
                        </div>
                      </td>
                      <td style={{ border: 'none' }}>{getServiceTypeBadge(appt.service_type ? (appt.service_type.toLowerCase() === 'physical' ? 'Physical Health' : appt.service_type.toLowerCase() === 'mental' ? 'Mental Health' : appt.service_type) : '')}</td>
                      <td style={{ border: 'none' }}>{getStatusBadge(appt.status)}</td>
                      <td style={{ border: 'none' }}>
                        {(() => {
                          if (!appt.created_by || typeof appt.created_by !== 'object' || !userProfile) return '';
                          const isDirect = userProfile.role === 'counselor' && String(appt.created_by.id) === String(userProfile.id);
                          if (isDirect) return 'Direct';
                          let role = '';
                          if (appt.created_by.role) {
                            if (appt.created_by.role.toLowerCase() === 'clinic') role = 'Nurse';
                            else if (appt.created_by.role.toLowerCase() === 'faculty') role = 'Teacher';
                            else if (appt.created_by.role.toLowerCase() === 'student') role = 'Student';
                            else role = appt.created_by.role.charAt(0).toUpperCase() + appt.created_by.role.slice(1);
                          }
                          return `From ${role}${appt.created_by.full_name ? ' ' + appt.created_by.full_name : ''}`;
                        })()}
                      </td>
                      <td style={{ border: 'none' }}>
                        <button className="btn btn-sm" style={{ borderRadius: 8, fontWeight: 500, fontSize: 14, background: '#22c55e', color: '#fff' }} onClick={() => setViewedAppointment(appt)}>View</button>
                      </td>
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
      )}
      {viewedAppointment && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
              <div className="mb-3">
                <span className="fw-bold" style={{ fontSize: 20 }}>
                  {viewedAppointment.service_type && (viewedAppointment.service_type.toLowerCase() === 'physical'
                    ? 'Annual Physical'
                    : viewedAppointment.service_type.toLowerCase() === 'mental'
                      ? 'Annual Mental Health'
                      : 'Appointment')}
                </span>
                <div className="text-muted" style={{ fontSize: 15 }}>Complete information about this appointment</div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div style={{ fontSize: 14 }}>
                    <span style={{ background: '#fef9c3', borderRadius: '50%', width: 24, height: 24, display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }}></span>
                    {viewedAppointment.client && typeof viewedAppointment.client === 'object' && viewedAppointment.client.full_name
                      ? `${viewedAppointment.client.role ? (viewedAppointment.client.role.toLowerCase() === 'clinic' ? 'Nurse ' : viewedAppointment.client.role.toLowerCase() === 'faculty' ? 'Teacher ' : viewedAppointment.client.role.charAt(0).toUpperCase() + viewedAppointment.client.role.slice(1) + ' ') : ''}${viewedAppointment.client.full_name}`
                      : (typeof viewedAppointment.client === 'string' ? viewedAppointment.client : 'Unknown')}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Provider</div>
                  <div style={{ fontSize: 14 }}>
                    {viewedAppointment.provider && typeof viewedAppointment.provider === 'object' && viewedAppointment.provider.full_name
                      ? `${viewedAppointment.provider.role ? (viewedAppointment.provider.role.toLowerCase() === 'clinic' ? 'Nurse ' : viewedAppointment.provider.role.charAt(0).toUpperCase() + viewedAppointment.provider.role.slice(1) + ' ') : ''}${viewedAppointment.provider.full_name}`
                      : (typeof viewedAppointment.provider === 'string' ? viewedAppointment.provider : 'Unknown')}
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-calendar-event me-2"></i>{viewedAppointment.date ? new Date(viewedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-clock me-2"></i>{viewedAppointment.time ? to12Hour(viewedAppointment.time) : '-'}</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>{getServiceTypeBadge(viewedAppointment.service_type ? (viewedAppointment.service_type.toLowerCase() === 'physical' ? 'Physical Health' : viewedAppointment.service_type.toLowerCase() === 'mental' ? 'Mental Health' : viewedAppointment.service_type) : '')}</div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Status</div>
                  <div>{getStatusBadge(viewedAppointment.status)}</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Referral</div>
                  <div style={{ fontSize: 14 }}>{(() => {
                    if (!viewedAppointment.created_by || typeof viewedAppointment.created_by !== 'object' || !userProfile) return '';
                    const isDirect = userProfile.role === 'counselor' && String(viewedAppointment.created_by.id) === String(userProfile.id);
                    if (isDirect) return 'Direct';
                    let role = '';
                    if (viewedAppointment.created_by.role) {
                      if (viewedAppointment.created_by.role.toLowerCase() === 'clinic') role = 'Nurse';
                      else if (viewedAppointment.created_by.role.toLowerCase() === 'faculty') role = 'Teacher';
                      else if (viewedAppointment.created_by.role.toLowerCase() === 'student') role = 'Student';
                      else role = viewedAppointment.created_by.role.charAt(0).toUpperCase() + viewedAppointment.created_by.role.slice(1);
                    }
                    return `From ${role}${viewedAppointment.created_by.full_name ? ' ' + viewedAppointment.created_by.full_name : ''}`;
                  })()}</div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Location</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-geo-alt me-2"></i>Counseling Office, Room 2</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Contact Information</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-envelope me-2"></i>
                    {viewedAppointment.client && typeof viewedAppointment.client === 'object' && viewedAppointment.client.email
                      ? viewedAppointment.client.email
                      : 'No email available'}
                  </div>
                </div>
              </div>
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
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setViewedAppointment(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Schedule a New Appointment</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Select your provider, date, and time.</div>
              <form onSubmit={e => { e.preventDefault(); setShowModal(false); }}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Provider</label>
                  <select className="form-select" value={provider} onChange={e => setProvider(e.target.value)} required>
                    <option value="">Select a provider</option>
                    <option value="Counselor">Counselor</option>
                    <option value="Clinic">Clinic</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date</label>
                  <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Time</label>
                  <select className="form-select" value={time} onChange={e => setTime(e.target.value)} required>
                    <option value="">Select a time slot</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Notes</label>
                  <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes for the provider" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4">Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showReferModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Refer Student</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Refer a student to nurse or counselor</div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={async e => {
                e.preventDefault();
                setError(null);
                try {
                  // Find selected student and provider objects
                  const studentObj = students.find(s => s.full_name === referStudentName);
                  const providerObj = providers.find(p => String(p.id) === String(referTo));
                  if (!studentObj || !providerObj) throw new Error('Please select a valid student and provider.');
                  let serviceType = '';
                  if (providerObj.role === 'clinic') serviceType = 'physical';
                  else if (providerObj.role === 'counselor') serviceType = 'mental';
                  // Always send date as YYYY-MM-DD string (no Date object)
                  const safeDate = referDate;
                  await createAppointment({
                    provider_id: providerObj.id,
                    client_id: studentObj.id,
                    date: safeDate, // always YYYY-MM-DD
                    time: referTime,
                    reason: referNotes,
                    service_type: serviceType,
                    referral: 'Direct'
                  });
                  // Real-time update: fetch latest appointments and update state
                  const updatedAppointments = await getAppointments();
                  setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
                  setShowReferModal(false);
                  window.dispatchEvent(new Event('counselor-appointment-updated'));
                } catch (err) {
                  setError(err.message || 'Failed to send referral.');
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
      {showAddNotesModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Add Notes</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Add notes for this appointment.</div>
              <form onSubmit={async e => {
                e.preventDefault();
                await handleSaveNotes();
              }}>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Notes</label>
                  <input type="text" className="form-control" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Enter notes here" required />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowAddNotesModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4" style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }}>Save Notes</button>
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



