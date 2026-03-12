import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resetPassword, supabase } from "./lib/supabaseClient";
import Logo from "./assets/logo-valley.png";
import { useNavigate } from "react-router-dom";

function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserRole(session.user.user_metadata?.role?.toLowerCase());
                setVerifying(false);
            } else {
                // Wait a bit and check again, or rely on onAuthStateChange
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (session) {
                        setUserRole(session.user.user_metadata?.role?.toLowerCase());
                        setVerifying(false);
                    }
                });

                // Timeout after 5 seconds if no session found
                const timeout = setTimeout(() => {
                    if (verifying) {
                        setError("Invalid or expired reset link. Please request a new one.");
                        setVerifying(false);
                    }
                }, 5000);

                return () => {
                    subscription.unsubscribe();
                    clearTimeout(timeout);
                };
            }
        };
        checkSession();
    }, []);

    const showMessage = (title, message, isSuccess = true, redirectPath = "/login") => {
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
                if (isSuccess) {
                    navigate(redirectPath);
                }
            };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resetPassword(password);
            if (result.success) {
                setSuccess(true);
                // Determine redirect path based on user role from result or state
                const user = result.data?.user;
                const role = (user?.user_metadata?.role || userRole || 'staff').toLowerCase();
                const redirectPath = role === 'patient' ? "/login?type=patient" : "/login";
                
                showMessage("Success", "Your password has been reset successfully.", true, redirectPath);
            } else {
                setError(result.error);
                showMessage("Error", result.error, false);
            }
        } catch (err) {
            console.error("Reset Password Error:", err);
            setError("An unexpected error occurred.");
            showMessage("Error", "An unexpected error occurred.", false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-sm shadow-xl border-t-4 border-green-600">
                <div className="flex justify-center items-center mt-6">
                    <img src={Logo} alt="Logo" className="w-[190px] h-20 object-contain" />
                </div>

                <CardHeader>
                    <CardTitle className="text-center text-green-700">Reset Password</CardTitle>
                    <p className="text-center text-sm text-gray-500">Enter your new password below.</p>
                </CardHeader>

                <CardContent>
                    {verifying ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                            <p className="text-sm text-gray-500">Verifying your reset link...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

                            <Button type="submit" className="w-full bg-[#047a52] hover:bg-[#03503a] text-white" disabled={isSubmitting || !!error && !password}>
                                {isSubmitting ? "Resetting..." : "Reset Password"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => navigate(userRole === 'patient' ? "/login?type=patient" : "/login")}
                                className="w-full text-sm text-gray-600 hover:underline"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}
                </CardContent>
            </Card>
            <div id="message-box"></div>
        </div>
    );
}

export default ResetPassword;
