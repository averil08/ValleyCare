import React, { useState, useContext } from 'react';
import { doctors } from './doctorData';
import Sidebar from "@/components/Sidebar";
import { Calendar, Clock, Phone, User, Activity, Stethoscope, CheckCircle, XCircle, MessageSquare, Filter, Eye, AlertCircle, Bell } from 'lucide-react';
//automatic added dialog in components/ui (run npx shadcn@latest add dialog to install + make dialog.jsx)
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
//automatic added textarea in components/ui (run npx shadcn@latest add textarea to install + make textarea.jsx)
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { PatientContext } from "./PatientContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

//THIS IS THE PATIENT PROFILE IN CLINIC UI
const Appointment = () => {
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { patients, acceptAppointment, rejectAppointment, unreadSecretaryNotificationsCount, markSecretaryNotificationsAsRead } = useContext(PatientContext);

  // Helper to get label for date filter
  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'monday': return 'Monday';
      case 'tuesday': return 'Tuesday';
      case 'wednesday': return 'Wednesday';
      case 'thursday': return 'Thursday';
      case 'friday': return 'Friday';
      case 'saturday': return 'Saturday';
      case 'thisWeek': return 'This Week';
      case 'custom': return 'Custom Range';
      case 'all': return 'All Dates';
      default: return dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1);
    }
  };

  // Helper to check if date is within range
  const isWithinDateRange = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();

    if (dateFilter === 'all') return true;

    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }

    if (dateFilter === 'thisWeek') {
      // Start of week = Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // End of week = Saturday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return date >= startOfWeek && date <= endOfWeek;
    }

    // Handle Day of Week filters (monday, tuesday, etc.)
    const daysMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };

    if (daysMap.hasOwnProperty(dateFilter)) {
      const targetDayIndex = daysMap[dateFilter];
      const currentDayIndex = now.getDay();

      // Calculate difference to get the date for the target day of THIS week
      const diff = targetDayIndex - currentDayIndex;
      const targetDateStart = new Date(now);
      targetDateStart.setDate(now.getDate() + diff);
      targetDateStart.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      return date >= targetDateStart && date <= targetDateEnd;
    }

    return true;
  };

  // NEW: Get user role and doctor ID
  const userRole = localStorage.getItem('userRole');
  const storedDoctorId = localStorage.getItem('selectedDoctorId');
  const isDoctor = userRole === 'doctor';

  // NEW: Find current doctor for name matching fallback
  const currentDoctor = isDoctor && storedDoctorId ? doctors.find(d => d.id === Number(storedDoctorId)) : null;

  // Filter appointments (patients with type "Appointment")
  const allAppointments = (patients || [])
    .filter(p => {
      if (p.type !== "Appointment" || p.status === "done") return false;
      if (!isDoctor) return true;

      const myId = Number(storedDoctorId);
      const myName = currentDoctor?.name?.toLowerCase().trim();
      const patientAssignedName = p.assignedDoctor?.name?.toLowerCase().trim();

      // Match by ID or by trimmed name
      return p.assignedDoctor?.id === myId || (patientAssignedName && patientAssignedName === myName);
    });

  // Get filtered appointments based on criteria
  const getFilteredAppointments = () => {
    let filtered = allAppointments.filter(a => {
      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
      return isWithinDateRange(dateToCheck);
    });

    switch (activeFilter) {
      case 'pending':
        return filtered
          .filter(a => !a.appointmentStatus || a.appointmentStatus === 'pending')
          .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      case 'accepted':
        return filtered
          .filter(a => a.appointmentStatus === 'accepted')
          .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      case 'rejected':
        return filtered
          .filter(a => a.appointmentStatus === 'rejected')
          .sort((a, b) => new Date(b.rejectedAt || b.registeredAt) - new Date(a.rejectedAt || a.registeredAt));

      case 'cancelled':
        return filtered
          .filter(a => a.appointmentStatus === 'cancelled')
          .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      case 'all':
      default:
        return filtered
          .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    }
  };

  const filteredAppointments = getFilteredAppointments();

  // Service labels mapping
  const serviceLabels = {
    // General
    pedia: "Pediatric Consultation",
    adult: "Adult Consultation",
    senior: "Senior Consultation (60+)",
    preventive: "Preventive/Annual Physical Exam",
    "follow-up": "Follow-up Consultation",

    // Hematology
    cbc: "CBC (Complete Blood Count)",
    platelet: "Platelet Count",
    esr: "ESR (Inflammation Check)",
    abo: "Blood Type Test: ABO/Rh Typing",

    // Immunology & Serology
    hbsag: "HBsAg (Hepatitis B Screening)",
    vdrl: "VDRL/RPR (Syphilis Screening)",
    antiHCV: "Anti-HCV (Hepatitis C Screening)",
    hpylori: "H.PYLORI (H. pylori Stomach Bacteria Test)",
    dengueIg: "Dengue IgG+IgM (Dengue Fever Screening: Past/Current)",
    dengueNs1: "Dengue NS1 (Early Dengue Fever Test)",
    dengueDuo: "Dengue Duo: NS1, IgG+IgM (Complete Dengue Test)",
    typhidot: "Typhidot (Typhoid Fever Test)",

    // Clinical Chemistry
    fbs: "FBS (Fasting Blood Sugar)",
    rbs: "RBS (Random Blood Sugar)",
    lipid: "Lipid Profile (Cholesterol and Fats Check)",
    totalCh: "Total Cholesterol",
    triglycerides: "Triglycerides (Blood Fats)",
    hdl: "HDL (Good Cholesterol)",
    ldl: "LDL (Bad Cholesterol)",
    alt: "ALT/SGPT (Liver Function Test)",
    ast: "AST/SGOT (Liver Function Test)",
    uric: "Uric Acid",
    creatinine: "Creatinine (Kidney Function Test)",
    bun: "Bun (Kidney Function Test)",
    hba1c: "HBA1C (Long-Term Blood Sugar)",
    albumin: "Albumin (Protein in blood)",
    magnesium: "Magnesium",
    totalProtein: "Total Protein (present in blood)",
    alp: "ALP (Bone and Liver Enzyme)",
    phosphorus: "Phosphorus",
    sodium: "Sodium",
    potassium: "Potassium",
    ionizedCal: "Ionized Calcium (Free Calcium Level)",
    totalCal: "Total Calcium",
    chloride: "Chloride",

    // Microscopy
    urinalysis: "Urinalysis",
    fecalysis: "Fecalysis (Stool Test)",
    pregnancyT: "Pregnancy Test",
    fecal: "Fecal Occult Blood (Hidden Blood in Stool)",
    semen: "Semen Analysis",

    // Surgery
    "general surgery": "General Surgery Consultation",
    ent: "ENT (Ear, Nose, Throat) Consultation",
    orthopedic: "Orthopedic Surgery Consultation",

    // Others
    tsh: "TSH (Thyroid Stimulating Hormone)",
    ft3: "FT3 (Free T3 Thyroid Hormone)",
    "75g": "75 Grams OGTT (Diabetes Glucose Challenge Test)",
    t4: "T4 (T4 Thyroid Hormone)",
    t3: "T3 (T3 Thyroid Hormone)",
    psa: "PSA (Prostate Health Screening)",
    totalBilirubin: "Total/ Direct Bilirubin (Jaundice Check)"
  };

  const getServiceLabel = (serviceId) => serviceLabels[serviceId] || serviceId;

  const handleAccept = (appointment) => {
    acceptAppointment(appointment.id);
  };

  //replaced the direct reject handler
  const handleRejectClick = (appointment) => {
    setRejectionDialog({
      open: true,
      appointment: appointment,
      reason: ""
    });
  };

  //added rejection dialogue state to manage modal
  const [rejectionDialog, setRejectionDialog] = useState({
    open: false,
    appointment: null,
    reason: ""
  });

  //Added the confirmation handler that saves the reason"
  const handleRejectConfirm = () => {
    if (!rejectionDialog.reason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    rejectAppointment(rejectionDialog.appointment.id, rejectionDialog.reason);
    setRejectionDialog({ open: false, appointment: null, reason: "" });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateShort = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsDialogOpen(true);
  };

  // Render appointment card for mobile
  const renderAppointmentCard = (appointment) => (
    <Card key={appointment.id} className="mb-4">
      <CardContent className="p-4">
        {/* Header with Queue Number and Status */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="font-mono">
            #{String(appointment.queueNo).padStart(3, '0')}
          </Badge>
          {appointment.appointmentStatus === 'accepted' ? (
            <Badge className="bg-green-600">Accepted</Badge>
          ) : appointment.appointmentStatus === 'rejected' ? (
            <Badge variant="destructive" className="bg-red-600 text-white">
              Not Accepted
            </Badge>
          ) : appointment.appointmentStatus === 'cancelled' ? (
            <Badge variant="outline" className="border-gray-400 text-gray-500">
              Cancelled
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Pending
            </Badge>
          )}
        </div>

        {/* Patient Name */}
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900 text-lg">{appointment.name}</span>
          <span className="text-gray-500 text-sm">• {appointment.age} yrs</span>
        </div>

        {/* Appointment Time */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">
            {formatDateShort(appointment.appointmentDateTime || appointment.appointment_datetime)}
          </span>
        </div>

        {/* Doctor or Services */}
        {appointment.assignedDoctor ? (
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700 font-medium text-sm">
              {appointment.assignedDoctor.name}
            </span>
          </div>
        ) : (
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
        )}

        {/* Symptoms */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1.5">Symptoms:</p>
          <div className="flex flex-wrap gap-1.5">
            {appointment.symptoms && appointment.symptoms.length > 0 ? (
              <>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => handleViewDetails(appointment)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>

          {(!appointment.appointmentStatus || appointment.appointmentStatus === 'pending') && !isDoctor && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAccept(appointment)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => handleRejectClick(appointment)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render appointment table for desktop
  const renderAppointmentTable = (appointments) => (
    <>
      {/* Mobile Card View - Show on small to medium screens */}
      <div className="block lg:hidden">
        {appointments.map((appointment) => renderAppointmentCard(appointment))}
      </div>

      {/* Desktop Table View - Improved Responsiveness for Large Screens */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700 w-20">Queue</TableHead>
              <TableHead className="font-semibold text-gray-700">Patient</TableHead>
              <TableHead className="font-semibold text-gray-700 hidden xl:table-cell w-16 text-center">Age</TableHead>
              <TableHead className="font-semibold text-gray-700">Schedule</TableHead>
              <TableHead className="font-semibold text-gray-700">Doctor/Service</TableHead>
              <TableHead className="font-semibold text-gray-700 hidden 2xl:table-cell">Symptoms</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-28">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow
                key={appointment.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell className="py-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{String(appointment.queueNo).padStart(3, '0')}
                  </Badge>
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 leading-tight truncate max-w-[120px] xl:max-w-none">
                      {appointment.name}
                    </span>
                    <span className="text-[11px] text-gray-500 xl:hidden">
                      {appointment.age} yrs
                    </span>
                  </div>
                </TableCell>

                <TableCell className="hidden xl:table-cell text-center py-3">
                  <span className="text-gray-700">{appointment.age}</span>
                </TableCell>

                <TableCell className="py-3">
                  <span className="text-gray-700 text-xs xl:text-sm">
                    {formatDateShort(appointment.appointmentDateTime || appointment.appointment_datetime)}
                  </span>
                </TableCell>

                <TableCell className="py-3">
                  {appointment.assignedDoctor ? (
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span className="text-purple-700 font-medium text-xs xl:text-sm truncate max-w-[100px] xl:max-w-none">
                        {appointment.assignedDoctor.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {appointment.services && appointment.services.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200">
                          {getServiceLabel(appointment.services[0])}
                          {appointment.services.length > 1 && ` +${appointment.services.length - 1}`}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </div>
                  )}
                </TableCell>

                <TableCell className="hidden 2xl:table-cell py-3">
                  <div className="flex flex-wrap gap-1">
                    {appointment.symptoms && appointment.symptoms.length > 0 ? (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                        {appointment.symptoms[0]}
                        {appointment.symptoms.length > 1 && ` +${appointment.symptoms.length - 1}`}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center py-3">
                  {appointment.appointmentStatus === 'accepted' ? (
                    <Badge className="bg-green-600 text-[10px] xl:text-xs">Accepted</Badge>
                  ) : appointment.appointmentStatus === 'rejected' ? (
                    <Badge variant="destructive" className="bg-red-600 text-white text-[10px] xl:text-xs">
                      Not Accepted
                    </Badge>
                  ) : appointment.appointmentStatus === 'cancelled' ? (
                    <Badge variant="outline" className="border-gray-400 text-gray-500 text-[10px] xl:text-xs">
                      Cancelled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] xl:text-xs">
                      Pending
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleViewDetails(appointment)}
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>

                    {(!appointment.appointmentStatus || appointment.appointmentStatus === 'pending') && !isDoctor && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAccept(appointment)}
                          title="Accept"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectClick(appointment)}
                          title="Decline"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar nav={nav} handleNav={handleNav} />

      {/* MAIN CONTENT */}
      <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300 w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm pt-12 lg:pt-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-xl max-sm:text-base font-bold text-gray-900">Appointment Management</h1>
                  <p className="text-sm text-gray-600">Review and manage patient appointments</p>
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) {
                      markSecretaryNotificationsAsRead();
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all duration-200 focus:outline-none relative group"
                  title="Cancellations"
                >
                  <Bell className={`w-6 h-6 ${unreadSecretaryNotificationsCount > 0 ? 'animate-swing' : ''}`} />
                  {unreadSecretaryNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                      {unreadSecretaryNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-green-600" />
                        Patient Cancellations
                      </h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {(patients || [])
                        .filter(p => p.type === "Appointment" && p.status === "cancelled" && p.appointmentStatus === "cancelled")
                        .sort((a, b) => new Date(b.queueExitTime || b.registeredAt) - new Date(a.queueExitTime || a.registeredAt))
                        .length > 0 ? (
                        (patients || [])
                          .filter(p => p.type === "Appointment" && p.status === "cancelled" && p.appointmentStatus === "cancelled")
                          .sort((a, b) => new Date(b.queueExitTime || b.registeredAt) - new Date(a.queueExitTime || a.registeredAt))
                          .map((notif) => (
                            <div
                              key={notif.id}
                              className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-default"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {notif.name}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Cancelled their appointment for {formatDateTime(notif.appointmentDateTime || notif.appointment_datetime)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                      {new Date(notif.queueExitTime || notif.registeredAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">No new cancellations</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Date Filter & Status Filter Controls */}
          <div className="mb-6 space-y-4">
            {/* Date Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 relative">
                {/* Date Filter Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    className="min-w-[140px] justify-between"
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                  >
                    {getDateFilterLabel()}
                    <span className="ml-2">▼</span>
                  </Button>

                  {showDateDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'thisWeek', 'custom', 'all'].map((filter) => (
                        <button
                          key={filter}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateFilter === filter ? 'text-green-600 font-medium bg-green-50' : 'text-gray-700'}`}
                          onClick={() => {
                            setDateFilter(filter);
                            setShowDateDropdown(false);
                          }}
                        >
                          {filter === 'monday' && 'Monday'}
                          {filter === 'tuesday' && 'Tuesday'}
                          {filter === 'wednesday' && 'Wednesday'}
                          {filter === 'thursday' && 'Thursday'}
                          {filter === 'friday' && 'Friday'}
                          {filter === 'saturday' && 'Saturday'}
                          {filter === 'thisWeek' && 'This Week'}
                          {filter === 'custom' && 'Custom Range'}
                          {filter === 'all' && 'All Dates'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Date Inputs */}
                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setActiveFilter('all')}
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  className={activeFilter === 'all'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'hover:bg-gray-100'
                  }
                >
                  All
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {allAppointments.filter(a => {
                      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                      return isWithinDateRange(dateToCheck);
                    }).length}
                  </Badge>
                </Button>

                <Button
                  onClick={() => setActiveFilter('pending')}
                  variant={activeFilter === 'pending' ? 'default' : 'outline'}
                  className={activeFilter === 'pending'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'hover:bg-gray-100'
                  }
                >
                  Pending Approval
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {/* Note: This count logic needs to be aware of date filtering if we want it to be accurate to the current view, 
                         or separate if we want it to show global pending. 
                         Let's keep it simple for now and show count based on *filtered* list if user clicks it,
                         but usually these badges show total potential matches. 
                         For now, let's just use the length of what *would* be shown if clicked, roughly. 
                         Actually, let's just count from the filtered list for simplicity in this specific block context or 
                         re-calculate. The original code calculated from 'allAppointments'. 
                         Let's try to preserve the original behavior of showing TOTAL counts for that status, 
                         ignoring date filter for the badge itself? Or respecting it?
                         
                         User asked for "appointments of today". 
                         If I say "Pending (5)", does that mean 5 pending today or 5 total?
                         Usually filters are composable. "Today" + "Pending".
                         So the badge should probably reflect the "Today" count.
                     */}
                    {allAppointments.filter(a => {
                      const matchesStatus = !a.appointmentStatus || a.appointmentStatus === 'pending';
                      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                      // To be helpful, let's make the badge count respect the current Date Filter
                      return matchesStatus && isWithinDateRange(dateToCheck);
                    }).length}
                  </Badge>
                </Button>

                <Button
                  onClick={() => setActiveFilter('accepted')}
                  variant={activeFilter === 'accepted' ? 'default' : 'outline'}
                  className={activeFilter === 'accepted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'hover:bg-gray-100'
                  }
                >
                  Accepted
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {allAppointments.filter(a => {
                      const matchesStatus = a.appointmentStatus === 'accepted';
                      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                      return matchesStatus && isWithinDateRange(dateToCheck);
                    }).length}
                  </Badge>
                </Button>

                <Button
                  onClick={() => setActiveFilter('rejected')}
                  variant={activeFilter === 'rejected' ? 'default' : 'outline'}
                  className={activeFilter === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'hover:bg-gray-100'
                  }
                >
                  Not Accepted
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {allAppointments.filter(a => {
                      const matchesStatus = a.appointmentStatus === 'rejected';
                      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                      return matchesStatus && isWithinDateRange(dateToCheck);
                    }).length}
                  </Badge>
                </Button>

                <Button
                  onClick={() => setActiveFilter('cancelled')}
                  variant={activeFilter === 'cancelled' ? 'default' : 'outline'}
                  className={activeFilter === 'cancelled'
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'hover:bg-gray-100'
                  }
                >
                  Cancelled
                  <Badge variant="secondary" className="ml-2 bg-white text-gray-700">
                    {allAppointments.filter(a => {
                      const matchesStatus = a.appointmentStatus === 'cancelled';
                      const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                      return matchesStatus && isWithinDateRange(dateToCheck);
                    }).length}
                  </Badge>
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {allAppointments.filter(a => isWithinDateRange(a.appointmentDateTime || a.appointment_datetime)).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Accepted</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {allAppointments.filter(a => {
                    const matchesStatus = a.appointmentStatus === 'accepted';
                    const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                    return matchesStatus && isWithinDateRange(dateToCheck);
                  }).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">
                  {allAppointments.filter(a => {
                    const matchesStatus = !a.appointmentStatus || a.appointmentStatus === 'pending';
                    const dateToCheck = a.appointmentDateTime || a.appointment_datetime;
                    return matchesStatus && isWithinDateRange(dateToCheck);
                  }).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  {activeFilter === 'all' && 'No appointments scheduled'}
                  {activeFilter === 'pending' && 'No pending appointments'}
                  {activeFilter === 'accepted' && 'No accepted appointments'}
                  {activeFilter === 'rejected' && 'No rejected appointments'}
                  {activeFilter === 'cancelled' && 'No cancelled appointments'}
                  {activeFilter === 'upcoming' && 'No upcoming appointments'}
                </p>
              </CardContent>
            </Card>
          ) : activeFilter === 'upcoming' && groupedUpcoming ? (
            // Grouped view for upcoming appointments
            <div className="space-y-6">
              {groupedUpcoming.today.length > 0 && (
                <Card>
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      Today ({groupedUpcoming.today.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {renderAppointmentTable(groupedUpcoming.today)}
                  </CardContent>
                </Card>
              )}

              {groupedUpcoming.tomorrow.length > 0 && (
                <Card>
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Tomorrow ({groupedUpcoming.tomorrow.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {renderAppointmentTable(groupedUpcoming.tomorrow)}
                  </CardContent>
                </Card>
              )}

              {groupedUpcoming.thisWeek.length > 0 && (
                <Card>
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      This Week ({groupedUpcoming.thisWeek.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {renderAppointmentTable(groupedUpcoming.thisWeek)}
                  </CardContent>
                </Card>
              )}

              {groupedUpcoming.later.length > 0 && (
                <Card>
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      Later ({groupedUpcoming.later.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {renderAppointmentTable(groupedUpcoming.later)}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Regular table view for other filters
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeFilter === 'all' && 'All Appointments'}
                  {activeFilter === 'pending' && 'Pending Appointments'}
                  {activeFilter === 'accepted' && 'Accepted Appointments'}
                  {activeFilter === 'rejected' && 'Not Accepted Appointments'}
                  {activeFilter === 'cancelled' && 'Cancelled Appointments'}
                </CardTitle>
                <CardDescription>
                  {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {renderAppointmentTable(filteredAppointments)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="w-6 h-6 text-green-600" />
              Appointment Details
            </DialogTitle>
            <DialogDescription>
              Queue #{String(selectedAppointment?.queueNo).padStart(3, '0')} • {selectedAppointment?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 mt-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {selectedAppointment.appointmentStatus === 'accepted' ? (
                  <Badge className="bg-green-600">Accepted</Badge>
                ) : selectedAppointment.appointmentStatus === 'rejected' ? (
                  <Badge variant="destructive" className="bg-red-600 text-white">Not Accepted</Badge>
                ) : selectedAppointment.appointmentStatus === 'cancelled' ? (
                  <Badge variant="outline" className="border-gray-400 text-gray-500">Cancelled</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>
                )}
              </div>

              {/* Patient Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Appointment Time</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatDateTime(selectedAppointment.appointmentDateTime || selectedAppointment.appointment_datetime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Age</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.age} years old</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.phoneNum || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Queue Number</p>
                    <p className="font-semibold text-gray-900">#{String(selectedAppointment.queueNo).padStart(3, '0')}</p>
                  </div>
                </div>
              </div>

              {/* Symptoms */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Symptoms</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAppointment.symptoms && selectedAppointment.symptoms.length > 0 ? (
                    selectedAppointment.symptoms.map((symptom, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-white text-blue-700 border-blue-200">
                        {symptom}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">None reported</span>
                  )}
                </div>
              </div>

              {/* Doctor or Services */}
              {selectedAppointment.assignedDoctor ? (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-900">Requested Doctor</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-900">{selectedAppointment.assignedDoctor.name}</p>
                    {selectedAppointment.assignedDoctor.specialization && (
                      <p className="text-sm text-purple-700">{selectedAppointment.assignedDoctor.specialization}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">Requested Services</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAppointment.services && selectedAppointment.services.length > 0 ? (
                      selectedAppointment.services.map((serviceId, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-white text-green-700 border-green-200">
                          {getServiceLabel(serviceId)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">None selected</span>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedAppointment.appointmentStatus === 'rejected' && selectedAppointment.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900 mb-1">Reason for Appointment Refusal</p>
                      <p className="text-sm text-red-800">{selectedAppointment.rejectionReason}</p>
                      {selectedAppointment.rejectedAt && (
                        <p className="text-xs text-red-600 mt-1">
                          Not Accepted on {formatDateTime(selectedAppointment.rejectedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {(!selectedAppointment.appointmentStatus || selectedAppointment.appointmentStatus === 'pending') && !isDoctor && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleAccept(selectedAppointment);
                      setIsDetailsDialogOpen(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Appointment
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      handleRejectClick(selectedAppointment);
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Appointment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => setRejectionDialog({ ...rejectionDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Decline Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for not accepting {rejectionDialog.appointment?.name}'s appointment.
              This will be shared with the patient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for Appointment Refusal *
              </label>
              <Textarea
                placeholder="e.g., No available time slots, Requires specialist referral, etc."
                value={rejectionDialog.reason}
                onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {rejectionDialog.reason.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectionDialog({ open: false, appointment: null, reason: "" })}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectionDialog.reason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Send Notice to Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointment;