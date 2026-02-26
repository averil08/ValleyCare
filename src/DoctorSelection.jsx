import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doctors } from "./doctorData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, ChevronRight, ArrowLeft } from "lucide-react";
import Logo from "./assets/partner-logo.jpg";

const DoctorSelection = () => {
    const navigate = useNavigate();
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedSpecialization, setSelectedSpecialization] = useState('all');

    // Specialization categories mapping (synced with Homepage.jsx)
    const specializationCategories = {
        'all': { label: 'All Doctors', doctorIds: [] },
        'pediatrics': { label: 'Pediatrics', doctorIds: [1, 2] },
        'internalMedicine': { label: 'Internal Medicine', doctorIds: [3] },
        'infectiousDisease': { label: 'Infectious Disease', doctorIds: [4] },
        'nephrology': { label: 'Nephrology', doctorIds: [5, 6, 7] },
        'obgyn': { label: 'OB-GYN', doctorIds: [8, 9, 10, 11] },
        'orthopedicsUrology': { label: 'Orthopedics & Urology', doctorIds: [12] },
        'generalSurgery': { label: 'General Surgery', doctorIds: [13, 14] },
        'ent': { label: 'ENT', doctorIds: [15] }
    };

    const filteredDoctors = selectedSpecialization === 'all'
        ? doctors
        : doctors.filter(doc => specializationCategories[selectedSpecialization].doctorIds.includes(doc.id));

    const handleDoctorClick = (doctor) => {
        setSelectedDoctor(doctor);
        setShowModal(true);
        setPassword("");
        setError("");
    };

    const handleVerify = (e) => {
        e.preventDefault();
        // Verification logic
        if (password === "doctor123") {
            // Store doctor ID in localStorage
            localStorage.setItem('selectedDoctorId', selectedDoctor.id);
            // Redirect to the doctor's own dashboard
            navigate("/doctor-dashboard");
        } else {
            setError("Incorrect password. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col items-center mb-10 relative">
                    <div className="w-full flex justify-start sm:block sm:absolute sm:left-0 sm:top-0 mb-6 sm:mb-0">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/")}
                            className="text-gray-600 hover:text-green-700 hover:bg-green-50 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </Button>
                    </div>
                    <img src={Logo} alt="Logo" className="w-[220px] mb-6" />
                    <h1 className="text-3xl font-bold text-green-800 text-center">Doctor Profile Selection</h1>
                    <p className="text-gray-600 mt-2 text-center">Please select your profile to continue to your dashboard</p>
                </div>

                {/* Specialization Filter */}
                <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        Filter by Specialization
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(specializationCategories).map(([key, value]) => (
                            <Button
                                key={key}
                                onClick={() => setSelectedSpecialization(key)}
                                variant={selectedSpecialization === key ? "default" : "outline"}
                                className={`h-9 px-4 text-xs font-medium transition-all ${selectedSpecialization === key
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                                    : 'text-gray-600 hover:text-green-700 hover:bg-green-50 border-gray-200'
                                    }`}
                            >
                                {value.label}
                            </Button>
                        ))}
                    </div>
                    <div className="mt-4 text-xs text-gray-500 font-medium">
                        Showing <span className="text-green-700 font-bold">{filteredDoctors.length}</span> doctor{filteredDoctors.length !== 1 ? 's' : ''}
                        {selectedSpecialization !== 'all' && (
                            <span> in <span className="text-green-700 font-bold">{specializationCategories[selectedSpecialization].label}</span></span>
                        )}
                    </div>
                </div>

                {/* Doctor Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {filteredDoctors.map((doctor) => (
                        <Card
                            key={doctor.id}
                            className="hover:shadow-2xl transition-all duration-300 border-t-4 border-green-600 cursor-pointer group flex flex-col h-full"
                            onClick={() => handleDoctorClick(doctor)}
                        >
                            <CardContent className="p-6 flex flex-col items-center flex-1">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
                                    <User className="w-10 h-10 text-green-700 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-center text-gray-800 mb-1">{doctor.name}</h3>
                                <p className="text-sm text-green-600 font-medium mb-4">{doctor.specialization}</p>
                                <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 mt-auto">
                                    Access Dashboard <ChevronRight className="w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Verification Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <CardHeader className="border-b">
                            <CardTitle className="text-xl font-bold text-gray-800">Profile Verification</CardTitle>
                            <p className="text-sm text-gray-500">Accessing Dashboard for <span className="text-green-700 font-bold">{selectedDoctor?.name}</span></p>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleVerify} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Verify your access password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter verification password"
                                            className="pl-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        Confirm Access
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DoctorSelection;
