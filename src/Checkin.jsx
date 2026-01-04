import React, { useState, useContext, useEffect } from "react";
import { PatientContext } from "./PatientContext";
import { doctors } from './doctorData';
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QrCode, User, AlertCircle } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, Navigate } from "react-router-dom";
import Logo from "./assets/logo-abante.png";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";
import {
  registerWalkInPatient,
  registerAppointmentPatient,
  checkAppointmentAvailable
} from "./lib/supabaseClient";

function Checkin() {
  const navigate = useNavigate();
  const { patients, addPatient, activePatient, setActivePatient, getAvailableSlots } = useContext(PatientContext);

  // ✅ Check URL parameters BEFORE initial render to prevent flash
  const getInitialViewMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromLogin = urlParams.get('from') === 'login';
    return (isPatientView || isFromLogin) ? 'patient' : 'clinic';
  };

  const getInitialPatientAccess = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromLogin = urlParams.get('from') === 'login';
    return isPatientView || isFromLogin;
  };

  const [viewMode, setViewMode] = useState(getInitialViewMode());
  const [isPatientAccess, setIsPatientAccess] = useState(getInitialPatientAccess());
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  
  const [selectedPatientType, setSelectedPatientType] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState(1);
  
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

  const handlePriorityChange = (checked) => {
    setFormData(prev => ({ ...prev, isPriority: checked, priorityType: checked ? prev.priorityType : null }));
  };

  const handlePriorityTypeChange = (value) => {
    setFormData(prev => ({ ...prev, priorityType: value }));
  };

  // ✅ Update available slots whenever appointment date/time changes
  useEffect(() => {
    if (formData.appointmentDateTime) {
      const slots = getAvailableSlots(formData.appointmentDateTime);
      setAvailableSlots(slots);
    }
  }, [formData.appointmentDateTime, getAvailableSlots, patients]);

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

  if (activePatient) {
    return <Navigate to={`/qstatus${isPatientAccess ? '?view=patient' : ''}`} />;
  }

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
        // Helper function to normalize strings for matching
        const normalizeString = (str) => {
          if (!str) return '';
          return str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').trim();
        };

        // Helper function to find existing patient profile
        const findExistingPatient = () => {
          if (!formData.isReturningPatient) return null;

          const normalizedName = normalizeString(formData.name);
          const normalizedPhone = formData.phoneNum ? formData.phoneNum.replace(/\D/g, '') : '';

          // Search through all patients (including inactive ones for this purpose)
          for (const patient of patients) {
            const existingPhone = patient.phoneNum ? patient.phoneNum.replace(/\D/g, '') : '';
            const existingName = normalizeString(patient.name);

            // Match by phone number (strongest identifier)
            if (normalizedPhone && existingPhone && normalizedPhone === existingPhone) {
              return patient;
            }

            // Match by exact normalized name
            if (normalizedName && existingName && normalizedName === existingName) {
              if (!normalizedPhone || !existingPhone || normalizedPhone === existingPhone) {
                return patient;
              }
            }
          }
          return null;
        };

        const existingPatient = findExistingPatient();

        const newPatient = {
          name: formData.name,
          age: formData.age, // Updated age
          phoneNum: formData.phoneNum, // Updated phone
          type: selectedPatientType,
          symptoms: formData.symptoms,
          services: formData.services,
          queueNo: patients.length + 1,
          appointmentDateTime: formData.appointmentDateTime || undefined,
          isPriority: formData.isPriority,
          priorityType: formData.priorityType,
          isReturningPatient: formData.isReturningPatient,
        };

        // If returning patient and we found existing profile, preserve some data
        if (existingPatient && formData.isReturningPatient) {
          // Update phone number only if new one is provided and old one wasn't
          if (!existingPatient.phoneNum && formData.phoneNum) {
            newPatient.phoneNum = formData.phoneNum;
          } else if (existingPatient.phoneNum) {
            // Keep the existing phone if it exists (or use new one if provided)
            newPatient.phoneNum = formData.phoneNum || existingPatient.phoneNum;
          }

          // Use the more complete name (prefer proper casing)
          const hasMoreCapitals = (formData.name.match(/[A-Z]/g) || []).length > 
                                 (existingPatient.name.match(/[A-Z]/g) || []).length;
          if (!hasMoreCapitals && existingPatient.name.length >= formData.name.length) {
            newPatient.name = existingPatient.name;
          }

          // Always use the most recent age
          newPatient.age = formData.age;
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
        navigate(`/qstatus${isPatientAccess ? '?view=patient' : ''}`);
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

  // === CLINIC VIEW - QR CODE ONLY (Only for staff access) ===
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
                  <QRCodeSVG 
                    value={`${import.meta.env.VITE_APP_URL}/checkin?view=patient`}
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

  // === PATIENT VIEW - REGISTRATION FORMS ===
  
  // Step 1: Patient Type Selection
  if (!selectedPatientType) {
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
            <Button 
              className="w-full bg-[#33a37f] hover:bg-[#059669] text-white py-6 text-lg"
              onClick={() => setSelectedPatientType("Walk-in")}
            >
              Walk-in Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Patient Form
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
            <div className="space-y-4 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Label htmlFor="appointmentDateTime">Appointment Date & Time *</Label>
              <DatePicker
                selected={formData.appointmentDateTime ? new Date(formData.appointmentDateTime) : null}
                onChange={(date) => setFormData({ ...formData, appointmentDateTime: date ? date.toISOString() : "" })}
                showTimeSelect 
                timeFormat="h:mm aa" 
                timeIntervals={30} 
                minDate={new Date()}
                minTime={new Date(new Date().setHours(8,0,0,0))} 
                maxTime={new Date(new Date().setHours(17,0,0,0))}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              
              {formData.appointmentDateTime && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${availableSlots > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                  <AlertCircle className={`w-5 h-5 ${availableSlots > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                  <div>
                    <p className={`font-semibold text-sm ${availableSlots > 0 ? 'text-blue-900' : 'text-red-900'}`}>
                      {availableSlots > 0 ? 'Slot available' : 'Slot not available'}
                    </p>
                    <p className={`text-xs ${availableSlots > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {availableSlots > 0 ? 'Book now to secure your appointment' : 'This time is already booked, please select another time'}
                    </p>
                  </div>
                </div>
              )}
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