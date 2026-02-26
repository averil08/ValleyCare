import React, { useState, useContext, useRef, useEffect } from 'react';
import { doctors } from './doctorData';
import {
    Users, Search, Calendar, Clock, User, ChevronRight, ChevronDown,
    MoreHorizontal, History, CheckCircle2, Filter, LogOut, Settings,
    Bell, CalendarDays, Menu, X, Phone, Stethoscope,
    ArrowLeft, DoorOpen
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PatientContext } from "./PatientContext";
import { supabase } from "./lib/supabaseClient";
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const storedDoctorId = localStorage.getItem('selectedDoctorId');
    const doctorId = storedDoctorId ? Number(storedDoctorId) : null;
    const currentDoctor = doctors.find(d => d.id === doctorId) || { name: "Dr. Ricardo Jose", id: null };

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [expandedVisitId, setExpandedVisitId] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');
    // ── Separate date filter state per tab ───────────────────────────────
    const [queueDateFilter, setQueueDateFilter] = useState('today');       // Queue tab: today | thisWeek | lastWeek | custom
    const [apptDateFilter, setApptDateFilter] = useState('All Dates');   // Schedule tab: Monday | … | All Dates | Custom Range
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [queueCustomRange, setQueueCustomRange] = useState({ start: '', end: '' });
    const [apptCustomRange, setApptCustomRange] = useState({ start: '', end: '' });
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [queueStatusFilter, setQueueStatusFilter] = useState('active'); // 'active' | 'done' | 'cancelled'
    const [scheduledStatusFilter, setScheduledStatusFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'rejected'
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const { patients } = useContext(PatientContext);
    const dropdownRef = useRef(null);
    const desktopDropdownRef = useRef(null);
    const workspaceRef = useRef(null);

    // Option lists
    const queueDateFilters = ['today', 'thisWeek', 'lastWeek', 'custom'];
    const queueDateLabels = { today: 'Today', thisWeek: 'This Week', lastWeek: 'Last Week', custom: 'Custom Range' };
    const apptDateFilters = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'All Dates', 'Custom Range'];

    useEffect(() => {
        const handleClickOutside = (e) => {
            const inMobile = dropdownRef.current?.contains(e.target);
            const inDesktop = desktopDropdownRef.current?.contains(e.target);
            if (!inMobile && !inDesktop) setIsFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedPatient && workspaceRef.current) workspaceRef.current.scrollTo(0, 0);
    }, [selectedPatient]);

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

    // ── Date-in-filter helpers ────────────────────────────────────────────

    // Queue tab: mirrors Dashboard.jsx (today / thisWeek / lastWeek / custom)
    const isQueueDateInFilter = (dateStr) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        if (queueDateFilter === 'today') {
            const s = new Date(now); s.setHours(0, 0, 0, 0);
            const e = new Date(now); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }
        if (queueDateFilter === 'thisWeek') {
            const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
            const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }
        if (queueDateFilter === 'lastWeek') {
            const s = new Date(now); s.setDate(now.getDate() - now.getDay() - 7); s.setHours(0, 0, 0, 0);
            const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }
        if (queueDateFilter === 'custom') {
            if (!queueCustomRange.start || !queueCustomRange.end) return true;
            const s = new Date(queueCustomRange.start); s.setHours(0, 0, 0, 0);
            const e = new Date(queueCustomRange.end); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }
        return true;
    };

    // Schedule tab: mirrors Appointment.jsx (day-of-week / All Dates / Custom Range)
    const isApptDateInFilter = (dateStr) => {
        if (!dateStr || apptDateFilter === 'All Dates') return true;
        const date = new Date(dateStr);
        if (apptDateFilter === 'Custom Range') {
            if (!apptCustomRange.start || !apptCustomRange.end) return true;
            const s = new Date(apptCustomRange.start); s.setHours(0, 0, 0, 0);
            const e = new Date(apptCustomRange.end); e.setHours(23, 59, 59, 999);
            return date >= s && date <= e;
        }
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()] === apptDateFilter;
    };

    const formatArray = (arr) => (!arr || arr.length === 0) ? 'None' : arr.join(', ');

    const myPatients = (patients || []).filter(p => !p.isInactive && p.assignedDoctor?.id === doctorId);

    // ── Queue patients — mirrors Dashboard.jsx rules ──────────────────────

    const activeQueuePatients = myPatients.filter(p => {
        if (queueDateFilter !== 'today') return false; // ── EXPLICIT MIRROR OF Dashboard.jsx line 633
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
        p.status !== 'cancelled' &&
        p.appointmentDateTime &&
        isApptDateInFilter(p.appointmentDateTime)
    );

    // Status-filtered appointment patients
    const appointmentPatients = allAppointmentPatients.filter(p => {
        if (scheduledStatusFilter === 'all') return true;
        if (scheduledStatusFilter === 'pending') return !p.appointmentStatus || p.appointmentStatus === 'pending';
        if (scheduledStatusFilter === 'accepted') return p.appointmentStatus === 'accepted';
        if (scheduledStatusFilter === 'rejected') return p.appointmentStatus === 'rejected';
        return true;
    });

    // Appointment badge counts
    const apptAllCount = allAppointmentPatients.length;
    const apptPendingCount = allAppointmentPatients.filter(p => !p.appointmentStatus || p.appointmentStatus === 'pending').length;
    const apptAcceptedCount = allAppointmentPatients.filter(p => p.appointmentStatus === 'accepted').length;
    const apptRejectedCount = allAppointmentPatients.filter(p => p.appointmentStatus === 'rejected').length;

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

    const queueDateLabel = {
        today: 'Today', thisWeek: 'This Week', lastWeek: 'Last Week', custom: 'Custom'
    }[queueDateFilter] || 'Today';
    const dateLabel = queueDateLabel;
    const stats = [
        { label: dateLabel, value: totalTodayCount.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Queue", value: activeCount.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Done", value: completedTodayCount.toString(), icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
    ];

    const handlePatientClick = (patient) => {
        setSelectedPatient(patient);
        setExpandedVisitId(null);
        setMobileView('detail');
        setSidebarOpen(false);
    };

    const handleBackToList = () => {
        setMobileView('list');
        setSelectedPatient(null);
    };

    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    /* ─── Patient Card (shared) ─── */
    const PatientCard = ({ patient }) => (
        <div
            key={patient.id || patient.queueNo}
            className={`group cursor-pointer relative p-3.5 sm:p-5 rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${selectedPatient?.queueNo === patient.queueNo ? 'bg-emerald-600 border-emerald-600 shadow-emerald-200' : 'bg-white border-slate-100 hover:border-emerald-200'}`}
            onClick={() => handlePatientClick(patient)}
        >
            <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-xl flex flex-col items-center justify-center font-black relative transition-all shrink-0 ${selectedPatient?.queueNo === patient.queueNo ? 'bg-white/20 text-white' : (patient.isPriority ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700')}`}>
                    <span className="text-[8px] opacity-60 leading-none">Q</span>
                    <span className="text-base sm:text-lg leading-none">{patient.queueNo}</span>
                    {patient.status === 'in progress' && (
                        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 ${selectedPatient?.queueNo === patient.queueNo ? 'bg-white border-emerald-600 animate-ping' : 'bg-emerald-500 border-white animate-pulse'}`} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-black tracking-tight truncate text-sm sm:text-base ${selectedPatient?.queueNo === patient.queueNo ? 'text-white' : 'text-slate-800'}`}>
                        {patient.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={`text-[9px] h-4 font-black uppercase tracking-tighter border-none px-1.5 ${selectedPatient?.queueNo === patient.queueNo ? 'bg-white/10 text-emerald-50' : (patient.isPriority ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}`}>
                            {formatArray(patient.services?.slice(0, 1) || [patient.type || 'Regular'])}
                        </Badge>
                        <span className={`text-[9px] flex items-center gap-1 ${selectedPatient?.queueNo === patient.queueNo ? 'text-emerald-100' : 'text-slate-400'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(patient.registeredAt || patient.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${selectedPatient?.queueNo === patient.queueNo ? 'text-white' : 'text-slate-200 group-hover:text-emerald-400'}`} />
            </div>
        </div>
    );

    /* ─── Status color helpers ─── */
    const statusStyle = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'in progress': return 'bg-amber-100 text-amber-700';
            case 'cancelled': return 'bg-rose-100 text-rose-600';
            case 'done': return 'bg-blue-100 text-blue-700';
            default: return 'bg-emerald-100 text-emerald-700';
        }
    };

    /* ─── Patient Detail Panel (shared) ─── */
    const PatientDetail = ({ patient }) => {
        // Find all visits for this patient using their email
        const targetEmail = (patient.patientEmail || '').toLowerCase().trim();
        let patientVisits = targetEmail ? (patients || [])
            .filter(p => p.patientEmail && p.patientEmail.toLowerCase().trim() === targetEmail)
            .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)) : [];

        // Fallback: If no history exists (or patient has no email), display the current appointment as a visit log
        if (patientVisits.length === 0) {
            patientVisits = [patient];
        }

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        };

        const getServiceLabel = (service) => {
            if (!service) return 'Regular';
            if (service.includes('PEME') || service.includes('Pre-Employment')) return 'PEME';
            if (service.includes('APE') || service.includes('Annual Physical')) return 'APE';
            if (service.includes('Consultation')) return 'Consultation';
            return service;
        };

        return (
            <div ref={workspaceRef} className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40">
                <div className="p-3 sm:p-5 lg:p-8 max-w-3xl mx-auto w-full">

                    {/* ── Unified Patient Card ── */}
                    <Card className="border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden rounded-3xl mb-4">
                        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                        <CardContent className="p-5 sm:p-8">
                            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start">
                                {/* Left: Q-Number Circle */}
                                <div className="hidden sm:flex flex-col items-center justify-center w-24 h-24 rounded-3xl bg-emerald-50 text-emerald-700 shrink-0 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-transparent opacity-50" />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600/60 relative z-10 mb-0.5">Queue</span>
                                    <span className="text-4xl font-black relative z-10 leading-none">{patient.queueNo}</span>
                                </div>
                                {/* Right: Patient Details */}
                                <div className="flex-1 min-w-0 space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight truncate">{patient.name}</h2>
                                            <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider border-none px-2.5 py-1 hidden sm:inline-flex ${statusStyle(patient.status)}`}>
                                                {patient.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm font-black text-slate-500">
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-500" />
                                                {new Date(patient.registeredAt || patient.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 hidden sm:block" />
                                            <span className="hidden sm:inline-block truncate">ID: {patient.id}</span>
                                            {patient.isPriority && <Badge variant="secondary" className="bg-amber-100/50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-md" >Priority</Badge>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Doctor</p>
                                            <p className="text-sm font-black text-slate-800 truncate">{patient.assignedDoctor?.name || 'Unassigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Services</p>
                                            <p className="text-sm font-black text-slate-800 truncate">{formatArray(patient.services || ['General Consultation'])}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Clinical Visit Logs ── */}
                    <Card className="border-none shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="border-b border-slate-50 p-4 sm:p-6 pb-3">
                            <CardTitle className="text-sm sm:text-base font-black flex items-center justify-between text-slate-800 tracking-tight">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-50 rounded-xl">
                                        <History className="w-3.5 h-3.5 text-emerald-600" />
                                    </div>
                                    Clinical Visit Logs
                                </div>
                                <Badge variant="outline" className="border-slate-200 font-black text-[9px] uppercase tracking-wider py-1 px-3 rounded-lg">
                                    {patientVisits.length} Encounters
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 pl-4 sm:pl-6 whitespace-nowrap">Visit #</TableHead>
                                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 whitespace-nowrap">Doctor Assigned</TableHead>
                                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 whitespace-nowrap">Symptoms</TableHead>
                                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 text-right pr-4 sm:pr-6 whitespace-nowrap">Action</TableHead>
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
                                                        <TableCell className="py-3.5 pl-4 sm:pl-6 text-xs font-black text-slate-500 whitespace-nowrap">
                                                            #{visitNum}
                                                        </TableCell>
                                                        <TableCell className="py-3.5 text-xs font-black text-slate-800 whitespace-nowrap">
                                                            {visit.assignedDoctor?.name || 'Unassigned'}
                                                        </TableCell>
                                                        <TableCell className="py-3.5">
                                                            <div className="flex flex-wrap gap-1">
                                                                {visit.symptoms && visit.symptoms.length > 0 ? (
                                                                    <>
                                                                        {visit.symptoms.slice(0, 2).map((s, i) => (
                                                                            <Badge key={i} variant="outline" className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border-none rounded-md px-1.5 py-0">
                                                                                {s}
                                                                            </Badge>
                                                                        ))}
                                                                        {visit.symptoms.length > 2 && (
                                                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border-none rounded-md px-1.5 py-0">
                                                                                +{visit.symptoms.length - 2}
                                                                            </Badge>
                                                                        )}
                                                                    </>
                                                                ) : <span className="text-[10px] text-slate-400 font-bold italic">None reported</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3.5 text-right pr-4 sm:pr-6">
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => setExpandedVisitId(isExpanded ? null : vId)}
                                                                className="text-emerald-700 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-50 rounded-lg px-3 h-8"
                                                            >
                                                                {isExpanded ? 'Hide' : 'View More'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                                            <TableCell colSpan={4} className="p-0 border-b border-slate-100">
                                                                <div className="p-4 sm:p-6 pb-5 grid grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4 border-l-2 border-emerald-400 ml-4 my-2 rounded-r-xl bg-white shadow-sm mr-4">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                                                        <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider border-none px-2 py-0.5 rounded-md ${statusStyle(visit.status)}`}>
                                                                            {visit.status || 'Waiting'}
                                                                        </Badge>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Visit Type</p>
                                                                        <p className="text-xs font-black text-slate-700">{visit.type || 'Walk-in'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Number</p>
                                                                        <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 rounded-md inline-block">Q-{visit.queueNo || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Services Availed</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {visit.services && visit.services.length > 0 ? (
                                                                                visit.services.map((s, i) => (
                                                                                    <Badge key={i} variant="outline" className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border-none rounded-md px-1.5 py-0">
                                                                                        {getServiceLabel(s)}
                                                                                    </Badge>
                                                                                ))
                                                                            ) : <span className="text-[10px] text-slate-400 font-bold italic">N/A</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered At</p>
                                                                        <p className="text-xs font-black text-slate-700">{formatDate(visit.registeredAt)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed At</p>
                                                                        <p className="text-xs font-black text-slate-700">{formatDate(visit.completedAt)}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {patientVisits.length === 0 && (
                                            <TableRow className="hover:bg-transparent">
                                                <TableCell colSpan={4} className="py-8 text-center text-slate-400 text-xs font-bold italic">
                                                    No visit history recorded
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        );
    };

    /* ─── Queue Status Filter Pills ─── */
    const statusFilterOptions = [
        { key: 'active', label: 'Active', count: activeCount, pill: 'bg-emerald-600 text-white shadow-emerald-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700' },
        { key: 'done', label: 'Done', count: doneCount, pill: 'bg-blue-600 text-white shadow-blue-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700' },
        { key: 'cancelled', label: 'Cancelled', count: cancelledCount, pill: 'bg-rose-500 text-white shadow-rose-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600' },
    ];

    const QueueStatusFilter = () => (
        <div className="flex gap-1.5 px-3 pb-2 pt-1">
            {statusFilterOptions.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => setQueueStatusFilter(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex-1 justify-center ${queueStatusFilter === opt.key ? opt.pill + ' shadow-md' : opt.inactive}`}
                >
                    {opt.label}
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${queueStatusFilter === opt.key ? 'bg-white/20' : 'bg-white/80 text-slate-500'}`}>
                        {opt.count}
                    </span>
                </button>
            ))}
        </div>
    );

    /* ─── Scheduled (Appointment) Status Filter Pills ─── */
    const scheduledFilterOptions = [
        { key: 'all', label: 'All', count: apptAllCount, pill: 'bg-slate-700 text-white shadow-slate-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700' },
        { key: 'pending', label: 'Pending', count: apptPendingCount, pill: 'bg-amber-500 text-white shadow-amber-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700' },
        { key: 'accepted', label: 'Accepted', count: apptAcceptedCount, pill: 'bg-emerald-600 text-white shadow-emerald-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700' },
        { key: 'rejected', label: 'Not Accepted', count: apptRejectedCount, pill: 'bg-rose-500 text-white shadow-rose-200', inactive: 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600' },
    ];

    const ScheduledStatusFilter = () => (
        <div className="flex gap-1.5 px-3 pb-2 pt-1 flex-wrap">
            {scheduledFilterOptions.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => setScheduledStatusFilter(opt.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm justify-center ${scheduledStatusFilter === opt.key ? opt.pill + ' shadow-md' : opt.inactive}`}
                >
                    {opt.label}
                    <span className={`text-[9px] font-black px-1 py-0.5 rounded-full leading-none ${scheduledStatusFilter === opt.key ? 'bg-white/20' : 'bg-white/80 text-slate-500'}`}>
                        {opt.count}
                    </span>
                </button>
            ))}
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
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'queue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Queue
                        </button>
                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'appointments' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {activeTab === 'queue'
                        ? statusFilterOptions.find(o => o.key === queueStatusFilter)?.label + ' Patients'
                        : scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label + ' Appointments'}
                </span>
                <span className="text-[9px] font-black bg-white text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">
                    {doctorPatients.length} shown
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-2">
                {doctorPatients.length > 0 ? (
                    doctorPatients.map(p => <PatientCard key={p.id || p.queueNo} patient={p} />)
                ) : (
                    <div className="text-center py-10 px-4 bg-white border border-dashed border-slate-200 rounded-2xl mx-1">
                        <Users className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                        <h4 className="text-slate-800 font-black text-xs mb-1 uppercase tracking-widest">{activeTab === 'queue' ? 'No Patients' : 'No Appointments'}</h4>
                        <p className="text-[11px] font-bold text-slate-400">{searchQuery ? 'Adjust your search' : activeTab === 'queue' ? `No ${queueStatusFilter} patients` : `No ${scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label?.toLowerCase()} appointments`}</p>
                    </div>
                )}
            </div>

        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">

            {/* ─── MOBILE LAYOUT ─── */}
            <div className="flex flex-col h-full md:hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-slate-100 shrink-0 z-30 shadow-sm">
                    {mobileView === 'detail' ? (
                        /* Detail view — slim back bar */
                        <div className="flex items-center justify-between px-4 h-12">
                            <button onClick={handleBackToList} className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-widest">
                                <ArrowLeft className="w-4 h-4" /> Queue
                            </button>
                            {selectedPatient && (
                                <span className="text-xs font-black text-slate-600 truncate max-w-[180px]">{selectedPatient.name}</span>
                            )}
                            <Button variant="ghost" size="icon" className="text-slate-400 h-8 w-8">
                                <Bell className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        /* List view — full doctor card header */
                        <div className="px-4 pt-4 pb-3">
                            <div className="flex items-center justify-between mb-3">
                                {/* Doctor identity */}
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
                                        {getInitials(currentDoctor.name)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 leading-tight">{currentDoctor.name}</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">{currentDoctor.specialization || "Physician"}</p>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={handleLogoutClick} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-xl">
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-slate-400 h-8 w-8">
                                        <Bell className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            {/* Stats row */}
                            <div className="flex items-center gap-2">
                                {stats.map((s, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1 justify-center ${s.bg}`}>
                                        <s.icon className={`w-3 h-3 ${s.color}`} />
                                        <span className={`text-xs font-black ${s.color}`}>{s.value}</span>
                                        <span className={`text-[9px] font-black ${s.color} opacity-60 uppercase tracking-wider hidden xs:inline`}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </header>

                {/* ── Context-sensitive Date Filter strip (mobile) ── */}
                {mobileView === 'list' && (
                    <div className="bg-white border-b border-slate-100 px-3 py-2">
                        <div ref={dropdownRef} className="relative">
                            <Button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-xl border-slate-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 bg-slate-50 hover:bg-white w-full justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-slate-700">
                                        {activeTab === 'queue'
                                            ? queueDateLabels[queueDateFilter]
                                            : apptDateFilter}
                                    </span>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            {isFilterOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 shadow-2xl rounded-2xl py-2 z-50">
                                    {activeTab === 'queue'
                                        ? queueDateFilters.map(f => (
                                            <button key={f} onClick={() => { setQueueDateFilter(f); setIsFilterOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${queueDateFilter === f ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                {queueDateLabels[f]}{queueDateFilter === f && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </button>
                                        ))
                                        : apptDateFilters.map(f => (
                                            <button key={f} onClick={() => { setApptDateFilter(f); setIsFilterOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${apptDateFilter === f ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                {f}{apptDateFilter === f && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </button>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                        {/* Queue custom range */}
                        {activeTab === 'queue' && queueDateFilter === 'custom' && (
                            <div className="flex gap-2 mt-2">
                                <Input type="date" className="h-8 rounded-xl text-xs flex-1 border-slate-100" value={queueCustomRange.start} onChange={e => setQueueCustomRange({ ...queueCustomRange, start: e.target.value })} />
                                <Input type="date" className="h-8 rounded-xl text-xs flex-1 border-slate-100" value={queueCustomRange.end} onChange={e => setQueueCustomRange({ ...queueCustomRange, end: e.target.value })} />
                                <Button variant="ghost" size="sm" className="text-rose-500 text-[10px] font-black h-8 px-2" onClick={() => { setQueueCustomRange({ start: '', end: '' }); setQueueDateFilter('today'); }}>Reset</Button>
                            </div>
                        )}
                        {/* Appointments custom range */}
                        {activeTab === 'appointments' && apptDateFilter === 'Custom Range' && (
                            <div className="flex gap-2 mt-2">
                                <Input type="date" className="h-8 rounded-xl text-xs flex-1 border-slate-100" value={apptCustomRange.start} onChange={e => setApptCustomRange({ ...apptCustomRange, start: e.target.value })} />
                                <Input type="date" className="h-8 rounded-xl text-xs flex-1 border-slate-100" value={apptCustomRange.end} onChange={e => setApptCustomRange({ ...apptCustomRange, end: e.target.value })} />
                                <Button variant="ghost" size="sm" className="text-rose-500 text-[10px] font-black h-8 px-2" onClick={() => { setApptCustomRange({ start: '', end: '' }); setApptDateFilter('All Dates'); }}>Reset</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile Content */}
                <div className="flex-1 overflow-hidden">
                    {mobileView === 'list' ? (
                        <PatientList />
                    ) : selectedPatient ? (
                        <PatientDetail patient={selectedPatient} />
                    ) : null}
                </div>
            </div>

            {/* ─── DESKTOP LAYOUT ─── */}
            <div className="hidden md:flex flex-row h-full">

                {/* Left Panel */}
                <aside className="w-72 lg:w-80 xl:w-[360px] flex flex-col bg-white border-r border-slate-200 shadow-sm shrink-0">
                    {/* Doctor Card at Top */}
                    <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                        {/* Doctor Identity & Actions - Matching Mobile Layout Design */}
                        <div className="flex items-center justify-between mb-4">
                            {/* Identity */}
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
                                    {getInitials(currentDoctor.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-800 leading-tight truncate">{currentDoctor.name}</p>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">{currentDoctor.specialization || "Physician"}</p>
                                </div>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-xl shrink-0"
                                    title="Log Out"
                                >
                                    <LogOut className="w-4 h-4 ml-0.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8 rounded-xl shrink-0"
                                    title="Notifications"
                                >
                                    <Bell className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8 rounded-xl shrink-0"
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
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
                        <div className="flex gap-1 mt-3 p-0.5 bg-slate-100 rounded-xl">
                            <button onClick={() => setActiveTab('queue')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'queue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Queue</button>
                            <button onClick={() => setActiveTab('appointments')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'appointments' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Schedule</button>
                        </div>
                        {/* Status filter pills — Queue tab only */}
                        {activeTab === 'queue' && (
                            <div className="flex gap-1.5 mt-3">
                                {statusFilterOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setQueueStatusFilter(opt.key)}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex-1 justify-center ${queueStatusFilter === opt.key ? opt.pill + ' shadow-md' : opt.inactive}`}
                                    >
                                        {opt.label}
                                        <span className={`text-[9px] font-black px-1 py-0.5 rounded-full leading-none ${queueStatusFilter === opt.key ? 'bg-white/20' : 'bg-white/80 text-slate-500'}`}>
                                            {opt.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Appointment status filter pills — Schedule tab only */}
                        {activeTab === 'appointments' && (
                            <div className="flex gap-1.5 mt-3 flex-wrap">
                                {scheduledFilterOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setScheduledStatusFilter(opt.key)}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm justify-center ${scheduledStatusFilter === opt.key ? opt.pill + ' shadow-md' : opt.inactive}`}
                                    >
                                        {opt.label}
                                        <span className={`text-[9px] font-black px-1 py-0.5 rounded-full leading-none ${scheduledStatusFilter === opt.key ? 'bg-white/20' : 'bg-white/80 text-slate-500'}`}>
                                            {opt.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Count */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50/60">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {activeTab === 'queue'
                                ? statusFilterOptions.find(o => o.key === queueStatusFilter)?.label + ' Patients'
                                : scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label + ' Appointments'}
                        </span>
                        <span className="text-[9px] font-black bg-white text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">{doctorPatients.length} shown</span>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {doctorPatients.length > 0 ? (
                            doctorPatients.map(p => <PatientCard key={p.id || p.queueNo} patient={p} />)
                        ) : (
                            <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl">
                                <Users className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                                <h4 className="text-slate-800 font-black text-xs mb-1 uppercase tracking-widest">{activeTab === 'queue' ? 'No Patients' : 'No Appointments'}</h4>
                                <p className="text-[11px] font-bold text-slate-400">{searchQuery ? 'Adjust search' : activeTab === 'queue' ? `No ${queueStatusFilter} patients` : `No ${scheduledFilterOptions.find(o => o.key === scheduledStatusFilter)?.label?.toLowerCase()} appointments`}</p>
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
                                            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black leading-none">{stat.label}</p>
                                            <p className="text-xl lg:text-2xl font-black text-slate-800 leading-none mt-0.5">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Context-sensitive date filter dropdown (desktop) ── */}
                            <div className="relative shrink-0" ref={dropdownRef}>
                                <Button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    variant="outline"
                                    className="h-10 px-4 rounded-2xl border-slate-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2.5 bg-slate-50 hover:bg-white hover:shadow-lg transition-all shadow-sm"
                                >
                                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                                    <span className="text-slate-700 min-w-[90px] text-left">
                                        {activeTab === 'queue'
                                            ? (queueDateFilter === 'custom' && queueCustomRange.start
                                                ? `${queueCustomRange.start} – ${queueCustomRange.end}`
                                                : queueDateLabels[queueDateFilter])
                                            : (apptDateFilter === 'Custom Range' && apptCustomRange.start
                                                ? `${apptCustomRange.start} – ${apptCustomRange.end}`
                                                : apptDateFilter)
                                        }
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                </Button>
                                {isFilterOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-2xl py-2 z-50">
                                        {activeTab === 'queue'
                                            ? queueDateFilters.map(f => (
                                                <button key={f} onClick={() => { setQueueDateFilter(f); setIsFilterOpen(false); }}
                                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-between ${queueDateFilter === f ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'}`}>
                                                    {queueDateLabels[f]}{queueDateFilter === f && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                            ))
                                            : apptDateFilters.map(f => (
                                                <button key={f} onClick={() => { setApptDateFilter(f); setIsFilterOpen(false); }}
                                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-between ${apptDateFilter === f ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'}`}>
                                                    {f}{apptDateFilter === f && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Queue custom range inputs (desktop) */}
                        {activeTab === 'queue' && queueDateFilter === 'custom' && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                                    <Input type="date" className="h-8 w-36 bg-white border-slate-100 rounded-lg text-xs font-black" value={queueCustomRange.start} onChange={e => setQueueCustomRange({ ...queueCustomRange, start: e.target.value })} />
                                    <span className="w-3 h-px bg-slate-300" />
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End</label>
                                    <Input type="date" className="h-8 w-36 bg-white border-slate-100 rounded-lg text-xs font-black" value={queueCustomRange.end} onChange={e => setQueueCustomRange({ ...queueCustomRange, end: e.target.value })} />
                                </div>
                                <Button variant="ghost" size="sm" className="text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl h-8 px-4"
                                    onClick={() => { setQueueCustomRange({ start: '', end: '' }); setQueueDateFilter('today'); }}>Reset</Button>
                            </div>
                        )}
                        {/* Appointments custom range inputs (desktop) */}
                        {activeTab === 'appointments' && apptDateFilter === 'Custom Range' && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                                    <Input type="date" className="h-8 w-36 bg-white border-slate-100 rounded-lg text-xs font-black" value={apptCustomRange.start} onChange={e => setApptCustomRange({ ...apptCustomRange, start: e.target.value })} />
                                    <span className="w-3 h-px bg-slate-300" />
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End</label>
                                    <Input type="date" className="h-8 w-36 bg-white border-slate-100 rounded-lg text-xs font-black" value={apptCustomRange.end} onChange={e => setApptCustomRange({ ...apptCustomRange, end: e.target.value })} />
                                </div>
                                <Button variant="ghost" size="sm" className="text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl h-8 px-4"
                                    onClick={() => { setApptCustomRange({ start: '', end: '' }); setApptDateFilter('All Dates'); }}>Reset</Button>
                            </div>
                        )}
                    </header>

                    {/* Workspace */}
                    {selectedPatient ? (
                        <PatientDetail patient={selectedPatient} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
                            <div className="space-y-6 max-w-lg">
                                <div className="w-16 h-16 bg-emerald-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-emerald-200 rotate-12 mx-auto">
                                    <Stethoscope className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight leading-tight">
                                        Welcome, <span className="text-emerald-600">{currentDoctor.name.split(' ').slice(0, 2).join(' ')}</span>
                                    </h3>
                                    <p className="text-slate-400 mt-3 text-base font-bold max-w-sm mx-auto">
                                        You have <span className="text-emerald-600 font-black">{queuePatients.length} patients</span> in queue. Select a patient to begin.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
                    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-center mb-4">
                            <DoorOpen className="w-12 h-12 text-rose-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">
                            Confirm Logout
                        </h3>
                        <p className="text-slate-500 mb-6 text-center font-bold text-sm">
                            Are you sure you want to log out? You'll need to sign in again to access the dashboard.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelLogout}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-black text-sm uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmLogout}
                                className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-black text-sm uppercase tracking-widest shadow-lg shadow-rose-200"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DoctorDashboard;