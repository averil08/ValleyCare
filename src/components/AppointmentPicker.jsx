import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

const AppointmentPicker = ({ 
  selectedDateTime, 
  onDateTimeChange, 
  getAvailableSlots 
}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);

  // ✅ ADD THIS NEW useEffect - Initialize from props
  useEffect(() => {
    if (selectedDateTime) {
      const dateTime = new Date(selectedDateTime);
      
      // Set the date
      setSelectedDate(dateTime);
      
      // Set the time in HH:MM format
      const hours = dateTime.getHours().toString().padStart(2, '0');
      const minutes = dateTime.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
      
      console.log('📅 Restored appointment picker state:', {
        date: dateTime.toLocaleDateString(),
        time: `${hours}:${minutes}`
      });
    }
  }, []); // Empty dependency - only run once on mount

  // Define available time slots (8:00 AM - 5:00 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 16; hour++) {
      // First 30-minute slot (e.g., 8:00 - 8:30)
      const startTime1 = `${hour.toString().padStart(2, '0')}:00`;
      const endTime1 = `${hour.toString().padStart(2, '0')}:30`;
      slots.push({
        value: startTime1,
        label: `${formatTime(hour, 0)} - ${formatTime(hour, 30)}`,
        hour: hour,
        minute: 0
      });

      // Second 30-minute slot (e.g., 8:30 - 9:00)
      // Don't add the 5:30-6:00 slot since clinic closes at 5:00 PM
      if (hour < 16) {
        const startTime2 = `${hour.toString().padStart(2, '0')}:30`;
        const endTime2 = `${(hour + 1).toString().padStart(2, '0')}:00`;
        slots.push({
          value: startTime2,
          label: `${formatTime(hour, 30)} - ${formatTime(hour + 1, 0)}`,
          hour: hour,
          minute: 30
        });
      }
    }
    return slots;
  };

  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const dateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onDateTimeChange(dateTime.toISOString());
    } else if (!selectedDate && !selectedTime && selectedDateTime) {
      // Don't clear if we're just initializing
      return;
    } else if (!selectedDate || !selectedTime) {
      // Clear the parent state if user deselects
      onDateTimeChange('');
    }
  }, [selectedDate, selectedTime, selectedDateTime, onDateTimeChange]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleTimeSelect = (e) => {
    setSelectedTime(e.target.value);
  };

  const getSlotAvailability = (timeValue) => {
    if (!selectedDate || !timeValue) return 0;
    
    // ✅ ADD THIS: Check if function exists
    if (typeof getAvailableSlots !== 'function') {
      console.warn('getAvailableSlots not yet available');
      return 1; // Return default value
    }
    
    const testDate = new Date(selectedDate);
    const [hours, minutes] = timeValue.split(':');
    testDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return getAvailableSlots(testDate.toISOString());
  };

  // Disable past dates
  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    }
    return false;
  };

  // Custom tile content to show availability
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        return 'past-date';
      }
      
      // Line 109 fix:
      const hasAvailableSlots = timeSlots.some(slot => {
        const testDate = new Date(date);
        const [hours, minutes] = slot.value.split(':');
        testDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // ADD THIS CHECK: Ensure the function exists before calling it
        return typeof getAvailableSlots === 'function' ? getAvailableSlots(testDate.toISOString()) > 0 : false;
      });

      if (hasAvailableSlots) {
        return 'available-date';
      } else {
        return 'fully-booked-date';
      }
    }
    return null;
  };

  const currentAvailableSlots = typeof getAvailableSlots === 'function' 
  ? getSlotAvailability(selectedTime) 
  : 1;

  return (
    <div className="space-y-6">
      <style>{`
        .react-calendar {
          width: 100%;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 16px;
          background: white;
          font-family: inherit;
        }
        
        .react-calendar__navigation {
          display: flex;
          margin-bottom: 16px;
        }
        
        .react-calendar__navigation button {
          font-size: 16px;
          font-weight: 600;
          color: #047857;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
        }
        
        .react-calendar__navigation button:enabled:hover {
          background-color: #d1fae5;
          border-radius: 4px;
        }
        
        .react-calendar__month-view__weekdays {
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          color: #047857;
        }
        
        .react-calendar__month-view__weekdays__weekday {
          padding: 8px;
        }
        
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        
        .react-calendar__tile {
          padding: 12px 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .react-calendar__tile:enabled:hover {
          background-color: #d1fae5;
          transform: scale(1.05);
        }
        
        .react-calendar__tile--active {
          background: #059669 !important;
          color: white !important;
          font-weight: bold;
          border: 2px solid #047857 !important;
        }
        
        .react-calendar__tile--now {
          background: #dbeafe;
          font-weight: 600;
        }
        
        .past-date {
          background: #f3f4f6 !important;
          color: #9ca3af !important;
          cursor: not-allowed !important;
        }
        
        .available-date {
          background: #d1fae5;
          color: #047857;
          font-weight: 500;
        }
        
        .fully-booked-date {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>

      {/* Date Selection */}
      <div>
        <Label className="text-green-700 font-bold text-lg mb-3 block">
          Select Date *
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          Earliest available appointment: <span className="font-semibold text-green-700">
            {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </p>
        <p className="text-sm text-red-600 mb-4 font-medium">
          To the extent possible, additional slots are made regularly.
        </p>
        
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          minDate={new Date()}
          tileDisabled={tileDisabled}
          tileClassName={tileClassName}
        />

        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
            <span>Fully Booked</span>
          </div>
        </div>
      </div>

      {/* Time Selection - Dropdown */}
      {selectedDate && (
        <div className="space-y-3">
          <Label htmlFor="timeSlot" className="text-green-700 font-bold text-lg">
            Select Time *
          </Label>
          <select
            id="timeSlot"
            value={selectedTime}
            onChange={handleTimeSelect}
            className="w-full border-2 border-gray-300 rounded-md p-3 text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            required
          >
            <option value="">-- Choose a time slot --</option>
            {timeSlots.map((slot) => {
              // ✅ ADD THIS: Safe slot availability check
              const availableSlots = typeof getAvailableSlots === 'function' 
                ? getSlotAvailability(slot.value) 
                : 1;
              const isFullyBooked = availableSlots <= 0;

              return (
                <option 
                  key={slot.value} 
                  value={slot.value}
                  disabled={isFullyBooked}
                >
                  {slot.label} {isFullyBooked ? '(Fully Booked)' : `(${availableSlots} slot${availableSlots !== 1 ? 's' : ''} available)`}
                </option>
              );
            })}
          </select>

          {/* Availability Indicator */}
          {selectedTime && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              currentAvailableSlots > 0 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className={`w-5 h-5 ${
                currentAvailableSlots > 0 ? 'text-blue-600' : 'text-red-600'
              }`} />
              <div>
                <p className={`font-semibold text-sm ${
                  currentAvailableSlots > 0 ? 'text-blue-900' : 'text-red-900'
                }`}>
                  {currentAvailableSlots > 0 ? 'Slot available' : 'Slot not available'}
                </p>
                <p className={`text-xs ${
                  currentAvailableSlots > 0 ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {currentAvailableSlots > 0 
                    ? 'Book now to secure your appointment' 
                    : 'This time is already booked, please select another time'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Appointment Summary */}
      {selectedDate && selectedTime && currentAvailableSlots > 0 && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <p className="font-semibold text-green-900 mb-1">✓ Selected Appointment:</p>
          <p className="text-green-800">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {' at '}
            {timeSlots.find(slot => slot.value === selectedTime)?.label}
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentPicker;