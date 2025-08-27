'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      require('bootstrap/dist/js/bootstrap');
    }
  }, []);

  return (
    <nav className="navbar navbar-expand-lg py-3" style={{background: 'transparent', boxShadow: 'none', position: 'relative', zIndex: 10}}>
      <div className="container pt-0 pb-0 d-flex align-items-center justify-content-between">
        {/* Logo and Brand */}
        <Link href="/" className="navbar-brand d-flex align-items-center gap-2" style={{minWidth: '180px'}}>
          <Image 
            src="/img/ietilogo.png" 
            alt="Amieti Logo" 
            width={48} 
            height={48} 
            style={{objectFit: 'contain'}}
            priority
          />
          <span style={{color: '#38813A', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.02em'}}>AMIETI</span>
        </Link>
        {/* Single Nav Links Row */}
        <div className="d-flex flex-grow-1 justify-content-center align-items-center" style={{gap: '2.2rem'}}>
          <NavLink href="/" exact>Home</NavLink>
          <a href="/#about" className="nav-link">About</a>
          <a href="/#services" className="nav-link">Services</a>
          <a href="/#insights" className="nav-link">Insights</a>
          <a href="/#contact" className="nav-link">Contact</a>
        </div>
        {/* Login Button (right) */}
        <div className="ms-3">
          <Link href="/login" className="btn" style={{background:'#FFE14D', color:'#222', fontWeight:600, borderRadius:'10px', minWidth:'90px', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
            <span style={{color:'#222'}}>Login</span>
          </Link>
        </div>
        <style jsx>{`
          .navbar {
            background: transparent;
            box-shadow: none;
          }
          .navbar-nav .nav-link, .nav-link {
            color: #222;
            font-size: 1rem;
            font-weight: 400;
            padding: 0;
            margin: 0 0.7rem;
            background: none;
            border: none;
            transition: color 0.2s, font-weight 0.2s;
          }
          .navbar-nav .nav-link.active, .nav-link.active {
            color: #111 !important;
            font-weight: 700 !important;
            background: none;
          }
        `}</style>
      </div>
    </nav>
  );
}

function NavLink({ href, children, exact }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`nav-link${isActive ? ' active' : ''}`}
      style={isActive ? { color: '#111', fontWeight: 700 } : {}}
    >
      {children}
    </Link>
  );
}
