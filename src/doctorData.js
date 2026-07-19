//updated frontend only code
export const specializationCategories = {
  'all': {
    label: 'All Doctors',
    doctorIds: []
  },
  'pediatrics': {
    label: 'Pediatrics',
    doctorIds: [1, 2, 3] // Melissa, Leila, Genevive
  },
  'internalMedicine': {
    label: 'Internal Medicine',
    doctorIds: [11, 12] // Cynthia, Richard Boado
  },
  'nephrology': {
    label: 'Nephrology',
    doctorIds: [13] // Ian Feb
  },
  'obgyn': {
    label: 'OB-GYN',
    doctorIds: [4, 5, 6, 7] // Elvira, Herschel, Clarissa, Cecille
  },
  'orthopedicsUrology': {
    label: 'Orthopedics & Urology',
    doctorIds: [9] // Richard Ang
  },
  'generalSurgery': {
    label: 'General Surgery',
    doctorIds: [8, 14] // Rajiv, Jefferson
  },
  'ent': {
    label: 'ENT',
    doctorIds: [10] // Rhea
  }
};

export const doctors = [
  {
    id: 1,
    name: "Dr. Melissa B. Edic",
    consultationPrice: 1000,
    specialization: "Pediatrics",
    specializations: [
      "pedia", "follow-up",
      "urinalysis", "fecalysis"
    ],
    schedule: "Thu-Fri: 10AM-12NN then 2PM-4PM, 2nd & 4th Wed, 1st & 3rd Sat: 10AM-4PM",
    availability: [
      { days: [4, 5], startHour: 10, endHour: 12 },
      { days: [4, 5], startHour: 14, endHour: 16 },
      { days: [3], startHour: 10, endHour: 16, weeksOfMonth: [2, 4] },
      { days: [6], startHour: 10, endHour: 16, weeksOfMonth: [1, 3] }
    ]
  },
  {
    id: 2,
    name: "Dr. Leila Rachel Dupiag",
    consultationPrice: 1000,
    specialization: "Pediatrics",
    specializations: [
      "pedia", "follow-up",
      "urinalysis", "fecalysis"
    ],
    schedule: "Mon-Tue, 1st & 3rd Wed, 2nd & 4th Sat: 10AM-12NN, Thu-Fri: 12PM-2PM",
    availability: [
      { days: [1, 2], startHour: 10, endHour: 12 },
      { days: [4, 5], startHour: 12, endHour: 14 },
      { days: [3], startHour: 10, endHour: 12, weeksOfMonth: [1, 3] },
      { days: [6], startHour: 10, endHour: 12, weeksOfMonth: [2, 4] }
    ]
  },
  {
    id: 3,
    name: "Dr. Genevive Bandiwan-Laking",
    consultationPrice: 1200,
    specialization: "Pediatrics",
    specializations: [
      "pedia", "follow-up",
      "urinalysis", "fecalysis"
    ],
    schedule: "Mon-Tue, 1st & 3rd Wed, 2nd & 4th Sat: 2:30PM-5PM",
    availability: [
      { days: [1, 2], startHour: 14.5, endHour: 17 },
      { days: [3], startHour: 14.5, endHour: 17, weeksOfMonth: [1, 3] },
      { days: [6], startHour: 14.5, endHour: 17, weeksOfMonth: [2, 4] }
    ]
  },
  {
    id: 4,
    name: "Dr. Elvira Lampacan",
    consultationPrice: 800,
    specialization: "OB-GYN",
    specializations: [
      "pregnancyT", "follow-up",
      "urinalysis",
      "fecalysis"
    ],
    schedule: "Wed, Fri: 10AM-12NN, Thu: 10AM-12NN then 1PM-3PM",
    availability: [
      { days: [3, 5], startHour: 10, endHour: 12 },
      { days: [4], startHour: 10, endHour: 12 },
      { days: [4], startHour: 13, endHour: 15 }
    ]
  },
  {
    id: 5,
    name: "Dr. Herschel Charisse Rivera-Ang",
    consultationPrice: 1000,
    specialization: "OB-GYN",
    specializations: [
      "pregnancyT", "follow-up",
      "urinalysis",
      "fecalysis"
    ],
    schedule: "Mon-Wed: 3PM-5PM",
    availability: [
      { days: [1, 2, 3], startHour: 15, endHour: 17 }
    ]
  },
  {
    id: 6,
    name: "Dr. Clarissa Lee",
    consultationPrice: 1000,
    specialization: "OB-GYN",
    specializations: [
      "pregnancyT", "follow-up",
      "urinalysis",
      "fecalysis"
    ],
    schedule: "Mon-Tue: 10AM-12NN, Fri: 1PM-3PM",
    availability: [
      { days: [1, 2], startHour: 10, endHour: 12 },
      { days: [5], startHour: 13, endHour: 15 }
    ]
  },
  {
    id: 7,
    name: "Dr. Cecille Pating",
    consultationPrice: 1200,
    specialization: "OB-GYN",
    specializations: [
      "pregnancyT", "follow-up",
      "urinalysis",
      "fecalysis"
    ],
    schedule: "Sat: 10AM-3PM",
    availability: [
      { days: [6], startHour: 10, endHour: 15 }
    ]
  },
  {
    id: 8,
    name: "Dr. Rajiv Laoagan",
    consultationPrice: 1200,
    specialization: "General Surgery",
    specializations: [
      "general surgery",
      "urinalysis", "fecalysis", "fecal"
    ],
    schedule: "Thu, Sat: 10AM-3PM",
    availability: [
      { days: [4, 6], startHour: 10, endHour: 15 }
    ]
  },
  {
    id: 9,
    name: "Dr. Richard Ang",
    consultationPrice: 1500,
    specialization: "Orthopedic Surgery",
    specializations: [
      "follow-up",
      "orthopedic",
      "psa",
      "semen",
      "urinalysis"
    ],
    schedule: "Mon-Wed: 1PM-3PM",
    availability: [
      { days: [1, 2, 3], startHour: 13, endHour: 15 }
    ]
  },
  {
    id: 10,
    name: "Dr. Rhea Jeanne Awas",
    consultationPrice: 1200,
    specialization: "ENT",
    specializations: [
      "ent",
      "urinalysis", "fecalysis"
    ],
    schedule: "Fri: 10AM-1PM",
    availability: [
      { days: [5], startHour: 10, endHour: 13 }
    ]
  },
  {
    id: 11,
    name: "Dr. Cynthia Moran",
    consultationPrice: 1200,
    specialization: "Internal Medicine",
    specializations: [
      "adult", "senior", "preventive", "follow-up",
      "cbc", "platelet", "esr", "abo",
      "fbs", "rbs", "hba1c",
      "lipid", "totalCh", "triglycerides", "hdl", "ldl",
      "alt", "ast", "uric", "creatinine", "bun",
      "albumin", "totalProtein", "alp", "phosphorus",
      "sodium", "potassium", "chloride", "ionizedCal", "totalCal", "magnesium",
      "urinalysis", "fecalysis", "fecal",
      "tsh", "ft3", "t4", "t3",
      "totalBilirubin"
    ],
    schedule: "Fri: 10AM-12NN",
    availability: [
      { days: [5], startHour: 10, endHour: 12 }
    ]
  },
  {
    id: 12,
    name: "Dr. Richard Boado",
    consultationPrice: 1500,
    specialization: "Internal Medicine",
    specializations: [
      "adult", "senior", "preventive", "follow-up"
    ],
    schedule: "Mon, Sat: 9AM-12NN",
    availability: [
      { days: [1, 6], startHour: 9, endHour: 12 }
    ]
  },
  {
    id: 13,
    name: "Dr. Ian Feb Golocan-Alquiza",
    consultationPrice: 1500,
    specialization: "Nephrology",
    specializations: [
      "fbs", "rbs", "creatinine", "bun", "hba1c",
      "urinalysis",
      "75g"
    ],
    schedule: "Mon, Thu: 12PM-4PM",
    availability: [
      { days: [1, 4], startHour: 12, endHour: 16 }
    ]
  },
  {
    id: 14,
    name: "Dr. Jefferson Richmond G. Chomenwey",
    consultationPrice: 1500,
    specialization: "General Surgery",
    specializations: [
      "general surgery",
      "urinalysis", "fecalysis", "fecal"
    ],
    schedule: "By Appointment Only",
    availability: [
      { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
    ]
  },
  {
    id: 15,
    name: "Dr. Debbie Ryan",
    consultationPrice: 1500,
    specialization: "General Consultation",
    specializations: [
      "preventive", "senior",
      "urinalysis", "fecalysis", "fecal"
    ],
    schedule: "By Appointment Only",
    availability: [
      { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
    ]
  },
  {
    id: 16,
    name: "Dr. Bobbie Ferrer",
    consultationPrice: 800,
    specialization: "General Consultation",
    specializations: [
      "preventive", "senior",
      "obgyn", "fecalysis", "fecal"
    ],
    schedule: "By Appointment Only",
    availability: [
      { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
    ]
  },
  {
    id: 17,
    name: "Dr. Judith Belen",
    consultationPrice: 800,
    specialization: "General Consultation",
    specializations: [
      "preventive", "senior",
      "obgyn", "fecalysis", "fecal"
    ],
    schedule: "By Appointment Only",
    availability: [
      { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
    ]
  }
];


export const assignDoctor = (patientData, patients, activeDoctors = [], customDoctorsList = null) => {
  const isArrayInput = Array.isArray(patientData);
  const serviceIds = isArrayInput ? patientData : (patientData?.services || []);
  const symptoms = isArrayInput ? [] : (patientData?.symptoms || []);
  const age = isArrayInput ? null : (patientData?.age ? parseInt(patientData.age) : null);

  console.log('🔍 assignDoctor called with:', { serviceIds, symptoms, age, activeDoctorsCount: activeDoctors.length });

  let doctorsSource = customDoctorsList;
  if (!doctorsSource) {
    doctorsSource = doctors;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const local = JSON.parse(localStorage.getItem("abante_local_doctors") || "[]");
        if (Array.isArray(local) && local.length > 0) {
          const merged = doctors.map(d => {
            const localOverride = local.find(ld => ld.id === d.id);
            return localOverride || d;
          });
          const staticIds = doctors.map(d => d.id);
          const newLocal = local.filter(ld => !staticIds.includes(ld.id));
          doctorsSource = [...merged, ...newLocal];
        }
      } catch (e) {
        console.error("Error reading abante_local_doctors in assignDoctor fallback", e);
      }
    }
  }

  const activeDoctorsList = doctorsSource.filter(d => activeDoctors.includes(d.id));

  if (activeDoctorsList.length === 0) {
    console.log('⚠️ No active doctors available for automatic assignment');
    return null;
  }

  const getLeastBusy = (subset) => {
    if (!subset || subset.length === 0) return null;
    const loads = subset.map(doctor => {
      const load = patients.filter(p =>
        p.assignedDoctor?.id === doctor.id &&
        p.status !== 'done' &&
        p.status !== 'cancelled' &&
        !p.isInactive
      ).length;
      return { doctor, load };
    });
    loads.sort((a, b) => a.load - b.load);
    return loads[0].doctor;
  };

  // Services selected - find active doctors who can handle these services
  if (serviceIds && serviceIds.length > 0) {
    const capableActiveDoctors = activeDoctorsList.filter(doctor => {
      return serviceIds.some(serviceId => doctor.specializations.includes(serviceId));
    });

    if (capableActiveDoctors.length > 0) {
      return getLeastBusy(capableActiveDoctors);
    }
  }

  // No specific services matched - Use Symptoms and Demographics
  if (!isArrayInput) {
    // A. Pediatrics (Age-based)
    if (age !== null && age < 18) {
      const pediaDoctors = activeDoctorsList.filter(d => d.specialization === 'Pediatrics');
      if (pediaDoctors.length > 0) {
        console.log('👶 Child detected - routing to active Pediatrician');
        return getLeastBusy(pediaDoctors);
      }
    }

    // B. ENT (Symptom-based)
    const entSymptoms = ['Ear Pain', 'Sore Throat', 'Runny Nose'];
    if (symptoms.some(s => entSymptoms.includes(s))) {
      const entDoctors = activeDoctorsList.filter(d => d.specialization === 'ENT');
      if (entDoctors.length > 0) {
        console.log('👂 ENT symptoms detected - routing to active ENT specialist');
        return getLeastBusy(entDoctors);
      }
    }

    // C. General Surgery / Gastro (Symptom-based)
    const surgerySymptoms = ['Stomach Pain', 'Vomiting', 'Diarrhea'];
    if (symptoms.some(s => surgerySymptoms.includes(s))) {
      const surgeryDoctors = activeDoctorsList.filter(d => d.specialization === 'General Surgery');
      if (surgeryDoctors.length > 0) {
        console.log('🩺 Gastro symptoms detected - routing to active General Surgeon');
        return getLeastBusy(surgeryDoctors);
      }
    }

    // D. Adult Internal Medicine (Age-based fallback)
    if (age !== null && age >= 18) {
      const imDoctors = activeDoctorsList.filter(d => d.specialization === 'Internal Medicine');
      if (imDoctors.length > 0) {
        console.log('👤 Adult detected - routing to active Internal Medicine');
        return getLeastBusy(imDoctors);
      }
    }
  }

  // Fallback - Assign to least busy among ALL active doctors
  console.log('ℹ️ No specific mapping found - assigning to least busy overall active doctor');
  return getLeastBusy(activeDoctorsList);
};