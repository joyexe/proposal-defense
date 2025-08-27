'use client';
import Image from 'next/image';
import Link from 'next/link';
import CloudDivider from './components/CloudDivider';
import About from './components/About';
import Services from './components/Services';
import Insights from './components/Insights';
import Contact from './components/Contact';
import { useEffect, useState } from 'react';

export default function Home() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const aboutSection = document.getElementById('about');
      const aboutTop = aboutSection ? aboutSection.offsetTop : 0;
      const scrollY = window.scrollY + 100; // 100px offset for navbar height
      if (scrollY >= aboutTop) {
        setActiveSection('about');
      } else {
        setActiveSection('home');
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to right, #d6eaff 0%, rgba(214,234,255,0.0) 40%), linear-gradient(rgba(60,140,108,0.45), rgba(60,140,108,0.45)), url(/img/ietischool.jpg) center/cover no-repeat', position: 'relative' }}>
        <div className="container pt-4 pb-0 d-flex align-items-center justify-content-between" style={{ minHeight: 80 }}>
          {/* Logo and Brand */}
          <div className="d-flex align-items-center gap-2" style={{minWidth: '180px'}}>
            <Image 
              src="/img/amietilogo.png" 
              alt="Amieti Logo" 
              width={56} 
              height={56} 
              style={{objectFit: 'contain'}}
              priority
            />
            <span style={{color: '#38813A', fontWeight: 700, fontSize: '2rem', letterSpacing: '0.02em'}}>AMIETI</span>
          </div>
          {/* Nav Links */}
          <div className="d-flex flex-grow-1 justify-content-center align-items-center" style={{gap: '2.2rem', fontSize: '1.1rem'}}>
            <a href="#" className="nav-link" style={{fontWeight: activeSection === 'home' ? 700 : 400, color: activeSection === 'home' ? '#111' : '#222'}}>Home</a>
            <a href="/#about" className="nav-link" style={{fontWeight: activeSection === 'about' ? 700 : 400, color: activeSection === 'about' ? '#111' : '#222'}}>About</a>
            <a href="/#services" className="nav-link">Services</a>
            <Link href="/#insights" className="nav-link">Insights</Link>
            <Link href="/#contact" className="nav-link">Contact</Link>
          </div>
          {/* Login Button */}
          <div className="ms-3">
            <Link href="/login" className="btn" style={{background:'#FFE14D', color:'#222', fontWeight:600, borderRadius:'10px', minWidth:'90px', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
              <span style={{color:'#222'}}>Login</span>
            </Link>
          </div>
        </div>
        {/* Hero Content */}
        <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh', zIndex: 2, position: 'relative' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 800, color: '#FFE14D', textShadow: '2px 4px 0 #222', marginBottom: 16, textAlign: 'center' }}>
            Brighter Tomorrows
          </h1>
          <p style={{ color: '#fff', fontSize: '1.5rem', textAlign: 'center', maxWidth: 700, marginBottom: 32, textShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            Empowering Schools with Comprehensive Health and Mental Wellness Solutions for a Healthier, Happier Future
          </p>
          <div className="d-flex gap-3 flex-wrap justify-content-center">
            <Link href="/login" className="btn" style={{background:'#FFE14D', color:'#38813A', fontWeight:600, borderRadius:'8px', minWidth:'140px', fontSize:'1.1rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
              <span style={{color:'#38813A'}}>Get Started</span>
            </Link>
            <a href="/#about" className="btn btn-light" style={{background:'#fffbe6', fontWeight:600, borderRadius:'8px', minWidth:'140px', fontSize:'1.1rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', color:'#38813A', border:'none', outline:'none', textShadow:'none', WebkitTextStroke:'0', MozTextFillColor:'#38813A', MozTextStrokeWidth:'0', MozTextStrokeColor:'transparent', textDecoration:'none', fontFamily:'inherit', lineHeight:'1.5', display:'inline-block', verticalAlign:'middle', transition:'color 0.2s'}}><span style={{color:'#38813A', fontWeight:600}}>Learn More →</span></a>
          </div>
        </div>
        {/* White cloud SVG at bottom */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', zIndex: 3 }}>
          <CloudDivider />
        </div>
      </div>
      {/* About and Services Section Below Home */}
      <div style={{ background: '#fff' }}>
        <div id="about">
          <About />
        </div>
        <div id="services">
          <Services />
        </div>
        <Insights />
        <Contact />
      </div>
    </>
  );
}