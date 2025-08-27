import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import "./clinic-sidebar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGauge, faFileMedical, faCalendarCheck, faChartBar, faBullhorn, faArrowRightArrowLeft, faBox, faStethoscope } from '@fortawesome/free-solid-svg-icons';

const links = [
  { href: "/clinic/dashboard", label: "Dashboard", icon: faGauge },
  { href: "/clinic/health-record", label: "Permit Requests", icon: faFileMedical },
  { href: "/clinic/medical-examination", label: "Medical Examination", icon: faStethoscope },
  { href: "/clinic/appointment", label: "Appointments", icon: faCalendarCheck },
  { href: "/clinic/analytics", label: "Analytics", icon: faChartBar },
  { href: "/clinic/bulletin", label: "Bulletin", icon: faBullhorn },
  { href: "/clinic/inventory", label: "Inventory", icon: faBox },
];

export default function ClinicSidebar({ setActiveText }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [user, setUser] = useState({ full_name: "" });
  const [dropdown, setDropdown] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCollapsed(false); // Always expanded after login
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://127.0.0.1:8080/api/user/profile/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ full_name: data.full_name || "" });
          localStorage.setItem("full_name", data.full_name || "");
        } else {
          setUser({ full_name: localStorage.getItem("full_name") || "" });
        }
        setLoading(false);
      } catch {
        setUser({ full_name: localStorage.getItem("full_name") || "" });
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleMenuClick = () => {
    setCollapsed(true);
    setHasClicked(true);
    localStorage.setItem("clinicSidebarCollapsed", "true");
  };
  const handleSidebarMouseEnter = () => setHovered(true);
  const handleSidebarMouseLeave = () => setHovered(false);
  const isCollapsed = hasClicked && collapsed && !hovered;
  const initials = user.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : "";

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to track logout event
      await fetch('http://127.0.0.1:8080/api/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error tracking logout:', error);
    }
    
    // Clear localStorage and redirect
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("full_name");
    window.location.href = "/";
  };

  return (
    <aside
      className={`clinic-sidebar d-flex flex-column justify-content-between p-0 ${isCollapsed ? "collapsed" : "expanded"}`}
      style={{ width: isCollapsed ? 70 : 250, minHeight: "100vh", transition: "width 0.2s" }}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      <div>
        {/* Branding */}
        <div className="d-flex align-items-center gap-2 px-3 py-3 border-bottom" style={{ minHeight: 60 }}>
          <img src="/img/ietilogo.png" alt="Amieti Logo" width={32} height={32} style={{ borderRadius: 8 }} />
          {!isCollapsed && <span className="fw-bold text-success" style={{ fontSize: 20 }}>Amieti</span>}
        </div>
        <ul className="nav nav-pills flex-column mb-auto mt-2">
          {links.map(link => (
            <li className="nav-item" key={link.href}>
              <Link
                href={link.href}
                className={`nav-link d-flex align-items-center gap-2 ${pathname === link.href ? "active" : ""} ${isCollapsed ? "justify-content-center" : ""}`}
                onClick={() => { handleMenuClick(); setActiveText && setActiveText(link.label); }}
                title={link.label}
              >
                <FontAwesomeIcon icon={link.icon} />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Profile and logout dropdown */}
      <div className="sidebar-profile px-3 py-3 border-top d-flex flex-column align-items-center gap-2 position-relative">
        {loading ? (
          <div className="w-100 d-flex align-items-center gap-2 justify-content-center" style={{ minHeight: 36 }}>
            <div className="spinner-border text-success" style={{ width: 24, height: 24 }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : user.full_name ? (
          <div className="w-100 d-flex align-items-center gap-2 justify-content-center" style={{ cursor: "pointer", position: 'relative' }} onClick={() => setDropdown(d => !d)}>
            <span className="profile-initials bg-success text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, borderRadius: "50%" }}>{initials}</span>
            {!isCollapsed && <span className="fw-semibold text-black">{user.full_name}</span>}
            {/* Dropdown arrow */}
            <span style={{ marginLeft: 6, fontSize: 18, color: '#333', display: !isCollapsed ? 'inline' : 'none' }}>&#9662;</span>
          </div>
        ) : null}
        {dropdown && !isCollapsed && (
          <div className="dropdown-menu show" style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            minWidth: 180,
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginLeft: 8,
            borderRadius: 8,
            padding: 0,
            background: '#fff',
            border: '1px solid #e0e0e0',
          }}>
            <Link href="/forgot-password" className="dropdown-item d-flex align-items-center gap-2" style={{ color: '#222', fontWeight: 500 }}>
              <i className="bi bi-person-gear"></i> Change Password
            </Link>
            <button className="dropdown-item d-flex align-items-center gap-2" style={{ color: '#222', fontWeight: 500 }} onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
