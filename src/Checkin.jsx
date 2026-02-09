import { doctors } from './doctorData';
import React, { useState, useContext, useEffect, useRef, useMemo } from "react";
import { PatientContext } from "./PatientContext";
import Sidebar from "@/components/Sidebar";
import PatientSidebar from "@/components/PatientSidebar";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QrCode, User, AlertCircle, Edit2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, Navigate } from "react-router-dom";
import Logo from "./assets/logo-valley.png";
import AppointmentPicker from "./components/AppointmentPicker";
import "./calendar.css";
import {
  registerWalkInPatient,
  registerAppointmentPatient
} from "./lib/supabaseClient";

//OUTDATED FILE
//THIS IS THE REGISTRATION FORMS: WALK-IN & APPOINTMENT (PATIENT UI AND CLINIC UI)
function Checkin() {
  //============= CONSTANTS & CONTEXT ==============
  const navigate = useNavigate();
  const { patients, addPatient, setActivePatient, activePatient, clearActivePatient, getAvailableSlots, isLoadingFromDB } = useContext(PatientContext);

  //=========== HELPER FUNCTIONS (URL PARAMS) ===========
  const getInitialViewMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromLogin = urlParams.get('from') === 'login';
    const isFromPatientSidebar = urlParams.get('from') === 'patient-sidebar';
    return (isPatientView || isFromLogin || isFromPatientSidebar) ? 'patient' : 'clinic';
  };

  const isFromQRCode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const hasFromParam = urlParams.get('from') !== null;
    return isPatientView && !hasFromParam;
  };

  const getInitialPatientAccess = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromLogin = urlParams.get('from') === 'login';
    const isFromPatientSidebar = urlParams.get('from') === 'patient-sidebar';
    return isPatientView || isFromLogin || isFromPatientSidebar;
  };

  const getInitialPatientType = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'walkin') return 'Walk-in';
    if (type === 'appointment') return 'Appointment';
    return null;
  };

  //ADDED to preserve data when users navigate to complete their profile
  const saveFormDataToTemp = () => {
    const currentEmail = localStorage.getItem('currentPatientEmail');
    if (currentEmail && isFromPatientSidebar) {
      const tempData = {
        symptoms: formData.symptoms,
        services: formData.services,
        appointmentDateTime: formData.appointmentDateTime,
        isPriority: formData.isPriority,
        priorityType: formData.priorityType,
        isReturningPatient: formData.isReturningPatient,
        expandedCategory: expandedCategory,
        bookingMode: bookingMode,
        selectedDoctor: selectedDoctor,
        timestamp: Date.now()
      };
      localStorage.setItem(`tempFormData_${currentEmail}`, JSON.stringify(tempData));
      console.log('💾 Saved form data temporarily:', tempData);
    }
  };

  const loadFormDataFromTemp = () => {
    const currentEmail = localStorage.getItem('currentPatientEmail');
    if (currentEmail) { // Removed strict check for isFromPatientSidebar
      const tempDataStr = localStorage.getItem(`tempFormData_${currentEmail}`);
      if (tempDataStr) {
        const tempData = JSON.parse(tempDataStr);

        // Only restore if data is less than 1 hour old
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - tempData.timestamp < oneHour) {
          console.log('📥 Restoring form data from temp storage:', tempData);

          setFormData(prev => ({
            ...prev,
            symptoms: tempData.symptoms || [],
            services: tempData.services || [],
            appointmentDateTime: tempData.appointmentDateTime || '',
            isPriority: tempData.isPriority || false,
            priorityType: tempData.priorityType || null,
            isReturningPatient: tempData.isReturningPatient || false,
          }));

          if (tempData.expandedCategory) {
            setExpandedCategory(tempData.expandedCategory);
          }

          if (tempData.bookingMode) {
            setBookingMode(tempData.bookingMode);
          }

          if (tempData.selectedDoctor) {
            setSelectedDoctor(tempData.selectedDoctor);
          }

          return true;
        } else {
          // Data is too old, remove it
          localStorage.removeItem(`tempFormData_${currentEmail}`);
          console.log('🗑️ Temp form data expired, removed');
        }
      }
    }
    return false;
  };

  //==================== STATE DECLARATIONS ====================
  const [viewMode, setViewMode] = useState(getInitialViewMode());
  const [isPatientAccess, setIsPatientAccess] = useState(getInitialPatientAccess());
  const [nav, setNav] = useState(false);
  const [selectedPatientType, setSelectedPatientType] = useState(getInitialPatientType());
  const [isQRCodeAccess, setIsQRCodeAccess] = useState(isFromQRCode());
  const [isFromPatientSidebar, setIsFromPatientSidebar] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('from') === 'patient-sidebar';
  });
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState(1);
  const [bookingMode, setBookingMode] = useState('service');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const currentPatientEmail = localStorage.getItem('currentPatientEmail');
  const isPatientLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

  const profileLoadedRef = useRef(false);
  const tempDataLoadedRef = useRef(false);
  const appointmentCheckDoneRef = useRef(false);
  const sessionClearedRef = useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phoneNum: "",
    physician: "",
    symptoms: [],
    services: [],
    appointmentDateTime: "",
    daysSinceOnSet: "",
    isPriority: false,
    priorityType: null,
    isReturningPatient: false,
    otherSymptomText: "",
  });

  const symptomsList = [
    'Fever', 'Cough', 'Sore Throat', 'Headache', 'Stomach Pain',
    'Vomiting', 'Diarrhea', 'Rash', 'Ear Pain', 'Runny Nose',
    'Difficulty Breathing', 'Itching', 'Other'
  ];

  const serviceCategories = [
    {
      id: "general",
      label: "General Consultation",
      services: [
        { id: "pedia", label: "Pediatric Consultation" },
        { id: "adult", label: "Adult Consultation" },
        { id: "senior", label: "Senior Consultation (60+)" },
        { id: "preventive", label: "Preventive/Annual Physical Exam" },
        { id: "follow-up", label: "Follow-up Consultation" },
      ],
    },
    {
      id: "hematology",
      label: "Hematology",
      services: [
        { id: "cbc", label: "CBC (Complete Blood Count)" },
        { id: "platelet", label: "Platelet Count" },
        { id: "esr", label: "ESR (Inflammation Check)" },
        { id: "abo", label: "Blood Type Test: ABO/Rh Typing" },
      ],
    },
    {
      id: "immunology",
      label: "Immunology & Serology",
      services: [
        { id: "hbsag", label: "HBsAg (Hepatitis B Screening)" },
        { id: "vdrl", label: "VDRL/RPR (Syphilis Screening)" },
        { id: "antiHCV", label: "Anti-HCV (Hepatitis C Screening)" },
        { id: "hpylori", label: "H.PYLORI (H. pylori Stomach Bacteria Test)" },
        { id: "dengueIg", label: "Dengue IgG+IgM (Dengue Fever Screening: Past/Current)" },
        { id: "dengueNs1", label: "Dengue NS1 (Early Dengue Fever Test)" },
        { id: "dengueDuo", label: "Dengue Duo: NS1, IgG+IgM (Complete Dengue Test)" },
        { id: "typhidot", label: "Typhidot (Typhoid Fever Test)" },
      ],
    },
    {
      id: "chemistry",
      label: "Clinical Chemistry",
      services: [
        { id: "fbs", label: "FBS (Fasting Blood Sugar)" },
        { id: "rbs", label: "RBS (Random Blood Sugar)" },
        { id: "lipid", label: "Lipid Profile (Cholesterol and Fats Check)" },
        { id: "totalCh", label: "Total Cholesterol" },
        { id: "triglycerides", label: "Triglycerides (Blood Fats)" },
        { id: "hdl", label: "HDL (Good Cholesterol)" },
        { id: "ldl", label: "LDL (Bad Cholesterol)" },
        { id: "alt", label: "ALT/SGPT (Liver Function Test)" },
        { id: "ast", label: "AST/SGOT (Liver Function Test)" },
        { id: "uric", label: "Uric Acid" },
        { id: "creatinine", label: "Creatinine (Kidney Function Test)" },
        { id: "bun", label: "Bun (Kidney Function Test)" },
        { id: "hba1c", label: "HBA1C (Long-Term Blood Sugar)" },
        { id: "albumin", label: "Albumin (Protein in blood)" },
        { id: "magnesium", label: "Magnesium" },
        { id: "totalProtein", label: "Total Protein (present in blood)" },
        { id: "alp", label: "ALP (Bone and Liver Enzyme)" },
        { id: "phosphorus", label: "Phosphorus" },
        { id: "sodium", label: "Sodium" },
        { id: "potassium", label: "Potassium" },
        { id: "ionizedCal", label: "Ionized Calcium (Free Calcium Level)" },
        { id: "totalCal", label: "Total Calcium" },
        { id: "chloride", label: "Chloride" },
      ],
    },
    {
      id: "microscopy",
      label: "Clinical Microscopy & Parasitology",
      services: [
        { id: "urinalysis", label: "Urinalysis" },
        { id: "fecalysis", label: "Fecalysis (Stool Test)" },
        { id: "pregnancyT", label: "Pregnancy Test" },
        { id: "fecal", label: "Fecal Occult Blood (Hidden Blood in Stool)" },
        { id: "semen", label: "Semen Analysis" },
      ],
    },
    {
      id: "surgery",
      label: "Surgery",
      services: [
        { id: "general surgery", label: "General Surgery Consultation" },
        { id: "ent", label: "ENT (Ear, Nose, Throat) Consultation" },
        { id: "orthopedic", label: "Orthopedic Surgery Consultation" }
      ]
    },
    {
      id: "others",
      label: "Others",
      services: [
        { id: "tsh", label: "TSH (Thyroid Stimulating Hormone)" },
        { id: "ft3", label: "FT3 (Free T3 Thyroid Hormone)" },
        { id: "75g", label: "75 Grams OGTT (Diabetes Glucose Challenge Test)" },
        { id: "t4", label: "T4 (T4 Thyroid Hormone)" },
        { id: "t3", label: "T3 (T3 Thyroid Hormone)" },
        { id: "psa", label: "PSA (Prostate Health Screening)" },
        { id: "totalBilirubin", label: "Total/ Direct Bilirubin (Jaundice Check)" },
      ],
    },
  ];



  const availableDoctors = doctors;

  const isDoctorAvailable = (doctor, appointmentDateTime) => {
    if (!appointmentDateTime) return true;

    // ✅ ADDED: Always show "By Appointment Only" doctors
    if (doctor.schedule && doctor.schedule.includes("By Appointment Only")) {
      return true;
    }

    const appointmentDate = new Date(appointmentDateTime);
    const dayOfWeek = appointmentDate.getDay();
    const appointmentHour = appointmentDate.getHours() + (appointmentDate.getMinutes() / 60);
    const weekOfMonth = Math.ceil(appointmentDate.getDate() / 7);

    return doctor.availability.some(slot => {
      if (!slot.days.includes(dayOfWeek)) {
        return false;
      }

      if (appointmentHour < slot.startHour || appointmentHour >= slot.endHour) {
        return false;
      }

      if (slot.weeksOfMonth && !slot.weeksOfMonth.includes(weekOfMonth)) {
        return false;
      }

      return true;
    });
  };

  // Determine if we are starting a NEW booking flow (e.g. from Guest button or Sidebar)
  const isNewBooking = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('type') === 'appointment' || urlParams.get('view') === 'patient';
  }, [window.location.search]);

  //==================== EVENT HANDLERS ====================
  const handleNav = () => setNav(!nav);

  const handlePriorityChange = (checked) => {
    setFormData(prev => ({ ...prev, isPriority: checked, priorityType: checked ? prev.priorityType : null }));
  };

  const handlePriorityTypeChange = (value) => {
    setFormData(prev => ({ ...prev, priorityType: value }));
  };

  const toggleCategory = (id) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSymptomChange = (symptom, isChecked) => {
    setFormData((prev) => {
      const symptoms = prev.symptoms;
      if (isChecked && !symptoms.includes(symptom)) return { ...prev, symptoms: [...symptoms, symptom] };
      if (!isChecked) return { ...prev, symptoms: symptoms.filter(s => s !== symptom) };
      return prev;
    });
  };

  const handleServiceChange = (serviceId, isChecked) => {
    setFormData((prev) => {
      const services = prev.services;
      if (isChecked && !services.includes(serviceId)) return { ...prev, services: [...services, serviceId] };
      if (!isChecked) return { ...prev, services: services.filter(s => s !== serviceId) };
      return prev;
    });
  };

  const handleDoctorSelect = (doctorId) => {
    const doctor = availableDoctors.find(d => d.id === doctorId);
    setSelectedDoctor(doctor);

    if (doctor && !formData.services.includes('follow-up')) {
      setFormData(prev => ({
        ...prev,
        services: ['follow-up']
      }));
    }
  };

  const showMessage = (title, message, isSuccess = true) => {
    document.getElementById("message-box").innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm text-center">
          <h3 class="text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'} mb-4">${title}</h3>
          <p class="text-gray-700 mb-4">${message}</p>
          <button onclick="document.getElementById('message-box').innerHTML=''" class="bg-${isSuccess ? 'green' : 'red'}-600 text-white px-4 py-2 rounded-md hover:bg-${isSuccess ? 'green' : 'red'}-700">Close</button>
        </div>
      </div>
    `;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      age: "",
      phoneNum: "",
      physician: "",
      symptoms: [],
      services: [],
      appointmentDateTime: "",
      daysSinceOnSet: "",
      isPriority: false,
      priorityType: null,
      isReturningPatient: false,
      otherSymptomText: "",
    });
    setExpandedCategory(null);
    setAvailableSlots(1);
    setBookingMode('service');
    setSelectedDoctor(null);
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSubmit = {
      ...formData,
      name: formData.name || "Guest Patient",
      fullName: formData.name || "Guest Patient",
      // Handle "Other" symptom
      symptoms: formData.symptoms.map(s =>
        s === 'Other' ? `Other: ${formData.otherSymptomText}` : s
      ),
      // If booking by doctor, clear services. If by service, clear physician.
      services: bookingMode === 'doctor' ? [] : formData.services,
      physician: bookingMode === 'doctor' && selectedDoctor ? selectedDoctor.name : null
    };

    try {
      if (isFromPatientSidebar) {
        if (!formData.name || !formData.age || !formData.phoneNum) {
          showMessage(
            "Profile Incomplete",
            "Please complete your profile in Settings before booking an appointment.",
            false
          );
          setIsSubmitting(false);
          return;
        }
      }
      let result;

      if (selectedPatientType === "Walk-in") {
        result = await registerWalkInPatient(dataToSubmit);
      } else if (selectedPatientType === "Appointment") {
        if (!formData.appointmentDateTime) {
          showMessage("Validation Error", "Please select appointment date and time.", false);
          setIsSubmitting(false);
          return;
        }

        if (bookingMode === 'doctor' && !selectedDoctor) {
          showMessage("Validation Error", "Please select a doctor for your appointment.", false);
          setIsSubmitting(false);
          return;
        }

        if (availableSlots <= 0) {
          showMessage("No Slots Available", "This time slot is fully booked. Please choose another time.", false);
          setIsSubmitting(false);
          return;
        }

        result = await registerAppointmentPatient(dataToSubmit, formData.appointmentDateTime);
      }

      if (result.success) {
        const currentPatientEmail = localStorage.getItem('currentPatientEmail');

        const normalizeName = (name) => {
          if (!name) return '';
          return name.toLowerCase().trim();
        };

        const findExistingPatient = () => {
          if (!formData.isReturningPatient) return null;
          const normalizedName = normalizeName(formData.name);
          for (const patient of patients) {
            if (patient.isInactive) continue;
            const existingNormalizedName = normalizeName(patient.name);
            if (normalizedName === existingNormalizedName) return patient;
          }
          return null;
        };

        const existingPatient = findExistingPatient();
        const dbPatient = selectedPatientType === "Walk-in" ? result.data : result.patient;
        const dbId = dbPatient?.id;
        const newPatient = {
          id: dbId,
          dbId: dbId,
          name: formData.name || "Guest Patient",
          age: formData.age,
          phoneNum: formData.phoneNum,
          type: selectedPatientType,
          symptoms: formData.symptoms.map(s =>
            s === 'Other' ? `Other: ${formData.otherSymptomText}` : s
          ),
          services: formData.services,
          appointmentDateTime: formData.appointmentDateTime || undefined,
          isPriority: formData.isPriority,
          priorityType: formData.priorityType,
          isReturningPatient: formData.isReturningPatient,
          patientEmail: currentPatientEmail || null,
          preferredDoctor: bookingMode === 'doctor' && selectedDoctor ? {
            id: selectedDoctor.id,
            name: selectedDoctor.name,
            specialization: selectedDoctor.specialization
          } : null,
          bookingMode: bookingMode,
          status: "waiting",
          appointmentStatus: selectedPatientType === "Appointment" ? "pending" : null,
          inQueue: selectedPatientType === "Walk-in", // Only walk-ins go directly to queue
          queueNo: dbPatient?.queue_no || (selectedPatientType === "Walk-in" ? (Math.max(0, ...patients.map(p => p.queueNo || 0)) + 1) : null)
        };

        if (existingPatient && formData.isReturningPatient) {
          const newNameCapitals = (formData.name.match(/[A-Z]/g) || []).length;
          const existingNameCapitals = (existingPatient.name.match(/[A-Z]/g) || []).length;
          if (existingNameCapitals >= newNameCapitals) {
            newPatient.name = existingPatient.name;
          }
          newPatient.age = formData.age;
          newPatient.phoneNum = formData.phoneNum || existingPatient.phoneNum;
        }

        if (selectedPatientType === "Walk-in") {
          newPatient.status = "waiting";
          newPatient.inQueue = true;
        } else if (selectedPatientType === "Appointment") {
          newPatient.status = "waiting";
          newPatient.appointmentStatus = "pending";
          newPatient.inQueue = false;
        }

        addPatient(newPatient);
        setActivePatient(newPatient);
        resetForm();

        const successMsg = selectedPatientType === "Walk-in"
          ? `Registration completed for ${newPatient.name}. You're in the queue!`
          : `Appointment request submitted for ${newPatient.name}. Please wait for confirmation.`;

        showMessage("Success", successMsg, true);

        setTimeout(() => {
          const currentEmail = localStorage.getItem('currentPatientEmail');
          if (currentEmail) {
            localStorage.removeItem(`tempFormData_${currentEmail}`);
            console.log('🗑️ Cleared temp form data after successful submission');
          }

          const params = new URLSearchParams();
          if (isPatientAccess) params.append('view', 'patient');
          if (isFromPatientSidebar) params.append('from', 'patient-sidebar');
          navigate(`/qstatus${params.toString() ? '?' + params.toString() : ''}`);
        }, 1000);
      } else {
        showMessage("Error", result.error, false);
      }
    } catch (err) {
      console.error("Patient submission error:", err);
      showMessage("Error", err.message || "Unexpected error occurred.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  //==================== USE EFFECTS ====================
  useEffect(() => {
    if (selectedDoctor && formData.appointmentDateTime && bookingMode === 'doctor') {
      const isStillAvailable = isDoctorAvailable(selectedDoctor, formData.appointmentDateTime);
      if (!isStillAvailable) {
        console.log(`⚠️ ${selectedDoctor.name} is not available at selected time, clearing selection`);
        setSelectedDoctor(null);
      }
    }
  }, [formData.appointmentDateTime, selectedDoctor, bookingMode]);

  useEffect(() => {
    if (formData.appointmentDateTime && typeof getAvailableSlots === 'function') {
      const slots = getAvailableSlots(formData.appointmentDateTime);
      setAvailableSlots(slots);
    }
  }, [formData.appointmentDateTime, getAvailableSlots]);

  // ✅ NEW: Clear active patient session ONLY ONCE when entering a new booking flow
  useEffect(() => {
    if (isNewBooking && !sessionClearedRef.current) {
      console.log("🧹 New booking detected - clearing active patient session.");
      clearActivePatient();
      sessionClearedRef.current = true;
    }
  }, [isNewBooking, clearActivePatient]);

  // ✅ NEW: Auto-save form data whenever it changes
  useEffect(() => {
    // Check if user is logged in (has email) and booking an appointment
    const currentEmail = localStorage.getItem('currentPatientEmail');

    if (currentEmail && selectedPatientType === 'Appointment') {
      // Debounce slightly to avoid excessive writes
      const timeoutId = setTimeout(() => {
        const tempData = {
          symptoms: formData.symptoms,
          services: formData.services,
          appointmentDateTime: formData.appointmentDateTime,
          isPriority: formData.isPriority,
          priorityType: formData.priorityType,
          isReturningPatient: formData.isReturningPatient,
          expandedCategory: expandedCategory,
          bookingMode: bookingMode,
          selectedDoctor: selectedDoctor,
          otherSymptomText: formData.otherSymptomText,
          timestamp: Date.now()
        };
        localStorage.setItem(`tempFormData_${currentEmail}`, JSON.stringify(tempData));
        console.log('💾 Auto-saved form data:', tempData);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, expandedCategory, bookingMode, selectedDoctor, selectedPatientType, isNewBooking]);

  useEffect(() => {
    // Check validation based on login status rather than just sidebar source
    const currentEmail = localStorage.getItem('currentPatientEmail');
    if (currentEmail && selectedPatientType && !profileLoadedRef.current) {
      try {
        const userProfileStr = localStorage.getItem(`userProfile_${currentEmail}`);
        if (userProfileStr) {
          const userProfile = JSON.parse(userProfileStr);

          console.log('📋 Loading profile data for:', currentEmail);
          console.log('📋 Profile data:', userProfile);

          setFormData(prev => ({
            ...prev,
            name: userProfile.fullName || prev.name,
            age: userProfile.age || prev.age,
            phoneNum: userProfile.phoneNumber || prev.phoneNum,
          }));

          profileLoadedRef.current = true;
          console.log('✅ Profile loaded and marked');
        } else {
          console.log('⚠️ No profile found for:', currentEmail);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }

    if (!selectedPatientType) {
      profileLoadedRef.current = false;
    }
  }, [selectedPatientType]);

  // ✅ RESTORE DATA: Load temp data on mount or when patient type is selected
  useEffect(() => {
    const currentEmail = localStorage.getItem('currentPatientEmail');

    // Attempt to load data if user is logged in and (is selecting a type OR already selected appointment)
    if (currentEmail && (selectedPatientType || !tempDataLoadedRef.current)) {
      const restored = loadFormDataFromTemp();
      if (restored) {
        tempDataLoadedRef.current = true;
        console.log('✅ Successfully restored previous form selections');

        // If we restored data and it has a booking mode, ensure we set the patient type to Appointment if not set
        if (!selectedPatientType) {
          setSelectedPatientType("Appointment");
        }
      }
    }

    if (!selectedPatientType) {
      tempDataLoadedRef.current = false;
    }
  }, [selectedPatientType]); // Run when patient type changes

  // ✅✅✅ COMPLETELY REWRITTEN - This is the fix!
  useEffect(() => {
    // Only check once when component mounts or when we return from settings
    if (appointmentCheckDoneRef.current) {
      return; // Already checked, don't check again
    }

    // Only check if we're in patient sidebar view and NOT selecting a patient type
    if (!isFromPatientSidebar || selectedPatientType || !isPatientLoggedIn) {
      return;
    }

    const currentPatientEmail = localStorage.getItem('currentPatientEmail');
    if (!currentPatientEmail) {
      return;
    }

    // Find existing appointment - do this INSIDE useEffect, not in useMemo
    const myActiveAppointment = patients.find(p =>
      p.type === 'Appointment' &&
      p.patientEmail &&
      p.patientEmail.toLowerCase().trim() === currentPatientEmail.toLowerCase().trim() &&
      (p.appointmentStatus === 'pending' || p.appointmentStatus === 'accepted') &&
      !p.isInactive
    );

    if (myActiveAppointment) {
      console.log('✅ Found existing appointment, setting active patient');
      appointmentCheckDoneRef.current = true;
      setActivePatient(myActiveAppointment);
    }

    // ✅✅✅ KEY FIX: Only depend on length, not the whole array!
  }, [isFromPatientSidebar, selectedPatientType, isPatientLoggedIn, patients?.length]);

  // Reset the ref when patient type is selected (so we can check again if they go back)
  useEffect(() => {
    if (selectedPatientType) {
      appointmentCheckDoneRef.current = false;
    }
  }, [selectedPatientType]);

  // ✅ Navigation redirect - simple and clean
  // GUARD: Do NOT redirect if we are starting a NEW booking flow (e.g. Guest flow or sidebar button)
  if (activePatient && !isNewBooking) {
    const params = new URLSearchParams();
    if (isPatientAccess) params.append('view', 'patient');
    if (isFromPatientSidebar) params.append('from', 'patient-sidebar');
    return <Navigate to={`/qstatus${params.toString() ? '?' + params.toString() : ''}`} replace />;
  }


  // === CLINIC VIEW ===
  if (viewMode === 'clinic' && !isPatientAccess) {
    return (
      <div className="flex w-full min-h-screen">
        <Sidebar nav={nav} handleNav={handleNav} />
        <div className="flex-1 min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 ml-0 md:ml-52 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-t-4 border-green-600">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <img src={Logo} alt="Clinic Logo" className="w-48 h-auto" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-green-700 mb-2">Patient Check-In System</CardTitle>
              <p className="text-gray-600 text-sm sm:text-base">De Valley Medical Clinic Queue Management</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-8 rounded-xl border-2 border-green-200 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <QRCodeSVG
                    value={`${import.meta.env.VITE_APP_URL}/checkin?view=patient&type=walkin`}
                    size={200} level="H" marginSize={4} className="w-48 h-48 sm:w-64 sm:h-64"
                  />
                </div>
                <p className="text-center text-gray-700 font-medium text-lg mb-2 mt-4">Scan to Register</p>
                <p className="text-center text-gray-500 text-sm max-w-md">Patients can scan this QR code to access the registration form.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled><QrCode className="w-5 h-5 mr-2" />Clinic View (Current)</Button>
                <Button onClick={() => { setViewMode('patient'); setIsPatientAccess(false); setIsQRCodeAccess(false); }} variant="outline" className="flex-1 border-green-600 text-green-600 hover:bg-green-50"><User className="w-5 h-5 mr-2" />Switch to Patient View</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === PATIENT UI CONTROLS === 
  if (!selectedPatientType) {
    const isFromSidebar = isFromPatientSidebar;
    return (
      <div className={isFromSidebar ? "flex w-full min-h-screen" : "min-h-screen bg-gray-50 flex items-center justify-center p-4"}>
        {isFromSidebar && <PatientSidebar nav={nav} handleNav={handleNav} />}
        <div className={isFromSidebar ? "flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4" : "w-full flex justify-center"}>
          <Card className="w-full max-w-md shadow-xl border-t-4 border-green-600">
            {!isFromSidebar && (
              <div className="p-4 border-b border-gray-200">
                <Button onClick={() => isPatientAccess ? navigate('/') : setViewMode('clinic')} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">← Back</Button>
              </div>
            )}
            <div className="flex justify-center items-center mt-4"><img src={Logo} alt="Logo" className="w-[190px] h-auto" /></div>
            <CardHeader><CardTitle className="text-center text-green-700">Patient Registration</CardTitle></CardHeader>
            <CardContent className="flex flex-col space-y-4">
              <Button className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg" onClick={() => setSelectedPatientType("Appointment")}>Book Appointment</Button>
              {isQRCodeAccess && <Button className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg" onClick={() => setSelectedPatientType("Walk-in")}>Walk-in Registration</Button>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Patient Registration Forms
  return (
    <div className={isFromPatientSidebar ? "flex w-full min-h-screen" : "min-h-screen bg-gray-50 flex items-center justify-center p-4"}>
      {isFromPatientSidebar && <PatientSidebar nav={nav} handleNav={handleNav} />}
      <div className={isFromPatientSidebar ? "flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4" : "w-full flex justify-center"}>
        <Card className="w-full max-w-lg shadow-xl border-t-4 border-green-600 my-8">
          {!isFromPatientSidebar && (
            <div className="p-4 border-b border-gray-200">
              <Button onClick={() => isPatientAccess ? navigate('/') : setViewMode('clinic')} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">← Back</Button>
            </div>
          )}
          <CardHeader><CardTitle className="text-center text-green-700">{selectedPatientType === "Appointment" ? "Book Appointment" : "Walk-in Registration"}</CardTitle></CardHeader>
          <CardContent>
            {selectedPatientType === "Appointment" && (
              <div className="space-y-4 mb-6">
                <AppointmentPicker
                  key="stable-appointment-picker" // Fixed key stops the reset
                  selectedDateTime={formData.appointmentDateTime}
                  onDateTimeChange={(dateTime) => {
                    setFormData(prev => {
                      // Only update if the time actually changed
                      if (prev.appointmentDateTime === dateTime) return prev;
                      return { ...prev, appointmentDateTime: dateTime };
                    });
                  }}
                  getAvailableSlots={getAvailableSlots}
                />
              </div>
            )}
            <form onSubmit={handlePatientSubmit} className="space-y-6">
              {/* PROFILE INFO - Only show for logged-in users */}
              {isFromPatientSidebar && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-green-600 p-2 rounded-full">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 mb-1">Booking For:</h3>
                      <p className="text-sm text-green-700">Your profile information will be used for this appointment</p>
                    </div>
                  </div>

                  {formData.name && formData.age && formData.phoneNum ? (
                    <div className="space-y-2 bg-white p-4 rounded-md border border-green-200">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600 font-medium">Name:</span>
                        <span className="font-semibold text-gray-900">{formData.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600 font-medium">Age:</span>
                        <span className="font-semibold text-gray-900">{formData.age} years</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 font-medium">Phone:</span>
                        <span className="font-semibold text-gray-900">{formData.phoneNum}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            saveFormDataToTemp();
                            navigate('/patient-settings?from=patient-sidebar');
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Update Profile Information
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800 mb-2">Profile Not Complete</p>
                          <p className="text-xs text-yellow-700 mb-3">
                            Please complete your profile to book appointments quickly and easily.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={() => {
                              console.log('🔘 Complete Profile button clicked');
                              saveFormDataToTemp();
                              console.log('✅ Form data saved, navigating to settings...');
                              setTimeout(() => {
                                navigate('/patient-settings?from=patient-sidebar');
                              }, 100);
                            }}
                          >
                            Complete Profile Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADD BOOKING MODE SELECTION FOR APPOINTMENTS */}
              {selectedPatientType === "Appointment" && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
                  <Label className="text-blue-800 font-bold mb-3 block">Book your appointment by:</Label>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode('service');
                        setSelectedDoctor(null);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${bookingMode === 'service'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-semibold text-sm">Service</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode('doctor');
                        setFormData(prev => ({ ...prev, services: [] }));
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${bookingMode === 'doctor'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-semibold text-sm">Doctor</span>
                      </div>
                    </button>
                  </div>

                  <p className="text-xs text-blue-700">
                    {bookingMode === 'service'
                      ? 'Choose the medical services you need, and we\'ll assign the appropriate doctor.'
                      : 'Select a specific doctor you\'d like to see for your appointment.'}
                  </p>
                </div>
              )}

              {/* Only show input fields if NOT from patient sidebar */}
              {!isFromPatientSidebar && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="name">Full Name *</Label><Input id="name" type="text" value={formData.name} onChange={handleInputChange} required /></div>
                    <div className="space-y-2"><Label htmlFor="age">Age *</Label><Input id="age" type="number" value={formData.age} onChange={handleInputChange} required /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="phoneNum">Phone Number *</Label><Input id="phoneNum" type="tel" value={formData.phoneNum} onChange={handleInputChange} required /></div>
                </>
              )}

              <div className="space-y-3 p-4 rounded-lg border-2 border-blue-300 bg-blue-50">
                <Label className="text-blue-800 font-bold">Are you a new or returning patient? *</Label>
                <div className="space-y-3">
                  <div className="flex items-center"><input type="radio" id="newPatient" name="patientType" checked={!formData.isReturningPatient} onChange={() => setFormData(p => ({ ...p, isReturningPatient: false }))} className="h-4 w-4" required /><Label htmlFor="newPatient" className="ml-2">New Patient</Label></div>
                  <div className="flex items-center"><input type="radio" id="returningPatient" name="patientType" checked={formData.isReturningPatient} onChange={() => setFormData(p => ({ ...p, isReturningPatient: true }))} className="h-4 w-4" required /><Label htmlFor="returningPatient" className="ml-2">Returning Patient</Label></div>
                </div>
              </div>

              {selectedPatientType === "Walk-in" && (
                <div className="space-y-3 p-4 rounded-lg border-2 border-purple-300 bg-purple-50">
                  <div className="flex items-center justify-between"><Label className="text-purple-700 font-bold">Priority Patient</Label><input type="checkbox" id="isPriority" checked={formData.isPriority} onChange={(e) => handlePriorityChange(e.target.checked)} className="h-5 w-5" /></div>
                  {formData.isPriority && (
                    <div className="space-y-3 pl-2">
                      <div className="flex items-center"><input type="radio" id="pwd" name="priorityType" value="PWD" checked={formData.priorityType === "PWD"} onChange={(e) => handlePriorityTypeChange(e.target.value)} className="h-4 w-4" /><Label htmlFor="pwd" className="ml-2">PWD</Label></div>
                      <div className="flex items-center"><input type="radio" id="pregnant" name="priorityType" value="Pregnant" checked={formData.priorityType === "Pregnant"} onChange={(e) => handlePriorityTypeChange(e.target.value)} className="h-4 w-4" /><Label htmlFor="pregnant" className="ml-2">Pregnant</Label></div>
                      <div className="flex items-center"><input type="radio" id="senior" name="priorityType" value="Senior" checked={formData.priorityType === "Senior"} onChange={(e) => handlePriorityTypeChange(e.target.value)} className="h-4 w-4" /><Label htmlFor="senior" className="ml-2">Senior Citizen</Label></div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 p-4 rounded-lg border border-green-300">
                <Label className="text-green-700 font-bold">Symptoms</Label>
                {symptomsList.map(symptom => (
                  <div key={symptom} className="space-y-2">
                    <div className="flex items-center">
                      <input type="checkbox" id={symptom} checked={formData.symptoms.includes(symptom)} onChange={(e) => handleSymptomChange(symptom, e.target.checked)} className="h-4 w-4" />
                      <Label htmlFor={symptom} className="ml-2">{symptom}</Label>
                    </div>
                    {symptom === 'Other' && formData.symptoms.includes('Other') && (
                      <div className="ml-6 mt-1">
                        <Input
                          id="otherSymptomText"
                          placeholder="Please specify your symptoms"
                          value={formData.otherSymptomText}
                          onChange={handleInputChange}
                          className="border-green-300 focus:ring-green-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DOCTOR SELECTION SECTION */}
              {selectedPatientType === "Appointment" && bookingMode === 'doctor' && (
                <div className="space-y-3 p-4 rounded-lg border border-indigo-300 bg-indigo-50">
                  <Label className="text-indigo-800 font-bold">Select Doctor *</Label>

                  {!formData.appointmentDateTime && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          Please select an appointment date and time first to see available doctors.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableDoctors.map(doctor => {
                      const isAvailable = isDoctorAvailable(doctor, formData.appointmentDateTime);

                      return (
                        <div
                          key={doctor.id}
                          onClick={() => isAvailable && handleDoctorSelect(doctor.id)}
                          className={`p-4 rounded-lg border-2 transition-all ${!isAvailable
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300'
                            : selectedDoctor?.id === doctor.id
                              ? 'border-indigo-600 bg-indigo-100 shadow-md cursor-pointer'
                              : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900">{doctor.name}</h4>
                                {!isAvailable && formData.appointmentDateTime && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                    Not Available
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{doctor.specialization}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{doctor.schedule}</span>
                              </div>
                            </div>

                            {selectedDoctor?.id === doctor.id && isAvailable && (
                              <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedDoctor && (
                    <div className="mt-3 p-3 bg-indigo-100 rounded-md">
                      <p className="text-sm text-indigo-900">
                        <strong>Selected:</strong> {selectedDoctor.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(selectedPatientType === "Walk-in" || bookingMode === 'service') && (
                <div className="space-y-3 p-4 rounded-lg border border-green-300 bg-green-50">
                  <Label className="text-green-700 font-bold">Select Services</Label>
                  {serviceCategories.map(cat => (
                    <div key={cat.id} className="pt-2 border-b last:border-b-0">
                      <div className="cursor-pointer flex justify-between font-semibold text-green-700" onClick={() => toggleCategory(cat.id)}>{cat.label} <span>{expandedCategory === cat.id ? "▲" : "▼"}</span></div>
                      {expandedCategory === cat.id && (
                        <div className="ml-2 mt-2 space-y-2">
                          {cat.services.map(svc => (
                            <div key={svc.id} className="flex items-center"><input type="checkbox" id={svc.id} checked={formData.services.includes(svc.id)} onChange={(e) => handleServiceChange(svc.id, e.target.checked)} className="h-4 w-4" /><Label htmlFor={svc.id} className="ml-2">{svc.label}</Label></div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg" disabled={isSubmitting || (selectedPatientType === "Appointment" && availableSlots <= 0)}>
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                </Button>
                <Button type="button" className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800" onClick={() => setSelectedPatientType(null)}>← Back</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div id="message-box"></div>
      </div>
    </div>
  );
}

export default Checkin;