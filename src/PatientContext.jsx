import React, { createContext, useState, useMemo, useEffect, useRef } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles, getMaxQueueNumber } from './lib/patientService';
import { supabase } from './lib/supabaseClient'; // Import Supabase client
import { sendAppointmentEmail } from './lib/emailService';

export const PatientContext = createContext();

// SHARED UTILITIES
const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

const isForToday = (p) => {
  if (p.type === 'Appointment' && p.appointmentDateTime) {
    return isToday(p.appointmentDateTime);
  }
  return isToday(p.registeredAt);
};

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true); // NEW: Loading state
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('patientNotifications');
    return saved ? JSON.parse(saved) : [];
  });
  const patientsRef = useRef([]); // NEW: Ref to track latest patients without re-subscribing

  // NEW: Secretary Notification Check Timestamp
  const [lastSecretaryNotificationCheck, setLastSecretaryNotificationCheck] = useState(() => {
    return localStorage.getItem('lastSecretaryNotificationCheck') || new Date().toISOString();
  });

  // NEW: Doctor Notification Check Timestamp (Object keyed by doctorId)
  const [lastDoctorNotificationCheck, setLastDoctorNotificationCheck] = useState(() => {
    const saved = localStorage.getItem('lastDoctorNotificationCheck');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('patientNotifications', JSON.stringify(notifications));
  }, [notifications]);

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
    patientEmail: dbPatient.patient_email, // NEW: Add patient email for access control
    isPriority: dbPatient.is_priority || false,
    priorityType: dbPatient.priority_type || null,
    daysSinceOnset: dbPatient.days_since_onset || null
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


        // Restore currentServing — ONLY if they were registered today
        // Stale "in progress" patients from previous days are ignored for currentServing
        const inProgressPatient = transformedPatients.find(p =>
          p.status === "in progress" &&
          !p.isInactive &&
          isForToday(p)
        );
        setCurrentServing(inProgressPatient ? inProgressPatient.queueNo : null);

        // SELF-HEALING: Mark any "in progress" patients from previous days as "done"
        transformedPatients.forEach(p => {
          if (p.status === 'in progress' && !p.isInactive && !isForToday(p)) {
            console.log(`🧹 Auto-clearing stale "in progress" patient #${p.queueNo} (${p.name}) from ${p.registeredAt}`);

            p.status = 'done';
            p.completedAt = new Date().toISOString();
            if (!p.queueExitTime) p.queueExitTime = new Date().toISOString();

            // Sync to database
            syncPatientToDatabase(p).catch(err => {
              console.error('⚠️ Failed to auto-clear stale patient:', err);
            });
          }
        });

        // Set the patients state with the updated (and possibly healed) list
        setPatients(() => {
          const uniqueMap = new Map();
          transformedPatients.forEach(p => uniqueMap.set(p.id, p));
          return Array.from(uniqueMap.values()).sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0));
        });

        // ✅ CRITICAL FIX: Restore active patient synchronously BEFORE hiding loading screen
        const persistedId = localStorage.getItem('activePatientId');
        if (persistedId) {
          const foundPatient = transformedPatients.find(p => p.id === persistedId);
          if (foundPatient) {
            console.log("⚡ Sync-restorating active patient from storage:", foundPatient.name);
            setActivePatient(foundPatient);
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to load from database:', error);
    } finally {
      setIsLoadingFromDB(false);
    }
  };

  useEffect(() => {
    // Cleanup: Remove stale activeDoctors persistence from previous versions
    localStorage.removeItem('activeDoctors');
    loadPatientsFromDatabase();
  }, []);

  // ✅ NEW: Sync activePatient with patients list updates
  // This ensures that if the patients list is updated via Real-time (e.g. status change to 'accepted'),
  // the activePatient object also gets updated immediately.
  useEffect(() => {
    patientsRef.current = patients; // Sync ref with state
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

          // NEW: Notification Logic for Patients
          if (payload.eventType === 'UPDATE') {
            const oldData = payload.old;
            const newData = payload.new;
            const currentUserEmail = localStorage.getItem('currentPatientEmail')?.toLowerCase();

            if (currentUserEmail && newData.patient_email?.toLowerCase() === currentUserEmail) {
              // Get old status from state ref instead of relying on payload.old
              const oldPatient = patientsRef.current.find(p => p.id === newData.id);
              const oldStatus = oldPatient?.appointmentStatus || 'pending'; // fallback

              const newStatus = newData.appointment_status;

              // Check if appointment status changed from pending to accepted/rejected
              if (oldStatus === 'pending' && (newStatus === 'accepted' || newStatus === 'rejected')) {
                const message = newStatus === 'accepted'
                  ? `Your appointment for ${new Date(newData.appointment_datetime).toLocaleDateString()} has been ACCEPTED.`
                  : `Your appointment for ${new Date(newData.appointment_datetime).toLocaleDateString()} has been DECLINED. Reason: ${newData.rejection_reason || 'No reason provided'}`;

                setNotifications(prev => [{
                  id: Date.now(),
                  message,
                  type: newStatus,
                  timestamp: new Date().toISOString(),
                  read: false
                }, ...prev]);
              }
            }
          }

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
          // ACCOUNT VALIDATION:
          const currentEmail = localStorage.getItem('currentPatientEmail');
          const isLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

          if (isLoggedIn && currentEmail) {
            const normalizedFoundEmail = (foundPatient.patientEmail || '').toLowerCase().trim();
            const normalizedCurrentEmail = currentEmail.toLowerCase().trim();

            if (normalizedFoundEmail && normalizedFoundEmail !== normalizedCurrentEmail) {
              console.log("🚫 Restored patient belongs to another account. Clearing.");
              localStorage.removeItem('activePatientId');
              return;
            }
          }

          console.log("🔄 Restoring active patient from storage:", foundPatient.name);
          setActivePatient(foundPatient);
        }
      }
    }
  }, [isLoadingFromDB, patients, activePatient]);

  // NEW: Automatic session discovery for logged-in patients
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';
    const currentEmail = localStorage.getItem('currentPatientEmail');

    if (!isLoadingFromDB && isLoggedIn && currentEmail && patients.length > 0) {
      const normalizedCurrentEmail = currentEmail.toLowerCase().trim();

      // OPTION 1: Validate existing session
      if (activePatient && activePatient.patientEmail) {
        const normalizedActiveEmail = activePatient.patientEmail.toLowerCase().trim();
        if (normalizedActiveEmail !== normalizedCurrentEmail) {
          console.log("⚠️ Active patient belongs to another account. Clearing session.");
          clearActivePatient();
          return;
        }
      }

      // OPTION 2: Auto-discover session if none active
      if (!activePatient) {
        const myActiveAppointment = patients.find(p =>
          p.patientEmail &&
          p.patientEmail.toLowerCase().trim() === normalizedCurrentEmail &&
          (p.appointmentStatus === 'pending' || p.appointmentStatus === 'accepted' || p.inQueue) &&
          !p.isInactive
        );

        if (myActiveAppointment) {
          console.log('✅ Found account-linked active appointment, auto-activating:', myActiveAppointment.name);
          setActivePatient(myActiveAppointment);
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
  const [manualWaitTimeAdjustment, setManualWaitTimeAdjustment] = useState(0); // NEW: Manual adjustment state

  // ✅ NEW: Dynamic Average Wait Time calculation
  const avgWaitTime = useMemo(() => {
    if (isLoadingFromDB) return '...';

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

    const calculatedAvg = queueTimeData.length > 0
      ? Math.round(queueTimeData.reduce((sum, time) => sum + time, 0) / queueTimeData.length)
      : 15; // Default to 15 if no data

    // Return calculated average + manual adjustment (ensure it doesn't go below 0)
    return Math.max(0, calculatedAvg + manualWaitTimeAdjustment);
  }, [patients, manualWaitTimeAdjustment, isLoadingFromDB]);

  // NEW: Calculate unread cancellations for secretary
  const unreadSecretaryNotificationsCount = useMemo(() => {
    const userRole = localStorage.getItem('userRole');
    // Only show for secretary/staff/admin
    if (userRole !== 'secretary' && userRole !== 'staff' && userRole !== 'admin') return 0;

    return patients.filter(p =>
      p.type === 'Appointment' &&
      p.status === 'cancelled' &&
      p.appointmentStatus === 'cancelled' &&
      new Date(p.queueExitTime || p.registeredAt || p.created_at) > new Date(lastSecretaryNotificationCheck)
    ).length;
  }, [patients, lastSecretaryNotificationCheck]);

  const markSecretaryNotificationsAsRead = () => {
    const now = new Date().toISOString();
    setLastSecretaryNotificationCheck(now);
    localStorage.setItem('lastSecretaryNotificationCheck', now);
  };

  const markDoctorNotificationsAsRead = (doctorId) => {
    if (!doctorId) return;
    const now = new Date().toISOString();
    setLastDoctorNotificationCheck(prev => {
      const updated = { ...prev, [doctorId]: now };
      localStorage.setItem('lastDoctorNotificationCheck', JSON.stringify(updated));
      return updated;
    });
  };

  // ✅ UPDATED: activeDoctors is now persisted to localStorage for refresh retention.
  // It includes a daily reset safeguard to prevent stale assignments from previous days.
  const [activeDoctors, setActiveDoctors] = useState(() => {
    const saved = localStorage.getItem('active-doctors-sync');
    if (saved) {
      try {
        const { date, ids } = JSON.parse(saved);
        // Only restore if it was saved today
        if (date === new Date().toDateString()) {
          return ids;
        }
      } catch (e) {
        console.error("Error parsing activeDoctors from localStorage", e);
      }
    }
    return [];
  });

  // Keep localStorage in sync with activeDoctors state
  useEffect(() => {
    localStorage.setItem('active-doctors-sync', JSON.stringify({
      date: new Date().toDateString(),
      ids: activeDoctors
    }));
  }, [activeDoctors]);

  const [doctorCurrentServing, setDoctorCurrentServing] = useState(() => {
    const initialServing = {};
    patients.forEach(patient => {
      // Robust check: must be in progress, have a doctor, not inactive, AND if appointment, must be accepted
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
        // Only count as current serving if patient is from today
        if (isForToday(patient)) {
          initialServing[patient.assignedDoctor.id] = patient.queueNo;
        }
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
        // Only count as current serving if patient is from today
        if (isForToday(patient)) {
          currentServing[patient.assignedDoctor.id] = patient.queueNo;
        }
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
      !p.tempId && // ✅ FIX: Ignore optimistic updates (requeued patients being created)
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

      // Preferred doctor check — ONLY assign if that doctor's queue is currently active
      if (patient.preferredDoctor) {
        const preferredId = Number(patient.preferredDoctor.id);
        if (activeDoctors.includes(preferredId)) {
          const preferred = doctors.find(d => d.id === preferredId);
          if (preferred) doctor = preferred;
        } else {
          // Preferred doctor's queue not started yet — skip assignment for now.
          // The useEffect will re-run when activeDoctors changes and assign then.
          console.log(`⏳ Preferred doctor #${preferredId} queue not active yet — deferring assignment for patient ${patient.name}`);
          return; // Do NOT fall through to auto-assign a different doctor
        }
      }

      // Auto-assignment (only if no preferred doctor was chosen)
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
      if (p.appointmentStatus === 'rejected' || p.appointmentStatus === 'cancelled') return false;
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
        inQueue: inputPatient.inQueue !== undefined ? inputPatient.inQueue : (inputPatient.patient_type === 'walk-in'),
        isPriority: inputPatient.isPriority !== undefined ? inputPatient.isPriority : (inputPatient.is_priority || false),
        priorityType: inputPatient.priorityType || inputPatient.priority_type || null,
        registeredAt: inputPatient.registeredAt || inputPatient.registered_at || inputPatient.created_at || new Date().toISOString()
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
    // 1. Find the patient first
    const patient = patients.find(p => p.queueNo === queueNo);
    if (!patient) return;

    // 2. Prepare updates
    const updates = { status: newStatus };

    if (newStatus === "in progress" && patient.status === "waiting") {
      updates.calledAt = new Date().toISOString();
      updates.queueExitTime = new Date().toISOString();
    }

    if (newStatus === "done" && patient.status === "in progress") {
      updates.completedAt = new Date().toISOString();
      if (!patient.queueExitTime) {
        updates.queueExitTime = new Date().toISOString();
      }
    }

    const updatedPatient = { ...patient, ...updates };

    // 3. Update Local State (Optimistic)
    setPatients(prev => prev.map(p => p.queueNo === queueNo ? updatedPatient : p));

    // 4. Sync status update to database
    try {
      await syncPatientToDatabase(updatedPatient);
    } catch (err) {
      console.error('⚠️ Database sync failed:', err);
      // Optional: Revert local state if sync fails
    }
  };

  // All other functions remain EXACTLY the same
  const cancelPatient = (queueNo) => {
    const patient = patients.find(p => p.queueNo === queueNo);
    if (!patient) return;

    const cancelled = {
      ...patient,
      status: "cancelled",
      queueExitTime: new Date().toISOString(),
      cancelledAt: new Date().toISOString()
    };

    // Update local state
    setPatients(prev => prev.map(p => p.queueNo === queueNo ? cancelled : p));

    // Sync to database
    syncPatientToDatabase(cancelled).catch(err => {
      console.error('⚠️ Database sync failed:', err);
    });
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

      // 2. Determine Doctor Assignment — ONLY assign if that doctor's queue is currently active.
      // If no active match is found now, leave null; the auto-assign useEffect will handle it
      // once the appropriate doctor starts their queue.
      let assignedDoctor = null;

      // Carry through existing assignment only if that doctor's queue is still active
      if (patient.assignedDoctor) {
        const dId = Number(patient.assignedDoctor.id);
        if (activeDoctors.includes(dId)) {
          assignedDoctor = patient.assignedDoctor;
        } else {
          console.log(`⏳ Previously assigned doctor #${dId} queue not active — clearing for re-assignment.`);
        }
      }

      // If still unassigned, check preferred doctor (doctor-mode booking)
      if (!assignedDoctor && patient.bookingMode === 'doctor' && patient.preferredDoctor) {
        const preferredId = Number(patient.preferredDoctor.id);
        if (activeDoctors.includes(preferredId)) {
          assignedDoctor = doctors.find(d => d.id === preferredId) || null;
          console.log(`✅ Preferred doctor #${preferredId} is active — assigning on acceptance.`);
        } else {
          console.log(`⏳ Preferred doctor #${preferredId} queue not active yet — deferring assignment.`);
          // Leave assignedDoctor = null; the auto-assign useEffect will handle it later
        }
      }

      // If still unassigned and booked by service, try active-doctor auto-assignment
      if (!assignedDoctor && patient.bookingMode !== 'doctor') {
        console.log(`🔄 Auto-assigning doctor for accepted appointment ${patientId}...`);
        assignedDoctor = assignDoctor(patient.services || [], patients, activeDoctors);
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

      // 6. Send Email Notification
      sendAppointmentEmail(patient, 'accepted', {
        queueNo: newQueueNo,
        doctor: assignedDoctor?.name,
        dateTime: patient.appointmentDateTime || patient.appointment_datetime
      });

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

      // 3. Send Email Notification
      const patientData = patients.find(p => p.id === patientId);
      if (patientData) {
        sendAppointmentEmail(patientData, 'rejected', {
          reason: reason
        });
      }

    } catch (error) {
      console.error("Failed to reject appointment:", error);
    }
  };

  const cancelAppointment = async (patientId) => {
    try {
      console.log(`❌ Cancelling appointment ${patientId}`);

      const cancelledAt = new Date().toISOString();
      const updates = {
        appointment_status: "cancelled",
        status: "cancelled",
        in_queue: false,
        queue_exit_time: cancelledAt
      };

      // 1. Sync to database via supabase directly
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
          appointmentStatus: "cancelled",
          status: "cancelled",
          inQueue: false,
          queueExitTime: cancelledAt
        };
      }));

    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    }
  };

  const requeuePatient = async (queueNo) => {
    try {
      const cancelledPatient = patients.find(p => p.queueNo === queueNo);
      if (!cancelledPatient) return null;

      console.log(`🔄 Requeueing patient #${queueNo}...`);

      // 1. Get AUTHORITATIVE max queue number from DB first
      const maxResult = await getMaxQueueNumber();
      const nextQueueNo = maxResult.success ? (maxResult.maxQueueNo + 1) : (Math.max(...patients.map(p => p.queueNo || 0)) + 1);

      console.log(`✅ Assigned new queue number: ${nextQueueNo}`);

      // 2. Create new patient ticket object
      // CRITICAL: Must remove ID/dbId so database creates a NEW record instead of updating old one
      const { id, dbId, ...patientDataWithoutId } = cancelledPatient;

      const newPatient = {
        ...patientDataWithoutId,
        queueNo: nextQueueNo,
        status: "waiting",
        registeredAt: new Date().toISOString(),
        requeued: true,
        originalQueueNo: queueNo,
        inQueue: true,
        calledAt: null, // Reset timing
        queueExitTime: null,
        completedAt: null,
        isInactive: false, // Ensure new ticket is active
        tempId: `temp-${Date.now()}` // For local tracking if needed
      };

      // 3. Mark OLD ticket as inactive
      const oldPatient = {
        ...cancelledPatient,
        isInactive: true,
        inQueue: false,
        status: 'cancelled',
        queueExitTime: new Date().toISOString()
      };

      // 4. Update Local State Optimistically
      setPatients(prev => {
        // Replace old patient with updated "inactive" version
        // Add new patient
        const filtered = prev.filter(p => p.queueNo !== queueNo);
        return [...filtered, oldPatient, newPatient].sort((a, b) => (a.queueNo || 0) - (b.queueNo || 0));
      });

      // 5. Sync OLD patient to database (Mark as inactive)
      await syncPatientToDatabase(oldPatient);

      // 6. Sync NEW patient to database
      const syncResult = await syncPatientToDatabase(newPatient);

      if (syncResult.success && syncResult.data?.id) {
        // Update the local newPatient with the real DB ID
        setPatients(prev => prev.map(p =>
          (p.queueNo === nextQueueNo && p.tempId === newPatient.tempId)
            ? { ...p, id: syncResult.data.id }
            : p
        ));
        return { ...newPatient, id: syncResult.data.id };
      } else {
        console.error("❌ Failed to sync new requeued patient:", syncResult.error);
        // Rollback or alert? For now, we leave the optimistic update but log error
        return newPatient;
      }

    } catch (error) {
      console.error("Requeue error:", error);
      return null;
    }
  };


  const callNextPatient = () => {
    // 1. Mark current patient as done
    if (currentServing) {
      updatePatientStatus(currentServing, 'done');
    }

    // 2. Find next patient
    // Priority: Priority patient first? Or just Queue Order?
    // Let's assume Queue Order for general view, but filtered for TODAY.

    const nextPatient = patients.find(p =>
      p.status === "waiting" &&
      p.inQueue &&
      !p.isInactive &&
      p.queueNo > (currentServing || 0) && // Must be after current
      isForToday(p) // MUST be for today
    );

    if (nextPatient) {
      console.log(`Debug: General Queue Calling Waiting Patient ${nextPatient.queueNo}`);
      updatePatientStatus(nextPatient.queueNo, 'in progress');
      setCurrentServing(nextPatient.queueNo);
    } else {
      console.log("Debug: No valid next patient found for General Queue.");
      // No more patients in queue for today
      setCurrentServing(null);
    }
  };

  const addWaitTime = () => {
    setManualWaitTimeAdjustment(prev => prev + 5);
  };

  const reduceWaitTime = () => {
    setManualWaitTimeAdjustment(prev => prev - 5);
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
    const dId = Number(doctorId);
    const currentPatientQueueNo = doctorCurrentServing[dId];

    if (currentPatientQueueNo) {
      updatePatientStatus(currentPatientQueueNo, 'done');
    }


    // Smart Date Check Helper
    const isForToday = (p) => {
      if (p.type === 'Appointment') {
        return isToday(p.appointmentDateTime);
      }
      return isToday(p.registeredAt);
    };

    // Find next priority patient (waiting, assigned to this doctor, FOR TODAY)
    const nextPriorityPatient = patients.find(p =>
      p.status === "waiting" &&
      p.inQueue &&
      p.isPriority &&
      p.assignedDoctor?.id === dId &&
      !p.isInactive &&
      isForToday(p)
    );

    if (nextPriorityPatient) {
      console.log(`Debug: Calling Priority Patient ${nextPriorityPatient.queueNo}`);
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      return;
    }

    // Find next normal patient (waiting, assigned to this doctor, FOR TODAY)
    const nextWaitingPatient = patients.find(p =>
      p.status === "waiting" &&
      p.inQueue &&
      !p.isPriority &&
      p.assignedDoctor?.id === dId &&
      !p.isInactive &&
      isForToday(p)
    );

    if (nextWaitingPatient) {
      console.log(`Debug: Calling Waiting Patient ${nextWaitingPatient.queueNo}`);
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
    }
  };

  const cancelPatientForDoctor = (doctorId) => {
    const dId = Number(doctorId);
    const currentPatientQueueNo = doctorCurrentServing[dId];

    if (!currentPatientQueueNo) return;

    cancelPatient(currentPatientQueueNo);


    const nextPriorityPatient = patients.find(p =>
      p.status === "waiting" &&
      p.inQueue &&
      p.isPriority &&
      p.assignedDoctor?.id === dId &&
      !p.isInactive &&
      isForToday(p)
    );

    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      return;
    }

    const nextWaitingPatient = patients.find(p =>
      p.status === "waiting" &&
      p.inQueue &&
      !p.isPriority &&
      p.assignedDoctor?.id === dId &&
      !p.isInactive &&
      isForToday(p)
    );

    if (nextWaitingPatient) {
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
    }
  };

  const queueInfo = useMemo(() => {
    const total = patients.filter(p => p.inQueue && !p.isInactive).length;
    const waitingCount = patients.filter(p => p.status === "waiting" && p.inQueue && !p.isInactive).length;
    return { total, waitingCount, currentServing };
  }, [patients, currentServing]);

  const startDoctorQueue = (doctorId) => {
    const dId = Number(doctorId);
    setActiveDoctors(prev => {
      if (prev.includes(dId)) return prev;
      return [...prev, dId];
    });
  };

  const stopDoctorQueue = (doctorId) => {
    const dId = Number(doctorId);
    setActiveDoctors(prev => prev.filter(id => id !== dId));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // REMOVED: reassignPatientsForDoctor - This logic is now handled by the auto-assign useEffect (lines 261-335)
  // to avoid duplication and race conditions.

  const isDoctorActive = (doctorId) => {
    const dId = Number(doctorId);
    return activeDoctors.includes(dId);
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
      cancelAppointment,
      getDoctorCurrentServing,
      setDoctorCurrentServingPatient,
      callNextPatientForDoctor,
      cancelPatientForDoctor,
      activeDoctors: isLoadingFromDB ? [] : activeDoctors,
      startDoctorQueue,
      stopDoctorQueue,
      isDoctorActive,
      isLoadingFromDB, // Expose loading state
      notifications,
      clearNotifications,
      markNotificationsRead,
      unreadSecretaryNotificationsCount,
      markSecretaryNotificationsAsRead,
      lastDoctorNotificationCheck,
      markDoctorNotificationsAsRead
    }}>
      {children}
    </PatientContext.Provider>
  );
};