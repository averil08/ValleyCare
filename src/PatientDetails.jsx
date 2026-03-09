import React, { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PatientContext } from './PatientContext';
import {
    ChevronLeft,
    User,
    History,
    Clock,
    Phone,
    Calendar,
    Stethoscope,
    CheckCircle2,
    Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PatientDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { patients } = useContext(PatientContext);

    // Get patient info from state
    const patientData = location.state?.patient;

    // Find the latest patient data from context
    const patient = (patients || []).find(p => p.queueNo === patientData?.queueNo) || patientData;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Patient Not Found</h3>
                <p className="text-slate-500 mb-8">The patient record you're looking for might have been moved or removed.</p>
                <Button onClick={() => navigate('/doctor-dashboard')} className="bg-emerald-600 rounded-xl h-12 px-8 font-bold">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    const formatArray = (arr) => {
        if (!arr || arr.length === 0) return 'None';
        return arr.join(', ');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
            {/* Smooth Gradient Header Background */}
            <div className="h-48 bg-gradient-to-br from-emerald-600 to-emerald-800 w-full absolute top-0 left-0 z-0" />

            {/* Header Content */}
            <header className="relative z-10 px-4 h-20 flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/doctor-dashboard')}
                    className="text-white hover:bg-white/10 gap-2 font-bold px-3"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Dashboard
                </Button>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg">
                    {patient.status || 'Waiting'}
                </Badge>
            </header>

            <div className="px-4 relative z-10 -mt-2">
                {/* Patient Profile Brief Case */}
                <Card className="border-none shadow-2xl shadow-emerald-900/10 bg-white overflow-hidden rounded-[32px] mb-6">
                    <CardHeader className="flex flex-col items-center p-8 pb-4 text-center">
                        <div className="w-24 h-24 rounded-[32px] bg-emerald-50 flex items-center justify-center text-3xl font-black text-emerald-600 border-4 border-white shadow-xl mb-4 transform -rotate-3">
                            {patient.name.charAt(0)}
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">{patient.name}</CardTitle>
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                                {patient.age || '32'}y • {patient.gender || 'Female'}
                            </Badge>
                            <Badge className={`${patient.isPriority ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} border-none font-bold`}>
                                {patient.type || 'Regular'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/80 rounded-2xl p-4 flex flex-col items-center text-center border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue No</span>
                                <span className="text-3xl font-black text-slate-800">#{patient.queueNo}</span>
                            </div>
                            <div className="bg-slate-50/80 rounded-2xl p-4 flex flex-col items-center text-center border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival</span>
                                <span className="text-xl font-black text-slate-800">
                                    {new Date(patient.registeredAt || patient.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>

                        {/* Additional Info Snippets */}
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                                    <p className="text-sm font-bold text-slate-700">{patient.phoneNum || 'Not Provided'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                                    <Stethoscope className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consulting For</p>
                                    <p className="text-sm font-bold text-slate-700">{formatArray(patient.services || ['General Consultation'])}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Medical History Section */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white mb-6">
                    <CardHeader className="border-b border-slate-50 p-6 pb-4">
                        <CardTitle className="text-lg font-black flex items-center gap-3 text-slate-800 tracking-tight">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <History className="w-4 h-4 text-emerald-600" />
                            </div>
                            Patient Visit History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 border-none">
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pl-6">Date</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pr-6">Findings</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(patient.history || [
                                        { date: "12 Oct 2025", condition: "Acute Tonsillitis", color: "text-blue-600" },
                                        { date: "05 Jan 2026", condition: "General Annual Checkup", color: "text-emerald-600" }
                                    ]).map((visit, idx) => (
                                        <TableRow key={idx} className="border-slate-50 hover:bg-slate-50 transition-colors">
                                            <TableCell className="py-5 pl-6 text-[13px] font-bold text-slate-700">{visit.date}</TableCell>
                                            <TableCell className="py-5 pr-6">
                                                <Badge variant="outline" className={`text-[9px] font-black border-slate-200 uppercase tracking-tighter ${visit.color || 'text-emerald-600 bg-emerald-50/30'}`}>{visit.condition}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Consultation Area Placeholder */}
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden bg-white border-2 border-dashed border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Activity className="w-8 h-8 text-slate-200" />
                        </div>
                        <h4 className="font-bold text-slate-400">Consultation Workspace</h4>
                        <p className="text-slate-300 text-xs mt-1">Actions for this encounter will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PatientDetails;
