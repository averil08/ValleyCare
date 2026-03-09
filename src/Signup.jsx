import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerUser } from "./lib/supabaseClient";
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
        `0${formData.phoneNumber}`,
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
      </Card>

      <div id="message-box"></div>
    </div>
  );
}

export default Signup;