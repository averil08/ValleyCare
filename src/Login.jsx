import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// Import the real login function
import { loginUser, forgotPassword } from "./lib/supabaseClient";
import Logo from "./assets/logo-valley.png";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  // Determine if this is patient or staff login based on URL
  const urlParams = new URLSearchParams(window.location.search);
  const isPatientLogin = urlParams.get('type') === 'patient';

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const validateField = (id, value) => {
    let error = "";
    if (!value) {
      error = "This field is required.";
    } else if (id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = "Invalid email format.";
    } else if (id === "password" && value.length < 6) {
      error = "Password must be at least 6 characters.";
    }
    return error;
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    setTouched((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: validateField(id, value) }));
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const newData = { ...formData, [id]: value };
    setFormData(newData);
    if (touched[id]) {
      setErrors((prev) => ({ ...prev, [id]: validateField(id, value) }));
    }
  };

  const showMessage = (title, message, isSuccess = true) => {
    const msgBox = document.getElementById("message-box");
    if (msgBox) {
      msgBox.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm text-center">
            <h3 class="text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'} mb-4">${title}</h3>
            <p class="text-gray-700 mb-4">${message}</p>
            <button id="close-modal" class="bg-${isSuccess ? 'green' : 'red'}-600 text-white px-4 py-2 rounded-md hover:opacity-90">Close</button>
          </div>
        </div>
      `;
      document.getElementById("close-modal").onclick = () => {
        msgBox.innerHTML = "";
      };
    }
  };

  const resetForm = () => {
    setFormData({ email: "", password: "" });
    setTouched({});
    setErrors({});
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.email || !formData.password) {
        showMessage("Validation Error", "Please fill in all required fields.", false);
        setIsSubmitting(false);
        return;
      }

      if (formData.password.length < 6) {
        showMessage("Validation Error", "Password must be at least 6 characters long.", false);
        setIsSubmitting(false);
        return;
      }

      // 1. Call actual Supabase Auth
      const result = await loginUser(formData.email, formData.password);

      if (result.success) {
        // 2. Role Verification 
        const role = (result.role || "").toLowerCase();
        const isStaffPortal = !isPatientLogin;
        const hasAccess = isPatientLogin
          ? role === 'patient'
          : (role === 'staff' || role === 'doctor' || role === 'secretary');

        if (!hasAccess) {
          showMessage(
            "Access Denied",
            `This account is registered as a ${result.role}. Please use the correct login portal.`,
            false
          );
          setIsSubmitting(false);
          return;
        }

        // 3. Store in localStorage for your existing filtering logic
        const userRole = (result.role || "").toLowerCase();
        localStorage.setItem('userRole', userRole);

        if (isPatientLogin) {
          localStorage.setItem('currentPatientEmail', formData.email.toLowerCase().trim());
          localStorage.setItem('isPatientLoggedIn', 'true');
        } else {
          localStorage.removeItem('currentPatientEmail');
          localStorage.removeItem('isPatientLoggedIn');
        }

        // Ensure no stale guest/previous patient session exists
        localStorage.removeItem('activePatientId');

        showMessage(
          "Login Successful!",
          `Redirecting to your dashboard...`,
          true
        );
        resetForm();

        // 4. Redirect
        setTimeout(() => {
          if (isPatientLogin) {
            navigate("/homepage");
          } else {
            // Redirect based on role (case-insensitive check)
            const userRole = (result.role || "").toLowerCase();
            if (userRole === 'doctor') {
              navigate("/doctor-selection");
            } else {
              // Both 'staff' and 'secretary' go to the main dashboard
              navigate("/dashboard");
            }
          }
        }, 1500);
      } else {
        // This catches "Invalid login credentials" or "Email not confirmed"
        showMessage("Login Failed", result.error, false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      showMessage("Login Failed", "An unexpected error occurred. Please try again.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      showMessage("Validation Error", "Please enter your email address.", false);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forgotPassword(resetEmail);
      if (result.success) {
        showMessage(
          "Reset Link Sent",
          "Check your email for the password reset link.",
          true
        );
        setIsForgotPassword(false);
        setResetEmail("");
      } else {
        showMessage("Error", result.error, false);
      }
    } catch (error) {
      console.error("Forgot Password Error:", error);
      showMessage("Error", "An unexpected error occurred.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-using your existing UI structure
  const loginTitle = isPatientLogin ? "Patient Login" : "Clinic Staff Login";
  const loginDesc = isPatientLogin ? "Sign in to access your patient dashboard." : "Sign in to access the clinic dashboard.";
  const emailPlaceholder = isPatientLogin ? "patient@example.com" : "staff@example.com";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-green-600">
        <div className="p-4 border-b border-gray-200">
          <Button onClick={() => navigate("/")} variant="outline" size="sm" className="text-green-600 border-green-600">
            ← Back
          </Button>
        </div>
        <div className="flex justify-center items-center mt-4">
          <img src={Logo} alt="Logo" className="w-[190px] h-20 object-contain" />
        </div>

        <CardHeader>
          <CardTitle className="text-center text-green-700">{loginTitle}</CardTitle>
          <p className="text-center text-sm text-gray-500">{loginDesc}</p>
        </CardHeader>

        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Registered Email <span className="text-red-600">*</span></Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#047a52] hover:bg-[#03503a] text-white" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-sm text-gray-600 hover:underline"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Existing login form content ... */}
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={touched.email && errors.email ? "border-red-500" : ""}
                  placeholder={emailPlaceholder}
                  required
                />
                {touched.email && errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
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
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                {touched.password && errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-green-600 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#047a52] hover:bg-[#03503a] text-white" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>

              {isPatientLogin && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 text-gray-500">OR</span></div>
                  </div>

                  <div className="space-y-3">
                    <Button type="button" onClick={() => navigate("/signup")} variant="outline" className="w-full border-green-600 text-green-600">
                      Don't have an account? Sign Up
                    </Button>
                    <Button type="button" onClick={() => navigate("/checkin?view=patient")} variant="outline" className="w-full border-blue-600 text-blue-600">
                      Join as Guest (View Slots)
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      <div id="message-box"></div>
    </div>
  );
}

export default Login;