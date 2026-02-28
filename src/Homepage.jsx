import React, { useState, useContext } from 'react';
import PatientSidebar from "@/components/PatientSidebar";
import { PatientContext } from "./PatientContext";
import { Bell, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";

//THIS IS THE PATIENT DASHBOARD IN PATIENT UI
const Homepage = () => {
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  const { patients, activePatient, notifications, markNotificationsRead, clearNotifications } = useContext(PatientContext);
  const [showNotifications, setShowNotifications] = useState(false);
  // State for specialization filter and search
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle ?showNotifications=true from sidebar
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showNotifications') === 'true') {
      setShowNotifications(true);
      markNotificationsRead();
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Get current day of the week
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Updated function to check if doctor is available today
  const isDoctorAvailableToday = (scheduleArray) => {
    const currentDay = getCurrentDay();

    // If no schedule array, return false
    if (!scheduleArray || scheduleArray.length === 0) return false;

    // Check each schedule entry
    for (const entry of scheduleArray) {
      // If it's an appointment-only doctor, return false (not walk-in available)
      if (entry.type === "byAppointment") return false;

      // If no days property, skip
      if (!entry.days) continue;

      const scheduleDays = entry.days.toLowerCase();

      // Handle "Mon - Sat" or "Mon - Fri" format
      if (scheduleDays.includes('-')) {
        if (scheduleDays.includes('mon - sat')) {
          if (currentDay !== 'Sunday') return true;
        }
        if (scheduleDays.includes('mon - fri')) {
          if (currentDay !== 'Saturday' && currentDay !== 'Sunday') return true;
        }
        if (scheduleDays.includes('mon - wed')) {
          if (['Monday', 'Tuesday', 'Wednesday'].includes(currentDay)) return true;
        }
        if (scheduleDays.includes('thu - fri')) {
          if (['Thursday', 'Friday'].includes(currentDay)) return true;
        }
      }

      // Handle specific days like "Mon, Wed, Fri" or "Tue, Thu, Sat"
      const dayAbbreviations = {
        'Monday': 'mon',
        'Tuesday': 'tue',
        'Wednesday': 'wed',
        'Thursday': 'thu',
        'Friday': 'fri',
        'Saturday': 'sat',
        'Sunday': 'sun'
      };

      const currentDayAbbr = dayAbbreviations[currentDay];
      if (scheduleDays.includes(currentDayAbbr)) return true;
    }

    return false;
  };

  // Specialization categories mapping
  const specializationCategories = {
    'all': {
      label: 'All Doctors',
      doctorIds: []
    },
    'pediatrics': {
      label: 'Pediatrics',
      doctorIds: [1, 2] // Melissa, Genevive
    },
    'internalMedicine': {
      label: 'Internal Medicine',
      doctorIds: [3] // Cynthia
    },
    'infectiousDisease': {
      label: 'Infectious Disease',
      doctorIds: [4] // Edrian
    },
    'nephrology': {
      label: 'Nephrology',
      doctorIds: [5, 6, 7] // Feb, Tanya, Maricar
    },
    'obgyn': {
      label: 'OB-GYN',
      doctorIds: [8, 9, 10, 11] // Elvira, Clarissa Mae, Herschel Charisse, Cecille
    },
    'orthopedicsUrology': {
      label: 'Orthopedics & Urology',
      doctorIds: [12] // Richard
    },
    'generalSurgery': {
      label: 'General Surgery',
      doctorIds: [13, 14] // Rajiv, Jefferson
    },
    'ent': {
      label: 'ENT',
      doctorIds: [15] // Rhea Jeanne
    }
  };

  // Doctor data with schedules
  const doctors = [
    {
      id: 1,
      name: "Dr. Melissa B. Edic",
      specializations: ["pedia", "follow-up"],
      schedule: [
        { days: "Thu - Fri", time: "9:00 AM - 11:00 PM" },
        { days: "Thu - Fri", time: "2:00 AM - 5:00 PM" },
        { days: "Wednesday", frequency: "2nd and 4th", time: "9:00 AM - 3:00 PM" },
        { days: "Saturday", frequency: "1st and 3rd", time: "9:00 AM - 3:00 PM" }
      ]
    },
    {
      id: 2,
      name: "Dr. Genevive Bandiwan-Laking",
      specializations: ["pedia", "follow-up"],
      schedule: [
        { type: "byAppointment", note: "Book an appointment to arrange" }
      ]
    },
    {
      id: 3,
      name: "Dr. Cynthia Moran",
      specializations: [
        "adult", "senior", "preventive", "follow-up",
        "cbc", "platelet", "esr", "abo",
        "fbs", "rbs", "hba1c",
        "lipid", "totalCh", "triglycerides", "hdl", "ldl",
        "alt", "ast", "uric", "creatinine", "bun",
        "albumin", "totalProtein", "alp", "phosphorus",
        "sodium", "potassium", "chloride", "ionizedCal", "totalCal", "magnesium"
      ],
      schedule: [
        { days: "Wed", time: "9:00 AM - 12:00 PM" }
      ]
    },
    {
      id: 4,
      name: "Dr. Edrian O. Geronimo",
      specializations: [
        "adult", "senior", "preventive", "follow-up",
        "cbc", "platelet", "esr", "abo",
        "hbsag", "vdrl", "antiHCV", "hpylori",
        "dengueIg", "dengueNs1", "dengueDuo", "typhidot"
      ],
      schedule: [
        { days: "Tue, Thu", time: "9:00 AM - 12:00 PM" }
      ]
    },
    {
      id: 5,
      name: "Dr. Feb Golocan-Alquiza",
      specializations: ["fbs", "rbs", "creatinine", "bun", "hba1c"],
      schedule: [
        { days: "Mon, Tue, Thu", time: "1:00 PM - 5:00 PM" }
      ]
    },
    {
      id: 6,
      name: "Dr. Tanya Charissa Diomampo",
      specializations: ["creatinine", "bun", "hba1c"],
      schedule: [
        { days: "Wed", time: "1:00 PM - 5:00 PM" },
        { days: "Sat", time: "10:00 AM - 1:00 PM" }
      ]
    },
    {
      id: 7,
      name: "Dr. Maricar Josephine A. Geronimo",
      specializations: ["lipid", "totalCh", "triglycerides", "hdl", "ldl", "fbs", "rbs"],
      schedule: [
        { days: "Fri", time: "1:00 PM - 5:00 PM" }
      ]
    },
    {
      id: 8,
      name: "Dr. Elvira T. Lampacan",
      specializations: ["pregnancyT", "follow-up"],
      schedule: [
        { days: "Wed, Fri", time: "9:30 AM - 12:00 PM" },
        { days: "Thu", time: "1:00 PM - 3:00 PM" }
      ]
    },
    {
      id: 9,
      name: "Dr. Clarissa Mae L. Lee",
      specializations: ["pregnancyT", "follow-up"],
      schedule: [
        { days: "Mon, Tue", time: "9:30 AM - 12:00 PM" },
        { days: "Sat", time: "1:00 PM - 3:00 PM" }
      ]
    },
    {
      id: 10,
      name: "Dr. Herschel Charisse C. Rivera-Ang",
      specializations: ["pregnancyT", "follow-up"],
      schedule: [
        { days: "Mon - Wed", time: "1:00 PM - 3:00 PM" }
      ]
    },
    {
      id: 11,
      name: "Dr. Cecille P. Pating",
      specializations: ["pregnancyT", "follow-up"],
      schedule: [
        { days: "Thu, Sat", time: "9:30 AM - 12:00 PM" },
        { days: "Fri", time: "1:00 PM - 3:00 PM" }
      ]
    },
    {
      id: 12,
      name: "Dr. Richard S. Ang",
      specializations: ["follow-up", "psa"],
      schedule: [
        { days: "Mon - Fri", time: "8:00 AM - 5:00 PM" }
      ]
    },
    {
      id: 13,
      name: "Dr. Rajiv D. Laoagan",
      specializations: ["generalSurgery"],
      schedule: [
        { days: "Thu", time: "8:00 AM - 5:00 PM" },
        { days: "Fri, Sat", time: "8:00 AM - 12:00 PM" }
      ]
    },
    {
      id: 14,
      name: "Dr. Jefferson Richmond G. Chomenwey",
      specializations: ["generalSurgery"],
      schedule: [
        { type: "byAppointment", note: "Book an appointment to arrange" }
      ]
    },
    {
      id: 15,
      name: "Dr. Rhea Jeanne L. Awas",
      specializations: ["ent"],
      schedule: [
        { days: "Mon, Tue, Wed", time: "8:00 AM - 5:00 PM" }
      ]
    }
  ];

  // Filter doctors based on selected specialization and search query
  const getFilteredDoctors = () => {
    let result = doctors;

    if (selectedSpecialization !== 'all') {
      const categoryDoctorIds = specializationCategories[selectedSpecialization].doctorIds;
      result = result.filter(doctor => categoryDoctorIds.includes(doctor.id));
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(doctor => doctor.name.toLowerCase().includes(lowerQuery));
    }

    return result;
  };

  const filteredDoctors = getFilteredDoctors();

  return (
    <div className="flex w-full min-h-screen">
      <PatientSidebar nav={nav} handleNav={handleNav} hideToggle={true} />

      <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            {/* Desktop: Side by side layout */}
            <div className="hidden sm:flex items-center justify-between mb-3 pt-12 lg:pt-8">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Homepage</h1>
                  <p className="text-xs sm:text-sm text-gray-600">De Valley Medical Clinic Queue Management</p>
                </div>
              </div>

              {/* Notification Icon */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) markNotificationsRead();
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                >
                  <Bell className="h-6 w-6 text-gray-600" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Recent Activity</h3>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] font-bold">
                          {notifications.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotifications();
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                          >
                            Clear All
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <AiOutlineClose size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-gray-200" />
                          </div>
                          <p className="text-sm font-bold text-gray-400">All caught up!</p>
                          <p className="text-[11px] text-gray-300 mt-1">No new notifications at the moment.</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-all cursor-default ${!notification.read ? 'bg-green-50/30' : 'bg-white'}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 shadow-sm ${notification.type === 'accepted' ? 'bg-green-500 ring-4 ring-green-100' : 'bg-red-500 ring-4 ring-red-100'}`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${notification.type === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                                    {notification.type === 'accepted' ? 'Appointment Accepted' : 'Appointment Declined'}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[13px] font-bold text-gray-800 leading-snug">{notification.message}</p>
                                <p className="text-[10px] font-medium text-gray-400 mt-2 flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(notification.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:hidden flex items-center justify-between mb-4 pt-10 pb-2 px-1">
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Homepage</h1>
                <p className="text-[15px] uppercase text-gray-600 tracking-wider">Valley Care Medical</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Notification Icon */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) markNotificationsRead();
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                  >
                    <Bell className="h-5 w-5 text-gray-600" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute top-0 right-0 block h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-tight">Notifications</h3>
                        <div className="flex items-center gap-3">
                          {notifications.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotifications();
                              }}
                              className="text-[10px] font-bold text-red-500 uppercase tracking-wider"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-gray-400"
                          >
                            <AiOutlineClose size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-xs font-bold text-gray-400">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors ${!notification.read ? 'bg-green-50/30' : 'bg-white'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notification.type === 'accepted' ? 'bg-green-500 ring-2 ring-green-100' : 'bg-red-500 ring-2 ring-red-100'}`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-800 leading-tight">{notification.message}</p>
                                  <p className="text-[9px] font-medium text-gray-400 mt-1">
                                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Hamburger Toggle */}
                <button
                  onClick={handleNav}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 z-[60]"
                >
                  {nav ? <AiOutlineClose size={22} /> : <AiOutlineMenu size={22} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Doctor Duty Schedule */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Doctor Duty Schedule</h2>
            <p className="text-sm text-gray-600 mb-6">View our doctors' specializations and availability</p>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search doctor by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Specialization Filter Buttons */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Specialization</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(specializationCategories).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedSpecialization(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedSpecialization === key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <div className="mt-4 text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredDoctors.length}</span> doctor{filteredDoctors.length !== 1 ? 's' : ''}
                {selectedSpecialization !== 'all' && (
                  <span> in <span className="font-semibold">{specializationCategories[selectedSpecialization].label}</span></span>
                )}
              </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map(doctor => (
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor.schedule) ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Available</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>Not Available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {doctor.specializations.map((spec, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Schedule</p>
                      <div className="space-y-2">
                        {doctor.schedule.map((entry, idx) => (
                          <div key={idx} className="space-y-1">
                            {entry.type === "byAppointment" ? (
                              <div className="text-sm text-gray-700 italic">
                                <span className="font-medium">{entry.note}</span>
                              </div>
                            ) : (
                              <>
                                {entry.days && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-700 font-medium">
                                      {entry.days}
                                      {entry.frequency && <span className="text-xs text-gray-500 ml-1">({entry.frequency})</span>}
                                    </span>
                                  </div>
                                )}
                                {entry.time && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-700 font-medium">{entry.time}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet List View */}
            <div className="lg:hidden space-y-4">
              {filteredDoctors.map(doctor => (
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor.schedule) ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-medium mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Available</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>Not Available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Specializations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {doctor.specializations.map((spec, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Schedule</p>
                      <div className="space-y-2">
                        {doctor.schedule.map((entry, idx) => (
                          <div key={idx} className="text-sm text-gray-700">
                            {entry.type === "byAppointment" ? (
                              <p className="italic">{entry.note}</p>
                            ) : (
                              <>
                                {entry.days && <p className="font-medium">{entry.days}</p>}
                                {entry.time && <p className="text-gray-600">{entry.time}</p>}
                                {entry.frequency && <p className="text-xs text-gray-500">({entry.frequency})</p>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No results message */}
            {filteredDoctors.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No doctors available for this specialization.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;