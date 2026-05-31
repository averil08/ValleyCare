import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doctors, specializationCategories } from "./doctorData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, ChevronRight, ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import Logo from "./assets/partner-logo.jpg";
import { createDoctorProfile } from "./lib/supabaseClient";

const DoctorSelection = () => {
    const navigate = useNavigate();
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedSpecialization, setSelectedSpecialization] = useState('all');

    // Registration modal state
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [regForm, setRegForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        specialization: "",
        password: "",
        services: [],
        consultationFee: ""
    });
    const [regTouched, setRegTouched] = useState({});
    const [regErrors, setRegErrors] = useState({});
    const [regError, setRegError] = useState("");
    const [regSuccess, setRegSuccess] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    // Dynamic doctors loaded from localStorage
    const [localDoctors, setLocalDoctors] = useState(() => {
        const stored = localStorage.getItem("abante_local_doctors");
        return stored ? JSON.parse(stored) : [];
    });

    // Re-sync when another tab/component updates doctor profiles
    useEffect(() => {
        const syncLocalDoctors = () => {
            const stored = localStorage.getItem("abante_local_doctors");
            setLocalDoctors(stored ? JSON.parse(stored) : []);
        };
        // Fire once on mount so PatientContext gets pre-existing localStorage doctors immediately
        window.dispatchEvent(new Event('storage-doctors-updated'));
        window.addEventListener('storage', (e) => { if (e.key === 'abante_local_doctors') syncLocalDoctors(); });
        window.addEventListener('storage-doctors-updated', syncLocalDoctors);
        return () => {
            window.removeEventListener('storage', syncLocalDoctors);
            window.removeEventListener('storage-doctors-updated', syncLocalDoctors);
        };
    }, []);

    const allDoctors = (() => {
        const merged = doctors.map(d => {
            const localOverride = localDoctors.find(ld => ld.id === d.id);
            return localOverride || d;
        });
        const staticIds = doctors.map(d => d.id);
        const newLocal = localDoctors.filter(ld => !staticIds.includes(ld.id));
        return [...merged, ...newLocal];
    })();

    const filteredDoctors = selectedSpecialization === 'all'
        ? allDoctors
        : allDoctors.filter(doc => {
            const staticIds = specializationCategories[selectedSpecialization]?.doctorIds || [];
            if (staticIds.includes(doc.id)) return true;

            const specMap = {
                'Pediatrics': 'pediatrics',
                'Internal Medicine': 'internalMedicine',
                'Nephrology': 'nephrology',
                'OB-GYN': 'obgyn',
                'Orthopedics & Urology': 'orthopedicsUrology',
                'Orthopedic Surgery': 'orthopedicsUrology',
                'General Surgery': 'generalSurgery',
                'ENT': 'ent'
            };
            const docSpecKey = specMap[doc.specialization];
            return docSpecKey === selectedSpecialization;
        });

    const handleDoctorClick = (doctor) => {
        setSelectedDoctor(doctor);
        setShowModal(true);
        setPassword("");
        setShowPassword(false);
        setError("");
    };

    const handleVerify = (e) => {
        e.preventDefault();
        // Verification logic
        const docPassword = selectedDoctor.password || "doctor123";
        if (password === docPassword) {
            // Store doctor ID in localStorage
            localStorage.setItem('selectedDoctorId', selectedDoctor.id);
            // Redirect to the doctor's own dashboard
            navigate("/doctor-dashboard");
        } else {
            setError("Incorrect password. Please try again.");
        }
    };

    const validateRegField = (id, value) => {
        let error = "";
        if (id === "services") {
            if (!value || (Array.isArray(value) && value.length === 0)) {
                error = "Please select at least one service.";
            }
            return error;
        }
        if (id === "consultationFee") {
            if (!value && value !== 0) {
                error = "This field is required.";
            } else if (isNaN(Number(value)) || Number(value) < 0) {
                error = "Please enter a valid fee amount.";
            }
            return error;
        }
        if (!value) {
            error = "This field is required.";
        } else if (["firstName", "lastName"].includes(id) && value) {
            if (!/^[a-zA-Z\s]*$/.test(value)) {
                error = "This field must contain only alphabetic characters.";
            }
        } else if (id === "phone" && value) {
            if (!/^9\d{9}$/.test(value)) {
                error = "Phone number must be exactly 10 digits starting with 9.";
            }
        } else if (id === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = "Invalid email format.";
        } else if (id === "password" && value && value.length < 6) {
            error = "Password must be at least 6 characters.";
        }
        return error;
    };

    const handleRegBlur = (e) => {
        const { id, value } = e.target;
        const fieldId = id === "regPassword" ? "password" : id;
        setRegTouched((prev) => ({ ...prev, [fieldId]: true }));
        setRegErrors((prev) => ({ ...prev, [fieldId]: validateRegField(fieldId, value) }));
    };

    const handleRegFormChange = (e) => {
        let { id, value } = e.target;
        const fieldId = id === "regPassword" ? "password" : id;

        if (["firstName", "lastName"].includes(fieldId)) {
            value = value.replace(/[^a-zA-Z\s]/g, "");
        }

        if (fieldId === "phone") {
            value = value.replace(/\D/g, "");
            value = value.slice(0, 10);
        }

        const newData = { ...regForm, [fieldId]: value };
        setRegForm(newData);

        if (regTouched[fieldId]) {
            setRegErrors((prev) => ({ ...prev, [fieldId]: validateRegField(fieldId, value) }));
        }
    };

    const resetRegForm = () => {
        setRegForm({
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            specialization: "",
            password: "",
            services: [],
            consultationFee: ""
        });
        setRegTouched({});
        setRegErrors({});
        setRegError("");
        setRegSuccess("");
        setShowRegPassword(false);
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegError("");
        setRegSuccess("");

        // Run validation on all fields
        const validationErrors = {
            firstName: validateRegField("firstName", regForm.firstName),
            lastName: validateRegField("lastName", regForm.lastName),
            phone: validateRegField("phone", regForm.phone),
            email: validateRegField("email", regForm.email),
            specialization: regForm.specialization ? "" : "This field is required.",
            password: validateRegField("password", regForm.password),
            services: validateRegField("services", regForm.services),
            consultationFee: validateRegField("consultationFee", regForm.consultationFee)
        };

        const hasErrors = Object.values(validationErrors).some(err => err !== "");
        if (hasErrors) {
            setRegErrors(validationErrors);
            setRegTouched({
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                specialization: true,
                password: true,
                services: true,
                consultationFee: true
            });
            setRegError("Please resolve the validation errors before submitting.");
            return;
        }

        setIsRegistering(true);

        try {
            const result = await createDoctorProfile({
                firstName: regForm.firstName,
                lastName: regForm.lastName,
                email: regForm.email,
                password: regForm.password,
                phone: `+63${regForm.phone}`,
                specialization: regForm.specialization
            });

            if (!result.success) {
                console.warn("Supabase doctor registration failed:", result.error);
            }

            const newDoc = {
                id: Date.now(),
                name: `Dr. ${regForm.firstName} ${regForm.lastName}`,
                phone: `+63${regForm.phone}`,
                email: regForm.email,
                specialization: regForm.specialization,
                specializations: regForm.services,
                doctorServices: regForm.services,
                consultationPrice: Number(regForm.consultationFee),
                password: regForm.password,
                schedule: "By Appointment Only",
                availability: [
                    { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
                ]
            };

            const updatedLocal = [...localDoctors, newDoc];
            setLocalDoctors(updatedLocal);
            localStorage.setItem("abante_local_doctors", JSON.stringify(updatedLocal));
            // Notify PatientContext and all other open components to re-sync allDoctors
            window.dispatchEvent(new Event('storage-doctors-updated'));

            setRegSuccess("Doctor profile registered successfully!");
            setTimeout(() => {
                setShowRegisterModal(false);
                resetRegForm();
            }, 1500);

        } catch (err) {
            console.error("Registration error:", err);
            setRegError(err.message || "An unexpected error occurred during registration.");
        } finally {
            setIsRegistering(false);
        }
    };    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8">
            <div className="max-w-7xl mx-auto w-full">
                <div className="flex flex-col items-center mb-10 relative">
                    <div className="w-full flex justify-between items-center sm:block mb-6 sm:mb-0">
                        <div className="sm:absolute sm:left-0 sm:top-0">
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/")}
                                className="text-gray-600 hover:text-green-700 hover:bg-green-50 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </Button>
                        </div>
                        <div className="sm:absolute sm:right-0 sm:top-0">
                            <Button
                                onClick={() => setShowRegisterModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 shadow-md transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Add New Doctor</span>
                            </Button>
                        </div>
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
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter verification password"
                                            className="pl-10 pr-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
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

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <CardHeader className="border-b bg-green-50/50">
                            <CardTitle className="text-xl font-bold text-green-800 flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-green-700" />
                                Register New Doctor
                            </CardTitle>
                            <p className="text-sm text-gray-500">Create a new doctor profile to access the dashboard</p>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="firstName"
                                            placeholder="Juan"
                                            value={regForm.firstName}
                                            onChange={handleRegFormChange}
                                            onBlur={handleRegBlur}
                                            className={regTouched.firstName && regErrors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            required
                                        />
                                        {regTouched.firstName && regErrors.firstName && <p className="text-xs text-red-500 mt-1">{regErrors.firstName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Surname / Last Name <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Dela Cruz"
                                            value={regForm.lastName}
                                            onChange={handleRegFormChange}
                                            onBlur={handleRegBlur}
                                            className={regTouched.lastName && regErrors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            required
                                        />
                                        {regTouched.lastName && regErrors.lastName && <p className="text-xs text-red-500 mt-1">{regErrors.lastName}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number <span className="text-red-600">*</span></Label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                                                +63
                                            </span>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={regForm.phone}
                                                onChange={handleRegFormChange}
                                                onBlur={handleRegBlur}
                                                className={`rounded-l-none ${regTouched.phone && regErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                                placeholder="9123456789"
                                                required
                                                maxLength={10}
                                                minLength={10}
                                                pattern="9\d{9}"
                                            />
                                        </div>
                                        {regTouched.phone && regErrors.phone && <p className="text-xs text-red-500 mt-1">{regErrors.phone}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="doctor@email.com"
                                            value={regForm.email}
                                            onChange={handleRegFormChange}
                                            onBlur={handleRegBlur}
                                            className={regTouched.email && regErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            required
                                        />
                                        {regTouched.email && regErrors.email && <p className="text-xs text-red-500 mt-1">{regErrors.email}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="specialization">Specialization <span className="text-red-600">*</span></Label>
                                    <select
                                        id="specialization"
                                        value={regForm.specialization}
                                        onChange={handleRegFormChange}
                                        onBlur={handleRegBlur}
                                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-green-500 focus:ring-green-500 ${regTouched.specialization && regErrors.specialization ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                        required
                                    >
                                        <option value="" disabled>Select Specialization</option>
                                        <option value="Pediatrics">Pediatrics</option>
                                        <option value="Internal Medicine">Internal Medicine</option>
                                        <option value="Nephrology">Nephrology</option>
                                        <option value="OB-GYN">OB-GYN</option>
                                        <option value="Orthopedic Surgery">Orthopedic Surgery</option>
                                        <option value="General Surgery">General Surgery</option>
                                        <option value="ENT">ENT</option>
                                    </select>
                                    {regTouched.specialization && regErrors.specialization && <p className="text-xs text-red-500 mt-1">{regErrors.specialization}</p>}
                                </div>

                                 <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Services Offered <span className="text-red-600">*</span></Label>
                                    <div className={`border rounded-lg p-3 space-y-2 bg-white ${regTouched.services && regErrors.services ? 'border-red-500' : 'border-gray-200'}`}>
                                        {[
                                            { value: "general consultation", label: "General Consultation" },
                                            { value: "hematology", label: "Hematology" },
                                            { value: "immunology & serology", label: "Immunology & Serology" },
                                            { value: "clinical chemistry", label: "Clinical Chemistry" },
                                            { value: "clinical microscopy & parasitology", label: "Clinical Microscopy & Parasitology" },
                                            { value: "surgery", label: "Surgery" }
                                        ].map(opt => {
                                            const checked = regForm.services.includes(opt.value);
                                            return (
                                                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            const next = checked
                                                                ? regForm.services.filter(s => s !== opt.value)
                                                                : [...regForm.services, opt.value];
                                                            setRegForm(p => ({ ...p, services: next }));
                                                            setRegErrors(prev => ({ ...prev, services: validateRegField('services', next) }));
                                                        }}
                                                        className="w-4 h-4 rounded accent-green-600"
                                                    />
                                                    <span className={`text-xs font-medium transition-colors ${checked ? 'text-green-700 font-semibold' : 'text-gray-600 group-hover:text-gray-800'}`}>{opt.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {regTouched.services && regErrors.services && <p className="text-xs text-red-500 mt-1">{regErrors.services}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="consultationFee" className="text-sm font-semibold text-gray-700">Consultation Fee (₱) <span className="text-red-600">*</span></Label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold select-none">₱</span>
                                        <Input
                                            id="consultationFee"
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={regForm.consultationFee}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRegForm(p => ({ ...p, consultationFee: val }));
                                                setRegErrors(prev => ({ ...prev, consultationFee: validateRegField('consultationFee', val) }));
                                            }}
                                            onBlur={(e) => {
                                                setRegTouched(prev => ({ ...prev, consultationFee: true }));
                                                setRegErrors(prev => ({ ...prev, consultationFee: validateRegField('consultationFee', e.target.value) }));
                                            }}
                                            className={`rounded-l-none ${regTouched.consultationFee && regErrors.consultationFee ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200 focus-visible:ring-green-500'}`}
                                            placeholder="e.g. 1000"
                                            required
                                        />
                                    </div>
                                    {regTouched.consultationFee && regErrors.consultationFee && <p className="text-xs text-red-500 mt-1">{regErrors.consultationFee}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="regPassword">Password <span className="text-red-600">*</span></Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="regPassword"
                                            type={showRegPassword ? "text" : "password"}
                                            placeholder="Min. 6 characters"
                                            className={`pl-10 pr-10 ${regTouched.password && regErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            value={regForm.password}
                                            onChange={handleRegFormChange}
                                            onBlur={handleRegBlur}
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPassword(!showRegPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {regTouched.password && regErrors.password && <p className="text-xs text-red-500 mt-1">{regErrors.password}</p>}
                                </div>

                                {regError && <p className="text-sm text-red-600 font-medium">{regError}</p>}
                                {regSuccess && <p className="text-sm text-green-600 font-medium">{regSuccess}</p>}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowRegisterModal(false);
                                            resetRegForm();
                                        }}
                                        disabled={isRegistering}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                                        disabled={isRegistering}
                                    >
                                        {isRegistering ? "Registering..." : "Create Profile"}
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
