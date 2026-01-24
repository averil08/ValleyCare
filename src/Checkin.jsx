import React, { useState, useContext, useEffect } from "react";
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

//THIS IS THE REGISTRATION FORMS: WALK-IN & APPOINTMENT (PATIENT UI AND CLINIC UI)
function Checkin() {
  //============= CONSTANTS & CONTEXT ==============
  const navigate = useNavigate();
  const { patients, addPatient, activePatient, setActivePatient, getAvailableSlots } = useContext(PatientContext);

  //=========== HELPER FUNCTIONS (URL PARAMS) ===========
  const getInitialViewMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromLogin = urlParams.get('from') === 'login';
    const isFromPatientSidebar = urlParams.get('from') === 'patient-sidebar';
    return (isPatientView || isFromLogin || isFromPatientSidebar) ? 'patient' : 'clinic';
  };

  // Add this NEW function
  const isFromQRCode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    // QR code has view=patient but NO 'from' parameter
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
  const currentPatientEmail = localStorage.getItem('currentPatientEmail');
  const isPatientLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';
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
  });

  //============== STATIC DATA ===============
  const symptomsList = [
    'Fever','Cough','Sore Throat','Headache','Stomach Pain',
    'Vomiting','Diarrhea','Rash','Ear Pain','Runny Nose',
    'Difficulty Breathing','Itching'
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
    });
    setExpandedCategory(null);
    setAvailableSlots(1);
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 🆕 ADD THIS VALIDATION for logged-in users
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
        result = await registerWalkInPatient(formData);
      } else if (selectedPatientType === "Appointment") {
        if (!formData.appointmentDateTime) {
          showMessage("Validation Error", "Please select appointment date and time.", false);
          setIsSubmitting(false);
          return;
        }

        if (availableSlots <= 0) {
          showMessage("No Slots Available", "This time slot is fully booked. Please choose another time.", false);
          setIsSubmitting(false);
          return;
        }

        result = await registerAppointmentPatient(formData, formData.appointmentDateTime);
      }

      if (result.success) {
        // Store patient email if they're registering from patient view
        const currentPatientEmail = localStorage.getItem('currentPatientEmail');
        // Helper function to normalize name for exact matching
        const normalizeName = (name) => {
          if (!name) return '';
          return name.toLowerCase().trim();
        };

        // Helper function to find existing patient by exact name match
        const findExistingPatient = () => {
          if (!formData.isReturningPatient) return null;

          const normalizedName = normalizeName(formData.name);

          for (const patient of patients) {
            if (patient.isInactive) continue;
            
            const existingNormalizedName = normalizeName(patient.name);

            if (normalizedName === existingNormalizedName) {
              return patient;
            }
          }
          return null;
        };

        const existingPatient = findExistingPatient();

        const newPatient = {
          name: formData.name,
          age: formData.age,
          phoneNum: formData.phoneNum,
          type: selectedPatientType,
          symptoms: formData.symptoms,
          services: formData.services,
          queueNo: patients.length + 1,
          appointmentDateTime: formData.appointmentDateTime || undefined,
          isPriority: formData.isPriority,
          priorityType: formData.priorityType,
          isReturningPatient: formData.isReturningPatient,
          // Store patient email to link this registration to logged-in user
          patientEmail: currentPatientEmail || null,
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
        
        if (selectedPatientType === "Walk-in") {
          showMessage("Success", `Registration completed for ${formData.name}. You're in the queue!`, true);
        } else {
          showMessage("Success", `Appointment request submitted for ${formData.name}. Please wait for confirmation.`, true);
        }

        setTimeout(() => {
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
    if (formData.appointmentDateTime) {
      const slots = getAvailableSlots(formData.appointmentDateTime);
      setAvailableSlots(slots);
    }
  }, [formData.appointmentDateTime, getAvailableSlots, patients]);

  // 🆕 ADD THIS: Auto-load user profile for logged-in patients
  useEffect(() => {
    if (isFromPatientSidebar && selectedPatientType) {
      try {
        const userProfileStr = localStorage.getItem('userProfile');
        if (userProfileStr) {
          const userProfile = JSON.parse(userProfileStr);
          
          console.log('📋 Loading profile data:', userProfile);
          
          // Auto-fill form data silently (will be submitted but not shown)
          setFormData(prev => ({
            ...prev,
            name: userProfile.fullName || prev.name,
            age: userProfile.age || prev.age,
            phoneNum: userProfile.phoneNumber || prev.phoneNum,
          }));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  }, [isFromPatientSidebar, selectedPatientType]);

  // 🆕 CHECK FOR EXISTING APPOINTMENT - Redirect if found
  useEffect(() => {
    if (isFromPatientSidebar && !selectedPatientType && isPatientLoggedIn) {
      const currentPatientEmail = localStorage.getItem('currentPatientEmail');
      
      if (currentPatientEmail) {
        // Find if this patient has an active appointment
        const myActiveAppointment = patients.find(p => 
          p.type === 'Appointment' &&
          p.patientEmail &&
          p.patientEmail.toLowerCase().trim() === currentPatientEmail.toLowerCase().trim() &&
          (p.appointmentStatus === 'pending' || p.appointmentStatus === 'accepted') &&
          !p.isInactive
        );

        if (myActiveAppointment) {
          console.log('✅ Found existing appointment, redirecting...');
          setActivePatient(myActiveAppointment);
          // Will trigger the Navigate component at the top
        }
      }
    }
  }, [isFromPatientSidebar, selectedPatientType, isPatientLoggedIn, patients, setActivePatient]);

  //conditional returns
  if (activePatient) {
    const params = new URLSearchParams();
    if (isPatientAccess) params.append('view', 'patient');
    if (isFromPatientSidebar) params.append('from', 'patient-sidebar');
    return <Navigate to={`/qstatus${params.toString() ? '?' + params.toString() : ''}`} />;
  }

  // === CLINIC VIEW ===
  if (viewMode === 'clinic' && !isPatientAccess) {
    //isPatientAccess determines if you're accessing as patient or clinic staff. It controls which sidebar (sidebar or patientsidebar) to show and which nav path to use
    return (
      <div className="flex w-full min-h-screen">
        <Sidebar nav={nav} handleNav={handleNav} />

        <div className="flex-1 min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 ml-0 md:ml-52 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-t-4 border-green-600">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <img src={Logo} alt="Clinic Logo" className="w-48 h-auto" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-green-700 mb-2">
                Patient Check-In System
              </CardTitle>
              <p className="text-gray-600 text-sm sm:text-base">
                De Valley Medical Clinic Queue Management
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-white p-8 rounded-xl border-2 border-green-200 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                {/*when qr code scanned it redirects to /checkin?view=patient&type=walkin (walkin registration form) */}
                  <QRCodeSVG 
                    value={`${import.meta.env.VITE_APP_URL}/checkin?view=patient&type=walkin`}
                    size={200}
                    level="H"
                    marginSize={4}
                    className="w-48 h-48 sm:w-64 sm:h-64"
                  />
                </div>
                <p className="text-center text-gray-700 font-medium text-lg mb-2 mt-4">
                  Scan to Register
                </p>
                <p className="text-center text-gray-500 text-sm max-w-md">
                  Patients can scan this QR code with their mobile device to access the registration form and join the queue.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Clinic View (Current)
                </Button>
                <Button 
                onClick={() => {
                  setViewMode('patient');
                  setIsPatientAccess(false); // Mark as staff-initiated
                  setIsQRCodeAccess(false);
                }}
                variant="outline"
                className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
              >
                <User className="w-5 h-5 mr-2" />
                Switch to Patient View
              </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="text-amber-800">
                  <strong>Note:</strong> This is the clinic view showing the QR code for patients to scan. 
                  Click "Switch to Patient View" to see what patients will interact with.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === PATIENT UI CONTROLS ONLY STARTS HERE === 
  if (!selectedPatientType) {
    // seelctedPatientType determines which service type is chosen (Appointment or Walk-in) to show whether selection screen or direct registration form
    if (isFromPatientSidebar) {
      return (
        <div className="flex w-full min-h-screen">
          <PatientSidebar nav={nav} handleNav={handleNav} />
          
          <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-green-600">
              <div className="flex justify-center items-center mt-4">
                <img src={Logo} alt="Logo" className="w-[190px] h-auto" />
              </div>

              <CardHeader>
                <CardTitle className="text-center text-green-700">Patient Registration</CardTitle>
                <p className="text-center text-sm text-gray-500">Choose how you'd like to register</p>
              </CardHeader>
              
              <CardContent className="flex flex-col space-y-4">
                <Button 
                  className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg"
                  onClick={() => setSelectedPatientType("Appointment")}
                >
                  Book Appointment
                </Button>
                {/*<Button 
                  className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg"
                  onClick={() => setSelectedPatientType("Walk-in")}
                >
                  Walk-in Registration
                </Button>*/}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Original patient view (from QR code or direct patient access)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-green-600">
          <div className="p-4 border-b border-gray-200">
            <Button 
              onClick={() => {
                if (isPatientAccess) {
                  navigate('/');
                } else {
                  setViewMode('clinic');
                }
              }}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              {isPatientAccess ? '← Back to Clinic Login' : '← Back to Clinic View'}
            </Button>
          </div>

          <div className="flex justify-center items-center mt-4">
            <img src={Logo} alt="Logo" className="w-[190px] h-auto" />
          </div>

          <CardHeader>
            <CardTitle className="text-center text-green-700">Patient Registration</CardTitle>
            <p className="text-center text-sm text-gray-500">Choose how you'd like to register</p>
          </CardHeader>
          
          <CardContent className="flex flex-col space-y-4">
            <Button 
              className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg"
              onClick={() => setSelectedPatientType("Appointment")}
            >
              Book Appointment
            </Button>
            
            {/* Only show Walk-in button if accessed via QR code */}
            {isQRCodeAccess && (
              <Button 
                className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg"
                onClick={() => setSelectedPatientType("Walk-in")}
              >
                Walk-in Registration
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Patient Registration Forms
  // If coming from patient sidebar, show with PatientSidebar
  if (isFromPatientSidebar) {
    return (
      <div className="flex w-full min-h-screen">
        <PatientSidebar nav={nav} handleNav={handleNav} />
        
        <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl border-t-4 border-green-600 my-8">
            <CardHeader>
              <CardTitle className="text-center text-green-700">
                {selectedPatientType === "Appointment" ? "Book Appointment" : "Walk-in Registration"}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {selectedPatientType === "Appointment" && (
                <div className="space-y-4 mb-6">
                  <AppointmentPicker
                    selectedDateTime={formData.appointmentDateTime}
                    onDateTimeChange={(dateTime) => setFormData({ ...formData, appointmentDateTime: dateTime })}
                    getAvailableSlots={getAvailableSlots}
                  />
                </div>
              )}

              <form onSubmit={handlePatientSubmit} className="space-y-6">
                {/* 🆕 PROFILE INFO - Only show for logged-in users */}
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
                            onClick={() => navigate('/patient-settings?from=patient-sidebar')}
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
                              onClick={() => navigate('/patient-settings?from=patient-sidebar')}
                            >
                              Complete Profile Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* NEW OR RETURNING PATIENT QUESTION */}
                <div className="space-y-3 p-4 rounded-lg border-2 border-blue-300 bg-blue-50">
                  <Label className="text-blue-800 font-bold">Are you a new or returning patient? *</Label>
                  <p className="text-sm text-blue-700 mb-3">
                    <strong>New Patient:</strong> This is your first visit to our clinic<br/>
                    <strong>Returning Patient:</strong> You have visited our clinic before
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="newPatient"
                        name="patientType"
                        value="new"
                        checked={!formData.isReturningPatient}
                        onChange={() => setFormData(prev => ({ ...prev, isReturningPatient: false }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        required
                      />
                      <Label htmlFor="newPatient" className="ml-2 text-blue-900 font-medium">New Patient / First Timer</Label>
                    </div>

                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="returningPatient"
                        name="patientType"
                        value="returning"
                        checked={formData.isReturningPatient}
                        onChange={() => setFormData(prev => ({ ...prev, isReturningPatient: true }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        required
                      />
                      <Label htmlFor="returningPatient" className="ml-2 text-blue-900 font-medium">Returning Patient</Label>
                    </div>
                  </div>
                </div>

                {selectedPatientType === "Walk-in" && (
                  <div className="space-y-3 p-4 rounded-lg border-2 border-purple-300 bg-purple-50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-purple-700 font-bold">Priority Patient (Optional)</Label>
                      <input 
                        type="checkbox" 
                        id="isPriority"
                        checked={formData.isPriority}
                        onChange={(e) => handlePriorityChange(e.target.checked)}
                        className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                      />
                    </div>
                    
                    {formData.isPriority && (
                      <div className="space-y-3 pl-2">
                        <p className="text-sm text-purple-700 mb-2">Please select priority type:</p>
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="pwd"
                            name="priorityType"
                            value="PWD"
                            checked={formData.priorityType === "PWD"}
                            onChange={(e) => handlePriorityTypeChange(e.target.value)}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                          />
                          <Label htmlFor="pwd" className="ml-2">PWD (Person with Disability)</Label>
                        </div>

                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="pregnant"
                            name="priorityType"
                            value="Pregnant"
                            checked={formData.priorityType === "Pregnant"}
                            onChange={(e) => handlePriorityTypeChange(e.target.value)}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                          />
                          <Label htmlFor="pregnant" className="ml-2">Pregnant</Label>
                        </div>

                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="senior"
                            name="priorityType"
                            value="Senior"
                            checked={formData.priorityType === "Senior"}
                            onChange={(e) => handlePriorityTypeChange(e.target.value)}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                          />
                          <Label htmlFor="senior" className="ml-2">Senior Citizen (60+)</Label>
                        </div>

                        <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
                          <strong>Note:</strong> Priority patients will be served ahead of regular patients in the queue.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 p-4 rounded-lg border border-green-300">
                  <Label className="text-green-700 font-bold">Symptoms (Select all that apply)</Label>
                  {symptomsList.map(symptom => (
                    <div key={symptom} className="flex items-center">
                      <input type="checkbox" id={symptom} checked={formData.symptoms.includes(symptom)}
                        onChange={(e) => handleSymptomChange(symptom, e.target.checked)}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                      <Label htmlFor={symptom} className="ml-2">{symptom}</Label>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 p-4 rounded-lg border border-green-300 bg-green-50">
                  <Label className="text-green-700 font-bold">Select Services</Label>
                  {serviceCategories.map(cat => (
                    <div key={cat.id} className="pt-2 border-b last:border-b-0">
                      <div className="cursor-pointer flex justify-between font-semibold text-green-700"
                        onClick={() => toggleCategory(cat.id)}>
                        {cat.label} <span>{expandedCategory === cat.id ? "▲" : "▼"}</span>
                      </div>
                      {expandedCategory === cat.id && (
                        <div className="ml-2 mt-2 space-y-2">
                          {cat.services.map(svc => (
                            <div key={svc.id} className="flex items-center">
                              <input type="checkbox" id={svc.id} checked={formData.services.includes(svc.id)}
                                onChange={(e) => handleServiceChange(svc.id, e.target.checked)}
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                              <Label htmlFor={svc.id} className="ml-2">{svc.label}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">                  
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg" 
                    disabled={isSubmitting || (selectedPatientType === "Appointment" && availableSlots <= 0)}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Registration"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <div id="message-box"></div>
        </div>
      </div>
    );
  }

  // Original form view (from QR code or direct patient access)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-green-600 my-8">
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={() => {
              if (isPatientAccess) {
                navigate('/');
              } else {
                setViewMode('clinic');
              }
            }}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            {isPatientAccess ? '← Back to Clinic Login' : '← Back to Clinic View'}
          </Button>
        </div>

        <CardHeader>
          <CardTitle className="text-center text-green-700">
            {selectedPatientType === "Appointment" ? "Book Appointment" : "Walk-in Registration"}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {selectedPatientType === "Appointment" && (
            <div className="space-y-4 mb-6">
              <AppointmentPicker
                selectedDateTime={formData.appointmentDateTime}
                onDateTimeChange={(dateTime) => setFormData({ ...formData, appointmentDateTime: dateTime })}
                getAvailableSlots={getAvailableSlots}
              />
            </div>
          )}

          <form onSubmit={handlePatientSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" type="text" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input id="age" type="number" value={formData.age} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNum">Phone Number *</Label>
              <Input id="phoneNum" type="tel" value={formData.phoneNum} onChange={handleInputChange} required />
            </div>

            {/* NEW OR RETURNING PATIENT QUESTION */}
            <div className="space-y-3 p-4 rounded-lg border-2 border-blue-300 bg-blue-50">
              <Label className="text-blue-800 font-bold">Are you a new or returning patient? *</Label>
              <p className="text-sm text-blue-700 mb-3">
                <strong>New Patient:</strong> This is your first visit to our clinic<br/>
                <strong>Returning Patient:</strong> You have visited our clinic before
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="newPatient"
                    name="patientType"
                    value="new"
                    checked={!formData.isReturningPatient}
                    onChange={() => setFormData(prev => ({ ...prev, isReturningPatient: false }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required
                  />
                  <Label htmlFor="newPatient" className="ml-2 text-blue-900 font-medium">New Patient / First Timer</Label>
                </div>

                <div className="flex items-center">
                  <input 
                    type="radio" 
                    id="returningPatient"
                    name="patientType"
                    value="returning"
                    checked={formData.isReturningPatient}
                    onChange={() => setFormData(prev => ({ ...prev, isReturningPatient: true }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required
                  />
                  <Label htmlFor="returningPatient" className="ml-2 text-blue-900 font-medium">Returning Patient</Label>
                </div>
              </div>
            </div>

            {selectedPatientType === "Walk-in" && (
              <div className="space-y-3 p-4 rounded-lg border-2 border-purple-300 bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-purple-700 font-bold">Priority Patient (Optional)</Label>
                  <input 
                    type="checkbox" 
                    id="isPriority"
                    checked={formData.isPriority}
                    onChange={(e) => handlePriorityChange(e.target.checked)}
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                  />
                </div>
                
                {formData.isPriority && (
                  <div className="space-y-3 pl-2">
                    <p className="text-sm text-purple-700 mb-2">Please select priority type:</p>
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="pwd"
                        name="priorityType"
                        value="PWD"
                        checked={formData.priorityType === "PWD"}
                        onChange={(e) => handlePriorityTypeChange(e.target.value)}
                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                      />
                      <Label htmlFor="pwd" className="ml-2">PWD (Person with Disability)</Label>
                    </div>

                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="pregnant"
                        name="priorityType"
                        value="Pregnant"
                        checked={formData.priorityType === "Pregnant"}
                        onChange={(e) => handlePriorityTypeChange(e.target.value)}
                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                      />
                      <Label htmlFor="pregnant" className="ml-2">Pregnant</Label>
                    </div>

                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="senior"
                        name="priorityType"
                        value="Senior"
                        checked={formData.priorityType === "Senior"}
                        onChange={(e) => handlePriorityTypeChange(e.target.value)}
                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" 
                      />
                      <Label htmlFor="senior" className="ml-2">Senior Citizen (60+)</Label>
                    </div>

                    <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
                      <strong>Note:</strong> Priority patients will be served ahead of regular patients in the queue.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 p-4 rounded-lg border border-green-300">
              <Label className="text-green-700 font-bold">Symptoms (Select all that apply)</Label>
              {symptomsList.map(symptom => (
                <div key={symptom} className="flex items-center">
                  <input type="checkbox" id={symptom} checked={formData.symptoms.includes(symptom)}
                    onChange={(e) => handleSymptomChange(symptom, e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                  <Label htmlFor={symptom} className="ml-2">{symptom}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-3 p-4 rounded-lg border border-green-300 bg-green-50">
              <Label className="text-green-700 font-bold">Select Services</Label>
              {serviceCategories.map(cat => (
                <div key={cat.id} className="pt-2 border-b last:border-b-0">
                  <div className="cursor-pointer flex justify-between font-semibold text-green-700"
                    onClick={() => toggleCategory(cat.id)}>
                    {cat.label} <span>{expandedCategory === cat.id ? "▲" : "▼"}</span>
                  </div>
                  {expandedCategory === cat.id && (
                    <div className="ml-2 mt-2 space-y-2">
                      {cat.services.map(svc => (
                        <div key={svc.id} className="flex items-center">
                          <input type="checkbox" id={svc.id} checked={formData.services.includes(svc.id)}
                            onChange={(e) => handleServiceChange(svc.id, e.target.checked)}
                            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                          <Label htmlFor={svc.id} className="ml-2">{svc.label}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg" 
                disabled={isSubmitting || (selectedPatientType === "Appointment" && availableSlots <= 0)}
              >
                {isSubmitting ? "Submitting..." : "Submit Registration"}
              </Button>
              <Button type="button" className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800" onClick={() => setSelectedPatientType(null)}>
                ← Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div id="message-box"></div>
    </div>
  );
}

export default Checkin;