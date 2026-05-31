import React, { createContext, useState, useMemo, useEffect, useRef } from "react";
import { assignDoctor, doctors } from './doctorData';
import { syncPatientToDatabase, getAllPatientProfiles, getMaxQueueNumber } from './lib/patientService';
import { supabase, getBrandedBase } from './lib/supabaseClient';
import { sendAppointmentEmail, sendReminderEmail } from './lib/emailService';

export const PatientContext = createContext();

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
      const isPlaceholder = num >= 900000 && num < 1000000;

      if (num && !isPlaceholder) {
        const displayNum = num % 10000;
        return `#A${String(displayNum).padStart(3, '0')}`;
      }
      return `#A---`;
    }
    return `#A---`;
  }

  // Walk-ins: #W prefix
  const displayNum = num % 10000;
  return `#W${String(displayNum).padStart(3, '0')}`;
};

// Automatic dr name match even if DB has extra M.I 
const normalizeDoctorNameForMatch = (name) => {
  if (!name) return '';
  return name
    .replace(/\bdr\.?\b/gi, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(token => token.length > 1) // drop middle initials 
    .join(' ')
    .toLowerCase();
};

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('patientNotifications');
    return saved ? JSON.parse(saved) : [];
  });
  const patientsRef = useRef([]);
  const settingsIdRef = useRef(null);
  const finalizingRef = useRef(false);
  const autoAssignTimeoutRef = useRef(null);

  const [lastSecretaryNotificationCheck, setLastSecretaryNotificationCheck] = useState(() => {
    return localStorage.getItem('lastSecretaryNotificationCheck') || new Date().toISOString();
  });
  const [lastDoctorNotificationCheck, setLastDoctorNotificationCheck] = useState(() => {
    const saved = localStorage.getItem('lastDoctorNotificationCheck');
    return saved ? JSON.parse(saved) : {};
  });
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState(() => localStorage.getItem('isPatientLoggedIn') === 'true');
  const [currentPatientEmail, setCurrentPatientEmail] = useState(() => localStorage.getItem('currentPatientEmail'));

  const [modalNotification, setModalNotification] = useState(null);
  const clearModalNotification = () => setModalNotification(null);

  useEffect(() => {
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = session.user.user_metadata?.role;
        if (role === 'patient') {
          const email = session.user.email.toLowerCase().trim();
          // sync localStorage & React state to ensure UI reflects session
          localStorage.setItem('currentPatientEmail', email);
          localStorage.setItem('isPatientLoggedIn', 'true');
          setCurrentPatientEmail(email);
          setIsPatientLoggedIn(true);

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
          console.log("👨‍⚕️ Authenticated as Staff/Doctor. Clearing patient session...");
          localStorage.removeItem('currentPatientEmail');
          localStorage.removeItem('isPatientLoggedIn');
          setCurrentPatientEmail(null);
          setIsPatientLoggedIn(false);
          clearActivePatient();
        } else {
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

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentPatientEmail') setCurrentPatientEmail(e.newValue);
      if (e.key === 'isPatientLoggedIn') setIsPatientLoggedIn(e.newValue === 'true');
      if (e.key === 'abante_local_doctors') {
        const local = JSON.parse(e.newValue || "[]");
        const merged = doctors.map(d => {
          const localOverride = local.find(ld => ld.id === d.id);
          return localOverride || d;
        });
        const staticIds = doctors.map(d => d.id);
        const newLocal = local.filter(ld => !staticIds.includes(ld.id));
        setAllDoctors([...merged, ...newLocal]);
      }
    };
    
    const handleLocalDoctorsUpdate = () => {
      const local = JSON.parse(localStorage.getItem("abante_local_doctors") || "[]");
      const merged = doctors.map(d => {
        const localOverride = local.find(ld => ld.id === d.id);
        return localOverride || d;
      });
      const staticIds = doctors.map(d => d.id);
      const newLocal = local.filter(ld => !staticIds.includes(ld.id));
      setAllDoctors([...merged, ...newLocal]);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage-doctors-updated', handleLocalDoctorsUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage-doctors-updated', handleLocalDoctorsUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('patientNotifications', JSON.stringify(notifications));
  }, [notifications]);
  const transformPatientData = (dbPatient) => ({
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
        const matchedDoctor = allDoctors.find(d => normalizeDoctorNameForMatch(d.name) === normalizedAssigned);
        return matchedDoctor || { name: assignedName };
      })()
      : null,
    preferredDoctor: dbPatient.physician
      ? (() => {
        const physicianName = dbPatient.physician;
        const normalizedPhysician = normalizeDoctorNameForMatch(physicianName);
        const matchedDoctor = allDoctors.find(d => normalizeDoctorNameForMatch(d.name) === normalizedPhysician);
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
    dbId: dbPatient.id,
    patientEmail: dbPatient.patient_email,
    isPriority: dbPatient.is_priority || false,
    priorityType: dbPatient.priority_type || null,
    daysSinceOnset: dbPatient.days_since_onset || null,
    notes: dbPatient.notes || (dbPatient.appointments?.[0]?.notes) || null,
    updatedAt: dbPatient.updated_at
  });

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

  // logic for Hybrid Sequence 
  // Sorts by Appointment Time/Registration Time
  const sortPatientsHybrid = (a, b) => {
    const timeA = new Date(a.appointmentDateTime || a.registeredAt).getTime();
    const timeB = new Date(b.appointmentDateTime || b.registeredAt).getTime();

    if (timeA !== timeB) return timeA - timeB;

    return (a.queueNo || 0) - (b.queueNo || 0);
  };

  const loadPatientsFromDatabase = async () => {
    try {
      console.log('📥 Loading patients from database...');
      const result = await getAllPatientProfiles();

      if (result.success && result.data) {
        const transformedPatients = result.data.map(transformPatientData);

        const persistedId = localStorage.getItem('activePatientId');
        if (persistedId) {
          const foundPatient = transformedPatients.find(p => String(p.id) === String(persistedId));
          if (foundPatient) {
            if (foundPatient.status === 'cancelled') {
              console.log('🚫 [loadDB] Persisted patient is cancelled. Clearing ghost session.');
              localStorage.removeItem('activePatientId');
              if (activePatient?.id === foundPatient.id) {
                setActivePatient(null);
              }
            } else {
              console.log('⚡ [loadDB] Restoring active patient from storage:', foundPatient.name);
              setActivePatient(foundPatient);
            }
          } else {
            console.log('🚫 [loadDB] Persisted patient ID not found in DB. Clearing stale reference.');
            localStorage.removeItem('activePatientId');
          }
        }

        const settingsRecord = transformedPatients.find(p => p.patientEmail === 'clinic_settings@abante.com');
        if (settingsRecord) {
          settingsIdRef.current = settingsRecord.id; // Cache the ID
          const cloudAdjustment = parseInt(settingsRecord.age) || 0;
          console.log("🕒 Sync-restoring global wait time adjustment:", cloudAdjustment);
          setManualWaitTimeAdjustment(cloudAdjustment);
        }

        const publicPatients = transformedPatients.filter(p => p.patientEmail !== 'clinic_settings@abante.com');

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

  const loadDoctorsFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      if (data) {
        const dbDoctors = data.map(dbDoc => {
          let richData = {};
          if (dbDoc.specializations && typeof dbDoc.specializations === 'object' && !Array.isArray(dbDoc.specializations)) {
            richData = dbDoc.specializations;
          }
          
          return {
            id: dbDoc.id,
            name: dbDoc.name,
            consultationPrice: richData.consultationPrice !== undefined ? richData.consultationPrice : 1000,
            specialization: richData.specialization || (Array.isArray(richData.services) && richData.services.length > 0 ? richData.services[0] : "General Practice"),
            specializations: richData.services || (Array.isArray(dbDoc.specializations) ? dbDoc.specializations : []),
            doctorServices: richData.services || (Array.isArray(dbDoc.specializations) ? dbDoc.specializations : []),
            schedule: richData.schedule || "By Appointment Only",
            availability: richData.availability || [
              { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
            ],
            phone: richData.phone || "",
            email: richData.email || "",
            password: richData.password || "doctor123"
          };
        });

        setAllDoctors(prev => {
          const merged = [...prev];
          dbDoctors.forEach(dbDoc => {
            const idx = merged.findIndex(d => d.id === dbDoc.id || d.name.toLowerCase().trim() === dbDoc.name.toLowerCase().trim());
            if (idx !== -1) {
              merged[idx] = { ...merged[idx], ...dbDoc };
            } else {
              merged.push(dbDoc);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Error loading doctors from database:", err);
    }
  };

  useEffect(() => {
    localStorage.removeItem('activeDoctors');
    loadPatientsFromDatabase();
    loadDoctorsFromDatabase();
  }, [isPatientLoggedIn]);

  useEffect(() => {
    console.log("🔌 Setting up Supabase Doctors Realtime subscription...");
    const doctorsChannel = supabase
      .channel('public:doctors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        (payload) => {
          console.log('⚡ Doctors Realtime event received:', payload.eventType);
          loadDoctorsFromDatabase();
        }
      )
      .subscribe((status) => {
        console.log('📡 Doctors Subscription status:', status);
      });

    return () => {
      console.log("🔌 Cleaning up Supabase Doctors subscription...");
      supabase.removeChannel(doctorsChannel);
    };
  }, []);

  useEffect(() => {
    patientsRef.current = patients;
    if (activePatient && patients.length > 0) {
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

      const freshData = patients.find(p => p.id === activePatient.id);

      if (freshData) {
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

        if (JSON.stringify(activePatient) !== JSON.stringify(freshData)) {
          console.log("🔄 Syncing activePatient with fresh data from DB/Realtime");
          setActivePatient(freshData);
        }
      }
    }
  }, [patients, activePatient]);

  useEffect(() => {
    console.log("🔌 Setting up Supabase Realtime subscription...");

    const channel = supabase
      .channel('public:patients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          console.log('⚡ Realtime event received:', payload.eventType);

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

              // 1. Check if appointment changed from pending to accepted/rejected
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

              // Follow-up from Doctor
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

          // Notification logic for SECRETARY (on new submission)
          if (payload.eventType === 'INSERT') {
            const newData = payload.new;
            const userRole = localStorage.getItem('userRole');
            const currentUserEmail = localStorage.getItem('currentPatientEmail')?.toLowerCase();

            // 1. Notification logic for PATIENT (new follow-up from doctor)
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

            // 2. Notification logic for SECRETARY (new submission)
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

          if (payload.new && payload.new.patient_email === 'clinic_settings@abante.com') {
            const newAdj = parseInt(payload.new.age) || 0;
            console.log("🕒 Realtime sync: Updating global wait time adjustment:", newAdj);
            setManualWaitTimeAdjustment(newAdj);
            return;
          }

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
  }, []);

  useEffect(() => {
    if (activePatient?.id) {
      if (activePatient.status === 'cancelled') {

        localStorage.removeItem('activePatientId');
      } else {
        localStorage.setItem('activePatientId', activePatient.id);
      }
    }
  }, [activePatient]);

  useEffect(() => {
    if (!isLoadingFromDB && !activePatient && patients.length > 0) {
      const persistedId = localStorage.getItem('activePatientId');
      if (persistedId) {
        const foundPatient = patients.find(p => String(p.id) === String(persistedId));
        if (foundPatient) {
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
          console.log("⏳ Persisted patient ID not in current list — holding for sync...");
        }
      }
    }
  }, [isLoadingFromDB, patients, activePatient, currentPatientEmail, isPatientLoggedIn]);

  useEffect(() => {
    let currentEmail = localStorage.getItem('currentPatientEmail');
    let isLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';
    if (!currentEmail && !isLoadingFromDB) {
      const restoreSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session.user.user_metadata?.role === 'patient') {
          const email = session.user.email.toLowerCase().trim();
          console.log("🔐 Restoring missing localStorage from Supabase session:", email);
          localStorage.setItem('currentPatientEmail', email);
          localStorage.setItem('isPatientLoggedIn', 'true');
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
            return pDate >= today;
          } else {
            return pDate.getTime() === today.getTime();
          }
        });

        if (myActiveAppointment) {
          console.log('✅ Found account-linked active appointment, auto-activating:', myActiveAppointment.name);
          setActivePatient(myActiveAppointment);
        }
      }
    }
  }, [isLoadingFromDB, patients, activePatient]);

  useEffect(() => {
    if (!isLoadingFromDB) {
      localStorage.setItem('patients-sync', JSON.stringify(patients));
      console.log('📤 Broadcasting patients to other tabs:', patients.length);
    }
  }, [patients, isLoadingFromDB]);

  const [currentServing, setCurrentServing] = useState(null);
  const [manualWaitTimeAdjustment, setManualWaitTimeAdjustment] = useState(0);

  const avgWaitTime = useMemo(() => {
    if (isLoadingFromDB) return '...';

    const queueTimeData = [];
    patients.forEach(p => {
      if (p.registeredAt && p.calledAt) {
        const registeredTime = new Date(p.registeredAt);
        const calledTime = new Date(p.calledAt);
        const queueTimeMinutes = Math.round((calledTime - registeredTime) / 60000);
        if (queueTimeMinutes > 0 && queueTimeMinutes <= 240) {
          queueTimeData.push(queueTimeMinutes);
        }
      }
    });

    const calculatedAvg = queueTimeData.length > 0
      ? Math.round(queueTimeData.reduce((sum, time) => sum + time, 0) / queueTimeData.length)
      : 15;

    return Math.max(0, calculatedAvg + manualWaitTimeAdjustment);
  }, [patients, manualWaitTimeAdjustment, isLoadingFromDB]);

  const unreadSecretaryNotificationsCount = useMemo(() => {
    const userRole = localStorage.getItem('userRole');
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

  const [allDoctors, setAllDoctors] = useState(() => {
    const local = JSON.parse(localStorage.getItem("abante_local_doctors") || "[]");
    const merged = doctors.map(d => {
      const localOverride = local.find(ld => ld.id === d.id);
      return localOverride || d;
    });
    const staticIds = doctors.map(d => d.id);
    const newLocal = local.filter(ld => !staticIds.includes(ld.id));
    return [...merged, ...newLocal];
  });

  const updateDoctorProfile = (updatedDoctor) => {
    const local = JSON.parse(localStorage.getItem("abante_local_doctors") || "[]");
    const existingIndex = local.findIndex(ld => ld.id === updatedDoctor.id);
    let newLocal;
    if (existingIndex !== -1) {
      newLocal = [...local];
      newLocal[existingIndex] = updatedDoctor;
    } else {
      newLocal = [...local, updatedDoctor];
    }
    localStorage.setItem("abante_local_doctors", JSON.stringify(newLocal));

    const merged = doctors.map(d => {
      const localOverride = newLocal.find(ld => ld.id === d.id);
      return localOverride || d;
    });
    const staticIds = doctors.map(d => d.id);
    const newLocalOnly = newLocal.filter(ld => !staticIds.includes(ld.id));
    setAllDoctors([...merged, ...newLocalOnly]);

    window.dispatchEvent(new Event('storage-doctors-updated'));
  };

  const [activeDoctors, setActiveDoctors] = useState(() => {
    const saved = localStorage.getItem('active-doctors-sync');
    if (saved) {
      try {
        const { date, ids } = JSON.parse(saved);
        if (date === new Date().toDateString()) {
          return ids;
        }
      } catch (e) {
        console.error("Error parsing activeDoctors from localStorage", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('active-doctors-sync', JSON.stringify({
      date: new Date().toDateString(),
      ids: activeDoctors
    }));
  }, [activeDoctors]);

  const [doctorCurrentServing, setDoctorCurrentServing] = useState(() => {
    const initialServing = {};
    patients.forEach(patient => {
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
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
      const isAcceptedAppointment = patient.type === 'Appointment' && patient.appointmentStatus === 'accepted';
      const isWalkIn = patient.type !== 'Appointment';

      if (patient.status === 'in progress' && patient.assignedDoctor && !patient.isInactive && (isAcceptedAppointment || isWalkIn)) {
        if (isForToday(patient)) {
          servingMap[patient.assignedDoctor.id] = patient.queueNo;
        }
      }
    });
    setDoctorCurrentServing(servingMap);

    // allows General Queue card to update automatically via Real-time
    const inProgressToday = patients.filter(p =>
      p.status === "in progress" &&
      !p.isInactive &&
      isForToday(p)
    );

    if (inProgressToday.length > 0) {
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

  useEffect(() => {
    if (autoAssignTimeoutRef.current) {
      clearTimeout(autoAssignTimeoutRef.current);
    }
    if (activeDoctors.length === 0) return;

    const unassignedPatients = patients.filter(p =>
      !p.assignedDoctor &&
      !p.isInactive &&
      !p.tempId &&
      p.status !== 'done' &&
      p.status !== 'cancelled' &&
      (p.type !== 'Appointment' || p.appointmentStatus === 'accepted') &&
      isForToday(p)
    );

    if (unassignedPatients.length === 0) return;
    autoAssignTimeoutRef.current = setTimeout(() => {
      console.log("🚀 Starting debounced auto-assignment...");

      const patientsToUpdate = [];

      unassignedPatients.forEach(patient => {
        if (patient.type === 'Appointment' && patient.appointmentStatus !== 'accepted') return;

        let doctor = null;
        if (patient.preferredDoctor) {
          const matchedDoctor = allDoctors.find(d =>
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
          const virtualPatients = [...patients, ...patientsToUpdate.map(item => ({
            ...item.patient,
            assignedDoctor: item.doctor
          }))];
          doctor = assignDoctor(patient, virtualPatients, activeDoctors, allDoctors);
        }

        if (doctor) {
          console.log(`✅ Auto-assigned ${patient.name} (Queue #${patient.queueNo}) to ${doctor.name}`);
          patientsToUpdate.push({ patient, doctor });
        }
      });

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

              syncPatientToDatabase(updatedPatient).catch(err => {
                console.error('⚠️ Database sync failed:', err);
              });
            }
          });

          return hasChanges ? nextPatients : prev;
        });
      }
    }, 5000);

    return () => {
      if (autoAssignTimeoutRef.current) clearTimeout(autoAssignTimeoutRef.current);
    };
  }, [patients, activeDoctors]);

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

  const addPatient = (inputPatient) => {
    const patientToAdd = (inputPatient.patient_type || inputPatient.queue_no)
      ? transformPatientData(inputPatient)
      : inputPatient;

    setPatients(prev => {
      if (patientToAdd.id && prev.some(p => p.id === patientToAdd.id)) return prev;
      return [...prev, patientToAdd].sort(sortPatientsHybrid);
    });
  };

  const clearActivePatient = () => {
    console.log('🧹 Clearing active patient session...');
    setActivePatient(null);
    localStorage.removeItem('activePatientId');
  };

  const updatePatientStatus = async (queueNo, newStatus) => {
    // 1. Find the patient first
    const patient = patients.find(p => p.queueNo === queueNo);
    if (!patient) return;

    // 2. Prepare updates
    const updates = { status: newStatus };

    if (newStatus === "in progress" && patient.status === "waiting") {
      updates.calledAt = new Date().toISOString();
      updates.queueExitTime = new Date().toISOString();

      // Auto-assign doctor if not assigned yet
      if (!patient.assignedDoctor || !patient.assignedDoctor.id) {
        const assignedDoctorObj = assignDoctor(patient, patients, activeDoctors, allDoctors);
        if (assignedDoctorObj) {
          updates.assignedDoctor = assignedDoctorObj;
          updates.assigned_doctor_name = assignedDoctorObj.name;
        }
      }
    }

    if (newStatus === "done" && patient.status === "in progress") {
      updates.completedAt = new Date().toISOString();
      if (!patient.queueExitTime) {
        updates.queueExitTime = new Date().toISOString();
      }
    }

    const updatedPatient = { ...patient, ...updates };

    // 3. Update Local State
    setPatients(prev => prev.map(p => p.queueNo === queueNo ? updatedPatient : p));

    // 4. Sync status update to database
    try {
      await syncPatientToDatabase(updatedPatient);
    } catch (err) {
      console.error('⚠️ Database sync failed:', err);
    }
  };

  const cancelPatient = (queueNo) => {
    const patient = patients.find(p => p.queueNo === queueNo);
    if (!patient) return;

    const cancelled = {
      ...patient,
      status: "cancelled",
      queueExitTime: new Date().toISOString(),
      cancelledAt: new Date().toISOString()
    };

    setPatients(prev => prev.map(p => p.queueNo === queueNo ? cancelled : p));

    syncPatientToDatabase(cancelled).catch(err => {
      console.error('⚠️ Database sync failed:', err);
    });
  };
  const acceptAppointment = async (patientId) => {
    try {
      // 1. Get the patient first
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const isFuture = !isToday(patient.appointmentDateTime);
      let assignedNo = patient.queueNo;

      if (isFuture) {
        if (!assignedNo || assignedNo < 900000) {
          assignedNo = 900000 + Math.floor(Math.random() * 99999);
        }
      } else {
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
        assignedDoctor = assignDoctor(patient, patients, activeDoctors, allDoctors);
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

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

      if (error) throw error;

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

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

      if (error) throw error;

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

      const maxResult = await getMaxQueueNumber(cancelledPatient.type);
      const dbMax = maxResult.maxQueueNo;

      const localMax = Math.max(0, ...patients
        .filter(p => p.type === cancelledPatient.type && isToday(p.registeredAt))
        .map(p => p.queueNo || 0));

      const nextQueueNo = Math.max(dbMax, localMax) + 1;

      console.log(`✅ Assigned new queue number: ${nextQueueNo} (DB Max: ${dbMax}, Local Max: ${localMax})`);

      const updatedPatient = {
        ...cancelledPatient,
        ...extraUpdates,
        queueNo: nextQueueNo,
        displayQueueNo: formatQueueNumber(nextQueueNo, cancelledPatient.type, cancelledPatient.appointmentStatus, cancelledPatient.appointmentDateTime),
        originalQueueNo: cancelledPatient.queueNo,
        status: "waiting",
        registeredAt: new Date().toISOString(),
        inQueue: true,
        calledAt: null,
        queueExitTime: null,
        completedAt: null,
        cancelledAt: null,
        isInactive: false,
        requeued: true,
      };

      setPatients(prev => prev.map(p => p.id === cancelledPatient.id ? updatedPatient : p)
        .sort(sortPatientsHybrid));

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
      const dateToProcess = targetDate || new Date(new Date().setDate(new Date().getDate() + 1));
      dateToProcess.setHours(0, 0, 0, 0);
      const dateString = dateToProcess.toDateString();

      console.log(`📅 Finalizing queue for: ${dateString}`);

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

      const maxResult = await getMaxQueueNumber('appointment', dateToProcess);
      let nextNum = (maxResult.maxQueueNo || 10000) + 1;

      console.log(`🚀 Starting batch assignment from #${nextNum}`);

      const updatedPatients = [];

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
            queueNo: assignedNo
          });
        }

        updatedPatients.push(updated);
      }

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

  const repairTodaysQueue = async () => {
    if (finalizingRef.current) return;
    try {
      finalizingRef.current = true;
      const todayDate = new Date();
      const todayString = todayDate.toDateString();
      console.log(`🛠️ Repairing Queue for: ${todayString}`);

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

      const brandedBase = getBrandedBase();

      const updates = [];

      let apptSeq = 10001;
      for (const p of appts) {
        const newNo = brandedBase + apptSeq++;
        const newDisplay = formatQueueNumber(newNo, 'Appointment', 'accepted', p.appointmentDateTime);
        updates.push({ ...p, queueNo: newNo, displayQueueNo: newDisplay });
      }

      let walkSeq = 1;
      for (const p of walks) {
        const newNo = brandedBase + walkSeq++;
        const newDisplay = formatQueueNumber(newNo, 'Walk-in', null, p.registeredAt);
        updates.push({ ...p, queueNo: newNo, displayQueueNo: newDisplay });
      }

      console.log(`🚀 Syncing ${updates.length} repaired records to DB...`);

      for (const upd of updates) {
        await syncPatientToDatabase(upd);
      }
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

  const syncClinicSettings = async (adjustment) => {
    try {
      const settingsData = {
        name: 'System Settings',
        patient_email: 'clinic_settings@abante.com',
        phone_num: '00000000000',
        age: adjustment,
        patient_type: 'walk-in',
        queue_no: 999999,
        is_inactive: true,
        in_queue: false,
        status: 'waiting',
        assigned_doctor_name: 'System'
      };
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
      const newVal = Math.max(-60, prev - 5);
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
    const isReadyForQueue = (p) => {
      if (p.type === 'Appointment' && p.appointmentDateTime) {
        const appDate = new Date(p.appointmentDateTime);
        return isToday(p.appointmentDateTime) && new Date() >= appDate;
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
      console.log(`Debug: Calling Priority Patient ${nextPriorityPatient.queueNo}`);
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(dId, nextPriorityPatient.queueNo);
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
      console.log(`Debug: Calling Waiting Patient ${nextWaitingPatient.queueNo}`);
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
      setDoctorCurrentServingPatient(dId, nextWaitingPatient.queueNo);
    }
  };

  const cancelPatientForDoctor = (doctorId) => {
    const dId = Number(doctorId);
    const currentPatientQueueNo = doctorCurrentServing[dId];

    if (!currentPatientQueueNo) return;

    cancelPatient(currentPatientQueueNo);

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

      const lastRepaired = localStorage.getItem('queueRepaired_v3_Date');
      if (lastRepaired !== todayString) {
        console.log("🛠️ Detected first run of the day (v3). Initiating sequence cleanup...");
        repairTodaysQueue().then(res => {
          if (res?.success) localStorage.setItem('queueRepaired_v3_Date', todayString);
        });
      }
    }
  }, [isLoadingFromDB]);

  const resolvedPatients = useMemo(() => resolveQueueDisplays(patients), [patients]);

  const isDoctorActive = (doctorId) => {
    const dId = Number(doctorId);
    return activeDoctors.includes(dId);
  };


  return (
    <PatientContext.Provider value={{
      allDoctors,
      updateDoctorProfile,
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