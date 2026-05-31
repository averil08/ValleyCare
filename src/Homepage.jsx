import React, { useState, useContext } from 'react';
import { useNavigate } from "react-router-dom";
import PatientSidebar from "@/components/PatientSidebar";
import { PatientContext } from "./PatientContext";
import { Bell, Clock, TicketCheck, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { specializationCategories } from "./doctorData";

const Homepage = () => {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  const { patients, activePatient, notifications, markNotificationsRead, clearNotifications, allDoctors } = useContext(PatientContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingSuccessModal, setShowBookingSuccessModal] = useState(false);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('showNotifications') === 'true') {
      setShowNotifications(true);
      markNotificationsRead();
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (params.get('booking_success') === 'true') {
      setShowBookingSuccessModal(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };
  const isDoctorAvailableToday = (doctor) => {
    if (!doctor || !doctor.availability) return false;

    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentDayOfMonth = now.getDate();
    const currentWeekOfMonth = Math.ceil(currentDayOfMonth / 7);

    if (doctor.id === 14) return false;

    return doctor.availability.some(range => {
      const dayMatches = range.days.includes(currentDayIndex);
      if (!dayMatches) return false;

      if (range.weeksOfMonth && !range.weeksOfMonth.includes(currentWeekOfMonth)) {
        return false;
      }

      return true;
    });
  };


  const getFilteredDoctors = () => {
    let result = allDoctors;

    if (selectedSpecialization !== 'all') {
      result = result.filter(doc => {
        const staticIds = specializationCategories[selectedSpecialization]?.doctorIds || [];
        if (staticIds.includes(doc.id)) return true;

        const specMap = {
          'Pediatrics': 'pediatrics',
          'Internal Medicine': 'internalMedicine',
          'Nephrology': 'nephrology',
          'OB-GYN': 'obgyn',
          'Orthopedics & Urology': 'orthopedicsUrology',
          'Orthopedic Surgery': 'orthopedicsUrology',
          'General Surgery': 'generalSurgery',
          'ENT': 'ent'
        };
        const docSpecKey = specMap[doc.specialization];
        return docSpecKey === selectedSpecialization;
      });
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(doctor => doctor.name.toLowerCase().includes(lowerQuery));
    }

    return result;
  };

  const filteredDoctors = getFilteredDoctors();

  const SERVICE_CATEGORY_MAP = {
    pedia: 'General Consultation',
    adult: 'General Consultation',
    senior: 'General Consultation',
    preventive: 'General Consultation',
    'follow-up': 'General Consultation',
    // Hematology
    cbc: 'Hematology',
    platelet: 'Hematology',
    esr: 'Hematology',
    abo: 'Hematology',
    // Immunology & Serology
    hbsag: 'Immunology & Serology',
    vdrl: 'Immunology & Serology',
    antiHCV: 'Immunology & Serology',
    hpylori: 'Immunology & Serology',
    dengueIg: 'Immunology & Serology',
    dengueNs1: 'Immunology & Serology',
    dengueDuo: 'Immunology & Serology',
    typhidot: 'Immunology & Serology',
    // Clinical Chemistry
    fbs: 'Clinical Chemistry',
    rbs: 'Clinical Chemistry',
    lipid: 'Clinical Chemistry',
    totalCh: 'Clinical Chemistry',
    triglycerides: 'Clinical Chemistry',
    hdl: 'Clinical Chemistry',
    ldl: 'Clinical Chemistry',
    alt: 'Clinical Chemistry',
    ast: 'Clinical Chemistry',
    uric: 'Clinical Chemistry',
    creatinine: 'Clinical Chemistry',
    bun: 'Clinical Chemistry',
    hba1c: 'Clinical Chemistry',
    albumin: 'Clinical Chemistry',
    magnesium: 'Clinical Chemistry',
    totalProtein: 'Clinical Chemistry',
    alp: 'Clinical Chemistry',
    phosphorus: 'Clinical Chemistry',
    sodium: 'Clinical Chemistry',
    potassium: 'Clinical Chemistry',
    ionizedCal: 'Clinical Chemistry',
    totalCal: 'Clinical Chemistry',
    chloride: 'Clinical Chemistry',
    tsh: 'Clinical Chemistry',
    ft3: 'Clinical Chemistry',
    '75g': 'Clinical Chemistry',
    t4: 'Clinical Chemistry',
    t3: 'Clinical Chemistry',
    psa: 'Clinical Chemistry',
    totalBilirubin: 'Clinical Chemistry',
    // Clinical Microscopy & Parasitology
    urinalysis: 'Clinical Microscopy & Parasitology',
    fecalysis: 'Clinical Microscopy & Parasitology',
    pregnancyT: 'Clinical Microscopy & Parasitology',
    fecal: 'Clinical Microscopy & Parasitology',
    semen: 'Clinical Microscopy & Parasitology',
    // Surgery
    'general surgery': 'Surgery',
    generalSurgery: 'Surgery',
    orthopedic: 'Surgery',
    // ENT
    ent: 'ENT',
  };

  const getServiceCategories = (specializations) => {
    const seen = new Set();
    const categories = [];
    (specializations || []).forEach(spec => {
      const cat = SERVICE_CATEGORY_MAP[spec] || (spec.charAt(0).toUpperCase() + spec.slice(1));
      if (!seen.has(cat)) {
        seen.add(cat);
        categories.push(cat);
      }
    });
    return categories;
  };

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
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-green-600" />
                        <h3 className="font-bold text-gray-800">Recent Activity</h3>
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
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-default ${!notification.read ? 'bg-green-50/30' : 'bg-white'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'accepted' ? 'bg-green-50' :
                                  notification.type === 'follow-up' ? 'bg-blue-50' : 'bg-red-50'
                                }`}>
                                {notification.type === 'accepted' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : notification.type === 'follow-up' ? (
                                  <Clock className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {notification.type === 'accepted' ? 'Appointment Accepted' :
                                      notification.type === 'follow-up' ? 'Follow-up Requested' : 'Appointment Declined'}
                                  </p>
                                  <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap mt-0.5">
                                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                    {new Date(notification.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
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
                    <div className="absolute right-[-40px] mt-2 w-[calc(100vw-32px)] max-w-sm sm:right-0 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-green-600" />
                          <h3 className="font-bold text-gray-800">Notifications</h3>
                        </div>
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
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-400">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors ${!notification.read ? 'bg-green-50/30' : 'bg-white'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-1 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${notification.type === 'accepted' ? 'bg-green-50' : notification.type === 'follow-up' ? 'bg-blue-50' : 'bg-red-50'}`}>
                                  {notification.type === 'accepted' ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  ) : notification.type === 'follow-up' ? (
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                                      {notification.type === 'accepted' ? 'Accepted' : notification.type === 'follow-up' ? 'Follow-up' : 'Declined'}
                                    </p>
                                    <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap mt-0.5">
                                      {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 leading-tight">{notification.message}</p>
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
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-white to-gray-50 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor) ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Available Today</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>Not Available Today</span>
                        </div>
                      )}
                    </div>
                    {/* Consultation Price Badge */}
                    <div className="ml-2 shrink-0 flex flex-col items-end">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Consultation</span>
                      <span className="text-base font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg leading-tight">
                        ₱{doctor.consultationPrice?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getServiceCategories(doctor.specializations).map((cat, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Schedule</p>
                      <div className="text-sm text-gray-700 font-medium leading-relaxed">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{doctor.schedule}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-auto">
                    <button
                      onClick={() => navigate(`/checkin?view=patient&from=homepage&type=appointment&doctorId=${doctor.id}`)}
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2"
                    >
                      Book Doctor
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet List View */}
            <div className="lg:hidden space-y-4">
              {filteredDoctors.map(doctor => (
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor) ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-medium mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Available Today</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>Not Available Today</span>
                        </div>
                      )}
                    </div>
                    {/* Consultation Price Badge */}
                    <div className="shrink-0 flex flex-col items-end ml-2">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Consultation</span>
                      <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg leading-tight">
                        ₱{doctor.consultationPrice?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Specializations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getServiceCategories(doctor.specializations).map((cat, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Schedule</p>
                      <p className="text-sm text-gray-700 leading-normal">{doctor.schedule}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-auto">
                    <button
                      onClick={() => navigate(`/checkin?view=patient&from=homepage&type=appointment&doctorId=${doctor.id}`)}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      Book Doctor
                    </button>
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

      {/* BOOKING SUCCESS MODAL */}
      {showBookingSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 text-center bg-gradient-to-b from-green-50 to-white">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-2 border-green-200">
                <TicketCheck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase  mb-3">Booking Submitted!</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Your appointment request is pending. To view your status, please head   over to the <span className="text-green-600">‘Book Appointment’</span> section in your sidebar.
              </p>
              <button
                onClick={() => setShowBookingSuccessModal(false)}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-green-200 transition-all hover:-translate-y-0.5"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Homepage;