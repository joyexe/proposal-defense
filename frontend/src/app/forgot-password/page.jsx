'use client';
import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import AuthForm from '../components/AuthForm';
import { fetchWithAuth } from '../utils/api';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({ email: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await fetchWithAuth('http://127.0.0.1:8080/api/get-csrf-token/');
      const data = await fetchWithAuth('http://127.0.0.1:8080/api/forgot-password/', {
        method: 'POST',
        body: { email: formData.email },
      });
      setMessage(`✓ ${data.message}`);
    } catch (error) {
      setMessage('✗ ' + (error.message || 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-stretch p-0" style={{ background: '#fff' }}>
      <div className="row flex-grow-1 w-100 m-0">
        {/* Left: Forgot Password Form */}
        <div className="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center px-4 px-md-5 py-5" style={{ background: '#fff' }}>
          <div className="w-100" style={{ maxWidth: 480 }}>
            <Link href="/login" className="d-inline-flex align-items-center mb-4 text-dark" style={{ fontWeight: 500, textDecoration: 'none', fontSize: 16 }}>
              <span className="me-2" style={{ fontSize: 20 }}>&larr;</span> Back to login
            </Link>
            <h2 className="fw-bold mb-2" style={{ fontSize: '2.5rem' }}>Forgot your password?</h2>
            <p className="mb-4" style={{ color: '#6c757d', fontSize: 16 }}>
              Don't worry, happens to all of us. Enter your email below to recover your password
            </p>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="btn w-100 fw-bold login-btn-green" style={{ background: '#ffe600', fontWeight: 600, fontSize: 18 }} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </button>
              {message && (
                <div className={`alert mt-3 ${message.startsWith('✓') ? 'alert-success' : 'alert-danger'}`} role="alert">{message}</div>
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
                <img src="/img/ietilogo.png" alt="IETI Logo" width={120} height={120} className="mb-3" />
                <h3 className="fw-bold mb-2 login-yellow-text">Brighter Tomorrows</h3>
                <p className="fw-semibold mb-3 login-white-text" style={{ fontSize: 20 }}>
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