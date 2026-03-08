import React, { useContext } from 'react';
import PatientSidebar from "@/components/PatientSidebar";
import { PatientContext } from "./PatientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Stethoscope, Activity, User, Phone, FileText, AlertCircle, X, History, Eye, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

//THIS IS THE APPOINTMENT HISTORY OF PATIENT UI
const AppointmentHistory = () => {
  const [nav, setNav] = React.useState(false);
  const handleNav = () => setNav(!nav);

  const { patients } = useContext(PatientContext);

  // Get current logged-in patient's email
  const currentPatientEmail = localStorage.getItem('currentPatientEmail');

  // State for toggling history visibility
  const [showHistory, setShowHistory] = React.useState(false);

  // State for viewing appointment details
  const [selectedAppointment, setSelectedAppointment] = React.useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  // ✨ NEW: State for past visits modal
  const [showPastVisitsModal, setShowPastVisitsModal] = React.useState(false);

  // ✨ NEW: State for status filter
  const [statusFilter, setStatusFilter] = React.useState('all');

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

  // ✨ Helper function to get appointment status category
  const getAppointmentStatusCategory = (appointment) => {
    if (!appointment) return 'unknown';
    if (appointment.type === 'Appointment') {
      if (appointment.appointmentStatus === 'pending') {
        return 'pending';
      } else if (appointment.appointmentStatus === 'rejected') {
        return 'not-approved';
      } else if (appointment.appointmentStatus === 'accepted') {
        if (appointment.status === 'done') {
          return 'completed';
        } else if (appointment.status === 'in progress') {
          return 'in-progress';
        } else if (appointment.status === 'cancelled') {
          return 'cancelled';
        } else {
          return 'upcoming';
        }
      }
    }

    // Walk-in status
    if (appointment.status === 'done') {
      return 'completed';
    } else if (appointment.status === 'in progress') {
      return 'in-progress';
    } else if (appointment.status === 'cancelled') {
      return 'cancelled';
    } else {
      return 'upcoming';
    }
  };

  // Filter appointments by current logged-in patient's email
  const myAppointments = React.useMemo(() => {
    if (!currentPatientEmail) return [];

    const normalizedCurrentEmail = currentPatientEmail.toLowerCase().trim();

    return patients
      .filter(p => {
        if (p.isInactive) return false;

        if (p.patientEmail) {
          const normalizedPatientEmail = p.patientEmail.toLowerCase().trim();
          if (normalizedPatientEmail !== normalizedCurrentEmail) return false;

          // ✨ Filter: include all valid status categories
          const category = getAppointmentStatusCategory(p);
          return ['completed', 'in-progress', 'upcoming', 'pending', 'cancelled', 'not-approved'].includes(category);
        }

        return false;
      })
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }, [patients, currentPatientEmail]);

  // Valid status categories for the "Summaries" view
  const validSummaryAppointments = React.useMemo(() => {
    return myAppointments.filter(a =>
      ['upcoming', 'in-progress', 'completed'].includes(getAppointmentStatusCategory(a))
    );
  }, [myAppointments]);



  // ✨ NEW: Filter appointments based on selected status
  const filteredAppointments = React.useMemo(() => {
    if (statusFilter === 'all') return myAppointments;

    return myAppointments.filter(appointment => {
      const category = getAppointmentStatusCategory(appointment);
      return category === statusFilter;
    });
  }, [myAppointments, statusFilter]);

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

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (appointment) => {
    const category = getAppointmentStatusCategory(appointment);

    if (category === 'completed') {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>;
    } else if (category === 'in-progress') {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
    } else if (category === 'pending') {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
    } else if (category === 'not-approved') {
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Not Accepted</Badge>;
    } else if (category === 'cancelled') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelled</Badge>;
    } else {
      // Default to Upcoming for everything else shown in the list
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>;
    }
  };

  const getVisitTypeBadge = (appointment) => {
    if (!appointment || !appointment.type) return null;
    if (appointment.type === 'Appointment') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Appointment</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Walk-in</Badge>;
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    return {
      total: myAppointments.length,
      completed: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'completed').length,
      upcoming: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'upcoming').length,
      inProgress: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'in-progress').length
    };
  }, [myAppointments]);

  // ✨ NEW: Calculate filter counts
  const filterCounts = React.useMemo(() => {
    return {
      all: myAppointments.length,
      upcoming: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'upcoming').length,
      'in-progress': myAppointments.filter(a => getAppointmentStatusCategory(a) === 'in-progress').length,
      completed: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'completed').length,
      pending: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'pending').length,
      'not-approved': myAppointments.filter(a => getAppointmentStatusCategory(a) === 'not-approved').length,
      cancelled: myAppointments.filter(a => getAppointmentStatusCategory(a) === 'cancelled').length,
    };
  }, [myAppointments]);

  // Show error only if no currentPatientEmail
  if (!currentPatientEmail) {
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

  // Find the most recent patient entry to display personal info
  const currentPatientInfo = myAppointments.length > 0 ? myAppointments[0] : null;

  // Render appointment card for mobile
  const renderAppointmentCard = (appointment, idx) => {
    const category = getAppointmentStatusCategory(appointment);
    return (
      <Card
        key={appointment.id || appointment.queueNo}
        className={`mb-4 border-l-4 ${category === 'completed' ? 'border-l-emerald-600' :
          category === 'in-progress' ? 'border-l-blue-600' :
            'border-l-green-600'
          }`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-900">Visit #{myAppointments.length - idx}</h4>
                {getStatusBadge(appointment)}
              </div>
              <p className="text-sm text-gray-600">Queue #{String(appointment.queueNo).padStart(3, '0')}</p>
            </div>
            {getVisitTypeBadge(appointment)}
          </div>

          {/* Registration Date */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{formatDateShort(appointment.registeredAt)}</span>
          </div>

          {/* Doctor */}
          {appointment.assignedDoctor && (
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium text-sm">
                {appointment.assignedDoctor.name}
              </span>
            </div>
          )}

          {/* Symptoms */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">Symptoms:</p>
            <div className="flex flex-wrap gap-1.5">
              {appointment.symptoms && appointment.symptoms.length > 0 ? (
                <>
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {appointment.symptoms[0]}
                  </Badge>
                  {appointment.symptoms.length > 1 && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                      +{appointment.symptoms.length - 1} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-gray-400 text-sm">None</span>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">Services:</p>
            <div className="flex flex-wrap gap-1.5">
              {appointment.services && appointment.services.length > 0 ? (
                <>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {getServiceLabel(appointment.services[0])}
                  </Badge>
                  {appointment.services.length > 1 && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                      +{appointment.services.length - 1} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-gray-400 text-sm">None</span>
              )}
            </div>
          </div>

          {/* View Details Button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => {
              setSelectedAppointment(appointment);
              setIsDetailDialogOpen(true);
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Full Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  // ✨ NEW: Modal Component for Past Visits
  const PastVisitsModal = () => {
    if (!showPastVisitsModal) return null;

    // Get all valid summaries except the one displayed on the main card
    const pastVisits = validSummaryAppointments.slice(1);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-green-600" />
                <div>
                  <CardTitle>Appointment Summaries</CardTitle>
                  <CardDescription>View your appointment status ({pastVisits.length} total)</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPastVisitsModal(false)}
                className="hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 overflow-y-auto flex-1">
            {pastVisits.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No past visits</p>
                <p className="text-sm">Your visit history will appear here after your first visit</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastVisits.map((visit, idx) => (
                  <Card
                    key={visit.id || visit.queueNo}
                    className={`border-l-4 hover:shadow-md transition-shadow ${getAppointmentStatusCategory(visit) === 'completed' ? 'border-l-emerald-600' :
                      getAppointmentStatusCategory(visit) === 'in-progress' ? 'border-l-blue-600' :
                        'border-l-green-600'
                      }`}
                  >
                    <CardContent className="p-4">
                      {/* Visit Header - Scheduled Time */}
                      <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-purple-50 rounded border border-purple-100">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-xs text-purple-500 font-semibold uppercase tracking-wider">Scheduled Date & Time</p>
                            <p className="text-base font-bold text-purple-900">
                              {visit.appointmentDateTime ? formatDate(visit.appointmentDateTime) : formatDate(visit.registeredAt)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(visit)}
                      </div>

                      {/* Visit Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Doctor */}
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <Stethoscope className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 mb-1">Doctor</p>
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {visit.assignedDoctor ? visit.assignedDoctor.name : 'Not assigned'}
                            </p>
                          </div>
                        </div>

                        {/* Symptoms */}
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <Activity className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 mb-1">
                              Symptoms ({visit.symptoms?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {visit.symptoms && visit.symptoms.length > 0 ? (
                                <>
                                  {visit.symptoms.slice(0, 2).map((symptom, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs bg-white text-red-700 border-red-200"
                                    >
                                      {symptom}
                                    </Badge>
                                  ))}
                                  {visit.symptoms.length > 2 && (
                                    <span className="text-xs text-gray-600">
                                      +{visit.symptoms.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm font-semibold text-gray-900">None</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Services */}
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 mb-1">
                              Services ({visit.services?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {visit.services && visit.services.length > 0 ? (
                                <>
                                  {visit.services.slice(0, 2).map((serviceId, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs bg-white text-purple-700 border-purple-200"
                                    >
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))}
                                  {visit.services.length > 2 && (
                                    <span className="text-xs text-gray-600">
                                      +{visit.services.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm font-semibold text-gray-900">None</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Detail Dialog Component
  const DetailDialog = () => {
    if (!isDetailDialogOpen || !selectedAppointment) return null;

    const appointment = selectedAppointment;
    const idx = myAppointments.indexOf(appointment);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-green-600" />
                  Visit #{myAppointments.length - idx} Details
                </CardTitle>
                <CardDescription>
                  Queue #{String(appointment.queueNo).padStart(3, '0')} • {appointment.type}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDetailDialogOpen(false)}
                className="hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(appointment)}
              {getVisitTypeBadge(appointment)}
              {appointment.requeued && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                  Requeued
                </Badge>
              )}
            </div>

            {/* Appointment Time */}
            {appointment.type === 'Appointment' && appointment.appointmentDateTime && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-semibold text-purple-900">Scheduled Appointment Time</p>
                </div>
                <p className="text-sm font-medium text-purple-700">{formatDate(appointment.appointmentDateTime)}</p>
              </div>
            )}

            {/* Registration & Doctor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Registered</p>
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(appointment.registeredAt)}</p>
                </div>
              </div>

              {appointment.assignedDoctor && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Stethoscope className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Doctor</p>
                    <p className="font-semibold text-green-700 text-sm">{appointment.assignedDoctor.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Symptoms */}
            {appointment.symptoms && appointment.symptoms.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-semibold text-red-900">Symptoms</p>
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
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-900">Services Requested</p>
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
              <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                <p className="text-sm font-semibold text-red-900 mb-1">Reason for Not Accepting</p>
                <p className="text-sm text-red-800">{appointment.rejectionReason}</p>
                {appointment.rejectedAt && (
                  <p className="text-xs text-red-600 mt-2">
                    Not approved on {formatDate(appointment.rejectedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Completion/Cancellation */}
            {appointment.completedAt && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs text-gray-600 mb-1">Completed</p>
                <p className="font-medium text-emerald-700">{formatDate(appointment.completedAt)}</p>
              </div>
            )}

            {appointment.cancelledAt && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-gray-600 mb-1">Cancelled</p>
                <p className="font-medium text-red-700">{formatDate(appointment.cancelledAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <PatientSidebar nav={nav} handleNav={handleNav} />

      {/* Past Visits Modal */}
      <PastVisitsModal />

      {/* Detail Dialog */}
      <DetailDialog />

      <div className="min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3 pt-12 lg:pt-8">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Clinic Visit History</h1>
                  <p className="text-xs sm:text-sm text-gray-600">View your clinic visit history and profile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Current Active Visit Summary Card */}
          {(() => {
            const now = new Date();
            // 1. Look for upcoming accepted appointments
            const upcoming = myAppointments.filter(v =>
              v.type === 'Appointment' &&
              v.appointmentStatus === 'accepted' &&
              new Date(v.appointmentDateTime || v.appointment_datetime) > now
            ).sort((a, b) => new Date(a.appointmentDateTime || a.appointment_datetime) - new Date(b.appointmentDateTime || b.appointment_datetime))[0];

            // 2. Look for the most recent "done" visit
            const mostRecentDone = validSummaryAppointments.find(v => v.status === 'done');

            const inProgress = validSummaryAppointments.find(a => getAppointmentStatusCategory(a) === 'in-progress');

            // 3. Representative visit (In Progress > Upcoming > Done > Most Recent Overall within valid categories)
            const activeVisit = inProgress || upcoming || mostRecentDone || validSummaryAppointments[0];

            if (!activeVisit) return null;

            const category = getAppointmentStatusCategory(activeVisit);
            const isUpcoming = category === 'upcoming';
            const isInProgress = category === 'in-progress';
            const isCompleted = category === 'completed';

            const cardStyle = isCompleted ? 'border-t-emerald-600' : (isInProgress || isUpcoming) ? 'border-t-blue-600' : 'border-t-gray-600';
            const bgStyle = isCompleted ? 'bg-emerald-50/50' : (isInProgress || isUpcoming) ? 'bg-blue-50/50' : 'bg-gray-50/50';

            return (
              <Card className={`border-t-4 shadow-lg ${cardStyle}`}>
                <CardHeader className={bgStyle}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex flex-col gap-1">
                        <CardTitle className={`flex items-center gap-2 ${isCompleted ? 'text-emerald-900' : 'text-blue-900'}`}>
                          <Activity className="w-5 h-5" />
                          Appointment Summaries
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(activeVisit)}
                        </div>
                      </div>
                    </div>

                    {/* ✨ NEW: View Past Visits Button */}
                    {validSummaryAppointments.length > 1 && (
                      <Button
                        onClick={() => setShowPastVisitsModal(true)}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50 w-full sm:w-auto"
                      >
                        <History className="w-4 h-4 mr-2" />
                        View More Summaries ({validSummaryAppointments.length - 1})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Assigned Doctor */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Stethoscope className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Assigned Doctor</p>
                        <p className="font-semibold text-gray-900">
                          {activeVisit.assignedDoctor ? activeVisit.assignedDoctor.name : 'Not assigned'}
                        </p>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Activity className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Symptoms ({activeVisit.symptoms?.length || 0})</p>
                        <div className="flex flex-wrap gap-1">
                          {activeVisit.symptoms && activeVisit.symptoms.length > 0 ? (
                            activeVisit.symptoms.slice(0, 2).map((symptom, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-white text-red-700 border-red-200">
                                {symptom}
                              </Badge>
                            ))
                          ) : (
                            <p className="font-semibold text-gray-900">None</p>
                          )}
                          {activeVisit.symptoms && activeVisit.symptoms.length > 2 && (
                            <span className="text-xs text-gray-600">+{activeVisit.symptoms.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Services Requested */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Services ({activeVisit.services?.length || 0})</p>
                        <div className="flex flex-wrap gap-1">
                          {activeVisit.services && activeVisit.services.length > 0 ? (
                            activeVisit.services.slice(0, 2).map((serviceId, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-white text-purple-700 border-purple-200">
                                {getServiceLabel(serviceId)}
                              </Badge>
                            ))
                          ) : (
                            <p className="font-semibold text-gray-900">None</p>
                          )}
                          {activeVisit.services && activeVisit.services.length > 2 && (
                            <span className="text-xs text-gray-600">+{activeVisit.services.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Date & Time */}
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 md:col-span-3">
                      <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-purple-500 mb-1 font-semibold">Scheduled Date & Time</p>
                        <p className="font-bold text-gray-900">
                          {activeVisit.appointmentDateTime ? formatDate(activeVisit.appointmentDateTime) : formatDate(activeVisit.registeredAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Patient Info Card */}
          {currentPatientInfo && (
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
                      <p className="font-semibold text-gray-900">{currentPatientInfo.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Age</p>
                      <p className="font-semibold text-gray-900">{currentPatientInfo.age} years old</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                      <p className="font-semibold text-gray-900">{(currentPatientInfo.phoneNum || '').replace(/^\+63/, '0') || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <p className="text-sm text-gray-600 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </CardContent>
            </Card>
          </div>

          {/* Appointment History Table/Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Appointment & Visit History ({filteredAppointments.length})
                </CardTitle>
                <CardDescription>Complete record of all your visits and appointments</CardDescription>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors"
                title={showHistory ? "Hide expanded history" : "Show all history"}
              >
                {showHistory ? "Hide History" : "Show History"}
              </button>
            </CardHeader>
            {showHistory && (
              <CardContent className="p-0">
                {/* ✨ NEW: Filter Buttons */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-700">Filter by Status:</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('all')}
                      className={statusFilter === 'all' ? 'bg-gray-900 hover:bg-gray-800' : ''}
                    >
                      All ({filterCounts.all})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('upcoming')}
                      className={statusFilter === 'upcoming' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}
                    >
                      Upcoming ({filterCounts.upcoming})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'in-progress' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('in-progress')}
                      className={statusFilter === 'in-progress' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}
                    >
                      In Progress ({filterCounts['in-progress']})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'completed' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('completed')}
                      className={statusFilter === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                    >
                      Completed ({filterCounts.completed})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'pending' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('pending')}
                      className={statusFilter === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
                    >
                      Pending ({filterCounts.pending})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'not-approved' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('not-approved')}
                      className={statusFilter === 'not-approved' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    >
                      Not Accepted ({filterCounts['not-approved']})
                    </Button>
                    <Button
                      size="sm"
                      variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('cancelled')}
                      className={statusFilter === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'border-red-300 text-red-700 hover:bg-red-50'}
                    >
                      Cancelled ({filterCounts.cancelled})
                    </Button>
                  </div>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-12 px-4 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No {statusFilter !== 'all' ? statusFilter.replace('-', ' ') : ''} visits found</p>
                    <p className="text-sm">
                      {statusFilter !== 'all'
                        ? `You don't have any ${statusFilter.replace('-', ' ')} appointments yet`
                        : 'Your appointment and visit history will appear here'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden p-4">
                      {filteredAppointments.map((appointment, idx) => renderAppointmentCard(appointment, myAppointments.indexOf(appointment)))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold text-gray-700">Visit #</TableHead>
                            <TableHead className="font-semibold text-gray-700">Queue #</TableHead>
                            <TableHead className="font-semibold text-gray-700">Type</TableHead>
                            <TableHead className="font-semibold text-gray-700">Doctor</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment, idx) => {
                            const originalIdx = myAppointments.indexOf(appointment);
                            return (
                              <TableRow
                                key={appointment.id || appointment.queueNo}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <TableCell className="font-medium">
                                  <Badge variant="outline" className="font-mono">
                                    #{myAppointments.length - originalIdx}
                                  </Badge>
                                </TableCell>

                                <TableCell className="font-medium">
                                  <Badge variant="outline" className="font-mono">
                                    #{String(appointment.queueNo).padStart(3, '0')}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  {getVisitTypeBadge(appointment)}
                                </TableCell>

                                <TableCell>
                                  {appointment.assignedDoctor ? (
                                    <div className="flex items-center gap-2">
                                      <Stethoscope className="w-4 h-4 text-green-600" />
                                      <span className="text-green-700 font-medium text-sm">
                                        {appointment.assignedDoctor.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Not assigned</span>
                                  )}
                                </TableCell>

                                <TableCell className="text-center">
                                  {getStatusBadge(appointment)}
                                </TableCell>

                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setIsDetailDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentHistory;