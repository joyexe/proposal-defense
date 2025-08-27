import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer-custom" style={{background:'#3C8C6C', color:'#E6F2ED'}}>
      <div className="container pt-5 pb-2">
        <div className="row mb-4">
          {/* Logo and Socials */}
          <div className="col-12 col-md-3 mb-4 mb-md-0 d-flex flex-column align-items-md-start align-items-center">
            <span className="fw-bold amieti-yellow amieti-large mb-2" style={{color:'#FFE14D', fontWeight:'bold', fontSize:'2.2rem', lineHeight:1, display:'block', color:'#FFE14D !important'}}>Amieti</span>
            <div className="d-flex gap-3 mb-2 align-items-center">
              <a href="#" aria-label="Instagram" className="footer-social"><i className="bi bi-instagram" /></a>
              <a href="#" aria-label="Facebook" className="footer-social facebook-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" style={{display:'inline-block',verticalAlign:'middle',height:'1em',width:'1em'}}>
                  <path d="M16 8.049C16 3.604 12.418 0 8 0S0 3.604 0 8.049c0 4.017 2.926 7.347 6.75 7.951v-5.625H4.897V8.049H6.75V6.275c0-1.845 1.07-2.875 2.713-2.875.787 0 1.611.14 1.611.14v1.77h-.908c-.896 0-1.175.555-1.175 1.124v1.615h2l-.32 2.326H8.99V16C12.814 15.396 16 12.066 16 8.049z" fill="#E6F2ED"/>
                  <path d="M10.339 10.375l.32-2.326h-2V6.434c0-.569.279-1.124 1.175-1.124h.908v-1.77s-.824-.14-1.611-.14c-1.643 0-2.713 1.03-2.713 2.875v1.774H4.897v2.326H6.75V16h2.24v-5.625h1.349z" fill="#E6F2ED"/>
                  <path d="M9.153 10.375V16H6.75v-5.625H4.897V8.049H6.75V6.275c0-1.845 1.07-2.875 2.713-2.875.787 0 1.611.14 1.611.14v1.77h-.908c-.896 0-1.175.555-1.175 1.124v1.615h2l-.32 2.326H9.153z" fill="#1877F3"/>
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="footer-social"><i className="bi bi-linkedin" /></a>
            </div>
          </div>
          {/* Quick Links */}
          <div className="col-6 col-md-3 mb-4 mb-md-0">
            <div className="fw-bold mb-2 footer-section-title" style={{color:'#fff', color:'#fff !important'}}>Quick Links</div>
            <ul className="list-unstyled">
              <li><a href="/" className="footer-link">Home</a></li>
              <li><a href="/about" className="footer-link">About</a></li>
              <li><a href="/services" className="footer-link">Services</a></li>
              <li><a href="/insights" className="footer-link">Insights</a></li>
              <li><a href="/contact" className="footer-link">Contact</a></li>
            </ul>
          </div>
          {/* IETI Health Services */}
          <div className="col-6 col-md-3 mb-4 mb-md-0">
            <div className="fw-bold mb-2 footer-section-title" style={{color:'#fff', color:'#fff !important'}}>IETI Health Services</div>
            <ul className="list-unstyled">
              <li><a href="#" className="footer-link">Mental Health</a></li>
              <li><a href="#" className="footer-link">Clinic Hours</a></li>
              <li><a href="#" className="footer-link">Health Guidelines</a></li>
              <li><a href="#" className="footer-link">Check-Ups</a></li>
            </ul>
          </div>
          {/* Support */}
          <div className="col-12 col-md-3">
            <div className="fw-bold mb-2 footer-section-title" style={{color:'#fff', color:'#fff !important'}}>Support</div>
            <ul className="list-unstyled">
              <li><a href="#" className="footer-link">FAQs & Help Center</a></li>
              <li><a href="#" className="footer-link">Contact Clinic</a></li>
              <li><a href="#" className="footer-link">Report an Issue</a></li>
              <li><a href="#" className="footer-link">How it works</a></li>
            </ul>
          </div>
        </div>
        {/* Divider */}
        <hr style={{borderColor:'#B6D6C5', opacity:0.5}} />
        {/* Bottom Row */}
        <div className="row align-items-center">
          <div className="col-12 col-md-6 small text-center text-md-start mb-2 mb-md-0" style={{color:'#E6F2ED'}}>
            © 2025 Amieti. All rights reserved.
          </div>
          <div className="col-12 col-md-6 d-flex justify-content-center justify-content-md-end gap-3 small">
            <a href="#" className="footer-link" style={{color:'#E6F2ED'}}>Privacy Policy</a>
            <a href="#" className="footer-link" style={{color:'#E6F2ED'}}>Terms of Service</a>
            <a href="#" className="footer-link" style={{color:'#E6F2ED'}}>Cookie Policy</a>
          </div>
        </div>
      </div>
      <style jsx>{`
        .amieti-yellow {
          color: #FFE14D !important;
        }
        .amieti-large {
          font-size: 2.2rem;
        }
        .footer-link {
          color: #E6F2ED !important;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover, .footer-link:focus {
          color: #FFE14D !important;
        }
        .footer-social {
          color: #E6F2ED !important;
          transition: color 0.2s;
          vertical-align: middle;
        }
        .footer-section-title {
          color: #fff !important;
        }
        .facebook-icon svg {
          height: 1em;
          width: 1em;
          vertical-align: middle;
          display: inline-block;
        }
      `}</style>
    </footer>
  );
}
