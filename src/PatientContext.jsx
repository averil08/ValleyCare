import React, { createContext, useState, useMemo, useEffect } from "react";
import { assignDoctor, doctors } from './doctorData';

export const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(() => {
    try {
      const savedActivePatient = localStorage.getItem('active-patient');
      if (savedActivePatient) {
        const parsed = JSON.parse(savedActivePatient);
        console.log('✅ Loaded active patient from localStorage:', parsed.queueNo);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading active patient from localStorage:', error);
    }
    return null;
  });

  //✅ ADD THIS: Save activePatient to localStorage whenever it changes
  useEffect(() => {
    try {
      if (activePatient) {
        localStorage.setItem('active-patient', JSON.stringify(activePatient));
        console.log('💾 Saved active patient to localStorage:', activePatient.queueNo);
      } else {
        localStorage.removeItem('active-patient');
        console.log('🗑️ Removed active patient from localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving active patient to localStorage:', error);
    }
  }, [activePatient]);
  
  // ✅ Load patients from localStorage on initial load
  const [patients, setPatients] = useState(() => {
    try {
      const savedPatients = localStorage.getItem('clinic-patients-data');
      if (savedPatients) {
        const parsed = JSON.parse(savedPatients);
        console.log('✅ Loaded patients from localStorage:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading patients from localStorage:', error);
    }
    
    // Default patients if nothing in localStorage
    return [
      { 
        queueNo: 1, 
        name: "Jane Doe", 
        age: 26, 
        type: "Walk-in", 
        symptoms: ["Fever", "Cough"], 
        services: ["cbc", "fbs"], 
        phoneNum: "09171234567", 
        status: "done", 
        registeredAt: new Date(Date.now() - 86400000).toISOString(),
        inQueue: false,
        calledAt: new Date(Date.now() - 90000000).toISOString(),
        completedAt: new Date(Date.now() - 88200000).toISOString(),
        queueExitTime: new Date(Date.now() - 88200000).toISOString(),
        assignedDoctor: { id: 4, name: "Dr. Michael Torres" },
        isReturningPatient: false
      },
      { 
        queueNo: 2, 
        name: "Mark Cruz", 
        age: 32, 
        type: "Appointment", 
        symptoms: ["Rashes"], 
        services: ["pedia"], 
        phoneNum: "09181234567", 
        status: "waiting",
        registeredAt: new Date().toISOString(), 
        appointmentDateTime: new Date(Date.now() + 86400000).toISOString(), 
        appointmentStatus: "accepted", 
        inQueue: true,  
        calledAt: null,
        queueExitTime: null,  
        completedAt: null,
        assignedDoctor: { id: 1, name: "Dr. Sarah Gonzales" }
      },
      { 
        queueNo: 3, 
        name: "Leah Santos", 
        age: 21, 
        type: "Walk-in", 
        symptoms: ["Headache"], 
        services: ["adult"], 
        phoneNum: "09191234567", 
        status: "waiting", 
        registeredAt: new Date().toISOString(), 
        inQueue: true, 
        calledAt: null,  
        queueExitTime: null,  
        completedAt: null,
        assignedDoctor: { id: 2, name: "Dr. John Martinez" }
      },
      { 
        queueNo: 4, 
        name: "Analyn Gomez", 
        age: 21, 
        type: "Walk-in", 
        symptoms: ["Headache"], 
        services: ["urinalysis"], 
        phoneNum: "09201234567", 
        status: "waiting", 
        registeredAt: new Date().toISOString(), 
        inQueue: true, 
        calledAt: null,  
        queueExitTime: null, 
        completedAt: null,
        assignedDoctor: { id: 11, name: "Dr. Patricia Brown" }
      },
    ];
  });

  // ✅ Save patients to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('clinic-patients-data', JSON.stringify(patients));
      console.log('💾 Saved patients to localStorage:', patients.length);
    } catch (error) {
      console.error('❌ Error saving patients to localStorage:', error);
    }
  }, [patients]);

  // ✅ Sync from localStorage in the SAME tab (every 1 second)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      try {
        const storedPatients = localStorage.getItem('clinic-patients-data');
        if (storedPatients) {
          const parsedPatients = JSON.parse(storedPatients);
          
          // Only update if the data actually changed
          if (JSON.stringify(parsedPatients) !== JSON.stringify(patients)) {
            console.log('🔄 Syncing patients from localStorage...');
            setPatients(parsedPatients);
          }
        }
      } catch (error) {
        console.error('❌ Error syncing from localStorage:', error);
      }
    }, 1000); // Check every second

    return () => clearInterval(syncInterval);
  }, [patients]);

  // ✅ Listen for storage events from OTHER tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'clinic-patients-data' && e.newValue) {
        try {
          const parsedPatients = JSON.parse(e.newValue);
          console.log('🔄 Storage event detected - updating patients from other tab');
          setPatients(parsedPatients);
        } catch (error) {
          console.error('❌ Error handling storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [currentServing, setCurrentServing] = useState(null);
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

  const addPatient = (newPatient) => {
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
      
      return [
        ...prev,
        { 
          ...updatedPatientData,
          isPriority: updatedPatientData.isPriority || false,
          priorityType: updatedPatientData.priorityType || null,
          queueNo: prev.length + 1, 
          status: updatedPatientData.status || "waiting",
          registeredAt: new Date().toISOString(),
          inQueue: true,
          calledAt: null,
          queueExitTime: null,
          completedAt: null,
          assignedDoctor: assignedDoctor
        }
      ];
    });
  };

  const updatePatientStatus = (queueNo, newStatus) => {
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
        
        return { ...p, ...updates };
      })
    );
  };

  const cancelPatient = (queueNo) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        return {
          ...p,
          status: "cancelled",
          queueExitTime: new Date().toISOString(),
          cancelledAt: new Date().toISOString()
        };
      })
    );
  };

  const acceptAppointment = (queueNo) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { ...p, appointmentStatus: "accepted", inQueue: true } : p)
    );
  };

  const rejectAppointment = (queueNo, reason) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { 
        ...p, 
        appointmentStatus: "rejected", 
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        inQueue: false,
        queueExitTime: new Date().toISOString()
      } : p)
    );
  };

  const simulateStatusChange = (queueNo, updates) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { ...p, ...updates } : p)
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
      simulateStatusChange,
    }}>
      {children}
    </PatientContext.Provider>
  );
};