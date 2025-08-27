'use client';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { getBulletinPosts, toggleBulletinPostStatus } from '@/app/utils/api';

const categories = [
  'All',
  'Advisory',
  'Tip',
  'Campaign',
  'Emergency Notice',
];

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

export default function BulletinPostsPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [category, setCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const [dropdownUp, setDropdownUp] = useState(false);

  // Filtered posts
  const filteredPosts = posts.filter(post =>
    (category === 'All' || post.category === category) &&
    (search === '' || post.title.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'dateDesc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'dateAsc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'titleAsc') return a.title.localeCompare(b.title);
    if (sortBy === 'titleDesc') return b.title.localeCompare(a.title);
    return 0;
  });

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => {
    fetchPosts();
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleShowHide = async (postId) => {
    try {
      const result = await toggleBulletinPostStatus(postId);
      await fetchPosts();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Error toggling post status:', error);
      alert('Failed to update post status. Please try again.');
    }
  };

  const handleEdit = (post) => {
    const params = new URLSearchParams({
      edit: 'true',
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      end_date: post.end_date || ''
    }).toString();
    router.push(`/clinic/bulletin?${params}`);
  };

  const handleDropdown = (postId, event) => {
    setOpenDropdown(openDropdown === postId ? null : postId);
    if (event) {
      const rect = event.target.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      setDropdownUp(rect.bottom + 120 > windowHeight); // 120px is approx. dropdown height
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/bulletin' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => router.push('/clinic/bulletin')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
            >
              Create Post
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/bulletin/bulletin-posts' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => router.push('/clinic/bulletin/bulletin-posts')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
            >
              All Post
            </button>
          </li>
        </ul>
      </div>
      {/* All Post UI below */}
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
        <div style={{ position: 'relative', minWidth: 160 }}>
          <select
            className="form-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ height: 40, borderRadius: 8, appearance: 'none', paddingRight: 32 }}
          >
            <option value="">Sort by</option>
            <option value="dateDesc">Newest First</option>
            <option value="dateAsc">Oldest First</option>
            <option value="titleAsc">Title (A-Z)</option>
            <option value="titleDesc">Title (Z-A)</option>
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
        <div style={{ position: 'relative', minWidth: 160 }}>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ height: 40, borderRadius: 8, appearance: 'none', paddingRight: 32 }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
      </div>
      <div className="bg-white rounded shadow-sm p-4" style={{ minHeight: 350 }}>
        <h5 className="fw-bold mb-4">Bulletin Archive</h5>
        <div className="table-responsive" style={{ overflow: 'visible' }}>
          <table className="table no-borders align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ border: 'none' }}>Title</th>
                <th style={{ border: 'none' }}>Date</th>
                <th style={{ border: 'none' }}>Category</th>
                <th style={{ border: 'none' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4" style={{ border: 'none' }}>Loading...</td>
                </tr>
              ) : paginatedPosts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4" style={{ border: 'none' }}>No bulletins found.</td>
                </tr>
              ) : (
                paginatedPosts.map((post) => (
                  <tr key={post.id} style={{ overflow: 'visible' }}>
                    <td style={{ border: 'none' }}>{post.title}</td>
                    <td style={{ border: 'none' }}>{new Date(post.created_at).toLocaleString()}</td>
                    <td style={{ border: 'none' }}>
                      <span
                        className="badge rounded-pill px-3 py-2"
                        style={getCategoryBadgeStyle(post.category)}
                      >
                        {post.category}
                      </span>
                    </td>
                    <td style={{ border: 'none', position: 'relative', overflow: 'visible' }}>
                      <span
                        style={{ cursor: 'pointer', fontSize: 20 }}
                        onClick={e => handleDropdown(post.id, e)}
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </span>
                      {openDropdown === post.id && (
                        <ul
                          className={`dropdown-menu show${dropdownUp ? ' dropup' : ''}`}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: dropdownUp ? 'auto' : '100%',
                            bottom: dropdownUp ? '100%' : 'auto',
                            zIndex: 1000,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            border: '1px solid #e0e0e0',
                            minWidth: 120,
                            background: '#fff',
                            padding: 0
                          }}
                          ref={dropdownRef}
                        >
                          {post.status === 'Archived' && !post.is_ended && (
                            <li><button className="dropdown-item" onClick={() => handleShowHide(post.id)}>Show</button></li>
                          )}
                          {post.status === 'Archived' && (
                            <li><button className="dropdown-item" onClick={() => handleEdit(post)}>Edit</button></li>
                          )}
                          {post.status === 'Posted' && (
                            <>
                              <li><button className="dropdown-item" onClick={() => handleShowHide(post.id)}>Hide</button></li>
                              <li><button className="dropdown-item" onClick={() => handleEdit(post)}>Edit</button></li>
                            </>
                          )}
                        </ul>
                      )}
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