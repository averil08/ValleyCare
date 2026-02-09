import React, { useState, useContext } from 'react';
import { doctors } from './doctorData';
import { Label } from '@/components/ui/label';
import Sidebar from "@/components/Sidebar";
import { Clock, TrendingUp, Users, XCircle, CheckCircle2, Download, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logoImage from '@/assets/partner-logo.jpg'
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PatientContext } from "./PatientContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
//OUTDATED FILE
//THIS CONTAINS QUEUE TABLES FOR ALL & SPECIFIC DOCTORS
const Dashboard = () => {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  // NEW: State for doctor selection
  const [selectedDoctor, setSelectedDoctor] = useState(null); // null = general view, number = specific doctor
  const [viewMode, setViewMode] = useState('general'); // 'general' or 'doctor'
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // NEW: Date Filtering States
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'thisWeek', 'lastWeek', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Add to the destructured context (around line 32)
  const {
    patients,
    currentServing,
    setCurrentServing,
    updatePatientStatus,
    cancelPatient,
    avgWaitTime,
    addWaitTime,
    reduceWaitTime,
    getDoctorCurrentServing,
    callNextPatientForDoctor,
    cancelPatientForDoctor,
    // NEW: Add these
    activeDoctors,
    startDoctorQueue,
    stopDoctorQueue,
    isDoctorActive,
  } = useContext(PatientContext);

  const secretaryName = "Ms. Jenny Cruz";

  const serviceLabels = {
    pedia: "Pediatric", adult: "Adult", senior: "Senior (65+)",
    preventive: "Preventive Exam", "follow-up": "Follow-up",
    cbc: "CBC", platelet: "Platelet Count", esr: "ESR", abo: "Blood Type",
    hbsag: "HBsAg", vdrl: "VDRL/RPR", antiHCV: "Anti-HCV", hpylori: "H.PYLORI",
    dengueIg: "Dengue IgG+IgM", dengueNs1: "Dengue NS1", dengueDuo: "Dengue Duo",
    typhidot: "Typhidot", fbs: "FBS", rbs: "RBS", lipid: "Lipid Profile",
    totalCh: "Total Cholesterol", triglycerides: "Triglycerides", hdl: "HDL",
    ldl: "LDL", alt: "ALT/SGPT", ast: "AST/SGOT", uric: "Uric Acid",
    creatinine: "Creatinine", bun: "BUN", hba1c: "HBA1C", albumin: "Albumin",
    magnesium: "Magnesium", totalProtein: "Total Protein", alp: "ALP",
    phosphorus: "Phosphorus", sodium: "Sodium", potassium: "Potassium",
    ionizedCal: "Ionized Calcium", totalCal: "Total Calcium", chloride: "Chloride",
    urinalysis: "Urinalysis", fecalysis: "Fecalysis", pregnancyT: "Pregnancy Test",
    fecal: "Fecal Occult Blood", semen: "Semen Analysis", tsh: "TSH",
    ft3: "FT3", "75g": "75g OGTT", t4: "T4", t3: "T3", psa: "PSA",
    totalBilirubin: "Total/Direct Bilirubin"
  };

  const getServiceLabel = (serviceId) => serviceLabels[serviceId] || serviceId;

  const getCurrentViewLabel = () => {
    if (viewMode === 'general') return 'General Queue (All Doctors)';
    const doctor = doctors.find(d => d.id === selectedDoctor);
    return doctor ? doctor.name : 'Select Doctor';
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'thisWeek': return 'This Week';
      case 'lastWeek': return 'Last Week';
      case 'custom': return 'Custom Range';
      default: return 'Today';
    }
  };

  const isWithinDateRange = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();

    // Set 'now' as the reference for today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      return date >= startOfToday && date <= endOfToday;
    }

    if (dateFilter === 'thisWeek') {
      // Start of week = Sunday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // End of week = Saturday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return date >= startOfWeek && date <= endOfWeek;
    }

    if (dateFilter === 'lastWeek') {
      // Start of last week = Previous Sunday
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);

      // End of last week = Previous Saturday
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);

      return date >= startOfLastWeek && date <= endOfLastWeek;
    }

    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }

    return true;
  };

  // Download PDF Report Function
  const downloadReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // NEW: Determine if this is a doctor-specific report
    const isDoctorView = viewMode === 'doctor' && selectedDoctor;
    const doctorName = isDoctorView ? doctors.find(d => d.id === selectedDoctor)?.name : 'All Doctors';
    const reportTitle = isDoctorView ? `${doctorName} - Queue Report` : 'Dashboard Report (All Doctors)';

    // NEW: Format Analysis Period
    let analysisPeriod = getDateFilterLabel();
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      analysisPeriod = `${customStartDate} to ${customEndDate}`;
    } else if (dateFilter === 'today') {
      analysisPeriod = dateStr;
    } else if (dateFilter === 'thisWeek' || dateFilter === 'lastWeek') {
      const now = new Date();
      const offset = dateFilter === 'thisWeek' ? 0 : 7;
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      analysisPeriod = `${start.toLocaleDateString()} to ${end.toLocaleDateString()} (${getDateFilterLabel()})`;
    }

    // Helper function to format services and symptoms
    const formatArray = (arr) => {
      if (!arr || arr.length === 0) return 'None';
      return arr.map(item => getServiceLabel(item)).join(', ');
    };

    // Add logo - centered above clinic name
    const logoWidth = 30;
    const logoHeight = 30;
    const logoX = 105 - (logoWidth / 2); // Center the logo
    const logoY = 10;
    doc.addImage(logoImage, 'JPEG', logoX, logoY, logoWidth, logoHeight);

    // Clinic Name - positioned below logo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('De Valley Medical Clinic and Diagnostic Center, Inc.', 105, logoY + logoHeight + 10, { align: 'center' });

    // Report Title
    doc.setFontSize(13);
    doc.text(reportTitle, 105, logoY + logoHeight + 18, { align: 'center' });

    // Report Information - Two columns layout
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Left column
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 68);
    doc.text(`Analysis Period: ${analysisPeriod}`, 14, 74);

    // Right column (aligned to the right)
    doc.text(`Doctor: ${doctorName}`, 196, 68, { align: 'right' });
    doc.text(`Secretary: ${secretaryName}`, 196, 74, { align: 'right' });

    // Summary Stats
    doc.setFont(undefined, 'bold');
    doc.text('Summary Statistics', 14, 86);
    doc.setFont(undefined, 'normal');
    doc.text(`Current Serving: ${currentServing ? `#${String(currentServing).padStart(3, '0')}` : 'No Patient'}`, 14, 92);
    doc.text(`Average Wait Time: ${avgWaitTime} mins`, 14, 98);
    const totalWaitingForReport = viewMode === 'general'
      ? totalWaiting
      : filteredQueuePatients.filter(p => p.status === "waiting").length;

    doc.text(`Total Patients Waiting: ${totalWaitingForReport}`, 14, 104);

    let yPosition = 114;

    // Active Queue Patients - ONLY FOR TODAY
    if (dateFilter === 'today') {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Active Queue Patients', 14, yPosition);
      yPosition += 6;

      if (filteredQueuePatients.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Queue #', 'Name', 'Age', 'Phone', 'Doctor', 'Type', 'Symptoms', 'Services', 'Status']],
          body: filteredQueuePatients.map(patient => [
            `#${String(patient.queueNo).padStart(3, '0')}`,
            patient.name,
            patient.age,
            patient.phoneNum || 'N/A',
            patient.assignedDoctor?.name || 'Not Assigned',
            patient.type,
            formatArray(patient.symptoms),
            formatArray(patient.services),
            patient.status
          ]),
          headStyles: { fillColor: [1, 121, 185] },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          margin: { left: 10 },
          columnStyles: {
            0: { cellWidth: 18 },  // Queue #
            1: { cellWidth: 20 },  // Name
            2: { cellWidth: 12 },  // Age
            3: { cellWidth: 23 },  // Phone
            4: { cellWidth: 22 },  // Doctor
            5: { cellWidth: 20 },  // Type
            6: { cellWidth: 25 },  // Symptoms
            7: { cellWidth: 30 },  // Services
            8: { cellWidth: 20 }   // Status
          }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text('No active queue patients', 14, yPosition);
        yPosition += 10;
      }

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Priority Patients - ONLY FOR TODAY
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Priority Patients', 14, yPosition);
      yPosition += 6;

      if (filteredPriorityPatients.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Queue #', 'Name', 'Age', 'Phone', 'Doctor', 'Type', 'Symptoms', 'Services', 'Status']],
          body: filteredPriorityPatients.map(patient => [
            `#${String(patient.queueNo).padStart(3, '0')}`,
            patient.name,
            patient.age,
            patient.phoneNum || 'N/A',
            patient.assignedDoctor?.name || 'Not Assigned',
            patient.type,
            formatArray(patient.symptoms),
            formatArray(patient.services),
            patient.status
          ]),
          headStyles: {
            fillColor: [180, 138, 34]
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          margin: { left: 10 },
          columnStyles: {
            0: { cellWidth: 18 },  // Queue #
            1: { cellWidth: 20 },  // Name
            2: { cellWidth: 12 },  // Age
            3: { cellWidth: 23 },  // Phone
            4: { cellWidth: 22 },  // Doctor
            5: { cellWidth: 20 },  // Type
            6: { cellWidth: 25 },  // Symptoms
            7: { cellWidth: 30 },  // Services
            8: { cellWidth: 20 }   // Status
          }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text('No priority patients', 14, yPosition);
        yPosition += 10;
      }

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    }

    // Completed Patients
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Completed Patients', 14, yPosition);
    yPosition += 6;

    if (filteredDonePatients.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Queue #', 'Name', 'Age', 'Phone', 'Doctor', 'Type', 'Symptoms', 'Services']],
        body: filteredDonePatients.map(patient => [
          `#${String(patient.queueNo).padStart(3, '0')}`,
          patient.name,
          patient.age,
          patient.phoneNum || 'N/A',
          patient.assignedDoctor?.name || 'Not Assigned',
          patient.type,
          formatArray(patient.symptoms),  // NEW
          formatArray(patient.services)  // NEW
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 },
        margin: { left: 10 },
        columnStyles: {
          0: { cellWidth: 18 },  // Queue #
          1: { cellWidth: 20 },  // Name
          2: { cellWidth: 12 },  // Age
          3: { cellWidth: 23 },  // Phone
          4: { cellWidth: 25 },  // Doctor
          5: { cellWidth: 20 },  // Type
          6: { cellWidth: 35 },  // Symptoms (+7)
          7: { cellWidth: 37 }   // Services (+7)
        }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No completed patients', 14, yPosition);
      yPosition += 10;
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Cancelled Patients
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Cancelled Patients', 14, yPosition);
    yPosition += 6;

    if (filteredCancelPatients.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Queue #', 'Name', 'Age', 'Phone', 'Doctor', 'Type', 'Symptoms', 'Services']],
        body: filteredCancelPatients.map(patient => [
          `#${String(patient.queueNo).padStart(3, '0')}`,
          patient.name,
          patient.age,
          patient.phoneNum || 'N/A',
          patient.assignedDoctor?.name || 'Not Assigned',
          patient.type,
          formatArray(patient.symptoms),  // NEW
          formatArray(patient.services)
        ]),
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 8 },
        margin: { left: 10 },
        columnStyles: {
          0: { cellWidth: 18 },  // Queue #
          1: { cellWidth: 20 },  // Name
          2: { cellWidth: 12 },  // Age
          3: { cellWidth: 23 },  // Phone
          4: { cellWidth: 25 },  // Doctor
          5: { cellWidth: 20 },  // Type
          6: { cellWidth: 35 },  // Symptoms (+7)
          7: { cellWidth: 37 }   // Services (+7)
        }
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No cancelled patients', 14, yPosition);
    }

    // Save the PDF
    doc.save(`Dashboard_Report_${now.toISOString().split('T')[0]}.pdf`);
  };

  // Add this new function
  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return { text: 'Waiting', className: 'bg-yellow-100 text-yellow-700' };
      case 'in progress':
        return { text: 'In Progress', className: 'bg-blue-100 text-blue-700' };
      case 'done':
        return { text: 'Completed', className: 'bg-emerald-100 text-emerald-700' };
      case 'cancelled':
        return { text: 'Cancelled', className: 'bg-red-100 text-red-700' };
      default:
        return { text: status, className: 'bg-gray-100 text-gray-700' };
    }
  };


  const handleCallNext = () => {
    // ✅ NEW: If no one is currently being served, start the queue
    if (!currentServing) {
      // First check for priority patients from the FILTERED list
      // Sort by queueNo to ensure FIFO (Lowest queue number first)
      const sortedPriority = [...filteredPriorityPatients]
        .filter(p => p.status === "waiting")
        .sort((a, b) => a.queueNo - b.queueNo);

      const firstPriorityPatient = sortedPriority[0];

      if (firstPriorityPatient) {
        updatePatientStatus(firstPriorityPatient.queueNo, 'in progress');
        setCurrentServing(firstPriorityPatient.queueNo);
        return;
      }

      // Then check for regular waiting patients from the FILTERED list
      // Sort by queueNo to ensure FIFO (Lowest queue number first)
      const sortedWaiting = [...filteredQueuePatients]
        .filter(p => p.status === "waiting")
        .sort((a, b) => a.queueNo - b.queueNo);

      const firstWaitingPatient = sortedWaiting[0];

      if (firstWaitingPatient) {
        updatePatientStatus(firstWaitingPatient.queueNo, 'in progress');
        setCurrentServing(firstWaitingPatient.queueNo);
        return;
      }

      // No patients waiting
      return;
    }

    // ✅ EXISTING LOGIC: Mark current patient as done and call next
    // 1. Check if there is ALREADY a patient in progress and mark them as done
    const currentPatient = patients.find(p => p.queueNo === currentServing);

    if (currentPatient && currentPatient.status === 'in progress') {
      updatePatientStatus(currentPatient.queueNo, 'done');
    }

    // 2. Find the NEXT patient to call (Priority -> Regular)

    // Check filtered priority patients first
    const sortedPriority = [...filteredPriorityPatients]
      .filter(p => p.status === "waiting")
      .sort((a, b) => a.queueNo - b.queueNo);

    const nextPriorityPatient = sortedPriority[0];

    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      setCurrentServing(nextPriorityPatient.queueNo);
      return;
    }

    // If no priority patients, find the next regular waiting patient
    const sortedWaiting = [...filteredQueuePatients]
      .filter(p => p.status === "waiting")
      .sort((a, b) => a.queueNo - b.queueNo);

    const nextWaitingPatient = sortedWaiting[0];

    if (nextWaitingPatient) {
      // Mark the next waiting patient as in progress and sync the queue number
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
      setCurrentServing(nextWaitingPatient.queueNo);
    } else {
      // No more waiting patients, reset to null
      setCurrentServing(null);
    }
  };

  const handleCallSpecificPatient = (queueNo) => {
    // Mark current serving patient as done if there is one
    if (currentServing) {
      const currentPatient = patients.find(p => p.queueNo === currentServing);
      if (currentPatient && currentPatient.status === 'in progress') {
        updatePatientStatus(currentServing, 'done');
      }
    }

    // Mark the selected patient as in progress
    updatePatientStatus(queueNo, 'in progress');
    // Set them as the one currently being served
    setCurrentServing(queueNo);
  };

  const handleCancel = () => {
    const currentPatient = patients.find(p =>
      p.status === "in progress" && p.inQueue && !p.isInactive
    );

    // Mark current patient as cancelled if they exist
    if (currentPatient) {
      cancelPatient(currentPatient.queueNo);
    }

    // First, check if there are any waiting priority patients
    const nextPriorityPatient = patients.find(p =>
      p.status === "waiting" && p.inQueue && p.isPriority && !p.isInactive
    );

    if (nextPriorityPatient) {
      updatePatientStatus(nextPriorityPatient.queueNo, 'in progress');
      setCurrentServing(nextPriorityPatient.queueNo);
      return;
    }

    // Find the next patient who is waiting
    const nextWaitingPatient = patients.find(p =>
      p.status === "waiting" && p.inQueue && !p.isInactive
    );

    if (nextWaitingPatient) {
      // Mark the next waiting patient as in progress
      updatePatientStatus(nextWaitingPatient.queueNo, 'in progress');
      setCurrentServing(nextWaitingPatient.queueNo);
    } else {
      // ADDED CHANGE: Reset to null when no patients left
      setCurrentServing(null);
    }
  };


  // Filter to only show patients in active queue
  // Exclude appointment patients that haven't been accepted yet
  // ✅ ADDED SAFETY CHECKS: Use ?. and || [] to prevent crashes on refresh
  const queuePatients = (patients || []).filter(p => {
    if (dateFilter !== 'today') return false;
    if (p.isInactive) return false;
    if (p.type === "Appointment" && p.appointmentStatus !== "accepted") return false;
    if (p.status === "done" || p.status === "cancelled") return false;
    if (p.isPriority) return false;

    // ✅ FIX: If patient is in an ongoing status, exclude from date filter check for the 'Today' view
    const isOngoing = p.status === "waiting" || p.status === "in progress";
    if (!isOngoing && !isWithinDateRange(p.registeredAt)) return false;

    return p.inQueue;
  });

  const donePatients = (patients || []).filter(p => {
    if (p.isInactive) return false;
    // An appointment can only be 'done' if it was first 'accepted'
    if (p.type === "Appointment" && p.appointmentStatus !== "accepted") return false;
    if (!isWithinDateRange(p.registeredAt)) return false;
    return p.status === "done" && p.inQueue;
  });

  const cancelPatients = (patients || []).filter(p => {
    if (p.isInactive) return false;
    if (!isWithinDateRange(p.registeredAt)) return false;
    return p.status === "cancelled" && p.inQueue;
  });

  const priorityPatients = (patients || []).filter(p => {
    if (dateFilter !== 'today') return false;
    if (p.isInactive) return false;
    if (p.status === "done" || p.status === "cancelled") return false;

    // ✅ FIX: If priority patient is in an ongoing status, exclude from date filter check for the 'Today' view
    const isOngoing = p.status === "waiting" || p.status === "in progress";
    if (!isOngoing && !isWithinDateRange(p.registeredAt)) return false;

    return p.isPriority && p.inQueue;
  });

  // NEW: Filter patients based on selected doctor
  const getFilteredPatients = (patientList) => {
    if (viewMode === 'general' || !selectedDoctor) {
      return patientList; // Show all patients
    }
    // Filter to only show selected doctor's patients
    return patientList.filter(p => p.assignedDoctor?.id === selectedDoctor);
  };

  // Apply filters to all patient lists
  const filteredQueuePatients = getFilteredPatients(queuePatients);
  const filteredPriorityPatients = getFilteredPatients(priorityPatients);
  const filteredDonePatients = getFilteredPatients(donePatients);
  const filteredCancelPatients = getFilteredPatients(cancelPatients);

  // Line 453 Fix: Added safety check
  const totalWaiting = queuePatients?.filter(p => p.status === "waiting").length || 0;

  // Helper function to check if a doctor has active or priority patients
  const getDoctorPatientCount = (doctorId) => {
    const activeCount = queuePatients.filter(p => p.assignedDoctor?.id === doctorId).length;
    const priorityCount = priorityPatients.filter(p => p.assignedDoctor?.id === doctorId).length;
    return activeCount + priorityCount;
  };

  // ADD THIS NEW FUNCTION:
  const getDoctorStatus = (doctorId) => {
    const doctorPatients = patients.filter(p =>
      !p.isInactive &&
      p.assignedDoctor?.id === doctorId &&
      p.status !== "done" &&
      p.status !== "cancelled"
    );

    const hasWaiting = doctorPatients.some(p => p.status === "waiting");
    const hasInProgress = doctorPatients.some(p => p.status === "in progress");

    if (hasInProgress && !hasWaiting) {
      return 'busy'; // Doctor is serving someone but no one is waiting
    } else if (hasWaiting) {
      return 'hasPatients'; // Doctor has patients waiting
    } else {
      return 'idle'; // Doctor has no patients
    }
  };

  return (
    <div className="flex w-full min-h-screen overflow-x-hidden">
      <Sidebar nav={nav} handleNav={handleNav} />

      <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300 overflow-x-hidden">
        <div className="max-w-[100vw]">
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
              {/* Desktop: Side by side layout */}
              <div className="hidden sm:flex items-center justify-between mb-3 pt-12 lg:pt-8">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-600">De Valley Medical Clinic Queue Management</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open('/clinic-tv', '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>TV Display</span>
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Button
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                      variant="outline"
                      className="flex items-center gap-2 border-gray-300"
                    >
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{getDateFilterLabel()}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                    </Button>

                    {showDateDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                        {['today', 'thisWeek', 'lastWeek', 'custom'].map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setDateFilter(option);
                              if (option !== 'custom') setShowDateDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${dateFilter === option ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
                              }`}
                          >
                            {option === 'today' ? 'Today' :
                              option === 'thisWeek' ? 'This Week' :
                                option === 'lastWeek' ? 'Last Week' : 'Custom Range'}
                          </button>
                        ))}

                        {dateFilter === 'custom' && (
                          <div className="mt-2 p-2 border-t border-gray-100 space-y-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Start Date</label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full text-sm border rounded p-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">End Date</label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full text-sm border rounded p-1"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => setShowDateDropdown(false)}
                            >
                              Apply Range
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={downloadReport}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </Button>
                </div>
              </div>
              {/* Doctor Selector */}
              <div className="bg-white border-t border-gray-200 pt-11 lg:pt-4 mt-5">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select View Mode:</Label>

                {/* Mobile: Dropdown View */}
                <div className="block lg:hidden">
                  <div className="relative">
                    <button
                      onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-green-500 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{getCurrentViewLabel()}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showDoctorDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDoctorDropdown && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {/* General View Option */}
                        <button
                          onClick={() => {
                            setViewMode('general');
                            setSelectedDoctor(null);
                            setShowDoctorDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b ${viewMode === 'general' ? 'bg-blue-50 font-semibold' : ''
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>General Queue (All Doctors)</span>
                            {viewMode === 'general' && (
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                        </button>

                        {/* Doctor Options */}
                        {doctors.map(doctor => {
                          const patientCount = getDoctorPatientCount(doctor.id);
                          const doctorStatus = getDoctorStatus(doctor.id);
                          const isActive = isDoctorActive(doctor.id);

                          return (
                            <div key={doctor.id} className="border-b last:border-b-0">
                              <div className="px-4 py-3">
                                <button
                                  onClick={() => {
                                    if (isActive) {
                                      setViewMode('doctor');
                                      setSelectedDoctor(doctor.id);
                                      setShowDoctorDropdown(false);
                                    }
                                  }}
                                  disabled={!isActive}
                                  className={`w-full text-left hover:bg-gray-50 transition-colors p-2 rounded ${!isActive ? 'opacity-50 bg-gray-50' : ''
                                    } ${selectedDoctor === doctor.id ? 'bg-green-50 font-semibold' : ''
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {!isActive && <span className="text-sm">⏸</span>}
                                      <span>{doctor.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isActive && patientCount > 0 && (
                                        <span className={`text-white text-xs px-2 py-0.5 rounded-full ${doctorStatus === 'hasPatients' ? 'bg-blue-600' :
                                          doctorStatus === 'busy' ? 'bg-orange-600' :
                                            'bg-gray-600'
                                          }`}>
                                          {patientCount}
                                        </span>
                                      )}
                                      {selectedDoctor === doctor.id && (
                                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isActive) {
                                        stopDoctorQueue(doctor.id);
                                      } else {
                                        startDoctorQueue(doctor.id);
                                      }
                                    }}
                                    className={`text-xs px-2 py-1 rounded ${isActive
                                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                                      }`}
                                  >
                                    {isActive ? 'Stop Queue' : 'Start Queue'}
                                  </button>
                                  {!isActive && (
                                    <span className="text-xs text-gray-500">Inactive</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Legend for mobile */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Status Legend:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Has waiting patients</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-600">Busy (no waiting)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">⏸ Inactive</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">No patients</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop: Button/Dropdown View */}
                <div className="hidden lg:block">
                  <div className="relative w-full">
                    <button
                      onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{getCurrentViewLabel()}</span>
                        {viewMode === 'doctor' && selectedDoctor && (() => {
                          const patientCount = getDoctorPatientCount(selectedDoctor);
                          const doctorStatus = getDoctorStatus(selectedDoctor);
                          return patientCount > 0 ? (
                            <span className={`text-white text-xs px-2.5 py-1 rounded-full font-medium ${doctorStatus === 'hasPatients' ? 'bg-blue-600' :
                              doctorStatus === 'busy' ? 'bg-orange-600' :
                                'bg-gray-600'
                              }`}>
                              {patientCount} patient{patientCount !== 1 ? 's' : ''}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showDoctorDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDoctorDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                        {/* General View Option */}
                        <button
                          onClick={() => {
                            setViewMode('general');
                            setSelectedDoctor(null);
                            setShowDoctorDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors border-b ${viewMode === 'general' ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {viewMode === 'general' && (
                                <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                              )}
                              <div>
                                <span className={`font-medium ${viewMode === 'general' ? 'text-blue-700' : 'text-gray-900'}`}>
                                  General Queue (All Doctors)
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">View all patients across all doctors</p>
                              </div>
                            </div>
                            {viewMode === 'general' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                        </button>

                        {/* Doctor Options */}
                        <div className="py-1">
                          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Individual Doctors</p>
                          {doctors.map(doctor => {
                            const patientCount = getDoctorPatientCount(doctor.id);
                            const doctorStatus = getDoctorStatus(doctor.id);
                            const isActive = isDoctorActive(doctor.id);
                            const isSelected = selectedDoctor === doctor.id;

                            return (
                              <div
                                key={doctor.id}
                                className={`border-b last:border-b-0 ${isSelected ? 'bg-green-50' : ''}`}
                              >
                                <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between gap-4">
                                    {/* Left: Selection Area */}
                                    <button
                                      onClick={() => {
                                        if (isActive) {
                                          setViewMode('doctor');
                                          setSelectedDoctor(doctor.id);
                                          setShowDoctorDropdown(false);
                                        }
                                      }}
                                      disabled={!isActive}
                                      className="flex-1 flex items-center gap-3 text-left"
                                    >
                                      {isSelected && (
                                        <div className="w-1.5 h-8 bg-green-600 rounded-full"></div>
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          {!isActive && <span className="text-gray-400">⏸</span>}
                                          <span className={`font-medium ${!isActive ? 'text-gray-400' :
                                            isSelected ? 'text-green-700' :
                                              'text-gray-900'
                                            }`}>
                                            {doctor.name}
                                          </span>
                                          {isActive && patientCount > 0 && (
                                            <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium ${doctorStatus === 'hasPatients' ? 'bg-blue-600' :
                                              doctorStatus === 'busy' ? 'bg-orange-600' :
                                                'bg-gray-600'
                                              }`}>
                                              {patientCount}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {!isActive ? 'Queue not started' :
                                            doctorStatus === 'hasPatients' ? 'Has patients waiting' :
                                              doctorStatus === 'busy' ? 'Busy - no one waiting' :
                                                'No patients currently'}
                                        </p>
                                      </div>
                                    </button>

                                    {/* Right: Control Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isActive) {
                                          stopDoctorQueue(doctor.id);
                                        } else {
                                          startDoctorQueue(doctor.id);
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                    >
                                      {isActive ? 'Stop' : 'Start'}
                                    </button>

                                    {isSelected && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop Legend */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Status Indicators:</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">⏸ Inactive (Not started)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Has waiting patients</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-600">Busy (no one waiting)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">No patients</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note section */}
                {viewMode === 'doctor' && selectedDoctor && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Note:</strong> You are viewing the queue for {doctors.find(d => d.id === selectedDoctor)?.name}.
                      Only this doctor's patients will be shown in the tables below.
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile: Stacked layout */}
              <div className="sm:hidden space-y-3 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
                    <p className="text-xs text-gray-600">De Valley Medical Clinic Queue</p>
                  </div>
                  <Button
                    onClick={() => window.open('/clinic-tv', '_blank')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 text-[10px]"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>TV</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Button
                      onClick={() => setShowDateDropdown(!showDateDropdown)}
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-between gap-2 border-gray-300"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span className="text-xs">{getDateFilterLabel()}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                    </Button>

                    {showDateDropdown && (
                      <div className="absolute left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                        {['today', 'thisWeek', 'lastWeek', 'custom'].map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setDateFilter(option);
                              if (option !== 'custom') setShowDateDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${dateFilter === option ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
                              }`}
                          >
                            <span className="text-sm">
                              {option === 'today' ? 'Today' :
                                option === 'thisWeek' ? 'This Week' :
                                  option === 'lastWeek' ? 'Last Week' : 'Custom Range'}
                            </span>
                          </button>
                        ))}

                        {dateFilter === 'custom' && (
                          <div className="mt-2 p-2 border-t border-gray-100 space-y-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Start Date</label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full text-xs border rounded p-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">End Date</label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full text-xs border rounded p-1"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-1 h-8 text-xs"
                              onClick={() => setShowDateDropdown(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={downloadReport}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    <span className="text-xs">Download Report</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Medical Staff:</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">15 Doctors Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Secretary:</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">{secretaryName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Current Serving */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs sm:text-sm">
                    {viewMode === 'doctor' ? `${doctors.find(d => d.id === selectedDoctor)?.name} - Current Serving` : 'General Queue - Current Serving'}
                  </CardDescription>
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'general' ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                      {currentServing ? `#${String(currentServing).padStart(3, '0')}` : 'No Patient'}
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={handleCallNext}
                        className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                      >
                        Call Next Patient
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50 text-sm sm:text-base"
                        disabled={!currentServing}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel (No Show)
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      const doctorCurrentPatient = getDoctorCurrentServing(selectedDoctor);
                      return (
                        <>
                          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                            {doctorCurrentPatient ? `#${String(doctorCurrentPatient).padStart(3, '0')}` : 'No Patient'}
                          </p>
                          <div className="space-y-2">
                            <Button
                              onClick={() => callNextPatientForDoctor(selectedDoctor)}
                              className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                              disabled={getDoctorPatientCount(selectedDoctor) === 0}
                            >
                              Call Next Patient
                            </Button>
                            <Button
                              onClick={() => cancelPatientForDoctor(selectedDoctor)}
                              variant="outline"
                              className="w-full text-red-600 border-red-300 hover:bg-red-50 text-sm sm:text-base"
                              disabled={!doctorCurrentPatient && getDoctorPatientCount(selectedDoctor) === 0}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel (No Show)
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Avg Wait Time */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs sm:text-sm">Avg Wait Time</CardDescription>
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">{avgWaitTime} mins</p>
                <div className="space-y-2">
                  <Button onClick={addWaitTime} variant="outline" className="w-full text-sm sm:text-base">
                    Add Time (+5 mins)
                  </Button>
                  {/*<Button onClick={reduceWaitTime} variant="outline" className="w-full text-sm sm:text-base">
                    Reduce Time (-5 mins)
                  </Button>*/}
                </div>
              </CardContent>
            </Card>

            {/* Total Patients Waiting */}
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs sm:text-sm">
                    {viewMode === 'doctor' ? `${doctors.find(d => d.id === selectedDoctor)?.name} - Waiting` : 'Total Patients Waiting'}
                  </CardDescription>
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
                  {viewMode === 'general'
                    ? totalWaiting
                    : filteredQueuePatients.filter(p => p.status === "waiting").length
                  }
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Currently in queue</p>
              </CardContent>
            </Card>
          </div>

          {/* Patient Queue Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Patient Queue (Active)</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Patients currently in progress or waiting</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredQueuePatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {viewMode === 'doctor'
                      ? `No active patients for ${doctors.find(d => d.id === selectedDoctor)?.name}`
                      : 'No active queue patients'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {filteredQueuePatients.map(patient => (
                      <Card key={`active-mob-${patient.queueNo}`} className="border-l-4 border-l-blue-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg text-gray-900">
                                #{String(patient.queueNo).padStart(3, '0')}
                              </p>
                              <p className="text-sm text-gray-600">{patient.name}</p>
                            </div>
                            <Badge
                              variant={
                                patient.status === 'done' ? 'default' :
                                  patient.status === 'in progress' ? 'secondary' :
                                    patient.status === 'cancelled' ? 'destructive' :
                                      'outline'
                              }
                              className={
                                patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : patient.status === 'in progress'
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                    : patient.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                      : ''
                              }
                            >
                              {patient.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium">{patient.age}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{patient.phoneNum || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{patient.type}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-600">Doctor:</span>
                              <span className="font-medium">{patient.assignedDoctor?.name || 'Not Assigned'}</span>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-gray-600 mb-1">Symptoms:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-gray-600 mb-1">Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse relative">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-blue-100 shadow-sm">
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[6%] whitespace-nowrap">Queue #</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[12%] whitespace-nowrap">Name</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[4%] whitespace-nowrap">Age</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Phone</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[14%] whitespace-nowrap">Doctor</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Type</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[18%] whitespace-nowrap">Symptoms</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[16%] whitespace-nowrap">Services</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQueuePatients.map(patient => (
                          <tr key={`active-dsk-${patient.queueNo}`} className="border-b transition-colors hover:bg-blue-50">
                            <td className="p-4 align-middle text-xs font-semibold whitespace-nowrap">#{String(patient.queueNo).padStart(3, '0')}</td>
                            <td className="p-4 align-middle text-xs font-medium">{patient.name}</td>
                            <td className="p-4 align-middle text-xs">{patient.age}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.phoneNum || 'N/A'}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.assignedDoctor?.name || 'Not Assigned'}</td>
                            <td className="p-4 align-middle text-xs text-gray-500 uppercase tracking-tight">{patient.type}</td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <Badge
                                variant={
                                  patient.status === 'done' ? 'default' :
                                    patient.status === 'in progress' ? 'secondary' :
                                      patient.status === 'cancelled' ? 'destructive' :
                                        'outline'
                                }
                                className={
                                  patient.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                    : patient.status === 'in progress'
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                      : patient.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                        : ''
                                }
                              >
                                {patient.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ✅ FIXED: Priority Patients Table - Removed Action Column, Added Status Column */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Priority Patients</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Patients who are PWD, Pregnant or Senior Citizen</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPriorityPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {viewMode === 'doctor'
                      ? `No priority patients for ${doctors.find(d => d.id === selectedDoctor)?.name}`
                      : 'No priority consultations yet'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View - NO ACTION BUTTONS */}
                  <div className="block lg:hidden space-y-4">
                    {filteredPriorityPatients.map(patient => (
                      <Card key={`priority-mob-${patient.queueNo}`} className={`border-l-4 ${patient.status === 'waiting' ? 'border-l-yellow-600' : patient.status === 'in progress' ? 'border-l-green-600' : 'border-l-emerald-600'}`}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg text-gray-900">
                                #{String(patient.queueNo).padStart(3, '0')}
                              </p>
                              <p className="text-sm text-gray-600">{patient.name}</p>
                            </div>
                            <Badge
                              variant={
                                patient.status === 'done' ? 'default' :
                                  patient.status === 'in progress' ? 'secondary' :
                                    patient.status === 'cancelled' ? 'destructive' :
                                      'outline'
                              }
                              className={
                                patient.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : patient.status === 'in progress'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                    : patient.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                              }
                            >
                              {patient.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium">{patient.age}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{patient.phoneNum || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{patient.type}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-600">Doctor:</span>
                              <span className="font-medium">{patient.assignedDoctor?.name || 'Not Assigned'}</span>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-gray-600 mb-1">Symptoms:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-gray-600 mb-1">Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View - STATUS COLUMN INSTEAD OF ACTION */}
                  <div className="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse relative">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-yellow-100 shadow-sm">
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[6%] whitespace-nowrap">Queue #</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[12%] whitespace-nowrap">Name</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[4%] whitespace-nowrap">Age</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Phone</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[14%] whitespace-nowrap">Doctor</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Type</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[18%] whitespace-nowrap">Symptoms</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[16%] whitespace-nowrap">Services</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPriorityPatients.map(patient => (
                          <tr key={`priority-dsk-${patient.queueNo}`} className="border-b transition-colors hover:bg-yellow-50">
                            <td className="p-4 align-middle text-xs font-semibold whitespace-nowrap">#{String(patient.queueNo).padStart(3, '0')}</td>
                            <td className="p-4 align-middle text-xs font-medium">{patient.name}</td>
                            <td className="p-4 align-middle text-xs">{patient.age}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.phoneNum || 'N/A'}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.assignedDoctor?.name || 'Not Assigned'}</td>
                            <td className="p-4 align-middle text-xs text-gray-500 uppercase tracking-tight">{patient.type}</td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <Badge
                                variant={
                                  patient.status === 'done' ? 'default' :
                                    patient.status === 'in progress' ? 'secondary' :
                                      patient.status === 'cancelled' ? 'destructive' :
                                        'outline'
                                }
                                className={
                                  patient.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                    : patient.status === 'in progress'
                                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                      : patient.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                                }
                              >
                                {patient.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Done Patients Table */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Done Patients</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Patients who have completed their consultation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDonePatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {viewMode === 'doctor'
                      ? `No completed patients for ${doctors.find(d => d.id === selectedDoctor)?.name}`
                      : 'No completed consultations yet'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {filteredDonePatients.map(patient => (
                      <Card key={`done-mob-${patient.queueNo}`} className="border-l-4 border-l-emerald-600">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg text-gray-900">
                                #{String(patient.queueNo).padStart(3, '0')}
                              </p>
                              <p className="text-sm text-gray-600">{patient.name}</p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              Completed
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium">{patient.age}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{patient.phoneNum || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{patient.type}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-600">Doctor:</span>
                              <span className="font-medium">{patient.assignedDoctor?.name || 'Not Assigned'}</span>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-gray-600 mb-1">Symptoms:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-gray-600 mb-1">Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse relative">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-emerald-100 shadow-sm">
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[6%] whitespace-nowrap">Queue #</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[12%] whitespace-nowrap">Name</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[4%] whitespace-nowrap">Age</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Phone</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[14%] whitespace-nowrap">Doctor</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Type</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[18%] whitespace-nowrap">Symptoms</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[26%] whitespace-nowrap">Services</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDonePatients.map(patient => (
                          <tr key={`done-dsk-${patient.queueNo}`} className="border-b transition-colors hover:bg-emerald-50">
                            <td className="p-4 align-middle text-xs font-semibold whitespace-nowrap">#{String(patient.queueNo).padStart(3, '0')}</td>
                            <td className="p-4 align-middle text-xs font-medium">{patient.name}</td>
                            <td className="p-4 align-middle text-xs">{patient.age}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.phoneNum || 'N/A'}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.assignedDoctor?.name || 'Not Assigned'}</td>
                            <td className="p-4 align-middle text-xs text-gray-500 uppercase tracking-tight">{patient.type}</td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cancel Patients Table */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-red-600" />
                <div>
                  <CardTitle className="text-base sm:text-lg">Cancelled Patients</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Patients who missed their turn in queue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCancelPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>
                    {viewMode === 'doctor'
                      ? `No cancelled patients for ${doctors.find(d => d.id === selectedDoctor)?.name}`
                      : 'No cancelled consultations yet'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {filteredCancelPatients.map(patient => (
                      <Card key={`cancel-${patient.queueNo}`} className="border-l-4 border-l-red-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-lg text-gray-900">
                                #{String(patient.queueNo).padStart(3, '0')}
                              </p>
                              <p className="text-sm text-gray-600">{patient.name}</p>
                            </div>
                            <Badge className="bg-red-200 text-red-500 hover:bg-red-200">
                              Cancelled
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Age:</span>
                              <span className="font-medium">{patient.age}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{patient.phoneNum || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{patient.type}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-600">Doctor:</span>
                              <span className="font-medium">{patient.assignedDoctor?.name || 'Not Assigned'}</span>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-gray-600 mb-1">Symptoms:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-gray-600 mb-1">Services:</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse relative">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-red-100 shadow-sm">
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[6%] whitespace-nowrap">Queue #</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[12%] whitespace-nowrap">Name</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[4%] whitespace-nowrap">Age</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Phone</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[14%] whitespace-nowrap">Doctor</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[10%] whitespace-nowrap">Type</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[18%] whitespace-nowrap">Symptoms</th>
                          <th className="border px-4 py-2 text-left text-xs font-medium text-gray-600 w-[26%] whitespace-nowrap">Services</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCancelPatients.map(patient => (
                          <tr key={`cancel-${patient.queueNo}`} className="border-b transition-colors hover:bg-red-50">
                            <td className="p-4 align-middle text-xs font-semibold whitespace-nowrap">#{String(patient.queueNo).padStart(3, '0')}</td>
                            <td className="p-4 align-middle text-xs font-medium">{patient.name}</td>
                            <td className="p-4 align-middle text-xs">{patient.age}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.phoneNum || 'N/A'}</td>
                            <td className="p-4 align-middle text-xs text-gray-600">{patient.assignedDoctor?.name || 'Not Assigned'}</td>
                            <td className="p-4 align-middle text-xs text-gray-500 uppercase tracking-tight">{patient.type}</td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.symptoms && patient.symptoms.length > 0 ? (
                                  patient.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {symptom}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {patient.services && patient.services.length > 0 ? (
                                  patient.services.map((serviceId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {getServiceLabel(serviceId)}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;