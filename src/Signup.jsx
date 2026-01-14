import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerStaff } from "./lib/supabaseClient";
import Logo from "./assets/logo-abante.png";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const showMessage = (title, message, isSuccess = true) => {
    document.getElementById("message-box").innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-2xl max-w-md text-center">
          <h3 class="text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'} mb-4">${title}</h3>
          <p class="text-gray-700 mb-4 whitespace-pre-line">${message}</p>
          ${isSuccess ? 
            '<p class="text-sm text-gray-500 mb-4">📧 Check your inbox and click the verification link to activate your account.</p>' 
            : ''}
          <button onclick="document.getElementById('message-box').innerHTML=''" class="bg-${isSuccess ? 'green' : 'red'}-600 text-white px-4 py-2 rounded-md hover:bg-${isSuccess ? 'green' : 'red'}-700">Close</button>
        </div>
      </div>
    `;
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      companyName: "",
      phoneNumber: "",
      email: "",
      password: "",
    });
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.fullName || !formData.phoneNumber || !formData.email || !formData.password) {
        showMessage("Validation Error", "Please fill in all required fields.", false);
        setIsSubmitting(false);
        return;
      }

      // Phone number validation (basic)
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        showMessage("Validation Error", "Please enter a valid phone number.", false);
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        showMessage("Validation Error", "Password must be at least 6 characters long.", false);
        setIsSubmitting(false);
        return;
      }

      // Default staff role - use "secretary" as it's allowed by database constraint
      const staffRole = "secretary";

      // You'll need to update the registerStaff function to accept additional parameters
      const result = await registerStaff(
        formData.email, 
        formData.password, 
        staffRole,
        formData.fullName,
        formData.companyName || "DeValley Clinic",
        formData.phoneNumber
      );

      if (result.success) {
        showMessage(
          "Registration Successful!",
          "Please check your email to verify your account before logging in. You can close this page.",
          true
        );
        resetForm();

        // DO NOT redirect to dashboard - user must verify email first
        // Optionally redirect to login page after showing the message
        setTimeout(() => {
          navigate("/");
        }, 3000);

        {/*User submits/clicks "Sign Up" button
          ↓  ← "Registration Success! Check email"  then redirect to Landing page 
        Signup.jsx calls registerStaff()
          ↓
        supabaseClient.js → supabase.auth.signUp()  ← This creates the user
          ↓
        SUPABASE (backend) automatically sends verification email  ← 
          ↓
        Email arrives in user's inbox 
          ↓
        User clicks link → SUPABASE marks email as verified + redirect to site URL (example: "/" landing page or "/login")
          ↓
        User back to landing page (/) must click "LOGIN" to go Login page
          */}

      } else {
        showMessage("Registration Failed", `Error: ${result.error}. Please try again.`, false);
      }
    } catch (error) {
      showMessage("Registration Failed", "An unexpected error occurred. Please try again.", false);
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
        <div className="flex justify-center items-center mt-0">
          <img src={Logo} alt="Abante Logo" className="w-[190px] h-25 object-contain" />
        </div>

        <CardHeader>
          <CardTitle className="text-center text-green-700">
            Patient Sign Up
          </CardTitle>
          <p className="text-center text-sm text-gray-500">
            Create your account to access the patient dashboard.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Abante Clinic"
                required
              />
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+63 912 345 6789"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="patient@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password (min 6 characters)"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#047a52] hover:bg-[#03503a] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registering..." : "Sign Up"}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">OR</span>
              </div>
            </div>

            {/* Login and Guest buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => navigate("/login?type=patient")} 
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
              >
                Already have an account? Log In
              </Button>
              
              <Button
                type="button"
                onClick={() => navigate("/checkin?view=patient")} // will change this
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Join as Guest (View Schedule Slots)
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