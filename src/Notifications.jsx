import React, { useState, useContext, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import { Bell, Calendar, Clock, User, XCircle, Search, Eye, Stethoscope, ClipboardList, Info, Filter, ArrowRight, ChevronRight, X } from 'lucide-react';
import { PatientContext } from "./PatientContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

const Notifications = () => {
    const [nav, setNav] = useState(false);
    const handleNav = () => setNav(!nav);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Date Filtering State
    const [dateFilter, setDateFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const { patients, markSecretaryNotificationsAsRead } = useContext(PatientContext);

    // Clear notifications on mount
    React.useEffect(() => {
        markSecretaryNotificationsAsRead();
    }, []);

    // Helper to check if date is within range
    const isWithinDateRange = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfToday.getDate() + 1);

        if (dateFilter === 'all') return true;

        if (dateFilter === 'today') {
            return date >= startOfToday && date < startOfTomorrow;
        }

        if (dateFilter === 'thisWeek') {
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            return date >= startOfWeek && date < endOfWeek;
        }

        if (dateFilter === 'lastWeek') {
            const startOfLastWeek = new Date(startOfToday);
            startOfLastWeek.setDate(startOfToday.getDate() - startOfToday.getDay() - 7);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
            return date >= startOfLastWeek && date < endOfLastWeek;
        }

        if (dateFilter === 'custom') {
            if (!customStartDate || !customEndDate) return true;
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        }

        return true;
    };

    // Filter for patients who have cancelled their appointment requests
    const cancelledAppointments = useMemo(() => {
        return (patients || [])
            .filter(p =>
                p.type === "Appointment" &&
                p.status === "cancelled" &&
                p.appointmentStatus === "cancelled"
            )
            .filter(p => isWithinDateRange(p.queueExitTime || p.registeredAt))
            .sort((a, b) => new Date(b.queueExitTime || b.registeredAt) - new Date(a.queueExitTime || a.registeredAt));
    }, [patients, dateFilter, customStartDate, customEndDate]);

    const filteredNotifications = useMemo(() => {
        if (!searchTerm.trim()) return cancelledAppointments;
        return cancelledAppointments.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [cancelledAppointments, searchTerm]);

    const handleViewDetails = (notification) => {
        setSelectedNotification(notification);
        setIsDetailsModalOpen(true);
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 172800) return 'Yesterday';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const dateFilterLabels = {
        all: "All Time",
        today: "Today",
        thisWeek: "This Week",
        lastWeek: "Last Week",
        custom: "Custom Range"
    };

    return (
        <div className="flex w-full min-h-screen">
            <Sidebar nav={nav} handleNav={handleNav} />

            <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300 w-full overflow-x-hidden">
                {/* Header Section */}
                <div className="bg-white border-b border-gray-200 pt-12 lg:pt-3">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-2xl">
                                    <Bell className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Notification Feed</h1>
                                    <p className="text-sm font-medium text-gray-500">Managing cancelled appointment requests</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                                    {Object.entries(dateFilterLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => setDateFilter(key)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${dateFilter === key
                                                ? "bg-white text-green-600 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search patient..."
                                        className="pl-10 h-10 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 shadow-none rounded-xl transition-all font-medium"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {dateFilter === 'custom' && (
                            <div className="mt-8 flex flex-wrap items-center gap-4 p-5 bg-gray-50 rounded-[24px] border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Starting From</span>
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="h-11 bg-white border-gray-200 rounded-xl w-48 font-bold text-gray-700"
                                    />
                                </div>
                                <div className="mt-6 text-gray-300">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Until</span>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="h-11 bg-white border-gray-200 rounded-xl w-48 font-bold text-gray-700"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notification List Section */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            Recent Alerts
                            <Badge variant="secondary" className="bg-gray-200 text-gray-700 font-bold rounded-full px-2">
                                {filteredNotifications.length}
                            </Badge>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((p) => (
                                <Card
                                    key={p.id}
                                    className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group border border-transparent hover:border-gray-200"
                                >
                                    <CardContent className="p-0">
                                        <div className="flex items-stretch">
                                            <div className="w-1.5 bg-green-600 self-stretch"></div>
                                            <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="flex items-start gap-4 sm:gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                        <User className="w-7 h-7 text-green-600" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                                                            <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-none font-bold text-[10px] sm:text-xs">
                                                                Cancelled
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                                                            Appointment for <span className="font-bold text-gray-900">{formatDateTime(p.appointmentDateTime)}</span> was cancelled.
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {getTimeAgo(p.queueExitTime || p.registeredAt)}
                                                            </div>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {formatDateTime(p.queueExitTime || p.registeredAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleViewDetails(p)}
                                                    variant="secondary"
                                                    className="w-full sm:w-auto bg-gray-50 hover:bg-gray-200 text-gray-900 border-none px-6 h-11 rounded-xl font-bold group"
                                                >
                                                    View Details
                                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="bg-white rounded-[32px] py-20 px-6 text-center shadow-inner border-2 border-dashed border-gray-100">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Bell className="w-10 h-10 text-gray-200" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Nothing to show!</h3>
                                <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your filters or search criteria to see more activity.</p>
                                <Button
                                    variant="link"
                                    className="mt-4 text-green-600 font-bold"
                                    onClick={() => {
                                        setDateFilter('all');
                                        setSearchTerm('');
                                    }}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancellation Details Dialog */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-md rounded-[24px] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white text-center">
                        <DialogHeader>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                <Info className="w-8 h-8 text-white" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-white text-center">Cancellation Info</DialogTitle>
                            <DialogDescription className="text-green-100 text-center">
                                Detailed cancellation report
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {selectedNotification && (
                        <div className="p-6 space-y-5 bg-white">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Scheduled</p>
                                    <p className="text-xs font-bold text-gray-900 leading-tight">{formatDateTime(selectedNotification.appointmentDateTime)}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cancelled On</p>
                                    <p className="text-xs font-bold text-gray-900 leading-tight">{formatDateTime(selectedNotification.queueExitTime || selectedNotification.registeredAt)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-green-100">
                                        <Stethoscope className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Requested Doctor</h4>
                                        <p className="text-sm font-bold text-gray-800">
                                            {selectedNotification.assignedDoctor?.name || 'Any Available Physician'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-green-100">
                                        <ClipboardList className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Services & Symptoms</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(selectedNotification.symptoms?.length > 0 || selectedNotification.services?.length > 0) ? (
                                                <>
                                                    {selectedNotification.symptoms?.map((s, idx) => (
                                                        <Badge key={`symp-${idx}`} variant="outline" className="text-[9px] font-bold border-green-100 bg-green-50 text-green-700 px-2 py-0">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                    {selectedNotification.services?.map((s, idx) => (
                                                        <Badge key={`serv-${idx}`} variant="outline" className="text-[9px] font-bold border-emerald-100 bg-emerald-50 text-emerald-700 px-2 py-0">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic font-medium">No services specified</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-red-100">
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Closure Reason</h4>
                                        <p className="text-sm font-medium text-gray-700 italic leading-relaxed">
                                            "{selectedNotification.cancellationReason || 'The patient withdrew their request without providing a specific reason.'}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="w-full bg-gray-900 hover:bg-black text-white h-12 rounded-2xl font-bold shadow-lg shadow-gray-200"
                                >
                                    Dismiss Report
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Notifications;
