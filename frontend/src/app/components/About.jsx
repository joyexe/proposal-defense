import Image from 'next/image';

function AboutCheckIcon() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#E6F7EA',
      marginRight: 8,
      flexShrink: 0
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#3CB371" style={{ width: 12, height: 12 }}>
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

function HealthIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: '#fff'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-5.5-7-10.5A5.5 5.5 0 0 1 10.5 5 5.5 5.5 0 0 1 12 6.09 5.5 5.5 0 0 1 13.5 5 5.5 5.5 0 0 1 19 10.5C19 15.5 12 21 12 21z" />
        </svg>
      </span>
    </span>
  );
}

function BrainIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: '#fff'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 5A3.5 3.5 0 0 1 19 8.5V12a3.5 3.5 0 0 1-3.5 3.5" />
          <path d="M8.5 5A3.5 3.5 0 0 0 5 8.5V12a3.5 3.5 0 0 0 3.5 3.5" />
          <path d="M12 21v-2" />
          <path d="M12 3v2" />
          <path d="M6.5 8.5h11" />
        </svg>
      </span>
    </span>
  );
}

function BarChartIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: '#fff'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="12" width="4" height="8" rx="1" />
          <rect x="9" y="8" width="4" height="12" rx="1" />
          <rect x="15" y="4" width="4" height="16" rx="1" />
        </svg>
      </span>
    </span>
  );
}

export default function About() {
  return (
    <section style={{ background: '#fff', padding: '0 0 64px 0' }}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 16px 0 16px' }}>
        <h2 className="fw-bold text-center about-section-heading" style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          Empowering School Wellness Programs
        </h2>
        <p className="text-center text-muted mb-5" style={{ maxWidth: 700, margin: '0 auto', fontSize: '1.08rem' }}>
          Amieti is a comprehensive digital wellness platform designed specifically for K-12 schools and educational institutions. Our mission is to create healthier learning environments by providing innovative tools that support both physical and mental health.
        </p>
        <div className="row g-4 mb-5 justify-content-center">
          <div className="col-md-4">
            <div className="p-4 h-100 rounded-3" style={{ background: '#E6F7EA' }}>
              <div className="mb-2"><HealthIcon /></div>
              <h5 className="fw-bold mb-2">Comprehensive Health Management</h5>
              <p className="mb-0 text-muted">Track, manage, and improve student health metrics with our unified platform.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-4 h-100 rounded-3" style={{ background: '#E6F7EA' }}>
              <div className="mb-2"><BrainIcon /></div>
              <h5 className="fw-bold mb-2">Mental Wellness Support</h5>
              <p className="mb-0 text-muted">Proactive tools for mental health screening, counseling, and resource allocation.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-4 h-100 rounded-3" style={{ background: '#E6F7EA' }}>
              <div className="mb-2"><BarChartIcon /></div>
              <h5 className="fw-bold mb-2">Data-Driven Insights</h5>
              <p className="mb-0 text-muted">Actionable analytics to identify trends and improve wellness outcomes.</p>
            </div>
          </div>
        </div>
        <div className="row align-items-center mt-5">
          <div className="col-lg-7">
            <h3 className="fw-bold mb-3 about-section-heading" style={{ fontSize: '2rem' }}>Who We Serve</h3>
            <p className="mb-3 text-muted" style={{ fontSize: '1.08rem' }}>
              Amieti serves the entire school ecosystem, providing specialized tools for:
            </p>
            <ul className="list-unstyled" style={{ fontSize: '1.08rem' }}>
              <li className="mb-2"><AboutCheckIcon /> <b>School Administrators</b> — Comprehensive analytics and oversight</li>
              <li className="mb-2"><AboutCheckIcon /> <b>School Nurses</b> — Streamlined health records and monitoring</li>
              <li className="mb-2"><AboutCheckIcon /> <b>Counselors</b> — Mental health resources and intervention tools</li>
              <li className="mb-2"><AboutCheckIcon /> <b>Teachers</b> — Student well-being insights and support resources</li>
              <li className="mb-2"><AboutCheckIcon /> <b>Students</b> — Self-monitoring tools and wellness resources</li>
            </ul>
          </div>
          <div className="col-lg-5 d-flex justify-content-center mt-4 mt-lg-0">
            <div style={{ maxWidth: 370, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <Image src="/img/studentsinclassroom.jpg" alt="Students in classroom" width={500} height={300} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 