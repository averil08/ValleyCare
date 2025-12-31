import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import LandingPage from "./LandingPage";
import Signup from "./Signup";
import Login from "./Login";
import QueueStatus from './QueueStatus';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import Checkin from './Checkin';
import Appointment from './Appointment';
import { PatientProvider } from './PatientContext';

function App() {
  return (
    <Router>
      {/* ✅ WRAP ENTIRE APP ONCE - All routes share same context */}
      <PatientProvider>
        <Routes>
          {/*<Route path="/" element={<LandingPage />} />*/}
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/qstatus" element={<QueueStatus />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/appointment" element={<Appointment />} />
        </Routes>
      </PatientProvider>
    </Router>
  );
}

export default App;