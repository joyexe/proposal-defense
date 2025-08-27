"use client";

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faTimes, faCalendarAlt, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import "bootstrap/dist/css/bootstrap.min.css";
import { getPermitRequests, updateClinicAssessment, detectICD11Realtime, searchICD11Codes, updateHealthRecordAssessment } from "../../utils/api";

export default function ClinicPermitRequestPage() {
  const router = useRouter();
  const [permitRequests, setPermitRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
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
      .modal-footer .btn:not(.btn-cancel-light-green) {
        color: #000 !important;
      }
      .btn-cancel-light-green {
        background-color: #e6f0ea !important;
        color: #171717 !important;
        border: none !important;
        font-weight: 600 !important;
        transition: background 0.2s, color 0.2s;
        padding: 8px 24px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
      }
      .btn-cancel-light-green:hover, .btn-cancel-light-green:focus {
        background-color: #d1e7dd !important;
        color: #222 !important;
        border: none !important;
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
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDiagnosisOptions, setShowDiagnosisOptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestedDiagnoses, setSuggestedDiagnoses] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const modalRef = useRef(null);

  // Check if the request has already been completed
  const isRequestCompleted = selectedRequest && selectedRequest.status && selectedRequest.status.toLowerCase() === 'completed';
  
  const handleViewClick = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    
    // If request is completed, populate with existing data
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
      // Convert date to YYYY-MM-DD format for HTML date input
      if (request.outcome_date) {
        const date = new Date(request.outcome_date);
        setSelectedDate(date.toISOString().split('T')[0]);
      } else {
        setSelectedDate('');
      }
      
      // Convert time to HH:MM format for HTML time input
      if (request.outcome_time) {
        const timeStr = typeof request.outcome_time === 'string' ? request.outcome_time : request.outcome_time.toString();
        setSelectedTime(timeStr.substring(0, 5)); // Take HH:MM part
      } else {
        setSelectedTime('');
      }
      setParentEmail(request.parent_email || request.student?.guardian_email || '');
      
      // Load existing diagnosis if available
      if (request.diagnosis_code && request.diagnosis_name) {
        setSelectedDiagnosis({
          code: request.diagnosis_code,
          name: request.diagnosis_name
        });
        setShowDiagnosisOptions(false);
      } else {
        setSelectedDiagnosis(null);
        setShowDiagnosisOptions(true);
      }
    } else {
      // Reset form data for pending requests
      setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
      setNursingIntervention('');
      setOutcome('');
      setSelectedDate('');
      setSelectedTime('');
      // Auto-fill parent email with student's guardian email if available
      setParentEmail(request.student?.guardian_email || '');
      setSelectedDiagnosis(null);
      setShowDiagnosisOptions(true);
    }
    setSubmitError('');
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
    setSelectedDiagnosis(null);
    setShowDiagnosisOptions(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSuggestedDiagnoses([]);
    setSubmitError('');
  };

  const detectICD11Conditions = async () => {
    if (!selectedRequest) return;
    
    setIsDetecting(true);
    try {
      const studentReason = selectedRequest.reason || '';
      const nurseDocumentation = nursingIntervention || '';
      

      
      // Prepare vital signs for detection
      const vitalSignsData = {};
      if (vitalSigns.temp) vitalSignsData.temperature = vitalSigns.temp;
      if (vitalSigns.pr) vitalSignsData.pulse = vitalSigns.pr;
      if (vitalSigns.bp) vitalSignsData.blood_pressure = vitalSigns.bp;
      if (vitalSigns.spo2) vitalSignsData.oxygen_saturation = vitalSigns.spo2;
      
      const response = await detectICD11Realtime(
        studentReason, 
        nurseDocumentation, 
        vitalSignsData,
        'health_record'
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
        console.error('Health Record API failed with status:', response?.status);
        useFallbackSuggestions(studentReason);
      }
    } catch (error) {
      console.error('Error detecting ICD-11 conditions:', error);
      const studentReason = selectedRequest.reason || '';
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
    if (showModal && selectedRequest) {
      detectICD11Conditions();
    }
  }, [showModal, selectedRequest]);

  // Detect conditions when nursing intervention or vital signs change
  useEffect(() => {
    if (showModal && selectedRequest && (nursingIntervention || Object.values(vitalSigns).some(v => v))) {
      const timeoutId = setTimeout(() => {
        detectICD11Conditions();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [nursingIntervention, vitalSigns]);

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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const response = await searchICD11Codes(query);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.search_results || []);
          setShowSearchResults(true);
        } else {
          // Fallback to mock results if API fails
          const mockResults = [
            { code: '4A84.Z', name: 'Allergy, unspecified', confidence: '95%' },
            { code: 'CA23.0', name: 'Allergic asthma', confidence: '88%' },
            { code: 'NE61', name: 'Food allergy', confidence: '76%' }
          ].filter(item => 
            item.code.toLowerCase().includes(query.toLowerCase()) ||
            item.name.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(mockResults);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Error searching ICD codes:', error);
        // Fallback to mock results
        const mockResults = [
          { code: '4A84.Z', name: 'Allergy, unspecified', confidence: '95%' },
          { code: 'CA23.0', name: 'Allergic asthma', confidence: '88%' },
          { code: 'NE61', name: 'Food allergy', confidence: '76%' }
        ].filter(item => 
          item.code.toLowerCase().includes(query.toLowerCase()) ||
          item.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockResults);
        setShowSearchResults(true);
      }
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

  const handleSubmit = async () => {
    if (!outcome) {
      setSubmitError('Please select an outcome');
      return;
    }

    if (outcome === 'send_home' && !parentEmail.trim()) {
      setSubmitError('Parent/Guardian email is required for send home outcome');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const assessmentData = {
        vital_signs_bp: vitalSigns.bp,
        vital_signs_temp: vitalSigns.temp,
        vital_signs_pr: vitalSigns.pr,
        vital_signs_spo2: vitalSigns.spo2,
        nursing_intervention: nursingIntervention,
        outcome: outcome,
        outcome_date: selectedDate, // Send date for both outcomes
        outcome_time: selectedTime, // Send time for both outcomes
        parent_email: outcome === 'send_home' ? parentEmail : null,
        diagnosis_code: selectedDiagnosis?.code || '',
        diagnosis_name: selectedDiagnosis?.name || '',
        reason: selectedRequest.reason // Keep original reason
      };

      const response = await updateHealthRecordAssessment(selectedRequest.id, assessmentData);
      // The response is already parsed JSON from fetchWithAuth
      if (response && response.status === 'success') {
        // Update the local state
        setPermitRequests(prev => prev.map(req => 
          req.id === selectedRequest.id ? response.permit_request : req
        ));
        
        // Show success message for both outcomes
        if (outcome === 'send_home') {
          alert(`Assessment submitted successfully! Parent/Guardian notification email has been sent.`);
        } else {
          alert(`Assessment submitted successfully! Parent/Guardian notification email has been sent.`);
        }
        
        // Close modal after successful submission for both outcomes
        handleCloseModal();
      } else {
        console.error('Assessment submission failed:', response);
        setSubmitError(response.error || response.message || 'Failed to submit assessment');
      }
    } catch (error) {
      console.error('Assessment submission error:', error);
      setSubmitError(error.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
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
            <div className="text-muted" style={{ fontSize: 14 }}>Manage student health records</div>
          </div>
        </div>
        {/* Filter Row */}
        <div className="d-flex align-items-center mb-3" style={{ gap: 16, maxWidth: 900 }}>
          <div style={{ position: 'relative', width: 180 }}>
            <select className="form-select" style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }}>
              <option>Status</option>
              <option>Pending</option>
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
                  <th style={{ border: 'none' }}>Approved by</th>
                  <th style={{ border: 'none' }}>Status</th>
                  <th style={{ border: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4" style={{ border: 'none' }}>No permit requests found.</td></tr>
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
                      <td style={{ border: 'none' }}>{req.faculty_decision_by?.full_name ? `Teacher ${req.faculty_decision_by.full_name}` : 'Unknown'}</td>
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

      {/* Permit Modal - Exact UI Design */}
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
                {submitError && (
                  <div className="alert alert-danger mb-3" role="alert">
                    {submitError}
                  </div>
                )}
                
                <div style={{ 
                  border: "1px solid #e9ecef",
                  borderRadius: 8,
                  padding: "20px",
                  background: "#ffffff"
                }}>
                  {/* Request Details - Two Column Layout */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Date:</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatDate(selectedRequest.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Time:</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{formatTime(selectedRequest.time)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Name:</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.student?.full_name || 'Unknown'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '120px' }}>Grade:</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.grade}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '120px' }}>Section:</span>
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: 600 }}>{selectedRequest.section}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <span style={{ fontSize: "14px", color: "#555", fontWeight: 500, minWidth: '80px' }}>Reason:</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: "14px", color: "#333", fontWeight: 600, flex: 1 }}>{selectedRequest.reason}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Clinical Coding</label>
                        {isRequestCompleted ? (
                          // Read-only mode - show only selected diagnosis
                          <input 
                            type="text" 
                            className="form-control" 
                            value={selectedRequest.diagnosis_code && selectedRequest.diagnosis_name
                              ? `${selectedRequest.diagnosis_code} - ${selectedRequest.diagnosis_name}`
                              : 'No diagnosis code assigned.'}
                            disabled={true}
                            style={{ fontSize: 14, background: '#f8f9fa', color: '#333' }}
                          />
                        ) : (
                          // Editable mode - show search and suggested diagnoses
                          <>
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
                              <div className="p-3" style={{ background: 'transparent', borderRadius: 6, border: 'none' }}>
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
                                      {isDetecting ? 'Analyzing symptoms and vital signs...' : 'No suggestions available. Enter nursing intervention and vital signs to get ICD-11 suggestions.'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
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
                                onChange={(e) => setVitalSigns({...vitalSigns, bp: e.target.value})}
                                disabled={isRequestCompleted}
                                style={{ fontSize: "12px", borderRadius: 4 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>TEMP</label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                value={vitalSigns.temp}
                                onChange={(e) => setVitalSigns({...vitalSigns, temp: e.target.value})}
                                disabled={isRequestCompleted}
                                style={{ fontSize: "12px", borderRadius: 4 }}
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
                                onChange={(e) => setVitalSigns({...vitalSigns, pr: e.target.value})}
                                disabled={isRequestCompleted}
                                style={{ fontSize: "12px", borderRadius: 4 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>SpO2</label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                value={vitalSigns.spo2}
                                onChange={(e) => setVitalSigns({...vitalSigns, spo2: e.target.value})}
                                disabled={isRequestCompleted}
                                style={{ fontSize: "12px", borderRadius: 4 }}
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
                          onChange={(e) => setNursingIntervention(e.target.value)}
                          disabled={isRequestCompleted}
                          style={{ 
                            borderColor: "#e0e0e0", 
                            borderRadius: 8, 
                            fontSize: 14,
                            resize: "none"
                          }}
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
                          type="date" 
                          className="form-control form-control-sm" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          disabled={isRequestCompleted}
                          style={{ fontSize: "12px", borderRadius: 4 }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label style={{ fontSize: "12px", color: "#555", marginBottom: '4px', display: 'block' }}>Time</label>
                        <input 
                          type="time" 
                          className="form-control form-control-sm" 
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          disabled={isRequestCompleted}
                          style={{ fontSize: "12px", borderRadius: 4 }}
                        />
                      </div>
                    </div>
                    
                    {/* Radio buttons for outcome options */}
                    <div className="row">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center">
                          <div 
                            onClick={isRequestCompleted ? null : () => setOutcome('back_to_class')}
                            style={{
                              width: 14,
                              height: 14,
                              border: '2px solid #666',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isRequestCompleted ? 'not-allowed' : 'pointer',
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
                            onClick={isRequestCompleted ? null : () => setOutcome('back_to_class')}
                            style={{ 
                              fontSize: "14px", 
                              color: "#333", 
                              marginBottom: 0, 
                              cursor: isRequestCompleted ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Back to Class
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center">
                          <div 
                            onClick={isRequestCompleted ? null : () => setOutcome('send_home')}
                            style={{
                              width: 14,
                              height: 14,
                              border: '2px solid #666',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isRequestCompleted ? 'not-allowed' : 'pointer',
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
                            onClick={isRequestCompleted ? null : () => setOutcome('send_home')}
                            style={{ 
                              fontSize: "14px", 
                              color: "#333", 
                              marginBottom: 0, 
                              cursor: isRequestCompleted ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Send home
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simple Outcome Sentences */}
                  {!outcome ? (
                    <div className="mb-4" style={{ 
                      background: "#f8f9fa", 
                      border: "1px solid #e9ecef", 
                      borderRadius: 8, 
                      padding: "16px"
                    }}>
                      <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                        Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                        This permit request has been approved by the teacher and is pending school nurse assessment and outcome decision.
                      </div>
                    </div>
                  ) : outcome === 'back_to_class' ? (
                    <div className="mb-4" style={{ 
                      background: "#f8f9fa", 
                      border: "1px solid #e9ecef", 
                      borderRadius: 8, 
                      padding: "16px"
                    }}>
                      {isRequestCompleted ? (
                        // Read-only display for completed requests
                        <>
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
                        </>
                      ) : (
                        // Original display for pending requests
                        <>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Return to Class
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4, marginBottom: "12px" }}>
                            I hereby assess the student's condition and authorize their return to class. This electronic signature confirms my professional assessment and approval for the student to resume normal classroom activities.
                          </div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This permit request has been approved by the teacher.
                          </div>
                        </>
                      )}
                    </div>
                  ) : outcome === 'send_home' ? (
                    <div className="mb-4" style={{ 
                      background: "#f8f9fa", 
                      border: "1px solid #e9ecef", 
                      borderRadius: 8, 
                      padding: "16px"
                    }}>
                      {isRequestCompleted ? (
                        // Read-only display for completed requests
                        <>
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
                                onChange={(e) => setParentEmail(e.target.value)}
                                disabled={isRequestCompleted}
                                placeholder={selectedRequest?.student?.guardian_email ? "" : "Please enter parent/guardian email address"}
                                style={{ fontSize: "14px", borderRadius: 8, width: "100%" }}
                              />
                            </div>
                          </div>
                          

                        </>
                      ) : (
                        // Original display for pending requests
                        <>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Send Home
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4, marginBottom: "16px" }}>
                            I hereby assess the student's condition and recommend sending them home for medical attention. This electronic signature confirms my professional assessment and will automatically notify the parent/guardian for approval.
                          </div>
                          <div style={{ 
                            background: "#f8f9fa", 
                            border: "1px solid #e9ecef", 
                            borderRadius: 8, 
                            padding: "16px",
                            marginBottom: "12px"
                          }}>
                            <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                              Parent/Guardian Notification
                            </div>
                            <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4, marginBottom: "12px" }}>
                              An email notification will be automatically sent to the student's parent/guardian informing them that the student needs to be sent home for medical attention.
                            </div>
                            <div style={{ marginTop: "12px" }}>
                              <label style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                                Parent/Guardian Email Address:
                              </label>
                              <input 
                                type="email" 
                                className="form-control" 
                                value={parentEmail}
                                onChange={(e) => setParentEmail(e.target.value)}
                                disabled={isRequestCompleted}
                                placeholder={selectedRequest?.student?.guardian_email ? "" : "Please enter parent/guardian email address"}
                                style={{ fontSize: "14px", borderRadius: 8, width: "100%" }}
                              />
                            </div>
                          </div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 600, marginBottom: "8px" }}>
                            Approved by: {selectedRequest.faculty_decision_by?.full_name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.4 }}>
                            This permit request has been approved by the teacher.
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                  

                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-0 pt-0" style={{ padding: "0 24px 24px 24px" }}>
                <button 
                  type="button" 
                  className="btn btn-cancel-light-green px-4" 
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={handleSubmit}
                  disabled={!outcome || submitting || isRequestCompleted}
                  style={{ 
                    borderRadius: 8, 
                    padding: "8px 24px", 
                    fontSize: 14, 
                    fontWeight: 500,
                    background: outcome && !isRequestCompleted ? "#22c55e" : "#e0e0e0",
                    border: "none",
                    color: outcome && !isRequestCompleted ? "#fff" : "#000"
                  }}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #ced4da;
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
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
}