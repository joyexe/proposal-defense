import Image from 'next/image';

export default function Insights() {
  return (
    <section id="insights" style={{ background: '#fff', padding: '0 0 64px 0' }}>
      <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 16px 0 16px' }}>
        <h2 style={{ fontWeight: 700, textAlign: 'center', fontSize: '2.5rem', marginBottom: 12, color: '#339966' }}>
          Data Driven Insights
        </h2>
        <p className="text-center text-muted mb-5" style={{ maxWidth: 700, margin: '0 auto', fontSize: '1.08rem' }}>
          Transform your wellness program with powerful analytics and our AMIETI chatbot.
        </p>
        <div className="row g-5 align-items-center mb-5">
          <div className="col-lg-6">
            <h3 className="fw-bold mb-4" style={{ fontSize: '2rem', color: '#339966' }}>Analytics</h3>
            <p className="text-muted mb-4" style={{ fontSize: '1.08rem' }}>
              Our analytics platform transforms your school's health and wellness data into actionable insights, 
              helping you identify trends and improve outcomes.
            </p>
            <div className="mb-4">
              <FeatureItem 
                icon={<HealthIcon />}
                title="Health Metrics"
                description="Track key health indicators across your student population."
              />
              <FeatureItem 
                icon={<BrainIcon />}
                title="Wellness Trends"
                description="Visualize mental health trends and program effectiveness."
              />
              <FeatureItem 
                icon={<BarChartIcon />}
                title="Resource Utilization"
                description="Optimize staff time and wellness program resources."
              />
            </div>
          </div>
          <div className="col-lg-6">
            <Image 
              src="/img/analyticsdashboard.jpg" 
              alt="Analytics Dashboard" 
              width={600}
              height={400}
              className="rounded-3 shadow img-fluid"
            />
          </div>
        </div>
        <div className="row g-5 align-items-center">
          <div className="col-lg-6 order-lg-2">
            <h3 className="fw-bold mb-4" style={{ fontSize: '2rem', color: '#339966' }}>Meet AMIETI: Your Wellness Assistant</h3>
            <p className="text-muted mb-4" style={{ fontSize: '1.08rem' }}>
              AMIETI is our Rule-base chatbot designed to streamline wellness management and provide instant support to staff and administrators.
            </p>
            <ul className="list-unstyled mb-4" style={{ fontSize: '1.08rem' }}>
              <ChatbotFeature>Instant access to wellness resources and protocols</ChatbotFeature>
              <ChatbotFeature>Automated scheduling and appointment management</ChatbotFeature>
              <ChatbotFeature>Mood Check-ins and Wellness Journey</ChatbotFeature>
              <ChatbotFeature>24/7 guidance for wellness protocols and best practices</ChatbotFeature>
            </ul>
          </div>
          <div className="col-lg-6 order-lg-1">
            <Image 
              src="/img/amiechatbot.jpg" 
              alt="AMIE Chatbot" 
              width={600}
              height={400}
              className="rounded-3 shadow img-fluid"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HealthIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-5.5-7-10.5A5.5 5.5 0 0 1 10.5 5 5.5 5.5 0 0 1 12 6.09 5.5 5.5 0 0 1 13.5 5 5.5 5.5 0 0 1 19 10.5C19 15.5 12 21 12 21z" />
      </svg>
    </span>
  );
}

function BrainIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 5A3.5 3.5 0 0 1 19 8.5V12a3.5 3.5 0 0 1-3.5 3.5" />
        <path d="M8.5 5A3.5 3.5 0 0 0 5 8.5V12a3.5 3.5 0 0 0 3.5 3.5" />
        <path d="M12 21v-2" />
        <path d="M12 3v2" />
        <path d="M6.5 8.5h11" />
      </svg>
    </span>
  );
}

function BarChartIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#E6F7EA', marginRight: 10, flexShrink: 0
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="9" y="8" width="4" height="12" rx="1" />
        <rect x="15" y="4" width="4" height="16" rx="1" />
      </svg>
    </span>
  );
}

function FeatureItem({ icon, title, description }) {
  return (
    <div className="d-flex mb-3">
      <div className="me-2 mt-1">{icon}</div>
      <div>
        <h5 className="fw-semibold mb-1" style={{ fontSize: '1.1rem', color: '#339966' }}>{title}</h5>
        <p className="text-muted" style={{ fontSize: '1.08rem' }}>{description}</p>
      </div>
    </div>
  );
}

function ChatbotFeature({ children }) {
  return (
    <li className="d-flex mb-3">
      <div className="rounded-circle bg-success bg-opacity-25 d-flex align-items-center justify-content-center me-2 flex-shrink-0" style={{ width: '20px', height: '20px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-success" style={{ width: '12px', height: '12px' }}>
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span>{children}</span>
    </li>
  );
}

function StatCard({ number, label }) {
  return (
    <div className="bg-light p-3 text-center rounded">
      <div className="fs-2 fw-bold" style={{ color: '#339966' }}>{number}</div>
      <div className="text-muted small">{label}</div>
    </div>
  );
} 