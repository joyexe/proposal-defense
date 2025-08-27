import Image from 'next/image';

export default function Services() {
  return (
    <section style={{ position: 'relative', background: 'transparent', padding: 0 }}>
      <div
        style={{
          width: '100vw',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'relative',
          background: 'radial-gradient(ellipse at center, #B3E0FF 80%, #B3E0FF 100%)',
          borderBottomLeftRadius: '50% 20%',
          borderBottomRightRadius: '50% 20%',
          borderTopLeftRadius: '50% 10%',
          borderTopRightRadius: '50% 10%',
          minHeight: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '48px 0 64px 0',
          boxSizing: 'border-box',
        }}
      >
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <h2 style={{ fontWeight: 700, textAlign: 'center', fontSize: '2.5rem', color: '#339966', marginBottom: 8, marginTop: 0 }}>
            Our Services
          </h2>
          <p className="text-center text-muted mb-5" style={{ maxWidth: 700, margin: '0 auto', fontSize: '1.08rem' }}>
              Explore the tailored modules designed to support school personnel and students
            </p>
          <div className="row justify-content-center mb-4">
            <div className="col-md-4 mb-4">
              <ServiceCard 
                image="/img/administratormodule.jpg"
                role="Administrators"
                title="Administrator Module"
                description="Monitor student health"
              />
            </div>
            <div className="col-md-4 mb-4">
              <ServiceCard 
                image="/img/counselormodule.jpg"
                role="Counselors"
                title="Counselor Module"
                description="Access mental wellness records"
              />
            </div>
            <div className="col-md-4 mb-4">
              <ServiceCard 
                image="/img/nursemodule.jpg"
                role="Nurse"
                title="Nurse Module"
                description="Access physical wellness records"
              />
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-md-4 mb-4">
              <ServiceCard 
                image="/img/facultymembers.jpg"
                role="Faculty Members"
                title="Faculty Module"
                description="Provide wellness education"
              />
            </div>
            <div className="col-md-4 mb-4">
              <ServiceCard 
                image="/img/studentmodule.jpg"
                role="Student"
                title="Student Module"
                description="Track personal health goals"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ image, role, title, description }) {
  return (
    <div className="card h-100 shadow-sm border-0" style={{ borderRadius: 12 }}>
      <div className="position-relative" style={{ height: 180, overflow: 'hidden', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <div className="position-absolute top-0 start-0 m-2 bg-white text-dark px-2 py-1 rounded small" style={{ fontSize: 11, fontWeight: 500, zIndex: 2, opacity: 0.85 }}>
          {role}
        </div>
        <Image 
          src={image} 
          alt={title} 
          width={400}
          height={180}
          style={{ width: '100%', height: 'auto', objectFit: 'cover', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
        />
      </div>
      <div className="card-body pb-2 pt-3">
        <div className="fw-semibold text-muted mb-1" style={{ fontSize: 14 }}>{title}</div>
        <div className="fw-bold" style={{ fontSize: 17 }}>{description}</div>
      </div>
    </div>
  );
} 