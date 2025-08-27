"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMentalHealthAnalyticsSummary, getMentalHealthAlerts, resolveAlert, assignAlert, generateCounselorPDFReport } from "../../../utils/api";

// Pagination helper function (same as admin logs)
function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

export default function AlertsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeRange, setTimeRange] = useState('month'); // Default to show all months
  
  // Pagination state (same as admin logs)
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 10;
  
  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiTimeRange = timeRange === 'month' ? 12 : timeRange; // Use 12 months for "All Months" option
        const [summary, alertsData] = await Promise.all([
          getMentalHealthAnalyticsSummary(),
          getMentalHealthAlerts(activeTab)
        ]);
        
        setAnalyticsData(summary);
        setAlerts(alertsData);
        setCurrentPage(1); // Reset to first page when tab changes
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, timeRange]);

  const handleTimeRangeChange = (newRange) => {
    if (newRange === 'month') {
      setTimeRange('month');
    } else {
      setTimeRange(parseInt(newRange));
    }
  };

  const handleResolveAlert = async (alertId) => {
    setSelectedAlertId(alertId);
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleConfirmResolve = async () => {
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution notes before resolving the alert.');
      return;
    }
    
    try {
      await resolveAlert(selectedAlertId, resolutionNotes);
      // Refresh alerts
      const alertsData = await getMentalHealthAlerts(activeTab);
      setAlerts(alertsData);
      setShowResolveModal(false);
      setSelectedAlertId(null);
      setResolutionNotes('');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleCancelResolve = () => {
    setShowResolveModal(false);
    setSelectedAlertId(null);
    setResolutionNotes('');
  };

  const handleExportPDF = async () => {
    try {
      const response = await generateCounselorPDFReport(timeRange === 'month' ? 12 : timeRange);
      
      // Check if response is successful (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mental_health_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('PDF generation failed:', response.status, response.statusText);
        alert('Failed to generate PDF report. Please try again.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  const handleAssignAlert = async (alertId) => {
    try {
      await assignAlert(alertId); // This will assign to current counselor and change status to pending
      // Refresh alerts
      const alertsData = await getMentalHealthAlerts(activeTab);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to assign alert:', error);
      alert('Failed to assign alert. Please try again.');
    }
  };

  // Pagination logic (same as admin logs)
  const totalPages = Math.ceil(alerts.length / alertsPerPage);
  const pagedAlerts = getPagedData(alerts, currentPage, alertsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Color mapping for dot and border
  const statusMap = {
    active: {
      label: 'Active',
      dot: '#e53935',
      border: '#e53935',
      badge: 'bg-danger',
    },
    pending: {
      label: 'Pending',
      dot: '#ffc107',
      border: '#ffc107',
      badge: 'bg-warning',
    },
    resolved: {
      label: 'Resolved',
      dot: '#43a047',
      border: '#43a047',
      badge: 'bg-success',
    },
  };
  const current = statusMap[activeTab];
  
  return (
    <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="fw-bold fs-5 mb-1">Mental Health Metrics</div>
          <div className="text-muted" style={{ fontSize: 15 }}>Key performance indicators and trends</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div style={{ position: 'relative', width: 180 }}>
            <select 
              className="form-select" 
              style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }} 
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              aria-label="Select time range"
            >
              <option value="month">All Months</option>
              <option value={1}>Current Month</option>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last Year</option>
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
              <i className="bi bi-chevron-down"></i>
            </span>
          </div>
          <button 
            className="btn btn-success px-4 fw-semibold" 
            style={{ borderRadius: 10 }}
            onClick={handleExportPDF}
          >
            <span className="me-2" aria-hidden="true">
              <i className="bi bi-download" style={{ fontSize: 18, verticalAlign: 'middle' }}></i>
            </span>
            Export
          </button>
        </div>
      </div>
      
      {/* Tabs - match exact markup and spacing from analytics tab */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border${false ? ' bg-success text-white' : ' bg-light text-dark'}`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }} onClick={() => router.push('/counselor/analytics')}>
              Mental Health Analytics
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border${true ? ' bg-success text-white' : ' bg-light text-dark'}`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }} onClick={() => router.push('/counselor/analytics/alerts')}>
              Mental Health Alerts
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-light text-dark`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }} onClick={() => router.push('/counselor/analytics/engagements')}>
              AMIETI Chatbot
            </button>
          </li>
        </ul>
      </div>
      
      {/* Metrics cards - match analytics tab */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Mental Health Records</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {analyticsData?.total_records || 0}
            </div>
            <div className="text-secondary small mt-1">{analyticsData?.records_change || '+24'} from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Anxiety Reports</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {analyticsData?.anxiety_reports || 0}
            </div>
            <div className="text-secondary small mt-1">{analyticsData?.anxiety_change || '+15%'} from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Depression Reports</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {analyticsData?.depression_reports || 0}
            </div>
            <div className="text-secondary small mt-1">{analyticsData?.depression_change || '+8%'} from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>High Alert Flags</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#e53935' }}>
              {analyticsData?.high_alerts || 0}
            </div>
            <div className="text-danger small mt-1">Require immediate attention</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-4 shadow-sm p-4 mb-4">
        <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Alerts</div>
        <div className="mb-3" style={{ fontSize: 15, color: '#666' }}>Emergency and health alerts that require attention</div>
        <div className="d-flex align-items-center mb-3">
          <button
            className={`btn px-4 fw-semibold me-2${activeTab === 'active' ? '' : ' alert-tab-btn'}`}
            style={{ borderRadius: 8, fontSize: 15, color: activeTab === 'active' ? '#fff' : undefined, background: activeTab === 'active' ? '#198754' : undefined, border: '1px solid #e0e0e0' }}
            onClick={() => setActiveTab('active')}
          >
            Active
          </button>
          <button
            className={`btn px-4 fw-semibold me-2${activeTab === 'pending' ? '' : ' alert-tab-btn'}`}
            style={{ borderRadius: 8, fontSize: 15, color: activeTab === 'pending' ? '#fff' : undefined, background: activeTab === 'pending' ? '#198754' : undefined, border: '1px solid #e0e0e0' }}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`btn px-4 fw-semibold${activeTab === 'resolved' ? '' : ' alert-tab-btn'}`}
            style={{ borderRadius: 8, fontSize: 15, color: activeTab === 'resolved' ? '#fff' : undefined, background: activeTab === 'resolved' ? '#198754' : undefined, border: '1px solid #e0e0e0' }}
            onClick={() => setActiveTab('resolved')}
          >
            Resolved
          </button>
        </div>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="text-center text-muted">
              <div className="mb-2">Loading alerts...</div>
              <div style={{ fontSize: 14 }}>Please wait while we fetch the data.</div>
            </div>
          </div>
        ) : pagedAlerts && pagedAlerts.length > 0 ? (
          <>
            {pagedAlerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-3 shadow-sm p-3 mb-2" style={{ border: '1px solid #e0e0e0', borderLeft: `3px solid ${current.border}` }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    <span className="me-2" style={{ display: 'inline-block', width: 16, height: 16, background: current.dot, borderRadius: '50%' }}></span>
                    <span className="fw-semibold" style={{ fontSize: 16, color: current.dot }}>{alert.title}</span>
                    <span className={`badge ms-2 ${current.badge}`} style={{ fontSize: 12, color: activeTab === 'pending' ? '#fff' : undefined }}>{alert.status}</span>
                    <span className="badge ms-2" style={{ 
                      fontSize: 12, 
                      background: alert.severity === 'High' ? '#e53935' : alert.severity === 'Medium' ? '#ffc107' : '#43a047',
                      color: '#fff'
                    }}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="d-flex align-items-center">
                    {activeTab === 'active' && !alert.counselor && (
                      <span
                        className="badge me-2 d-flex align-items-center"
                        style={{
                          background: '#fff',
                          color: '#ff6b35',
                          border: '1.5px solid #ff6b35',
                          fontSize: 14,
                          borderRadius: 8,
                          fontWeight: 600,
                          padding: '6px 16px',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleAssignAlert(alert.id)}
                      >
                        <span style={{ fontSize: 16, marginRight: 6, color: '#ff6b35', lineHeight: 1 }}>👤</span>
                        Assign to Me
                      </span>
                    )}
                    {activeTab === 'pending' && (
                      <span
                        className="badge me-2 d-flex align-items-center"
                        style={{
                          background: '#fff',
                          color: '#20b2aa',
                          border: '1.5px solid #20b2aa',
                          fontSize: 14,
                          borderRadius: 8,
                          fontWeight: 600,
                          padding: '6px 16px',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <span style={{ fontSize: 16, marginRight: 6, color: '#20b2aa', lineHeight: 1 }}>&#10003;</span>
                        Resolve
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-2" style={{ fontSize: 15, color: '#444' }}>{alert.description}</div>
                <div className="d-flex flex-wrap align-items-center" style={{ fontSize: 14, color: '#888' }}>
                  <span className="me-4">Student: <span className="fw-semibold" style={{ color: '#222' }}>{alert.student?.full_name || alert.student?.username}</span></span>
                  {alert.counselor && (
                    <span className="me-4">Assigned to: <span className="fw-semibold" style={{ color: '#222' }}>{alert.counselor.full_name}</span></span>
                  )}
                  <span className="me-3">Type: <span className="fw-semibold" style={{ color: '#222' }}>{alert.alert_type}</span></span>
                  {alert.related_keywords && alert.related_keywords.length > 0 && (
                    <span className="me-3">Keywords: <span className="fw-semibold" style={{ color: '#222' }}>{Array.isArray(alert.related_keywords) ? alert.related_keywords.join(', ') : alert.related_keywords}</span></span>
                  )}
                  <span className="me-3">Reported: {new Date(alert.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            ))}
            
            {/* Pagination - same design and functionality as admin logs */}
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
          </>
        ) : (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="text-center text-muted">
              <div className="mb-2">No {activeTab} alerts found</div>
              <div style={{ fontSize: 14 }}>There are no {activeTab} alerts at this time.</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Resolution Modal */}
      {showResolveModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Resolve Alert</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Enter resolution notes to complete this alert.</div>
              <div className="mb-3">
                <label htmlFor="resolutionNotes" className="form-label fw-semibold" style={{ fontSize: 15, color: '#444' }}>
                  Resolution Notes <span className="text-danger">*</span>
                </label>
                <textarea
                  id="resolutionNotes"
                  className="form-control"
                  rows="4"
                  placeholder="Enter notes about how this alert was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ 
                    borderRadius: 8, 
                    border: '1px solid #e0e0e0',
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                  required
                ></textarea>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-cancel-light-green px-4" 
                  onClick={handleCancelResolve}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success px-4" 
                  style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }}
                  onClick={handleConfirmResolve}
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pagination styles - same as admin logs */}
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






