'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getStudents, getInventoryItems, addInventoryItem, getInventoryLogs, addInventoryLog, updateInventoryItem, deleteInventoryItem } from '../../utils/api';
import { getUserProfile } from '../../utils/api';

const ITEMS_PER_PAGE = 10;

export default function ClinicInventoryPage() {
  const [tab, setTab] = useState('current');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    itemName: '',
    currentQty: '',
    qtyToAdd: '',
    dateReceived: '',
    notes: '',
  });
  const modalRef = useRef(null);

  // Add state for Use Item modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [useModalItem, setUseModalItem] = useState(null);
  const [useForm, setUseForm] = useState({ usedFor: '', qty: '', reason: '' });

  // Add state for student search in Use Item modal
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  // Add state for inventory and logs
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch inventory and logs from backend
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [inv, log] = await Promise.all([
          getInventoryItems(),
          getInventoryLogs(),
        ]);
        setInventory(inv);
        setLogs(log);
      } catch (err) {
        // handle error
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    getUserProfile().then(setUserProfile);
  }, []);

  // Add New Stock handler
  async function handleAddNewStock(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const existing = inventory.find(i => i.name === modalForm.itemName);
      let newItem;
      if (existing) {
        // Update existing item quantity, date_received, and notes in backend
        const newQty = parseInt(existing.quantity || 0, 10) + parseInt(modalForm.qtyToAdd || 0, 10);
        const updatedItem = await updateInventoryItem(existing.id, { quantity: newQty, date_received: modalForm.dateReceived, notes: modalForm.notes });
        setInventory(inv => inv.map(i => i.id === existing.id ? { ...i, ...updatedItem, notes: modalForm.notes } : i));
        newItem = { ...existing, ...updatedItem, notes: modalForm.notes };
      } else {
        // Create new item
        const itemData = {
          name: modalForm.itemName,
          quantity: parseInt(modalForm.currentQty || 0, 10),
          date_received: modalForm.dateReceived,
          notes: modalForm.notes,
        };
        newItem = await addInventoryItem(itemData);
        setInventory(inv => [...inv, newItem]);
        // Refresh from backend for new item
        const [inv, log] = await Promise.all([
          getInventoryItems(),
          getInventoryLogs(),
        ]);
        setInventory(inv);
        setLogs(log);
      }
      // Add log for this addition
      const loggedBy = userProfile ? `${userProfile.role === 'clinic' ? 'Nurse' : userProfile.role} ${userProfile.full_name || userProfile.username}` : '';
      await addInventoryLog({
        item: newItem.id || (newItem && newItem.pk),
        action: 'Added',
        quantity: parseInt(modalForm.qtyToAdd || 0, 10),
        notes: modalForm.notes,
        logged_by_name: loggedBy,
      });
      // Real-time update for logs: update or add the latest log for this item
      setLogs(prevLogs => {
        const newLog = {
          item: newItem.id || (newItem && newItem.pk),
          item_name: newItem.name,
          date: new Date().toISOString().split('T')[0],
          action: 'Added',
          quantity: parseInt(modalForm.qtyToAdd || 0, 10),
          notes: modalForm.notes,
          logged_by_name: loggedBy,
        };
        // Remove old log for this item_name, add new one
        const filtered = prevLogs.filter(l => l.item_name !== newLog.item_name);
        return [...filtered, newLog];
      });
      setShowAddModal(false);
      setModalForm({ itemName: '', currentQty: '', qtyToAdd: '', dateReceived: '', notes: '' });
    } catch (err) {
      // handle error
    }
    setLoading(false);
  }

  // Filtered data for current tab
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
  // Pagination logic for Current Inventory
  const data = tab === 'current' ? filteredInventory : [];
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const inventoryPaginatedData = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // For Inventory Logs: show only the latest 'Added' log per Item Name, but all 'Used' logs
  const addedLogsMap = {};
  logs.forEach(log => {
    if (log.action === 'Added') {
      if (!addedLogsMap[log.item_name] || new Date(log.date) > new Date(addedLogsMap[log.item_name].date)) {
        addedLogsMap[log.item_name] = log;
      }
    }
  });
  const uniqueAddedLogs = Object.values(addedLogsMap);
  const usedLogs = logs.filter(log => log.action === 'Used');
  const combinedLogs = [...uniqueAddedLogs, ...usedLogs];
  const filteredLogs = combinedLogs.filter(log =>
    log.item_name?.toLowerCase().includes(search.toLowerCase())
  );
  // Pagination logic for logs
  const logsTotalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const logsPaginatedData = filteredLogs.slice((logsCurrentPage - 1) * ITEMS_PER_PAGE, logsCurrentPage * ITEMS_PER_PAGE);

  // Always define paginatedData for both tabs
  const paginatedData = tab === 'current' ? inventoryPaginatedData : logsPaginatedData;

  const handleTab = (tabName) => {
    setTab(tabName);
    setCurrentPage(1);
    setSearch('');
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Find current item quantity if itemName matches
  const getCurrentQty = (name) => {
    const found = inventory.find(i => i.name === name);
    return found ? found.quantity : '';
  };

  // Fetch students when Use Item modal opens
  React.useEffect(() => {
    if (showUseModal) {
      getStudents().then(data => {
        setStudents(data);
        setFilteredStudents(data);
      });
      setUseForm(f => ({ ...f, usedFor: '' }));
    }
  }, [showUseModal]);

  // Student search handler for Use Item modal
  function handleStudentSearch(e) {
    const val = e.target.value;
    setUseForm(f => ({ ...f, usedFor: val }));
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val.toLowerCase())));
  }

  // Use Item handler
  async function handleUseItem(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Update item quantity
      const usedQty = parseInt(useForm.qty, 10);
      const itemId = useModalItem.id;
      const newQty = (useModalItem.quantity || 0) - usedQty;
      await updateInventoryItem(itemId, { quantity: newQty });
      // Add log
      const loggedBy = userProfile ? `${userProfile.role || 'Nurse'} ${userProfile.full_name || userProfile.username}` : '';
      await addInventoryLog({
        item: itemId,
        action: 'Used',
        quantity: usedQty,
        notes: useForm.reason + (useForm.usedFor ? ` (${useForm.usedFor})` : ''),
        logged_by_name: loggedBy,
      });
      // Real-time update for logs: update or add the latest log for this item (Type: Used)
      setLogs(prevLogs => {
        const newLog = {
          item: itemId,
          item_name: useModalItem.name,
          date: new Date().toISOString().split('T')[0],
          action: 'Used',
          quantity: usedQty,
          notes: useForm.reason + (useForm.usedFor ? ` (${useForm.usedFor})` : ''),
          logged_by_name: loggedBy,
        };
        // Remove old log for this item_name, add new one
        const filtered = prevLogs.filter(l => l.item_name !== newLog.item_name);
        return [...filtered, newLog];
      });
      setShowUseModal(false);
      setUseModalItem(null);
      setUseForm({ usedFor: '', qty: '', reason: '' });
      // Refresh data
      const [inv, log] = await Promise.all([
        getInventoryItems(),
        getInventoryLogs(),
      ]);
      setInventory(inv);
      setLogs(log);
    } catch (err) {
      // handle error
    }
    setLoading(false);
  }

  return (
    <div className="container-fluid py-4">
      {/* Header: Search and Add New Stock */}
      <div className="d-flex align-items-center mb-4" style={{ gap: '12px' }}>
        <div className="position-relative" style={{ maxWidth: 360, flexGrow: 1 }}>
          <input
            type="text"
            className="form-control ps-5"
            placeholder={tab === 'current' ? 'Search inventory...' : 'Search logs...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: 40, borderRadius: 8, width: '100%' }}
          />
          <span style={{ position: 'absolute', left: 16, top: 10, color: '#bdbdbd', fontSize: 18 }}>
            <i className="bi bi-search"></i>
          </span>
        </div>
        <button className="btn btn-success px-4 py-2 fw-semibold ms-auto" style={{ borderRadius: 10 }} onClick={() => setShowAddModal(true)}>
          + Add New Stock
        </button>
      </div>
      {/* Tab Buttons */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${tab === 'current' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => handleTab('current')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
            >
              Current Inventory
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${tab === 'logs' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => handleTab('logs')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
            >
              Inventory Logs
            </button>
          </li>
        </ul>
      </div>
      {tab === 'current' ? (
        <div className="bg-white rounded shadow-sm p-4">
          <div className="table-responsive" style={{ overflow: 'visible' }}>
            <table className="table no-borders align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ border: 'none', width: '28%', textAlign: 'left' }}>Item Name</th>
                  <th style={{ border: 'none', width: '15%', textAlign: 'center' }}>Quantity Left</th>
                  <th style={{ border: 'none', width: '35%', textAlign: 'center' }}>Date Received</th>
                  <th style={{ border: 'none', width: '12%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4" style={{ border: 'none' }}>No inventory found.</td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => (
                    <tr key={idx} style={{ overflow: 'visible' }}>
                      <td style={{ border: 'none', width: '28%', textAlign: 'left' }}>{item.name}</td>
                      <td style={{ border: 'none', width: '15%', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ border: 'none', width: '35%', textAlign: 'center' }}>{item.date_received ? new Date(item.date_received).toLocaleDateString() : ''}</td>
                      <td style={{ border: 'none', width: '12%', textAlign: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{ borderRadius: 8, fontWeight: 500, fontSize: 14, background: '#22c55e', color: '#fff', marginRight: 6 }}
                          onClick={() => {
                            setUseModalItem(item);
                            setShowUseModal(true);
                            setUseForm({ usedFor: '', qty: '', reason: '' });
                          }}
                        >
                          Use Item
                        </button>
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
      ) : (
        <div className="d-flex justify-content-center">
          <div className="bg-white rounded shadow-sm p-4 w-100">
            <div className="table-responsive" style={{ overflow: 'visible' }}>
              <table className="table no-borders align-middle mb-0" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ border: "none", width: "14%", textAlign: "left" }}>Date</th>
                    <th style={{ border: "none", width: "20%", textAlign: "left" }}>Item Name</th>
                    <th style={{ border: "none", width: "15%", textAlign: "center" }}>Type</th>
                    <th style={{ border: "none", width: "15%", textAlign: "center" }}>Quantity</th>
                    <th style={{ border: "none", width: "21%", textAlign: "left" }}>Reason/Notes</th>
                    <th style={{ border: "none", width: "15%", textAlign: "center" }}>Logged by</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4" style={{ border: 'none' }}>No logs found.</td>
                    </tr>
                  ) : (
                    paginatedData.map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ border: "none", width: "14%", textAlign: "left" }}>
                          {(() => {
                            const inv = inventory.find(i => i.name === log.item_name);
                            return inv && inv.date_received ? new Date(inv.date_received).toLocaleDateString() : '';
                          })()}
                        </td>
                        <td style={{ border: "none", width: "20%", textAlign: "left" }}>{log.item_name}</td>
                        <td style={{ border: "none", width: "15%", textAlign: "center" }}>{log.action}</td>
                        <td style={{ border: "none", width: "15%", textAlign: "center" }}>
                          {log.action === 'Used' ? log.quantity : (() => {
                            const inv = inventory.find(i => i.name === log.item_name);
                            return inv ? inv.quantity : '';
                          })()}
                        </td>
                        <td style={{ border: "none", width: "21%", textAlign: "left" }}>
                          {log.action === 'Used' && log.notes && log.notes.includes('(') && log.notes.includes(')')
                            ? (() => {
                                // Extract student fullname and reason from notes
                                const match = log.notes.match(/^(.+) \((.+)\)$/);
                                if (match) {
                                  return `${match[2]} - ${match[1]}`;
                                } else {
                                  return log.notes;
                                }
                              })()
                            : log.notes}
                        </td>
                        <td style={{ border: "none", width: "15%", textAlign: "center" }}>{log.logged_by_name || log.logged_by || log.username || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination for logs */}
            {logsTotalPages > 1 && (
              <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                <ul className="pagination">
                  <li className={`page-item ${logsCurrentPage === 1 ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" aria-label="Previous" onClick={e => { e.preventDefault(); setLogsCurrentPage(logsCurrentPage - 1); }}>
                      <span aria-hidden="true">Previous</span>
                    </a>
                  </li>
                  {logsTotalPages <= 7 ? (
                    Array.from({ length: logsTotalPages }, (_, i) => (
                      <li key={i + 1} className={`page-item ${logsCurrentPage === i + 1 ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={e => { e.preventDefault(); setLogsCurrentPage(i + 1); }}>{i + 1}</a>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className={`page-item ${logsCurrentPage === 1 ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={e => { e.preventDefault(); setLogsCurrentPage(1); }}>1</a>
                      </li>
                      {logsCurrentPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                      {Array.from({ length: 5 }, (_, i) => logsCurrentPage - 2 + i)
                        .filter(page => page > 1 && page < logsTotalPages)
                        .map(page => (
                          <li key={page} className={`page-item ${logsCurrentPage === page ? 'active' : ''}`}>
                            <a className="page-link" href="#" onClick={e => { e.preventDefault(); setLogsCurrentPage(page); }}>{page}</a>
                          </li>
                        ))}
                      {logsCurrentPage < logsTotalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                      <li className={`page-item ${logsCurrentPage === logsTotalPages ? 'active' : ''}`}>
                        <a className="page-link" href="#" onClick={e => { e.preventDefault(); setLogsCurrentPage(logsTotalPages); }}>{logsTotalPages}</a>
                      </li>
                    </>
                  )}
                  <li className={`page-item ${logsCurrentPage === logsTotalPages ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" aria-labeLast Usedl="Next" onClick={e => { e.preventDefault(); setLogsCurrentPage(logsCurrentPage + 1); }}>
                      <span aria-hidden="true">Next</span>
                    </a>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      )}
      {/* Modal for Add New Stock */}
      {showAddModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-1">Add New Stock</h5>
              </div>
              <form onSubmit={handleAddNewStock}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Item Name</label>
                  <input type="text" className="form-control" value={modalForm.itemName} onChange={e => {
                    const name = e.target.value;
                    const found = inventory.find(i => i.name === name);
                    setModalForm(f => ({
                      ...f,
                      itemName: name,
                      currentQty: getCurrentQty(name),
                      dateReceived: found ? found.date_received || '' : '',
                      notes: found ? found.notes || '' : '',
                    }));
                  }} required placeholder="e.g. Paracetamol 500mg" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Current Quantity</label>
                  <input
                    type="text"
                    className="form-control"
                    value={modalForm.currentQty}
                    onChange={e => setModalForm(f => ({ ...f, currentQty: e.target.value }))}
                    placeholder="e.g. 43 tabs"
                    readOnly={!!inventory.find(i => i.name === modalForm.itemName)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid #22c55e',
                      color: '#22c55e',
                      fontWeight: 700,
                      fontSize: 12,
                      marginRight: 4,
                      lineHeight: 1,
                      textAlign: 'center',
                      background: '#e6f0ea',
                      boxSizing: 'border-box',
                      padding: 0,
                    }}>+</span> Update Quantity
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={modalForm.qtyToAdd}
                    onChange={e => setModalForm(f => ({ ...f, qtyToAdd: e.target.value }))}
                    placeholder="Quantity to Add"
                    required
                    min={1}
                    readOnly={!inventory.find(i => i.name === modalForm.itemName)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date Received</label>
                  <input type="date" className="form-control" value={modalForm.dateReceived} onChange={e => setModalForm(f => ({ ...f, dateReceived: e.target.value }))} required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea className="form-control" rows={2} value={modalForm.notes} onChange={e => setModalForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn-cancel-light-green px-4"
                    style={{
                      background: "none",
                      border: "1px solid #b2e6b2",
                      color: "#171717",
                      boxShadow: "none",
                      fontWeight: 400,
                      fontSize: 16,
                      cursor: "pointer",
                      borderRadius: "6px"
                    }}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success px-4">Add</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Use Item Modal */}
      {showUseModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 600, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-1">Use Item: {useModalItem?.name || '[Item Name]'}</h5>
              </div>
              <form onSubmit={handleUseItem}>
                <div className="mb-3" style={{ position: 'relative' }}>
                  <label className="form-label fw-semibold">Used For</label>
                  <input
                    type="text"
                    className="form-control"
                    value={useForm.usedFor}
                    onChange={handleStudentSearch}
                    onFocus={() => setStudentDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                    placeholder="Search student name..."
                    autoComplete="off"
                    required
                  />
                  {studentDropdownOpen && useForm.usedFor.length > 0 && filteredStudents.length > 0 && (
                    <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                      {filteredStudents.map(s => (
                        <li
                          key={s.id}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                          onMouseDown={() => { setUseForm(f => ({ ...f, usedFor: s.full_name })); setStudentDropdownOpen(false); }}
                        >
                          {s.full_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Quantity to Use</label>
                  <input type="text" className="form-control" value={useForm.qty} onChange={e => setUseForm(f => ({ ...f, qty: e.target.value }))} placeholder="e.g., 1, 2, 3..." required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Reason</label>
                  <textarea className="form-control" rows={2} value={useForm.reason} onChange={e => setUseForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g., 'Student had a fever', 'Minor wound in P.E. class'" required />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn-cancel-light-green px-4"
                    style={{
                      background: "none",
                      border: "1px solid #b2e6b2",
                      color: "#171717",
                      boxShadow: "none",
                      fontWeight: 400,
                      fontSize: 16,
                      cursor: "pointer",
                      borderRadius: "6px"
                    }}
                    onClick={() => setShowUseModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success px-4">Confirm Use</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .no-borders, .no-borders th, .no-borders td {
          border: none !important;
          box-shadow: none !important;
        }
        .no-borders thead th {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
