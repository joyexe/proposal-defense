"use client";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCog } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getFacultyNotifications, getClinicNotifications, getStudentNotifications, getStudentAppointmentNotifications, getFacultyAppointmentNotifications, getClinicAppointmentNotifications, getCounselorAppointmentNotifications } from '../utils/api';

export default function DashboardNavbar({ role, activeText }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debug logging (commented out to reduce console noise)
  // console.log('DashboardNavbar rendered with role:', role, 'activeText:', activeText);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        setLoading(true);
        let totalUnread = 0;

        if (role === 'faculty') {
          // Get permit notifications
          const permitNotifications = await getFacultyNotifications();
          const unreadPermitNotifications = permitNotifications.filter(notification => !notification.isRead);
          
          // Get appointment notifications
          const appointmentNotifications = await getFacultyAppointmentNotifications();
          const unreadAppointmentNotifications = appointmentNotifications.filter(notification => !notification.isRead);
          
          totalUnread = unreadPermitNotifications.length + unreadAppointmentNotifications.length;
        } else if (role === 'clinic') {
          // Get permit notifications
          const permitNotifications = await getClinicNotifications();
          const unreadPermitNotifications = permitNotifications.filter(notification => !notification.isRead);
          
          // Get appointment notifications
          const appointmentNotifications = await getClinicAppointmentNotifications();
          const unreadAppointmentNotifications = appointmentNotifications.filter(notification => !notification.isRead);
          
          totalUnread = unreadPermitNotifications.length + unreadAppointmentNotifications.length;
        } else if (role === 'student') {
          // Get permit notifications
          const permitNotifications = await getStudentNotifications();
          const unreadPermitNotifications = permitNotifications.filter(notification => !notification.isRead);
          
          // Get appointment notifications
          const appointmentNotifications = await getStudentAppointmentNotifications();
          const unreadAppointmentNotifications = appointmentNotifications.filter(notification => !notification.isRead);
          
          totalUnread = unreadPermitNotifications.length + unreadAppointmentNotifications.length;
        } else if (role === 'counselor') {
          // Get appointment notifications only (counselors don't have permit notifications)
          const appointmentNotifications = await getCounselorAppointmentNotifications();
          const unreadAppointmentNotifications = appointmentNotifications.filter(notification => !notification.isRead);
          
          totalUnread = unreadAppointmentNotifications.length;
          console.log('Counselor notifications:', appointmentNotifications, 'Unread:', unreadAppointmentNotifications.length);
        }
        
        setUnreadCount(totalUnread);
        // console.log('Total unread notifications for', role, ':', totalUnread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadNotifications();

    // Set up polling to check for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadNotifications, 30000);

    return () => clearInterval(interval);
  }, [role]);

  return (
    <nav className="navbar navbar-light bg-white px-4 border-bottom d-flex align-items-center justify-content-between" style={{ minHeight: 64, marginTop: 0, paddingTop: 0 }}>
      <div className="d-flex align-items-center gap-3">
        <span className="fw-bold text-black" style={{ fontSize: 22 }}>{activeText || 'Dashboard'}</span>
      </div>
      <div className="d-flex align-items-center gap-3">
        {role !== 'admin' && (
          <Link href={`/${role}/settings`} className="icon-btn-square d-flex align-items-center justify-content-center border" style={{ width: 40, height: 40 }}>
            <FontAwesomeIcon icon={faCog} className="fs-5 icon-outlined" />
          </Link>
        )}
        {/* Notification Bell - Always show for all roles except admin */}
        <Link 
          href={`/${role}/notification`} 
          className="icon-btn-square d-flex align-items-center justify-content-center border position-relative" 
          style={{ 
            width: 40, 
            height: 40, 
            display: 'flex !important',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            textDecoration: 'none',
            color: '#333',
            zIndex: 1000,
            position: 'relative',
            visibility: 'visible !important',
            opacity: '1 !important'
          }}
        >
          <FontAwesomeIcon 
            icon={faBell} 
            className="fs-5 icon-outlined" 
            style={{ 
              color: '#333', 
              fontSize: '1.25rem',
              display: 'block',
              visibility: 'visible',
              opacity: '1'
            }}
          />
          {(role === 'faculty' || role === 'clinic' || role === 'student' || role === 'counselor') && !loading && unreadCount > 0 && (
            <span 
              style={{ 
                position: 'absolute', 
                top: 6, 
                right: 6, 
                width: 12, 
                height: 12, 
                background: 'red', 
                borderRadius: '50%', 
                border: '2px solid #fff', 
                display: 'block',
                animation: 'pulse 2s infinite',
                zIndex: 1001
              }}
            ></span>
          )}
        </Link>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .icon-btn-square {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .icon-btn-square svg {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
    </nav>
  );
} 