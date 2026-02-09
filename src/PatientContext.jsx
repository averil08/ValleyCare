import React, { createContext, useState, useMemo, useEffect } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles, getMaxQueueNumber } from './lib/patientService';
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
    rejectionReason: dbPatient.rejection_reason,
    rejectedAt: dbPatient.rejected_at,
    calledAt: dbPatient.called_at,
    completedAt: dbPatient.completed_at,
    queueExitTime: dbPatient.queue_exit_time,
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
      // 1. If active patient is inactive (e.g. requeued/cancelled), try to find their new ticket
      if (activePatient.isInactive) {
        const newTicket = patients.find(p =>
          p.requeued &&
          p.originalQueueNo === activePatient.queueNo &&
          !p.isInactive
        );
        if (newTicket) {
          console.log("🔄 Switching to new ticket for requeued patient");
          setActivePatient(newTicket);
          return;
        }
      }

      // 2. Normal sync: find the freshest version of the active patient
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

  // ✅ NEW: Dynamic Average Wait Time calculation
  const avgWaitTime = useMemo(() => {
    const queueTimeData = [];
    patients.forEach(p => {
      // Only look at patients who have been called (have both registeredAt and calledAt)
      if (p.registeredAt && p.calledAt) {
        const registeredTime = new Date(p.registeredAt);
        const calledTime = new Date(p.calledAt);
        const queueTimeMinutes = Math.round((calledTime - registeredTime) / 60000);

        // Only count reasonable times (1-240 minutes)
        if (queueTimeMinutes > 0 && queueTimeMinutes <= 240) {
          queueTimeData.push(queueTimeMinutes);
        }
      }
    });

    return queueTimeData.length > 0
      ? Math.round(queueTimeData.reduce((sum, time) => sum + time, 0) / queueTimeData.length)
      : 15; // Default to 15 if no data
  }, [patients]);

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
  /*
  // ⚠️ DISABLED: This useEffect causes infinite loops and conflicts with the main sync effect at line 87.
  // The 'requeued' logic (switching to new ticket) is now better handled by the main sync or manual switching if needed.
  // Ideally, when a patient is requeued, the old ticket becomes inactive, and the patient logic should naturally 
  // pickup the new active ticket if we handle it correctly in the main sync.
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
  */

  // ADDED THIS: Auto-assign patients when activeDoctors or patients change
  useEffect(() => {
    // Prevent running if no active doctors
    if (activeDoctors.length === 0) return;

    const unassignedPatients = patients.filter(p =>
      !p.assignedDoctor &&
      !p.isInactive &&
      p.status !== 'done' &&
      p.status !== 'cancelled' &&
      (p.type !== 'Appointment' || p.appointmentStatus === 'accepted')
    );

    if (unassignedPatients.length === 0) return;

    // Check if any patient CAN be assigned to avoid useless updates
    const patientsToUpdate = [];

    unassignedPatients.forEach(patient => {
      // Skip if pending/rejected
      if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') return;

      let doctor = null;

      // Preferred doctor check
      if (patient.preferredDoctor) {
        const preferred = doctors.find(d => d.id === patient.preferredDoctor.id);
        if (preferred) doctor = preferred;
      }

      // Auto-assignment
      if (!doctor) {
        doctor = assignDoctor(patient.services || [], patients, activeDoctors);
      }

      if (doctor) {
        console.log(`✅ Auto-assigned ${patient.name} (Queue #${patient.queueNo}) to ${doctor.name}`);
        patientsToUpdate.push({ patient, doctor });
      }
    });

    // ONLY update state if we actually have changes
    if (patientsToUpdate.length > 0) {
      setPatients(prev => {
        const nextPatients = [...prev];
        let hasChanges = false;

        patientsToUpdate.forEach(({ patient, doctor }) => {
          const index = nextPatients.findIndex(p => p.id === patient.id || (p.queueNo === patient.queueNo && p.tempId === patient.tempId));
          if (index !== -1) {
            const updatedPatient = {
              ...nextPatients[index],
              assignedDoctor: doctor
            };
            nextPatients[index] = updatedPatient;
            hasChanges = true;

            // Sync to DB
            syncPatientToDatabase(updatedPatient).catch(err => {
              console.error('⚠️ Database sync failed:', err);
            });
          }
        });

        return hasChanges ? nextPatients : prev;
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

  const rejectAppointment = async (patientId, reason) => {
    try {
      console.log(`❌ Rejecting appointment ${patientId}. Reason: ${reason}`);

      const rejectedAt = new Date().toISOString();
      const updates = {
        appointment_status: "rejected",
        rejection_reason: reason,
        rejected_at: rejectedAt,
        in_queue: false,
        queue_exit_time: rejectedAt
      };

      // 1. Sync to database via supabase directly for critical update
      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

      if (error) throw error;

      // 2. Update local state
      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          appointmentStatus: "rejected",
          rejectionReason: reason,
          rejectedAt: rejectedAt,
          inQueue: false,
          queueExitTime: rejectedAt
        };
      }));

    } catch (error) {
      console.error("Failed to reject appointment:", error);
    }
  };

  const requeuePatient = (queueNo) => {
    setPatients(prev => {
      const cancelledPatient = prev.find(p => p.queueNo === queueNo);
      if (!cancelledPatient) return prev;

      const maxQueueNo = Math.max(...prev.map(p => p.queueNo));
      const newQueueNo = maxQueueNo + 1;

      // 1. Create new patient ticket
      // CRITICAL: Must remove ID/dbId so database creates a NEW record instead of updating old one
      const { id, dbId, ...patientDataWithoutId } = cancelledPatient;

      // Add a tempId to track this optimistic update
      const tempId = `temp-${Date.now()}`;

      const newPatient = {
        ...patientDataWithoutId,
        tempId: tempId, // Track this optimistic record
        queueNo: newQueueNo,
        status: "waiting",
        registeredAt: new Date().toISOString(),
        requeued: true,
        originalQueueNo: queueNo,
        inQueue: true,
        calledAt: null, // Reset timing
        queueExitTime: null,
        completedAt: null,
        isInactive: false // Ensure new ticket is active
      };

      // 1b. Sync NEW patient to database with CONFLICT RESOLUTION
      syncPatientToDatabase(newPatient).then(async (result) => {
        if (!result.success) {
          console.log(`⚠️ Initial sync failed: ${result.error}. Checking for queue number conflict...`);

          if (result.error && (result.error.includes("unique_queue_no") || result.error.includes("duplicate key") || result.error.includes("409"))) {
            console.log("♻️ Queue number conflict detected. Checking if it's a race condition (did we already save?)...");

            // 1. Check who owns the conflicting slot
            const { data: existingPatient } = await supabase
              .from('patients')
              .select('*')
              .eq('queue_no', newQueueNo)
              .single();

            // 2. Identify if it's us (Race Condition Success)
            if (existingPatient &&
              existingPatient.name === newPatient.name &&
              existingPatient.phone_num === newPatient.phoneNum) {

              console.log("✅ Conflict was with SELF. Treating as success.", existingPatient);

              // Update local state to match the existing record
              setPatients(current =>
                current.map(p =>
                  (p.tempId === tempId) ? { ...newPatient, id: existingPatient.id } : p
                ).sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0))
              );
              return; // Exit, we are done
            }

            console.log("⚠️ Conflict is real (another patient). Fetching authoritative max queue number...");

            // 3. Genuine Conflict - Retry with new number
            const maxResult = await getMaxQueueNumber();
            if (maxResult.success) {
              const safeQueueNo = maxResult.maxQueueNo + 1;
              console.log(`✅ Found safe queue number: ${safeQueueNo}. Retrying sync...`);

              const correctedPatient = {
                ...newPatient,
                queueNo: safeQueueNo
              };

              // Retry Sync
              const retryResult = await syncPatientToDatabase(correctedPatient);

              if (retryResult.success) {
                console.log("✅ Retry successful! Updating local state with safe queue number.");

                // Update local state to match authoritative DB number
                setPatients(current =>
                  current.map(p =>
                    // Match by tempId to ensure we update the correct optimistic record
                    (p.tempId === tempId) ? { ...correctedPatient, id: retryResult.data?.id } : p
                  ).sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0))
                );
              } else {
                console.error("❌ Retry failed even with new number:", retryResult.error);
                // Remove the failed optimistic update to prevent "ghost" duplicates
                setPatients(current => current.filter(p => p.tempId !== tempId));
              }
            }
          } else {
            // If error is NOT a conflict (e.g. network error), remove optimisic update to prevent bad state
            console.error("❌ Sync failed with non-conflict error. removing optimistic record.");
            setPatients(current => current.filter(p => p.tempId !== tempId));
          }
        } else {
          // Success! Update the temporary record with the real ID from DB
          if (result.data?.id) {
            setPatients(current =>
              current.map(p => p.tempId === tempId ? { ...p, id: result.data.id } : p)
            );
          }
        }
      });

      // 2. Mark OLD ticket as inactive
      const oldPatient = {
        ...cancelledPatient,
        isInactive: true,
        inQueue: false,
        status: 'cancelled', // Optional: explicitly mark as cancelled/archived
        queueExitTime: new Date().toISOString()
      };

      // 2b. Sync OLD patient to database (CRITICAL FIX)
      // We must explicitly save the 'isInactive' state so the patient's browser knows to switch
      syncPatientToDatabase(oldPatient).catch(err => {
        console.error('⚠️ Database sync failed (old ticket):', err);
      });

      // 3. Update local state
      const updatedPatients = prev.map(p =>
        p.queueNo === queueNo ? oldPatient : p
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