import React, { useState, useEffect, useContext } from "react";
import Sidebar from "@/components/Sidebar";
import PatientSidebar from "@/components/PatientSidebar";
import { Bell, X, QrCode, User, RefreshCw, XCircle, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PatientContext } from "./PatientContext";

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

  // Helper function to check if patient accessed directly
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

  // Get current logged-in patient's email
  const currentPatientEmail = localStorage.getItem('currentPatientEmail');
  const isPatientLoggedIn = localStorage.getItem('isPatientLoggedIn') === 'true';

  // Set initial view mode based on access type
  useEffect(() => {
    if (isFromPatientSidebar) {
      if (viewMode !== 'clinic') {
        setViewMode('clinic');
      }
    } else if (isPatientAccess && !isFromPatientSidebar) {
      if (viewMode !== 'patient') {
        setViewMode('patient');
      }
    }
  }, [isPatientAccess, isFromPatientSidebar, viewMode]);

  // Force patient sidebar users to stay in clinic view
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
    clearActivePatient,
    requeuePatient,
    isLoadingFromDB
  } = useContext(PatientContext);

  // Validate that activePatient belongs to current logged-in patient
  const isMyAppointment = React.useMemo(() => {
    if (!activePatient || !isPatientLoggedIn || !currentPatientEmail) {
      return true;
    }

    if (activePatient.patientEmail) {
      const normalizedActiveEmail = activePatient.patientEmail.toLowerCase().trim();
      const normalizedCurrentEmail = currentPatientEmail.toLowerCase().trim();
      return normalizedActiveEmail === normalizedCurrentEmail;
    }

    return false;
  }, [activePatient, isPatientLoggedIn, currentPatientEmail]);

  // Always get the latest patient data from the patients array
  const currentPatient = patients?.find(p => {
    if (activePatient?.id && p.id === activePatient.id) return true;
    if (activePatient?.queueNo && p.queueNo === activePatient.queueNo) return true;
    return false;
  });

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("success");

  const queueNumber = (currentPatient?.queueNo && currentPatient.queueNo > 0) ? currentPatient.queueNo : 0;
  const service = currentPatient?.type || "Walk-in";
  const symptoms = currentPatient?.symptoms || [];

  // Get all patients assigned to the same doctor
  const doctorPatients = currentPatient?.assignedDoctor
    ? patients.filter(p => {
      if (!p.assignedDoctor || p.isInactive || !p.inQueue) return false;

      // Exclude done/completed patients
      if (p.status === 'done' || p.status === 'completed') return false;

      // Check if appointment is accepted (or not an appointment)
      if (p.type === "Appointment" && p.appointmentStatus !== "accepted") return false;

      // Compare by ID if both have IDs, otherwise compare by name
      const sameDoctor = p.assignedDoctor.id && currentPatient.assignedDoctor.id
        ? p.assignedDoctor.id === currentPatient.assignedDoctor.id
        : p.assignedDoctor.name === currentPatient.assignedDoctor.name;

      return sameDoctor;
    }).sort((a, b) => a.queueNo - b.queueNo)
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

  // IMPROVED: Mobile-Responsive Doctor Queue Display Component
  const DoctorQueueDisplay = ({ doctorName, doctorPatients, currentPatientId }) => {
    const ourPosition = doctorPatients.findIndex(p => p.id === currentPatientId) + 1;

    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:p-8">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 px-1">
          {doctorName}'s Queue
        </h3>

        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          {/* Patients in line - Improved mobile scrolling */}
          <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 lg:p-6">
            <p className="text-xs sm:text-sm md:text-base font-medium text-gray-600 mb-2 sm:mb-3 md:mb-4 px-1">
              Patients in line:
            </p>
            <div className="relative">
              {/* Mobile: Vertical stack for better visibility */}
              <div className="flex sm:hidden flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {doctorPatients.map((patient, index) => {
                  const isMe = patient.id === currentPatientId;
                  const isNowServing = patient.status === 'in progress';
                  const isPriority = patient.isPriority;

                  let bgColor = "bg-white";
                  let textColor = "text-gray-700";
                  let borderColor = "border-gray-300";
                  let shadow = "shadow";

                  if (isMe) {
                    bgColor = "bg-green-600";
                    textColor = "text-white";
                    borderColor = "border-green-600";
                    shadow = "shadow-lg";
                  } else if (isNowServing) {
                    bgColor = "bg-blue-500";
                    textColor = "text-white";
                    borderColor = "border-blue-500";
                  } else if (isPriority) {
                    bgColor = "bg-yellow-400";
                    textColor = "text-gray-900";
                    borderColor = "border-yellow-400";
                  }

                  return (
                    <div
                      key={patient.id}
                      className={`w-full h-16 rounded-lg border-2 ${borderColor} ${bgColor} flex items-center justify-between px-4 ${shadow} transition-all duration-200`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-3xl font-black ${textColor}`}>
                          {String(patient.queueNo).padStart(3, '0')}
                        </span>
                        {isMe && (
                          <span className={`text-sm font-semibold ${textColor} bg-white/20 px-2 py-1 rounded`}>
                            You
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${textColor} opacity-75`}>
                        #{index + 1}
                      </span>
                    </div>
                  );
                })}
                {doctorPatients.length === 0 && (
                  <div className="py-8 text-center text-gray-400 italic text-sm">
                    No patients currently in line
                  </div>
                )}
              </div>

              {/* Tablet and Desktop: Horizontal scroll */}
              <div className="hidden sm:flex overflow-x-auto gap-2.5 sm:gap-3 md:gap-4 pb-2 sm:pb-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {doctorPatients.map((patient) => {
                  const isMe = patient.id === currentPatientId;
                  const isNowServing = patient.status === 'in progress';
                  const isPriority = patient.isPriority;

                  let bgColor = "bg-white";
                  let textColor = "text-gray-700";
                  let borderColor = "border-gray-300";
                  let shadow = "shadow";

                  if (isMe) {
                    bgColor = "bg-green-600";
                    textColor = "text-white";
                    borderColor = "border-green-600";
                    shadow = "shadow-lg";
                  } else if (isNowServing) {
                    bgColor = "bg-blue-500";
                    textColor = "text-white";
                    borderColor = "border-blue-500";
                  } else if (isPriority) {
                    bgColor = "bg-yellow-400";
                    textColor = "text-gray-900";
                    borderColor = "border-yellow-400";
                  }

                  return (
                    <div
                      key={patient.id}
                      className={`flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl border-2 ${borderColor} ${bgColor} flex flex-col items-center justify-center ${shadow} transition-all duration-200 snap-start`}
                    >
                      <span className={`text-2xl sm:text-3xl md:text-4xl font-black ${textColor}`}>
                        {String(patient.queueNo).padStart(3, '0')}
                      </span>
                      {isMe && (
                        <span className={`text-xs sm:text-sm font-semibold mt-0.5 sm:mt-1 ${textColor}`}>
                          You
                        </span>
                      )}
                    </div>
                  );
                })}
                {doctorPatients.length === 0 && (
                  <div className="py-6 sm:py-8 text-gray-400 italic text-sm sm:text-base w-full text-center">
                    No patients currently in line
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legend - Improved mobile layout */}
          <div className="px-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-500 mb-2 sm:mb-3 md:mb-4">
              Legend:
            </p>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3 md:gap-x-6 md:gap-y-3 text-xs sm:text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-green-600 flex-shrink-0"></div>
                <span>Your Number</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-blue-500 flex-shrink-0"></div>
                <span>Now Serving</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-yellow-400 flex-shrink-0"></div>
                <span>Priority Patient</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-gray-300 bg-white flex-shrink-0"></div>
                <span>Waiting</span>
              </div>
            </div>
          </div>

          {/* Stats - Improved mobile layout */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 pt-4 sm:pt-6 md:pt-8 border-t border-gray-200">
            <div className="text-center bg-gray-50 rounded-sm p-3 sm:p-4">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 mb-1 sm:mb-2">
                {doctorPatients.length}
              </p>
              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-500">
                Total in Queue
              </p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 mb-1 sm:mb-2">
                {ourPosition > 0 ? ourPosition : '-'}
              </p>
              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-500">
                Your Position
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const peopleAhead = Math.max((queueNumber > 0 ? queueNumber : 0) - currentServing, 0);
  const estimatedWait = avgWaitTime;

  const isAppointmentPending = (currentPatient?.type === 'Appointment' && currentPatient?.appointmentStatus === 'pending') ||
    (currentPatient?.queueNo >= 900000);

  const isAppointmentRejected = currentPatient?.type === 'Appointment' &&
    currentPatient?.appointmentStatus === 'rejected';

  // Watch for status changes
  useEffect(() => {
    if (!currentPatient) return

    if (isAppointmentPending) return;

    const difference = queueNumber - currentServing;

    if (currentPatient.status === "cancelled") {
      setNotificationMessage("Your queue has been cancelled. You didn't show up.");
      setNotificationType("cancelled");
      setShowNotification(true);
      return;
    }

    if (currentPatient.status === "in progress") {
      setNotificationMessage("It's your turn now! Please proceed to the counter.");
      setNotificationType("success");
      setShowNotification(true);
      return;
    }

    if (difference === 1 && currentPatient.status === "waiting") {
      setNotificationMessage("Your turn is coming up soon! Please be ready.");
      setNotificationType("success");
      setShowNotification(true);
    } else if (difference === 0 && currentPatient.status === "waiting") {
      setNotificationMessage("It's your turn now! Please proceed to the counter.");
      setNotificationType("success");
      setShowNotification(true);
    } else {
      if (notificationType !== "cancelled") {
        setShowNotification(false);
      }
    }
  }, [currentPatient, currentServing, queueNumber, notificationType, isAppointmentPending]);

  const handleRequeue = () => {
    const oldQueueNo = queueNumber;
    requeuePatient(oldQueueNo);
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

  const handleDoneClick = () => {
    setShowDoneModal(true);
  };

  const handleConfirmDone = () => {
    setShowDoneModal(false);
    clearActivePatient();

    if (isFromPatientSidebar) {
      const params = new URLSearchParams();
      params.append('from', 'patient-sidebar');
      params.append('type', 'appointment');
      navigate(`/checkin?${params.toString()}`);
    } else {
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
        <div className={`${isCancelled ? "bg-red-600" : "bg-green-600"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-2xl max-w-md w-full animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2 text-center">
            Confirm Action
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center leading-relaxed">
            {isAppointmentPending ? (
              <>Are you sure you want to leave? You won't be able to see your appointment status updates unless you return to this page.</>
            ) : isAppointmentRejected ? (
              <>Are you sure you want to leave? You can book a new appointment after clicking "Done".</>
            ) : (
              <>Are you sure you're done? You can book a new appointment after completing this action.</>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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

  if (isLoadingFromDB) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 px-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="text-sm sm:text-base">Loading queue status...</span>
        </div>
      </div>
    );
  }

  if (!currentPatient) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 px-4 text-center">
        <p className="text-sm sm:text-base">Patient not found in the queue.</p>
      </div>
    );
  }

  if (isPatientLoggedIn && !isMyAppointment) {
    return (
      <div className="flex w-full min-h-screen">
        {isFromPatientSidebar ? (
          <PatientSidebar nav={nav} handleNav={handleNav} />
        ) : null}
        <div className={`flex-1 min-h-screen bg-gray-50 ${isFromPatientSidebar ? 'ml-0 md:ml-52' : ''} flex items-center justify-center p-4`}>
          <Card className="max-w-md w-full">
            <CardContent className="p-4 sm:p-6 text-center">
              <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                This appointment does not belong to your account.
              </p>
              <Button
                onClick={() => navigate('/homepage')}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
              >
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pending Appointment - Clinic View
  if (isAppointmentPending) {
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          {isFromPatientSidebar ? (
            <PatientSidebar nav={nav} handleNav={handleNav} />
          ) : (
            <Sidebar nav={nav} handleNav={handleNav} />
          )}
          <DoneConfirmationModal />
          <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-3 sm:p-4">
            <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
                <Badge className="text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Appointment Pending
                </Badge>

                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Appointment Submitted</h2>
                <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base px-2">
                  Your appointment request is pending approval from our secretary.
                </p>

                <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Name</span>
                    <span className="font-medium text-gray-900 text-right">{currentPatient.name}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Appointment Time</span>
                    <span className="font-medium text-gray-900 text-right">
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
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Status</span>
                    <span className="font-medium text-amber-600">Pending Approval</span>
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-gray-200">
                    <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {symptoms.map(symptom => (
                        <Badge
                          key={symptom}
                          variant="secondary"
                          className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                        >
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                      <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm text-blue-800">
                        Our secretary will review your appointment request. Once approved, you'll see your queue number and estimated wait time. Please check back later or wait for a notification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                  {!isPatientAccess && (
                    <Button
                      onClick={() => setViewMode('patient')}
                      className="w-full text-xs sm:text-sm md:text-base lg:text-lg bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3"
                      size="lg"
                    >
                      <User className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                      Switch to Patient View
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
                    size="lg"
                    onClick={handleDoneClick}
                  >
                    Done
                  </Button>
                </div>
              </div>

              {currentPatient?.assignedDoctor && !isAppointmentRejected && (
                <DoctorQueueDisplay
                  doctorName={currentPatient.assignedDoctor.name}
                  doctorPatients={doctorPatients}
                  currentPatientId={currentPatient.id}
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    // Pending Appointment - Patient View
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <DoneConfirmationModal />
        <div className="flex-1 p-3 sm:p-4">
          <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
              <Badge className="text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Appointment Pending
              </Badge>

              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Appointment Submitted</h2>
              <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base px-2">
                Your appointment request is pending approval from our secretary.
              </p>

              <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Name</span>
                  <span className="font-medium text-gray-900 text-right">{currentPatient.name}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Appointment Time</span>
                  <span className="font-medium text-gray-900 text-right">
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
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className="font-medium text-amber-600">Pending Approval</span>
                </div>

                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                    <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                    <p className="text-[10px] xs:text-xs sm:text-sm text-blue-800">
                      Our secretary will review your appointment request. Once approved, you'll see your queue number and estimated wait time. Please check back later or wait for a notification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('clinic')}
                    variant="outline"
                    className="w-full text-xs sm:text-sm md:text-base lg:text-lg border-green-600 text-green-600 hover:bg-green-50 py-2.5 sm:py-3"
                    size="lg"
                  >
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                    Back to Clinic View
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>

            {currentPatient?.assignedDoctor && !isAppointmentRejected && (
              <DoctorQueueDisplay
                doctorName={currentPatient.assignedDoctor.name}
                doctorPatients={doctorPatients}
                currentPatientId={currentPatient.id}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Rejected Appointment - Clinic View
  if (isAppointmentRejected) {
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          {isFromPatientSidebar ? (
            <PatientSidebar nav={nav} handleNav={handleNav} />
          ) : (
            <Sidebar nav={nav} handleNav={handleNav} />
          )}
          <DoneConfirmationModal />
          <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-3 sm:p-4">
            <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
                <Badge className="text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 bg-red-100 text-red-700 hover:bg-red-100">
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Appointment Declined
                </Badge>

                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Appointment Not Approved</h2>
                <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base px-2">
                  We're sorry, but your appointment request was not approved.
                </p>

                <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Name</span>
                    <span className="font-medium text-gray-900 text-right">{currentPatient.name}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Requested Time</span>
                    <span className="font-medium text-gray-900 text-right">
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
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 font-normal">Status</span>
                    <span className="font-medium text-red-600">Declined</span>
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-gray-200">
                    <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {symptoms.map(symptom => (
                        <Badge
                          key={symptom}
                          variant="secondary"
                          className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                        >
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {currentPatient.rejectionReason && (
                  <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-red-100 rounded-lg sm:rounded-xl border border-red-300">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-6 text-red-700 mt-0.5 flex-shrink-0" />
                      <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                        <p className="font-semibold text-red-900 mb-2">Reason for Appointment Refusal:</p>
                        <p className="text-[10px] xs:text-xs sm:text-sm text-red-800 mb-2">
                          {currentPatient.rejectionReason}
                        </p>
                        {currentPatient.rejectedAt && (
                          <p className="text-[10px] xs:text-xs text-red-700 italic">
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

                <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-red-50 rounded-lg sm:rounded-xl border border-red-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                      <p className="font-medium text-red-900 mb-1">What you can do:</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm text-red-800">
                        Please contact the clinic to reschedule or try booking a different time slot. You can also visit as a walk-in patient.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                  {!isPatientAccess && (
                    <Button
                      onClick={() => setViewMode('patient')}
                      className="w-full text-xs sm:text-sm md:text-base lg:text-lg bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3"
                      size="lg"
                    >
                      <User className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                      Switch to Patient View
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
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

    // Rejected Appointment - Patient View
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <DoneConfirmationModal />
        <div className="flex-1 p-3 sm:p-4">
          <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
              <Badge className="text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 bg-red-100 text-red-700 hover:bg-red-100">
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Appointment Declined
              </Badge>

              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Appointment Not Approved</h2>
              <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base px-2">
                We're sorry, but your appointment request was not approved.
              </p>

              <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Name</span>
                  <span className="font-medium text-gray-900 text-right">{currentPatient.name}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Requested Time</span>
                  <span className="font-medium text-gray-900 text-right">
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
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className="font-medium text-red-600">Declined</span>
                </div>

                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {currentPatient.rejectionReason && (
                <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-red-100 rounded-lg sm:rounded-xl border border-red-300">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-6 text-red-700 mt-0.5 flex-shrink-0" />
                    <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                      <p className="font-semibold text-red-900 mb-2">Reason for Rejection:</p>
                      <p className="text-[10px] xs:text-xs sm:text-sm text-red-800 mb-2">
                        {currentPatient.rejectionReason}
                      </p>
                      {currentPatient.rejectedAt && (
                        <p className="text-[10px] xs:text-xs text-red-700 italic">
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

              <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-red-50 rounded-lg sm:rounded-xl border border-red-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                    <p className="font-medium text-red-900 mb-1">What you can do:</p>
                    <p className="text-[10px] xs:text-xs sm:text-sm text-red-800">
                      Please contact the clinic to reschedule or try booking a different time slot. You can also visit as a walk-in patient.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('clinic')}
                    variant="outline"
                    className="w-full text-xs sm:text-sm md:text-base lg:text-lg border-green-600 text-green-600 hover:bg-green-50 py-2.5 sm:py-3"
                    size="lg"
                  >
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                    Back to Clinic View
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
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

  // Queue Status Updates - Clinic View
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
        <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 p-3 sm:p-4">
          <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
              <Badge className={`text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 ${currentPatient.status === 'cancelled'
                ? 'bg-red-100 text-red-700'
                : currentPatient.status === 'in progress'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-emerald-100 text-emerald-700'
                } hover:bg-emerald-100`}>
                <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                {currentPatient.status === 'cancelled' ? 'Cancelled' :
                  currentPatient.status === 'in progress' ? 'In Progress' : 'Queue Joined'}
              </Badge>

              {currentPatient.requeued && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>Requeued:</strong> Your original ticket #{String(currentPatient.originalQueueNo).padStart(3, '0')} has been replaced with this new ticket.
                  </p>
                </div>
              )}

              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-2">Your Queue Number</h2>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-600 mb-4 sm:mb-6">{queueNumber}</div>

              <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Service</span>
                  <span className="font-medium text-gray-900 text-right">{service}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Currently Serving</span>
                  <span className="font-medium text-gray-900">
                    #{String(currentServing).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Status</span>
                  <span className={`font-medium ${currentPatient.status === 'cancelled' ? 'text-red-600' :
                    currentPatient.status === 'in progress' ? 'text-green-600' :
                      'text-gray-900'
                    }`}>
                    {currentPatient.status}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">Estimated Wait</span>
                  <span className="font-medium text-gray-900">{estimatedWait} mins</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-600 font-normal">People Ahead</span>
                  <span className="font-medium text-gray-900">{peopleAhead}</span>
                </div>

                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {symptoms.map(symptom => (
                      <Badge
                        key={symptom}
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                      >
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                    <p className="font-medium text-amber-900 mb-1">Notifications Enabled</p>
                    <p className="text-[10px] xs:text-xs sm:text-sm text-amber-800">
                      You'll receive a push notification when your turn is near and when it's your turn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                {!isPatientAccess && (
                  <Button
                    onClick={() => setViewMode('patient')}
                    className="w-full text-xs sm:text-sm md:text-base lg:text-lg bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3"
                    size="lg"
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                    Switch to Patient View
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
                  size="lg"
                  onClick={handleDoneClick}
                >
                  Done
                </Button>
              </div>
            </div>

            {currentPatient?.assignedDoctor && !isAppointmentRejected && (
              <DoctorQueueDisplay
                doctorName={currentPatient.assignedDoctor.name}
                doctorPatients={doctorPatients}
                currentPatientId={currentPatient.id}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Queue Status Updates - Patient View
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <PushNotification />
      <DoneConfirmationModal />
      <div className="flex-1 p-3 sm:p-4">
        <div className="max-w-[800px] mt-4 sm:mt-8 md:mt-12 lg:mt-[50px] w-full mx-auto space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-6 text-center">
            <Badge className={`text-xs sm:text-sm md:text-lg mb-3 sm:mb-4 ${currentPatient.status === 'cancelled'
              ? 'bg-red-100 text-red-700'
              : currentPatient.status === 'in progress'
                ? 'bg-green-100 text-green-700'
                : 'bg-emerald-100 text-emerald-700'
              } hover:bg-emerald-100`}>
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              {currentPatient.status === 'cancelled' ? 'Cancelled' :
                currentPatient.status === 'in progress' ? 'In Progress' : 'Queue Joined'}
            </Badge>

            {currentPatient.requeued && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Requeued:</strong> Your original ticket #{String(currentPatient.originalQueueNo).padStart(3, '0')} has been replaced with this new ticket.
                </p>
              </div>
            )}

            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-2">Your Queue Number</h2>
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-600 mb-4 sm:mb-6">{queueNumber}</div>

            <div className="space-y-2 sm:space-y-3 text-left bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm md:text-base lg:text-lg">
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-600 font-normal">Service</span>
                <span className="font-medium text-gray-900 text-right">{service}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-600 font-normal">Currently Serving</span>
                <span className="font-medium text-gray-900">
                  #{String(currentServing).padStart(3, "0")}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-600 font-normal">Status</span>
                <span className={`font-medium ${currentPatient.status === 'cancelled' ? 'text-red-600' :
                  currentPatient.status === 'in progress' ? 'text-green-600' :
                    'text-gray-900'
                  }`}>
                  {currentPatient.status}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-600 font-normal">Estimated Wait</span>
                <span className="font-medium text-gray-900">{estimatedWait} mins</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-600 font-normal">People Ahead</span>
                <span className="font-medium text-gray-900">{peopleAhead}</span>
              </div>

              <div className="pt-2 sm:pt-3 border-t border-gray-200">
                <span className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg font-normal">Symptoms:</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {symptoms.map(symptom => (
                    <Badge
                      key={symptom}
                      variant="secondary"
                      className="bg-green-100 text-green-700 text-xs sm:text-sm md:text-base"
                    >
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 md:p-4 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-200">
              <div className="flex items-start gap-2 sm:gap-3">
                <Bell className="w-4 h-4 sm:w-5 sm:h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left text-xs sm:text-sm md:text-base lg:text-lg">
                  <p className="font-medium text-amber-900 mb-1">Notifications Enabled</p>
                  <p className="text-[10px] xs:text-xs sm:text-sm text-amber-800">
                    You'll receive a push notification when your turn is near and when it's your turn.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
              {!isPatientAccess && (
                <Button
                  onClick={() => setViewMode('clinic')}
                  variant="outline"
                  className="w-full text-xs sm:text-sm md:text-base lg:text-lg border-green-600 text-green-600 hover:bg-green-50 py-2.5 sm:py-3"
                  size="lg"
                >
                  <QrCode className="w-3 h-3 sm:w-4 sm:h-5 mr-1.5 sm:mr-2" />
                  Back to Clinic View
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-2.5 sm:py-3"
                size="lg"
                onClick={handleDoneClick}
              >
                Done
              </Button>
            </div>
          </div>

          {currentPatient?.assignedDoctor && !isAppointmentRejected && (
            <DoctorQueueDisplay
              doctorName={currentPatient.assignedDoctor.name}
              doctorPatients={doctorPatients}
              currentPatientId={currentPatient.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default QueueStatus;