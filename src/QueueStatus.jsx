import React, { useState, useEffect, useContext } from "react";
import Sidebar from "@/components/Sidebar";
import PatientSidebar from "@/components/PatientSidebar";
import { Bell, X, QrCode, User, RefreshCw, XCircle, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PatientContext } from "./PatientContext";
//OUTDATED
//THIS SHOWS APPOINTMENT (PENDING, REJECTED) AND QUEUEING STATUS: CLINIC UI (CHECKIN) PATIENT UI, JOIN AS GUEST
const QueueStatus = () => {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  
  // Helper function to determine initial view mode
  const getInitialViewMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromPatientSidebar = urlParams.get('from') === 'patient-sidebar';
    return (isPatientView || isFromPatientSidebar) ? 'patient' : 'clinic';
  };

  //  Helper function to check if patient accessed directly
  const getInitialPatientAccess = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPatientView = urlParams.get('view') === 'patient';
    const isFromPatientSidebar = urlParams.get('from') === 'patient-sidebar';
    return isPatientView || isFromPatientSidebar;
  };

  const [viewMode, setViewMode] = useState(getInitialViewMode());
  const [isFromPatientSidebar, setIsFromPatientSidebar] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('from') === 'patient-sidebar';
  });
  const [isPatientAccess, setIsPatientAccess] = useState(getInitialPatientAccess());
  const [showDoneModal, setShowDoneModal] = useState(false);

  // ✅ NEW: Get current logged-in patient's email
  const currentPatientEmail = localStorage.getItem('currentPatientEmail');
  const isPatientLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

 //  Set initial view mode based on access type
useEffect(() => {
  if (isFromPatientSidebar) {
    // Patient sidebar has highest priority - always show clinic view with PatientSidebar
    if (viewMode !== 'clinic') {
      setViewMode('clinic');
    }
  } else if (isPatientAccess && !isFromPatientSidebar) {
    // Direct patient access (QR code) - show patient view (no sidebar)
    if (viewMode !== 'patient') {
      setViewMode('patient');
    }
  }
}, [isPatientAccess, isFromPatientSidebar, viewMode]);

//  Force patient sidebar users to stay in clinic view
useEffect(() => {
  if (isFromPatientSidebar && viewMode === 'patient') {
    setViewMode('clinic');
  }
}, [viewMode, isFromPatientSidebar]);

  
  const { 
    patients, 
    activePatient, 
    currentServing, 
    avgWaitTime,
    setActivePatient,
    requeuePatient
  } = useContext(PatientContext);
  
  // Validate that activePatient belongs to current logged-in patient
  // This prevents seeing other patients' queue status
  const isMyAppointment = React.useMemo(() => {
    if (!activePatient || !isPatientLoggedIn || !currentPatientEmail) {
      return true; // Allow if accessed from clinic view (not logged in as patient)
    }

    // For patient access, verify the appointment belongs to them
    if (activePatient.patientEmail) {
      const normalizedActiveEmail = activePatient.patientEmail.toLowerCase().trim();
      const normalizedCurrentEmail = currentPatientEmail.toLowerCase().trim();
      return normalizedActiveEmail === normalizedCurrentEmail;
    }

    // If appointment has no email (created before fix), don't show to patients
    return false;
  }, [activePatient, isPatientLoggedIn, currentPatientEmail]);

  // Always get the latest patient data from the patients array
  const currentPatient = patients?.find(p => p.queueNo === activePatient?.queueNo);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  const queueNumber = currentPatient?.queueNo || 0;
  const service = currentPatient?.type || "Walk-in";
  const symptoms = currentPatient?.symptoms || [];
  // NEW: Get all patients assigned to the same doctor
  const doctorPatients = currentPatient?.assignedDoctor  
    ? patients.filter(p => 
        !p.isInactive && 
        p.assignedDoctor?.id === currentPatient.assignedDoctor.id &&
        p.inQueue &&
        (p.type !== "Appointment" || p.appointmentStatus === "accepted")
      ).sort((a, b) => a.queueNo - b.queueNo)
    : [];

  const serviceLabels = {
    pedia: "Pediatric", adult: "Adult", senior: "Senior (65+)",
    preventive: "Preventive Exam", "follow-up": "Follow-up",
    cbc: "CBC", platelet: "Platelet Count", esr: "ESR", abo: "Blood Type",
    hbsag: "HBsAg", vdrl: "VDRL/RPR", antiHCV: "Anti-HCV", hpylori: "H.PYLORI",
    dengueIg: "Dengue IgG+IgM", dengueNs1: "Dengue NS1", dengueDuo: "Dengue Duo",
    typhidot: "Typhidot", fbs: "FBS", rbs: "RBS", lipid: "Lipid Profile",
    totalCh: "Total Cholesterol", triglycerides: "Triglycerides", hdl: "HDL",
    ldl: "LDL", alt: "ALT/SGPT", ast: "AST/SGOT", uric: "Uric Acid",
    creatinine: "Creatinine", bun: "BUN", hba1c: "HBA1C", albumin: "Albumin",
    magnesium: "Magnesium", totalProtein: "Total Protein", alp: "ALP",
    phosphorus: "Phosphorus", sodium: "Sodium", potassium: "Potassium",
    ionizedCal: "Ionized Calcium", totalCal: "Total Calcium", chloride: "Chloride",
    urinalysis: "Urinalysis", fecalysis: "Fecalysis", pregnancyT: "Pregnancy Test",
    fecal: "Fecal Occult Blood", semen: "Semen Analysis", tsh: "TSH",
    ft3: "FT3", "75g": "75g OGTT", t4: "T4", t3: "T3", psa: "PSA",
    totalBilirubin: "Total/Direct Bilirubin"
  };

  const getServiceLabel = (serviceId) => serviceLabels[serviceId] || serviceId;

  // FIXED: Show flat wait time (no calculation based on queue position)
  const peopleAhead = Math.max(queueNumber - currentServing, 0);
  const estimatedWait = avgWaitTime; // Just use the avgWaitTime directly

  // Check if appointment is pending approval
  const isAppointmentPending = currentPatient?.type === 'Appointment' && 
    (!currentPatient?.appointmentStatus || currentPatient?.appointmentStatus === 'pending');

  // Check if appointment is rejected
  const isAppointmentRejected = currentPatient?.type === 'Appointment' && 
    currentPatient?.appointmentStatus === 'rejected';

  // Watch for status changes in the patients array
  useEffect(() => {
    if (!currentPatient) return

    // Don't show notifications if appointment is pending
    if (isAppointmentPending) return;

    const difference = queueNumber - currentServing;
    
    // Check if cancelled
    if (currentPatient.status === "cancelled") {
      setNotificationMessage("Your queue has been cancelled. You didn't show up.");
      setNotificationType("cancelled");
      setShowNotification(true);
      return;
    }
    
    // Check if patient is in progress
    if (currentPatient.status === "in progress") {
      setNotificationMessage("It's your turn now! Please proceed to the counter.");
      setNotificationType("success");
      setShowNotification(true);
      return;
    }
    
    // Check if coming up soon
    if (difference === 1 && currentPatient.status === "waiting") {
      setNotificationMessage("Your turn is coming up soon! Please be ready.");
      setNotificationType("success");
      setShowNotification(true);
    } else if (difference === 0 && currentPatient.status === "waiting") {
      setNotificationMessage("It's your turn now! Please proceed to the counter.");
      setNotificationType("success");
      setShowNotification(true);
    } else {
      // Only hide notification if it's not a cancellation
      if (notificationType !== "cancelled") {
        setShowNotification(false);
      }
    }
  }, [currentPatient, currentServing, queueNumber, notificationType, isAppointmentPending]);

  // Handle requeue - creates new ticket and updates activePatient
  const handleRequeue = () => {
    const oldQueueNo = queueNumber;
    requeuePatient(oldQueueNo);
    // Find the new ticket that was just created
    setTimeout(() => {
      const newTicket = patients.find(p => 
        p.requeued && p.originalQueueNo === oldQueueNo && !p.isInactive
      );
      
      if (newTicket) {
        setActivePatient(newTicket);
        setNotificationMessage(`You've been added back to the queue with ticket #${String(newTicket.queueNo).padStart(3, '0')}!`);
      } else {
        setNotificationMessage("You've been added back to the queue!");
      }
      setNotificationType("success");
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    }, 100);
  };

  // Handle Done button click - show confirmation modal
  const handleDoneClick = () => {
    setShowDoneModal(true);
  };

  // Handle confirmed Done - proceed with navigation
  const handleConfirmDone = () => {
    setShowDoneModal(false);
    setActivePatient(null);
    
    if (isFromPatientSidebar) {
      // Navigate to checkin with patient sidebar
      const params = new URLSearchParams();
      params.append('from', 'patient-sidebar');
      params.append('type', 'appointment');
      navigate(`/checkin?${params.toString()}`);
    } else {
      // Navigate based on access type
      const params = new URLSearchParams();
      if (isPatientAccess) params.append('view', 'patient');
      navigate(`/checkin${params.toString() ? '?' + params.toString() : ''}`);
    }
  };

  const PushNotification = () => {
    if (!showNotification) return null;
      
    const isCancelled = notificationType === "cancelled";
      
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top">
        <div className={`${
          isCancelled ? "bg-red-600" : "bg-green-600"
          } text-white shadow-lg rounded-xl p-4 relative`}>
          {!isCancelled && (
            <button
              className="absolute top-2 right-2 text-white hover:opacity-80"
              onClick={() => setShowNotification(false)}
              >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-start gap-3 pr-8">
            <Bell className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">
                {isCancelled ? "Queue Cancelled" : "Queue Update"}
              </p>
              <p className="text-sm leading-relaxed">{notificationMessage}</p>
            </div>
          </div>

          {isCancelled && (
            <div className="mt-3 pl-8">
              <Button
                onClick={handleRequeue}
                className="bg-white text-red-600 hover:bg-gray-100"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Requeue
              </Button>
            </div>
          )}
        </div>

      </div>
    );
  };

  const DoneConfirmationModal = () => {
    if (!showDoneModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center">
            Confirm Action
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
            {isAppointmentPending ? (
              <>Are you sure you want to leave? You won't be able to see your appointment status updates unless you return to this page.</>
            ) : isAppointmentRejected ? (
              <>Are you sure you want to leave? You can book a new appointment after clicking "Done".</>
            ) : (
              <>Are you sure you're done? You can book a new appointment after completing this action.</>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowDoneModal(false)}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDone}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!currentPatient) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Patient not found in the queue.
      </div>
    );
  }

//If patient is logged in but viewing someone else's appointment, redirect
  if (isPatientLoggedIn && !isMyAppointment) {
    return (
      <div className="flex w-full min-h-screen">
        {isFromPatientSidebar ? (
          <PatientSidebar nav={nav} handleNav={handleNav} />
        ) : null}
      <div className={`flex-1 min-h-screen bg-gray-50 ${isFromPatientSidebar ? 'ml-0 md:ml-52' : ''} flex items-center justify-center p-4`}>
        <Card className="max-w-md">
         <CardContent className="p-6 text-center">            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            This appointment does not belong to your account.
          </p>
          <Button
            onClick={() => navigate('/homepage')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                 Go to Homepage
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  //Pending Appointment - Clinic View (Sidebar/Patient Sidebar)
  if (isAppointmentPending) {
    // Clinic View
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          {isFromPatientSidebar ? (
            <PatientSidebar nav={nav} handleNav={handleNav} />
          ) : (
            <Sidebar nav={nav} handleNav={handleNav} />
          )}
          <DoneConfirmationModal />
          <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-4">
            <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
                <Badge className="text-sm sm:text-lg mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Bell className="w-4 h-4 mr-2" />
                  Appointment Pending
                </Badge>

                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bell className="w-10 h-10 text-amber-600" />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Appointment Submitted</h2>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  Your appointment request is pending approval from our secretary.
                </p>

                <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Name</span>
                    <span className="font-medium text-gray-900">{currentPatient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Appointment Time</span>
                    <span className="font-medium text-gray-900">
                      {currentPatient.appointmentDateTime 
                        ? new Date(currentPatient.appointmentDateTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Status</span>
                    <span className="font-medium text-amber-600">Pending Approval</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {symptoms.map(symptom => (
                        <Badge
                          key={symptom}
                          variant="secondary"
                          className="bg-green-100 text-green-700 text-sm sm:text-base"
                        >
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 sm:w-6 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-sm sm:text-lg">
                      <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                      <p className="text-xs sm:text-sm text-blue-800">
                        Our secretary will review your appointment request. Once approved, you'll see your queue number and estimated wait time. Please check back later or wait for a notification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {!isPatientAccess && (
                    <Button
                      onClick={() => setViewMode('patient')}
                      className="w-full text-sm sm:text-lg bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <User className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                      Switch to Patient View
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full text-sm sm:text-lg"
                    size="lg"
                    onClick={handleDoneClick}
                  >
                    Done
                  </Button>
                </div>
            </div>

            {/* NEW: Doctor's Queue Table */}
            {currentPatient?.assignedDoctor && 
            doctorPatients.length > 0 && 
            !isAppointmentPending && 
            !isAppointmentRejected && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {currentPatient.assignedDoctor.name}'s Queue
                </h3>
                
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {doctorPatients.map(patient => (
                    <div 
                      key={patient.queueNo} 
                      className={`border rounded-lg p-3 ${
                        patient.queueNo === currentPatient.queueNo 
                          ? 'border-green-500 bg-green-50 border-2' 
                          : patient.isPriority
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-base">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-sm">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{patient.name}</p>
                        </div>
                        <Badge
                          className={
                            patient.status === 'in progress'
                              ? 'bg-blue-100 text-blue-700'
                              : patient.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700'
                              : patient.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </div>
                      
                      {patient.isPriority && (
                        <div className="mb-2">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Priority: {patient.priorityType}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Age: {patient.age} | Type: {patient.type}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.symptoms?.slice(0, 3).map((symptom, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                          {patient.symptoms?.length > 3 && (
                            <span className="text-xs text-gray-500">+{patient.symptoms.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Queue #</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Age</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Priority</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Symptoms</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPatients.map(patient => (
                        <tr 
                          key={patient.queueNo}
                          className={`border-b ${
                            patient.queueNo === currentPatient.queueNo 
                              ? 'bg-green-50 font-semibold' 
                              : patient.isPriority
                              ? 'bg-yellow-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 align-middle">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-xs">(You)</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">{patient.name}</td>
                          <td className="p-3 align-middle">{patient.age}</td>
                          <td className="p-3 align-middle text-gray-600">{patient.type}</td>
                          <td className="p-3 align-middle">
                            {patient.isPriority ? (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {patient.priorityType}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {patient.symptoms?.slice(0, 2).map((symptom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {symptom}
                                </Badge>
                              ))}
                              {patient.symptoms?.length > 2 && (
                                <span className="text-xs text-gray-500">+{patient.symptoms.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <Badge
                              className={
                                patient.status === 'in progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : patient.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {patient.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

    // Pending Appointment - Patient View (No sidebar)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <DoneConfirmationModal />
        <div className="flex-1 p-4">
          <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <Badge className="text-sm sm:text-lg mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                <Bell className="w-4 h-4 mr-2" />
                Appointment Pending
              </Badge>

              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <Bell className="w-10 h-10 text-amber-600" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Appointment Submitted</h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Your appointment request is pending approval from our secretary.
              </p>

              <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Name</span>
                  <span className="font-medium text-gray-900">{currentPatient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Appointment Time</span>
                  <span className="font-medium text-gray-900">
                    {currentPatient.appointmentDateTime 
                      ? new Date(currentPatient.appointmentDateTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className="font-medium text-amber-600">Pending Approval</span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-sm sm:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 sm:w-6 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-sm sm:text-lg">
                    <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                    <p className="text-xs sm:text-sm text-blue-800">
                      Our secretary will review your appointment request. Once approved, you'll see your queue number and estimated wait time. Please check back later or wait for a notification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('clinic')}
                    variant="outline"
                    className="w-full text-sm sm:text-lg border-green-600 text-green-600 hover:bg-green-50"
                    size="lg"
                  >
                    <QrCode className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                    Back to Clinic View
                  </Button>
                )}
              
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-lg"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>

            {/* NEW: Doctor's Queue Table */}
            {currentPatient?.assignedDoctor && 
            doctorPatients.length > 0 && 
            !isAppointmentPending && 
            !isAppointmentRejected && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {currentPatient.assignedDoctor.name}'s Queue
                </h3>
                
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {doctorPatients.map(patient => (
                    <div 
                      key={patient.queueNo} 
                      className={`border rounded-lg p-3 ${
                        patient.queueNo === currentPatient.queueNo 
                          ? 'border-green-500 bg-green-50 border-2' 
                          : patient.isPriority
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-base">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-sm">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{patient.name}</p>
                        </div>
                        <Badge
                          className={
                            patient.status === 'in progress'
                              ? 'bg-blue-100 text-blue-700'
                              : patient.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700'
                              : patient.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </div>
                      
                      {patient.isPriority && (
                        <div className="mb-2">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Priority: {patient.priorityType}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Age: {patient.age} | Type: {patient.type}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.symptoms?.slice(0, 3).map((symptom, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                          {patient.symptoms?.length > 3 && (
                            <span className="text-xs text-gray-500">+{patient.symptoms.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Queue #</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Age</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Priority</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Symptoms</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPatients.map(patient => (
                        <tr 
                          key={patient.queueNo}
                          className={`border-b ${
                            patient.queueNo === currentPatient.queueNo 
                              ? 'bg-green-50 font-semibold' 
                              : patient.isPriority
                              ? 'bg-yellow-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 align-middle">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-xs">(You)</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">{patient.name}</td>
                          <td className="p-3 align-middle">{patient.age}</td>
                          <td className="p-3 align-middle text-gray-600">{patient.type}</td>
                          <td className="p-3 align-middle">
                            {patient.isPriority ? (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {patient.priorityType}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {patient.symptoms?.slice(0, 2).map((symptom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {symptom}
                                </Badge>
                              ))}
                              {patient.symptoms?.length > 2 && (
                                <span className="text-xs text-gray-500">+{patient.symptoms.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <Badge
                              className={
                                patient.status === 'in progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : patient.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {patient.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Rejected Appointment - Clinic View (Sidebar & Patient Sidebar)
  if (isAppointmentRejected) {
    // Clinic View
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          {isFromPatientSidebar ? (
            <PatientSidebar nav={nav} handleNav={handleNav} />
          ) : (
            <Sidebar nav={nav} handleNav={handleNav} />
          )}
          <DoneConfirmationModal />
          <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-4">
            <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
                <Badge className="text-sm sm:text-lg mb-4 bg-red-100 text-red-700 hover:bg-red-100">
                  <XCircle className="w-4 h-4 mr-2" />
                  Appointment Declined
                </Badge>

                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Appointment Not Approved</h2>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  We're sorry, but your appointment request was not approved.
                </p>

                <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Name</span>
                    <span className="font-medium text-gray-900">{currentPatient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Requested Time</span>
                    <span className="font-medium text-gray-900">
                      {currentPatient.appointmentDateTime 
                        ? new Date(currentPatient.appointmentDateTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Status</span>
                    <span className="font-medium text-red-600">Declined</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {symptoms.map(symptom => (
                        <Badge
                          key={symptom}
                          variant="secondary"
                          className="bg-green-100 text-green-700 text-sm sm:text-base"
                        >
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Added Rejection Reason Display for clinic view */}
                {currentPatient.rejectionReason && (
                  <div className="mt-6 p-3 sm:p-4 bg-red-100 rounded-xl border border-red-300">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 sm:w-6 h-5 text-red-700 mt-0.5 flex-shrink-0" />
                      <div className="text-left text-sm sm:text-lg">
                        <p className="font-semibold text-red-900 mb-2">Reason for Appointment Refusal:</p>
                        <p className="text-xs sm:text-sm text-red-800 mb-2">
                          {currentPatient.rejectionReason}
                        </p>
                        {currentPatient.rejectedAt && (
                          <p className="text-xs text-red-700 italic">
                            Not approved on {new Date(currentPatient.rejectedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-3 sm:p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 sm:w-6 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-sm sm:text-lg">
                      <p className="font-medium text-red-900 mb-1">What you can do:</p>
                      <p className="text-xs sm:text-sm text-red-800">
                        Please contact the clinic to reschedule or try booking a different time slot. You can also visit as a walk-in patient.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {!isPatientAccess && (
                    <Button
                      onClick={() => setViewMode('patient')}
                      className="w-full text-sm sm:text-lg bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <User className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                      Switch to Patient View
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full text-sm sm:text-lg"
                    size="lg"
                    onClick={handleDoneClick}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Rejected Appointment - Patient View (No Sidebar)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <DoneConfirmationModal />
        <div className="flex-1 p-4">
          <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <Badge className="text-sm sm:text-lg mb-4 bg-red-100 text-red-700 hover:bg-red-100">
                <XCircle className="w-4 h-4 mr-2" />
                Appointment Declined
              </Badge>

              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Appointment Not Approved</h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                We're sorry, but your appointment request was not approved.
              </p>

              <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Name</span>
                  <span className="font-medium text-gray-900">{currentPatient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Requested Time</span>
                  <span className="font-medium text-gray-900">
                    {currentPatient.appointmentDateTime 
                      ? new Date(currentPatient.appointmentDateTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className="font-medium text-red-600">Declined</span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-sm sm:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Added Rejection Reason Display for patient view */}
              {currentPatient.rejectionReason && (
                <div className="mt-6 p-3 sm:p-4 bg-red-100 rounded-xl border border-red-300">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 sm:w-6 h-5 text-red-700 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-sm sm:text-lg">
                      <p className="font-semibold text-red-900 mb-2">Reason for Rejection:</p>
                      <p className="text-xs sm:text-sm text-red-800 mb-2">
                        {currentPatient.rejectionReason}
                      </p>
                      {currentPatient.rejectedAt && (
                        <p className="text-xs text-red-700 italic">
                          Not approved on {new Date(currentPatient.rejectedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-3 sm:p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 sm:w-6 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-sm sm:text-lg">
                    <p className="font-medium text-red-900 mb-1">What you can do:</p>
                    <p className="text-xs sm:text-sm text-red-800">
                      Please contact the clinic to reschedule or try booking a different time slot. You can also visit as a walk-in patient.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('clinic')}
                    variant="outline"
                    className="w-full text-sm sm:text-lg border-green-600 text-green-600 hover:bg-green-50"
                    size="lg"
                  >
                    <QrCode className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                    Back to Clinic View
                  </Button>
                )}
               
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-lg"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Queue Status Updates - Clinic View (Sidebar & Patient Sidebar)
  if (viewMode === 'clinic') {
    return (
      <div className="flex w-full min-h-screen">
        {isFromPatientSidebar ? (
          <PatientSidebar nav={nav} handleNav={handleNav} />
        ) : (
          <Sidebar nav={nav} handleNav={handleNav} />
        )}
        <PushNotification />
        <DoneConfirmationModal />
        <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-4">
          <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
              <Badge className={`text-sm sm:text-lg mb-4 ${
                currentPatient.status === 'cancelled' 
                  ? 'bg-red-100 text-red-700' 
                  : currentPatient.status === 'in progress'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-emerald-100 text-emerald-700'
              } hover:bg-emerald-100`}>
                <Bell className="w-4 h-4 mr-2" />
                {currentPatient.status === 'cancelled' ? 'Cancelled' : 
                 currentPatient.status === 'in progress' ? 'In Progress' : 'Queue Joined'}
              </Badge>

              {currentPatient.requeued && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Requeued:</strong> Your original ticket #{String(currentPatient.originalQueueNo).padStart(3, '0')} has been replaced with this new ticket.
                  </p>
                </div>
              )}

              <h2 className="text-lg md:text-xl text-gray-600 mb-2">Your Queue Number</h2>
              <div className="text-5xl sm:text-6xl font-bold text-green-600 mb-6">{queueNumber}</div>

              <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Service</span>
                  <span className="font-medium text-gray-900">{service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Currently Serving</span>
                  <span className="font-medium text-gray-900">
                    #{String(currentServing).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className={`font-medium ${
                    currentPatient.status === 'cancelled' ? 'text-red-600' : 
                    currentPatient.status === 'in progress' ? 'text-green-600' : 
                    'text-gray-900'
                  }`}>
                    {currentPatient.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">Estimated Wait</span>
                  <span className="font-medium text-gray-900">{estimatedWait} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-normal">People Ahead</span>
                  <span className="font-medium text-gray-900">{peopleAhead}</span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-sm sm:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 sm:w-6 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-sm sm:text-lg">
                    <p className="font-medium text-amber-900 mb-1">Notifications Enabled</p>
                    <p className="text-xs sm:text-sm text-amber-800">
                      You'll receive a push notification when your turn is near and when it's your turn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('patient')}
                    className="w-full text-sm sm:text-lg bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <User className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                    Switch to  Patient View
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-lg"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>

            {/* NEW: Doctor's Queue Table - ADDED HERE FOR CLINIC VIEW */}
            {currentPatient?.assignedDoctor && 
            doctorPatients.length > 0 && 
            !isAppointmentPending && 
            !isAppointmentRejected && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {currentPatient.assignedDoctor.name}'s Queue
                </h3>
                
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {doctorPatients.map(patient => (
                    <div 
                      key={patient.queueNo} 
                      className={`border rounded-lg p-3 ${
                        patient.queueNo === currentPatient.queueNo 
                          ? 'border-green-500 bg-green-50 border-2' 
                          : patient.isPriority
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-base">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-sm">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{patient.name}</p>
                        </div>
                        <Badge
                          className={
                            patient.status === 'in progress'
                              ? 'bg-blue-100 text-blue-700'
                              : patient.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700'
                              : patient.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </div>
                      
                      {patient.isPriority && (
                        <div className="mb-2">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Priority: {patient.priorityType}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Age: {patient.age} | Type: {patient.type}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.symptoms?.slice(0, 3).map((symptom, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                          {patient.symptoms?.length > 3 && (
                            <span className="text-xs text-gray-500">+{patient.symptoms.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Queue #</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Age</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Priority</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Symptoms</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPatients.map(patient => (
                        <tr 
                          key={patient.queueNo}
                          className={`border-b ${
                            patient.queueNo === currentPatient.queueNo 
                              ? 'bg-green-50 font-semibold' 
                              : patient.isPriority
                              ? 'bg-yellow-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 align-middle">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-xs">(You)</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">{patient.name}</td>
                          <td className="p-3 align-middle">{patient.age}</td>
                          <td className="p-3 align-middle text-gray-600">{patient.type}</td>
                          <td className="p-3 align-middle">
                            {patient.isPriority ? (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {patient.priorityType}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {patient.symptoms?.slice(0, 2).map((symptom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {symptom}
                                </Badge>
                              ))}
                              {patient.symptoms?.length > 2 && (
                                <span className="text-xs text-gray-500">+{patient.symptoms.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <Badge
                              className={
                                patient.status === 'in progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : patient.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {patient.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Queue Status Updates - Patient View (No Sidebar)
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <PushNotification />
      <DoneConfirmationModal />
      <div className="flex-1 p-4">
        <div className="max-w-[800px] mt-[20px] sm:mt-[50px] w-full mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 text-center">
            <Badge className={`text-sm sm:text-lg mb-4 ${
              currentPatient.status === 'cancelled' 
                ? 'bg-red-100 text-red-700' 
                : currentPatient.status === 'in progress'
                ? 'bg-green-100 text-green-700'
                : 'bg-emerald-100 text-emerald-700'
            } hover:bg-emerald-100`}>
              <Bell className="w-4 h-4 mr-2" />
              {currentPatient.status === 'cancelled' ? 'Cancelled' : 
               currentPatient.status === 'in progress' ? 'In Progress' : 'Queue Joined'}
            </Badge>

            {currentPatient.requeued && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Requeued:</strong> Your original ticket #{String(currentPatient.originalQueueNo).padStart(3, '0')} has been replaced with this new ticket.
                </p>
              </div>
            )}

            <h2 className="text-lg md:text-xl text-gray-600 mb-2">Your Queue Number</h2>
            <div className="text-5xl sm:text-6xl font-bold text-green-600 mb-6">{queueNumber}</div>

            <div className="space-y-3 text-left bg-gray-50 rounded-xl p-4 text-sm sm:text-lg">
              <div className="flex justify-between">
                <span className="text-gray-600 font-normal">Service</span>
                <span className="font-medium text-gray-900">{service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-normal">Currently Serving</span>
                <span className="font-medium text-gray-900">
                  #{String(currentServing).padStart(3, "0")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-normal">Status</span>
                <span className={`font-medium ${
                  currentPatient.status === 'cancelled' ? 'text-red-600' : 
                  currentPatient.status === 'in progress' ? 'text-green-600' : 
                  'text-gray-900'
                }`}>
                  {currentPatient.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-normal">Estimated Wait</span>
                <span className="font-medium text-gray-900">{estimatedWait} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-normal">People Ahead</span>
                <span className="font-medium text-gray-900">{peopleAhead}</span>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <span className="text-gray-600 text-sm sm:text-lg font-normal">Symptoms:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {symptoms.map(symptom => (
                    <Badge
                      key={symptom}
                      variant="secondary"
                      className="bg-green-100 text-green-700 text-sm sm:text-base"
                    >
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <Bell className="w-5 sm:w-6 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left text-sm sm:text-lg">
                  <p className="font-medium text-amber-900 mb-1">Notifications Enabled</p>
                  <p className="text-xs sm:text-sm text-amber-800">
                    You'll receive a push notification when your turn is near and when it's your turn.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
                {!isPatientAccess && (
                <Button
                  onClick={() => setViewMode('clinic')} 
                  variant="outline"
                  className="w-full text-sm sm:text-lg border-green-600 text-green-600 hover:bg-green-50"
                  size="lg"
                >
                  <QrCode className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  Back to Clinic View
                </Button>
              )}

                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-lg"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>

            {/* NEW: Doctor's Queue Table - ADDED HERE FOR CLINIC VIEW */}
            {currentPatient?.assignedDoctor && 
            doctorPatients.length > 0 && 
            !isAppointmentPending && 
            !isAppointmentRejected && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {currentPatient.assignedDoctor.name}'s Queue
                </h3>
                
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {doctorPatients.map(patient => (
                    <div 
                      key={patient.queueNo} 
                      className={`border rounded-lg p-3 ${
                        patient.queueNo === currentPatient.queueNo 
                          ? 'border-green-500 bg-green-50 border-2' 
                          : patient.isPriority
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-base">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-sm">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{patient.name}</p>
                        </div>
                        <Badge
                          className={
                            patient.status === 'in progress'
                              ? 'bg-blue-100 text-blue-700'
                              : patient.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700'
                              : patient.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </div>
                      
                      {patient.isPriority && (
                        <div className="mb-2">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Priority: {patient.priorityType}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Age: {patient.age} | Type: {patient.type}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.symptoms?.slice(0, 3).map((symptom, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                          {patient.symptoms?.length > 3 && (
                            <span className="text-xs text-gray-500">+{patient.symptoms.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Queue #</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Age</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Priority</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Symptoms</th>
                        <th className="border px-3 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPatients.map(patient => (
                        <tr 
                          key={patient.queueNo}
                          className={`border-b ${
                            patient.queueNo === currentPatient.queueNo 
                              ? 'bg-green-50 font-semibold' 
                              : patient.isPriority
                              ? 'bg-yellow-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 align-middle">
                            #{String(patient.queueNo).padStart(3, '0')}
                            {patient.queueNo === currentPatient.queueNo && (
                              <span className="ml-2 text-green-600 text-xs">(You)</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">{patient.name}</td>
                          <td className="p-3 align-middle">{patient.age}</td>
                          <td className="p-3 align-middle text-gray-600">{patient.type}</td>
                          <td className="p-3 align-middle">
                            {patient.isPriority ? (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {patient.priorityType}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {patient.symptoms?.slice(0, 2).map((symptom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {symptom}
                                </Badge>
                              ))}
                              {patient.symptoms?.length > 2 && (
                                <span className="text-xs text-gray-500">+{patient.symptoms.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-middle">
                            <Badge
                              className={
                                patient.status === 'in progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : patient.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {patient.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

export default QueueStatus;