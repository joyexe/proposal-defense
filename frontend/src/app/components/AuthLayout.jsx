'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center" 
         style={{ backgroundImage: 'url(/img/ietischool.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="row w-100 justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-lg border-0 rounded-3 overflow-hidden">
            <div className="row g-0">
              <div className="col-md-6 d-none d-md-flex bg-primary align-items-center justify-content-center p-5">
                <div className="text-center text-white">
                  <Image 
                    src="/img/ietilogo.png" 
                    alt="Amieti Logo" 
                    width={80} 
                    height={80} 
                    className="mb-3"
                  />
                  <h2 className="mb-3">IETI Health System</h2>
                  <p className="mb-0">
                    Manage your health and wellness with ease through our comprehensive health and mental wellness services.
                  </p>
                </div>
              </div>
              <div className="col-md-6 bg-white p-5">
                <div className="text-center mb-4">
                  <h3 className="fw-bold">{title}</h3>
                  {subtitle && <p className="text-muted">{subtitle}</p>}
                </div>
                {children}
              </div>
            </div>
          </div>
          <div className="text-center mt-3 text-white">
            <p className="mb-0">"The School That Cares & Makes Your Dreams Come True"</p>
          </div>
        </div>
      </div>
    </div>
  );
}