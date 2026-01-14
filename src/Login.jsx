import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Logo from "./assets/logo-valley.png";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  
  // Check URL parameters to determine if this is patient or staff login
  const urlParams = new URLSearchParams(window.location.search);
  const isPatientLogin = urlParams.get('type') === 'patient';
  
  const [formData, setFormData] = useState({
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
        <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm text-center">
          <h3 class="text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'} mb-4">${title}</h3>
          <p class="text-gray-700 mb-4">${message}</p>
          <button onclick="document.getElementById('message-box').innerHTML=''" class="bg-${isSuccess ? 'green' : 'red'}-600 text-white px-4 py-2 rounded-md hover:bg-${isSuccess ? 'green' : 'red'}-700">Close</button>
        </div>
      </div>
    `;
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.email || !formData.password) {
        showMessage("Validation Error", "Please fill in all required fields.", false);
        setIsSubmitting(false);
        return;
      }

      // ✅ TEMPORARY: Frontend-only validation (remove when backend is ready)
      // This will accept any email/password for now
      // Your backend team will replace this with actual Supabase authentication
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes - accepts any credentials
      // TODO: Replace with actual loginStaff() or loginPatient() function when backend is ready
      const result = { success: true };

      if (result.success) {
        // ✅ NEW: Store patient identifier in localStorage for filtering
        if (isPatientLogin) {
          localStorage.setItem('currentPatientEmail', formData.email.toLowerCase().trim());
          localStorage.setItem('isPatientLoggedIn', 'true');
        } else {
          // Clear patient data for staff login
          localStorage.removeItem('currentPatientEmail');
          localStorage.removeItem('isPatientLoggedIn');
        }

        showMessage(
          "Login Successful!",
          `Redirecting to ${isPatientLogin ? 'patient' : 'clinic'} dashboard...`,
          true
        );
        resetForm();

        // Redirect based on login type
        setTimeout(() => {
          if (isPatientLogin) {
            navigate("/homepage"); // Patient dashboard
          } else {
            navigate("/dashboard"); // Staff dashboard
          }
        }, 1500);
      } else {
        showMessage("Login Failed", "Please check your credentials.", false);
      }
    } catch (error) {
      showMessage("Login Failed", "An unexpected error occurred. Please try again.", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== PATIENT LOGIN FORM ==========
  if (isPatientLogin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-sm shadow-xl border-t-4 border-green-600">
          <div className="p-4 border-b border-gray-200">
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-blue-50"
            >
              ← Back
            </Button>
          </div>
          <div className="flex justify-center items-center mt-4">
            <img src={Logo} alt="Valleycare Logo" className="w-[190px] h-25 object-contain" />
          </div>

          <CardHeader>
            <CardTitle className="text-center text-green-700">
              Patient Login
            </CardTitle>
            <p className="text-center text-sm text-gray-500">
              Sign in to access your patient dashboard.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#047a52] hover:bg-[#03503a] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
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

              {/* Sign Up and Guest buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => navigate("/signup")}
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50"
                >
                  Don't have an account? Sign Up
                </Button>
                
                <Button
                  type="button"
                  onClick={() => navigate("/checkin?view=patient&type=appointment")}
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

  // ========== CLINIC STAFF LOGIN FORM (DEFAULT) ==========
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-green-600">
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
          <img src={Logo} alt="Valleycare Logo" className="w-[190px] h-25 object-contain" />
        </div>

        <CardHeader>
          <CardTitle className="text-center text-green-700">
            Clinic Staff Login
          </CardTitle>
          <p className="text-center text-sm text-gray-500">
            Sign in to access the clinic dashboard.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="staff@example.com"
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
                placeholder="Enter your password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#047a52] hover:bg-[#03503a] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div id="message-box"></div>
    </div>
  );
}

export default Login;