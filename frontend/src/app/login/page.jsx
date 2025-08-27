'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../utils/api';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      // Get CSRF token first
      await fetch('http://127.0.0.1:8080/api/get-csrf-token/', {
        method: 'GET',
        credentials: 'include',
      });
      
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
        
      const response = await fetch('http://127.0.0.1:8080/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username: formData.username, 
          password: formData.password 
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (!data.access || !data.refresh) {
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('full_name', data.user.full_name);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      setMessage('✓ Login successful! Redirecting...');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'token',
        newValue: data.access
      }));
      setTimeout(async () => {
        // Check if user has accepted terms and conditions
        if (!data.user.accepted_terms) {
          router.push('/terms-and-conditions');
          return;
        }

        if (data.user.role === 'student') {
          // Check if student has already submitted mood for today
          try {
            const moodResponse = await fetch('http://127.0.0.1:8080/api/check-mood/', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${data.access}`,
              },
              credentials: 'include',
            });
            
            if (moodResponse.ok) {
              const moodData = await moodResponse.json();
              if (moodData && moodData.mood && moodData.mood !== null) {
                router.push('/student/dashboard');
              } else {
                router.push('/student/dashboard/get-started');
              }
            } else {
              // If API call fails, go to get-started
              router.push('/student/dashboard/get-started');
            }
          } catch (e) {
            // fallback to get-started if error
            router.push('/student/dashboard/get-started');
          }
        } else if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'clinic') {
          router.push('/clinic/dashboard');
        } else if (data.user.role === 'counselor') {
          router.push('/counselor/dashboard');
        } else if (data.user.role === 'faculty') {
          router.push('/faculty/dashboard');
        } else {
          router.push(data.redirect_url || '/student/dashboard/get-started');
        }
      }, 1500);
    } catch (error) {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-stretch p-0" style={{ background: '#fff' }}>
      <div className="row flex-grow-1 w-100 m-0">
        {/* Left: Login Form */}
        <div className="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center px-4 px-md-5 py-5" style={{ background: '#fff' }}>
          <div className="w-100" style={{ maxWidth: 400 }}>
            <div className="text-center mb-4">
              <div className="d-flex justify-content-center align-items-center gap-2">
                <Image src="/img/amietilogo.png" alt="Amieti Logo" width={40} height={40} className="me-2" />
                <h2 className="fw-bold m-0">
                  <span style={{ color: '#1b8c8c' }}>AM</span><span style={{ color: '#1b8c8c' }}>IETI</span>
                </h2>
              </div>
            </div>
            <h4 className="fw-bold mb-1 login-green-text">Welcome to Amieti</h4>
            <p className="mb-4" style={{ color: '#6c757d' }}>Login to stay connected!</p>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  id="username"
                  name="username"
                  placeholder="Your Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    id="password"
                    name="password"
                    placeholder="Your Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <span
                    className="position-absolute"
                    style={{ 
                      cursor: 'pointer',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6c757d',
                      zIndex: 10
                    }}
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 4.5c-2.485 0-4.5-2.015-4.5-4.5S5.515 3.5 8 3.5s4.5 2.015 4.5 4.5-2.015 4.5-4.5 4.5zm0-7A2.5 2.5 0 1 0 8 11a2.5 2.5 0 0 0 0-5z"/></svg>
                    ) : (
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238l1.397 1.397a.75.75 0 0 1-1.06 1.06l-1.397-1.397A7.03 7.03 0 0 1 8 14c-3.07 0-5.64-1.96-7-4.5a8.62 8.62 0 0 1 2.13-2.73l-1.4-1.4a.75.75 0 1 1 1.06-1.06l13 13a.75.75 0 0 1-1.06 1.06l-1.4-1.4zM8 12.5c2.21 0 4.21-1.19 5.5-3.5-.86-1.36-2.13-2.5-3.5-3.5l-1.06 1.06A2.5 2.5 0 0 1 8 12.5z"/></svg>
                    )}
                  </span>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="remember">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-danger small" style={{ textDecoration: 'none' }}>
                  Forgot Password
                </Link>
              </div>
              <button type="submit" className="btn w-100 fw-bold login-btn-green" style={{ background: '#ffe600', fontWeight: 600 }} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              {message && (
                <div className="alert alert-success mt-3" role="alert">{message}</div>
              )}
              {error && (
                <div className="alert alert-danger mt-3" role="alert">{error}</div>
              )}
            </form>
          </div>
        </div>
        {/* Right: Image and Info */}
        <div className="col-12 col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center p-0 position-relative"
          style={{
            background: 'linear-gradient(to right, #d6eaff 0%, rgba(214,234,255,0.0) 40%), linear-gradient(rgba(60,140,108,0.45), rgba(60,140,108,0.45)), url(/img/ietischool.jpg) center/cover no-repeat',
            position: 'relative',
            minHeight: '100vh'
          }}>
          <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center position-relative" style={{ zIndex: 2 }}>
            <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'transparent', zIndex: 1 }}></div>
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center" style={{ background: 'transparent', zIndex: 3 }}>
              <div className="text-center px-4">
                <img src="/img/ietilogo.png" alt="IETI Logo" width={100} height={100} className="mb-3" />
                <h3 className="fw-bold mb-2 login-yellow-text">Brighter Tomorrows</h3>
                <p className="fw-semibold mb-3 login-white-text">
                  Empowering Schools with Comprehensive Health and<br />
                  Mental Wellness Solutions for a Healthier, Happier Future
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}