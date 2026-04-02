import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { PatientContext } from '@/PatientContext';
import NotificationModal from './NotificationModal';

/**
 * Global component to render the NotificationModal on specific pages.
 */
const GlobalModal = () => {
  const { modalNotification, clearModalNotification } = useContext(PatientContext);
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');

  // 1. HARD EXCLUSIONS: These pages should NEVER show the global notification modal
  const blacklistedPaths = [
    '/clinic-tv',
    '/dashboard',
    '/login',
    '/signup',
    '/',
    '/doctor-selection',
    '/doctor-dashboard',
    '/reset-password'
  ];

  if (blacklistedPaths.includes(location.pathname)) return null;
  if (!modalNotification) return null;

  // 2. ROLE-BASED WHITELISTING
  const isStaffRole = userRole === 'secretary' || userRole === 'staff' || userRole === 'admin';
  
  if (isStaffRole) {
    // Staff intended pages for global notifications (excluding Appointment page which has its own)
    const intendedStaffPaths = ['/analytics', '/checkin', '/qstatus'];
    
    // If they are on Appointment page, Appointment.jsx handles its own local NotificationModal
    if (location.pathname === '/appointment') return null;
    
    // If they are not on an intended page, don't show it (prevents "all pages" issue)
    if (!intendedStaffPaths.includes(location.pathname)) return null;
  } else {
    // Patient intended pages
    const intendedPatientPaths = ['/homepage', '/qstatus', '/patient-settings', '/notifications', '/appointmenthistory'];
    
    // If they are on a generic page or unauthenticated, show on homepage/qstatus
    if (!intendedPatientPaths.includes(location.pathname)) return null;
  }

  return (
    <NotificationModal 
      isOpen={!!modalNotification}
      onClose={clearModalNotification}
      title={modalNotification.title}
      description={modalNotification.description}
      type={modalNotification.type}
      data={modalNotification.data}
      actionLabel="Understood"
    />
  );
};

export default GlobalModal;
