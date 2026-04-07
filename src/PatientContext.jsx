import React, { createContext, useState, useMemo, useEffect, useRef } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles, getMaxQueueNumber } from './lib/patientService';
import { supabase, getBrandedBase } from './lib/supabaseClient'; // Import Supabase client and base helper
import { sendAppointmentEmail, sendReminderEmail } from './lib/emailService';

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
// Turn database integers (1, 1001) into display labels (W001, A001)
export const formatQueueNumber = (num, type, appointmentStatus, appointmentDateTime) => {
  if (type === 'Appointment') {
    if (appointmentStatus === 'accepted') {
      // ✅ DETERMINISTIC FIX:
      // Valid numbers are either < 900,000 (Legacy) OR > 1,000,000 (Branded Today).
      // ONLY the range 900,000 - 999,999 is reserved for "Future Placeholder" (#A---).
      const isPlaceholder = num >= 900000 && num < 1000000;
      
      if (num && !isPlaceholder) {
        const displayNum = num % 10000;
        return `#A${String(displayNum).padStart(3, '0')}`;
      }
      return `#A---`;
    }
    return `#A---`;
  }
  
  // Walk-ins use #W prefix
  const displayNum = num % 10000;
  return `#W${String(displayNum).padStart(3, '0')}`;
};

// Matches doctor names even if the DB includes middle initials/extra punctuation.
// Example: "Dr. Rajiv D. Laoagan" should match "Dr. Rajiv Laoagan".
const normalizeDoctorNameForMatch = (name) => {
  if (!name) return '';
  return name
    .replace(/\bdr\.?\b/gi, ' ') // remove "Dr" token
    .replace(/[.,]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(token => token.length > 1) // drop middle initials (single-letter tokens)
    .join(' ')
    .toLowerCase();
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
  const settingsIdRef = useRef(null); // NEW: Cache for settings record ID
  const finalizingRef = useRef(false); // NEW: Guard for concurrent finalization
  const autoAssignTimeoutRef = useRef(null); // ✅ NEW: Debounce timer for auto-assignment

  // NEW: Secretary Notification Check Timestamp
  const [lastSecretaryNotificationCheck, setLastSecretaryNotificationCheck] = useState(() => {
    return localStorage.getItem('lastSecretaryNotificationCheck') || new Date().toISOString();
  });

  // NEW: Doctor Notification Check Timestamp (Object keyed by doctorId)
  const [lastDoctorNotificationCheck, setLastDoctorNotificationCheck] = useState(() => {
    const saved = localStorage.getItem('lastDoctorNotificationCheck');
    return saved ? JSON.parse(saved) : {};
  });

  // NEW: Auth State
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState(() => localStorage.getItem('isPatientLoggedIn') === 'true');
  const [currentPatientEmail, setCurrentPatientEmail] = useState(() => localStorage.getItem('currentPatientEmail'));

  // NEW: Modal Notification state (for REAL-TIME triggers)
  const [modalNotification, setModalNotification] = useState(null);
  const clearModalNotification = () => setModalNotification(null);

  // NEW: Robust Supabase Auth sync
  useEffect(() => {
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role;
        if (role === 'patient') {
          const email = session.user.email.toLowerCase().trim();
          // Always sync both localStorage AND React state to guarantee UI reflects the session
          localStorage.setItem('currentPatientEmail', email);
          localStorage.setItem('isPatientLoggedIn', 'true');
          setCurrentPatientEmail(email);
          setIsPatientLoggedIn(true);

          // Central Profile Sync: Ensure localStorage has profile data from metadata
          const profileKey = `userProfile_${email}`;
          const metadata = session.user.user_metadata || {};
          const nameParts = (metadata.full_name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

          const profile = {
            email: email,
            fullName: metadata.full_name || "",
            firstName: firstName,
            middleName: middleName,
            surname: surname,
            age: metadata.age || "",
            phoneNumber: metadata.phone_number || ""
          };
          localStorage.setItem(profileKey, JSON.stringify(profile));
          console.log("💾 Synced local profile from Auth metadata:", profileKey);

          console.log("🔐 Syncing Patient Context with Supabase session:", email);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Supabase Auth Event: ${event}`);
      
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        const role = (metadata.role || "").toLowerCase().trim();
        const email = session.user.email?.toLowerCase().trim();

        console.log(`👤 User Email: ${email}, Detected Role: ${role}`);

        if (role === 'patient') {
          console.log("✅ Authenticated as Patient. Syncing state...");
          localStorage.setItem('currentPatientEmail', email);
          localStorage.setItem('isPatientLoggedIn', 'true');
          setCurrentPatientEmail(email);
          setIsPatientLoggedIn(true);
        } else if (role === 'doctor' || role === 'secretary' || role === 'staff' || role === 'admin') {
          // Explicitly clear ONLY if identified as a different role to prevent mixed sessions
          console.log("👨‍⚕️ Authenticated as Staff/Doctor. Clearing patient session...");
          localStorage.removeItem('currentPatientEmail');
          localStorage.removeItem('isPatientLoggedIn');
          setCurrentPatientEmail(null);
          setIsPatientLoggedIn(false);
          clearActivePatient();
        } else {
            // Unknown role but has session - maybe metadata is still loading
            // We'll trust localStorage if it's already there to prevent "session flickering"
            console.log("❓ Unknown role in metadata. Maintaining existing state if any.");
            const savedEmail = localStorage.getItem('currentPatientEmail');
            if (savedEmail && !currentPatientEmail) {
                setCurrentPatientEmail(savedEmail);
                setIsPatientLoggedIn(true);
            }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("👋 Signed out. Clearing all session data.");
        localStorage.removeItem('currentPatientEmail');
        localStorage.removeItem('currentPatientName');
        localStorage.removeItem('isPatientLoggedIn');
        localStorage.removeItem('userRole');
        setCurrentPatientEmail(null);
        setIsPatientLoggedIn(false);
        clearActivePatient();
      }
    });

    syncAuth();
    return () => subscription.unsubscribe();
  }, []);

  // Sync state when localStorage changes (for cross-tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentPatientEmail') setCurrentPatientEmail(e.newValue);
      if (e.key === 'isPatientLoggedIn') setIsPatientLoggedIn(e.newValue === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('patientNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Helper to transform DB data to App format
  const transformPatientData = (dbPatient) => ({
    // ✅ CRITICAL: Use dbId as the primary identifier
    id: dbPatient.id,
    queueNo: dbPatient.queue_no,
    displayQueueNo: formatQueueNumber(
      dbPatient.queue_no, 
      dbPatient.patient_type === 'appointment' ? 'Appointment' : 'Walk-in',
      dbPatient.appointment_status,
      dbPatient.appointment_datetime || dbPatient.registered_at
    ),
    name: dbPatient.name,
    age: dbPatient.age,
    phoneNum: dbPatient.phone_num ? (dbPatient.phone_num.startsWith('09') ? `+63${dbPatient.phone_num.slice(1)}` : dbPatient.phone_num.startsWith('9') && dbPatient.phone_num.length === 10 ? `+63${dbPatient.phone_num}` : dbPatient.phone_num) : "",
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
    assignedDoctor: dbPatient.assigned_doctor_name
      ? (() => {
        const assignedName = dbPatient.assigned_doctor_name;
        const normalizedAssigned = normalizeDoctorNameForMatch(assignedName);
        const matchedDoctor = doctors.find(d => normalizeDoctorNameForMatch(d.name) === normalizedAssigned);
        return matchedDoctor || { name: assignedName };
      })()
      : null,
    preferredDoctor: dbPatient.physician
      ? (() => {
        const physicianName = dbPatient.physician;
        const normalizedPhysician = normalizeDoctorNameForMatch(physicianName);
        const matchedDoctor = doctors.find(d => normalizeDoctorNameForMatch(d.name) === normalizedPhysician);
        return matchedDoctor || { name: physicianName };
      })()
      : null,
    bookingMode: dbPatient.physician ? 'doctor' : 'service',
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
    daysSinceOnset: dbPatient.days_since_onset || null,
    // Extract notes from joined appointments table if present
    notes: dbPatient.notes || (dbPatient.appointments?.[0]?.notes) || null,
    updatedAt: dbPatient.updated_at
  });

  // Helper to resolve display queue numbers with latest context
  const resolveQueueDisplays = (rawPatients) => {
    return rawPatients.map(p => ({
      ...p,
      displayQueueNo: formatQueueNumber(
        p.queueNo, 
        p.type, 
        p.appointmentStatus,
        p.appointmentDateTime || p.registeredAt
      )
    }));
  };

  // ==========================================
  // NEW: Sort logic for Hybrid Sequence (Interleaving)
  // Sorts by Appointment Time OR Registration Time
  // ==========================================
  const sortPatientsHybrid = (a, b) => {
    const timeA = new Date(a.appointmentDateTime || a.registeredAt).getTime();
    const timeB = new Date(b.appointmentDateTime || b.registeredAt).getTime();
    
    // Primary Sort: Effective Time (Hybrid Clock)
    if (timeA !== timeB) return timeA - timeB;
    
    // Tie-breaker: ID/Registration Order
    return (a.queueNo || 0) - (b.queueNo || 0);
  };
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

        // ✅ Sync Active Patient: Restore from localStorage, but NEVER restore a cancelled session
        const persistedId = localStorage.getItem('activePatientId');
        if (persistedId) {
          const foundPatient = transformedPatients.find(p => String(p.id) === String(persistedId));
          if (foundPatient) {
            // 🚫 GUARD: Never restore a cancelled patient — this prevents ghost sessions
            // where an old cancelled patient overwrites a freshly submitted new appointment.
            if (foundPatient.status === 'cancelled') {
              console.log('🚫 [loadDB] Persisted patient is cancelled. Clearing ghost session.');
              localStorage.removeItem('activePatientId');
              // If the current active state IS this cancelled one, clear it immediately
              if (activePatient?.id === foundPatient.id) {
                setActivePatient(null);
              }
            } else {
              console.log('⚡ [loadDB] Restoring active patient from storage:', foundPatient.name);
              setActivePatient(foundPatient);
            }
          } else {
            // Persisted ID not found in DB — stale reference, clear it
            console.log('🚫 [loadDB] Persisted patient ID not found in DB. Clearing stale reference.');
            localStorage.removeItem('activePatientId');
          }
        }

        // ✅ NEW: Restore clinic-wide wait time adjustment from system record
        const settingsRecord = transformedPatients.find(p => p.patientEmail === 'clinic_settings@abante.com');
        if (settingsRecord) {
          settingsIdRef.current = settingsRecord.id; // Cache the ID
          const cloudAdjustment = parseInt(settingsRecord.age) || 0;
          console.log("🕒 Sync-restoring global wait time adjustment:", cloudAdjustment);
          setManualWaitTimeAdjustment(cloudAdjustment);
        }

        // ✅ AUTO-REMINDER SYSTEM (Only run if user is a clinic staff)
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin' || userRole === 'staff' || userRole === 'secretary') {
          transformedPatients.forEach(p => {
             // Only target future accepted appointments that haven't received a reminder
             // and aren't already completed/cancelled
             if (p.type === 'Appointment' && p.appointmentStatus === 'accepted' && 
                 p.status !== 'cancelled' && p.status !== 'done' &&
                 p.appointmentDateTime && p.rejectionReason !== 'REMINDER_SENT') {
                 
                 const appointmentDate = new Date(p.appointmentDateTime);
                 const tomorrow = new Date();
                 tomorrow.setDate(tomorrow.getDate() + 1);
                 
                 // Check if the appointment is EXACTLY tomorrow (matching year, month, day)
                 if (
                   appointmentDate.getDate() === tomorrow.getDate() &&
                   appointmentDate.getMonth() === tomorrow.getMonth() &&
                   appointmentDate.getFullYear() === tomorrow.getFullYear()
                 ) {
                    console.log(`⏰ [CRON] Sending 24h reminder to ${p.name}`);
                    // 1. Optimistically mark as sent to avoid duplicates
                    p.rejectionReason = 'REMINDER_SENT';
                    
                    // 2. Persist the marked status to the database right away
                    syncPatientToDatabase(p).then(() => {
                        // 3. Dispatch the actual email
                        sendReminderEmail(p, {
                           dateTime: p.appointmentDateTime,
                           doctor: p.assignedDoctor?.name,
                           queueNo: p.queueNo
                        });
                    }).catch(err => {
                        console.error('⚠️ Failed to sync reminder status:', err);
                    });
                 }
             }
          });
        }

        // Filter out the system settings record from the public list
        const publicPatients = transformedPatients.filter(p => p.patientEmail !== 'clinic_settings@abante.com');

        // Set the patients state with the updated (and possibly healed) list
        setPatients(() => {
          const uniqueMap = new Map();
          publicPatients.forEach(p => uniqueMap.set(p.id, p));
          return Array.from(uniqueMap.values()).sort(sortPatientsHybrid);
        });
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
  }, [isPatientLoggedIn]); // Re-fetch data if login status changes (critical for RLS sync)

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
        // 🚫 GUARD: If the fresh data shows the record was cancelled, and we have another active record
        // for the same name/account in the list, auto-switch to the active one.
        if (freshData.status === 'cancelled') {
           const alternative = patients.find(p => 
             p.id !== freshData.id && 
             p.name === freshData.name && 
             p.status !== 'cancelled' && 
             p.status !== 'done'
           );
           if (alternative) {
             console.log("🔄 Ghost Detection! Switching from cancelled record to active record for same user.");
             setActivePatient(alternative);
             localStorage.setItem('activePatientId', alternative.id);
             return;
           }
        }

        // Normal identity sync
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
              const oldPatient = patientsRef.current.find(p => p.id === newData.id);
              const oldStatus = oldPatient?.appointmentStatus || 'pending';
              const newStatus = newData.appointment_status;
              const oldServices = oldPatient?.services || [];
              const newServices = newData.services || [];

              // 1. Check if appointment status changed from pending to accepted/rejected
              if (oldStatus === 'pending' && (newStatus === 'accepted' || newStatus === 'rejected')) {
                const message = newStatus === 'accepted'
                  ? `Your appointment for ${new Date(newData.appointment_datetime).toLocaleDateString()} has been ACCEPTED.`
                  : `Your appointment for ${new Date(newData.appointment_datetime).toLocaleDateString()} has been DECLINED.`;

                setNotifications(prev => [{
                  id: Date.now(),
                  message,
                  type: newStatus,
                  timestamp: new Date().toISOString(),
                  read: false
                }, ...prev]);

                setModalNotification({
                  type: newStatus === 'accepted' ? 'success' : 'error',
                  title: newStatus === 'accepted' ? 'Appointment Accepted!' : 'Appointment Declined',
                  description: message,
                  data: {
                    patientName: newData.name,
                    dateTime: new Date(newData.appointment_datetime).toLocaleString(),
                    reason: newStatus === 'rejected' ? newData.rejection_reason : null
                  }
                });
              }

              // 2. Check for new follow-up from doctor
              if (!oldServices.includes('follow-up-doctor') && newServices.includes('follow-up-doctor')) {
                const rawReason = newData.notes || '';
                const followUpReason = rawReason.includes('Follow-up reason:')
                  ? rawReason.replace('Follow-up reason:', '').trim()
                  : rawReason.trim() || null;
                const doctorName = newData.assigned_doctor_name || 'Your Doctor';
                const message = followUpReason
                  ? `${doctorName} has requested a follow-up consultation. Reason: ${followUpReason}`
                  : `${doctorName} has requested a follow-up consultation for you.`;
                
                setNotifications(prev => [{
                  id: Date.now(),
                  message,
                  type: 'follow-up',
                  timestamp: new Date().toISOString(),
                  read: false
                }, ...prev]);

                setModalNotification({
                  type: 'appointment',
                  title: 'Follow-up Requested',
                  description: `${doctorName} has requested a follow-up consultation for you.`,
                  data: {
                    patientName: newData.name,
                    dateTime: new Date(newData.appointment_datetime || newData.created_at).toLocaleString(),
                    doctor: doctorName,
                    followUpReason: followUpReason || null
                  }
                });
              }
            }

            // Notification logic for SECRETARY (on cancellation or follow-up)
            const userRole = localStorage.getItem('userRole');
            if (userRole === 'secretary' || userRole === 'staff' || userRole === 'admin') {
              const oldPatient = patientsRef.current.find(p => p.id === newData.id);
              const oldStatus = oldPatient?.appointmentStatus;
              const newStatus = newData.appointment_status;
              const oldServices = oldPatient?.services || [];
              const newServices = newData.services || [];

              // Cancellation
              if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
                setModalNotification({
                  type: 'cancel',
                  title: 'Appointment Cancelled',
                  description: `Patient ${newData.name} has cancelled their appointment.`,
                  data: {
                    patientName: newData.name,
                    dateTime: new Date(newData.appointment_datetime || newData.created_at).toLocaleString(),
                  }
                });
              }

              // New Follow-up from Doctor
              if (!oldServices.includes('follow-up-doctor') && newServices.includes('follow-up-doctor')) {
                setModalNotification({
                  type: 'appointment',
                  title: 'New Doctor Follow-up',
                  description: `${newData.assigned_doctor_name} has scheduled a follow-up for ${newData.name}.`,
                  data: {
                    patientName: newData.name,
                    dateTime: new Date(newData.appointment_datetime || newData.created_at).toLocaleString(),
                    doctor: newData.assigned_doctor_name
                  }
                });
              }
            }
          }

          // NEW: Notification logic for SECRETARY (on new submission)
          if (payload.eventType === 'INSERT') {
            const newData = payload.new;
            const userRole = localStorage.getItem('userRole');
            const currentUserEmail = localStorage.getItem('currentPatientEmail')?.toLowerCase();

            // 1. Notification logic for PATIENT (on new follow-up from doctor)
            if (currentUserEmail && newData.patient_email?.toLowerCase() === currentUserEmail) {
              const isFollowUp = newData.services?.includes('follow-up-doctor');
              if (isFollowUp) {
                const rawReason = newData.notes || '';
                const followUpReason = rawReason.includes('Follow-up reason:')
                  ? rawReason.replace('Follow-up reason:', '').trim()
                  : rawReason.trim() || null;
                const doctorName = newData.assigned_doctor_name || 'Your Doctor';
                const message = followUpReason
                  ? `${doctorName} has requested a follow-up consultation. Reason: ${followUpReason}`
                  : `${doctorName} has requested a follow-up consultation for you.`;
                
                setNotifications(prev => [{
                  id: Date.now(),
                  message,
                  type: 'follow-up',
                  timestamp: new Date().toISOString(),
                  read: false
                }, ...prev]);

                setModalNotification({
                  type: 'appointment',
                  title: 'Follow-up Requested',
                  description: `${doctorName} has requested a follow-up consultation for you.`,
                  data: {
                    patientName: newData.name,
                    dateTime: new Date(newData.appointment_datetime || newData.created_at).toLocaleString(),
                    doctor: doctorName,
                    followUpReason: followUpReason || null
                  }
                });
              }
            }
            
            // 2. Notification logic for SECRETARY (on new submission)
            if ((userRole === 'secretary' || userRole === 'staff' || userRole === 'admin') && newData.patient_type === 'appointment') {
              const isDoctorFollowUp = newData.services?.includes('follow-up-doctor');
              
              setModalNotification({
                type: 'appointment',
                title: isDoctorFollowUp ? 'New Doctor Follow-up' : 'New Appointment Request',
                description: isDoctorFollowUp 
                  ? `${newData.assigned_doctor_name || 'The doctor'} has scheduled a follow-up for ${newData.name}.`
                  : `A new appointment request has been submitted by ${newData.name}.`,
                data: {
                  patientName: newData.name,
                  dateTime: new Date(newData.appointment_datetime || newData.created_at).toLocaleString(),
                  doctor: isDoctorFollowUp ? newData.assigned_doctor_name : null
                }
              });
            }
          }


          // SURGICAL UPDATE: If it's the settings record, update adjustment immediately
          if (payload.new && payload.new.patient_email === 'clinic_settings@abante.com') {
            const newAdj = parseInt(payload.new.age) || 0;
            console.log("🕒 Realtime sync: Updating global wait time adjustment:", newAdj);
            setManualWaitTimeAdjustment(newAdj);
            return; // Skip full re-fetch for settings updates
          }

          // OPTIMIZED: Update local state directly for other updates
          if (payload.eventType === 'UPDATE' && payload.new) {
            const transformed = transformPatientData(payload.new);
            setPatients(prev => {
              const index = prev.findIndex(p => p.id === transformed.id);
              if (index === -1) return prev;
              const next = [...prev];
              next[index] = transformed;
              return next;
            });
          } else {
            // Full refresh for INSERT/DELETE or complex changes
            loadPatientsFromDatabase();
          }
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

  // Persist activePatient to localStorage — but never store a cancelled session
  useEffect(() => {
    if (activePatient?.id) {
      if (activePatient.status === 'cancelled') {
        // A cancelled patient should NEVER be persisted — clear it so a fresh
        // submission on the same device won't have a ghost session restored.
        localStorage.removeItem('activePatientId');
      } else {
        localStorage.setItem('activePatientId', activePatient.id);
      }
    }
  }, [activePatient]);

  // ✅ STABILIZED: Restore activePatient from localStorage on load
  useEffect(() => {
    // Only attempt restoration if we don't have an active memory state and we have authoritative data
    if (!isLoadingFromDB && !activePatient && patients.length > 0) {
      const persistedId = localStorage.getItem('activePatientId');
      if (persistedId) {
        const foundPatient = patients.find(p => String(p.id) === String(persistedId));
        if (foundPatient) {
          // ✅ GUARD: Never restore a cancelled patient
          if (foundPatient.status === 'cancelled') {
            console.log("🚫 Persisted patient is cancelled. Clearing ghost session.");
            localStorage.removeItem('activePatientId');
            return;
          }

          // ACCOUNT VALIDATION:
          const currentEmail = localStorage.getItem('currentPatientEmail');
          const isLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

          if (isLoggedIn && currentEmail) {
            const normalizedFoundEmail = (foundPatient.patientEmail || '').toLowerCase().trim();
            const normalizedCurrentEmail = currentEmail.toLowerCase().trim();

            if (!normalizedFoundEmail || normalizedFoundEmail !== normalizedCurrentEmail) {
              console.log("🚫 Restored patient belongs to another account or is a guest. Clearing.");
              localStorage.removeItem('activePatientId');
              return;
            }
          }

          console.log("🔄 Restoring active patient from storage:", foundPatient.name);
          setActivePatient(foundPatient);
        } else {
           // ⚠️ WAIT: If not found in this specific fetch, do NOT delete from localStorage immediately.
           // This prevents "flickering" session loss if the DB is slightly behind a fresh submission.
           // We only delete if it's a known stale ID (decided in loadPatientsFromDatabase).
           console.log("⏳ Persisted patient ID not in current list — holding for sync...");
        }
      }
    }
  }, [isLoadingFromDB, patients, activePatient, currentPatientEmail, isPatientLoggedIn]);

  // NEW: Automatic session discovery for logged-in patients
  useEffect(() => {
    let currentEmail = localStorage.getItem('currentPatientEmail');
    let isLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

    // Fallback: If localStorage keys are missing but Supabase session exists, restore them
    if (!currentEmail && !isLoadingFromDB) {
      const restoreSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.user_metadata?.role === 'patient') {
          const email = session.user.email.toLowerCase().trim();
          console.log("🔐 Restoring missing localStorage from Supabase session:", email);
          localStorage.setItem('currentPatientEmail', email);
          localStorage.setItem('isPatientLoggedIn', 'true');
          // Re-trigger the logic with restored email
        }
      };
      restoreSession();
    }

    if (!isLoadingFromDB && isLoggedIn && currentEmail && patients.length > 0) {
      const normalizedCurrentEmail = currentEmail.toLowerCase().trim();

      // OPTION 1: Validate existing session
      if (activePatient) {
        const normalizedActiveEmail = (activePatient.patientEmail || '').toLowerCase().trim();
        if (normalizedActiveEmail !== normalizedCurrentEmail) {
          console.log("⚠️ Active patient is guest or belongs to another account. Clearing session.");
          clearActivePatient();
          return;
        }
      }

      // OPTION 2: Auto-discover session if none active
      if (!activePatient) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const myActiveAppointment = patients.find(p => {
          if (!p.patientEmail || p.patientEmail.toLowerCase().trim() !== normalizedCurrentEmail) return false;
          if (p.isInactive) return false;

          if (p.status === 'done' || p.status === 'completed' || p.status === 'cancelled') return false;

          const isActiveState = (p.appointmentStatus === 'pending' || p.appointmentStatus === 'accepted' || p.inQueue);
          if (!isActiveState) return false;

          let pDate;
          if (p.type === 'Appointment' && p.appointmentDateTime) {
            pDate = new Date(p.appointmentDateTime);
          } else if (p.registeredAt) {
            pDate = new Date(p.registeredAt);
          } else {
            return false;
          }

          pDate.setHours(0, 0, 0, 0);

          if (p.type === 'Appointment') {
            return pDate >= today; // Appointments can be today or future
          } else {
            return pDate.getTime() === today.getTime(); // Walk-ins strictly today
          }
        });

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

    return patients.filter(p => {
      if (p.type !== 'Appointment' || p.status === 'done') return false;
      
      const isNewSubmission = !p.appointmentStatus || p.appointmentStatus === 'pending';
      const isCancellation = p.appointmentStatus === 'cancelled';
      const isDoctorFollowUp = p.services?.includes('follow-up-doctor');
      
      const notificationTime = new Date(p.updatedAt || p.registeredAt || p.created_at);
      const lastCheck = new Date(lastSecretaryNotificationCheck);
      
      return (isNewSubmission || isCancellation || isDoctorFollowUp) && notificationTime > lastCheck;
    }).length;
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
    const servingMap = {};
    patients.forEach(patient => {
      // Robust check: same filters as initialization
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
        // Only count as current serving if patient is from today
        if (isForToday(patient)) {
          servingMap[patient.assignedDoctor.id] = patient.queueNo;
        }
      }
    });
    setDoctorCurrentServing(servingMap);

    // ✅ NEW: Synchronize global currentServing reactive to patients list
    // This allows the General Queue card to update automatically via Real-time
    const inProgressToday = patients.filter(p => 
      p.status === "in progress" && 
      !p.isInactive && 
      isForToday(p)
    );

    if (inProgressToday.length > 0) {
      // Sort by calledAt (descending) to get the MOST RECENTLY called patient as the main serving focus
      const latestCalled = [...inProgressToday].sort((a, b) => {
        const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
        const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
        return timeB - timeA;
      })[0];

      if (latestCalled && latestCalled.queueNo !== currentServing) {
        setCurrentServing(latestCalled.queueNo);
      }
    } else if (currentServing !== null) {
      setCurrentServing(null);
    }
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

  // ✅ AUTO-ASSIGNMENT DEBOUNCED:
  // This prevents all patients from being dumped into the first doctor started 
  // when the secretary is starting multiple doctors (as requested by user).
  useEffect(() => {
    // 🧹 Cleanup previous timer
    if (autoAssignTimeoutRef.current) {
        clearTimeout(autoAssignTimeoutRef.current);
    }

    // Early exit if no active doctors
    if (activeDoctors.length === 0) return;

    const unassignedPatients = patients.filter(p =>
      !p.assignedDoctor &&
      !p.isInactive &&
      !p.tempId && // ✅ FIX: Ignore optimistic updates (requeued patients being created)
      p.status !== 'done' &&
      p.status !== 'cancelled' &&
      (p.type !== 'Appointment' || p.appointmentStatus === 'accepted') &&
      isForToday(p) // ✅ NEW: Only auto-assign today's unassigned patients (blank services/deferred)
    );

    if (unassignedPatients.length === 0) return;

    // ⏳ Set new timer (5 seconds) to allow the secretary to finish starting doctors
    autoAssignTimeoutRef.current = setTimeout(() => {
        console.log("🚀 Starting debounced auto-assignment...");
        
        const patientsToUpdate = [];

        unassignedPatients.forEach(patient => {
          // Skip if pending/rejected
          if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') return;

          let doctor = null;

          // Preferred doctor check — ONLY assign if that doctor's queue is currently active
          if (patient.preferredDoctor) {
            // Robust lookup by ID or Name
            const matchedDoctor = doctors.find(d =>
              (patient.preferredDoctor.id && d.id === Number(patient.preferredDoctor.id)) ||
              (d.name.toLowerCase().trim() === (patient.preferredDoctor.name || "").toLowerCase().trim())
            );

            if (matchedDoctor) {
              if (activeDoctors.includes(matchedDoctor.id)) {
                doctor = matchedDoctor;
              } else {
                // Preferred doctor's queue not started yet — skip assignment for now.
                console.log(`⏳ Preferred doctor ${matchedDoctor.name} queue not active yet — deferring assignment for patient ${patient.name}`);
                return;
              }
            }
          }

          // Auto-assignment (only if no preferred doctor was chosen)
          if (!doctor) {
            // ✅ IMPROVED: Provide a virtual copy that includes patients already assigned in this loop.
            // This ensures true distribution (A, B, C, A, B...) instead of everyone going to one doctor
            // because the state hasn't updated yet.
            const virtualPatients = [...patients, ...patientsToUpdate.map(item => ({
                ...item.patient,
                assignedDoctor: item.doctor
            }))];
            doctor = assignDoctor(patient, virtualPatients, activeDoctors);
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
    }, 5000); // 5 second window for starting multiple doctors

    return () => {
      if (autoAssignTimeoutRef.current) clearTimeout(autoAssignTimeoutRef.current);
    };
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
    // If the input is raw from Supabase (has snake_case keys), transform it first
    const patientToAdd = (inputPatient.patient_type || inputPatient.queue_no) 
      ? transformPatientData(inputPatient) 
      : inputPatient;

    setPatients(prev => {
      // Check if patient already exists to prevent duplicates
      if (patientToAdd.id && prev.some(p => p.id === patientToAdd.id)) return prev;
      return [...prev, patientToAdd].sort(sortPatientsHybrid);
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
      // 1. Get the patient first
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      // ✅ DETERMINISTIC ASSIGNMENT:
      // If it's a future appointment, we assign a "Sentinel" number (900,000+) 
      // so it shows as "#A--" in the UI.
      const isFuture = !isToday(patient.appointmentDateTime);
      let assignedNo = patient.queueNo;

      if (isFuture) {
        if (!assignedNo || assignedNo < 900000) {
          assignedNo = 900000 + Math.floor(Math.random() * 99999);
        }
      } else {
        // If it's for today, assign a live number (A01, A02...)
        const maxResult = await getMaxQueueNumber('appointment');
        const dbMax = maxResult.maxQueueNo || 10000;
        const localMax = Math.max(10000, ...patients
          .filter(p => (p.type === 'Appointment') && isForToday(p))
          .map(p => p.queueNo || 0));
        assignedNo = Math.max(dbMax, localMax) + 1;
      }

      // 2. Determine Doctor Assignment
      let assignedDoctor = patient.assignedDoctor;
      
      // Auto-assign if not assigned and it's for today
      if (!assignedDoctor && isForToday(patient)) {
        assignedDoctor = assignDoctor(patient, patients, activeDoctors);
      }

      // 3. Prepare updates
      const updates = {
        queue_no: assignedNo,
        appointment_status: "accepted",
        in_queue: isForToday(patient),
        status: "waiting",
        assigned_doctor_name: assignedDoctor?.name || null,
      };

      // 4. Sync to database
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
          queueNo: assignedNo,
          appointmentStatus: "accepted",
          inQueue: true,
          assignedDoctor: assignedDoctor
        };
      }));

      // 6. Send Email Notification
      const doctorName = assignedDoctor ? assignedDoctor.name : (patient.assignedDoctor?.name || 'Assigned Physician');
      sendAppointmentEmail(patient, 'accepted', {
        queueNo: assignedNo,
        doctor: doctorName,
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
          reason: reason,
          doctor: patientData.assignedDoctor?.name || 'Assigned Physician',
          dateTime: patientData.appointmentDateTime || patientData.appointment_datetime
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

      // 3. Send Email Notification
      const patientData = patients.find(p => p.id === patientId);
      if (patientData) {
        sendAppointmentEmail(patientData, 'cancelled', {
          reason: 'Cancelled by patient',
          doctor: patientData.assignedDoctor?.name || 'Assigned Physician',
          dateTime: patientData.appointmentDateTime || patientData.appointment_datetime
        });
      }

    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    }
  };

  const requeuePatient = async (queueNo, extraUpdates = {}) => {
    try {
      const cancelledPatient = patients.find(p => p.queueNo === queueNo);
      if (!cancelledPatient) return null;

      console.log(`🔄 Requeueing patient #${queueNo}...`);

      // 1. Get AUTHORITATIVE max queue number from DB first (passing type for range)
      const maxResult = await getMaxQueueNumber(cancelledPatient.type);
      const dbMax = maxResult.maxQueueNo;

      // 2. Cross-check with local state (PatientContext patients is global enough for the current session)
      // This solves the issue where a Doctor might not see other doctors' patients in the DB query (RLS)
      // but the Context state (if loaded by Secretary or merged) has more info.
      const localMax = Math.max(0, ...patients
        .filter(p => p.type === cancelledPatient.type && isToday(p.registeredAt))
        .map(p => p.queueNo || 0));

      const nextQueueNo = Math.max(dbMax, localMax) + 1;

      console.log(`✅ Assigned new queue number: ${nextQueueNo} (DB Max: ${dbMax}, Local Max: ${localMax})`);

      // 3. Prepare update for the EXISTING patient
      const updatedPatient = {
        ...cancelledPatient,
        ...extraUpdates,
        queueNo: nextQueueNo,
        displayQueueNo: formatQueueNumber(nextQueueNo, cancelledPatient.type, cancelledPatient.appointmentStatus, cancelledPatient.appointmentDateTime),
        originalQueueNo: cancelledPatient.queueNo, // Persist the old number for UI/History
        status: "waiting",
        registeredAt: new Date().toISOString(),
        inQueue: true,
        calledAt: null, // Reset timing
        queueExitTime: null,
        completedAt: null,
        cancelledAt: null,
        isInactive: false, // Ensure it's active
        requeued: true,
      };

      // 3. Update Local State
      setPatients(prev => prev.map(p => p.id === cancelledPatient.id ? updatedPatient : p)
        .sort(sortPatientsHybrid));

      // 4. Sync to database (Updates existing ID because id is preserved in updatedPatient)
      const syncResult = await syncPatientToDatabase(updatedPatient);

      if (syncResult.success) {
        return updatedPatient;
      } else {
        console.error("❌ Failed to sync requeued patient:", syncResult.error);
        return updatedPatient;
      }

    } catch (error) {
      console.error("Requeue error:", error);
      return null;
    }
  };


  const finalizeTomorrowQueue = async (targetDate) => {
    if (finalizingRef.current) {
        console.log("⏳ Queue finalization already in progress. Skipping redundant call.");
        return { success: true, count: 0 };
    }

    try {
      finalizingRef.current = true;
      // 1. Determine the target date (default tomorrow)
      const dateToProcess = targetDate || new Date(new Date().setDate(new Date().getDate() + 1));
      dateToProcess.setHours(0, 0, 0, 0);
      const dateString = dateToProcess.toDateString();

      console.log(`📅 Finalizing queue for: ${dateString}`);

      // 2. Filter local patient state for "Accepted" appointments on that date
      // ✅ CRITICAL FIX: Only finalize those with NO number or a true SENTINEL ID (900k-999k).
      // Branded integers for active days (e.g. 16M+) should be ignored.
      const candidates = patients.filter(p =>
        p.type === 'Appointment' &&
        p.appointmentStatus === 'accepted' &&
        p.appointmentDateTime &&
        new Date(p.appointmentDateTime).toDateString() === dateString &&
        (p.status !== 'done' && p.status !== 'cancelled') &&
        (!p.queueNo || (p.queueNo >= 900000 && p.queueNo < 1000000))
      ).sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));

      if (candidates.length === 0) {
        return { success: true, count: 0 };
      }

      console.log(`🚀 Found ${candidates.length} candidates for finalization.`);

      // 3. Get AUTHORITATIVE starting number from DB for that specific day
      const maxResult = await getMaxQueueNumber('appointment', dateToProcess);
      let nextNum = (maxResult.maxQueueNo || 10000) + 1;

      console.log(`🚀 Starting batch assignment from #${nextNum}`);

      const updatedPatients = [];
      
      // ✅ SEQUENTIAL SYNC: Processing sequentially is safer for database state
      // than parallel map to avoid race conditions.
      for (const patient of candidates) {
          const assignedNo = nextNum++;
          const displayNo = formatQueueNumber(assignedNo, 'appointment', 'accepted', dateToProcess);

          const updated = {
            ...patient,
            queueNo: assignedNo,
            displayQueueNo: displayNo,
            status: 'waiting',
            inQueue: true
          };

          // Sync to DB
          await syncPatientToDatabase(updated);

          // Send Email
          if (patient.patientEmail) {
            await sendAppointmentEmail(patient, 'queue-assigned', {
              dateTime: patient.appointmentDateTime,
              doctor: patient.assignedDoctor?.name || 'Assigned Physician',
              queueNo: assignedNo // Pass the raw integer to avoid #ANaN
            });
          }
          
          updatedPatients.push(updated);
      }

      // 4. Update Local State (Single Batch Update)
      setPatients(prev => {
        const patientMap = new Map(prev.map(p => [p.id, p]));
        updatedPatients.forEach(upd => patientMap.set(upd.id, upd));
        return Array.from(patientMap.values()).sort(sortPatientsHybrid);
      });

      return { success: true, count: updatedPatients.length };

    } catch (error) {
      console.error("❌ Finalize Queue Error:", error);
      return { success: false, error: error.message };
    } finally {
        finalizingRef.current = false;
    }
  };


  // 🛠️ EMERGENCY REPAIR: Cleanup corrupted high numbers for Today
  const repairTodaysQueue = async () => {
    if (finalizingRef.current) return;
    try {
      finalizingRef.current = true;
      const todayDate = new Date();
      const todayString = todayDate.toDateString();
      console.log(`🛠️ Repairing Queue for: ${todayString}`);

      // 1. Separate target groups (ACTIVE ONLY for today)
      const appts = patients.filter(p => 
        p.type === 'Appointment' && 
        p.appointmentStatus === 'accepted' && 
        (p.status === 'waiting' || p.status === 'in progress') &&
        p.appointmentDateTime && 
        new Date(p.appointmentDateTime).toDateString() === todayString
      ).sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));

      const walks = patients.filter(p => 
        p.type === 'Walk-in' && 
        (p.status === 'waiting' || p.status === 'in progress') &&
        new Date(p.registeredAt).toDateString() === todayString &&
        p.inQueue
      ).sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));

      // 2. Get Autoritative Base (Now using MANILA Time fix)
      const brandedBase = getBrandedBase(); // This should now be correct for Manila
      
      const updates = [];
      
      // Repair Appointments
      let apptSeq = 10001; 
      for (const p of appts) {
        const newNo = brandedBase + apptSeq++;
        const newDisplay = formatQueueNumber(newNo, 'Appointment', 'accepted', p.appointmentDateTime);
        updates.push({ ...p, queueNo: newNo, displayQueueNo: newDisplay });
      }

      // Repair Walk-ins
      let walkSeq = 1;
      for (const p of walks) {
        const newNo = brandedBase + walkSeq++;
        const newDisplay = formatQueueNumber(newNo, 'Walk-in', null, p.registeredAt);
        updates.push({ ...p, queueNo: newNo, displayQueueNo: newDisplay });
      }

      console.log(`🚀 Syncing ${updates.length} repaired records to DB...`);

      // 3. Sequential Sync
      for (const upd of updates) {
        await syncPatientToDatabase(upd);
      }

      // 4. Update Local State
      setPatients(prev => {
        const patientMap = new Map(prev.map(p => [p.id, p]));
        updates.forEach(upd => patientMap.set(upd.id, upd));
        return Array.from(patientMap.values()).sort(sortPatientsHybrid);
      });

      console.log("✅ Queue Repair Complete! Today's sequence has been clean-reset.");
      return { success: true, count: updates.length };
    } catch (e) {
      console.error("❌ Repair Error:", e);
      return { success: false, error: e.message };
    } finally {
      finalizingRef.current = false;
    }
  };


  const callNextPatient = () => {
    // 1. Mark current patient as done
    if (currentServing) {
      updatePatientStatus(currentServing, 'done');
    }

    // 2. Find next patient
    // Interleaving Strategy: Find all patients waiting TODAY and pick the one with earliest registeredAt
    const eligiblePatients = patients.filter(p =>
      p.status === "waiting" &&
      p.inQueue &&
      !p.isInactive &&
      isForToday(p)
    ).sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));

    const nextPatient = eligiblePatients[0];

    if (nextPatient) {
      console.log(`Debug: Calling Next Patient ${nextPatient.displayQueueNo} (Queue #${nextPatient.queueNo})`);
      updatePatientStatus(nextPatient.queueNo, 'in progress');
      setCurrentServing(nextPatient.queueNo);
    } else {
      console.log("Debug: No valid next patient found.");
      setCurrentServing(null);
    }
  };

  // ✅ NEW: Persist clinic-wide wait time adjustment
  const syncClinicSettings = async (adjustment) => {
    try {
      const settingsData = {
        name: 'System Settings',
        patient_email: 'clinic_settings@abante.com',
        phone_num: '00000000000', // Mandatory field placeholder
        age: adjustment, // Store adjustment here
        patient_type: 'walk-in',
        queue_no: 999999, // Mandatory field
        is_inactive: true, // Keep it hidden from most queries
        in_queue: false, // Ensure it doesn't show in counts
        status: 'waiting',
        assigned_doctor_name: 'System'
      };

      // Use cached ID if we have it, otherwise look it up once
      let targetId = settingsIdRef.current;

      if (!targetId) {
        const { data: existing } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_email', 'clinic_settings@abante.com')
          .maybeSingle();
        if (existing) {
          targetId = existing.id;
          settingsIdRef.current = targetId;
        }
      }

      if (targetId) {
        const { error } = await supabase.from('patients').update(settingsData).eq('id', targetId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('patients').insert([settingsData]).select();
        if (error) throw error;
        if (data?.[0]) settingsIdRef.current = data[0].id;
      }
      console.log("🕒 Clinic settings synced to cloud:", adjustment);
    } catch (err) {
      console.error('⚠️ Failed to sync clinic settings:', err);
    }
  };

  const addWaitTime = () => {
    setManualWaitTimeAdjustment(prev => {
      const newVal = prev + 5;
      syncClinicSettings(newVal);
      return newVal;
    });
  };

  const reduceWaitTime = () => {
    setManualWaitTimeAdjustment(prev => {
      const newVal = Math.max(-60, prev - 5); // Allow some reduction but cap it
      syncClinicSettings(newVal);
      return newVal;
    });
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

    // ✅ Strict helper: patient must also be past their appointment time
    const isReadyForQueue = (p) => {
      if (p.type === 'Appointment' && p.appointmentDateTime) {
        const appDate = new Date(p.appointmentDateTime);
        // Must be for today AND the appointment time must have passed
        return isToday(p.appointmentDateTime) && new Date() >= appDate;
      }
      return isToday(p.registeredAt);
    };

    // Find next priority patient (waiting, assigned to this doctor, READY)
    const nextPriorityPatient = patients
      .filter(p =>
        p.status === "waiting" &&
        p.inQueue &&
        p.isPriority &&
        p.assignedDoctor?.id === dId &&
        !p.isInactive &&
        isReadyForQueue(p)
      )
      .sort(sortPatientsHybrid)[0];

    if (nextPriorityPatient) {
      console.log(`Debug: Calling Priority Patient ${nextPriorityPatient.queueNo}`);
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      return;
    }

    // Find next normal patient (waiting, assigned to this doctor, READY)
    const nextWaitingPatient = patients
      .filter(p =>
        p.status === "waiting" &&
        p.inQueue &&
        !p.isPriority &&
        p.assignedDoctor?.id === dId &&
        !p.isInactive &&
        isReadyForQueue(p)
      )
      .sort(sortPatientsHybrid)[0];

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

    // ✅ Strict helper: patient must also be past their appointment time
    const isReadyForQueue = (p) => {
      if (p.type === 'Appointment' && p.appointmentDateTime) {
        return isToday(p.appointmentDateTime);
      }
      return isToday(p.registeredAt);
    };

    const nextPriorityPatient = patients
      .filter(p =>
        p.status === "waiting" &&
        p.inQueue &&
        p.isPriority &&
        p.assignedDoctor?.id === dId &&
        !p.isInactive &&
        isReadyForQueue(p)
      )
      .sort(sortPatientsHybrid)[0];

    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      return;
    }

    const nextWaitingPatient = patients
      .filter(p =>
        p.status === "waiting" &&
        p.inQueue &&
        !p.isPriority &&
        p.assignedDoctor?.id === dId &&
        !p.isInactive &&
        isReadyForQueue(p)
      )
      .sort(sortPatientsHybrid)[0];

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

  // ✅ GLOBAL MORNING AUTO-ASSIGNMENT (STABALIZED)
  // This runs as soon as ANY Staff Member (Secretary/Doctor) logs in,
  // assigning real queue numbers and sending emails for today's visits.
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const isStaff = role === 'secretary' || role === 'doctor';

    if (isStaff && patients?.length > 0 && !isLoadingFromDB) {
      const todayDate = new Date();
      const todayString = todayDate.toDateString();
      
      const unfinalizedToday = patients.filter(p => 
        (p.type === 'Appointment') && 
        p.appointmentStatus === 'accepted' && 
        p.appointmentDateTime && 
        new Date(p.appointmentDateTime).toDateString() === todayString &&
        (!p.queueNo || (p.queueNo >= 900000 && p.queueNo < 1000000))
      );

      if (unfinalizedToday.length > 0) {
        console.log(`🚀 [MORNING SYNC] Found ${unfinalizedToday.length} today's appointments needing official assignments.`);
        finalizeTomorrowQueue(todayDate);
      }

      // ✅ ONE-TIME REPAIR TRIGGER (v3)
      const lastRepaired = localStorage.getItem('queueRepaired_v3_Date');
      if (lastRepaired !== todayString) {
        console.log("🛠️ Detected first run of the day (v3). Initiating sequence cleanup...");
        repairTodaysQueue().then(res => {
          if (res?.success) localStorage.setItem('queueRepaired_v3_Date', todayString);
        });
      }
    }
  }, [isLoadingFromDB]); 

  // ✅ DYNAMIC QUEUE RE-RESOLVER
  // This ensures that exactly at 12 AM, "#A--" flips to real numbers.
  const resolvedPatients = useMemo(() => resolveQueueDisplays(patients), [patients]);

  const isDoctorActive = (doctorId) => {
    const dId = Number(doctorId);
    return activeDoctors.includes(dId);
  };

  // NEW: Show loading state while fetching from database
  // ✅ FIXED: Always provide all functions, even during loading
  return (
    <PatientContext.Provider value={{
      patients: resolvedPatients,
      setPatients,
      addPatient,
      currentServing: currentServing,
      setCurrentServing,
      activePatient: activePatient,
      setActivePatient,
      clearActivePatient,
      updatePatientStatus,
      callNextPatient,
      avgWaitTime,
      manualWaitTimeAdjustment,
      addWaitTime,
      reduceWaitTime,
      queueInfo: queueInfo,
      getAvailableSlots,
      cancelPatient,
      requeuePatient,
      acceptAppointment,
      rejectAppointment,
      cancelAppointment,
      getDoctorCurrentServing,
      setDoctorCurrentServingPatient,
      callNextPatientForDoctor,
      cancelPatientForDoctor,
      activeDoctors: activeDoctors,
      startDoctorQueue,
      stopDoctorQueue,
      isDoctorActive,
      isLoadingFromDB,
      notifications,
      clearNotifications,
      markNotificationsRead,
      unreadSecretaryNotificationsCount,
      markSecretaryNotificationsAsRead,
      lastDoctorNotificationCheck,
      markDoctorNotificationsAsRead,
      isPatientLoggedIn,
      currentPatientEmail,
      modalNotification,
      clearModalNotification,
      formatQueueNumber,
      finalizeTomorrowQueue
    }}>
      {children}
    </PatientContext.Provider>
  );
};