import React, { createContext, useState, useMemo, useEffect } from "react";
import { assignDoctor, doctors } from './doctorData';

export const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [patients, setPatients] = useState([
  { 
    queueNo: 1, 
    name: "Jane Doe", 
    age: 26, 
    type: "Walk-in", 
    symptoms: ["Fever", "Cough"], 
    services: ["cbc", "fbs"], 
    phoneNum: "09171234567", 
    status: "done", 
    registeredAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday (Jan 3)
    inQueue: false,  // Changed to false since visit is complete
    calledAt: new Date(Date.now() - 90000000).toISOString(), // Yesterday
    completedAt: new Date(Date.now() - 88200000).toISOString(), // Yesterday
    queueExitTime: new Date(Date.now() - 88200000).toISOString(), // Yesterday
    assignedDoctor: { id: 4, name: "Dr. Michael Torres" },
    isReturningPatient: false // First visit, so not a returning patient
  },
  { 
    queueNo: 2, 
    name: "Mark Cruz", 
    age: 32, 
    type: "Appointment", 
    symptoms: ["Rashes"], 
    services: ["pedia"], 
    phoneNum: "09181234567", 
    status: "waiting", // ✅ CHANGED from "in progress" to "waiting"
    registeredAt: new Date().toISOString(), 
    appointmentDateTime: new Date(Date.now() + 86400000).toISOString(), 
    appointmentStatus: "accepted", 
    inQueue: true,  
    calledAt: null, // ✅ CHANGED from new Date().toISOString() to null
    queueExitTime: null,  
    completedAt: null,
    assignedDoctor: { id: 1, name: "Dr. Sarah Gonzales" }  // ✅ CORRECT: Pedia is handled by Dr. Sarah Gonzales (ID 1)
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
    assignedDoctor: { id: 2, name: "Dr. John Martinez" }  // ✅ CORRECT: Adult is handled by Dr. John Martinez (ID 2)
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
    assignedDoctor: { id: 11, name: "Dr. Patricia Brown" }  // ✅ CORRECT: Urinalysis is handled by Dr. Patricia Brown (ID 11)
  },
]);

  // Add this useEffect in PatientProvider, after the patients state
  useEffect(() => {
    // Broadcast patient changes to other tabs via localStorage
    localStorage.setItem('patients-sync', JSON.stringify(patients));
    console.log('📤 Broadcasting patients to other tabs:', patients.length);
  }, [patients]);

  // ✅ CHANGED: Initialize to null instead of 2
  const [currentServing, setCurrentServing] = useState(null);
  const [avgWaitTime, setAvgWaitTime] = useState(15);
  const [activeDoctors, setActiveDoctors] = useState([]); // Array of doctor IDs that are active today
  // NEW: Track which patient each doctor is currently serving
  // Initialize by finding patients that are already "in progress"
  const [doctorCurrentServing, setDoctorCurrentServing] = useState(() => {
    const initialServing = {};
    patients.forEach(patient => {
      if (patient.status === 'in progress' && patient.assignedDoctor) {
        initialServing[patient.assignedDoctor.id] = patient.queueNo;
      }
    });
    return initialServing;
  });

  // NEW: Sync doctorCurrentServing with actual patient statuses
  useEffect(() => {
    const currentServing = {};
    patients.forEach(patient => {
      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive) {
        currentServing[patient.assignedDoctor.id] = patient.queueNo;
      }
    });
    setDoctorCurrentServing(currentServing);
  }, [patients]); 
  // Example format: { 1: 5, 2: 8, 3: 12 } means Doctor 1 is serving patient #5, Doctor 2 is serving #8, etc.

  // ✅ Automatically sync activePatient with patients array
  useEffect(() => {
    if (activePatient) {
      // If current activePatient is inactive, find the new requeued version
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
      
      // Normal sync for active patients
      const updatedPatient = patients.find(p => p.queueNo === activePatient.queueNo);
      if (updatedPatient && JSON.stringify(updatedPatient) !== JSON.stringify(activePatient)) {
        setActivePatient(updatedPatient);
      }
    }
  }, [patients, activePatient]);

  const getAvailableSlots = (dateTimeString) => {
    if (!dateTimeString) return 1; // Changed from 5 to 1 slot only
    
    const MAX_SLOTS_PER_TIME = 1; //changed from 5 slots to 1
    const targetDate = new Date(dateTimeString);
    
    const minutes = targetDate.getMinutes();
    targetDate.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
    
    // Count appointments that are NOT rejected (only count pending and accepted)
    const bookedCount = patients.filter(p => {
      if (!p.appointmentDateTime) return false;

      // Don't count rejected appointments
      if (p.appointmentStatus === 'rejected') return false;

      const pDate = new Date(p.appointmentDateTime);
      pDate.setMinutes(pDate.getMinutes() < 30 ? 0 : 30, 0, 0);
      return pDate.getTime() === targetDate.getTime();
    }).length;
    
    return Math.max(0, MAX_SLOTS_PER_TIME - bookedCount);
  };

  //added ispriority and prioritytype + returning patient profile update
  // SIMPLIFIED: Normalize name for exact matching (case-insensitive, trim whitespace only)
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim();
  };

  // SIMPLIFIED: Find existing patient by EXACT name match only (for returning patients)
  const findExistingPatientByName = (patientName, isReturningPatient) => {
    if (!isReturningPatient) return null;
    
    const normalizedName = normalizeName(patientName);
    
    // Search through all existing patients
    for (const patient of patients) {
      if (patient.isInactive) continue;
      
      const existingNormalizedName = normalizeName(patient.name);
      
      // Exact name match (case-insensitive)
      if (normalizedName === existingNormalizedName) {
        return patient;
      }
    }
    
    return null;
  };

  const addPatient = (newPatient) => {
    setPatients(prev => {
      const existingPatient = findExistingPatientByName(newPatient.name, newPatient.isReturningPatient);
      
      // Prepare patient data - if returning patient found, update their info
     let updatedPatientData = { ...newPatient };
      
      if (existingPatient && newPatient.isReturningPatient) {
        // Use the name with better casing (more capital letters)
        const newNameCapitals = (newPatient.name.match(/[A-Z]/g) || []).length;
        const existingNameCapitals = (existingPatient.name.match(/[A-Z]/g) || []).length;
        
        if (existingNameCapitals >= newNameCapitals) {
          updatedPatientData.name = existingPatient.name;
        }
        
        // Always use new age and phone if provided
        updatedPatientData.age = newPatient.age;
        updatedPatientData.phoneNum = newPatient.phoneNum || existingPatient.phoneNum;
      }

      // Assign doctor based on services and current patient load - ONLY ACTIVE DOCTORS
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

  // ✅ UPDATED: Track timestamps when status changes
  const updatePatientStatus = (queueNo, newStatus) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        const updates = { status: newStatus };
        
        // When patient is called (waiting → in progress)
        if (newStatus === "in progress" && p.status === "waiting") {
          updates.calledAt = new Date().toISOString();
          // Patient leaves the waiting queue when called
          updates.queueExitTime = new Date().toISOString();
        }
        
        // When patient completes service (in progress → done)
        if (newStatus === "done" && p.status === "in progress") {
          updates.completedAt = new Date().toISOString();
          // If queueExitTime wasn't set yet, set it now
          if (!p.queueExitTime) {
            updates.queueExitTime = new Date().toISOString();
          }
        }
        
        return { ...p, ...updates };
      })
    );
  };

  // ✅ UPDATED: Track when patient is cancelled
  const cancelPatient = (queueNo) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.queueNo !== queueNo) return p;
        
        return {
          ...p,
          status: "cancelled",
          queueExitTime: new Date().toISOString(), // Left queue when cancelled
          cancelledAt: new Date().toISOString()
        };
      })
    );
  };


  // ✅ Accept appointment - changes status from 'pending' to 'accepted'
  const acceptAppointment = (queueNo) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { ...p, appointmentStatus: "accepted", inQueue: true } : p)
    );
  };

  // ✅ Updated rejectAppointment function to accept and store the reason
  const rejectAppointment = (queueNo, reason) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { 
        ...p, 
        appointmentStatus: "rejected", 
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        inQueue: false,
        queueExitTime: new Date().toISOString() // Left queue when rejected
      } : p)
    );
  };

  //added mock simulation helper function (pending - queue status)
  const simulateStatusChange = (queueNo, updates) => {
    setPatients(prev =>
      prev.map(p => p.queueNo === queueNo ? { ...p, ...updates } : p)
    );
  };

  const requeuePatient = (queueNo) => {
    setPatients(prev => {
      // Find the cancelled patient
      const cancelledPatient = prev.find(p => p.queueNo === queueNo);
      if (!cancelledPatient) return prev;
      
      // Get the highest queue number to assign new ticket
      const maxQueueNo = Math.max(...prev.map(p => p.queueNo));
      const newQueueNo = maxQueueNo + 1;
      
      // Create new patient entry with new queue number
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
      
      // Mark old entry as inactive (but keep it in history)
      const updatedPatients = prev.map(p => 
        p.queueNo === queueNo ? { ...p, isInactive: true, inQueue: false } : p
      );
      
      // Add new patient entry at the end
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
  setAvgWaitTime(prev => Math.max(5, prev - 5)); // Minimum 5 mins
  };

  // NEW: Get current serving patient for a specific doctor
  const getDoctorCurrentServing = (doctorId) => {
    return doctorCurrentServing[doctorId] || null;
  };

  // NEW: Set current serving patient for a specific doctor
  const setDoctorCurrentServingPatient = (doctorId, queueNo) => {
    setDoctorCurrentServing(prev => ({
      ...prev,
      [doctorId]: queueNo
    }));
  };

  // NEW: Call next patient for a specific doctor
  const callNextPatientForDoctor = (doctorId) => {
    const currentPatientQueueNo = doctorCurrentServing[doctorId];
    
    // Mark current patient as done
    if (currentPatientQueueNo) {
      updatePatientStatus(currentPatientQueueNo, 'done');
    }
    
    // Find next waiting priority patient for this doctor
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
    
    // Find next waiting regular patient for this doctor
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
      // No more patients for this doctor
      setDoctorCurrentServingPatient(doctorId, null);
    }
  };

  // NEW: Cancel patient for a specific doctor
  const cancelPatientForDoctor = (doctorId) => {
    const currentPatientQueueNo = doctorCurrentServing[doctorId];
    
    if (!currentPatientQueueNo) return;
    
    // Mark current patient as cancelled
    cancelPatient(currentPatientQueueNo);
    
    // Find next waiting priority patient for this doctor
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
    
    // Find next waiting regular patient for this doctor
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
      // No more patients for this doctor
      setDoctorCurrentServingPatient(doctorId, null);
    }
  };

  const queueInfo = useMemo(() => {
    const total = patients.filter(p => p.inQueue && !p.isInactive).length;
    const waitingCount = patients.filter(p => p.status === "waiting" && p.inQueue && !p.isInactive).length;
    return { total, waitingCount, currentServing };
  }, [patients, currentServing]);

  // NEW: Start a doctor's queue for the day
  const startDoctorQueue = (doctorId) => {
    setActiveDoctors(prev => {
      if (prev.includes(doctorId)) return prev; // Already active
      const newActiveDoctors = [...prev, doctorId];
      
      // Reassign unassigned patients after updating active doctors
      setTimeout(() => reassignPatientsForDoctor(doctorId), 0);
      
      return newActiveDoctors;
    });
  };

  // NEW: Stop a doctor's queue
  const stopDoctorQueue = (doctorId) => {
    setActiveDoctors(prev => prev.filter(id => id !== doctorId));
  };

  // NEW: Reassign unassigned patients when a doctor starts their queue
  const reassignPatientsForDoctor = (doctorId) => {
    setPatients(prev => {
      const doctor = doctors.find(d => d.id === doctorId);
      if (!doctor) return prev;

      return prev.map(patient => {
        // Skip if already assigned, inactive, or done/cancelled
        if (patient.assignedDoctor || patient.isInactive || 
            patient.status === 'done' || patient.status === 'cancelled') {
          return patient;
        }

        // Skip if appointment not accepted yet
        if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') {
          return patient;
        }

        // Check if this doctor can handle the patient's services
        const primaryService = patient.services?.[0];
        if (!primaryService) return patient;

        // If doctor specializes in this service, assign them
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

  // NEW: Check if a doctor is active
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
      simulateStatusChange, //added for simulation 
    }}>
      {children}
    </PatientContext.Provider>
  );
};