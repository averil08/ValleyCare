import React, { useContext } from 'react';
import PatientSidebar from "@/components/PatientSidebar";
import { PatientContext } from "./PatientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Stethoscope, Activity, User, Phone, FileText, AlertCircle } from 'lucide-react';

//THIS IS THE APPOINTMENT HISTORY OF PATIENT UI
const AppointmentHistory = () => {
  const [nav, setNav] = React.useState(false);
  const handleNav = () => setNav(!nav);
  
  const { patients, activePatient, setActivePatient } = useContext(PatientContext);

  // Get current logged-in patient's email
  const currentPatientEmail = localStorage.getItem('currentPatientEmail');

  // ✅ ADD THIS NEW useEffect - Auto-set activePatient on mount
  React.useEffect(() => {
    // ✅ ADD THIS CHECK - Don't run if patients isn't loaded yet
    if (!patients || patients.length === 0) {
      console.log('⏳ Waiting for patients to load...');
      return;
    }

    if (currentPatientEmail && !activePatient) {
      // Find the most recent appointment/visit for this patient
      const normalizedEmail = currentPatientEmail.toLowerCase().trim();
      
      const myMostRecentVisit = patients
        .filter(p => {
          if (p.isInactive) return false;
          if (!p.patientEmail) return false;
          return p.patientEmail.toLowerCase().trim() === normalizedEmail;
        })
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))[0];

      if (myMostRecentVisit) {
        console.log('✅ Auto-setting activePatient:', myMostRecentVisit);
        setActivePatient(myMostRecentVisit);
      } else {
        console.log('⚠️ No visits found for email:', currentPatientEmail);
      }
    }
  }, [currentPatientEmail, patients, activePatient, setActivePatient]);

  // Service labels mapping
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

  // ✅ UPDATED: Filter appointments by current logged-in patient's email
  const myAppointments = React.useMemo(() => {
    if (!activePatient || !currentPatientEmail) return [];

    // Normalize email for comparison
    const normalizedCurrentEmail = currentPatientEmail.toLowerCase().trim();

    return patients
      .filter(p => {
        // Skip inactive patients
        if (p.isInactive) return false;
        
        // ✅ NEW: Only show appointments that belong to the current logged-in patient
        // Match by patientEmail field
        if (p.patientEmail) {
          const normalizedPatientEmail = p.patientEmail.toLowerCase().trim();
          return normalizedPatientEmail === normalizedCurrentEmail;
        }
        
        // For backward compatibility: if no patientEmail, don't show
        return false;
      })
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }, [patients, activePatient, currentPatientEmail]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (appointment) => {
    if (appointment.type === 'Appointment') {
      if (appointment.appointmentStatus === 'pending') {
        return <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>;
      } else if (appointment.appointmentStatus === 'rejected') {
        return <Badge variant="destructive" className="bg-red-600 text-white">Not Approved</Badge>;
      } else if (appointment.appointmentStatus === 'accepted') {
        if (appointment.status === 'done') {
          return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
        } else if (appointment.status === 'in progress') {
          return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
        } else if (appointment.status === 'cancelled') {
          return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
        } else {
          return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
        }
      }
    }
    
    // Walk-in status
    if (appointment.status === 'done') {
      return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
    } else if (appointment.status === 'in progress') {
      return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
    } else if (appointment.status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-700">Waiting</Badge>;
    }
  };

  const getVisitTypeBadge = (appointment) => {
    if (appointment.type === 'Appointment') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Appointment</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Walk-in</Badge>;
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    return {
      total: myAppointments.length,
      completed: myAppointments.filter(a => a.status === 'done').length,
      upcoming: myAppointments.filter(a => 
        a.type === 'Appointment' && 
        a.appointmentStatus === 'accepted' && 
        a.status === 'waiting'
      ).length,
      pending: myAppointments.filter(a => 
        a.type === 'Appointment' && 
        a.appointmentStatus === 'pending'
      ).length
    };
  }, [myAppointments]);

  // ✅ UPDATED: Add loading state and delay the error message
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);

  React.useEffect(() => {
    // Give the app time to load session data
    const timer = setTimeout(() => {
      setIsCheckingSession(false);
    }, 500); // Wait 500ms before showing "No Active Session"

    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="flex w-full min-h-screen">
        <PatientSidebar nav={nav} handleNav={handleNav} />
        <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error only after checking session
  if (!activePatient || !currentPatientEmail) {
    return (
      <div className="flex w-full min-h-screen">
        <PatientSidebar nav={nav} handleNav={handleNav} />
        <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Session</h3>
              <p className="text-gray-600">Please log in to view your profile and appointment history.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      <PatientSidebar nav={nav} handleNav={handleNav} />

      <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="hidden sm:flex items-center justify-between mb-3 pt-12 lg:pt-8">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">My Appointments</h1>
                  <p className="text-xs sm:text-sm text-gray-600">View your appointment history and profile</p>
                </div>
              </div>
            </div>

            <div className="sm:hidden space-y-3 mb-3">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">My Appointments</h1>
                  <p className="text-xs text-gray-600">View your appointment history</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Patient Info Card */}
          <Card className="border-t-4 border-t-green-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="font-semibold text-gray-900">{activePatient.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Age</p>
                    <p className="font-semibold text-gray-900">{activePatient.age} years old</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="font-semibold text-gray-900">{activePatient.phoneNum || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </CardContent>
            </Card>
          </div>

          {/* Appointment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Appointment & Visit History ({myAppointments.length})
              </CardTitle>
              <CardDescription>Complete record of all your visits and appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {myAppointments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No visits recorded yet</p>
                  <p className="text-sm">Your appointment and visit history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAppointments.map((appointment, idx) => (
                    <Card 
                      key={appointment.queueNo} 
                      className={`border-l-4 ${
                        appointment.status === 'done' ? 'border-l-emerald-600' :
                        appointment.status === 'cancelled' ? 'border-l-red-600' :
                        appointment.status === 'in progress' ? 'border-l-blue-600' :
                        appointment.appointmentStatus === 'pending' ? 'border-l-amber-600' :
                        appointment.appointmentStatus === 'rejected' ? 'border-l-red-600' :
                        'border-l-yellow-600'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">Visit #{myAppointments.length - idx}</h4>
                              {getStatusBadge(appointment)}
                              {getVisitTypeBadge(appointment)}
                              {appointment.requeued && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                  Requeued
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">Queue #{String(appointment.queueNo).padStart(3, '0')}</p>
                          </div>
                        </div>

                        {/* Appointment Time (for appointments only) */}
                        {appointment.type === 'Appointment' && appointment.appointmentDateTime && (
                          <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-purple-600" />
                              <p className="text-xs font-semibold text-purple-900">Scheduled Appointment Time</p>
                            </div>
                            <p className="text-sm font-medium text-purple-700">{formatDate(appointment.appointmentDateTime)}</p>
                          </div>
                        )}

                        {/* Registration Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="text-gray-600">Registered</p>
                              <p className="font-medium">{formatDate(appointment.registeredAt)}</p>
                            </div>
                          </div>
                          
                          {appointment.assignedDoctor && (
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-gray-600">Doctor</p>
                                <p className="font-medium text-green-700">{appointment.assignedDoctor.name}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Symptoms */}
                        {appointment.symptoms && appointment.symptoms.length > 0 && (
                          <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-red-600" />
                              <p className="text-xs font-semibold text-red-900">Symptoms</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {appointment.symptoms.map((symptom, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-white text-red-700 border-red-200">
                                  {symptom}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Services */}
                        {appointment.services && appointment.services.length > 0 && (
                          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Stethoscope className="w-4 h-4 text-green-600" />
                              <p className="text-xs font-semibold text-green-900">Services Requested</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {appointment.services.map((serviceId, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-white text-green-700 border-green-200">
                                  {getServiceLabel(serviceId)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {appointment.appointmentStatus === 'rejected' && appointment.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-300">
                            <p className="text-xs font-semibold text-red-900 mb-1">Reason for Not Accepting</p>
                            <p className="text-sm text-red-800">{appointment.rejectionReason}</p>
                            {appointment.rejectedAt && (
                              <p className="text-xs text-red-600 mt-1">
                                Not approved on {formatDate(appointment.rejectedAt)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Completion Time */}
                        {appointment.completedAt && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-600">Completed:</p>
                            <p className="font-medium text-emerald-700">{formatDate(appointment.completedAt)}</p>
                          </div>
                        )}

                        {/* Cancellation Time */}
                        {appointment.cancelledAt && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-gray-600">Cancelled:</p>
                            <p className="font-medium text-red-700">{formatDate(appointment.cancelledAt)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentHistory;