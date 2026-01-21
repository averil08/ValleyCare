import React, { useState, useContext } from 'react';
import PatientSidebar from "@/components/PatientSidebar";
import { PatientContext } from "./PatientContext";

//THIS IS THE PATIENT DASHBOARD IN PATIENT UI
const Homepage = () => {
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  const { patients, activePatient } = useContext(PatientContext);

  // Get current day of the week
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Check if doctor is available today
  const isDoctorAvailableToday = (scheduleString) => {
    const currentDay = getCurrentDay();
    const scheduleDays = scheduleString.toLowerCase();
    
    // Handle "Mon - Sat" or "Mon - Fri" format
    if (scheduleDays.includes('-')) {
      if (scheduleDays.includes('mon - sat')) {
        return currentDay !== 'Sunday';
      }
      if (scheduleDays.includes('mon - fri')) {
        return currentDay !== 'Saturday' && currentDay !== 'Sunday';
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
    return scheduleDays.includes(currentDayAbbr);
  };

  // Doctor data with schedules
  const doctors = [
    { 
      id: 1, 
      name: "Dr. Sarah Gonzales", 
      specializations: ["Pediatric", "Preventive Care", "Follow-up"],
      schedule: { days: "Mon, Wed, Fri", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 2, 
      name: "Dr. John Martinez", 
      specializations: ["Adult Medicine", "Senior Care", "Preventive Care"],
      schedule: { days: "Tue, Thu, Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 3, 
      name: "Dr. Lisa Chen", 
      specializations: ["Pediatric", "Adult Medicine"],
      schedule: { days: "Mon, Wed, Fri", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 4, 
      name: "Dr. Michael Torres", 
      specializations: ["Hematology", "CBC", "Blood Testing"],
      schedule: { days: "Mon - Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 5, 
      name: "Dr. Anna Reyes", 
      specializations: ["Infectious Disease", "Hepatitis Testing", "STD Screening"],
      schedule: { days: "Tue, Thu, Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 6, 
      name: "Dr. Robert Kim", 
      specializations: ["Tropical Medicine", "Dengue Testing", "Typhoid Testing"],
      schedule: { days: "Mon, Wed, Fri", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 7, 
      name: "Dr. Emily Santos", 
      specializations: ["Endocrinology", "Diabetes Care", "Lipid Profile"],
      schedule: { days: "Mon - Fri", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 8, 
      name: "Dr. David Lee", 
      specializations: ["Internal Medicine", "Liver Function", "Kidney Function"],
      schedule: { days: "Tue, Thu, Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 9, 
      name: "Dr. Maria Garcia", 
      specializations: ["Clinical Chemistry", "Protein Testing", "Mineral Analysis"],
      schedule: { days: "Mon, Wed, Fri", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 10, 
      name: "Dr. James Wilson", 
      specializations: ["Electrolyte Testing", "Metabolic Panel", "Calcium Testing"],
      schedule: { days: "Mon - Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 11, 
      name: "Dr. Patricia Brown", 
      specializations: ["Urinalysis", "Pregnancy Testing", "Reproductive Health"],
      schedule: { days: "Tue, Thu, Sat", time: "8:00 AM - 5:00 PM" }
    },
    { 
      id: 12, 
      name: "Dr. Thomas Anderson", 
      specializations: ["Thyroid Specialist", "Hormone Testing", "Endocrine Disorders"],
      schedule: { days: "Mon - Fri", time: "8:00 AM - 5:00 PM" }
    }
  ];

  return (
    <div className="flex w-full min-h-screen">
      <PatientSidebar nav={nav} handleNav={handleNav} />

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
            </div>

            {/* Mobile: Stacked layout */}
            <div className="sm:hidden space-y-3 mb-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Homepage</h1>
                <p className="text-xs text-gray-600">De Valley Medical Clinic Queue Management</p>
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
            
            {/* Desktop Grid View */}
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map(doctor => (
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor.schedule.days) ? (
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
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specializations</p>
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700 font-medium">{doctor.schedule.days}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700 font-medium">{doctor.schedule.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet List View */}
            <div className="lg:hidden space-y-4">
              {doctors.map(doctor => (
                <div key={doctor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{doctor.name}</h3>
                      {isDoctorAvailableToday(doctor.schedule.days) ? (
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
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{doctor.schedule.days}</p>
                        <p className="text-gray-600">{doctor.schedule.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;