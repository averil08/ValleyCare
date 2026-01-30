import React, { createContext, useState, useMemo, useEffect } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles } from './lib/patientService';

export const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true); // NEW: Loading state
  const [patients, setPatients] = useState([]);

  // ==========================================
  // NEW: LOAD PATIENTS FROM DATABASE ON MOUNT
  // ==========================================
  // ==========================================
  // UPDATED: LOAD PATIENTS FROM DATABASE ON MOUNT
  // ==========================================
  useEffect(() => {
    const loadPatientsFromDatabase = async () => {
      try {
        console.log('📥 Loading patients from database...');
        const result = await getAllPatientProfiles();
        
        if (result.success && result.data && result.data.length > 0) {
          // Transform database format to app format
          const transformedPatients = result.data.map((dbPatient) => ({
            // Use the actual queue_no from the DB, fallback to index if missing
            queueNo: dbPatient.queue_no || 0, 
            name: dbPatient.name,
            age: dbPatient.age,
            phoneNum: dbPatient.phone_num,
            type: dbPatient.patient_type === 'appointment' ? 'Appointment' : 'Walk-in',
            appointmentDateTime: dbPatient.appointment_datetime,
            symptoms: dbPatient.symptoms || [],
            services: dbPatient.services || [],
            
            // STATUS PERSISTENCE: Use the real status from DB
            status: dbPatient.status || "waiting", 
            appointmentStatus: dbPatient.appointment_status,
            
            // QUEUE PERSISTENCE: Use the real in_queue flag from DB
            inQueue: dbPatient.in_queue !== null 
              ? dbPatient.in_queue 
              : (dbPatient.patient_type === 'walk-in' || dbPatient.appointment_status === 'accepted'),
                        
            registeredAt: dbPatient.registered_at || dbPatient.created_at,
            
            // DOCTOR PERSISTENCE: Use the assigned_doctor_name column
            assignedDoctor: dbPatient.assigned_doctor_name ? { name: dbPatient.assigned_doctor_name } : null,
            
            calledAt: dbPatient.called_at,
            queueExitTime: dbPatient.queue_exit_time,
            completedAt: dbPatient.completed_at,
            isReturningPatient: dbPatient.is_returning_patient || false,
            isInactive: dbPatient.is_inactive || false,
            dbId: dbPatient.id 
          }));

          // Sort by queue number so the order is consistent
          setPatients(transformedPatients.sort((a, b) => a.queueNo - b.queueNo));
          console.log(`✅ Loaded ${transformedPatients.length} patients from database`);
        } else {
          setPatients([]);
        }
      } catch (error) {
        console.error('⚠️ Failed to load from database:', error);
        setPatients([]);
      } finally {
        setIsLoadingFromDB(false);
      }
    };

    loadPatientsFromDatabase();
  }, []);

  // Existing localStorage sync (keep this for cross-tab communication)
  useEffect(() => {
    if (!isLoadingFromDB) { // Only sync after initial load
      localStorage.setItem('patients-sync', JSON.stringify(patients));
      console.log('📤 Broadcasting patients to other tabs:', patients.length);
    }
  }, [patients, isLoadingFromDB]);

  const [currentServing, setCurrentServing] = useState(0); // Start at 0 when loading from DB
  const [avgWaitTime, setAvgWaitTime] = useState(15);
  const [activeDoctors, setActiveDoctors] = useState([]);
  
  const [doctorCurrentServing, setDoctorCurrentServing] = useState(() => {
    const initialServing = {};
    patients.forEach(patient => {
      if (patient.status === 'in progress' && patient.assignedDoctor) {
        initialServing[patient.assignedDoctor.id] = patient.queueNo;
      }
    });
    return initialServing;
  });

  useEffect(() => {
    const currentServing = {};
    patients.forEach(patient => {
      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive) {
        currentServing[patient.assignedDoctor.id] = patient.queueNo;
      }
    });
    setDoctorCurrentServing(currentServing);
  }, [patients]); 

  // Sync activePatient (existing logic - keep this)
  useEffect(() => {
    if (activePatient) {
      if (activePatient.isInactive) {
        const newTicket = patients.find(p => 
          p.requeued && 
          p.originalQueueNo === activePatient.queueNo && 
          !p.isInactive
        );
        if (newTicket) {
          setActivePatient(newTicket);
          return;
        }
      }
      
      const updatedPatient = patients.find(p => p.queueNo === activePatient.queueNo);
      if (updatedPatient && JSON.stringify(updatedPatient) !== JSON.stringify(activePatient)) {
        setActivePatient(updatedPatient);
      }
    }
  }, [patients, activePatient]);

  const getAvailableSlots = (dateTimeString) => {
    if (!dateTimeString) return 1;
    
    const MAX_SLOTS_PER_TIME = 1;
    const targetDate = new Date(dateTimeString);
    
    const minutes = targetDate.getMinutes();
    targetDate.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
    
    const bookedCount = patients.filter(p => {
      if (!p.appointmentDateTime) return false;
      if (p.appointmentStatus === 'rejected') return false;
      const pDate = new Date(p.appointmentDateTime);
      pDate.setMinutes(pDate.getMinutes() < 30 ? 0 : 30, 0, 0);
      return pDate.getTime() === targetDate.getTime();
    }).length;
    
    return Math.max(0, MAX_SLOTS_PER_TIME - bookedCount);
  };

  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim();
  };

  const findExistingPatientByName = (patientName, isReturningPatient) => {
    if (!isReturningPatient) return null;
    
    const normalizedName = normalizeName(patientName);
    
    for (const patient of patients) {
      if (patient.isInactive) continue;
      
      const existingNormalizedName = normalizeName(patient.name);
      
      if (normalizedName === existingNormalizedName) {
        return patient;
      }
    }
    
    return null;
  };

  // ==========================================
  // MODIFIED: addPatient - Now syncs to database AND persists
  // ==========================================
  const addPatient = async (newPatient) => {
    setPatients(prev => {
      const existingPatient = findExistingPatientByName(newPatient.name, newPatient.isReturningPatient);
      
      let updatedPatientData = { ...newPatient };
      
      if (existingPatient && newPatient.isReturningPatient) {
        const newNameCapitals = (newPatient.name.match(/[A-Z]/g) || []).length;
        const existingNameCapitals = (existingPatient.name.match(/[A-Z]/g) || []).length;
        
        if (existingNameCapitals >= newNameCapitals) {
          updatedPatientData.name = existingPatient.name;
        }
        
        updatedPatientData.age = newPatient.age;
        updatedPatientData.phoneNum = newPatient.phoneNum || existingPatient.phoneNum;
      }

      const assignedDoctor = assignDoctor(updatedPatientData.services || [], prev, activeDoctors);
      
      // Calculate next queue number (including historical records)
      const maxQueueNo = prev.length > 0 ? Math.max(...prev.map(p => p.queueNo)) : 0;
      
      const patientToAdd = { 
        ...updatedPatientData,
        isPriority: updatedPatientData.isPriority || false,
        priorityType: updatedPatientData.priorityType || null,
        queueNo: maxQueueNo + 1, 
        status: updatedPatientData.status || "waiting",
        registeredAt: new Date().toISOString(),
        inQueue: true,
        calledAt: null,
        queueExitTime: null,
        completedAt: null,
        assignedDoctor: assignedDoctor
      };

      // Sync to database (persists forever)
      syncPatientToDatabase(patientToAdd)
        .then(result => {
          if (result.success) {
            console.log('✅ Patient saved to database permanently');
          }
        })
        .catch(err => {
          console.error('⚠️ Database sync failed (data only in memory):', err);
        });

      return [...prev, patientToAdd];
    });
  };

  // ==========================================
  // MODIFIED: updatePatientStatus - Updates both memory and database
  // ==========================================
  const updatePatientStatus = async (queueNo, newStatus) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        const updates = { status: newStatus };
        
        if (newStatus === "in progress" && p.status === "waiting") {
          updates.calledAt = new Date().toISOString();
          updates.queueExitTime = new Date().toISOString();
        }
        
        if (newStatus === "done" && p.status === "in progress") {
          updates.completedAt = new Date().toISOString();
          if (!p.queueExitTime) {
            updates.queueExitTime = new Date().toISOString();
          }
        }

        const updatedPatient = { ...p, ...updates };

        // Sync status update to database
        syncPatientToDatabase(updatedPatient).catch(err => {
          console.error('⚠️ Database sync failed:', err);
        });
        
        return updatedPatient;
      })
    );
  };

  // All other functions remain EXACTLY the same
  const cancelPatient = (queueNo) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        const cancelled = {
          ...p,
          status: "cancelled",
          queueExitTime: new Date().toISOString(),
          cancelledAt: new Date().toISOString()
        };

        // Sync to database
        syncPatientToDatabase(cancelled).catch(err => {
          console.error('⚠️ Database sync failed:', err);
        });

        return cancelled;
      })
    );
  };

  const acceptAppointment = (queueNo) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        const accepted = { ...p, appointmentStatus: "accepted", inQueue: true };
        
        // Sync to database
        syncPatientToDatabase(accepted).catch(err => {
          console.error('⚠️ Database sync failed:', err);
        });
        
        return accepted;
      })
    );
  };

  const rejectAppointment = (queueNo, reason) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        const rejected = { 
          ...p, 
          appointmentStatus: "rejected", 
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
          inQueue: false,
          queueExitTime: new Date().toISOString()
        };

        // Sync to database
        syncPatientToDatabase(rejected).catch(err => {
          console.error('⚠️ Database sync failed:', err);
        });

        return rejected;
      })
    );
  };

  const requeuePatient = (queueNo) => {
    setPatients(prev => {
      const cancelledPatient = prev.find(p => p.queueNo === queueNo);
      if (!cancelledPatient) return prev;
      
      const maxQueueNo = Math.max(...prev.map(p => p.queueNo));
      const newQueueNo = maxQueueNo + 1;
      
      const newPatient = {
        ...cancelledPatient,
        queueNo: newQueueNo,
        status: "waiting",
        registeredAt: new Date().toISOString(),
        requeued: true,
        originalQueueNo: queueNo,
        inQueue: true,
        calledAt: null,
        queueExitTime: null,
        completedAt: null
      };

      // Sync new requeued patient to database
      syncPatientToDatabase(newPatient).catch(err => {
        console.error('⚠️ Database sync failed:', err);
      });
      
      const updatedPatients = prev.map(p => 
        p.queueNo === queueNo ? { ...p, isInactive: true, inQueue: false } : p
      );
      
      return [...updatedPatients, newPatient];
    });
  };

  const callNextPatient = () => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo === currentServing) {
          return { 
            ...p, 
            status: "done",
            completedAt: new Date().toISOString(),
            queueExitTime: p.queueExitTime || new Date().toISOString()
          };
        }
        if (p.queueNo === currentServing + 1) {
          return { 
            ...p, 
            status: "in progress",
            calledAt: new Date().toISOString(),
            queueExitTime: new Date().toISOString()
          };
        }
        return p;
      })
    );
    setCurrentServing(prev => prev + 1);
  };

  const addWaitTime = () => {
    setAvgWaitTime(prev => prev + 5);
  };

  const reduceWaitTime = () => {
    setAvgWaitTime(prev => Math.max(5, prev - 5));
  };

  const getDoctorCurrentServing = (doctorId) => {
    return doctorCurrentServing[doctorId] || null;
  };

  const setDoctorCurrentServingPatient = (doctorId, queueNo) => {
    setDoctorCurrentServing(prev => ({
      ...prev,
      [doctorId]: queueNo
    }));
  };

  const callNextPatientForDoctor = (doctorId) => {
    const currentPatientQueueNo = doctorCurrentServing[doctorId];
    
    if (currentPatientQueueNo) {
      updatePatientStatus(currentPatientQueueNo, 'done');
    }
    
    const nextPriorityPatient = patients.find(p => 
      p.status === "waiting" && 
      p.inQueue && 
      p.isPriority && 
      p.assignedDoctor?.id === doctorId &&
      !p.isInactive
    );
    
    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(doctorId, nextPriorityPatient.queueNo);
      return;
    }
    
    const nextWaitingPatient = patients.find(p => 
      p.status === "waiting" && 
      p.inQueue && 
      !p.isPriority && 
      p.assignedDoctor?.id === doctorId &&
      !p.isInactive
    );
    
    if (nextWaitingPatient) {
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(doctorId, nextWaitingPatient.queueNo);
    } else {
      setDoctorCurrentServingPatient(doctorId, null);
    }
  };

  const cancelPatientForDoctor = (doctorId) => {
    const currentPatientQueueNo = doctorCurrentServing[doctorId];
    
    if (!currentPatientQueueNo) return;
    
    cancelPatient(currentPatientQueueNo);
    
    const nextPriorityPatient = patients.find(p => 
      p.status === "waiting" && 
      p.inQueue && 
      p.isPriority && 
      p.assignedDoctor?.id === doctorId &&
      !p.isInactive
    );
    
    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(doctorId, nextPriorityPatient.queueNo);
      return;
    }
    
    const nextWaitingPatient = patients.find(p => 
      p.status === "waiting" && 
      p.inQueue && 
      !p.isPriority && 
      p.assignedDoctor?.id === doctorId &&
      !p.isInactive
    );
    
    if (nextWaitingPatient) {
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(doctorId, nextWaitingPatient.queueNo);
    } else {
      setDoctorCurrentServingPatient(doctorId, null);
    }
  };

  const queueInfo = useMemo(() => {
    const total = patients.filter(p => p.inQueue && !p.isInactive).length;
    const waitingCount = patients.filter(p => p.status === "waiting" && p.inQueue && !p.isInactive).length;
    return { total, waitingCount, currentServing };
  }, [patients, currentServing]);

  const startDoctorQueue = (doctorId) => {
    setActiveDoctors(prev => {
      if (prev.includes(doctorId)) return prev;
      const newActiveDoctors = [...prev, doctorId];
      
      setTimeout(() => reassignPatientsForDoctor(doctorId), 0);
      
      return newActiveDoctors;
    });
  };

  const stopDoctorQueue = (doctorId) => {
    setActiveDoctors(prev => prev.filter(id => id !== doctorId));
  };

  const reassignPatientsForDoctor = (doctorId) => {
    setPatients(prev => {
      const doctor = doctors.find(d => d.id === doctorId);
      if (!doctor) return prev;

      return prev.map(patient => {
        if (patient.assignedDoctor || patient.isInactive || 
            patient.status === 'done' || patient.status === 'cancelled') {
          return patient;
        }

        if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') {
          return patient;
        }

        const primaryService = patient.services?.[0];
        if (!primaryService) return patient;

        if (doctor.specializations.includes(primaryService)) {
          return {
            ...patient,
            assignedDoctor: doctor
          };
        }

        return patient;
      });
    });
  };

  const isDoctorActive = (doctorId) => {
    return activeDoctors.includes(doctorId);
  };

  // NEW: Show loading state while fetching from database
  if (isLoadingFromDB) {
    return (
      <PatientContext.Provider value={{ isLoadingFromDB: true }}>
        {children}
      </PatientContext.Provider>
    );
  }

  return (
    <PatientContext.Provider value={{
      patients,
      setPatients,
      addPatient,
      currentServing,
      setCurrentServing,
      activePatient,
      setActivePatient,
      updatePatientStatus,
      callNextPatient,
      avgWaitTime,
      addWaitTime,
      reduceWaitTime,
      queueInfo,
      getAvailableSlots,
      cancelPatient,
      requeuePatient,
      acceptAppointment,
      rejectAppointment,
      getDoctorCurrentServing,
      setDoctorCurrentServingPatient,
      callNextPatientForDoctor,
      cancelPatientForDoctor,
      activeDoctors,
      startDoctorQueue,
      stopDoctorQueue,
      isDoctorActive,
      reassignPatientsForDoctor,
      isLoadingFromDB, // Expose loading state
    }}>
      {children}
    </PatientContext.Provider>
  );
};