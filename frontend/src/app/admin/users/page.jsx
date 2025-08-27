'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../utils/api';

export default function UserPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'student',
    student_id: '',
    grade: '',
    section: '',
    date_of_birth: '',
    faculty_id: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const userModalRef = useRef(null);
  const pageRef = useRef(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const bulkUploadModalRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchUsers(currentPage, itemsPerPage);
        setInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        if (error.message.includes('401')) {
          router.push('/login');
        }
        setMessage({ 
          text: 'Failed to initialize. Please refresh the page.', 
          type: 'error' 
        });
      }
    };
    
    initialize();

    // Initialize all dropdowns
    const dropdowns = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    dropdowns.forEach(dropdown => {
      new bootstrap.Dropdown(dropdown);
    });
  }, [router, currentPage, itemsPerPage]);

  // Add a new effect to handle route changes
  useEffect(() => {
    const handleRouteChange = () => {
      fetchUsers(currentPage, itemsPerPage);
    };

    router.events?.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, currentPage, itemsPerPage]);

  const refreshUserData = async () => {
    try {
      await fetchUsers(currentPage, itemsPerPage);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const fetchUsers = async (page, pageSize) => {
    try {
      const response = await fetchWithAuth(`http://127.0.0.1:8080/api/admin/users/?page=${page}&page_size=${pageSize}`);
      const updatedUsers = Array.isArray(response.results) ? response.results : [];
      setUsers(updatedUsers);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (error) {
      setMessage({ 
        text: `Failed to load users: ${error.message}`, 
        type: 'error' 
      });
      throw error;
    }
  };

  // Add a function to force refresh user data
  const forceRefreshUsers = async () => {
    fetchUsers(currentPage, itemsPerPage);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    fetchUsers(pageNumber, itemsPerPage);
  };

  const formatUsername = (fullName) => {
    return fullName.toLowerCase().replace(/\s+/g, '') + '@amieti.com';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // If changing role, reset conditional fields
    if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        role: value,
        student_id: '',
        grade: '',
        faculty_id: '',
        date_of_birth: '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value === undefined || value === null ? '' : value }));
    }
  };

  const closeModal = () => {
    try {
      if (userModalRef.current) {
        const modal = window.bootstrap.Modal.getInstance(userModalRef.current);
        if (modal) {
          modal.hide();
          // Remove modal backdrop and body classes
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
      }
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.full_name || !formData.email || !formData.role) {
      setMessage({ text: 'All fields are required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role
      };

      // Add role-specific fields based on role requirements
      if (formData.role === 'student') {
        requestBody.grade = formData.grade || '';
        requestBody.section = formData.section || '';
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      } else if (formData.role === 'faculty') {
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      } else if (formData.role === 'counselor' || formData.role === 'admin' || formData.role === 'clinic') {
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      }

      const response = await fetchWithAuth('http://127.0.0.1:8080/api/admin/users/', {
        method: 'POST',
        body: requestBody
      });

      if (response.error) {
        setMessage({ 
          text: `Failed to create user: ${response.error}`, 
          type: 'error' 
        });
      } else {
        let successMessage = 'User created successfully!';
        if (response.warning) {
          successMessage += ` (Warning: ${response.warning})`;
          setMessage({
            text: successMessage,
            type: 'warning'
          });
        } else {
          setMessage({
            text: successMessage + ' Login credentials have been sent via email.',
            type: 'success'
          });
        }
        await fetchUsers(currentPage, itemsPerPage);
        resetForm();
        closeModal();
        
        // Refresh admin dashboard recent activity with a small delay to ensure backend logging
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.refreshAdminDashboardActivity) {
            window.refreshAdminDashboardActivity();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Create user error:', error);
      setMessage({ 
        text: 'Failed to create user. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!formData.full_name || !formData.email || !formData.role || !editingUserId) {
      setMessage({ text: 'All fields are required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        user_id: editingUserId,
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role
      };

      // Add role-specific fields based on role requirements
      if (formData.role === 'student') {
        requestBody.grade = formData.grade || '';
        requestBody.section = formData.section || '';
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      } else if (formData.role === 'faculty') {
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      } else if (formData.role === 'counselor' || formData.role === 'admin' || formData.role === 'clinic') {
        // Only add date_of_birth if it's provided and valid
        if (formData.date_of_birth && formData.date_of_birth.trim() !== '') {
          requestBody.date_of_birth = formData.date_of_birth;
        }
      }

      const response = await fetchWithAuth('http://127.0.0.1:8080/api/admin/users/', {
        method: 'PUT',
        body: requestBody
      });

      if (response.error) {
        setMessage({ 
          text: `Failed to update user: ${response.error}`, 
          type: 'error' 
        });
      } else {
        let successMessage = 'User updated successfully!';
        if (response.warning) {
          successMessage += ` (Warning: ${response.warning})`;
          setMessage({
            text: successMessage,
            type: 'warning'
          });
        } else {
          setMessage({
            text: successMessage + ' New login credentials have been sent via email.',
            type: 'success'
          });
        }
        await fetchUsers(currentPage, itemsPerPage);
        resetForm();
        closeModal();
        
        // Refresh admin dashboard recent activity with a small delay to ensure backend logging
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.refreshAdminDashboardActivity) {
            window.refreshAdminDashboardActivity();
          }
        }, 1000);
      }
    } catch (error) {
      setMessage({ 
        text: 'Failed to update user. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      student_id: user.student_id || '',
      grade: user.grade || '',
      section: user.section || '',
      faculty_id: user.faculty_id || '',
      date_of_birth: user.dob || ''
    });
    setIsEditing(true);
    setEditingUserId(user.id);
    if (userModalRef.current) {
      const modal = new window.bootstrap.Modal(userModalRef.current);
      modal.show();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth('http://127.0.0.1:8080/api/admin/users/', {
        method: 'DELETE',
        body: { user_id: userId },
      });

      setMessage({ 
        text: 'User deleted successfully', 
        type: 'success' 
      });
      await fetchUsers(currentPage, itemsPerPage);
      if (editingUserId === userId) {
        resetForm();
      }
    } catch (error) {
      setMessage({ 
        text: 'Failed to delete user. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableUser = async (userId) => {
    if (!window.confirm('Are you sure you want to disable this user?')) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`http://127.0.0.1:8080/api/admin/users/${userId}/disable/`, {
        method: 'PUT',
      });

      if (response.error) {
        setMessage({ 
          text: `Failed to disable user: ${response.error}`, 
          type: 'error' 
        });
      } else {
        setMessage({ 
          text: 'User disabled successfully', 
          type: 'success' 
        });
        await fetchUsers(currentPage, itemsPerPage);
      }
    } catch (error) {
      setMessage({ 
        text: 'Failed to disable user. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreUser = async (userId) => {
    if (!window.confirm('Are you sure you want to restore this user?')) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`http://127.0.0.1:8080/api/admin/users/${userId}/restore/`, {
        method: 'PUT',
      });

      if (response.error) {
        setMessage({ 
          text: `Failed to restore user: ${response.error}`, 
          type: 'error' 
        });
      } else {
        setMessage({ 
          text: 'User restored successfully', 
          type: 'success' 
        });
        await fetchUsers(currentPage, itemsPerPage);
      }
    } catch (error) {
      setMessage({ 
        text: 'Failed to restore user. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      role: 'student',
      student_id: '',
      grade: '',
      section: '',
      date_of_birth: '',
      faculty_id: ''
    });
    setIsEditing(false);
    setEditingUserId(null);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'faculty': return 'info';
      case 'clinic': return 'warning';
      case 'counselor': return 'success';
      case 'student': return 'primary';
      default: return 'secondary';
    }
  };

  const formatRoleDisplay = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'faculty': return 'Faculty';
      case 'clinic': return 'Nurse';
      case 'counselor': return 'Counselor';
      case 'student': return 'Student';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const handleAddUserClick = () => {
    resetForm();
    if (userModalRef.current) {
      const modal = new window.bootstrap.Modal(userModalRef.current);
      modal.show();
    }
  };

  const handleCloseUserModal = () => {
    if (userModalRef.current) {
      const modal = window.bootstrap.Modal.getInstance(userModalRef.current);
      if (modal) {
        modal.hide();
      }
    }
    resetForm();
  };

  const handleRefresh = async () => {
    await fetchUsers(currentPage, itemsPerPage);
  };

  const handleBulkUploadClick = () => {
    setSelectedFile(null);
    setUploadResults(null);
    if (bulkUploadModalRef.current) {
      const modal = new window.bootstrap.Modal(bulkUploadModalRef.current);
      modal.show();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      setMessage({ text: 'Please select a valid CSV file', type: 'error' });
      setSelectedFile(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      setMessage({ text: 'Please select a CSV file first', type: 'error' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('csv_file', selectedFile);

      // Use fetchWithAuth for proper authentication handling
      const response = await fetchWithAuth('http://127.0.0.1:8080/api/admin/users/bulk-upload/', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      });

      if (response.error) {
        setMessage({ 
          text: `Bulk upload failed: ${response.error}`, 
          type: 'error' 
        });
      } else {
        setUploadResults(response);
        setMessage({ 
          text: `Bulk upload completed! ${response.success_count} users created successfully.`, 
          type: 'success' 
        });
        await fetchUsers(currentPage, itemsPerPage);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      setMessage({ 
        text: 'Failed to upload file. Please try again.', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const closeBulkUploadModal = () => {
    if (bulkUploadModalRef.current) {
      const modal = window.bootstrap.Modal.getInstance(bulkUploadModalRef.current);
      if (modal) {
        modal.hide();
      }
    }
    setSelectedFile(null);
    setUploadResults(null);
  };



  const handleDropdownClick = (userId) => {
    setOpenDropdownId(openDropdownId === userId ? null : userId);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (!initialized) {
    return (
      <div className="container-fluid">
        <div className="row vh-100 justify-content-center align-items-center">
          <div className="col-12 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" ref={pageRef}>
      <div className="row vh-100">
        <div className="col-12 p-4">
          {/* Filter Row - MATCH STUDENT BULLETIN STYLE */}
          <div className="d-flex align-items-center mb-3" style={{ gap: '12px' }}>
            {/* Search Input */}
            <div className="flex-grow-1 position-relative" style={{ maxWidth: 300 }}>
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search users..."
                aria-label="Search users"
                style={{ height: 40, borderRadius: 8 }}
                // TODO: Add value and onChange for search functionality if needed
              />
              <span style={{ position: 'absolute', left: 16, top: 10, color: '#bdbdbd', fontSize: 18 }}>
                <i className="bi bi-search"></i>
              </span>
            </div>
            {/* Filter by Dropdown */}
            <div style={{ position: 'relative', width: 160 }}>
              <select
                className="form-select"
                // TODO: Add value and onChange for filter functionality if needed
                style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
              >
                <option value="">Filter by</option>
                <option value="Action">Action</option>
                <option value="Another action">Another action</option>
                <option value="Something else here">Something else here</option>
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                <i className="bi bi-chevron-down"></i>
              </span>
            </div>
            {/* Date Dropdown */}
            <div style={{ position: 'relative', width: 160 }}>
              <select
                className="form-select"
                // TODO: Add value and onChange for date filter functionality if needed
                style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
              >
                <option value="">Date</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                <i className="bi bi-chevron-down"></i>
              </span>
            </div>
            {/* Status Dropdown */}
            <div style={{ position: 'relative', width: 160 }}>
              <select
                className="form-select"
                // TODO: Add value and onChange for status filter functionality if needed
                style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
              >
                <option value="">Status</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                <i className="bi bi-chevron-down"></i>
              </span>
            </div>
            {/* Add User Button */}
            <button 
              type="button" 
              className="btn btn-success ms-auto mb-2 mb-md-0 me-2" 
              onClick={handleAddUserClick}
              style={{ 
                borderRadius: 8, 
                fontWeight: 500,
                padding: '8px 16px',
                fontSize: '14px',
                transition: 'all 0.2s ease-in-out',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>Add User
            </button>
            {/* Bulk Upload Button */}
            <button 
              type="button" 
              className="btn btn-success mb-2 mb-md-0" 
              onClick={handleBulkUploadClick}
              style={{ 
                borderRadius: 8, 
                fontWeight: 500,
                padding: '8px 16px',
                fontSize: '14px',
                transition: 'all 0.2s ease-in-out',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <i className="bi bi-upload me-2"></i>Bulk Upload
            </button>
          </div>

          {message.text && (
            <div className={`alert alert-${message.type} fade show`} role="alert">
              {message.text}
            </div>
          )}

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table align-middle user-management-table table-borderless">
                  <thead>
                    <tr>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">User ID</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last Login</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{new Date(user.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                        <td>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.role === 'student' && user.student_id ? (
                            <span className="badge" style={{ backgroundColor: '#ffd54f', color: '#8d6e63' }}>{user.student_id}</span>
                          ) : user.role === 'faculty' && user.faculty_id ? (
                            <span className="badge" style={{ backgroundColor: '#90caf9', color: '#1565c0' }}>{user.faculty_id}</span>
                          ) : user.role === 'counselor' && user.faculty_id ? (
                            <span className="badge" style={{ backgroundColor: '#80cbc4', color: '#00695c' }}>{user.faculty_id}</span>
                          ) : user.role === 'admin' && user.faculty_id ? (
                            <span className="badge" style={{ backgroundColor: '#bdbdbd', color: '#424242' }}>{user.faculty_id}</span>
                          ) : user.role === 'clinic' && user.faculty_id ? (
                            <span className="badge" style={{ backgroundColor: '#a5d6a7', color: '#2e7d32' }}>{user.faculty_id}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{formatRoleDisplay(user.role)}</td>
                        <td>
                          <span className={`badge bg-${user.is_active ? 'success' : 'danger'}`}>
                            {user.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</td>
                        <td style={{ minWidth: '120px', paddingRight: '20px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <button className="btn btn-success btn-sm" onClick={() => handleEditUser(user)}>
                              Edit
                            </button>
                            <div className="dropdown position-relative">
                              <button 
                                className="btn btn-light rounded-circle btn-sm" 
                                type="button" 
                                onClick={() => handleDropdownClick(user.id)}
                                style={{ width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="bi bi-three-dots-vertical" style={{ color: '#000' }}></i>
                              </button>
                              {openDropdownId === user.id && (
                                <div className="dropdown-menu show" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 1000, minWidth: '120px' }}>
                                  {user.is_active ? (
                                    <button 
                                      className="dropdown-item" 
                                      onClick={() => {
                                        handleDisableUser(user.id);
                                        setOpenDropdownId(null);
                                      }}
                                    >
                                      Disable
                                    </button>
                                  ) : (
                                    <button 
                                      className="dropdown-item" 
                                      onClick={() => {
                                        handleRestoreUser(user.id);
                                        setOpenDropdownId(null);
                                      }}
                                    >
                                      Restore
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center">No users found.</td>
                      </tr>
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
          </div>

          {/* User Modal */}
          <div className="modal fade" id="userModal" tabIndex="-1" aria-labelledby="userModalLabel" aria-hidden="true" ref={userModalRef} data-bs-backdrop="static" data-bs-keyboard="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ 
                borderRadius: 16, 
                boxShadow: "0 4px 32px rgba(0,0,0,0.15)", 
                background: "#fff",
                border: "none"
              }}>
                <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
                  <h5 className="modal-title fw-bold" style={{ fontSize: "20px", color: "#222" }} id="userModalLabel">
                    {isEditing ? 'Edit User' : 'Add User'}
                  </h5>
                </div>
                <div className="modal-body" style={{ padding: "20px 24px 24px 24px" }}>
                  <form>
                    <div className="mb-3">
                      <label htmlFor="fullName" className="form-label">Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="fullName" 
                        name="full_name" 
                        value={formData.full_name || ''} 
                        onChange={handleInputChange} 
                        placeholder="e.g., Michael Ramos"
                        required 
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        id="email" 
                        name="email" 
                        value={formData.email || ''} 
                        onChange={handleInputChange} 
                        placeholder="Must be the user's official email"
                        required 
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="role" className="form-label">Role</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select className="form-select" id="role" name="role" value={formData.role || ''} onChange={handleInputChange} required style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                          <option value="">Select Role</option>
                          <option value="student">Student</option>
                          <option value="clinic">Nurse</option>
                          <option value="counselor">Counselor</option>
                          <option value="faculty">Faculty</option>
                          <option value="admin">Admin</option>
                        </select>
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                          <i className="bi bi-chevron-down"></i>
                        </span>
                      </div>
                    </div>
                    {/* Conditional fields for Student */}
                    {formData.role === 'student' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="studentId" className="form-label">Student ID</label>
                          <input
                            type="text"
                            className="form-control"
                            id="studentId"
                            name="student_id"
                            value={formData.student_id || ''}
                            onChange={handleInputChange}
                            placeholder="Permanent ID (e.g., SID-2024-00001)"
                            readOnly={true}
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Student ID is permanent and cannot be changed
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="levelSection" className="form-label">Grade</label>
                          <input
                            type="text"
                            className="form-control"
                            id="levelSection"
                            name="grade"
                            value={formData.grade || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., Grade 10"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="section" className="form-label">Section</label>
                          <input
                            type="text"
                            className="form-control"
                            id="section"
                            name="section"
                            value={formData.section || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., Section A"
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="studentDob" className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            id="studentDob"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    )}
                    {/* Conditional fields for Faculty */}
                    {formData.role === 'faculty' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="facultyId" className="form-label">Faculty ID</label>
                          <input
                            type="text"
                            className="form-control"
                            id="facultyId"
                            name="faculty_id"
                            value={formData.faculty_id || ''}
                            onChange={handleInputChange}
                            placeholder="Permanent ID (e.g., FID-2024-00001)"
                            readOnly={true}
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Faculty ID is permanent and cannot be changed
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="facultyDob" className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            id="facultyDob"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    )}
                    {/* Conditional fields for Counselor */}
                    {formData.role === 'counselor' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="counselorId" className="form-label">Counselor ID</label>
                          <input
                            type="text"
                            className="form-control"
                            id="counselorId"
                            name="faculty_id"
                            value={formData.faculty_id || ''}
                            onChange={handleInputChange}
                            placeholder="Permanent ID (e.g., CID-2024-00001)"
                            readOnly={true}
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Counselor ID is permanent and cannot be changed
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="counselorDob" className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            id="counselorDob"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    )}
                    {/* Conditional fields for Admin */}
                    {formData.role === 'admin' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="adminId" className="form-label">Admin ID</label>
                          <input
                            type="text"
                            className="form-control"
                            id="adminId"
                            name="faculty_id"
                            value={formData.faculty_id || ''}
                            onChange={handleInputChange}
                            placeholder="Permanent ID (e.g., AID-2024-00001)"
                            readOnly={true}
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Admin ID is permanent and cannot be changed
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="adminDob" className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            id="adminDob"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    )}
                    {/* Conditional fields for Clinic/Nurse */}
                    {formData.role === 'clinic' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="clinicId" className="form-label">Nurse ID</label>
                          <input
                            type="text"
                            className="form-control"
                            id="clinicId"
                            name="faculty_id"
                            value={formData.faculty_id || ''}
                            onChange={handleInputChange}
                            placeholder="Permanent ID (e.g., NID-2024-00001)"
                            readOnly={true}
                            style={{ backgroundColor: '#f8f9fa' }}
                          />
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Nurse ID is permanent and cannot be changed
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="clinicDob" className="form-label">Date of Birth</label>
                          <input
                            type="date"
                            className="form-control"
                            id="clinicDob"
                            name="date_of_birth"
                            value={formData.date_of_birth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </>
                    )}
                  </form>
                </div>
                <div className="modal-footer border-0" style={{ padding: "0 24px 24px 24px" }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    data-bs-dismiss="modal" 
                    onClick={handleCloseUserModal}
                    style={{
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: '1px solid #6c757d',
                      background: '#6c757d',
                      color: '#fff',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    onClick={isEditing ? handleUpdateUser : handleCreateUser} 
                    disabled={loading}
                    style={{
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: 'none',
                      background: '#28a745',
                      color: '#fff',
                      transition: 'all 0.2s ease-in-out',
                      marginLeft: '12px'
                    }}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Upload Modal */}
          <div className="modal fade" id="bulkUploadModal" tabIndex="-1" aria-labelledby="bulkUploadModalLabel" aria-hidden="true" ref={bulkUploadModalRef} data-bs-backdrop="static" data-bs-keyboard="false">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ 
                borderRadius: 16, 
                boxShadow: "0 4px 32px rgba(0,0,0,0.15)", 
                background: "#fff",
                border: "none"
              }}>
                <div className="modal-header border-0 pb-0" style={{ padding: "24px 24px 0 24px" }}>
                  <h5 className="modal-title fw-bold" style={{ fontSize: "20px", color: "#222" }} id="bulkUploadModalLabel">
                    Bulk Upload Users
                  </h5>
                </div>
                <div className="modal-body" style={{ padding: "20px 24px 24px 24px" }}>
                  {!uploadResults ? (
                    <div>
                      <div className="alert alert-info" style={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        background: '#e3f2fd', 
                        color: '#1565c0',
                        padding: '16px 20px'
                      }}>
                        <h6 className="fw-bold mb-3" style={{ fontSize: '16px', color: '#1565c0' }}>
                          <i className="bi bi-info-circle me-2"></i>Instructions
                        </h6>
                        <p className="mb-3" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                          Upload a CSV file with the following columns:
                        </p>
                        <ul className="mb-3" style={{ fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px' }}>
                          <li><strong>Name</strong> - Full name of the user</li>
                          <li><strong>Email</strong> - Official email address</li>
                          <li><strong>Role</strong> - student, faculty, counselor, clinic, or admin</li>
                          <li><strong>Grade</strong> - Grade level (for students)</li>
                          <li><strong>Section</strong> - Section (for students)</li>
                          <li><strong>Date of Birth</strong> - Date of birth (YYYY-MM-DD format)</li>
                        </ul>
                        <p className="mb-0" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                          <strong>Note:</strong> Login credentials will be automatically generated and sent via email.
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="csvFile" className="form-label fw-semibold" style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                          Select CSV File
                        </label>
                        <input 
                          type="file" 
                          className="form-control" 
                          id="csvFile" 
                          accept=".csv"
                          onChange={handleFileSelect}
                          style={{ 
                            borderRadius: 8, 
                            border: '1px solid #ddd',
                            padding: '12px 16px',
                            fontSize: '14px'
                          }}
                        />
                        {selectedFile && (
                          <div className="mt-2">
                            <small className="text-success fw-medium" style={{ fontSize: '13px' }}>
                              <i className="bi bi-check-circle me-1"></i>
                              Selected: {selectedFile.name}
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between p-3" style={{
                          background: '#f8f9fa',
                          borderRadius: 8,
                          border: '1px solid #e9ecef'
                        }}>
                          <div>
                            <h6 className="mb-1 fw-semibold" style={{ fontSize: '14px', color: '#333' }}>
                              Need a template?
                            </h6>
                            <p className="mb-0" style={{ fontSize: '13px', color: '#666' }}>
                              Download our sample CSV file to see the correct format
                            </p>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={(e) => {
                              e.preventDefault();
                              // Create sample CSV content
                              const sampleCSV = `Name,Email,Role,Grade,Section,Date of Birth
John Doe,john.doe@amieti.com,student,Grade 10,A,2005-03-15
Jane Smith,jane.smith@amieti.com,faculty,,,1980-07-22
Mike Johnson,mike.johnson@amieti.com,counselor,,,1975-11-08
David Brown,david.brown@amieti.com,clinic,,,1985-12-03
Admin User,admin.user@amieti.com,admin,,,1970-01-01`;
                              
                              // Create and download the file
                              const blob = new Blob([sampleCSV], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'sample_users.csv';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            }}
                            style={{
                              borderRadius: 8,
                              padding: '10px 16px',
                              fontSize: '14px',
                              fontWeight: 500,
                              border: 'none',
                              background: '#007bff',
                              color: '#fff',
                              transition: 'all 0.2s ease-in-out',
                              display: 'inline-flex',
                              alignItems: 'center',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <i className="bi bi-download me-2"></i>
                            Download Sample CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className={`alert alert-${uploadResults.error_count > 0 ? 'warning' : 'success'}`} style={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        padding: '16px 20px',
                        background: uploadResults.error_count > 0 ? '#fff3cd' : '#d1edff',
                        color: uploadResults.error_count > 0 ? '#856404' : '#0c5460'
                      }}>
                        <h6 className="fw-bold mb-3" style={{ fontSize: '16px' }}>
                          <i className="bi bi-info-circle me-2"></i>Upload Results
                        </h6>
                        <p className="mb-3" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                          {uploadResults.message}
                        </p>
                        <ul className="mb-0" style={{ fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px' }}>
                          <li>Total processed: {uploadResults.total_processed}</li>
                          <li>Successfully created: {uploadResults.success_count}</li>
                          <li>Errors: {uploadResults.error_count}</li>
                        </ul>
                      </div>

                      {uploadResults.success.length > 0 && (
                        <div className="mb-4">
                          <h6 className="fw-semibold mb-3" style={{ fontSize: '16px', color: '#333' }}>
                            Successfully Created Users:
                          </h6>
                          <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                            <table className="table table-sm mb-0" style={{ fontSize: '13px' }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>Name</th>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>Email</th>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>Role</th>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>ID</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uploadResults.success.map((item, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px' }}>{item.user.full_name}</td>
                                    <td style={{ padding: '12px 16px' }}>{item.user.email}</td>
                                    <td style={{ padding: '12px 16px' }}>{item.user.role}</td>
                                    <td style={{ padding: '12px 16px' }}>{item.user.student_id || item.user.faculty_id}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {uploadResults.errors.length > 0 && (
                        <div className="mb-4">
                          <h6 className="fw-semibold mb-3" style={{ fontSize: '16px', color: '#333' }}>
                            Errors:
                          </h6>
                          <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                            <table className="table table-sm mb-0" style={{ fontSize: '13px' }}>
                              <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>Row</th>
                                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uploadResults.errors.map((error, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px' }}>{error.row}</td>
                                    <td style={{ padding: '12px 16px', color: '#dc3545' }}>{error.error}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0" style={{ padding: "0 24px 24px 24px" }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeBulkUploadModal}
                    style={{
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: '1px solid #6c757d',
                      background: '#6c757d',
                      color: '#fff',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {uploadResults ? 'Close' : 'Cancel'}
                  </button>
                  {!uploadResults && (
                    <button 
                      type="button" 
                      className="btn btn-success" 
                      onClick={handleBulkUpload}
                      disabled={!selectedFile || uploading}
                      style={{
                        borderRadius: 8,
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        background: '#28a745',
                        color: '#fff',
                        transition: 'all 0.2s ease-in-out',
                        marginLeft: '12px'
                      }}
                    >
                      {uploading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : null}
                      Upload Users
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}