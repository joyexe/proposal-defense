'use client';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { getActiveBulletinPosts } from '@/app/utils/api';

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

function wrapImagesWithContainer(html) {
  if (typeof window === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  const imgs = div.querySelectorAll('img');
  imgs.forEach(img => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '300px';
    wrapper.style.margin = '0.1rem 0';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.background = '#f8fafc';
    img.style.borderRadius = '8px';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  });
  return div.innerHTML;
}

export default function FacultyBulletinPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getActiveBulletinPosts();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Only show non-ended and non-archived posts in announcements tab
  const activePosts = posts.filter(post => !post.is_ended && post.status !== 'Archived');
  const postsToShow = activePosts.slice(carouselIndex, carouselIndex + 3);
  const canGoPrev = carouselIndex > 0;
  const canGoNext = carouselIndex + 3 < activePosts.length;
  const handlePrev = () => { if (canGoPrev) setCarouselIndex(carouselIndex - 1); };
  const handleNext = () => { if (canGoNext) setCarouselIndex(carouselIndex + 1); };

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
            <option value="Type">Type</option>
            <option value="Announcement">Announcement</option>
            <option value="Event">Event</option>
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
      {/* Carousel Cards */}
      <div className="d-flex align-items-center justify-content-center mb-4" style={{ minHeight: 350 }}>
        {canGoPrev && (
          <button className="btn btn-outline-success me-2" onClick={handlePrev} style={{ borderRadius: '50%' }}>
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <div className="row g-4 flex-nowrap" style={{ width: '100%', overflow: 'hidden' }}>
          {postsToShow.length === 0 ? (
            <div className="col-12 text-center text-muted py-4">No bulletins found.</div>
          ) : (
            postsToShow.map((post) => (
              <div className="col-md-4" key={post.id} style={{ minWidth: 0, flex: '0 0 33.3333%' }}>
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body">
                    <h5 className="card-title fw-bold">{post.title}</h5>
                    <div className="mb-2 text-muted" style={{ fontSize: '0.95rem' }}>
                      <i className="bi bi-calendar-event me-2"></i>
                      {new Date(post.updated_at || post.created_at).toLocaleString()}
                    </div>
                    <div className="mb-2" style={{ fontSize: '0.95rem' }}>
                      <i className="bi bi-info-circle me-2"></i>
                      <span dangerouslySetInnerHTML={{ __html: wrapImagesWithContainer(post.content) }} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-light border me-2" style={{ color: 'black' }}>
                        Type: <span className="fw-semibold" style={{ color: 'black' }}>{formatType(post.post_type)}</span>
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {canGoNext && (
          <button className="btn btn-outline-success ms-2" onClick={handleNext} style={{ borderRadius: '50%' }}>
            <i className="bi bi-arrow-right"></i>
          </button>
        )}
      </div>
      <style jsx>{`
        .card.h-100 {
          max-width: 420px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .row.g-4.flex-nowrap {
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
        }
        .col-md-4 {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .card-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 0.75rem 0.75rem 0.75rem;
          flex: 1 1 auto;
          justify-content: flex-start;
        }
        .card-title {
          margin-bottom: 0.25rem !important;
        }
        .mb-2 {
          margin-bottom: 0.15rem !important;
        }
        .card-body img {
          display: block !important;
          margin: 0 auto !important;
          max-width: 100% !important;
          max-height: 300px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          border-radius: 8px !important;
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
