import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { PatientContext, formatQueueNumber } from './PatientContext';
import { doctors } from './doctorData';

// Matches doctor names even if the DB includes middle initials/extra punctuation.
// Example: "Dr. Rajiv D. Laoagan" should match "Dr. Rajiv Laoagan".
const normalizeDoctorNameForMatch = (name) => {
  if (!name) return '';
  return name
    .replace(/\bdr\.?\b/gi, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(token => token.length > 1) // drop middle initials (single-letter tokens)
    .join(' ')
    .toLowerCase();
};

// Notification Sound Logic (Web Audio API)
const playChime = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const playNote = (freq, startTime, duration, volume = 0.5) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle'; // Triangle waves cut through noise better than sine
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.02); // Sharper attack
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Stronger triple-tone "attention" chime (C5, E5, G5)
        playNote(523.25, now, 0.8);        // C5
        playNote(659.25, now + 0.15, 0.8);   // E5
        playNote(783.99, now + 0.3, 1.2);    // G5 (sustained)
    } catch (err) {
        console.error("Audio error:", err);
    }
};

const ClinicTVDisplay = () => {
  const { patients, activeDoctors } = useContext(PatientContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncedPatients, setSyncedPatients] = useState(patients);
  const [syncedActiveDoctors, setSyncedActiveDoctors] = useState(activeDoctors || []);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const lastCalledNumbersRef = useRef({});
  const isFirstLoadRef = useRef(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ CRITICAL: Listen for localStorage changes from Dashboard
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Sync Patients
      if (e.key === 'patients-sync') {
        try {
          const updatedPatients = JSON.parse(e.newValue);
          console.log('🔄 TV Display received update from Dashboard:', updatedPatients);
          setSyncedPatients(updatedPatients);
        } catch (error) {
          console.error('Error parsing patients data:', error);
        }
      }

      // Sync Active Doctors
      if (e.key === 'active-doctors-sync') {
        try {
          const parsed = JSON.parse(e.newValue);
          console.log('🔄 TV Display received active doctors update:', parsed.ids);
          if (parsed && Array.isArray(parsed.ids)) {
            setSyncedActiveDoctors(parsed.ids);
          }
        } catch (error) {
          console.error('Error parsing active doctors:', error);
        }
      }
    };

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Also check localStorage on mount in case data exists
    const storedPatients = localStorage.getItem('patients-sync');
    if (storedPatients) {
      try {
        setSyncedPatients(JSON.parse(storedPatients));
      } catch (error) {
        console.error('Error loading stored patients:', error);
      }
    }

    const storedDoctors = localStorage.getItem('active-doctors-sync');
    if (storedDoctors) {
      try {
        const parsed = JSON.parse(storedDoctors);
        if (parsed && Array.isArray(parsed.ids)) {
          setSyncedActiveDoctors(parsed.ids);
        }
      } catch (error) {
        console.error('Error loading stored active doctors:', error);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Also sync with context patients (for initial load)
  useEffect(() => {
    if (patients && patients.length > 0) {
      setSyncedPatients(patients);
    }
  }, [patients]);

  // Sync initial activeDoctors from context
  useEffect(() => {
    if (activeDoctors) {
      setSyncedActiveDoctors(activeDoctors);
    }
  }, [activeDoctors]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ✅ Use syncedPatients instead of patients
  const doctorsInfo = useMemo(() => {
    const currentData = syncedPatients || [];
    console.log('🔄 Recalculating doctor info with', currentData.length, 'patients');

    // ✅ ADD THIS HELPER FUNCTION
    const isToday = (dateString) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      return date >= startOfToday && date <= endOfToday;
    };

    // Appointment patients should be keyed off appointmentDateTime, not registeredAt.
    const isForToday = (p) => {
      if (!p) return false;
      if (p.type === 'Appointment' && p.appointmentDateTime) return isToday(p.appointmentDateTime);
      return isToday(p.registeredAt);
    };

    const matchesDoctor = (p, doctor) => {
      if (!p || !doctor) return false;
      if (p.assignedDoctor?.id != null) return Number(p.assignedDoctor.id) === Number(doctor.id);
      const assignedName = p.assignedDoctor?.name || '';
      if (!assignedName) return false;
      return normalizeDoctorNameForMatch(assignedName) === normalizeDoctorNameForMatch(doctor.name);
    };

    return doctors.map(doctor => {
      const currentServingPatient = currentData.find(p =>
        !p.isInactive &&
        matchesDoctor(p, doctor) &&
        p.status === "in progress" &&
        (p.type === 'Appointment' ? p.appointmentStatus === "accepted" : p.inQueue) &&
        (p.status === "in progress" || isToday(p.registeredAt)) &&
        (!p.appointmentDateTime || isToday(p.appointmentDateTime))
      );

      const doctorPatients = currentData
        .filter(p =>
          !p.isInactive &&
          matchesDoctor(p, doctor) &&
          p.status === "waiting" &&
          (p.type === 'Appointment' ? p.appointmentStatus === "accepted" : p.inQueue) &&
          isForToday(p) &&
          (!p.appointmentDateTime || isToday(p.appointmentDateTime))
        )
        .sort((a, b) => a.queueNo - b.queueNo);

      const info = {
        doctorId: doctor.id,
        doctorName: doctor.name,
        isActive: syncedActiveDoctors && syncedActiveDoctors.includes(doctor.id),
        currentServing: currentServingPatient ? currentServingPatient.displayQueueNo : null,
        waitingNumbers: doctorPatients.slice(0, 3).map(p => p.displayQueueNo)
      };

      console.log(`📊 ${doctor.name}:`, {
        isActive: info.isActive,
        serving: info.currentServing,
        waiting: info.waitingNumbers
      });

      return info;
    });
  }, [syncedPatients, syncedActiveDoctors]);

  // Handle Play Notification Sound
  useEffect(() => {
    if (!doctorsInfo || doctorsInfo.length === 0) return;

    let shouldPlaySound = false;
    const currentCalled = {};

    doctorsInfo.forEach(doc => {
      if (doc.isActive && doc.currentServing) {
        currentCalled[doc.doctorId] = doc.currentServing;
        
        // If this doctor has a different serving number than before
        if (lastCalledNumbersRef.current[doc.doctorId] !== doc.currentServing) {
          // Don't play on the very first load of the page
          if (!isFirstLoadRef.current) {
            console.log(`🔔 Playing chime for Doctor ${doc.doctorName}, Patient #${doc.currentServing}`);
            shouldPlaySound = true;
          }
        }
      }
    });

    // Update the ref for next comparison
    lastCalledNumbersRef.current = currentCalled;
    
    if (shouldPlaySound && isSoundEnabled) {
      playChime();
    }
    
    // After first pass, we are no longer on first load
    if (doctorsInfo.length > 0) {
        isFirstLoadRef.current = false;
    }
  }, [doctorsInfo, isSoundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-red-100 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 mb-4 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">DE VALLEY</div>
          <div className="text-sm">
            <div>{formatDate(currentTime)}</div>
            <div className="font-semibold">{formatTime(currentTime)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSoundEnabled 
                ? 'bg-white text-green-700 shadow-inner' 
                : 'bg-green-800 text-green-300 hover:bg-green-700'
            }`}
          >
            {isSoundEnabled ? (
                <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    SOUND ON
                </>
            ) : (
                <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    SOUND OFF
                </>
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main Content - Clinic Table */}
      <div className="bg-white/20 backdrop-blur-md rounded-lg overflow-hidden shadow-2xl border-4 border-green-600">
        {/* Clinic Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6">
          <h2 className="text-3xl font-bold text-center">DOCTORS CLINIC 1</h2>
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-5 gap-0">
          {doctorsInfo.map((doctorInfo, index) => (
            <div
              key={doctorInfo.doctorId}
              className={`${index % 2 === 0 ? 'bg-green-200/60' : 'bg-white/80'
                } backdrop-blur-sm border-2 border-green-600/30 p-6 text-center transition-opacity flex flex-col justify-between ${!doctorInfo.isActive ? 'opacity-50 grayscale' : ''}`}
            >
              <div>
                {/* Doctor Name */}
                <div className="text-gray-900 font-bold text-xl mb-2">
                  {doctorInfo.doctorName.toUpperCase()}
                </div>

                {/* Status or Now Serving Label */}
                <div className={`text-sm font-semibold mb-3 ${doctorInfo.isActive ? 'text-gray-700' : 'text-red-600 italic'}`}>
                  {doctorInfo.isActive ? 'NOW SERVING' : 'UNAVAILABLE'}
                </div>

                {/* Current Serving Number */}
                <div className="mb-6 h-[80px] flex items-center justify-center">
                  {doctorInfo.isActive && doctorInfo.currentServing ? (
                    <div
                      className="text-green-700 text-6xl font-bold drop-shadow-lg transition-all duration-500 animate-pulse"
                      key={`serving-${doctorInfo.currentServing}`}
                    >
                      {doctorInfo.currentServing}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-5xl font-bold">
                      ---
                    </div>
                  )}
                </div>
              </div>

              {/* Waiting Numbers */}
              <div className="space-y-2 mt-auto">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Waiting</div>
                {doctorInfo.isActive && doctorInfo.waitingNumbers.length > 0 ? (
                  doctorInfo.waitingNumbers.map((queueNo, idx) => (
                    <div
                      key={`${doctorInfo.doctorId}-${queueNo}-${idx}`}
                      className="text-gray-700 text-4xl font-bold drop-shadow-lg"
                    >
                      {queueNo}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-300 text-3xl font-bold">
                    - - -
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Notice */}
      <div className="mt-4 bg-gradient-to-r from-green-600 to-red-600 text-white text-center py-3 rounded-lg shadow-lg">
        <p className="text-xl font-semibold">
          Please wait for your number to be called • Thank you for your patience
        </p>
      </div>
    </div>
  );
};

export default ClinicTVDisplay;