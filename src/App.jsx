import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import QueueStatus from './QueueStatus';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import Checkin from './Checkin';
import Appointment from './Appointment';
import { PatientProvider } from './PatientContext';
import PatientProfile from "./PatientProfile";
import Homepage from "./Homepage";
import AppointmentHistory from "./AppointmentHistory";
import ClinicTVDisplay from "./ClinicTVDisplay";
import PatientSettings from "./PatientSettings";
import DoctorSelection from "./DoctorSelection";


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for existing session on refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevents the "Blank Screen" while checking auth
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading System...</div>;
  }

  return (
    <Router>
      <PatientProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Example of Protected Route: If no session, send them to login */}
          <Route
            path="/dashboard"
            element={session ? <Dashboard /> : <Navigate to="/login" />}
          />

          {/* Add your other routes below */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/qstatus" element={<QueueStatus />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/patientprofile" element={<PatientProfile />} />
          <Route path="/homepage" element={<Homepage />} />
          <Route path="/appointmenthistory" element={<AppointmentHistory />} />
          <Route path="/clinic-tv" element={<ClinicTVDisplay />} />
          <Route path="/patient-settings" element={<PatientSettings />} />
          <Route path="/doctor-selection" element={<DoctorSelection />} />
        </Routes>
      </PatientProvider>
    </Router>
  );
}

export default App;