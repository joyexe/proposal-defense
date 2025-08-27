"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { getPermitRequests, updatePermitRequest } from "../../utils/api";

export default function FacultyPermitRequestsPage() {
  const router = useRouter();
  const [permitRequests, setPermitRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  // Load permit requests from API
  useEffect(() => {
    const loadPermitRequests = async () => {
      try {
        setLoading(true);
        const data = await getPermitRequests();
        setPermitRequests(data);
      } catch (err) {
        setError(err.message || 'Failed to load permit requests');
      } finally {
        setLoading(false);
      }
    };

    loadPermitRequests();
  }, []);

  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(permitRequests.length / rowsPerPage);
  const paginatedRequests = permitRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    setDecision('');
    setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
    setNursingIntervention('');
    setOutcome('');
    setSelectedDate('');
    setSelectedTime('');
    setParentEmail('');
  };

    const handleSubmit = async () => {
    if (!decision || !selectedRequest) return;
    
    setSubmitting(true);
    try {
      await updatePermitRequest(selectedRequest.id, {
        faculty_decision: decision
      });
      
      // Update the local state
      setPermitRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: decision, faculty_decision: decision }
          : req
      ));
      
      handleCloseModal();
    } catch (error) {
      alert('Failed to update permit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if the request has already been completed
  const isRequestCompleted = selectedRequest && selectedRequest.status === 'completed';
  const isRequestProcessed = selectedRequest && selectedRequest.status === 'processed';

  const handleTabClick = (tab) => {
    if (tab === "my-health-records") {
      router.push("/faculty/health-record");
    }
  };

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
      <div className="col-12 p-0">
        {/* Content Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="fw-bold text-black" style={{ fontSize: 22 }}>Permit to leave the classroom & Go Home Form</span>
            <div className="text-muted" style={{ fontSize: 14 }}>View your student health records</div>
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
        {/* Card/Table */}
        <div className="bg-white rounded shadow-sm p-4" style={{ borderRadius: 16, marginTop: 0, minHeight: 350, paddingRight: 0 }}>
          <div className="fw-bold mb-1" style={{ fontSize: 20 }}>All Permit Requests</div>
          <div className="text-muted mb-3" style={{ fontSize: 14 }}>View and manage all student requests to leave the classroom for health-related concerns</div>
          <div className="table-responsive" style={{ paddingRight: 0 }}>
            <table className="table align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0, marginRight: 0 }}>
              <thead>
                <tr>
                  <th style={{ border: 'none' }}>Date & Time</th>
                  <th style={{ border: 'none' }}>Student Name</th>
                  <th style={{ border: 'none' }}>Grade</th>
                  <th style={{ border: 'none' }}>Section</th>
                  <th style={{ border: 'none' }}>Reason</th>
                  <th style={{ border: 'none' }}>Status</th>
                  <th style={{ border: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4" style={{ border: 'none' }}>No permit requests found.</td></tr>
                ) : (
                  paginatedRequests.map((req, idx) => (
                    <tr key={idx}>
                      <td style={{ border: 'none' }}>
                        <div style={{ fontSize: 14 }}>{formatTableDate(req.date)}</div>
                        <div style={{ fontSize: 14 }}>{formatTime(req.time)}</div>
                      </td>
                      <td style={{ border: 'none' }}>{req.student?.full_name || 'Unknown'}</td>
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
          {/* Pagination Controls (now inside the card) */}
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
      </div>

      {/* Permit Modal */}
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
                      borderRadius: 8, 
                      padding: "8px 24px", 
                      fontSize: 14, 
                      fontWeight: 500,
                      background: "#f8f9fa",
                      border: "1px solid #e0e0e0",
                      color: "#000 !important"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Original faculty modal for non-completed requests
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500, width: "100%" }} ref={modalRef}>
              <div className="modal-content" style={{ borderRadius: 12, boxShadow: "0 4px 32px rgba(0,0,0,0.15)" }}>
                {/* Modal Header */}
                <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
                  <h5 className="modal-title fw-bold" style={{ fontSize: 18, color: "#333" }}>Permit to leave the classroom</h5>
                </div>
                
                {/* Modal Body */}
                <div className="modal-body" style={{ padding: "20px 24px" }}>
                  {/* Request Details - Key-Value Pairs */}
                  <div style={{ 
                    background: "#fff", 
                    border: "1px solid #e9ecef", 
                    borderRadius: 12, 
                    padding: 20, 
                    marginBottom: 20
                  }}>
                    <div className="mb-3">
                      <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>Date:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatDate(selectedRequest.date)}</span>
                    </div>
                    <div className="mb-3">
                      <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>Time:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatTime(selectedRequest.time)}</span>
                    </div>
                    <div className="mb-3">
                      <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>Name:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.student?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="mb-3">
                      <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>Grade:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.grade} {selectedRequest.section}</span>
                    </div>
                    <div className="mb-3">
                      <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>Reason:&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.reason}</span>
                    </div>
                  </div>

                  {/* Decision Radio Buttons */}
                  <div className="mb-4">
                    <div className="d-flex flex-column gap-3">
                      {/* Read-only for approved/denied, interactive for pending */}
                      {selectedRequest.status === 'approved' || selectedRequest.status === 'denied' ? (
                        <>
                          <div className="d-flex align-items-start" style={{marginBottom: 0, display: 'flex', alignItems: 'flex-start'}}>
                            <div 
                              style={{
                                width: 18,
                                height: 18,
                                border: '2px solid #666',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: selectedRequest.status === 'approved' ? '#22c55e' : 'transparent',
                                position: 'relative',
                                top: '2px',
                                flexShrink: 0
                              }}
                            >
                              {selectedRequest.status === 'approved' && (
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'white'
                                }} />
                              )}
                            </div>
                            <div style={{ marginLeft: 12, flex: 1 }}>
                              <div style={{ fontSize: 14, color: "#333", fontWeight: 600, marginBottom: 4, display: 'block' }}>
                                Accept
                              </div>
                              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                                I hereby grant permission for the student to leave the classroom for the stated health concern. This electronic signature confirms my approval and authorization for this temporary absence from class.
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-start" style={{marginBottom: 0, display: 'flex', alignItems: 'flex-start'}}>
                            <div 
                              style={{
                                width: 18,
                                height: 18,
                                border: '2px solid #666',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: selectedRequest.status === 'denied' ? '#22c55e' : 'transparent',
                                position: 'relative',
                                top: '2px',
                                flexShrink: 0
                              }}
                            >
                              {selectedRequest.status === 'denied' && (
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'white'
                                }} />
                              )}
                            </div>
                            <div style={{ marginLeft: 12, flex: 1 }}>
                              <div style={{ fontSize: 14, color: "#333", fontWeight: 600, marginBottom: 4, display: 'block' }}>
                                Deny
                              </div>
                              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                                I hereby decline permission for the student to leave the classroom at this time. This electronic signature confirms my decision based on current academic priorities and classroom requirements.
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="d-flex align-items-start" style={{marginBottom: 0, display: 'flex', alignItems: 'flex-start'}}>
                            <div 
                              onClick={() => setDecision('approved')}
                              style={{
                                width: 18,
                                height: 18,
                                border: '2px solid #666',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                backgroundColor: decision === 'approved' ? '#22c55e' : 'transparent',
                                position: 'relative',
                                top: '2px',
                                flexShrink: 0
                              }}
                            >
                              {decision === 'approved' && (
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'white'
                                }} />
                              )}
                            </div>
                            <div style={{ marginLeft: 12, flex: 1 }}>
                              <label 
                                onClick={() => setDecision('approved')}
                                style={{ fontSize: 14, color: "#333", fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'block' }}
                              >
                                Accept
                              </label>
                              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                                I hereby grant permission for the student to leave the classroom for the stated health concern. This electronic signature confirms my approval and authorization for this temporary absence from class.
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-start" style={{marginBottom: 0, display: 'flex', alignItems: 'flex-start'}}>
                            <div 
                              onClick={() => setDecision('denied')}
                              style={{
                                width: 18,
                                height: 18,
                                border: '2px solid #666',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                backgroundColor: decision === 'denied' ? '#22c55e' : 'transparent',
                                position: 'relative',
                                top: '2px',
                                flexShrink: 0
                              }}
                            >
                              {decision === 'denied' && (
                                <div style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'white'
                                }} />
                              )}
                            </div>
                            <div style={{ marginLeft: 12, flex: 1 }}>
                              <label 
                                onClick={() => setDecision('denied')}
                                style={{ fontSize: 14, color: "#333", fontWeight: 600, cursor: 'pointer', marginBottom: 4, display: 'block' }}
                              >
                                Deny
                              </label>
                              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                                I hereby decline permission for the student to leave the classroom at this time. This electronic signature confirms my decision based on current academic priorities and classroom requirements.
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-0 pt-0" style={{ padding: "0 24px 24px 24px" }}>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={handleCloseModal}
                    style={{ 
                      borderRadius: 8, 
                      padding: "8px 24px", 
                      fontSize: 14, 
                      fontWeight: 500,
                      background: "#f8f9fa",
                      border: "1px solid #e0e0e0",
                      color: "#000 !important"
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={handleSubmit}
                    disabled={selectedRequest.status === 'approved' || selectedRequest.status === 'denied' || !decision || submitting || isRequestProcessed}
                    style={{ 
                      borderRadius: 8, 
                      padding: "8px 24px", 
                      fontSize: 14, 
                      fontWeight: 500,
                      background: decision ? "#22c55e" : "#e0e0e0",
                      border: "none",
                      color: decision ? "#fff !important" : "#000 !important"
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

