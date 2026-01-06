import React, { useState, useEffect, useContext } from "react";
import Sidebar from "@/components/Sidebar";
//added MessageSquare icon
import { Bell, X, QrCode, User, RefreshCw, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PatientContext } from "./PatientContext";

const QueueStatus = () => {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  
  const [viewMode, setViewMode] = useState('clinic');
  // ✅ Check URL parameters to determine if patient accessed directly
  const getInitialPatientAccess = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view') === 'patient';
  };

  const [isPatientAccess, setIsPatientAccess] = useState(getInitialPatientAccess());

  // ✅ Set initial view mode based on access type
  useEffect(() => {
    if (isPatientAccess) {
      setViewMode('patient');
    }
  }, [isPatientAccess]);

  // ✅ Force patient access to always stay in patient view
  useEffect(() => {
    if (isPatientAccess && viewMode === 'clinic') {
      setViewMode('patient');
    }
  }, [viewMode, isPatientAccess]);
  
  const { 
    patients, 
    activePatient, 
    currentServing, 
    avgWaitTime,
    setActivePatient,
    requeuePatient
  } = useContext(PatientContext);

  // ✅ Always get the latest patient data from the patients array
  const currentPatient = patients.find(p => p.queueNo === activePatient?.queueNo);

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

  // ✅ FIXED: Show flat wait time (no calculation based on queue position)
  const peopleAhead = Math.max(queueNumber - currentServing, 0);
  const estimatedWait = avgWaitTime; // Just use the avgWaitTime directly

  // ✅ Check if appointment is pending approval
  const isAppointmentPending = currentPatient?.type === 'Appointment' && 
    (!currentPatient?.appointmentStatus || currentPatient?.appointmentStatus === 'pending');

  // ✅ Check if appointment is rejected
  const isAppointmentRejected = currentPatient?.type === 'Appointment' && 
    currentPatient?.appointmentStatus === 'rejected';

  // ✅ Watch for status changes in the patients array
  useEffect(() => {
    if (!currentPatient) return;

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

  // ✅ Handle requeue - creates new ticket and updates activePatient
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

  if (!currentPatient) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Patient not found in the queue.
      </div>
    );
  }

  // === PENDING APPOINTMENT APPROVAL VIEW ===
  if (isAppointmentPending) {
    // Clinic View
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          <Sidebar nav={nav} handleNav={handleNav} />
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
                    onClick={() => {
                      setActivePatient(null);
                      navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                    }}
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

    // Patient View
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
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
                  onClick={() => {
                    setActivePatient(null);
                    navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                  }}
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

  // === REJECTED APPOINTMENT VIEW ===
  if (isAppointmentRejected) {
    // Clinic View
    if (viewMode === 'clinic') {
      return (
        <div className="flex w-full min-h-screen">
          <Sidebar nav={nav} handleNav={handleNav} />
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
                    onClick={() => {
                      setActivePatient(null);
                      navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                    }}
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

    // Patient View
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
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
                  onClick={() => {
                    setActivePatient(null);
                    navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                  }}
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

  // === NORMAL QUEUE STATUS VIEW (After approval or Walk-in) ===
  // Clinic View
  if (viewMode === 'clinic') {
    return (
      <div className="flex w-full min-h-screen">
        <Sidebar nav={nav} handleNav={handleNav} />
        <PushNotification />
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
                    Switch to Patient View
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-lg"
                  size="lg"
                  onClick={() => {
                    setActivePatient(null);
                    navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                  }}
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

  // Patient View
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <PushNotification />
      
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
                  onClick={() => {
                    setActivePatient(null);
                    navigate(`/checkin${isPatientAccess ? '?view=patient' : ''}`);
                  }}
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