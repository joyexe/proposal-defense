'use client';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getBulletinPosts } from '@/app/utils/api';

const formatType = (type) => {
  if (!type) return '';
  const map = {
    'physical health': 'Physical Health',
    'mental health': 'Mental Health',
    'announcement': 'Announcement',
    'event': 'Event',
  };
  return map[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const formatStatus = (status) => {
  if (!status) return '';
  const map = {
    'posted': 'Posted',
    'archive': 'Archive',
    'archived': 'Archive',
    'ended': 'Ended',
  };
  return map[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const getCategoryBadgeStyle = (category) => {
  switch (category) {
    case 'Advisory':
      return { backgroundColor: '#e3f2fd', color: '#1976d2' };
    case 'Tip':
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
    case 'Campaign':
      return { backgroundColor: '#fff3e0', color: '#f57c00' };
    case 'Emergency Notice':
      return { backgroundColor: '#ffebee', color: '#d32f2f' };
    default:
      return { backgroundColor: '#f5f5f5', color: '#616161' };
  }
};

// Helper function for pagination (same as admin logs)
function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

export default function BulletinPostsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getBulletinPosts();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post =>
    (category === 'All' || post.category.toLowerCase() === category.toLowerCase()) &&
    (type === '' || post.post_type === type) &&
    (search === '' || post.title.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  
  const handlePageChange = (page) => {
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="py-4" style={{ width: '100%' }}>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-4" style={{ width: '100%' }}>
      <span className="fw-bold text-black mb-1 d-block" style={{ fontSize: 22 }}>Health Bulletin</span>
      <div className="text-muted mb-4" style={{ fontSize: '1rem' }}>
        Stay informed with health updates & notices
      </div>
      {/* Tab Buttons */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/faculty/bulletin' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => router.push('/faculty/bulletin')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
            >
              Announcements
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/faculty/bulletin/bulletin-posts' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => router.push('/faculty/bulletin/bulletin-posts')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
            >
              All Post
            </button>
          </li>
        </ul>
      </div>
      {/* Filters */}
      <div className="d-flex align-items-center mb-3" style={{ gap: '12px' }}>
        <div className="position-relative" style={{ width: 300 }}>
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search bulletins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ height: 40, borderRadius: 8 }}
          />
          <span style={{ position: 'absolute', left: 16, top: 10, color: '#bdbdbd', fontSize: 18 }}>
            <i className="bi bi-search"></i>
          </span>
        </div>
        <div style={{ position: 'relative', width: 160 }}>
          <select
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
          >
            <option value="All Types">Type</option>
            <option value="Physical">Physical Health</option>
            <option value="Mental">Mental Health</option>
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
        <div style={{ position: 'relative', width: 160 }}>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}
          >
            <option value="All">Category</option>
            <option value="Advisory">Advisory</option>
            <option value="Tip">Tip</option>
            <option value="Campaign">Campaign</option>
            <option value="Emergency Notice">Emergency Notice</option>
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
      </div>
      {/* Table of Posts */}
      <div className="bg-white rounded shadow-sm p-4" style={{ minHeight: 350 }}>
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ border: 'none' }}>Date Posted</th>
                <th style={{ border: 'none' }}>Title</th>
                <th style={{ border: 'none' }}>Type</th>
                <th style={{ border: 'none' }}>Category</th>
                <th style={{ border: 'none' }}>Status</th>

              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4" style={{ border: 'none' }}>Loading...</td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4" style={{ border: 'none' }}>No bulletins found.</td>
                </tr>
              ) : (
                getPagedData(filteredPosts, currentPage, postsPerPage).map((post) => (
                  <tr key={post.id}>
                    <td style={{ border: 'none' }}>{new Date(post.updated_at || post.created_at).toLocaleString()}</td>
                    <td style={{ border: 'none' }}>{post.title}</td>
                    <td style={{ border: 'none' }}>{formatType(post.post_type)}</td>
                    <td style={{ border: 'none' }}>
                      <span className="badge rounded-pill px-3 py-2" style={getCategoryBadgeStyle(post.category)}>
                        {post.category}
                      </span>
                    </td>
                    <td style={{ border: 'none' }}>
                      {post.status === 'Archived' || post.is_ended ? 'Archived' : 'Posted'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {(() => {
          const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
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
    </div>
  );
}
