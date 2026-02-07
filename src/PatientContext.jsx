import React, { createContext, useState, useMemo, useEffect } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles } from './lib/patientService';
import { supabase } from './lib/supabaseClient'; // Import Supabase client

export const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true); // NEW: Loading state
  const [patients, setPatients] = useState([]);

  // Helper to transform DB data to App format
  const transformPatientData = (dbPatient) => ({
    // ✅ CRITICAL: Use dbId as the primary identifier
    id: dbPatient.id,
    queueNo: dbPatient.queue_no,
    name: dbPatient.name,
    age: dbPatient.age,
    phoneNum: dbPatient.phone_num,
    type: dbPatient.patient_type === 'appointment' ? 'Appointment' : 'Walk-in',
    appointmentDateTime: dbPatient.appointment_datetime,
    symptoms: dbPatient.symptoms || [],
    services: dbPatient.services || [],
    status: (dbPatient.patient_type === 'appointment' && dbPatient.appointment_status !== 'accepted' && dbPatient.status === 'in progress')
      ? 'waiting'
      : (dbPatient.status || "waiting"),
    appointmentStatus: dbPatient.appointment_status,
    inQueue: dbPatient.in_queue ?? (dbPatient.patient_type === 'walk-in' || dbPatient.appointment_status === 'accepted'),
    registeredAt: dbPatient.registered_at || dbPatient.created_at,
    assignedDoctor: (dbPatient.assigned_doctor_name || dbPatient.physician)
      ? doctors.find(d => d.name === (dbPatient.assigned_doctor_name || dbPatient.physician)) || { name: (dbPatient.assigned_doctor_name || dbPatient.physician) }
      : null,
    isInactive: dbPatient.is_inactive || false,
    // Keep raw DB ID for reference/updates
    dbId: dbPatient.id,
    patientEmail: dbPatient.patient_email // NEW: Add patient email for access control
  });

  // ==========================================
  // NEW: LOAD PATIENTS FROM DATABASE ON MOUNT
  // ==========================================
  // ==========================================
  // UPDATED: LOAD PATIENTS FROM DATABASE ON MOUNT
  // ==========================================
  // ==========================================
  // UPDATED: LOAD PATIENTS FROM DATABASE 
  // ==========================================
  const loadPatientsFromDatabase = async () => {
    try {
      console.log('📥 Loading patients from database...');
      const result = await getAllPatientProfiles();

      if (result.success && result.data) {
        const transformedPatients = result.data.map(transformPatientData);

        // ✅ DE-DUPLICATION: Ensure no double entries by ID
        setPatients(() => {
          const uniqueMap = new Map();
          transformedPatients.forEach(p => uniqueMap.set(p.id, p));
          return Array.from(uniqueMap.values()).sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0));
        });

        // Restore currentServing
        const inProgressPatient = transformedPatients.find(p => p.status === "in progress" && !p.isInactive);
        setCurrentServing(inProgressPatient ? inProgressPatient.queueNo : null);
      }
    } catch (error) {
      console.error('⚠️ Failed to load from database:', error);
    } finally {
      setIsLoadingFromDB(false);
    }
  };

  useEffect(() => {
    loadPatientsFromDatabase();
  }, []);

  // ✅ NEW: Sync activePatient with patients list updates
  // This ensures that if the patients list is updated via Real-time (e.g. status change to 'accepted'),
  // the activePatient object also gets updated immediately.
  useEffect(() => {
    if (activePatient && patients.length > 0) {
      const freshData = patients.find(p => p.id === activePatient.id);
      if (freshData) {
        // Only update if there are actual changes to avoid infinite loops
        // We compare relevant fields or just check reference/JSON
        if (JSON.stringify(activePatient) !== JSON.stringify(freshData)) {
          console.log("🔄 Syncing activePatient with fresh data from DB/Realtime");
          setActivePatient(freshData);
        }
      }
    }
  }, [patients, activePatient]);

  // ==========================================
  // REAL-TIME SUBSCRIPTION
  // ==========================================
  useEffect(() => {
    console.log("🔌 Setting up Supabase Realtime subscription...");

    const channel = supabase
      .channel('public:patients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          console.log('⚡ Realtime event received:', payload.eventType);
          // Simple, robust update: Refresh data from DB to ensure state is perfectly synced
          loadPatientsFromDatabase();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log("🔌 Cleaning up Supabase subscription...");
      supabase.removeChannel(channel);
    };
  }, []); // Run once on mount

  // NEW: Persist activePatient to localStorage
  useEffect(() => {
    if (activePatient?.id) {
      localStorage.setItem('activePatientId', activePatient.id);
    }
    // REMOVED: The else if (activePatient === null) block to prevent race conditions.
    // We now rely on explicit clearing via clearActivePatient()
  }, [activePatient]);

  // NEW: Restore activePatient from localStorage on load
  useEffect(() => {
    if (!isLoadingFromDB && !activePatient && patients.length > 0) {
      const persistedId = localStorage.getItem('activePatientId');
      if (persistedId) {
        const foundPatient = patients.find(p => p.id === persistedId);
        if (foundPatient) {
          console.log("🔄 Restoring active patient from storage:", foundPatient.name);
          setActivePatient(foundPatient);
        }
      }
    }
  }, [isLoadingFromDB, patients, activePatient]);

  // Existing localStorage sync (keep this for cross-tab communication)
  useEffect(() => {
    if (!isLoadingFromDB) { // Only sync after initial load
      localStorage.setItem('patients-sync', JSON.stringify(patients));
      console.log('📤 Broadcasting patients to other tabs:', patients.length);
    }
  }, [patients, isLoadingFromDB]);

  const [currentServing, setCurrentServing] = useState(null); // Start at null when loading from DB
  const [avgWaitTime, setAvgWaitTime] = useState(15);
  const [activeDoctors, setActiveDoctors] = useState([]);

  const [doctorCurrentServing, setDoctorCurrentServing] = useState(() => {
    const initialServing = {};
    patients.forEach(patient => {
      // Robust check: must be in progress, have a doctor, not inactive, AND if appointment, must be accepted
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
        initialServing[patient.assignedDoctor.id] = patient.queueNo;
      }
    });
    return initialServing;
  });

  useEffect(() => {
    const currentServing = {};
    patients.forEach(patient => {
      // Robust check: same filters as initialization
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
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

      const updatedPatient = patients.find(p => {
        if (activePatient.id && p.id === activePatient.id) return true;
        if (activePatient.queueNo !== null && activePatient.queueNo !== undefined && p.queueNo === activePatient.queueNo) return true;
        return false;
      });
      if (updatedPatient && JSON.stringify(updatedPatient) !== JSON.stringify(activePatient)) {
        setActivePatient(updatedPatient);
      }
    }
  }, [patients, activePatient]);

  // ADDED THIS: Auto-assign patients when activeDoctors or patients change
  useEffect(() => {
    const unassignedPatients = patients.filter(p =>
      !p.assignedDoctor &&
      !p.isInactive &&
      p.status !== 'done' &&
      p.status !== 'cancelled' &&
      (p.type !== 'Appointment' || p.appointmentStatus === 'accepted')
    );

    if (unassignedPatients.length > 0 && activeDoctors.length > 0) {
      console.log(`🔄 Found ${unassignedPatients.length} unassigned patients - attempting to assign...`);

      setPatients(prev => {
        return prev.map(patient => {
          // Skip if already has a doctor or is inactive/done/cancelled
          if (patient.assignedDoctor ||
            patient.isInactive ||
            patient.status === 'done' ||
            patient.status === 'cancelled') {
            return patient;
          }

          // Skip pending/rejected appointments
          if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') {
            return patient;
          }

          // Try to assign a doctor
          let doctor = null;

          // ✅ NEW: If patient has a preferred doctor (from "Book by Doctor"), assign them immediately 
          if (patient.preferredDoctor) {
            const preferred = doctors.find(d => d.id === patient.preferredDoctor.id);
            if (preferred) {
              console.log(`✅ Using preferred doctor for ${patient.name}: ${preferred.name}`);
              doctor = preferred;
            }
          }

          // If no preferred doctor, use auto-assignment algorithm
          if (!doctor) {
            doctor = assignDoctor(patient.services || [], prev, activeDoctors);
          }

          if (doctor) {
            console.log(`✅ Auto-assigned ${patient.name} (Queue #${patient.queueNo}) to ${doctor.name}`);

            // ✅ Sync to database
            const updatedPatient = {
              ...patient,
              assignedDoctor: doctor
            };

            syncPatientToDatabase(updatedPatient).catch(err => {
              console.error('⚠️ Database sync failed:', err);
            });

            return updatedPatient;
          }

          return patient;
        });
      });
    }
  }, [patients, activeDoctors]); // Runs whenever patients or activeDoctors change

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
  const addPatient = (inputPatient) => {
    setPatients(prev => {
      // Handle both formats for ID check
      const id = inputPatient.id || inputPatient.dbId;
      // Check if patient already exists in local state to prevent duplicates
      if (id && prev.some(p => p.id === id)) return prev;
      const newPatientEntry = {
        ...inputPatient,
        // Ensure consistent app-level fields, preferring existing camelCase or falling back to snake_case
        id: id, // Ensure id is set
        dbId: id, // Ensure dbId is set
        phoneNum: inputPatient.phoneNum || inputPatient.phone_num,
        type: inputPatient.type || (inputPatient.patient_type === 'appointment' ? 'Appointment' : 'Walk-in'),
        queueNo: inputPatient.queueNo !== undefined ? inputPatient.queueNo : inputPatient.queue_no,
        appointmentDateTime: inputPatient.appointmentDateTime || inputPatient.appointment_datetime,
        // Make sure we carry over other important fields
        name: inputPatient.name,
        age: inputPatient.age,
        symptoms: inputPatient.symptoms || [],
        services: inputPatient.services || [],
        status: inputPatient.status || "waiting",
        appointmentStatus: inputPatient.appointmentStatus || inputPatient.appointment_status,
        inQueue: inputPatient.inQueue !== undefined ? inputPatient.inQueue : (inputPatient.patient_type === 'walk-in')
      };

      return [...prev, newPatientEntry].sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0));
    });
  };

  // ==========================================
  // NEW: Explicitly clear active patient
  // ==========================================
  const clearActivePatient = () => {
    console.log('🧹 Clearing active patient session...');
    setActivePatient(null);
    localStorage.removeItem('activePatientId');
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
  //ADDED this update
  const acceptAppointment = async (patientId) => {
    try {
      // 1. Get the patient to check if they already have a valid queue number
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        console.error("Patient not found for acceptance");
        return;
      }

      let newQueueNo = patient.queueNo;

      // Only generate a new number if the current one is missing or is a temporary high number
      if (!newQueueNo || newQueueNo >= 900000) {

        // 1. Calculate the next available queue number based on current patients

        // filtering for only positive real queue numbers (ignoring high temp numbers > 900000)
        const realQueueNumbers = patients
          .map(pat => pat.queueNo)
          .filter(q => q && q > 0 && q < 900000);

        const maxQueueNo = realQueueNumbers.length > 0 ? Math.max(...realQueueNumbers) : 0;
        newQueueNo = maxQueueNo + 1;

        console.log(`✅ Accepting appointment ${patientId}. Old number invalid/temp. Assigning NEW queue no: ${newQueueNo}`);
      } else {
        console.log(`✅ Accepting appointment ${patientId}. Preserving EXISTING queue no: ${newQueueNo}`);
      }

      // 2. Determine Doctor Assignment - If they preferred a doctor during booking, keep it
      let assignedDoctor = patient.assignedDoctor;
      if (!assignedDoctor && patient.bookingMode === 'doctor' && patient.preferredDoctor) {
        assignedDoctor = doctors.find(d => d.id === patient.preferredDoctor.id);
      }

      // 3. Prepare updates
      const updates = {
        queue_no: newQueueNo,
        appointment_status: "accepted",
        in_queue: true,
        status: "waiting",
        assigned_doctor_name: assignedDoctor?.name || null
      };

      // 4. Sync to database via supabase directly for critical update
      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

      if (error) throw error;

      // 5. Update local state
      setPatients(prev => prev.map(pat => {
        if (pat.id !== patientId) return pat;
        return {
          ...pat,
          ...updates,
          queueNo: newQueueNo,
          appointmentStatus: "accepted",
          inQueue: true,
          assignedDoctor: assignedDoctor
        };
      }));

    } catch (error) {
      console.error("Failed to accept appointment:", error);
    }
  };

  const rejectAppointment = (patientId, reason) => {
    console.log(`❌ Rejecting appointment ${patientId}. Reason: ${reason}`);
    setPatients(prev =>
      prev.map(p => {
        if (p.id !== patientId) return p;

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

  //ADDED this update function
  const reassignPatientsForDoctor = (doctorId) => {
    setPatients(prev => {
      const doctor = doctors.find(d => d.id === doctorId);
      if (!doctor) {
        console.log(`❌ Doctor with ID ${doctorId} not found`);
        return prev;
      }

      console.log(`🔍 Checking patients for Dr. ${doctor.name}...`);
      let assignedCount = 0;

      const updatedPatients = prev.map(patient => {
        // Skip if patient already has a doctor assigned
        if (patient.assignedDoctor) {
          return patient;
        }

        // Skip inactive, done, or cancelled patients
        if (patient.isInactive || patient.status === 'done' || patient.status === 'cancelled') {
          return patient;
        }

        // Skip pending/rejected appointments
        if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') {
          return patient;
        }

        // Check if patient has any services
        const patientServices = patient.services || [];
        if (patientServices.length === 0) {
          return patient;
        }

        // ✅ UPDATED: Check if doctor can handle ANY service (not just primary)
        const hasMatchingService = patientServices.some(patientService =>
          doctor.specializations?.includes(patientService)
        );

        if (hasMatchingService) {
          assignedCount++;
          console.log(`✅ Assigned ${patient.name} (Queue #${patient.queueNo}) to Dr. ${doctor.name}`);
          console.log(`   Patient services: ${patientServices.join(', ')}`);
          console.log(`   Doctor specializations: ${doctor.specializations?.join(', ')}`);

          const updatedPatient = {
            ...patient,
            assignedDoctor: doctor
          };

          // ✅ Sync to database
          syncPatientToDatabase(updatedPatient).catch(err => {
            console.error('⚠️ Database sync failed:', err);
          });

          return updatedPatient;
        }

        return patient;
      });

      if (assignedCount > 0) {
        console.log(`✅ Successfully assigned ${assignedCount} patient(s) to Dr. ${doctor.name}`);
      } else {
        console.log(`ℹ️ No unassigned patients found matching Dr. ${doctor.name}'s services`);
      }

      return updatedPatients;
    });
  };

  const isDoctorActive = (doctorId) => {
    return activeDoctors.includes(doctorId);
  };

  // NEW: Show loading state while fetching from database
  // ✅ FIXED: Always provide all functions, even during loading
  return (
    <PatientContext.Provider value={{
      patients: isLoadingFromDB ? [] : patients,
      setPatients,
      addPatient,
      currentServing: isLoadingFromDB ? null : currentServing,
      setCurrentServing,
      activePatient: isLoadingFromDB ? null : activePatient,
      setActivePatient,
      clearActivePatient,
      updatePatientStatus,
      callNextPatient,
      avgWaitTime,
      addWaitTime,
      reduceWaitTime,
      queueInfo: isLoadingFromDB ? { total: 0, waitingCount: 0, currentServing: null } : queueInfo,
      getAvailableSlots, // ✅ Always available
      cancelPatient,
      requeuePatient,
      acceptAppointment,
      rejectAppointment,
      getDoctorCurrentServing,
      setDoctorCurrentServingPatient,
      callNextPatientForDoctor,
      cancelPatientForDoctor,
      activeDoctors: isLoadingFromDB ? [] : activeDoctors,
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