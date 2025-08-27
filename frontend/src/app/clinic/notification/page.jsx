"use client";
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { getClinicNotifications, markClinicNotificationsRead, updateClinicAssessment, detectICD11Realtime, getClinicAppointmentNotifications, markClinicAppointmentNotificationsRead } from '../../utils/api';

// Add custom CSS to force button text colors
const customStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .bi-arrow-clockwise {
    animation: spin 1s linear infinite;
  }
  
  .modal-footer .btn {
    color: #000 !important;
  }
  .modal-footer .btn:hover {
    color: #000 !important;
  }
  .modal-footer .btn:focus {
    color: #000 !important;
  }
  .modal-footer .btn:active {
    color: #000 !important;
  }
  .modal-footer .btn:disabled {
    color: #000 !important;
  }
  .modal-footer .btn span {
    color: #000 !important;
  }
  .modal-footer .btn:disabled span {
    color: #000 !important;
  }
  .modal-footer .btn[style*="background: #22c55e"] span {
    color: #fff !important;
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

export default function NotificationPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [detectingICD11, setDetectingICD11] = useState(false);
  const [icd11Result, setIcd11Result] = useState(null);
  
  // Check if the request has already been completed
  const isRequestCompleted = selectedNotification && selectedNotification.permit_data?.status === 'completed';

  // Load notifications from API
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        
        // Load both permit and appointment notifications
        const [permitData, appointmentData] = await Promise.all([
          getClinicNotifications(),
          getClinicAppointmentNotifications()
        ]);
        
        // Combine and sort notifications by timestamp
        const allNotifications = [
          ...(permitData || []).map(n => ({ ...n, notificationType: 'permit' })),
          ...(appointmentData || []).map(n => ({ ...n, notificationType: 'appointment' }))
        ].sort((a, b) => {
          // Sort by timestamp (newest first)
          const timeA = new Date(a.timestamp);
          const timeB = new Date(b.timestamp);
          return timeB - timeA;
        });
        
        setNotifications(allNotifications || []);
        
        // Mark notifications as read when clinic visits the page
        if (allNotifications && allNotifications.length > 0) {
          try {
            await Promise.all([
              markClinicNotificationsRead(),
              markClinicAppointmentNotificationsRead()
            ]);
          } catch (error) {
            console.error('Error marking notifications as read:', error);
          }
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError(err.message || 'Failed to load notifications');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifications = notifications.slice(indexOfFirstItem, indexOfLastItem);

  // Update total pages when notifications change
  useEffect(() => {
    setTotalPages(Math.ceil(notifications.length / itemsPerPage));
  }, [notifications.length, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleViewClick = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    
    // If it's a permit notification, populate with existing data
    if (notification.notificationType === 'permit' && notification.permit_data?.status === 'completed') {
      setVitalSigns({
        bp: notification.permit_data.vital_signs_bp || '',
        temp: notification.permit_data.vital_signs_temp || '',
        pr: notification.permit_data.vital_signs_pr || '',
        spo2: notification.permit_data.vital_signs_spo2 || ''
      });
      setNursingIntervention(notification.permit_data.nursing_intervention || '');
      setOutcome(notification.permit_data.outcome || '');
      setSelectedDate(notification.permit_data.outcome_date || '');
      setSelectedTime(notification.permit_data.outcome_time || '');
      setParentEmail(notification.permit_data.parent_email || '');
    } else {
      // Reset form data for other notifications
      setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
      setNursingIntervention('');
      setOutcome('');
      setSelectedDate('');
      setSelectedTime('');
      setParentEmail('');
    }
  };

  const handleCloseModal = async () => {
    setShowModal(false);
    setSelectedNotification(null);
    setVitalSigns({ bp: '', temp: '', pr: '', spo2: '' });
    setNursingIntervention('');
    setOutcome('');
    setSelectedDate('');
    setSelectedTime('');
    setParentEmail('');
    setIcd11Result(null);
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to format appointment date
  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Helper function to format appointment time
  const formatAppointmentTime = (timeStr) => {
    if (!timeStr) return '';
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
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">

          {/* Search and Filter Section */}
          <div className="d-flex align-items-center mb-3" style={{ gap: '12px' }}>
            <div className="position-relative" style={{ width: '300px' }}>
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search"
                style={{ height: 40, borderRadius: 8 }}
              />
              <span style={{ position: 'absolute', left: 16, top: 10, color: '#bdbdbd', fontSize: 18 }}>
                <i className="bi bi-search"></i>
              </span>
            </div>
            <div style={{ position: 'relative', width: 160 }}>
              <select
                className="form-select"
                style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
              >
                <option value="Filter by">Filter by</option>
                <option value="All Notifications">All Notifications</option>
                <option value="Permit Requests">Permit Requests</option>
                <option value="Appointments">Appointments</option>
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                <i className="bi bi-chevron-down"></i>
              </span>
            </div>
          </div>
          
          {/* Notifications Card */}
          <div className="bg-white rounded shadow-sm p-4" style={{ borderRadius: 16, marginTop: 0, minHeight: 350 }}>
            <div className="fw-bold mb-1" style={{ fontSize: 20 }}>Notifications</div>
            <div className="d-flex flex-column gap-3">
              {currentNotifications.length === 0 ? (
                <div className="text-center text-muted py-4">No notifications found.</div>
              ) : (
                currentNotifications.map((notification, idx) => (
                  <div key={notification.id} className="border rounded p-3" style={{ 
                    backgroundColor: notification.isRead ? 'white' : '#f8f9fa', 
                    borderRadius: 8 
                  }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="flex-grow-1">
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#212529' }}>
                          {notification.text}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                          {notification.timestamp}
                        </div>
                        <button className="btn btn-sm" style={{ 
                          backgroundColor: '#17a2b8', 
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          padding: '4px 12px',
                          border: 'none'
                        }}
                        onClick={() => handleViewClick(notification)}>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                <ul className="pagination">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" aria-label="Previous" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}>
                      <span aria-hidden="true">Previous</span>
                    </a>
                  </li>
                  {/* Compact pagination with ellipsis */}
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => (
                      <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}>{i + 1}</a>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }}>1</a>
                      </li>
                      {currentPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                      {Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
                        .filter(page => page > 1 && page < totalPages)
                        .map(page => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(page); }}>{page}</a>
                          </li>
                        ))}
                      {currentPage < totalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                      <li className={`page-item ${currentPage === totalPages ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</a>
                      </li>
                    </>
                  )}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" aria-label="Next" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}>
                      <span aria-hidden="true">Next</span>
                    </a>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Notification Details Modal */}
      {showModal && selectedNotification && (
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
                  Notification Details
                </h5>
              </div>
              <div className="modal-body" style={{ padding: "20px 24px 24px 24px" }}>
                {selectedNotification.notificationType === 'appointment' ? (
                  // Appointment notification details
                  <div style={{ 
                    background: "#ffffff", 
                    borderRadius: 12, 
                    padding: "20px", 
                    marginBottom: "20px",
                    border: "1px solid #e9ecef"
                  }}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                        Reason
                      </label>
                      <textarea
                        className="form-control"
                        value={selectedNotification.appointment_data?.reason || ''}
                        style={{ 
                          borderRadius: 8, 
                          border: "1px solid #ddd",
                          fontSize: "14px",
                          padding: "8px 12px",
                          resize: "vertical",
                          minHeight: "80px"
                        }}
                        readOnly
                      />
                    </div>
                    <div className="row mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Type
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedNotification.appointment_data?.service_type || ''}
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
                          Date & Time
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={`${formatAppointmentDate(selectedNotification.appointment_data?.date)} at ${formatAppointmentTime(selectedNotification.appointment_data?.time)}`}
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
                        Patient
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedNotification.appointment_data?.client_name || ''}
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
                ) : (
                  // Permit notification details (existing code)
                  <div style={{ 
                    background: "#ffffff", 
                    borderRadius: 12, 
                    padding: "20px", 
                    marginBottom: "20px",
                    border: "1px solid #e9ecef"
                  }}>
                    {/* Existing permit notification content */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                        Message
                      </label>
                      <textarea
                        className="form-control"
                        value={selectedNotification.text}
                        style={{ 
                          borderRadius: 8, 
                          border: "1px solid #ddd",
                          fontSize: "14px",
                          padding: "8px 12px",
                          resize: "vertical",
                          minHeight: "80px"
                        }}
                        readOnly
                      />
                    </div>
                    <div className="row mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold" style={{ fontSize: "14px", color: "#555" }}>
                          Type
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedNotification.type.charAt(0).toUpperCase() + selectedNotification.type.slice(1)}
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
                          Timestamp
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={selectedNotification.timestamp}
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
                        Status
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedNotification.isRead ? "Read" : "Unread"}
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
                )}
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
        </div>
      )}
      </div>
    </>
  );
}
