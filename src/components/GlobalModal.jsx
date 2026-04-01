import React, { useContext } from 'react';
import { PatientContext } from '@/PatientContext';
import NotificationModal from './NotificationModal';

/**
 * Global component to render the NotificationModal on any page 
 * that is wrapped by PatientProvider.
 */
const GlobalModal = () => {
  const { modalNotification, clearModalNotification } = useContext(PatientContext);

  if (!modalNotification) return null;

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
