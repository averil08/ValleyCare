import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, ChartNoAxesCombined, TicketCheck, Calendar, DoorOpen, NotebookText, CircleUserRound, Settings } from "lucide-react";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import img1 from '../assets/logo-valley.png';
import { PatientContext } from '../PatientContext';

const PatientSidebar = ({ nav, handleNav, hideToggle = false }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Get setActivePatient from context
  const { setActivePatient } = useContext(PatientContext);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);

    // ✅ NEW: Clear patient identity data on logout
    localStorage.removeItem('currentPatientEmail');
    localStorage.removeItem('isPatientLoggedIn');
    // ✅ ADD THIS: Clear active patient session
    setActivePatient(null);

    // Navigate to home
    navigate("/");
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-gray-50 border-r border-gray-300 shadow-lg flex-col">
        <img className="w-[175px] m-4" src={img1} alt="Logo" />
        <ul className="mt-8 text-sm text-gray-700">
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={() => navigate("/homepage")}>
            <Users className="w-5 h-5 text-green-600 group-hover:text-white" />
            Patient Homepage
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={() => navigate("/checkin?view=patient&from=patient-sidebar&type=appointment")}>
            <Calendar className="w-5 h-5 text-green-600 group-hover:text-white" />
            Book Appointment
          </li>

          <li className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white hover:cursor-pointer" onClick={() => navigate("/appointmenthistory")}>
            <NotebookText className="w-5 h-5 text-green-600 group-hover:text-white" />
            Patient Profile
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white hover:cursor-pointer"
            onClick={() => navigate("/patient-settings")}>
            <Settings className="w-5 h-5 text-green-600 group-hover:text-white" />
            Profile Settings
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={handleLogoutClick}>
            <DoorOpen className="w-5 h-5 text-green-600 group-hover:text-white" />
            Log Out
          </li>
        </ul>
      </div>

      {/* MOBILE HAMBURGER ICON */}
      {!hideToggle && (
        <div
          className="md:hidden fixed top-10 right-10 z-50 pt-1"
          onClick={handleNav}>
          {nav ? <AiOutlineClose size={24} /> : <AiOutlineMenu size={24} />}
        </div>
      )}

      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed top-0 left-0 w-64 h-full bg-white z-50 shadow-lg transform transition-transform duration-300
          ${nav ? "translate-x-0" : "-translate-x-full"} md:hidden`}>
        <img className="w-[175px] m-10" src={img1} alt="Logo" />
        <ul className="mt-10 text-sm text-gray-700">
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={() => navigate("/homepage")}>
            <Users className="w-5 h-5 text-green-600 group-hover:text-white" />
            Patient Homepage
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={() => navigate("/checkin?view=patient&from=patient-sidebar&type=appointment")}>
            <Calendar className="w-5 h-5 text-green-600 group-hover:text-white" />
            Book Appointment
          </li>
          <li className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white hover:cursor-pointer" onClick={() => navigate("/appointmenthistory")}>
            <NotebookText className="w-5 h-5 text-green-600 group-hover:text-white" />
            Patient Profile
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white hover:cursor-pointer"
            onClick={() => navigate("/patient-settings")}>
            <Settings className="w-5 h-5 text-green-600 group-hover:text-white" />
            Profile Settings
          </li>
          <li
            className="group p-4 flex items-center gap-2 hover:bg-green-600 hover:text-white cursor-pointer"
            onClick={handleLogoutClick}>
            <DoorOpen className="w-5 h-5 text-green-600 group-hover:text-white" />
            Log Out
          </li>
        </ul>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <DoorOpen className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Are you sure you want to log out? You'll need to sign in again to access the dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientSidebar;