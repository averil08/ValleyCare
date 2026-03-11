import React, { useState, useContext, useMemo } from 'react';
import { PatientContext } from "./PatientContext";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Search, User, Calendar, Phone, Stethoscope, FileText, Clock, ChevronRight, ArrowLeft, Edit2, Save, X, AlertCircle, Activity, ChevronDown, ChevronUp, History, Eye, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

//THIS IS THE LISTS OF PATIENTS WHO VISITED THE CLINIC 
const PatientProfile = () => {
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);

  const { patients } = useContext(PatientContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [diagnoses, setDiagnoses] = useState({});
  const [editingVisit, setEditingVisit] = useState(null);
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [isVisitHistoryExpanded, setIsVisitHistoryExpanded] = useState(false);
  const [isPastVisitsModalOpen, setIsPastVisitsModalOpen] = useState(false);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // ✨ NEW: State for visit details modal
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);

  // ✨ NEW: State for visit history filter
  const [visitStatusFilter, setVisitStatusFilter] = useState('all');

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

  // Normalize name for exact matching (case-insensitive, trim whitespace)
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim();
  };

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
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return date >= startOfWeek && date <= endOfWeek;
    }

    const daysMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };

    if (daysMap.hasOwnProperty(dateFilter)) {
      const targetDayIndex = daysMap[dateFilter];
      const currentDayIndex = now.getDay();
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

  const getVisitStatusCategory = (appointment) => {
    if (!appointment) return 'unknown';
    if (appointment.type === 'Appointment') {
      if (appointment.appointmentStatus === 'pending') {
        return 'pending';
      } else if (appointment.appointmentStatus === 'rejected') {
        return 'not-approved';
      } else if (appointment.appointmentStatus === 'accepted') {
        if (appointment.status === 'done' || appointment.status === 'completed') {
          return 'completed';
        } else if (appointment.status === 'in progress') {
          return 'in-progress';
        } else if (appointment.status === 'cancelled') {
          return 'cancelled';
        } else if (appointment.status === 'waiting' || appointment.status === 'pending') {
          return 'waiting';
        } else {
          // Both 'waiting' and default accepted
          const apptDate = appointment.appointmentDateTime ? new Date(new Date(appointment.appointmentDateTime).setHours(0, 0, 0, 0)) : null;
          const today = new Date(new Date().setHours(0, 0, 0, 0));
          if (apptDate && apptDate > today) return 'upcoming';
          return 'accepted';
        }
      }
    }

    // Walk-in status (or any other type like 'Walk-in')
    const status = appointment.status ? appointment.status.toLowerCase() : 'waiting';
    if (status === 'done' || status === 'completed') {
      return 'completed';
    } else if (status === 'in progress') {
      return 'in-progress';
    } else if (status === 'cancelled') {
      return 'cancelled';
    } else if (status === 'waiting' || status === 'pending') {
      return 'waiting';
    } else {
      return 'waiting';
    }
  };

  const getStatusBadge = (visit) => {
    const category = typeof visit === 'string' ? visit : getVisitStatusCategory(visit);

    const styles = {
      'waiting': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-300',
      'completed': 'bg-emerald-100 text-emerald-700 border-emerald-300',
      'cancelled': 'bg-red-100 text-red-700 border-red-300',
      'pending': 'bg-amber-100 text-amber-700 border-amber-300',
      'not-approved': 'bg-red-600 text-white border-none',
      'upcoming': 'bg-blue-600 text-white border-none',
      'accepted': 'bg-green-600 text-white border-none'
    };
    return styles[category] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusLabel = (visit) => {
    const category = typeof visit === 'string' ? visit : getVisitStatusCategory(visit);
    const labels = {
      'waiting': 'Waiting',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'pending': 'Pending',
      'not-approved': 'Not Accepted',
      'upcoming': 'Upcoming',
      'accepted': 'Accepted'
    };
    return labels[category] || category;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  // Group patients by unique patient with SIMPLIFIED matching logic
  const uniquePatients = useMemo(() => {
    if (!patients || !Array.isArray(patients)) return [];
    const patientMap = new Map();

    patients.forEach(visit => {
      // Skip inactive patients
      if (visit.isInactive) return;

      // Filter: only valid statuses for patient history
      const category = getVisitStatusCategory(visit);
      if (category === 'unknown') return;

      // EXCLUDE: Pending appointment requests from patient history
      if (visit.type === 'Appointment' && visit.appointmentStatus === 'pending') return;

      // Primary identification: Use email if available to group all records from the same account.
      // Fall back to normalized name for walk-ins or records without email.
      const normalizedName = normalizeName(visit.name);
      const email = visit.patientEmail ? visit.patientEmail.toLowerCase().trim() : '';
      const key = email || normalizedName;

      // Skip records that have neither name nor email
      if (!key) return;

      if (!patientMap.has(key)) {
        // Create new patient profile
        patientMap.set(key, {
          name: visit.name, // Use the actual name with proper casing from first visit
          phoneNum: visit.phoneNum,
          age: visit.age,
          visits: []
        });
      } else {
        // Update patient info with most recent data
        const existing = patientMap.get(key);

        // Always update to the latest phone number if provided
        if (visit.phoneNum) {
          existing.phoneNum = visit.phoneNum;
        }

        // Always update to the latest age
        if (visit.age) {
          existing.age = visit.age;
        }

        // Update name to the most complete version (prefer proper casing)
        const hasMoreCapitals = (visit.name.match(/[A-Z]/g) || []).length >
          (existing.name.match(/[A-Z]/g) || []).length;

        if (hasMoreCapitals || visit.name.length > existing.name.length) {
          existing.name = visit.name;
        }
      }

      // Add visit to patient's history
      patientMap.get(key).visits.push(visit);
    });

    // Convert to array and sort visits by date
    return Array.from(patientMap.values()).map(patient => {
      // Sort visits by date descending (most recent first)
      const sortedVisits = patient.visits.sort((a, b) => {
        const dateA = new Date(a.appointmentDateTime || a.registeredAt);
        const dateB = new Date(b.appointmentDateTime || b.registeredAt);
        return dateB - dateA;
      });

      // Find the most recent completed visit
      const mostRecentDone = sortedVisits.find(v => v.status === 'done');

      // Find the soonest upcoming (future, accepted) appointment
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      const upcomingAppointment = sortedVisits
        .filter(v => {
          if (v.type !== 'Appointment' || v.appointmentStatus !== 'accepted') return false;
          const apptDate = v.appointmentDateTime ? new Date(new Date(v.appointmentDateTime).setHours(0, 0, 0, 0)) : null;
          return apptDate && apptDate > today;
        })
        .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime))[0] || null;

      // Find the most recent visit that is either actve or done
      const mostRecentActiveVisit = sortedVisits.find(v => ['upcoming', 'accepted', 'waiting', 'in-progress', 'completed'].includes(getVisitStatusCategory(v)));

      // Definitions for display purposes:
      // If there's a future upcoming appointment, show it (takes priority so "Upcoming" badge appears in the patient list).
      // Otherwise, fall back to the most recent completed visit, then the most recent visit overall.
      const lastVisit = upcomingAppointment || mostRecentDone || sortedVisits[0];

      // Find the first (oldest) completed or cancelled visit
      const completedOrCancelledVisits = sortedVisits.filter(v => getVisitStatusCategory(v) === 'completed' || getVisitStatusCategory(v) === 'cancelled');
      const firstVisit = completedOrCancelledVisits.length > 0 ? completedOrCancelledVisits[completedOrCancelledVisits.length - 1] : null;

      // Group active visits for the "Most Recent Visit Summary" card
      const validSummaryVisits = sortedVisits.filter(v => ['upcoming', 'accepted', 'waiting', 'in-progress', 'completed'].includes(getVisitStatusCategory(v)));

      return {
        ...patient,
        visits: sortedVisits,
        validSummaryVisits: validSummaryVisits,
        totalVisits: patient.visits.length,
        lastVisit: lastVisit,
        mostRecentActiveVisit: mostRecentActiveVisit,
        firstVisit: firstVisit,
        // True only when a genuine future accepted appointment was found
        isUpcoming: upcomingAppointment !== null
      };
    }).sort((a, b) => {
      // Sort patients by their representative visit date (prioritizing done visits as defined above)
      const dateA = new Date(a.lastVisit?.appointmentDateTime || a.lastVisit?.registeredAt);
      const dateB = new Date(b.lastVisit?.appointmentDateTime || b.lastVisit?.registeredAt);
      return dateB - dateA;
    });
  }, [patients]);

  // Filter patients based on search and date range
  const filteredPatients = uniquePatients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phoneNum && patient.phoneNum.includes(searchTerm));

    // Check if the patient's representative "Last Visit" (prioritized as per requirements) 
    // falls within the selected date range
    const dateToCheck = patient.lastVisit?.appointmentDateTime || patient.lastVisit?.registeredAt;
    const matchesDate = isWithinDateRange(dateToCheck);

    return matchesSearch && matchesDate;
  });



  const saveDiagnosis = (queueNo, diagnosis) => {
    setDiagnoses(prev => ({
      ...prev,
      [queueNo]: diagnosis
    }));
  };

  const handleSaveDiagnosis = () => {
    if (!editingVisit || !diagnosisInput.trim()) return;

    saveDiagnosis(editingVisit, diagnosisInput.trim());
    setEditingVisit(null);
    setDiagnosisInput("");
  };

  const handleEditDiagnosis = (queueNo) => {
    setEditingVisit(queueNo);
    setDiagnosisInput(diagnoses[queueNo] || "");
  };

  const handleCancelEdit = () => {
    setEditingVisit(null);
    setDiagnosisInput("");
  };

  // ✨ NEW: Handle view visit details
  const handleViewVisitDetails = (visit, visitNumber) => {
    setSelectedVisit({ ...visit, visitNumber });
    setIsVisitDetailModalOpen(true);
  };

  // ✨ NEW: Filter visits based on status
  const filteredVisits = useMemo(() => {
    if (!selectedPatient) return [];
    if (visitStatusFilter === 'all') return selectedPatient.visits;

    return selectedPatient.visits.filter(visit => getVisitStatusCategory(visit) === visitStatusFilter);
  }, [selectedPatient, visitStatusFilter]);

  // ✨ NEW: Calculate visit status counts
  const visitStatusCounts = useMemo(() => {
    if (!selectedPatient) return {};

    return {
      all: selectedPatient.visits.length,
      'in-progress': selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'in-progress').length,
      completed: selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'completed').length,
      cancelled: selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'cancelled').length,
      upcoming: selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'upcoming').length,
      accepted: selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'accepted').length,
      'not-approved': selectedPatient.visits.filter(v => getVisitStatusCategory(v) === 'not-approved').length,
    };
  }, [selectedPatient]);

  // Render patient card for mobile
  const renderPatientCard = (patient, idx) => (
    <Card
      key={idx}
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedPatient(patient)}
    >
      <CardContent className="p-4">
        {/* Header with Name and Visit Count Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{patient.name}</h3>
            {patient.totalVisits > 1 && (
              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 mt-1">
                Returning Patient
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="font-semibold ml-2">
            {patient.totalVisits} visit{patient.totalVisits !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Age and Contact */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Age</p>
            <p className="font-semibold text-gray-900">{patient.age} yrs</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Contact</p>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-gray-400" />
              <p className="font-semibold text-gray-900 text-sm truncate">
                {patient.phoneNum || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Last Visit / Upcoming Appointment */}
        <div className="mb-3 pb-3 border-b">
          <p className="text-xs text-gray-500 mb-1">
            {patient.isUpcoming ? 'Upcoming Appointment' : 'Last Visit'}
          </p>
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${patient.isUpcoming ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${patient.isUpcoming ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
              {formatDateShort(patient.lastVisit.appointmentDateTime || patient.lastVisit.registeredAt)}
            </span>
          </div>
        </div>

        {/* Assigned Doctor */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Last Assigned Doctor</p>
          {patient.lastVisit.assignedDoctor ? (
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium text-sm">
                {patient.lastVisit.assignedDoctor.name}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Not assigned</span>
          )}
        </div>

        {/* View Profile Button */}
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPatient(patient);
          }}
        >
          <Eye className="w-4 h-4 mr-1" />
          View Full Profile
        </Button>
      </CardContent>
    </Card>
  );

  // ✨ NEW: Render visit card for mobile in history section
  const renderVisitCardMobile = (visit, idx) => {
    const visitNumber = selectedPatient.visits.length - idx;

    return (
      <Card
        key={visit.queueNo}
        className={`mb-3 border-l-4 ${visit.status === 'done' ? 'border-l-emerald-600' :
          visit.status === 'cancelled' ? 'border-l-red-600' :
            visit.status === 'in progress' ? 'border-l-blue-600' :
              'border-l-yellow-600'
          }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-bold text-gray-900">Visit #{visitNumber}</h4>
                <Badge className={getStatusBadge(visit)}>
                  {getStatusLabel(visit)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Queue #{String(visit.queueNo).padStart(3, '0')}</p>
            </div>
            <Badge variant="outline" className={
              visit.type === 'Walk-in' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'
            }>
              {visit.type}
            </Badge>
          </div>

          {visit.assignedDoctor && (
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium text-sm">
                {visit.assignedDoctor.name}
              </span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => handleViewVisitDetails(visit, visitNumber)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Patient List View
  if (!selectedPatient) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden">
        <Sidebar className='pt-10' nav={nav} handleNav={handleNav} />

        <div className="min-h-screen bg-gray-50 ml-0 md:ml-52 overflow-x-hidden">
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3 mb-4 pt-12 lg:pt-3">
                <User className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Patient Profiles</h1>
                  <p className="text-sm text-gray-600">View patient visit history and information</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or phone number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                {/* Date Filter Controls - Ported from Appointment.jsx */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Last Visit:</span>
                  </div>

                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[140px] justify-between h-10"
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                    >
                      {getDateFilterLabel()}
                      <span className="ml-2 text-[10px]">▼</span>
                    </Button>

                    {showDateDropdown && (
                      <div className="absolute top-full right-0 lg:left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
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

                  {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2 py-1.5 h-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2 py-1.5 h-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>All Patients ({filteredPatients.length})</CardTitle>
                <CardDescription>
                  <span className="hidden sm:inline">Click on a row to view complete patient profile</span>
                  <span className="sm:hidden">Tap to view patient profile</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-12 px-4 text-gray-500">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No patients found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden p-4">
                      {filteredPatients.map((patient, idx) => renderPatientCard(patient, idx))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold text-gray-700">Patient Name</TableHead>
                            <TableHead className="font-semibold text-gray-700">Age</TableHead>
                            <TableHead className="font-semibold text-gray-700">Contact Number</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Visit Count</TableHead>
                            <TableHead className="font-semibold text-gray-700">Last / Upcoming Visit</TableHead>
                            <TableHead className="font-semibold text-gray-700">Assigned Doctor</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPatients.map((patient, idx) => (
                            <TableRow
                              key={idx}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedPatient(patient)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{patient.name}</p>
                                    {patient.totalVisits > 1 && (
                                      <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300 mt-1">
                                        Returning Patient
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-gray-900">{patient.age} yrs</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-900">{patient.phoneNum || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="font-semibold">
                                  {patient.totalVisits}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className={`w-4 h-4 ${patient.isUpcoming ? 'text-blue-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${patient.isUpcoming ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                    {formatDateShort(patient.lastVisit.appointmentDateTime || patient.lastVisit.registeredAt)}
                                    {patient.isUpcoming && (
                                      <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 bg-blue-50 text-blue-600 border-blue-200">
                                        Upcoming
                                      </Badge>
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {patient.lastVisit.assignedDoctor ? (
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700 font-medium text-sm">
                                      {patient.lastVisit.assignedDoctor.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not assigned</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPatient(patient);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Profile
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Patient Detail View
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Sidebar nav={nav} handleNav={handleNav} />

      <div className="min-h-screen bg-gray-50 ml-0 md:ml-52 overflow-x-hidden">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pt-10">
            <Button
              onClick={() => {
                setSelectedPatient(null);
                setIsVisitHistoryExpanded(false);
                setIsPastVisitsModalOpen(false);
                setVisitStatusFilter('all'); // Reset filter
              }}
              variant="outline"
              className="mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patient List
            </Button>

            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-green-600" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedPatient.name}</h1>
                  {selectedPatient.totalVisits > 1 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      Returning Patient
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">Patient Profile & Visit History</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          {/* MOST RECENT VISIT SUMMARY */}
          {selectedPatient.mostRecentActiveVisit && (
            <Card className="border-t-4 border-t-blue-600 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-blue-900">
                      <Activity className="w-6 h-6 flex-shrink-0" />
                      <span className="truncate">Most Recent Visit Summary</span>
                      <Badge className={`ml-0 sm:ml-2 ${getStatusBadge(selectedPatient.mostRecentActiveVisit)}`}>
                        {getStatusLabel(selectedPatient.mostRecentActiveVisit)}
                      </Badge>
                    </CardTitle>
                  </div>
                  {selectedPatient.validSummaryVisits.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPastVisitsModalOpen(true)}
                      className="flex items-center gap-2 bg-white hover:bg-blue-50 w-full sm:w-auto flex-shrink-0"
                    >
                      <History className="w-4 h-4" />
                      <span className="hidden sm:inline">View More Summaries</span>
                      <span className="sm:hidden">More Summaries</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Assigned Doctor */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Assigned Doctor</p>
                      <p className="font-semibold text-gray-900">
                        {selectedPatient.mostRecentActiveVisit.assignedDoctor
                          ? selectedPatient.mostRecentActiveVisit.assignedDoctor.name
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        Symptoms ({selectedPatient.mostRecentActiveVisit.symptoms?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPatient.mostRecentActiveVisit.symptoms && selectedPatient.mostRecentActiveVisit.symptoms.length > 0 ? (
                          selectedPatient.mostRecentActiveVisit.symptoms.slice(0, 2).map((symptom, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-white text-red-700 border-red-200"
                            >
                              {symptom}
                            </Badge>
                          ))
                        ) : (
                          <p className="font-semibold text-gray-900">None</p>
                        )}
                        {selectedPatient.mostRecentActiveVisit.symptoms && selectedPatient.mostRecentActiveVisit.symptoms.length > 2 && (
                          <span className="text-xs text-gray-600">
                            +{selectedPatient.mostRecentActiveVisit.symptoms.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Services Requested */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        Services ({selectedPatient.mostRecentActiveVisit.services?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPatient.mostRecentActiveVisit.services && selectedPatient.mostRecentActiveVisit.services.length > 0 ? (
                          selectedPatient.mostRecentActiveVisit.services.slice(0, 2).map((serviceId, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-white text-purple-700 border-purple-200"
                            >
                              {getServiceLabel(serviceId)}
                            </Badge>
                          ))
                        ) : (
                          <p className="font-semibold text-gray-900">None</p>
                        )}
                        {selectedPatient.mostRecentActiveVisit.services && selectedPatient.mostRecentActiveVisit.services.length > 2 && (
                          <span className="text-xs text-gray-600">
                            +{selectedPatient.mostRecentActiveVisit.services.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scheduled Date & Time */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-purple-500 mb-1 font-semibold">Visit Date & Time</p>
                      <p className="font-bold text-gray-900">
                        {selectedPatient.mostRecentActiveVisit.appointmentDateTime ? formatDate(selectedPatient.mostRecentActiveVisit.appointmentDateTime) : formatDate(selectedPatient.mostRecentActiveVisit.registeredAt)}
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* BASIC INFORMATION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Full Name</p>
                  <p className="font-semibold text-gray-900 text-lg">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Age</p>
                  <p className="font-semibold text-gray-900">{selectedPatient.age} years old</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contact Number</p>
                  <p className="font-semibold text-gray-900">{selectedPatient.phoneNum || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Visits</p>
                  <p className="font-semibold text-gray-900">{selectedPatient.totalVisits}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">First Visit</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPatient.firstVisit ? formatDate(selectedPatient.firstVisit.appointmentDateTime || selectedPatient.firstVisit.registeredAt) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {selectedPatient.isUpcoming ? 'Upcoming Appointment' : 'Last Visit'}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedPatient.lastVisit.appointmentDateTime || selectedPatient.lastVisit.registeredAt)}
                  </p>
                </div>
              </div>

              {selectedPatient.lastVisit.assignedDoctor && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-2">Current/Last Assigned Doctor</p>
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
                    <Stethoscope className="w-6 h-6 text-green-600" />
                    <p className="font-semibold text-green-700 text-lg">
                      {selectedPatient.lastVisit.assignedDoctor.name}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ✨ NEW: VISIT HISTORY DETAILS - TABULAR LAYOUT */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setIsVisitHistoryExpanded(!isVisitHistoryExpanded)}
                className="w-full flex items-center justify-between text-left hover:bg-gray-50 -m-6 p-6 rounded-t-lg transition-colors"
              >
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Visit History Details
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Complete timeline of all patient visits ({selectedPatient.visits.length} total)
                  </CardDescription>
                </div>
                {isVisitHistoryExpanded ? (
                  <ChevronUp className="w-6 h-6 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-600 flex-shrink-0" />
                )}
              </button>
            </CardHeader>

            {isVisitHistoryExpanded && (
              <CardContent className="pt-0">
                {/* ✨ NEW: Filter Buttons */}
                <div className="p-4 border-b bg-gray-50 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-700">Filter by Status:</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('all')}
                      className={visitStatusFilter === 'all' ? 'bg-gray-900 hover:bg-gray-800' : ''}
                    >
                      All ({visitStatusCounts.all})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'in-progress' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('in-progress')}
                      className={visitStatusFilter === 'in-progress' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}
                    >
                      In Progress ({visitStatusCounts['in-progress'] || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'completed' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('completed')}
                      className={visitStatusFilter === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                    >
                      Completed ({visitStatusCounts.completed || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'upcoming' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('upcoming')}
                      className={visitStatusFilter === 'upcoming' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}
                    >
                      Upcoming ({visitStatusCounts.upcoming || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'cancelled' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('cancelled')}
                      className={visitStatusFilter === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'border-red-300 text-red-700 hover:bg-red-50'}
                    >
                      Cancelled ({visitStatusCounts.cancelled || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'accepted' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('accepted')}
                      className={visitStatusFilter === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 text-green-700 hover:bg-green-50'}
                    >
                      Accepted ({visitStatusCounts.accepted || 0})
                    </Button>
                    <Button
                      size="sm"
                      variant={visitStatusFilter === 'not-approved' ? 'default' : 'outline'}
                      onClick={() => setVisitStatusFilter('not-approved')}
                      className={visitStatusFilter === 'not-approved' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    >
                      Not Accepted ({visitStatusCounts['not-approved'] || 0})
                    </Button>
                  </div>
                </div>

                {filteredVisits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No {visitStatusFilter !== 'all' ? visitStatusFilter : ''} visits found</p>
                    <p className="text-sm">
                      {visitStatusFilter !== 'all'
                        ? `No visits with "${visitStatusFilter}" status`
                        : 'No visit history available'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-3 px-4">
                      {filteredVisits.map((visit, idx) => {
                        // Calculate the correct visit number based on the original array
                        const originalIdx = selectedPatient.visits.indexOf(visit);
                        const visitNumber = selectedPatient.visits.length - originalIdx;
                        return renderVisitCardMobile(visit, originalIdx);
                      })}
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
                          {filteredVisits.map((visit, idx) => {
                            const originalIdx = selectedPatient.visits.indexOf(visit);
                            const visitNumber = selectedPatient.visits.length - originalIdx;
                            return (
                              <TableRow
                                key={visit.queueNo}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <TableCell className="font-medium">
                                  <Badge variant="outline" className="font-mono">
                                    #{visitNumber}
                                  </Badge>
                                </TableCell>

                                <TableCell className="font-medium">
                                  <Badge variant="outline" className="font-mono">
                                    #{String(visit.queueNo).padStart(3, '0')}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <Badge variant="outline" className={
                                    visit.type === 'Walk-in' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'
                                  }>
                                    {visit.type}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  {visit.assignedDoctor ? (
                                    <div className="flex items-center gap-2">
                                      <Stethoscope className="w-4 h-4 text-green-600" />
                                      <span className="text-green-700 font-medium text-sm">
                                        {visit.assignedDoctor.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Not assigned</span>
                                  )}
                                </TableCell>

                                <TableCell className="text-center">
                                  <Badge className={getStatusBadge(visit)}>
                                    {getStatusLabel(visit)}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleViewVisitDetails(visit, visitNumber)}
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

          {/* SERVICE HISTORY SUMMARY */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Services Availed Summary
              </CardTitle>
              <CardDescription>All services requested across all visits</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const allServices = selectedPatient.visits
                  .flatMap(visit => visit.services || [])
                  .reduce((acc, service) => {
                    acc[service] = (acc[service] || 0) + 1;
                    return acc;
                  }, {});

                const serviceEntries = Object.entries(allServices).sort((a, b) => b[1] - a[1]);

                if (serviceEntries.length === 0) {
                  return <p className="text-gray-500 text-center py-4">No services recorded</p>;
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    {serviceEntries.map(([serviceId, count]) => (
                      <Badge
                        key={serviceId}
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300 text-sm py-1"
                      >
                        {getServiceLabel(serviceId)} <span className="ml-1 font-bold">×{count}</span>
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✨ NEW: Visit Details Modal */}
      <Dialog open={isVisitDetailModalOpen} onOpenChange={setIsVisitDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-6 h-6 text-green-600" />
              Visit #{selectedVisit?.visitNumber} Details
            </DialogTitle>
            <DialogDescription>
              Queue #{String(selectedVisit?.queueNo).padStart(3, '0')} • {selectedVisit?.type}
            </DialogDescription>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-4 mt-4">
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusBadge(selectedVisit)}>
                  {getStatusLabel(selectedVisit)}
                </Badge>
                <Badge variant="outline" className={
                  selectedVisit.type === 'Walk-in' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'
                }>
                  {selectedVisit.type}
                </Badge>
                {selectedVisit.requeued && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                    Requeued
                  </Badge>
                )}
              </div>

              {/* Appointment Time */}
              {selectedVisit.type === 'Appointment' && selectedVisit.appointmentDateTime && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-900">Scheduled Appointment Time</p>
                  </div>
                  <p className="text-sm font-medium text-purple-700">{formatDate(selectedVisit.appointmentDateTime)}</p>
                </div>
              )}

              {/* Registration & Doctor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Registered</p>
                    <p className="font-semibold text-gray-900 text-sm">{formatDate(selectedVisit.registeredAt)}</p>
                  </div>
                </div>

                {selectedVisit.assignedDoctor && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Doctor</p>
                      <p className="font-semibold text-green-700 text-sm">{selectedVisit.assignedDoctor.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Symptoms */}
              {selectedVisit.symptoms && selectedVisit.symptoms.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">Symptoms</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVisit.symptoms.map((symptom, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-white text-red-700 border-red-200">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedVisit.services && selectedVisit.services.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">Services Requested</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVisit.services.map((serviceId, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-white text-green-700 border-green-200">
                        {getServiceLabel(serviceId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason - For Appointments */}
              {selectedVisit.type === 'Appointment' && selectedVisit.appointmentStatus === 'rejected' && selectedVisit.rejectionReason && (
                <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                  <p className="text-sm font-semibold text-red-900 mb-1">Reason for Not Accepting</p>
                  <p className="text-sm text-red-800">{selectedVisit.rejectionReason}</p>
                  {selectedVisit.rejectedAt && (
                    <p className="text-xs text-red-600 mt-2">
                      Not approved on {formatDate(selectedVisit.rejectedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Completion/Cancellation */}
              {selectedVisit.status === 'done' || selectedVisit.completedAt ? (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs text-gray-500 mb-1">Completed At</p>
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(selectedVisit.completedAt)}</p>
                </div>
              ) : selectedVisit.status === 'cancelled' || getVisitStatusCategory(selectedVisit) === 'cancelled' ? (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-gray-500 mb-1">Cancelled At</p>
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(selectedVisit.cancelledAt || selectedVisit.queueExitTime || selectedVisit.registeredAt)}</p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Past Visits Modal */}
      <Dialog open={isPastVisitsModalOpen} onOpenChange={setIsPastVisitsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="w-6 h-6 text-blue-600" />
              Past Visit Summaries
            </DialogTitle>
            <DialogDescription>
              Historical visit summaries for {selectedPatient?.name} (Upcoming, In Progress or Completed visits)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedPatient?.validSummaryVisits.slice(1).length > 0 ? (
              selectedPatient.validSummaryVisits.slice(1).map((visit, idx) => (
                <Card key={visit.queueNo} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-5">
                    {/* Visit Header - Scheduled Time */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-100 flex-1">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-500 font-semibold uppercase tracking-wider">Visit Date & Time</p>
                          <p className="text-base font-bold text-purple-900">
                            {visit.appointmentDateTime ? formatDate(visit.appointmentDateTime) : formatDate(visit.registeredAt)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`ml-3 ${getStatusBadge(visit)}`}>
                        {getStatusLabel(visit)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Assigned Doctor */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Stethoscope className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Assigned Doctor</p>
                          <p className="font-semibold text-gray-900">
                            {visit.assignedDoctor ? visit.assignedDoctor.name : 'Not assigned'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-semibold text-red-900">
                          Symptoms ({visit.symptoms?.length || 0})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {visit.symptoms && visit.symptoms.length > 0 ? (
                          visit.symptoms.map((symptom, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-white text-red-700 border-red-200"
                            >
                              {symptom}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No symptoms reported</span>
                        )}
                      </div>
                    </div>

                    {/* Services */}
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-semibold text-green-900">
                          Services ({visit.services?.length || 0})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {visit.services && visit.services.length > 0 ? (
                          visit.services.map((serviceId, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-white text-green-700 border-green-200"
                            >
                              {getServiceLabel(serviceId)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No services requested</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No past visits to display</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientProfile;