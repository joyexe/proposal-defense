'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createBulletinPost, updateBulletinPost } from '@/app/utils/api';

const initialState = {
  title: '',
  from: '',
  to: '',
  category: 'Advisory',
  details: '',
};

const BACKEND_URL = 'http://127.0.0.1:8080';

export default function ClinicBulletinPage() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postId, setPostId] = useState(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we're in edit mode
    const edit = searchParams.get('edit');
    if (edit === 'true') {
      setIsEditing(true);
      setPostId(searchParams.get('id'));
      setForm({
        title: searchParams.get('title') || '',
        from: '', // You might want to add this to the URL params if needed
        to: searchParams.get('end_date') || '',
        category: searchParams.get('category') || 'Advisory',
        details: searchParams.get('content') || '',
      });
      if (editorRef.current) {
        editorRef.current.innerHTML = searchParams.get('content') || '';
        // Fix image size for all images in edit mode
        const images = editorRef.current.querySelectorAll('img');
        images.forEach(img => {
          img.style.maxWidth = '300px';
          img.style.maxHeight = '300px';
          img.style.height = 'auto';
          img.style.width = 'auto';
          img.style.display = 'block';
          img.style.margin = '10px 0';
        });
      }
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    setForm((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleDetailsChange = () => {
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, details: editorRef.current.innerHTML }));
    }
  };

  const handleCancel = () => {
    setForm(initialState);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const postData = {
        title: form.title,
        content: form.details,
        category: form.category,
        end_date: form.to,
        post_type: 'Physical', // Capitalized to match Django model
      };

      if (isEditing) {
        await updateBulletinPost(postId, postData);
        alert('Bulletin updated successfully!');
      } else {
        await createBulletinPost(postData);
        alert('Bulletin published successfully!');
      }

      setForm(initialState);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      router.push('/clinic/bulletin/bulletin-posts');
    } catch (error) {
      console.error('Error creating/updating post:', error);
      alert(`Failed to ${isEditing ? 'update' : 'publish'} bulletin. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (command, value) => {
    if (command === 'fontName' || command === 'fontSize') {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, value || null);
    }
    handleDetailsChange();
  };

  // Insert image from device
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetch(`${BACKEND_URL}/api/bulletin/upload-image/`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (data.url) {
          // Always use full backend URL for image src
          const fullUrl = data.url.startsWith('http') ? data.url : `${BACKEND_URL}${data.url}`;
          formatText('insertImage', fullUrl);
        setTimeout(() => {
          if (editorRef.current) {
            const images = editorRef.current.querySelectorAll('img');
            if (images.length > 0) {
                const img = images[images.length - 1];
              img.style.maxWidth = '300px';
              img.style.maxHeight = '300px';
              img.style.height = 'auto';
              img.style.width = 'auto';
              img.style.display = 'block';
              img.style.margin = '10px 0';
            }
          }
        }, 0);
        } else {
          alert('Image upload failed.');
    }
      } catch (err) {
        alert('Image upload error.');
      }
    }
    e.target.value = '';
  };

  return (
    <div className="container-fluid py-4">
      {/* Tab Buttons Above Card */}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/clinic/bulletin' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              onClick={() => router.push('/clinic/bulletin')}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
            >
              {isEditing ? 'Edit Post' : 'Create Post'}
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
      <div className="bg-white p-4 rounded shadow-sm border w-100">
        <h5 className="fw-bold mb-4">{isEditing ? 'Edit Physical Health Bulletin' : 'Create New Physical Health Bulletin'}</h5>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Title:</label>
            <input
              type="text"
              className="form-control"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter post title here"
              required
            />
          </div>
          <div className="mb-3 row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Date: From</label>
              <input
                type="date"
                className="form-control"
                name="from"
                value={form.from}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">To</label>
              <input
                type="date"
                className="form-control"
                name="to"
                value={form.to}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold me-3">Category:</label>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="category"
                id="advisory"
                value="Advisory"
                checked={form.category === 'Advisory'}
                onChange={handleCategoryChange}
              />
              <label className="form-check-label" htmlFor="advisory">Advisory</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="category"
                id="tip"
                value="Tip"
                checked={form.category === 'Tip'}
                onChange={handleCategoryChange}
              />
              <label className="form-check-label" htmlFor="tip">Tip</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="category"
                id="campaign"
                value="Campaign"
                checked={form.category === 'Campaign'}
                onChange={handleCategoryChange}
              />
              <label className="form-check-label" htmlFor="campaign">Campaign</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="category"
                id="emergency"
                value="Emergency Notice"
                checked={form.category === 'Emergency Notice'}
                onChange={handleCategoryChange}
              />
              <label className="form-check-label" htmlFor="emergency">Emergency Notice</label>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Details:</label>
            <div style={{ maxWidth: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
              {/* Toolbar */}
              <div
                style={{
                  background: '#d4f8d4',
                  borderTopLeftRadius: '10px',
                  borderTopRightRadius: '10px',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {/* Undo/Redo */}
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('undo')} title="Undo">
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('redo')} title="Redo">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
                {/* Font Family */}
                <select
                  className="form-select form-select-sm toolbar-btn-green"
                  style={{ width: 180 }}
                  onChange={e => formatText('fontName', e.target.value)}
                  title="Font Family"
                >
                  <option value="Arial">Arial</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Lucida Console">Lucida Console</option>
                  <option value="Palatino Linotype">Palatino Linotype</option>
                  <option value="Garamond">Garamond</option>
                </select>
                {/* Font Size */}
                <select
                  className="form-select form-select-sm toolbar-btn-green"
                  style={{ width: 100 }}
                  onChange={e => formatText('fontSize', e.target.value)}
                  title="Font Size"
                >
                  <option value="1">10</option>
                  <option value="2">13</option>
                  <option value="3">16</option>
                  <option value="4">18</option>
                  <option value="5">24</option>
                  <option value="6">32</option>
                  <option value="7">48</option>
                </select>
                {/* Text Formatting */}
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('bold')} title="Bold">
                  <i className="bi bi-type-bold"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('italic')} title="Italic">
                  <i className="bi bi-type-italic"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('underline')} title="Underline">
                  <i className="bi bi-type-underline"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('strikeThrough')} title="Strikethrough">
                  <i className="bi bi-type-strikethrough"></i>
                </button>
                {/* Text Alignment */}
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('justifyLeft')} title="Align Left">
                  <i className="bi bi-text-left"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('justifyCenter')} title="Align Center">
                  <i className="bi bi-text-center"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('justifyRight')} title="Align Right">
                  <i className="bi bi-text-right"></i>
                </button>
                {/* Lists */}
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('insertUnorderedList')} title="Bullet List">
                  <i className="bi bi-list-ul"></i>
                </button>
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => formatText('insertOrderedList')} title="Numbered List">
                  <i className="bi bi-list-ol"></i>
                </button>
                {/* Links */}
                <button type="button" className="btn btn-sm toolbar-btn-green" onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) formatText('createLink', url);
                }} title="Insert Link">
                  <i className="bi bi-link-45deg"></i>
                </button>
                {/* Image Upload */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <button
                  type="button"
                  className="btn btn-sm toolbar-btn-green"
                  onClick={() => fileInputRef.current?.click()}
                  title="Insert Image"
                >
                  <i className="bi bi-image"></i>
                </button>
              </div>
              {/* Editor */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleDetailsChange}
                style={{
                  minHeight: '200px',
                  padding: '1rem',
                  border: 'none',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn" style={{ background: '#6c757d', color: '#fff', border: 'none' }} onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Now'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .toolbar-btn-green {
          background: #d4f8d4 !important;
          border: 1px solid #222 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          color: #111 !important;
          transition: border 0.2s, box-shadow 0.2s;
        }
        .toolbar-btn-green:hover, .toolbar-btn-green:focus {
          border: 1.5px solid #444 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          color: #111 !important;
        }
      `}</style>
    </div>
  );
}