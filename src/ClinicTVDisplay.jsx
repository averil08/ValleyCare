import React, { useContext, useEffect, useState, useMemo } from 'react';
import { PatientContext } from './PatientContext';
import { doctors } from './doctorData';

const ClinicTVDisplay = () => {
  const { patients } = useContext(PatientContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncedPatients, setSyncedPatients] = useState(patients);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  //🔴 REPLACE FROM HERE
  // ✅ CRITICAL: Listen for localStorage changes from Dashboard
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'patients-sync') {
        try {
          const updatedPatients = JSON.parse(e.newValue);
          console.log('🔄 TV Display received update from Dashboard:', updatedPatients);
          setSyncedPatients(updatedPatients);
        } catch (error) {
          console.error('Error parsing patients data:', error);
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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  //🔴 REPLACE TO HERE

  //🔴 REPLACE FROM HERE
  // Also sync with context patients (for initial load)
  useEffect(() => {
    if (patients && patients.length > 0) {
      setSyncedPatients(patients);
    }
  }, [patients]);
  //🔴 REPLACE TO HERE

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
  // Guard: If syncedPatients is null or undefined, use an empty array
  const currentData = syncedPatients || []; 
  console.log('🔄 Recalculating doctor info with', currentData.length, 'patients');
  
  return doctors.map(doctor => {
    const currentServingPatient = currentData.find(p => 
      !p.isInactive && 
      p.assignedDoctor?.id === doctor.id &&
      p.status === "in progress" &&
      p.inQueue
    );
    
    const doctorPatients = currentData
      .filter(p => 
        !p.isInactive && 
        p.assignedDoctor?.id === doctor.id &&
        p.status === "waiting" &&
        p.inQueue
      )
      .sort((a, b) => a.queueNo - b.queueNo);
    const info = {
      doctorId: doctor.id,
      doctorName: doctor.name,
      currentServing: currentServingPatient ? currentServingPatient.queueNo : null,
      waitingNumbers: doctorPatients.slice(0, 3).map(p => p.queueNo)
    };
    
    console.log(`📊 ${doctor.name}:`, {
      serving: info.currentServing,
      waiting: info.waitingNumbers
    });
    
    return info;
  });
}, [syncedPatients]);

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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold">LIVE</span>
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
              className={`${
                index % 2 === 0 ? 'bg-green-200/60' : 'bg-white/80'
              } backdrop-blur-sm border-2 border-green-600/30 p-6 text-center`}
            >
              {/* Doctor Name */}
              <div className="text-gray-900 font-bold text-xl mb-2">
                {doctorInfo.doctorName.toUpperCase()}
              </div>

              {/* Now Serving Label */}
              <div className="text-gray-700 text-sm font-semibold mb-3">
                NOW SERVING
              </div>

              {/* Current Serving Number */}
              <div className="mb-6">
                {doctorInfo.currentServing ? (
                  <div 
                    className="text-green-700 text-6xl font-bold drop-shadow-lg transition-all duration-500 animate-pulse"
                    key={`serving-${doctorInfo.currentServing}`}
                  >
                    {String(doctorInfo.currentServing).padStart(3, '0')}
                  </div>
                ) : (
                  <div className="text-gray-400 text-5xl font-bold">
                    ---
                  </div>
                )}
              </div>

              {/* Waiting Numbers */}
              <div className="space-y-2">
                {doctorInfo.waitingNumbers.length > 0 ? (
                  doctorInfo.waitingNumbers.map((queueNo, idx) => (
                    <div 
                      key={`${doctorInfo.doctorId}-${queueNo}-${idx}`}
                      className="text-gray-700 text-4xl font-bold drop-shadow-lg"
                    >
                      {String(queueNo).padStart(3, '0')}
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