import { useState } from 'react';

function ContactIcon({ children }) {
  return (
    <span className="d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: 40, height: 40, background: '#fff', borderRadius: 8 }}>
      <span style={{ color: '#339966', fontSize: 22 }}>{children}</span>
    </span>
  );
}

export default function Contact() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    school: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for your message! We'll get back to you soon.");
    setFormData({ fullName: '', email: '', school: '', message: '' });
  };

  return (
    <section id="contact" style={{ background: '#B3E0FF', padding: '0 0 64px 0' }}>
      <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 0 16px' }}>
        <h2 style={{ color: '#339966', fontWeight: 700, textAlign: 'center', fontSize: '2.5rem', marginBottom: 8, lineHeight: 1.1, WebkitTextStroke: 0, MozTextFillColor: '#339966', MozTextStrokeWidth: 0, MozTextStrokeColor: 'transparent' }}>Contact Us</h2>
        <p className="text-center text-muted mb-4" style={{ maxWidth: 700, margin: '0 auto', fontSize: '1.08rem' }}>
          Have questions about Amieti? Reach out to our team for more information.
        </p>
        <div className="row g-4 justify-content-center align-items-stretch">
          {/* Form */}
          <div className="col-lg-6">
            <div className="bg-white rounded-4 p-4 h-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 className="fw-bold mb-3" style={{ fontSize: '1.25rem' }}>Send us a message</h3>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="fullName">Full Name</label>
                    <input type="text" className="form-control" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your Name" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Your Email" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="school">School / Organization</label>
                    <input type="text" className="form-control" id="school" name="school" value={formData.school} onChange={handleChange} placeholder="Your School or organization" />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="message">Message</label>
                    <textarea className="form-control" id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Your Message" rows={3} required></textarea>
                  </div>
                  <div className="col-12 mt-2">
                    <button type="submit" className="btn w-100" style={{ background: '#339966', color: '#fff', fontWeight: 600, borderRadius: 8, fontSize: '1.1rem' }}>Create account</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          {/* Info */}
          <div className="col-lg-6 d-flex flex-column gap-3">
            <div className="rounded-4 p-4 h-100" style={{ background: '#DFF5E9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h4 className="fw-bold mb-3" style={{ fontSize: '1.1rem' }}>Contact Information</h4>
              <div className="mb-2 d-flex align-items-center"><ContactIcon><svg width="20" height="20" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6 12 13 2 6"/></svg></ContactIcon><div><div style={{fontWeight:600}}>Email</div><div style={{fontSize:'0.97rem'}}>info@amieti-wellness.com</div></div></div>
              <div className="mb-2 d-flex align-items-center"><ContactIcon><svg width="20" height="20" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3 5.18 2 2 0 0 1 5 3h2.09a2 2 0 0 1 2 1.72c.13.81.35 1.6.67 2.34a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.74-1.22a2 2 0 0 1 2.11-.45c.74.32 1.53.54 2.34.67A2 2 0 0 1 22 16.92z"/></svg></ContactIcon><div><div style={{fontWeight:600}}>Phone</div><div style={{fontSize:'0.97rem'}}>(800) 123-4567</div></div></div>
              <div className="mb-2 d-flex align-items-center"><ContactIcon><svg width="20" height="20" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10.5a8.38 8.38 0 0 1-1.9.98c-.5.18-1.02.32-1.57.41a8.5 8.5 0 0 1-7.06 0c-.55-.09-1.07-.23-1.57-.41A8.38 8.38 0 0 1 3 10.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5z"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></ContactIcon><div><div style={{fontWeight:600}}>Office</div><div style={{fontSize:'0.97rem'}}>IETI Campus, #161 Purok 2 Magsaysay Ave, Brgy. Magsaysay, San Pedro, Laguna, Philippines</div></div></div>
            </div>
            <div className="rounded-4 p-4 h-100 d-flex flex-column justify-content-between" style={{ background: '#339966' }}>
              <div>
                <h4 className="fw-bold mb-2" style={{ color: '#fff', fontSize: '1.1rem' }}>Ready to transform student wellness?</h4>
                <p className="mb-3" style={{ color: '#fff', fontSize: '1rem' }}>
                  Sign up for a free consultation and demo to see how Amieti can support your school's health initiatives.
                </p>
              </div>
              <button className="btn w-100 mt-auto" style={{ background: '#FFE14D', color: '#222', fontWeight: 600, borderRadius: 8, fontSize: '1.1rem' }}>Create account</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 