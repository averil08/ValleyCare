import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { doctors } from './doctorData';
import {
    Users, Search, Calendar, Clock, User, ChevronRight, ChevronDown,
    MoreHorizontal, History, CheckCircle2, Filter,
    Bell, CalendarDays, Menu, X, Phone, Stethoscope,
    ArrowLeft, DoorOpen, Activity, XCircle, Eye
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { PatientContext } from "./PatientContext";
import { supabase } from "./lib/supabaseClient";
import { useNavigate } from 'react-router-dom';
import logoValley from '@/assets/logo-valley.png';

/* ─── Static Helpers ─── */
function getApptDateFilterLabel(filter) {
    switch (filter) {
        case 'all': return 'All Dates';
        case 'custom': return 'Custom Range';
        case 'thisWeek': return 'This Week';
        default: return filter.charAt(0).toUpperCase() + filter.slice(1);
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

function formatDateShort(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
}

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const storedDoctorId = localStorage.getItem('selectedDoctorId');
    const doctorId = storedDoctorId ? Number(storedDoctorId) : null;
    const currentDoctor = doctors.find(d => d.id === doctorId) || { name: "Dr. Ricardo Jose", id: null };
    const isAppointmentOnlyDoctor = currentDoctor?.schedule === 'By Appointment Only';

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');
    // ── Separate date filter state per tab ───────────────────────────────
    const [apptDateFilter, setApptDateFilter] = useState('all');   // Schedule tab: monday | … | all | custom
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [apptCustomRange, setApptCustomRange] = useState({ start: '', end: '' });
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [queueStatusFilter, setQueueStatusFilter] = useState('active'); // 'active' | 'done' | 'cancelled'
    const [scheduledStatusFilter, setScheduledStatusFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'rejected'
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeclineAllModal, setShowDeclineAllModal] = useState(false);
    const [isDecliningAll, setIsDecliningAll] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showIndividualDeclineModal, setShowIndividualDeclineModal] = useState(false);

    const { patients, lastDoctorNotificationCheck, markDoctorNotificationsAsRead, rejectAppointment, acceptAppointment } = useContext(PatientContext);
    const dropdownRef = useRef(null);
    const desktopDropdownRef = useRef(null);
    const workspaceRef = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Option lists
    const apptDateFilters = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'thisWeek', 'custom', 'all'];


    useEffect(() => {
        const handleClickOutside = (e) => {
            const inMobile = dropdownRef.current?.contains(e.target);
            const inDesktop = desktopDropdownRef.current?.contains(e.target);
            const inNotif = e.target.closest('.notif-dropdown-wrapper');
            if (!inMobile && !inDesktop && !inNotif) {
                setIsFilterOpen(false);
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const doctorNotifications = useMemo(() => {
        if (!doctorId) return [];
        const lastCheck = lastDoctorNotificationCheck[doctorId];

        return patients.filter(p =>
            p.type === 'Appointment' &&
            p.status === 'cancelled' &&
            p.appointmentStatus === 'cancelled' &&
            p.assignedDoctor?.id === doctorId &&
            (!lastCheck || new Date(p.queueExitTime || p.registeredAt) > new Date(lastCheck))
        ).sort((a, b) => new Date(b.queueExitTime || b.registeredAt) - new Date(a.queueExitTime || a.registeredAt));
    }, [patients, doctorId, lastDoctorNotificationCheck]);

    const unreadDoctorNotificationsCount = useMemo(() => {
        return doctorNotifications.length;
    }, [doctorNotifications]);

    useEffect(() => {
        if (selectedPatient && workspaceRef.current) workspaceRef.current.scrollTo(0, 0);
    }, [selectedPatient]);

    // ✅ Sync selectedPatient with global patients array to reflect status changes
    useEffect(() => {
        if (selectedPatient) {
            const fresh = patients.find(p => p.id === selectedPatient.id || (p.dbId && p.dbId === selectedPatient.dbId));
            if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedPatient)) {
                console.log("🔄 Syncing selectedPatient with fresh context data");
                setSelectedPatient(fresh);
            }
        }
    }, [patients, selectedPatient]);

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const handleConfirmLogout = async () => {
        setShowLogoutModal(false);
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Error signing out:", err);
        }
        localStorage.removeItem('userRole');
        localStorage.removeItem('selectedDoctorId');
        navigate("/");
    };

    const handleCancelLogout = () => {
        setShowLogoutModal(false);
    };

    const handleDeclineAll = async () => {
        if (isDecliningAll) return;
        setIsDecliningAll(true);
        try {
            // Get the pending appointments currently visible under the active date filter
            const pendingToDecline = allAppointmentPatients.filter(p =>
                !p.appointmentStatus || p.appointmentStatus === 'pending'
            );
            await Promise.all(
                pendingToDecline.map(p => rejectAppointment(p.id, 'Your appointment has been declined due to the doctor’s unavailability. Please check your email or the homepage for schedule updates.'))
            );
        } catch (err) {
            console.error('Decline All failed:', err);
        } finally {
            setIsDecliningAll(false);
            setShowDeclineAllModal(false);
        }
    };

    const handleAcceptIndividual = async (patientId) => {
        if (!patientId) return;
        try {
            await acceptAppointment(patientId);
            // Re-sync local state if possible or the effect above will handle it
        } catch (err) {
            console.error('Accept appointment failed:', err);
        }
    };

    const handleRejectIndividual = async () => {
        const targetId = selectedPatient?.id || selectedPatient?.dbId;
        if (!targetId || !rejectionReason.trim()) return;

        setIsRejecting(true);
        try {
            await rejectAppointment(targetId, rejectionReason);
            setShowIndividualDeclineModal(false);
            setRejectionReason("");
        } catch (err) {
            console.error('Reject appointment failed:', err);
        } finally {
            setIsRejecting(false);
        }
    };

    // ── Date-in-filter helpers ────────────────────────────────────────────

    // Queue tab: Simplified to auto-show Today's Patients ONLY
    const isQueueDateInFilter = (dateStr) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const s = new Date(now); s.setHours(0, 0, 0, 0);
        const e = new Date(now); e.setHours(23, 59, 59, 999);
        return date >= s && date <= e;
    };

    // Schedule tab: mirrors Appointment.jsx (day-of-week / All Dates / Custom Range)
    const isApptDateInFilter = (dateStr) => {
        if (!dateStr || apptDateFilter === 'all') return true;
        const date = new Date(dateStr);
        if (apptDateFilter === 'custom') {
            if (!apptCustomRange.start || !apptCustomRange.end) return true;
            const s = new Date(apptCustomRange.start); s.setHours(0, 0, 0, 0);
            const e = new Date(apptCustomRange.end); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }

        if (apptDateFilter === 'thisWeek') {
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return date >= startOfWeek && date <= endOfWeek;
        }

        const daysMap = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
        };

        if (daysMap.hasOwnProperty(apptDateFilter)) {
            const now = new Date();
            const targetDayIndex = daysMap[apptDateFilter];
            const currentDayIndex = now.getDay();
            const diff = targetDayIndex - currentDayIndex;

            const targetDateStart = new Date(now);
            targetDateStart.setDate(now.getDate() + diff);
            targetDateStart.setHours(0, 0, 0, 0);

            const targetDateEnd = new Date(targetDateStart);
            targetDateEnd.setHours(23, 59, 59, 999);

            return date >= targetDateStart && date <= targetDateEnd;
        }

        return false;
    };

    const formatArray = (arr) => (!arr || arr.length === 0) ? 'None' : arr.join(', ');

    const myPatients = (patients || []).filter(p => {
        if (p.isInactive) return false;

        const myName = currentDoctor.name?.toLowerCase().trim();
        const patientAssignedName = p.assignedDoctor?.name?.toLowerCase().trim();
        const patientPreferredName = p.preferredDoctor?.name?.toLowerCase().trim();

        // Check by ID (preferred) or by trimmed name (fallback)
        const isAssigned = p.assignedDoctor?.id === doctorId ||
            (patientAssignedName && patientAssignedName === myName);

        const isPreferred = !p.assignedDoctor &&
            (p.preferredDoctor?.id === doctorId ||
                (patientPreferredName && patientPreferredName === myName));

        return isAssigned || isPreferred;
    });

    // ── Queue patients — mirrors Dashboard.jsx rules ──────────────────────

    const activeQueuePatients = myPatients.filter(p => {
        if (p.isInactive) return false;
        if (p.type === 'Appointment' && p.appointmentStatus !== 'accepted') return false;
        if (p.status === 'done' || p.status === 'cancelled') return false;
        if (!p.inQueue) return false;
        if (p.type === 'Appointment') return isQueueDateInFilter(p.appointmentDateTime);
        return isQueueDateInFilter(p.registeredAt);
    });

    const activePriorityQueuePatients = activeQueuePatients.filter(p => p.isPriority);
    const activeNonPriorityQueuePatients = activeQueuePatients.filter(p => !p.isPriority);

    const doneQueuePatients = myPatients.filter(p => {
        if (p.isInactive) return false;
        if (p.type === 'Appointment' && p.appointmentStatus !== 'accepted') return false;
        if (!p.inQueue) return false;
        if (p.status !== 'done') return false;
        return isQueueDateInFilter(p.completedAt || p.registeredAt);
    });

    const cancelledQueuePatients = myPatients.filter(p => {
        if (p.isInactive) return false;
        if (!p.inQueue) return false;
        if (p.status !== 'cancelled') return false;
        return isQueueDateInFilter(p.cancelledAt || p.registeredAt);
    });

    const allQueuePatients = [...activeQueuePatients, ...doneQueuePatients, ...cancelledQueuePatients]
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

    const queuePatients = (() => {
        if (queueStatusFilter === 'active') return [...activePriorityQueuePatients, ...activeNonPriorityQueuePatients];
        if (queueStatusFilter === 'done') return doneQueuePatients;
        if (queueStatusFilter === 'cancelled') return cancelledQueuePatients;
        return allQueuePatients;
    })();

    // ── Appointment patients — mirrors Appointment.jsx rules ─────────────
    const allAppointmentPatients = myPatients.filter(p =>
        p.type === 'Appointment' &&
        p.status !== 'done' &&
        p.appointmentDateTime &&
        isApptDateInFilter(p.appointmentDateTime)
    );

    // Status-filtered appointment patients
    const appointmentPatients = allAppointmentPatients.filter(p => {
        if (scheduledStatusFilter === 'all') return true;
        if (scheduledStatusFilter === 'pending') return !p.appointmentStatus || p.appointmentStatus === 'pending';
        if (scheduledStatusFilter === 'accepted') return p.appointmentStatus === 'accepted';
        if (scheduledStatusFilter === 'rejected') return p.appointmentStatus === 'rejected';
        if (scheduledStatusFilter === 'cancelled') return p.appointmentStatus === 'cancelled';
        return true;
    }).filter((p, index, self) =>
        index === self.findIndex((t) => (t.name || '').toLowerCase().trim() === (p.name || '').toLowerCase().trim())
    ).sort((a, b) => {
        const getTimestamp = (p) => {
            // Priority: Rejected/Cancelled time > Registration time
            const actionTime = p.rejectedAt || p.queueExitTime || p.registeredAt;
            return new Date(actionTime).getTime();
        };
        return getTimestamp(b) - getTimestamp(a);
    });

    // Appointment badge counts
    const apptAllCount = allAppointmentPatients.length;
    const apptPendingCount = allAppointmentPatients.filter(p => !p.appointmentStatus || p.appointmentStatus === 'pending').length;
    const apptAcceptedCount = allAppointmentPatients.filter(p => p.appointmentStatus === 'accepted').length;
    const apptRejectedCount = allAppointmentPatients.filter(p => p.appointmentStatus === 'rejected').length;
    const apptCancelledCount = allAppointmentPatients.filter(p => p.appointmentStatus === 'cancelled').length;

    const currentList = activeTab === 'queue' ? queuePatients : appointmentPatients;
    const doctorPatients = currentList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.queueNo.toString().includes(searchQuery)
    );

    // ── Stats header label ────────────────────────────────────────────────
    const activeCount = activeQueuePatients.length;
    const doneCount = doneQueuePatients.length;
    const cancelledCount = cancelledQueuePatients.length;
    const completedTodayCount = doneQueuePatients.length;
    const totalTodayCount = allQueuePatients.length;

    const stats = [
        { label: "Today", value: totalTodayCount.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Queue", value: activeCount.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Done", value: completedTodayCount.toString(), icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
    ];

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
        setMobileView('detail');
        setSidebarOpen(false);
    };

    const handleBackToList = () => {
        setMobileView('list');
        setSelectedPatient(null);
    };

    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    /* ─── Patient Card (shared) ─── */







    /* ─── Queue Status Filter Pills ─── */
    const statusFilterOptions = [
        { key: 'active', label: 'Active', count: activeCount, pill: 'bg-emerald-600 hover:bg-emerald-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'done', label: 'Done', count: doneCount, pill: 'bg-blue-600 hover:bg-blue-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'cancelled', label: 'Cancelled', count: cancelledCount, pill: 'bg-red-600 hover:bg-red-700 text-white', inactive: 'hover:bg-gray-100' },
    ];

    const QueueStatusFilter = () => (
        <div className="flex flex-wrap gap-1 px-2 pb-2 pt-1">
            {statusFilterOptions.map(opt => (
                <Button
                    key={opt.key}
                    onClick={() => setQueueStatusFilter(opt.key)}
                    variant={queueStatusFilter === opt.key ? 'default' : 'outline'}
                    className={`h-8 flex-1 px-2 text-xs font-medium transition-all ${queueStatusFilter === opt.key ? opt.pill : opt.inactive}`}
                >
                    {opt.label}
                    <Badge variant="secondary" className={`ml-1 px-1 py-0 text-[10px] leading-none min-w-[1.125rem] justify-center ${queueStatusFilter === opt.key ? 'bg-white text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                        {opt.count}
                    </Badge>
                </Button>
            ))}
        </div>
    );

    /* ─── Scheduled (Appointment) Status Filter Pills ─── */
    const scheduledFilterOptions = [
        { key: 'all', label: 'All', count: apptAllCount, pill: 'bg-green-600 hover:bg-green-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'pending', label: 'Pending', count: apptPendingCount, pill: 'bg-amber-600 hover:bg-amber-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'accepted', label: 'Accepted', count: apptAcceptedCount, pill: 'bg-green-600 hover:bg-green-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'rejected', label: 'Not Accepted', count: apptRejectedCount, pill: 'bg-red-600 hover:bg-red-700 text-white', inactive: 'hover:bg-gray-100' },
        { key: 'cancelled', label: 'Cancelled', count: apptCancelledCount, pill: 'bg-gray-600 hover:bg-gray-700 text-white', inactive: 'hover:bg-gray-100' },
    ];

    // Pending appointments currently visible (for Decline All)
    const visiblePendingCount = allAppointmentPatients.filter(p =>
        !p.appointmentStatus || p.appointmentStatus === 'pending'
    ).length;

    const ScheduledStatusFilter = () => (
        <div className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
            <div className="flex flex-wrap gap-1">
                {scheduledFilterOptions.map(opt => (
                    <Button
                        key={opt.key}
                        onClick={() => setScheduledStatusFilter(opt.key)}
                        variant={scheduledStatusFilter === opt.key ? 'default' : 'outline'}
                        className={`h-8 flex-1 px-1 text-[10px] font-medium transition-all ${scheduledStatusFilter === opt.key ? opt.pill : opt.inactive}`}
                    >
                        {opt.label}
                        <Badge variant="secondary" className={`ml-0.5 px-0.5 py-0 text-[9px] leading-none min-w-[1rem] justify-center ${scheduledStatusFilter === opt.key ? 'bg-white text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                            {opt.count}
                        </Badge>
                    </Button>
                ))}
            </div>
            {/* Decline All — only for appointment-only doctors, when viewing Pending */}
            {isAppointmentOnlyDoctor && scheduledStatusFilter === 'pending' && visiblePendingCount > 0 && (
                <button
                    onClick={() => setShowDeclineAllModal(true)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                >
                    <X className="w-3.5 h-3.5" />
                    Decline All ({visiblePendingCount})
                </button>
            )}
        </div>
    );

    /* ─── Patient List Panel ─── */
    const PatientList = () => (
        <div className="flex flex-col h-full">
            {/* Search + Tabs */}
            <div className="px-3 sm:px-5 pt-3 pb-2 bg-white border-b border-slate-100 space-y-2">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-emerald-500 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl flex-1">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest ${activeTab === 'queue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Queue
                        </button>
                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest ${activeTab === 'appointments' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Schedule
                        </button>
                    </div>
                </div>
                {/* Status filter pills — Queue tab / Schedule tab */}
                {activeTab === 'queue' && <QueueStatusFilter />}
                {activeTab === 'appointments' && <ScheduledStatusFilter />}
            </div>

            {/* Count label */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60">
                <span className="text-[11px] font-bold text-black-300">
                    {activeTab === 'queue'
                        ? statusFilterOptions.find(o => o.key === queueStatusFilter)?.label + ' Patients'
                        : (scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label || 'All') + ' Appointments'}
                </span>
                <span className="text-[9px] font-bold bg-white text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">
                    {doctorPatients.length} Shown
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-2">
                {doctorPatients.length > 0 ? (
                    doctorPatients.map(p => (
                        <PatientCard
                            key={p.id || p.queueNo}
                            patient={p}
                            selectedPatient={selectedPatient}
                            onClick={handlePatientClick}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 px-4 bg-white border border-dashed border-slate-200 rounded-2xl mx-1">
                        <Users className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                        <h4 className="text-slate-800 font-bold text-xs mb-1 uppercase tracking-widest">{activeTab === 'queue' ? 'No Patients' : 'No Appointments'}</h4>
                        <p className="text-[11px] font-bold text-slate-400">{searchQuery ? 'Adjust your search' : activeTab === 'queue' ? `No ${queueStatusFilter} patients` : `No ${scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label?.toLowerCase()} appointments`}</p>
                    </div>
                )}
            </div>

        </div>
    );

    const NotificationsDropdown = ({ side = 'right' }) => (
        <div className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-gray-100 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-green-600" />
                    Patient Cancellations
                </h3>
                <button
                    onClick={() => {
                        markDoctorNotificationsAsRead(doctorId);
                        setShowNotifications(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <XCircle className="w-5 h-5" />
                </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {doctorNotifications.length > 0 ? (
                    doctorNotifications.map((notif) => (
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
                                        Cancelled their appointment for {formatDateShort(notif.appointmentDateTime || notif.appointment_datetime)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {formatDateTime(notif.queueExitTime || notif.registeredAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No new cancellations</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">

            {/* ─── MOBILE LAYOUT ─── */}
            <div className="flex flex-col h-full md:hidden overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-slate-100 shrink-0 z-30 shadow-sm">
                    {mobileView === 'detail' ? (
                        /* Detail view — slim back bar */
                        <div className="flex items-center justify-between px-4 pt-10 h-20">
                            <button onClick={handleBackToList} className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
                                <ArrowLeft className="w-4 h-4" /> Queue
                            </button>
                            {selectedPatient && (
                                <span className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{selectedPatient.name}</span>
                            )}
                            <div className="relative notif-dropdown-wrapper">
                                <button
                                    onClick={() => {
                                        setShowNotifications(!showNotifications);
                                        if (!showNotifications) markDoctorNotificationsAsRead(doctorId);
                                    }}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-green-600 rounded-full transition-all duration-200 focus:outline-none relative"
                                    title="Cancellations"
                                >
                                    <Bell className={`w-5 h-5 ${unreadDoctorNotificationsCount > 0 ? 'animate-swing' : ''}`} />
                                    {unreadDoctorNotificationsCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                                            {unreadDoctorNotificationsCount}
                                        </span>
                                    )}
                                </button>
                                {showNotifications && mobileView === 'detail' && <NotificationsDropdown />}
                            </div>
                        </div>
                    ) : (
                        /* List view — full doctor card header */
                        <div className="px-4 pt-10 pb-3">
                            <div className="mb-6 flex justify-center">
                                <img src={logoValley} alt="Valley Logo" className="h-14 w-auto object-contain" />
                            </div>
                            <div className="flex items-start justify-between mb-3 gap-2">
                                {/* Doctor identity */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                                        {getInitials(currentDoctor.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 leading-tight break-words">{currentDoctor.name}</p>
                                        <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider truncate">{currentDoctor.specialization || "Physician"}</p>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={handleLogoutClick} className="text-green-600 hover:text-white hover:bg-green-600 h-8 w-8 rounded-full [&_svg]:size-5">
                                        <DoorOpen />
                                    </Button>
                                    <div className="relative notif-dropdown-wrapper">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(!showNotifications);
                                                if (!showNotifications) markDoctorNotificationsAsRead(doctorId);
                                            }}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-green-600 rounded-full transition-all duration-200 focus:outline-none relative"
                                            title="Cancellations"
                                        >
                                            <Bell className={`w-5 h-5 ${unreadDoctorNotificationsCount > 0 ? 'animate-swing' : ''}`} />
                                            {unreadDoctorNotificationsCount > 0 && (
                                                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                                                    {unreadDoctorNotificationsCount}
                                                </span>
                                            )}
                                        </button>
                                        {showNotifications && mobileView !== 'detail' && <NotificationsDropdown />}
                                    </div>
                                </div>
                            </div>
                            {/* Stats row */}
                            <div className="flex items-center gap-2">
                                {stats.map((s, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl flex-1 justify-center ${s.bg}`}>
                                        <s.icon className={`w-3 h-3 ${s.color}`} />
                                        <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                                        <span className={`text-[9px] font-bold ${s.color} opacity-60 uppercase tracking-wider hidden sm:inline`}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </header>

                {/* ── Context-sensitive Date Filter strip (mobile) ── */}
                {mobileView === 'list' && activeTab !== 'queue' && (
                    <div className="bg-white border-b border-slate-100 px-3 py-2">
                        <div ref={dropdownRef} className="relative">
                            <Button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                variant="outline"
                                className="h-9 px-3 rounded-md border-gray-200 font-medium text-sm flex items-center gap-2 bg-white hover:bg-gray-50 w-full justify-between"
                            >
                                <div className="flex items-center text-black">
                                    <span>
                                        {apptDateFilter === 'custom' && apptCustomRange.start
                                            ? `${apptCustomRange.start} – ${apptCustomRange.end}`
                                            : getApptDateFilterLabel(apptDateFilter)}
                                    </span>
                                </div>
                                <span className="ml-2 text-black text-[10px]">▼</span>
                            </Button>
                            {isFilterOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
                                    {apptDateFilters.map(f => (
                                        <button key={f} onClick={() => { setApptDateFilter(f); setIsFilterOpen(false); }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-all ${apptDateFilter === f ? 'text-green-600 bg-green-50 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                                            {getApptDateFilterLabel(f)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Appointments custom range */}
                        {apptDateFilter === 'custom' && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-md border border-gray-100">
                                <Input type="date" className="h-8 rounded-md text-xs flex-1 border-gray-300 bg-white" value={apptCustomRange.start} onChange={e => setApptCustomRange({ ...apptCustomRange, start: e.target.value })} />
                                <span className="text-gray-400">to</span>
                                <Input type="date" className="h-8 rounded-md text-xs flex-1 border-gray-300 bg-white" value={apptCustomRange.end} onChange={e => setApptCustomRange({ ...apptCustomRange, end: e.target.value })} />
                                <Button variant="ghost" size="sm" className="text-gray-500 text-xs h-8 px-2 hover:text-rose-500" onClick={() => { setApptCustomRange({ start: '', end: '' }); setApptDateFilter('all'); }}>Reset</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {mobileView === 'list' ? (
                        <PatientList />
                    ) : selectedPatient ? (
                        <PatientDetail
                            patient={selectedPatient}
                            setSelectedPatient={setSelectedPatient}
                            patients={patients}
                            workspaceRef={workspaceRef}
                            handleAcceptIndividual={handleAcceptIndividual}
                            setShowIndividualDeclineModal={setShowIndividualDeclineModal}
                            setRejectionReason={setRejectionReason}
                        />
                    ) : null}
                </div>
            </div>

            {/* ─── DESKTOP LAYOUT ─── */}
            <div className="hidden md:flex flex-row h-full">

                {/* Left Panel */}
                <aside className="w-72 lg:w-80 xl:w-[360px] flex flex-col bg-white border-r border-slate-200 shadow-sm shrink-0">
                    {/* Doctor Card at Top */}
                    <div className="px-5 pt-8 pb-3 border-b border-slate-100">
                        <div className="mb-8 flex justify-center">
                            <img src={logoValley} alt="Valley Logo" className="h-16 w-auto object-contain" />
                        </div>
                        {/* Doctor Identity & Actions - Matching Mobile Layout Design */}
                        <div className="flex items-start justify-between mb-4 gap-2">
                            {/* Identity */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                                    {getInitials(currentDoctor.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800 leading-tight break-words">{currentDoctor.name}</p>
                                    <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider truncate">{currentDoctor.specialization || "Physician"}</p>
                                </div>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}
                                    className="text-green-600 hover:text-white hover:bg-green-600 h-8 w-8 rounded-full shrink-0 [&_svg]:size-5"
                                    title="Log Out"
                                >
                                    <DoorOpen />
                                </Button>
                                <div className="relative notif-dropdown-wrapper">
                                    <button
                                        onClick={() => {
                                            setShowNotifications(!showNotifications);
                                            if (!showNotifications) markDoctorNotificationsAsRead(doctorId);
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-green-600 rounded-full transition-all duration-200 focus:outline-none relative"
                                        title="Cancellations"
                                    >
                                        <Bell className={`w-5 h-5 ${unreadDoctorNotificationsCount > 0 ? 'animate-swing' : ''}`} />
                                        {unreadDoctorNotificationsCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                                                {unreadDoctorNotificationsCount}
                                            </span>
                                        )}
                                    </button>
                                    {showNotifications && <NotificationsDropdown side="left" />}
                                </div>

                            </div>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-emerald-500 h-9 text-sm"
                            />
                        </div>
                        <div className="flex space-x-1 rounded-xl bg-gray-100 p-0.5 mt-3">
                            <button onClick={() => setActiveTab('queue')} className={`w-full rounded-lg py-1.5 text-xs font-medium leading-5 focus:outline-none focus:ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-emerald-400 transition-all ${activeTab === 'queue' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'}`}>Queue</button>
                            <button onClick={() => setActiveTab('appointments')} className={`w-full rounded-lg py-1.5 text-xs font-medium leading-5 focus:outline-none focus:ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-emerald-400 transition-all ${activeTab === 'appointments' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'}`}>Appointments</button>
                        </div>
                        {/* Status filter pills — Queue tab only */}
                        {activeTab === 'queue' && <QueueStatusFilter />}
                        {/* Appointment status filter pills — Schedule tab only */}
                        {activeTab === 'appointments' && <ScheduledStatusFilter />}
                    </div>

                    {/* Count */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60">
                        <span className="text-[12px] font-bold text-black-300">
                            {activeTab === 'queue'
                                ? statusFilterOptions.find(o => o.key === queueStatusFilter)?.label + ' Patients'
                                : (scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label || 'All') + ' Appointments'}
                        </span>
                        <span className="text-[10px] font-bold bg-white text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">{doctorPatients.length} Shown</span>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {doctorPatients.length > 0 ? (
                            doctorPatients.map(p => (
                                <PatientCard
                                    key={p.id || p.queueNo}
                                    patient={p}
                                    selectedPatient={selectedPatient}
                                    onClick={handlePatientClick}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl">
                                <Users className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                                <h4 className="text-slate-800 font-bold text-xs mb-1 uppercase tracking-widest">{activeTab === 'queue' ? 'No Patients' : 'No Appointments'}</h4>
                                <p className="text-xs font-bold text-slate-400">{searchQuery ? 'Adjust search' : activeTab === 'queue' ? `No ${queueStatusFilter} patients` : `No ${scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label?.toLowerCase()} appointments`}</p>
                            </div>
                        )}
                    </div>

                </aside>

                {/* Right Panel */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Stats + Date Filter */}
                    <header className="bg-white border-b border-slate-100 px-5 lg:px-8 py-4 shrink-0 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 lg:gap-8 overflow-x-auto no-scrollbar">
                                {stats.map((stat, i) => (
                                    <div key={i} className="flex items-center gap-3 shrink-0">
                                        <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shadow-sm`}>
                                            <stat.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none">{stat.label}</p>
                                            <p className="text-xl lg:text-2xl font-bold text-slate-800 leading-none mt-0.5">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Context-sensitive date filter dropdown (desktop) ── */}
                            {activeTab !== 'queue' && (
                                <div className="relative shrink-0" ref={desktopDropdownRef}>
                                    <Button
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        variant="outline"
                                        className="h-10 min-w-[160px] rounded-md border-gray-200 font-medium text-sm flex items-center justify-between gap-3 bg-white hover:bg-gray-50 transition-all"
                                    >
                                        <div className="flex items-center text-black">
                                            <span className="text-left font-medium">
                                                {apptDateFilter === 'custom' && apptCustomRange.start
                                                    ? `${apptCustomRange.start} – ${apptCustomRange.end}`
                                                    : getApptDateFilterLabel(apptDateFilter)}
                                            </span>
                                        </div>
                                        <span className="ml-2 text-black text-[10px]">▼</span>
                                    </Button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
                                            {apptDateFilters.map(f => (
                                                <button key={f} onClick={() => { setApptDateFilter(f); setIsFilterOpen(false); }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-all ${apptDateFilter === f ? 'text-green-600 bg-green-50 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                                                    {getApptDateFilterLabel(f)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Appointments custom range inputs (desktop) */}
                        {activeTab === 'appointments' && apptDateFilter === 'custom' && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">From</span>
                                        <Input type="date" className="h-8 w-40 bg-white border-gray-300 rounded-md text-xs" value={apptCustomRange.start} onChange={e => setApptCustomRange({ ...apptCustomRange, start: e.target.value })} />
                                    </div>
                                    <span className="text-gray-400">to</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500">To</span>
                                        <Input type="date" className="h-8 w-40 bg-white border-gray-300 rounded-md text-xs" value={apptCustomRange.end} onChange={e => setApptCustomRange({ ...apptCustomRange, end: e.target.value })} />
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-gray-500 font-medium text-xs hover:text-rose-500 hover:bg-rose-50 rounded-md h-8 px-4"
                                    onClick={() => { setApptCustomRange({ start: '', end: '' }); setApptDateFilter('all'); }}>Reset</Button>
                            </div>
                        )}
                    </header>

                    {/* Workspace */}
                    {selectedPatient ? (
                        <PatientDetail
                            patient={selectedPatient}
                            setSelectedPatient={setSelectedPatient}
                            patients={patients}
                            workspaceRef={workspaceRef}
                            handleAcceptIndividual={handleAcceptIndividual}
                            setShowIndividualDeclineModal={setShowIndividualDeclineModal}
                            setRejectionReason={setRejectionReason}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
                            <div className="space-y-6 max-w-lg">
                                <div className="w-16 h-16 bg-emerald-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-emerald-200 rotate-12 mx-auto">
                                    <Stethoscope className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight leading-tight">
                                        Welcome, <span className="text-emerald-600">{currentDoctor.name.split(' ').slice(0, 2).join(' ')}</span>
                                    </h3>
                                    <p className="text-slate-400 mt-3 text-base font-bold max-w-sm mx-auto">
                                        You have <span className="text-emerald-600 font-bold">{queuePatients.length} patients</span> in queue. Select a patient to begin.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* LOGOUT CONFIRMATION MODAL */}
            <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
                <DialogContent className="max-w-md rounded-lg border-none shadow-2xl [&>button]:hidden">
                    <DialogHeader className="items-center text-center gap-0">
                        <div className="flex items-center justify-center mb-4">
                            <DoorOpen className="w-9 h-9 text-red-600" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-gray-800 mb-2 text-center">
                            Confirm Logout
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 mb-6 text-center text-base">
                            Are you sure you want to log out? You'll need to sign in again to access the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row gap-3 sm:gap-3">
                        <button
                            onClick={handleCancelLogout}
                            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmLogout}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                        >
                            Log Out
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* INDIVIDUAL DECLINE CONFIRMATION MODAL */}
            <Dialog open={showIndividualDeclineModal} onOpenChange={(open) => {
                if (!open) { setShowIndividualDeclineModal(false); setRejectionReason(""); }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Decline Appointment</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for not accepting {selectedPatient?.name}'s appointment.
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
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="min-h-[100px] resize-none"
                                maxLength={500}
                            />
                            <p className="text-xs text-gray-500 text-right">
                                {rejectionReason.length}/500 characters
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setShowIndividualDeclineModal(false); setRejectionReason(""); }}
                            disabled={isRejecting}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRejectIndividual}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                            disabled={isRejecting || !rejectionReason.trim()}
                        >
                            {isRejecting ? (
                                <>
                                    <span className="w-4 h-4 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Send Notice to Patient
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DECLINE ALL CONFIRMATION MODAL */}
            <Dialog open={showDeclineAllModal} onOpenChange={setShowDeclineAllModal}>
                <DialogContent className="sm:max-w-md rounded-xl border-none shadow-2xl [&>button]:hidden">
                    <DialogHeader className="items-center text-center gap-0">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                                <XCircle className="w-7 h-7 text-red-600" />
                            </div>
                        </div>
                        <DialogTitle className="text-xl font-bold text-gray-800 mb-1 text-center">
                            Decline All Pending Requests?
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-center space-y-4 mt-2">
                                <p className="text-gray-500 text-sm">
                                    You are about to decline{' '}
                                    <span className="inline-flex items-center bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-md border border-red-100">
                                        {visiblePendingCount} pending request{visiblePendingCount !== 1 ? 's' : ''}
                                    </span>{' '}
                                    within the current date filter.
                                </p>
                                <ul className="text-left text-sm text-gray-500 space-y-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        All matched patients will be notified via email.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        This action <span className="font-semibold text-gray-700">cannot be undone</span>.
                                    </li>
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeclineAllModal(false)}
                            disabled={isDecliningAll}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeclineAll}
                            disabled={isDecliningAll}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDecliningAll ? (
                                <>
                                    <span className="w-4 h-4 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Declining...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Decline All
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .visit-logs-table > div { overflow-x: hidden; }
            `}</style>
        </div>
    );
};

/* ─── Status color helpers ─── */
const statusStyle = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'in progress':
            return 'bg-green-600 text-white';
        case 'accepted':
            return 'bg-green-600 text-white';
        case 'not accepted':
        case 'rejected':
            return 'bg-red-600 text-white';
        case 'cancelled':
            return 'border-gray-400 text-gray-500 border';
        case 'done':
            return 'bg-blue-600 text-white';
        case 'waiting':
        case 'pending':
        default:
            return 'bg-amber-100 text-amber-700';
    }
};

const formatArray = (arr) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.join(', ');
};

/* ─── Patient Card (shared) ─── */
const PatientCard = ({ patient, selectedPatient, onClick }) => {
    const isSelected = selectedPatient?.queueNo === patient.queueNo;

    return (
        <div
            onClick={() => onClick(patient)}
            className={`group cursor-pointer relative p-4 sm:p-5 rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${isSelected ? 'bg-emerald-600 border-emerald-600 shadow-emerald-200' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
        >
            <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold relative transition-all shrink-0 ${isSelected ? 'bg-white/20 text-white' : (patient.isPriority ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700')}`}>
                    <span className="text-[11px] opacity-60 leading-none">Q</span>
                    <span className="text-lg sm:text-xl leading-none">{patient.queueNo}</span>
                    {patient.status === 'in progress' && (
                        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${isSelected ? 'bg-white border-emerald-600 animate-ping' : 'bg-emerald-500 border-white animate-pulse'}`} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-bold tracking-tight truncate text-sm sm:text-base ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {patient.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <Badge variant="outline" className={`text-[10px] h-5 font-semibold px-1.5 shrink-0 pointer-events-none ${isSelected ? 'bg-white/10 text-emerald-50 border-none' : (patient.type === 'Appointment' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200')}`}>
                            {patient.type === 'Appointment' ? 'Booked' : 'Walk-in'}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 font-semibold px-1.5 shrink-0 max-w-[90px] truncate pointer-events-none border-green-200 ${isSelected ? 'bg-white/10 text-emerald-50 border-none' : 'bg-green-50 text-green-700'}`}>
                            {formatArray(patient.services?.slice(0, 1) || [patient.type || 'Regular'])}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 font-semibold px-1.5 shrink-0 pointer-events-none ${isSelected ? 'bg-white/10 text-emerald-50 border-none' : (patient.type === 'Appointment' ? (patient.appointmentStatus === 'accepted' ? 'bg-green-600 text-white border-none' : patient.appointmentStatus === 'rejected' ? 'bg-red-600 text-white border-none' : patient.appointmentStatus === 'cancelled' ? 'border-gray-400 text-gray-500' : 'bg-amber-100 text-amber-700 border-none') : statusStyle(patient.status))}`}>
                            {patient.type === 'Appointment' ? (patient.appointmentStatus === 'accepted' ? 'Accepted' : patient.appointmentStatus === 'rejected' ? 'Not Accepted' : patient.appointmentStatus === 'cancelled' ? 'Cancelled' : 'Pending') : (patient.status || 'Waiting')}
                        </Badge>
                    </div>
                    <div className="flex flex-col gap-1 mt-2.5 border-t border-slate-100/50 pt-2.5">
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none ${isSelected ? 'text-emerald-100/90' : 'text-slate-400'}`}>
                            {patient.type === 'Appointment' ? 'Date and Time of Appointment' : 'Check-in Time'}
                        </p>
                        <span className={`text-[11px] flex items-center gap-1.5 shrink-0 whitespace-nowrap font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {formatDateShort(patient.type === 'Appointment' ? patient.appointmentDateTime : patient.registeredAt)}
                        </span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-emerald-400'}`} />
            </div>
        </div>
    );
};

/* ─── Patient Detail Panel (shared) ─── */
const PatientDetail = ({ patient, setSelectedPatient, patients, workspaceRef, handleAcceptIndividual, setShowIndividualDeclineModal, setRejectionReason }) => {
    const [expandedVisitId, setExpandedVisitId] = useState(null);

    // Find all visits for this patient using Email or Phone
    const targetEmail = (patient.patientEmail || '').toLowerCase().trim();
    const targetPhone = (patient.phoneNum || '').trim();
    const targetName = (patient.name || '').toLowerCase().trim();

    let patientVisits = (patients || [])
        .filter(p => {
            if (targetEmail && p.patientEmail && p.patientEmail.toLowerCase().trim() === targetEmail) return true;
            if (targetPhone && p.phoneNum && p.phoneNum.trim() === targetPhone) return true;
            if (!targetEmail && !targetPhone && p.name && p.name.toLowerCase().trim() === targetName) return true;
            return false;
        })
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    if (patientVisits.length === 0) {
        patientVisits = [patient];
    }

    const now = new Date();
    const upcomingAppointments = patientVisits
        .filter(v =>
            v.type === 'Appointment' &&
            v.appointmentStatus === 'accepted' &&
            v.appointmentDateTime &&
            new Date(v.appointmentDateTime) > now
        )
        .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));

    const formatDate = (dateString) => {
        return formatDateTime(dateString);
    };

    const getServiceLabel = (service) => {
        if (!service) return 'Regular';
        if (service.includes('PEME') || service.includes('Pre-Employment')) return 'PEME';
        if (service.includes('APE') || service.includes('Annual Physical')) return 'APE';
        if (service.includes('Consultation')) return 'Consultation';
        return service;
    };

    return (
        <div ref={workspaceRef} className="h-full flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40">
            <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">

                <Card className="border shadow-sm rounded-xl overflow-hidden bg-white mb-6">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                            <div className="hidden sm:flex flex-col items-center justify-center w-28 h-28 rounded-xl bg-emerald-50 text-emerald-700 shrink-0 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-transparent opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600/60 relative z-10 mb-0.5">Queue</span>
                                <span className="text-5xl font-bold relative z-10 leading-none">{patient.queueNo}</span>
                            </div>
                            <div className="flex-1 min-w-0 space-y-5">
                                <div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight truncate">{patient.name}</h2>
                                        <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 rounded-md hidden sm:inline-flex pointer-events-none ${statusStyle(patient.status)}`}>
                                            {patient.status || 'Waiting'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">
                                            {patient.type === 'Appointment' ? 'Date and Time of Appointment' : 'Check-in Time'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1.5"><Clock className="w-4.5 h-4.5 text-emerald-500" />
                                                {formatDateTime(patient.type === 'Appointment' ? patient.appointmentDateTime : patient.registeredAt)}
                                            </span>
                                            {patient.isPriority && <Badge variant="secondary" className="bg-amber-100/50 text-amber-700 border border-amber-200 text-xs font-medium uppercase tracking-wider rounded-md pointer-events-none" >Priority</Badge>}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-5 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Age & Contact</p>
                                        <p className="text-base font-bold text-slate-800">
                                            {patient.age} yrs • {(patient.phoneNum || '').replace(/^\+63/, '0') || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Assigned Doctor</p>
                                        <div className="flex items-center gap-1.5">
                                            <Stethoscope className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                            <span className="text-purple-700 font-medium text-[15px]">
                                                {patient.assignedDoctor?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Services</p>
                                        <div className="flex flex-wrap gap-1">
                                            {(patient.services || ['General Consultation']).map((s, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200 font-semibold pointer-events-none">
                                                    {getServiceLabel(s)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2 lg:col-span-3">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Current Visit Symptoms</p>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {patient.symptoms && patient.symptoms.length > 0 ? (
                                                patient.symptoms.map((s, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 font-semibold pointer-events-none">
                                                        {s}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <p className="text-sm font-semibold text-slate-400 italic">Routine check-up / consultation</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {upcomingAppointments.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2.5 bg-blue-50 rounded-xl shadow-sm">
                                        <CalendarDays className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">
                                        Upcoming {upcomingAppointments.length === 1 ? 'Appointment' : 'Appointments'}
                                    </h3>
                                </div>
                                <div className="space-y-4">
                                    {upcomingAppointments.map((appt, i) => (
                                        <div key={appt.id || i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-100/60 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white border border-blue-100 shadow-sm shrink-0">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase leading-none">
                                                        {new Date(appt.appointmentDateTime).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className="text-2xl font-bold text-blue-700 leading-none mt-1">
                                                        {new Date(appt.appointmentDateTime).getDate()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-slate-800">
                                                        {new Date(appt.appointmentDateTime).toLocaleDateString('en-US', {
                                                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-[13px] font-bold text-blue-600 mt-1 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(appt.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                {appt.assignedDoctor?.name && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-lg border border-purple-100/50">
                                                        <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                                                        <span className="text-[11px] font-medium text-purple-700">
                                                            {appt.assignedDoctor.name}
                                                        </span>
                                                    </div>
                                                )}
                                                {appt.services && appt.services.length > 0 && appt.services.slice(0, 2).map((s, si) => (
                                                    <Badge key={si} variant="outline" className="text-xs font-medium uppercase tracking-wider text-purple-700 bg-purple-50 border-none rounded-md px-2 py-1 pointer-events-none">
                                                        {s}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>



                <Card className="border shadow-sm rounded-xl overflow-hidden bg-white mb-8">
                    <CardHeader className="border-b border-slate-50 p-6 sm:p-8 pb-4">
                        <CardTitle className="text-base sm:text-lg font-bold flex items-center justify-between text-slate-800 tracking-tight">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 rounded-xl shadow-sm">
                                    <History className="w-4 h-4 text-emerald-600" />
                                </div>
                                Clinical Visit Logs
                            </div>
                            <Badge variant="outline" className="border-slate-200 font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded-xl shadow-sm pointer-events-none">
                                {patientVisits.length} Encounters
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="hidden sm:block overflow-hidden visit-logs-table">
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-none">
                                        <TableHead className="w-[12%] font-semibold text-gray-700 py-4 pl-6 whitespace-nowrap">Visit #</TableHead>
                                        <TableHead className="w-[28%] font-semibold text-gray-700 py-4">Doctor</TableHead>
                                        <TableHead className="w-[30%] font-semibold text-gray-700 py-4">Symptoms</TableHead>
                                        <TableHead className="w-[14%] font-semibold text-gray-700 py-4 text-center">Status</TableHead>
                                        <TableHead className="w-[16%] font-semibold text-gray-700 py-4 text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {patientVisits.map((visit, idx) => {
                                        const vId = visit.id || idx;
                                        const isExpanded = expandedVisitId === vId;
                                        const visitNum = patientVisits.length - idx;
                                        return (
                                            <React.Fragment key={vId}>
                                                <TableRow className="border-slate-50 hover:bg-slate-50/80 group transition-all">
                                                    <TableCell className="py-4 pl-6">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            #{String(visitNum).padStart(3, '0')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 pr-2">
                                                        <div className="flex items-start gap-1.5">
                                                            <Stethoscope className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-purple-700 font-medium text-xs xl:text-sm whitespace-normal break-words">
                                                                {visit.assignedDoctor?.name || 'Unassigned'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {visit.symptoms && visit.symptoms.length > 0 ? (
                                                                <>
                                                                    {visit.symptoms.slice(0, 2).map((s, i) => (
                                                                        <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 pointer-events-none">
                                                                            {s}
                                                                        </Badge>
                                                                    ))}
                                                                    {visit.symptoms.length > 2 && (
                                                                        <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border-none rounded-md px-2 py-0.5 pointer-events-none">
                                                                            +{visit.symptoms.length - 2}
                                                                        </Badge>
                                                                    )}
                                                                </>
                                                            ) : <span className="text-xs text-slate-400 font-medium italic">None reported</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        {visit.type === 'Appointment' ? (
                                                            visit.appointmentStatus === 'accepted' ? (
                                                                <Badge className="bg-green-600 text-[10px] xl:text-xs">Accepted</Badge>
                                                            ) : visit.appointmentStatus === 'rejected' ? (
                                                                <Badge variant="destructive" className="bg-red-600 text-white text-[10px] xl:text-xs h-auto whitespace-normal text-center">
                                                                    Not Accepted
                                                                </Badge>
                                                            ) : visit.appointmentStatus === 'cancelled' ? (
                                                                <Badge variant="outline" className="border-gray-400 text-gray-500 text-[10px] xl:text-xs">
                                                                    Cancelled
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] xl:text-xs">
                                                                    Pending
                                                                </Badge>
                                                            )
                                                        ) : (
                                                            <Badge variant="outline" className={`text-[10px] xl:text-xs ${statusStyle(visit.status)}`}>
                                                                {visit.status || 'Waiting'}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4 align-middle">
                                                        <div className="flex justify-center gap-1 flex-nowrap">
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => setExpandedVisitId(isExpanded ? null : vId)}
                                                                className="text-blue-600 hover:bg-blue-50 rounded-xl w-9 h-9 p-0 flex items-center justify-center shrink-0"
                                                                title={isExpanded ? 'Hide Details' : 'View More'}
                                                            >
                                                                <Eye className="w-5 h-5" />
                                                            </Button>

                                                            {visit.type === 'Appointment' && (!visit.appointmentStatus || visit.appointmentStatus === 'pending') && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl shrink-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAcceptIndividual(visit.id || visit.dbId);
                                                                        }}
                                                                        title="Accept"
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5 transition-transform hover:scale-110" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl shrink-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedPatient(visit);
                                                                            setRejectionReason("");
                                                                            setShowIndividualDeclineModal(true);
                                                                        }}
                                                                        title="Decline"
                                                                    >
                                                                        <XCircle className="w-5 h-5 transition-transform hover:rotate-90" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 transition-all">
                                                        <TableCell colSpan={5} className="p-0 border-b border-slate-100">
                                                            <div className="p-6 sm:p-8 pb-6 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-6 border-l-4 border-emerald-400 ml-6 my-3 rounded-r-2xl bg-white shadow-md mr-6 animate-in slide-in-from-left-2 duration-200">
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                                                                    {visit.type === 'Appointment' ? (
                                                                        visit.appointmentStatus === 'accepted' ? (
                                                                            <Badge className="bg-green-600 text-[10px] xl:text-xs pointer-events-none">Accepted</Badge>
                                                                        ) : visit.appointmentStatus === 'rejected' ? (
                                                                            <Badge variant="destructive" className="bg-red-600 text-white text-[10px] xl:text-xs pointer-events-none">
                                                                                Not Accepted
                                                                            </Badge>
                                                                        ) : visit.appointmentStatus === 'cancelled' ? (
                                                                            <Badge variant="outline" className="border-gray-400 text-gray-500 text-[10px] xl:text-xs pointer-events-none">
                                                                                Cancelled
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] xl:text-xs pointer-events-none">
                                                                                Pending
                                                                            </Badge>
                                                                        )
                                                                    ) : (
                                                                        <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 rounded-md pointer-events-none ${statusStyle(visit.status)}`}>
                                                                            {visit.status || 'Waiting'}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Visit Type</p>
                                                                    <p className="text-sm font-bold text-slate-700">{visit.type || 'Walk-in'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Queue Number</p>
                                                                    <Badge variant="outline" className="font-mono text-xs">
                                                                        {String(visit.queueNo || 0).padStart(3, '0')}
                                                                    </Badge>
                                                                </div>
                                                                <div className="col-span-1 xs:col-span-2 lg:col-span-3">
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Full Symptoms List</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {visit.symptoms && visit.symptoms.length > 0 ? (
                                                                            visit.symptoms.map((s, i) => (
                                                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 pointer-events-none">
                                                                                    {s}
                                                                                </Badge>
                                                                            ))
                                                                        ) : <span className="text-sm text-slate-400 italic">None reported</span>}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Services Availed</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {visit.services && visit.services.length > 0 ? (
                                                                            visit.services.map((s, i) => (
                                                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200 pointer-events-none">
                                                                                    {getServiceLabel(s)}
                                                                                </Badge>
                                                                            ))
                                                                        ) : <span className="text-sm text-slate-400 italic">None</span>}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Registered At</p>
                                                                    <p className="text-sm font-medium text-gray-700">{formatDate(visit.registeredAt)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Completed At</p>
                                                                    <p className="text-sm font-medium text-gray-700">{formatDate(visit.completedAt)}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="sm:hidden divide-y divide-slate-100">
                            {patientVisits.map((visit, idx) => {
                                const vId = visit.id || idx;
                                const isExpanded = expandedVisitId === vId;
                                const visitNum = patientVisits.length - idx;
                                return (
                                    <div key={vId} className="p-5 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant="outline" className="font-mono text-xs w-fit">
                                                    Visit #{String(visitNum).padStart(3, '0')}
                                                </Badge>
                                                {visit.type === 'Appointment' ? (
                                                    visit.appointmentStatus === 'accepted' ? (
                                                        <Badge className="bg-green-600 text-[10px] w-fit">Accepted</Badge>
                                                    ) : visit.appointmentStatus === 'rejected' ? (
                                                        <Badge variant="destructive" className="bg-red-600 text-white text-[10px] w-fit">
                                                            Not Accepted
                                                        </Badge>
                                                    ) : visit.appointmentStatus === 'cancelled' ? (
                                                        <Badge variant="outline" className="border-gray-400 text-gray-500 text-[10px] w-fit">
                                                            Cancelled
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] w-fit">
                                                            Pending
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <Badge variant="outline" className={`text-[10px] w-fit ${statusStyle(visit.status)}`}>
                                                        {visit.status || 'Waiting'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setExpandedVisitId(isExpanded ? null : vId)}
                                                    className="text-blue-600 hover:bg-blue-50 rounded-xl w-9 h-9 p-0 flex items-center justify-center shrink-0"
                                                    title={isExpanded ? 'Hide Details' : 'View More'}
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Button>

                                                {visit.type === 'Appointment' && (!visit.appointmentStatus || visit.appointmentStatus === 'pending') && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAcceptIndividual(visit.id || visit.dbId);
                                                            }}
                                                            title="Accept"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5 transition-transform hover:scale-110" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPatient(visit);
                                                                setRejectionReason("");
                                                                setShowIndividualDeclineModal(true);
                                                            }}
                                                            title="Decline"
                                                        >
                                                            <XCircle className="w-5 h-5 transition-transform hover:rotate-90" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                                                <Stethoscope className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Doctor Assigned</p>
                                                    <p className="text-sm font-medium text-purple-700">{visit.assignedDoctor?.name || 'Unassigned'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                                                <Activity className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                                                <div className="w-full">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Symptoms</p>
                                                    <div className="flex flex-wrap gap-1.5" id={`symptoms-list-${vId}`}>
                                                        {visit.symptoms && visit.symptoms.length > 0 ? (
                                                            visit.symptoms.map((s, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 pointer-events-none">
                                                                    {s}
                                                                </Badge>
                                                            ))
                                                        ) : <span className="text-sm text-slate-400 font-bold italic">None reported</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 animate-in fade-in slide-in-from-top-3 duration-300">
                                                <div className="col-span-1">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                                                    <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 rounded-lg shadow-sm pointer-events-none ${statusStyle(visit.status)}`}>
                                                        {visit.status || 'Waiting'}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-1">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Visit Type</p>
                                                    <p className="text-sm font-bold text-slate-700">{visit.type || 'Walk-in'}</p>
                                                </div>
                                                <div className="col-span-1">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Queue Number</p>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {String(visit.queueNo || 0).padStart(3, '0')}
                                                    </Badge>
                                                </div>
                                                <div className="col-span-1">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Registered At</p>
                                                    <p className="text-[13px] font-medium text-gray-700">{formatDate(visit.registeredAt)}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Services Availed</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {visit.services && visit.services.length > 0 ? (
                                                            visit.services.map((s, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200 pointer-events-none">
                                                                    {getServiceLabel(s)}
                                                                </Badge>
                                                            ))
                                                        ) : <span className="text-sm text-slate-400 italic">None</span>}
                                                    </div>
                                                </div>
                                                {visit.completedAt && (
                                                    <div className="col-span-2 border-t border-slate-50 pt-3">
                                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Completed At</p>
                                                        <p className="text-[13px] font-medium text-gray-700">{formatDate(visit.completedAt)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DoctorDashboard;