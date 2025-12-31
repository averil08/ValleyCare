export const doctors = [
  { 
    id: 1, 
    name: "Dr. Sarah Gonzales", 
    specializations: ["pedia", "preventive", "follow-up"] 
  },
  { 
    id: 2, 
    name: "Dr. John Martinez", 
    specializations: ["adult", "senior", "preventive", "follow-up"] 
  },
  { 
    id: 3, 
    name: "Dr. Lisa Chen", 
    specializations: ["pedia", "adult"] 
  },
  { 
    id: 4, 
    name: "Dr. Michael Torres", 
    specializations: ["cbc", "platelet", "esr", "abo"] 
  },
  { 
    id: 5, 
    name: "Dr. Anna Reyes", 
    specializations: ["hbsag", "vdrl", "antiHCV", "hpylori"] 
  },
  { 
    id: 6, 
    name: "Dr. Robert Kim", 
    specializations: ["dengueIg", "dengueNs1", "dengueDuo", "typhidot"] 
  },
  { 
    id: 7, 
    name: "Dr. Emily Santos", 
    specializations: ["fbs", "rbs", "lipid", "totalCh", "triglycerides", "hdl", "ldl"] 
  },
  { 
    id: 8, 
    name: "Dr. David Lee", 
    specializations: ["alt", "ast", "uric", "creatinine", "bun", "hba1c"] 
  },
  { 
    id: 9, 
    name: "Dr. Maria Garcia", 
    specializations: ["albumin", "magnesium", "totalProtein", "alp", "phosphorus"] 
  },
  { 
    id: 10, 
    name: "Dr. James Wilson", 
    specializations: ["sodium", "potassium", "ionizedCal", "totalCal", "chloride"] 
  },
  { 
    id: 11, 
    name: "Dr. Patricia Brown", 
    specializations: ["urinalysis", "fecalysis", "pregnancyT", "fecal", "semen"] 
  },
  { 
    id: 12, 
    name: "Dr. Thomas Anderson", 
    specializations: ["tsh", "ft3", "75g", "t4", "t3", "psa", "totalBilirubin"] 
  }
];

// Function to find available doctors for a given service
export const findDoctorsForService = (serviceId) => {
  return doctors.filter(doctor => 
    doctor.specializations.includes(serviceId)
  );
};

// Function to assign a doctor based on patient load - ONLY ACTIVE DOCTORS
export const assignDoctor = (serviceIds, patients, activeDoctors = []) => {
  if (!serviceIds || serviceIds.length === 0) {
    // If no services selected, try to assign to any active general practitioner
    const activeGeneralDoctors = doctors.filter(d => 
      activeDoctors.includes(d.id) && 
      (d.specializations.includes("pedia") || d.specializations.includes("adult"))
    );
    
    if (activeGeneralDoctors.length > 0) {
      return activeGeneralDoctors[0];
    }
    
    // If no active general doctors, return the first active doctor or fallback
    return activeDoctors.length > 0 
      ? doctors.find(d => d.id === activeDoctors[0]) 
      : doctors[0];
  }

  // Get the first service to determine specialization
  const primaryService = serviceIds[0];
  
  // Find all doctors who can handle this service AND are active
  const availableDoctors = doctors.filter(doctor => 
    doctor.specializations.includes(primaryService) && 
    activeDoctors.includes(doctor.id)
  );
  
  if (availableDoctors.length === 0) {
    // No active doctor for this service - assign to any active doctor
    if (activeDoctors.length > 0) {
      return doctors.find(d => d.id === activeDoctors[0]) || doctors[0];
    }
    // Fallback if no doctors are active
    return doctors[0];
  }

  // Count current patient load for each available doctor
  const doctorLoads = availableDoctors.map(doctor => {
    const load = patients.filter(p => 
      p.assignedDoctor?.id === doctor.id && 
      p.status !== 'done' && 
      p.status !== 'cancelled' &&
      !p.isInactive
    ).length;
    
    return { doctor, load };
  });

  // Sort by load (ascending) and assign to doctor with least patients
  doctorLoads.sort((a, b) => a.load - b.load);
  
  return doctorLoads[0].doctor;
};