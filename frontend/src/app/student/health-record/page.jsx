"use client";

import React, { useState, useRef, useEffect } from "react";
import { BsGear, BsBell, BsChatDots } from "react-icons/bs";
import "bootstrap/dist/css/bootstrap.min.css";
import { getUserProfile, getProviders, getTeachers, createPermitRequest, getPermitRequests } from "../../utils/api";

// Helper function to format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Helper function to format date for table (long month format)
const formatTableDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Helper function to format time
const formatTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Permit to leave classroom modal component (copied from dashboard)
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

  React.useEffect(() => {
    if (show) {
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

export default function HealthRecordPage() {
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [permitRequests, setPermitRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Modal state for View button
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [vitalSigns, setVitalSigns] = useState({
    bp: '',
    temp: '',
    pr: '',
    spo2: ''
  });
  const [nursingIntervention, setNursingIntervention] = useState('');
  const [outcome, setOutcome] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const modalRef = useRef(null);

  const handleViewClick = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    
    // If request is completed, populate with existing data for clinic-style modal
    if (request.status === 'completed') {
      // Assessment data is stored directly in the request object
      setVitalSigns({
        bp: request.vital_signs_bp || '',
        temp: request.vital_signs_temp || '',
        pr: request.vital_signs_pr || '',
        spo2: request.vital_signs_spo2 || ''
      });
      setNursingIntervention(request.nursing_intervention || '');
      setOutcome(request.outcome || '');
      setSelectedDate(request.outcome_date || '');
      setSelectedTime(request.outcome_time || '');
      setParentEmail(request.parent_email || request.student?.guardian_email || '');
    } else {
      // Reset form data for non-completed requests
      setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
      setNursingIntervention('');
      setOutcome('');
      setSelectedDate('');
      setSelectedTime('');
      setParentEmail('');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
    setNursingIntervention('');
    setOutcome('');
    setSelectedDate('');
    setSelectedTime('');
    setParentEmail('');
  };

  // Check if the request has already been completed
  const isRequestCompleted = selectedRequest && selectedRequest.status === 'completed';

  // Custom CSS for radio button accent color
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input[type="radio"]:checked {
        accent-color: #22c55e !important;
        color: #22c55e !important;
        background-color: #22c55e !important;
      }
      input[type="radio"]:checked::before {
        background-color: #22c55e !important;
      }
      input[type="radio"]:checked::after {
        background-color: #22c55e !important;
      }
      .modal-footer .btn {
        color: #000 !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Load user profile and permit requests
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user profile first
        const profile = await getUserProfile();
        setUserProfile(profile);
        
        // Load permit requests for the current student
        const data = await getPermitRequests();
        // Filter to show only the current student's requests
        const studentRequests = data.filter(req => req.student?.id === profile.id);
        setPermitRequests(studentRequests);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(permitRequests.length / rowsPerPage);
  const paginatedRequests = permitRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handlePermitSubmit = (permitData) => {
    
    // Refresh the permit requests list
    getPermitRequests().then(data => {
      const studentRequests = data.filter(req => req.student?.id === userProfile?.id);
      setPermitRequests(studentRequests);
    });
  };

  if (loading) {
    return (
      <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh" }}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh" }}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
          <div className="text-center">
            <div className="text-danger mb-3">{error}</div>
            <button className="btn btn-success" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Main Content Area */}
      <div className="col-12 p-0">
        {/* Content Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="fw-bold text-black" style={{ fontSize: 22 }}>Permit to leave the classroom & Go Home Form</span>
            <div className="text-muted" style={{ fontSize: 14 }}>View your health records</div>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-success d-flex align-items-center justify-content-center gap-2" 
              style={{ background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, padding: '8px 24px', fontSize: 15, height: 38, boxShadow: 'none', whiteSpace: 'nowrap' }}
              onClick={() => setShowPermitModal(true)}
            >
              Request to leave classroom
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="d-flex align-items-center mb-3" style={{ gap: 16, maxWidth: 900 }}>
          <div style={{ position: 'relative', width: 180 }}>
            <select className="form-select" style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }}>
              <option>Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Denied</option>
              <option>Completed</option>
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
              <i className="bi bi-chevron-down"></i>
            </span>
          </div>
          <div style={{ position: 'relative', width: 180 }}>
            <select className="form-select" style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }}>
              <option>Date</option>
              <option>June 23, 2025</option>
              <option>June 24, 2025</option>
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
              <i className="bi bi-chevron-down"></i>
            </span>
          </div>
        </div>

        {/* All Permit Requests Card */}
        <div className="bg-white rounded shadow-sm p-4" style={{ borderRadius: 16, marginTop: 0, minHeight: 350, paddingRight: 0 }}>
          <div className="fw-bold mb-1" style={{ fontSize: 20 }}>All Permit Requests</div>
          <div className="text-muted mb-3" style={{ fontSize: 14 }}>View and manage all your requests to leave the classroom for health-related concerns</div>
          <div className="table-responsive" style={{ paddingRight: 0 }}>
            <table className="table align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0, marginRight: 0 }}>
              <thead>
                <tr>
                  <th style={{ border: 'none' }}>Date & Time</th>
                  <th style={{ border: 'none' }}>Grade</th>
                  <th style={{ border: 'none' }}>Section</th>
                  <th style={{ border: 'none' }}>Reason</th>
                  <th style={{ border: 'none' }}>Status</th>
                  <th style={{ border: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-4" style={{ border: 'none' }}>No permit requests found.</td></tr>
                ) : (
                  paginatedRequests.map((req, idx) => (
                    <tr key={idx}>
                      <td style={{ border: 'none' }}>
                        <div style={{ fontSize: 14 }}>{formatTableDate(req.date)}</div>
                        <div style={{ fontSize: 14 }}>{formatTime(req.time)}</div>
                      </td>
                      <td style={{ border: 'none' }}>{req.grade}</td>
                      <td style={{ border: 'none' }}>{req.section}</td>
                      <td style={{ border: 'none' }}>{req.reason}</td>
                      <td style={{ border: 'none' }}>
                        {req.status === 'pending' ? (
                          <span style={{
                            background: '#fff7c2',
                            color: '#e6b800',
                            borderRadius: 9999,
                            padding: '4px 22px',
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'inline-block',
                            minWidth: 90,
                            textAlign: 'center',
                            border: 'none',
                            boxShadow: 'none',
                            letterSpacing: 0.2,
                          }}>Pending</span>
                        ) : req.status === 'approved' ? (
                          <span style={{
                            background: '#d2f8df',
                            color: '#2eaf6a',
                            borderRadius: 9999,
                            padding: '4px 22px',
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 110,
                            textAlign: 'center',
                            border: 'none',
                            boxShadow: 'none',
                            letterSpacing: 0.2,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 4 }}>
                              <circle cx="8" cy="8" r="8" fill="#b6eccb"/>
                              <path d="M5.5 8.5L7.5 10.5L11 7" stroke="#2eaf6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Approved
                          </span>
                        ) : req.status === 'denied' ? (
                          <span style={{
                            background: '#fff7c2',
                            color: '#e6b800',
                            borderRadius: 9999,
                            padding: '4px 22px',
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'inline-block',
                            minWidth: 90,
                            textAlign: 'center',
                            border: 'none',
                            boxShadow: 'none',
                            letterSpacing: 0.2,
                          }}>Denied</span>
                        ) : (
                          <span style={{
                            background: '#d2f8df',
                            color: '#2eaf6a',
                            borderRadius: 9999,
                            padding: '4px 22px',
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 110,
                            textAlign: 'center',
                            border: 'none',
                            boxShadow: 'none',
                            letterSpacing: 0.2,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 4 }}>
                              <circle cx="8" cy="8" r="8" fill="#b6eccb"/>
                              <path d="M5.5 8.5L7.5 10.5L11 7" stroke="#2eaf6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Completed
                          </span>
                        )}
                      </td>
                      <td style={{ border: 'none' }}>
                        <button 
                          className="btn btn-sm" 
                          style={{ borderRadius: 8, fontWeight: 500, fontSize: 14, background: '#22c55e', color: '#fff' }}
                          onClick={() => handleViewClick(req)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
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

        {showPermitModal && (
          <PermitToLeaveModal
            show={showPermitModal}
            onClose={() => setShowPermitModal(false)}
            onSubmit={handlePermitSubmit}
          />
        )}

        {showModal && selectedRequest && (
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
            {isRequestCompleted ? (
              // Clinic-style detailed assessment modal for completed requests
              <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 900, width: "100%" }} ref={modalRef}>
                <div className="modal-content" style={{ 
                  borderRadius: 12, 
                  boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
                  border: "1px solid #e0e0e0"
                }}>
                  {/* Modal Header */}
                  <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
                    <h5 className="modal-title fw-bold" style={{ fontSize: 20, color: "#333" }}>
                      {outcome === 'send_home' ? 'Go Home Form' : 'Permit to leave the classroom'}
                    </h5>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="modal-body" style={{ padding: "20px 24px" }}>
                    <div style={{ 
                      border: "1px solid #e9ecef",
                      borderRadius: 8,
                      padding: "20px",
                      background: "#ffffff"
                    }}>
                      {/* Request Details - Two Column Layout */}
                      <div className="row mb-4">
                        <div className="col-md-6 mb-3">
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Date:</span>
                            <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatDate(selectedRequest.date)}</span>
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '120px' }}>Grade:</span>
                            <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.grade}</span>
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Time:</span>
                            <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatTime(selectedRequest.time)}</span>
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Reason:</span>
                            <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.reason}</span>
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Name:</span>
                            <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.student?.full_name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Vital Signs & Nursing Intervention - Two Column Layout */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                              Vital Sign:
                            </label>
                            {/* Two column layout for vital signs */}
                            <div className="row">
                              <div className="col-6">
                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>BP</label>
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={vitalSigns.bp}
                                    style={{ fontSize: "12px", borderRadius: 4 }}
                                    readOnly
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>TEMP</label>
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={vitalSigns.temp}
                                    style={{ fontSize: "12px", borderRadius: 4 }}
                                    readOnly
                                  />
                                </div>
                              </div>
                              <div className="col-6">
                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>PR</label>
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={vitalSigns.pr}
                                    style={{ fontSize: "12px", borderRadius: 4 }}
                                    readOnly
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>SpO2</label>
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={vitalSigns.spo2}
                                    style={{ fontSize: "12px", borderRadius: 4 }}
                                    readOnly
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                              Nursing Intervention:
                            </label>
                            <textarea 
                              className="form-control" 
                              rows="4" 
                              value={nursingIntervention}
                              style={{ 
                                borderColor: "#e0e0e0", 
                                borderRadius: 8, 
                                fontSize: 14,
                                resize: "none"
                              }}
                              readOnly
                            ></textarea>
                          </div>
                        </div>
                      </div>

                      {/* Outcome Section - Horizontal Layout */}
                      <div className="mb-4">
                        <label style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                          Outcome:
                        </label>
                        {/* Date and Time fields first */}
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>Date</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={selectedDate ? formatDate(selectedDate) : ''}
                              style={{ fontSize: "12px", borderRadius: 4 }}
                              readOnly
                            />
                          </div>
                          <div className="col-md-6">
                            <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>Time</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={selectedTime ? formatTime(selectedTime) : ''}
                              style={{ fontSize: "12px", borderRadius: 4 }}
                              readOnly
                            />
                          </div>
                        </div>
                        
                        {/* Radio buttons for outcome options */}
                        <div className="row">
                          <div className="col-md-6">
                            <div className="d-flex align-items-center">
                              <div 
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: '2px solid #666',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: outcome === 'back_to_class' ? '#22c55e' : 'transparent',
                                  position: 'relative',
                                  top: '-2px',
                                  marginRight: '8px'
                                }}
                              >
                                {outcome === 'back_to_class' && (
                                  <div style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                  }} />
                                )}
                              </div>
                              <label 
                                style={{ 
                                  fontSize: "14px", 
                                  color: "#333", 
                                  marginBottom: 0
                                }}
                              >
                                Back to Class
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="d-flex align-items-center">
                              <div 
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: '2px solid #666',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: outcome === 'send_home' ? '#22c55e' : 'transparent',
                                  position: 'relative',
                                  top: '-2px',
                                  marginRight: '8px'
                                }}
                              >
                                {outcome === 'send_home' && (
                                  <div style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                  }} />
                                )}
                              </div>
                              <label 
                                style={{ 
                                  fontSize: "14px", 
                                  color: "#333", 
                                  marginBottom: 0
                                }}
                              >
                                Send home
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Simple Outcome Sentences */}
                      {outcome === 'back_to_class' ? (
                        <div className="mb-4" style={{ 
                          background: "#f8f9fa", 
                          border: "1px solid #e9ecef", 
                          borderRadius: 8, 
                          padding: "16px"
                        }}>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Assessed by: {selectedRequest.clinic_assessment_by?.full_name || 'Unknown'}, R.N
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This permit request has been assessed by the school nurse.
                          </div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px", marginTop: "12px" }}>
                            Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This permit request has been approved by the teacher.
                          </div>
                        </div>
                      ) : outcome === 'send_home' ? (
                        <div className="mb-4" style={{ 
                          background: "#f8f9fa", 
                          border: "1px solid #e9ecef", 
                          borderRadius: 8, 
                          padding: "16px"
                        }}>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Assessed by: {selectedRequest.clinic_assessment_by?.full_name || 'Unknown'}, R.N
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This go home form has been assessed by the school nurse.
                          </div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px", marginTop: "12px" }}>
                            Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This go home form has been approved by the teacher.
                          </div>
                          
                          {/* Parent/Guardian Notification Section */}
                          <div style={{ marginTop: "16px" }}>
                            <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                              Parent/Guardian Already Notified
                            </div>
                            <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4, marginBottom: "12px" }}>
                              An email notification has been successfully sent to the student's parent/guardian informing them that the student needs to be sent home for medical attention. The parent/guardian has been notified through email about the student's condition.
                            </div>
                            <div style={{ marginTop: "12px" }}>
                              <label style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                                Parent/Guardian Email Address:
                              </label>
                              <input 
                                type="email" 
                                className="form-control" 
                                value={parentEmail}
                                style={{ fontSize: "14px", borderRadius: 8, width: "100%" }}
                                readOnly
                              />
                            </div>
                          </div>
                          
                          {/* Parent Response Section - Only when completed */}
                          {selectedRequest.parent_response && (
                            <div style={{ marginTop: "16px" }}>
                              <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                                Approved by: {selectedRequest.student?.guardian_name || 'Parent/Guardian'}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                                This send home form has been approved by the parent/guardian. The parent/guardian has been notified and has responded to the email notification.
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="modal-footer border-0 pt-0" style={{ padding: "0 24px 24px 24px" }}>
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={handleCloseModal}
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
                      <span style={{ color: "#000" }}>Close</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Simple read-only modal for non-completed requests
              <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 600, width: "100%" }}>
                <div className="modal-content" style={{ 
                  borderRadius: 16, 
                  boxShadow: "0 4px 32px rgba(0,0,0,0.15)", 
                  background: "#fff",
                  border: "none"
                }}>
                  <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
                    <h5 className="modal-title fw-bold" style={{ fontSize: "20px", color: "#222" }}>
                      Permit Request Details
                    </h5>
                  </div>
                  <div className="modal-body" style={{ padding: "20px 24px 24px 24px" }}>
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
                            type="text"
                            className="form-control"
                            value={formatDate(selectedRequest.date)}
                            style={{ 
                              borderRadius: 8, 
                              border: "1px solid #ddd",
                              fontSize: "14px",
                              padding: "8px 12px"
                            }}
                            readOnly
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                            Time
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={formatTime(selectedRequest.time)}
                            style={{ 
                              borderRadius: 8, 
                              border: "1px solid #ddd",
                              fontSize: "14px",
                              padding: "8px 12px"
                            }}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Provider
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedRequest.provider?.full_name || 'N/A'}
                          style={{ 
                            borderRadius: 8, 
                            border: "1px solid #ddd",
                            fontSize: "14px",
                            padding: "8px 12px"
                          }}
                          readOnly
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Teacher
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedRequest.teacher?.full_name || 'N/A'}
                          style={{ 
                            borderRadius: 8, 
                            border: "1px solid #ddd",
                            fontSize: "14px",
                            padding: "8px 12px"
                          }}
                          readOnly
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Grade
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedRequest.grade || 'N/A'}
                          style={{ 
                            borderRadius: 8, 
                            border: "1px solid #ddd",
                            fontSize: "14px",
                            padding: "8px 12px"
                          }}
                          readOnly
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Section
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedRequest.section || 'N/A'}
                          style={{ 
                            borderRadius: 8, 
                            border: "1px solid #ddd",
                            fontSize: "14px",
                            padding: "8px 12px"
                          }}
                          readOnly
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Reason
                        </label>
                        <textarea
                          className="form-control"
                          value={selectedRequest.reason || 'N/A'}
                          style={{ 
                            borderRadius: 8, 
                            border: "1px solid #ddd",
                            fontSize: "14px",
                            padding: "8px 12px",
                            resize: "vertical"
                          }}
                          readOnly
                        />
                      </div>
                      <div className="mb-3">
                        {selectedRequest.status === 'approved' ? (
                          <div style={{ 
                            background: "#f8f9fa", 
                            border: "1px solid #e9ecef", 
                            borderRadius: 8, 
                            padding: "16px"
                          }}>
                            <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                              Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                              This permit request has been approved by the teacher.
                            </div>
                          </div>
                        ) : selectedRequest.status === 'denied' ? (
                          <div style={{ 
                            background: "#f8f9fa", 
                            border: "1px solid #e9ecef", 
                            borderRadius: 8, 
                            padding: "16px"
                          }}>
                            <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                              Denied by: Wesly Aquino
                            </div>
                            <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                              This permit request has been denied by the teacher.
                            </div>
                          </div>
                        ) : selectedRequest.status !== 'pending' ? (
                          <input
                            type="text"
                            className="form-control"
                            value={selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1) || 'N/A'}
                            style={{ 
                              borderRadius: 8, 
                              border: "1px solid #ddd",
                              fontSize: "14px",
                              padding: "8px 12px"
                            }}
                            readOnly
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 pt-0" style={{ padding: "0 24px 24px 24px" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleCloseModal}
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
                      <span style={{ color: "#000" }}>Close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div 
        className="position-fixed d-flex align-items-center justify-content-center"
        style={{
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#14b8a6",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)",
          transition: "all 0.2s ease",
          zIndex: 1000
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(20, 184, 166, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(20, 184, 166, 0.3)";
        }}
      >
        <BsChatDots size={24} />
      </div>
    </div>
  );
}
