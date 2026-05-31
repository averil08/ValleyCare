import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerUser, registerClinicStaff } from "./lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";
import Logo from "./assets/logo-valley.png";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    age: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (id, value, currentData) => {
    let error = "";
    if (!value && id !== "middleName") {
      error = "This field is required.";
    } else if (["firstName", "middleName", "lastName"].includes(id) && value) {
      if (!/^[a-zA-Z\s]*$/.test(value)) {
        error = "This field must contain only alphabetic characters.";
      }
    } else if (id === "phoneNumber" && value) {
      if (!/^9\d{9}$/.test(value)) {
        error = "Phone number must be exactly 10 digits starting with 9.";
      }
    } else if (id === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = "Invalid email format.";
    } else if (id === "age" && value && (value <= 0 || value > 150)) {
      error = "Please enter a valid age (1-150).";
    } else if (id === "password" && value && value.length < 6) {
      error = "Password must be at least 6 characters.";
    } else if (id === "confirmPassword" && value && value !== currentData.password) {
      error = "Passwords do not match.";
    }
    return error;
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    setTouched((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: validateField(id, value, formData) }));
  };

  const handleInputChange = (e) => {
    let { id, value } = e.target;
    if (["firstName", "middleName", "lastName"].includes(id)) {
      value = value.replace(/[^a-zA-Z\s]/g, "");
    }

    if (id === "phoneNumber") {
      value = value.replace(/\D/g, "");
      value = value.slice(0, 10);
    }

    if (id === "age" && value !== "") {
      value = Math.max(0, parseInt(value, 10)).toString();
      if (isNaN(value)) value = "";
    }
    const newData = { ...formData, [id]: value };
    setFormData(newData);
    if (touched[id]) {
      setErrors((prev) => ({ ...prev, [id]: validateField(id, value, newData) }));
    }
  };

  const showMessage = (title, message, isSuccess = true) => {
    const messageBox = document.getElementById("message-box");
    if (messageBox) {
      messageBox.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white p-6 rounded-lg shadow-2xl max-w-md text-center">
            <h3 class="text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'} mb-4">${title}</h3>
            <p class="text-gray-700 mb-4 whitespace-pre-line">${message}</p>
            ${isSuccess ? '<p class="text-sm text-gray-500 mb-4">📧 Check your inbox and click the verification link.</p>' : ''}
            <button id="close-btn" class="bg-${isSuccess ? 'green' : 'red'}-600 text-white px-4 py-2 rounded-md hover:opacity-90">Close</button>
          </div>
        </div>
      `;
      document.getElementById("close-btn").onclick = () => {
        messageBox.innerHTML = "";
      };
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      age: "",
      password: "",
      confirmPassword: "",
    });
    setTouched({});
    setErrors({});
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {

      if (!formData.firstName || !formData.lastName || !formData.phoneNumber || !formData.email || !formData.age || !formData.password || !formData.confirmPassword) {
        showMessage("Validation Error", "Please fill in all required fields.", false);
        setIsSubmitting(false);
        return;
      }

      const phoneRegex = /^9\d{9}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        showMessage("Validation Error", "Phone number must start with 9 and be exactly 10 digits.", false);
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        showMessage("Validation Error", "Password must be at least 6 characters long.", false);
        setIsSubmitting(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        showMessage("Validation Error", "Passwords do not match. Please try again.", false);
        setIsSubmitting(false);
        return;
      }

      const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
      const result = await registerUser(
        formData.email,
        formData.password,
        fullName,
        `+63${formData.phoneNumber}`,
        formData.age,
        "patient"
      );

      if (result.success) {
        showMessage(
          "Registration Successful!",
          "Your account has been created. Please check your email to verify your account before logging in.",
          true
        );
        resetForm();
        setTimeout(() => {
          navigate("/");
        }, 4000);
      } else {
        showMessage("Registration Failed", `Error: ${result.error}`, false);
      }
    } catch (error) {
      console.error("Signup error:", error);
      showMessage("Registration Failed", "An unexpected error occurred. Please check your internet and try again.", false);
    } finally {
      setIsSubmitting(false);
    }
  };  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('type') === 'staff' ? 'staff' : 'patient';
  const [activeTab, setActiveTab] = useState(defaultTab); // "patient" or "staff"
  const [staffRole, setStaffRole] = useState("doctor"); // "doctor" or "secretary"
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    accessPassword: "", // Dashboard Access Password
    specialization: "",
    services: [],
    consultationFee: "",
  });
  const [staffTouched, setStaffTouched] = useState({});
  const [staffErrors, setStaffErrors] = useState({});
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStaffConfirmPassword, setShowStaffConfirmPassword] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);

  const validateStaffField = (id, value, currentData) => {
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
      if (id !== "specialization" && id !== "accessPassword") {
        error = "This field is required.";
      } else if (staffRole === "doctor") {
        error = "This field is required.";
      }
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
    } else if (id === "confirmPassword" && value && value !== currentData.password) {
      error = "Passwords do not match.";
    } else if (id === "accessPassword" && value && value.length < 6) {
      error = "Access password must be at least 6 characters.";
    }
    return error;
  };

  const handleStaffInputChange = (e) => {
    let { id, value } = e.target;
    if (["firstName", "lastName"].includes(id)) {
      value = value.replace(/[^a-zA-Z\s]/g, "");
    }
    if (id === "phone") {
      value = value.replace(/\D/g, "");
      value = value.slice(0, 10);
    }
    if (id === "consultationFee" && value !== "") {
      value = Math.max(0, parseInt(value, 10)).toString();
      if (isNaN(value)) value = "";
    }

    const newData = { ...staffForm, [id]: value };
    setStaffForm(newData);
    if (staffTouched[id]) {
      setStaffErrors((prev) => ({ ...prev, [id]: validateStaffField(id, value, newData) }));
    }
  };

  const handleStaffBlur = (e) => {
    const { id, value } = e.target;
    setStaffTouched((prev) => ({ ...prev, [id]: true }));
    setStaffErrors((prev) => ({ ...prev, [id]: validateStaffField(id, value, staffForm) }));
  };

  const resetStaffForm = () => {
    setStaffForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      accessPassword: "",
      specialization: "",
      services: [],
      consultationFee: "",
    });
    setStaffTouched({});
    setStaffErrors({});
    setShowStaffPassword(false);
    setShowStaffConfirmPassword(false);
    setShowAccessPassword(false);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validationErrors = {
        firstName: validateStaffField("firstName", staffForm.firstName, staffForm),
        lastName: validateStaffField("lastName", staffForm.lastName, staffForm),
        phone: validateStaffField("phone", staffForm.phone, staffForm),
        email: validateStaffField("email", staffForm.email, staffForm),
        password: validateStaffField("password", staffForm.password, staffForm),
        confirmPassword: validateStaffField("confirmPassword", staffForm.confirmPassword, staffForm),
        accessPassword: staffRole === "doctor" ? validateStaffField("accessPassword", staffForm.accessPassword, staffForm) : "",
        specialization: staffRole === "doctor" && !staffForm.specialization ? "This field is required." : "",
        services: staffRole === "doctor" ? validateStaffField("services", staffForm.services, staffForm) : "",
        consultationFee: staffRole === "doctor" ? validateStaffField("consultationFee", staffForm.consultationFee, staffForm) : "",
      };

      const hasErrors = Object.values(validationErrors).some((err) => err !== "");
      if (hasErrors) {
        setStaffErrors(validationErrors);
        setStaffTouched({
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          password: true,
          confirmPassword: true,
          accessPassword: true,
          specialization: true,
          services: true,
          consultationFee: true,
        });
        showMessage("Validation Error", "Please resolve all validation errors before submitting.", false);
        setIsSubmitting(false);
        return;
      }

      const result = await registerClinicStaff({
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        email: staffForm.email,
        password: staffForm.password,
        phone: staffForm.phone,
        role: staffRole,
        specialization: staffForm.specialization,
        services: staffForm.services,
        consultationFee: Number(staffForm.consultationFee || 0),
        accessPassword: staffForm.accessPassword,
      });

      if (result.success) {
        if (staffRole === "doctor") {
          const newDoc = {
            id: Date.now(),
            name: `Dr. ${staffForm.firstName} ${staffForm.lastName}`,
            phone: `+63${staffForm.phone}`,
            email: staffForm.email,
            specialization: staffForm.specialization,
            specializations: staffForm.services,
            doctorServices: staffForm.services,
            consultationPrice: Number(staffForm.consultationFee),
            password: staffForm.accessPassword,
            schedule: "By Appointment Only",
            availability: [
              { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 17 }
            ]
          };

          const stored = localStorage.getItem("abante_local_doctors");
          const localDoctors = stored ? JSON.parse(stored) : [];
          const updatedLocal = [...localDoctors, newDoc];
          localStorage.setItem("abante_local_doctors", JSON.stringify(updatedLocal));
          window.dispatchEvent(new Event("storage-doctors-updated"));
        }

        showMessage(
          "Registration Successful!",
          `Clinic Staff (${staffRole.toUpperCase()}) account has been created. Please check your email to verify your account before logging in.`,
          true
        );
        resetStaffForm();
        setTimeout(() => {
          navigate("/login?type=staff");
        }, 4000);
      } else {
        showMessage("Registration Failed", `Error: ${result.error}`, false);
      }
    } catch (error) {
      console.error("Clinic Staff Signup error:", error);
      showMessage("Registration Failed", "An unexpected error occurred. Please check your internet and try again.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-green-600">
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            ← Back
          </Button>
        </div>
        <div className="flex justify-center items-center mt-4">
          <img src={Logo} alt="Logo" className="w-[190px] h-20 object-contain" />
        </div>


        {activeTab === "patient" ? (
          <>
            <CardHeader>
              <CardTitle className="text-center text-green-700">
                Patient Sign Up
              </CardTitle>
              <p className="text-center text-sm text-gray-500">
                Create an account to manage your medical records.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.firstName && errors.firstName ? "border-red-500" : ""}
                      placeholder="Juan"
                      required
                    />
                    {touched.firstName && errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Surname / Last Name <span className="text-red-600">*</span></Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.lastName && errors.lastName ? "border-red-500" : ""}
                      placeholder="Dela Cruz"
                      required
                    />
                    {touched.lastName && errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    id="middleName"
                    type="text"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    placeholder="Santos"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number <span className="text-red-600">*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                      +63
                    </span>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`rounded-l-none ${touched.phoneNumber && errors.phoneNumber ? "border-red-500" : ""}`}
                      placeholder="9123456789"
                      required
                      maxLength={10}
                      minLength={10}
                      pattern="9\d{9}"
                    />
                  </div>
                  {touched.phoneNumber && errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.email && errors.email ? "border-red-500" : ""}
                    placeholder="patient@email.com"
                    required
                  />
                  {touched.email && errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age <span className="text-red-600">*</span></Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.age && errors.age ? "border-red-500" : ""}
                    placeholder="25"
                    required
                    min="1"
                    max="150"
                  />
                  {touched.age && errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-600">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.password && errors.password ? "border-red-500" : ""}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                  {touched.password && errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-600">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.confirmPassword && errors.confirmPassword ? "border-red-500" : ""}
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                  />
                  {touched.confirmPassword && errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#047a52] hover:bg-[#03503a] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Sign Up"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">OR</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => navigate("/login?type=patient")}
                    variant="outline"
                    className="w-full border-green-600 text-green-600"
                  >
                    Already have an account? Log In
                  </Button>

                  <Button
                    type="button"
                    onClick={() => navigate("/checkin?view=patient")}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600"
                  >
                    Join as Guest (View Slots)
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-center text-green-700 font-bold">
                Clinic Staff Sign Up
              </CardTitle>
              <p className="text-center text-sm text-gray-500">
                Register as doctor or secretary to access the staff dashboard.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffRole">I am registering as a <span className="text-red-600">*</span></Label>
                  <select
                    id="staffRole"
                    value={staffRole}
                    onChange={(e) => {
                      setStaffRole(e.target.value);
                      resetStaffForm();
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="doctor">Doctor / Physician</option>
                    <option value="secretary">Secretary / Staff</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={staffForm.firstName}
                      onChange={handleStaffInputChange}
                      onBlur={handleStaffBlur}
                      className={staffTouched.firstName && staffErrors.firstName ? "border-red-500" : ""}
                      placeholder="Juan"
                      required
                    />
                    {staffTouched.firstName && staffErrors.firstName && <p className="text-xs text-red-500 mt-1">{staffErrors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Surname / Last Name <span className="text-red-600">*</span></Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={staffForm.lastName}
                      onChange={handleStaffInputChange}
                      onBlur={handleStaffBlur}
                      className={staffTouched.lastName && staffErrors.lastName ? "border-red-500" : ""}
                      placeholder="Dela Cruz"
                      required
                    />
                    {staffTouched.lastName && staffErrors.lastName && <p className="text-xs text-red-500 mt-1">{staffErrors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-red-600">*</span></Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                      +63
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      value={staffForm.phone}
                      onChange={handleStaffInputChange}
                      onBlur={handleStaffBlur}
                      className={`rounded-l-none ${staffTouched.phone && staffErrors.phone ? "border-red-500" : ""}`}
                      placeholder="9123456789"
                      required
                      maxLength={10}
                      minLength={10}
                      pattern="9\d{9}"
                    />
                  </div>
                  {staffTouched.phone && staffErrors.phone && <p className="text-xs text-red-500 mt-1">{staffErrors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email / Gmail <span className="text-red-600">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={staffForm.email}
                    onChange={handleStaffInputChange}
                    onBlur={handleStaffBlur}
                    className={staffTouched.email && staffErrors.email ? "border-red-500" : ""}
                    placeholder="staff@email.com"
                    required
                  />
                  {staffTouched.email && staffErrors.email && <p className="text-xs text-red-500 mt-1">{staffErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Login Password <span className="text-red-600">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showStaffPassword ? "text" : "password"}
                      value={staffForm.password}
                      onChange={handleStaffInputChange}
                      onBlur={handleStaffBlur}
                      className={staffTouched.password && staffErrors.password ? "border-red-500 pr-10" : "pr-10"}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {staffTouched.password && staffErrors.password && <p className="text-xs text-red-500 mt-1">{staffErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Login Password <span className="text-red-600">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showStaffConfirmPassword ? "text" : "password"}
                      value={staffForm.confirmPassword}
                      onChange={handleStaffInputChange}
                      onBlur={handleStaffBlur}
                      className={staffTouched.confirmPassword && staffErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                      placeholder="Re-enter your password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffConfirmPassword(!showStaffConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showStaffConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {staffTouched.confirmPassword && staffErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{staffErrors.confirmPassword}</p>}
                </div>

                {staffRole === "doctor" && (
                  <div className="space-y-2">
                    <Label htmlFor="accessPassword">Dashboard Access Password <span className="text-red-600">*</span></Label>
                    <div className="relative">
                      <Input
                        id="accessPassword"
                        type={showAccessPassword ? "text" : "password"}
                        value={staffForm.accessPassword}
                        onChange={handleStaffInputChange}
                        onBlur={handleStaffBlur}
                        className={staffTouched.accessPassword && staffErrors.accessPassword ? "border-red-500 pr-10" : "pr-10"}
                        placeholder="Verification password (e.g. doctor123)"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessPassword(!showAccessPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showAccessPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {staffTouched.accessPassword && staffErrors.accessPassword && <p className="text-xs text-red-500 mt-1">{staffErrors.accessPassword}</p>}
                  </div>
                )}

                {staffRole === "doctor" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization <span className="text-red-600">*</span></Label>
                      <select
                        id="specialization"
                        value={staffForm.specialization}
                        onChange={handleStaffInputChange}
                        onBlur={handleStaffBlur}
                        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-green-500 focus:ring-green-500 ${staffTouched.specialization && staffErrors.specialization ? "border-red-500" : ""}`}
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
                      {staffTouched.specialization && staffErrors.specialization && <p className="text-xs text-red-500 mt-1">{staffErrors.specialization}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Services Offered <span className="text-red-600">*</span></Label>
                      <div className={`border rounded-lg p-3 space-y-2 bg-white ${staffTouched.services && staffErrors.services ? 'border-red-500' : 'border-gray-200'}`}>
                        {[
                          { value: "general consultation", label: "General Consultation" },
                          { value: "hematology", label: "Hematology" },
                          { value: "immunology & serology", label: "Immunology & Serology" },
                          { value: "clinical chemistry", label: "Clinical Chemistry" },
                          { value: "clinical microscopy & parasitology", label: "Clinical Microscopy & Parasitology" },
                          { value: "surgery", label: "Surgery" }
                        ].map(opt => {
                          const checked = staffForm.services.includes(opt.value);
                          return (
                            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? staffForm.services.filter(s => s !== opt.value)
                                    : [...staffForm.services, opt.value];
                                  setStaffForm(p => ({ ...p, services: next }));
                                  setStaffErrors(prev => ({ ...prev, services: validateStaffField('services', next) }));
                                }}
                                className="w-4 h-4 rounded accent-green-600"
                              />
                              <span className={`text-xs font-medium transition-colors ${checked ? 'text-green-700 font-semibold' : 'text-gray-600 group-hover:text-gray-800'}`}>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {staffTouched.services && staffErrors.services && <p className="text-xs text-red-500 mt-1">{staffErrors.services}</p>}
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
                          value={staffForm.consultationFee}
                          onChange={handleStaffInputChange}
                          onBlur={handleStaffBlur}
                          className={`rounded-l-none ${staffTouched.consultationFee && staffErrors.consultationFee ? 'border-red-500' : 'border-gray-200'}`}
                          placeholder="e.g. 1000"
                          required
                        />
                      </div>
                      {staffTouched.consultationFee && staffErrors.consultationFee && <p className="text-xs text-red-500 mt-1">{staffErrors.consultationFee}</p>}
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#047a52] hover:bg-[#03503a] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Sign Up"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">OR</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate("/login?type=staff")}
                  variant="outline"
                  className="w-full border-green-600 text-green-600"
                >
                  Already have a Staff account? Log In
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <div id="message-box"></div>
    </div>
  );
}

export default Signup;