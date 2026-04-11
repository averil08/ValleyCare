import React, { useState, useContext, useMemo } from 'react';
import Sidebar from "@/components/Sidebar";
import { Users, ChartNoAxesCombined, TicketCheck, Clock, TrendingUp, Activity, Stethoscope, Calendar, BarChart3, Menu, X, Download, XCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { PatientContext } from "./PatientContext";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/partner-logo.jpg';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Analytics = () => {
  const [nav, setNav] = useState(false);
  const navigate = useNavigate();
  const handleNav = () => setNav(!nav);
  const { patients, avgWaitTime } = useContext(PatientContext);
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [trendFilter, setTrendFilter] = useState('perHour');
  const [patientStatsType, setPatientStatsType] = useState('walkin');
  const [topStatsType, setTopStatsType] = useState('symptoms');

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

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      return date.toDateString() === now.toDateString();
    }

    if (dateFilter === 'thisWeek') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return date >= startOfWeek && date <= endOfWeek;
    }

    if (dateFilter === 'lastWeek') {
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
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

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(p => {
      if (p.isInactive) return false;

      if (p.type === 'Appointment' && p.appointmentStatus !== 'accepted') return false;

      const isOngoing = p.status === "waiting" || p.status === "in progress";
      if (dateFilter === 'today' && isOngoing && p.inQueue) return true;

      const dateToUse = (p.type === 'Appointment' && p.appointmentDateTime)
        ? p.appointmentDateTime
        : p.registeredAt;

      return isWithinDateRange(dateToUse);
    });
  }, [patients, dateFilter, customStartDate, customEndDate]);

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
    urinalysis: "Urinalysis", fecalysis: "Fecalysis", pregnancyT: "Pregnancy Test",
    tsh: "TSH", ft3: "FT3", psa: "PSA"
  };

  const analytics = useMemo(() => {
    if (!patients) return {
      patientsPerDay: [], patientsPerHour: [], heatmapData: [],
      weeklyData: [], servedWalkIn: 0, servedAppointment: 0,
      totalWalkIn: 0, totalAppointment: 0,
      noShowPatients: 0, topSymptoms: [], topServices: [],
      ageGroups: {}, avgServiceTime: [], avgQueueTime: 0, topCorrelations: [],
      trendData: [],
      predictionData: { range: '0–0', peakWindow: 'N/A', dayName: 'Tomorrow' },
      queuePrediction: {
        estimatedWait: 0,
        description: "Waiting for data...",
        example: "If a patient arrives now, the predicted waiting time is 0 minutes."
      }
    };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // 1. Per Hour (Today)
    const hourDataToday = Array.from({ length: 10 }, (_, i) => ({ hour: i + 8, count: 0 }));
    patients.forEach(p => {
      if (p.registeredAt) {
        const d = new Date(p.registeredAt);
        if (d >= today) {
          const h = d.getHours();
          if (h >= 8 && h <= 17) {
            hourDataToday[h - 8].count++;
          }
        }
      }
    });

    const formatHourLabel = (h) => {
      if (h === 12) return '12 PM';
      if (h < 12) return `${h} AM`;
      return `${h - 12} PM`;
    };

    const hourlyTrend = hourDataToday.map(d => ({
      label: formatHourLabel(d.hour),
      count: d.count
    }));

    // 2. Today (Daily Trend for This Week)
    const dayNamesSentence = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startOfThisWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    startOfThisWeek.setDate(diff);

    const dailyDataThisWeek = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(startOfThisWeek);
      d.setDate(startOfThisWeek.getDate() + i);
      return {
        label: dayNamesSentence[i],
        date: d.toISOString().split('T')[0],
        count: 0
      };
    });

    patients.forEach(p => {
      if (p.registeredAt) {
        const dStr = new Date(p.registeredAt).toISOString().split('T')[0];
        const dayMatch = dailyDataThisWeek.find(day => day.date === dStr);
        if (dayMatch) dayMatch.count++;
      }
    });

    // 3. This Week (Weekly Trend for Last 8 Weeks)
    const weeklyTrend = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const count = patients.filter(p => {
        if (!p.registeredAt) return false;
        const pDate = new Date(p.registeredAt);
        return pDate >= weekStart && pDate <= weekEnd;
      }).length;

      weeklyTrend.push({
        label: `Week ${8 - i}`,
        count: count
      });
    }

    const trendDataMap = {
      perHour: hourlyTrend,
      today: dailyDataThisWeek.map(d => ({ label: d.label, count: d.count })),
      thisWeek: weeklyTrend
    };

    // Patients per day of week
    const dayOfWeekData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    filteredPatients.forEach(p => {
      if (p.registeredAt) {
        const date = new Date(p.registeredAt);
        const dayName = dayNames[date.getDay()];
        if (dayOfWeekData.hasOwnProperty(dayName)) {
          dayOfWeekData[dayName]++;
        }
      }
    });

    const patientsPerDay = Object.entries(dayOfWeekData).map(([day, count]) => ({
      day,
      patients: count
    }));

    // Patients per hour (8am-5pm only)
    const hourData = Array.from({ length: 10 }, (_, i) => ({ hour: i + 8, patients: 0 }));
    filteredPatients.forEach(p => {
      if (p.registeredAt) {
        const hour = new Date(p.registeredAt).getHours();
        if (hour >= 8 && hour <= 17) {
          const index = hour - 8;
          hourData[index].patients++;
        }
      }
    });

    const formatHour = (hour) => {
      if (hour === 12) return '12:00 PM';
      if (hour < 12) return `${hour}:00 AM`;
      return `${hour - 12}:00 PM`;
    };

    const patientsPerHour = hourData.map(({ hour, patients }) => ({
      hour: formatHour(hour),
      patients
    }));

    // Walk-in vs Appointment counts
    const totalWalkIn = filteredPatients.filter(p => p.type === "Walk-in").length;
    const totalAppointment = filteredPatients.filter(p => p.type === "Appointment").length;
    const servedWalkIn = filteredPatients.filter(p => p.type === "Walk-in" && p.status === "done").length;
    const servedAppointment = filteredPatients.filter(p => p.type === "Appointment" && p.status === "done").length;
    const noShowPatients = filteredPatients.filter(p => p.status === "cancelled" && !p.isInactive).length;

    // Most prevalent symptoms
    const symptomCount = {};
    filteredPatients.forEach(p => {
      if (p.symptoms) {
        p.symptoms.forEach(symptom => {
          symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
        });
      }
    });
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Most requested services
    const serviceCount = {};
    filteredPatients.forEach(p => {
      if (p.services) {
        p.services.forEach(service => {
          const label = serviceLabels[service] || service;
          serviceCount[label] = (serviceCount[label] || 0) + 1;
        });
      }
    });
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Age distribution
    const ageGroups = {
      "0-17": 0,
      "18-35": 0,
      "36-50": 0,
      "51-65": 0,
      "65+": 0
    };
    filteredPatients.forEach(p => {
      const age = parseInt(p.age);
      if (age <= 17) ageGroups["0-17"]++;
      else if (age <= 35) ageGroups["18-35"]++;
      else if (age <= 50) ageGroups["36-50"]++;
      else if (age <= 65) ageGroups["51-65"]++;
      else ageGroups["65+"]++;
    });
    const mostPrevalentAge = Object.entries(ageGroups)
      .sort((a, b) => b[1] - a[1])[0];

    // Peak hours (registration times)
    const hourCount = {};
    filteredPatients.forEach(p => {
      if (p.registeredAt) {
        const hour = new Date(p.registeredAt).getHours();
        hourCount[hour] = (hourCount[hour] || 0) + 1;
      }
    });

    // convert 24-hour to 12-hour format
    const formatTo12Hour = (hour) => {
      const h = parseInt(hour);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:00 ${period}`;
    };

    // Peak registration heatmap (hour x day of week) 
    const heatmapData = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let day = 1; day < 7; day++) {
        heatmapData.push({ hour, day, count: 0 });
      }
    }

    const peakHours = Object.entries(hourCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => {
        const startHour = parseInt(hour);
        const endHour = startHour + 1;
        return {
          time: `${formatTo12Hour(startHour)} - ${formatTo12Hour(endHour)}`,
          count
        };
      });

    filteredPatients.forEach(p => {
      if (p.registeredAt) {
        const date = new Date(p.registeredAt);
        const hour = date.getHours();
        const day = date.getDay();
        if (day >= 1 && day <= 6 && hour >= 8 && hour <= 17) {
          const cell = heatmapData.find(h => h.hour === hour && h.day === day);
          if (cell) cell.count++;
        }
      }
    });

    // Patient count trend by weeks (last 8 weeks) 
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7) - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const count = patients.filter(p => {
        if (!p.registeredAt) return false;
        const pDate = new Date(p.registeredAt);
        return pDate >= weekStart && pDate <= weekEnd;
      }).length;

      weeklyData.push({
        week: `Week ${8 - i}`,
        patients: count
      });
    }

    const serviceTimeData = {};

    patients.forEach(p => {
      if (p.status === "done" && p.calledAt && p.completedAt &&
        p.services && p.services.length > 0) {

        const calledTime = new Date(p.calledAt);
        const completedTime = new Date(p.completedAt);

        const serviceTimeMinutes = Math.round((completedTime - calledTime) / 60000);

        if (serviceTimeMinutes > 0 && serviceTimeMinutes <= 240) {

          p.services.forEach(serviceId => {
            const label = serviceLabels[serviceId] || serviceId;

            if (!serviceTimeData[label]) {
              serviceTimeData[label] = {
                totalTime: 0,
                count: 0
              };
            }
            serviceTimeData[label].totalTime += serviceTimeMinutes;
            serviceTimeData[label].count += 1;
          });
        }
      }
    });

    // Calculate the average for each service and sort by slowest first
    const avgServiceTime = Object.entries(serviceTimeData)
      .map(([service, data]) => ({
        service: service,
        avgTime: Math.round(data.totalTime / data.count),
        count: data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)// Sort slowest first
      .slice(0, 5);

    // Calculate average queue time (waiting time before being called)
    const queueTimeData = [];

    filteredPatients.forEach(p => {
      if (p.registeredAt && p.calledAt) {

        const registeredTime = new Date(p.registeredAt);
        const calledTime = new Date(p.calledAt);

        const queueTimeMinutes = Math.round((calledTime - registeredTime) / 60000);

        if (queueTimeMinutes > 0 && queueTimeMinutes <= 240) {
          queueTimeData.push(queueTimeMinutes);
        }
      }
    });

    // Calculate the average queue time
    const avgQueueTime = queueTimeData.length > 0
      ? Math.round(queueTimeData.reduce((sum, time) => sum + time, 0) / queueTimeData.length)
      : 0;

    // QUEUE TIME PREDICTION LOGIC 
    const waitTimesByHour = {};
    const waitTimesByService = {};

    patients.forEach(p => {
      if (p.registeredAt && p.calledAt) {
        const wait = Math.round((new Date(p.calledAt) - new Date(p.registeredAt)) / 60000);
        const h = new Date(p.registeredAt).getHours();

        if (wait > 0 && wait <= 240) {
          if (!waitTimesByHour[h]) waitTimesByHour[h] = { total: 0, count: 0 };
          waitTimesByHour[h].total += wait;
          waitTimesByHour[h].count++;

          if (p.services) {
            p.services.forEach(s => {
              const label = serviceLabels[s] || s;
              if (!waitTimesByService[label]) waitTimesByService[label] = { total: 0, count: 0 };
              waitTimesByService[label].total += wait;
              waitTimesByService[label].count++;
            });
          }
        }
      }
    });

    const currentWaitingCount = patients.filter(p => !p.calledAt && p.status === 'waiting').length;

    const getPredictedWait = (h, sLabel) => {
      const hData = waitTimesByHour[h];
      const sData = waitTimesByService[sLabel];

      const hAvg = hData ? hData.total / hData.count : avgQueueTime || 15;
      const sAvg = sData ? sData.total / sData.count : avgQueueTime || 15;

      const baseWait = (hAvg + sAvg) / 2;
      const congestionFactor = currentWaitingCount * 5;
      return Math.round(baseWait + congestionFactor);
    };

    const exampleHour = 10;
    const exampleServiceKey = 'follow-up';
    const exampleServiceLabel = serviceLabels[exampleServiceKey] || "Consultation";
    const predictedExampleWait = getPredictedWait(exampleHour, exampleServiceLabel);

    const queuePrediction = {
      estimatedWait: getPredictedWait(now.getHours(), "General Consultation"),
      description: `If a patient arrives at 10 AM for ${exampleServiceLabel}, the predicted waiting time is ${predictedExampleWait} minutes.`,
      example: `Based on ${currentWaitingCount} currently waiting patients and historical averages.`
    };

    // Service-to-Symptom Correlation
    const symptomServiceMap = {};

    filteredPatients.forEach(p => {
      if (p.symptoms && p.symptoms.length > 0 && p.services && p.services.length > 0) {
        p.symptoms.forEach(symptom => {
          p.services.forEach(service => {
            const serviceLabel = serviceLabels[service] || service;
            const key = `${symptom}|${serviceLabel}`;

            if (!symptomServiceMap[key]) {
              symptomServiceMap[key] = {
                symptom: symptom,
                service: serviceLabel,
                count: 0
              };
            }

            symptomServiceMap[key].count++;
          });
        });
      }
    });

    const topCorrelations = Object.values(symptomServiceMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // PATIENT VOLUME PREDICTION 
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const tomorrowDayIdx = tomorrow.getDay();
    const tomorrowDayName = dayNames[tomorrowDayIdx];

    const historicalSameDayPatients = patients.filter(p => {
      if (!p.registeredAt) return false;
      return new Date(p.registeredAt).getDay() === tomorrowDayIdx;
    });

    const uniqueDates = new Set(historicalSameDayPatients.map(p =>
      new Date(p.registeredAt).toISOString().split('T')[0]
    )).size || 1;

    const avgForTomorrow = historicalSameDayPatients.length / uniqueDates;
    const minPred = Math.max(0, Math.floor(avgForTomorrow * 0.9));
    const maxPred = Math.ceil(avgForTomorrow * 1.1) + (tomorrowDayIdx === 0 || tomorrowDayIdx === 6 ? 0 : 5);

    const weekdayHourCounts = {};
    historicalSameDayPatients.forEach(p => {
      const h = new Date(p.registeredAt).getHours();
      if (h >= 8 && h <= 17) {
        weekdayHourCounts[h] = (weekdayHourCounts[h] || 0) + 1;
      }
    });

    const peakHourTomorrow = Object.entries(weekdayHourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 9;

    const peakStart = formatTo12Hour(peakHourTomorrow).replace(':00', '');
    const peakEnd = formatTo12Hour(parseInt(peakHourTomorrow) + 2).replace(':00', '');

    const predictionData = {
      range: `${minPred}–${maxPred}`,
      peakWindow: `${peakStart}–${peakEnd}`,
      dayName: tomorrowDayName
    };

    return {
      patientsPerDay,
      patientsPerHour,
      heatmapData,
      weeklyData,
      predictionData,
      servedWalkIn,
      servedAppointment,
      totalWalkIn,
      totalAppointment,
      noShowPatients,
      topSymptoms,
      topServices,
      mostPrevalentAge,
      ageGroups,
      avgServiceTime,
      avgQueueTime,
      topCorrelations,
      queuePrediction,
      hourlyTrend,
      dailyTrend: dailyDataThisWeek.map(d => ({ label: d.label, count: d.count })),
      weeklyTrend,
      trendData: trendDataMap[trendFilter]
    };
  }, [filteredPatients, avgWaitTime, trendFilter, patients]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const HeatmapChart = ({ data }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxCount = Math.max(...data.map(d => d.count));

    const formatHour = (hour) => {
      if (hour === 12) return '12PM';
      if (hour < 12) return `${hour}AM`;
      return `${hour - 12}PM`;
    };

    return (
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-xs">
            <div></div>
            {days.map(day => (
              <div key={day} className="text-center font-semibold p-1 text-[10px] sm:text-xs">{day}</div>
            ))}

            {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
              <React.Fragment key={hour}>
                <div className="text-right pr-1 sm:pr-2 py-1 sm:py-2 font-medium text-[9px] sm:text-xs whitespace-nowrap">
                  {formatHour(hour)}
                </div>
                {days.map((_, dayIdx) => {
                  const cell = data.find(d => d.hour === hour && d.day === dayIdx + 1);
                  const intensity = cell ? (cell.count / maxCount) : 0;
                  const bgColor = intensity === 0 ? 'bg-gray-100' :
                    intensity < 0.25 ? 'bg-green-100' :
                      intensity < 0.5 ? 'bg-green-300' :
                        intensity < 0.75 ? 'bg-green-500' : 'bg-green-700';

                  return (
                    <div
                      key={`${hour}-${dayIdx}`}
                      className={`${bgColor} p-2 sm:p-3 md:p-4 rounded text-center text-[9px] sm:text-xs ${intensity > 0.5 ? 'text-white' : 'text-gray-700'}`}
                      title={`${days[dayIdx]} ${formatHour(hour)} - ${cell?.count || 0} patients`}
                    >
                      {cell?.count || 0}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getWeekPeriod = (date) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    const formatDate = (d) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    return `${formatDate(monday)} - ${formatDate(new Date())}`;
  };

  // Download Analytics Report Function (PDF)
  const downloadAnalyticsReport = () => {
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

    let analysisPeriod = getDateFilterLabel();
    const formatSmallDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      analysisPeriod = `${formatSmallDate(new Date(customStartDate))} to ${formatSmallDate(new Date(customEndDate))}`;
    } else if (dateFilter === 'thisWeek' || dateFilter === 'lastWeek') {
      const offset = dateFilter === 'thisWeek' ? 0 : 7;
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      analysisPeriod = `${formatSmallDate(start)} to ${formatSmallDate(end)} (${getDateFilterLabel()})`;
    } else if (dateFilter === 'today') {
      analysisPeriod = formatSmallDate(now);
    }

    const logoWidth = 30;
    const logoHeight = 30;
    const logoX = 105 - (logoWidth / 2);
    const logoY = 10;
    doc.addImage(logoImage, 'JPEG', logoX, logoY, logoWidth, logoHeight);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('De Valley Medical Clinic and Diagnostic Center, Inc.', 105, logoY + logoHeight + 10, { align: 'center' });

    // Report Title
    doc.setFontSize(13);
    doc.text('Analytics Report', 105, logoY + logoHeight + 18, { align: 'center' });

    // Report Information - Two columns layout
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Left column
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 68);
    doc.text(`Analysis Period: ${analysisPeriod}`, 14, 74);

    // Right column (aligned to the right)
    doc.text(`Total Patients: ${filteredPatients.length}`, 196, 74, { align: 'right' });

    let yPosition = 86;

    // Patient Volume Statistics
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Patient Volume Statistics', 14, yPosition);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Count']],
      body: [
        ['Walk-in Patients Served', analytics.servedWalkIn],
        ['Appointments Served', analytics.servedAppointment],
        ['No-show Patients', analytics.noShowPatients],
        ['Average Queue Time', `${analytics.avgQueueTime} mins`]
      ],
      headStyles: { fillColor: [34, 139, 34] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Intelligent Predictions', 14, yPosition);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Prediction Type', 'Forecast Details']],
      body: [
        ['Patient Volume (Tomorrow)', `${analytics.predictionData.range} patients, Peak Window: ${analytics.predictionData.peakWindow}`],
        ['Queue Wait Time', `${analytics.queuePrediction.estimatedWait} mins estimated waiting time`],
        ['Wait Time Example', analytics.queuePrediction.description]
      ],
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;

    // Average Service Time per Service
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Average Time per Service (Top 5 Slowest)', 14, yPosition);
    yPosition += 6;

    if (analytics.avgServiceTime.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Service', 'Avg Time (mins)', 'Patient Count']],
        body: analytics.avgServiceTime.map((item, idx) => [
          idx + 1,
          item.service,
          item.avgTime,
          item.count
        ]),
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 9 },
        margin: { left: 14 }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No service time data available', 14, yPosition);
      yPosition += 10;
    }

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    let trendTitle = 'Patient Count Trend';
    let trendHead = [['Time', 'Patient Count']];
    let trendBody = [];
    let trendColor = [139, 92, 246];

    if (dateFilter === 'today') {
      trendTitle = 'Hourly Patient Trend (Today)';
      trendBody = analytics.hourlyTrend.map(d => [d.label, d.count]);
      trendColor = [59, 130, 246];
    } else if (dateFilter === 'thisWeek' || dateFilter === 'lastWeek') {
      trendTitle = `Daily Patient Trend (${getDateFilterLabel()})`;
      trendBody = analytics.dailyTrend.map(d => [d.label, d.count]);
      trendColor = [16, 185, 129];
    } else {
      trendTitle = 'Weekly Patient Trend (Last 8 Weeks)';
      trendBody = analytics.weeklyTrend.map(d => [d.label, d.count]);
      trendColor = [139, 92, 246];
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(trendTitle, 14, yPosition);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: trendHead,
      body: trendBody,
      headStyles: { fillColor: trendColor },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Most Prevalent Symptoms
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Most Prevalent Symptoms (Top 5)', 14, yPosition);
    yPosition += 6;

    if (analytics.topSymptoms.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Symptom', 'Patient Count']],
        body: analytics.topSymptoms.map(([symptom, count], idx) => [
          idx + 1,
          symptom,
          count
        ]),
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 9 },
        margin: { left: 14 }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No symptom data available', 14, yPosition);
      yPosition += 10;
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Most Requested Services
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Most Requested Services (Top 5)', 14, yPosition);
    yPosition += 6;

    if (analytics.topServices.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Service', 'Request Count']],
        body: analytics.topServices.map(([service, count], idx) => [
          idx + 1,
          service,
          count
        ]),
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 9 },
        margin: { left: 14 }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No service data available', 14, yPosition);
      yPosition += 10;
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Age Distribution
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Age Distribution', 14, yPosition);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Age Group', 'Patient Count', 'Percentage']],
      body: Object.entries(analytics.ageGroups).map(([group, count]) => {
        const percentage = filteredPatients.length > 0 ? Math.round((count / filteredPatients.length) * 100) : 0;
        const isTop = analytics.mostPrevalentAge && group === analytics.mostPrevalentAge[0];
        return [
          `${group} years${isTop ? ' (Most Prevalent)' : ''}`,
          count,
          `${percentage}%`
        ];
      }),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });
    yPosition = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    // Symptom-to-Service Correlation
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Symptom-to-Service Correlation (Top 10)', 14, yPosition);
    yPosition += 6;

    if (analytics.topCorrelations.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Symptom', 'Service', 'Patient Count']],
        body: analytics.topCorrelations.map((item, idx) => [
          idx + 1,
          item.symptom,
          item.service,
          item.count
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 9 },
        margin: { left: 14 },
        columnStyles: {
          1: { cellWidth: 45 },
          2: { cellWidth: 60 }
        }
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text('No correlation data available', 14, yPosition);
      yPosition += 10;
    }

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }


    // Save the PDF
    doc.save(`Analytics_Report_${now.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <Sidebar nav={nav} handleNav={handleNav} />

      {/* MAIN CONTENT */}
      <div className="ml-0 md:ml-52 lg:pt-8 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            {/* Desktop: Side by side layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clinic Analytics</h1>
                  <p className="text-sm text-gray-600">Performance insights and statistics</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{getDateFilterLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDateDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                      {['today', 'thisWeek', 'lastWeek', 'custom'].map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setDateFilter(option);
                            if (option !== 'custom') setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${dateFilter === option ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
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
                          <button
                            className="w-full mt-1 bg-green-600 text-white text-xs py-1.5 rounded hover:bg-green-700"
                            onClick={() => setShowDateDropdown(false)}
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={downloadAnalyticsReport}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>

            {/* Mobile: Stacked layout */}
            <div className="sm:hidden space-y-4 pt-12">
              <div className="flex items-center gap-3 ">
                <BarChart3 className="w-6 h-6 text-green-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Clinic Analytics</h1>
                  <p className="text-sm text-gray-600">Insights and statistics</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(!showDateDropdown)}
                    className="w-full flex items-center justify-between bg-white border border-gray-300 px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{getDateFilterLabel()}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDateDropdown && (
                    <div className="absolute left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                      {['today', 'thisWeek', 'lastWeek', 'custom'].map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setDateFilter(option);
                            if (option !== 'custom') setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${dateFilter === option ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-100 text-gray-700'
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
                          <button
                            className="w-full mt-1 bg-green-600 text-white text-xs py-2 rounded hover:bg-green-700"
                            onClick={() => setShowDateDropdown(false)}
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={downloadAnalyticsReport}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Patient Volume Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-2 shadow-sm border-gray-100">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
                <CardDescription className="flex items-center gap-2 font-semibold text-gray-700">
                  {patientStatsType === 'walkin' ? <Activity className="w-5 h-5 text-purple-600" /> :
                    patientStatsType === 'appointment' ? <Calendar className="w-5 h-5 text-orange-600" /> :
                      <XCircle className="w-5 h-5 text-red-600" />}
                  {patientStatsType === 'walkin' ? "Total Walk-ins" :
                    patientStatsType === 'appointment' ? "Total Appointments" :
                      "Total No-shows"}
                </CardDescription>
                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setPatientStatsType('walkin')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${patientStatsType === 'walkin' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Walk-in
                  </button>
                  <button
                    onClick={() => setPatientStatsType('appointment')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${patientStatsType === 'appointment' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Appt
                  </button>
                  <button
                    onClick={() => setPatientStatsType('noshow')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${patientStatsType === 'noshow' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    No-Show
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className={`text-4xl font-bold tracking-tight ${patientStatsType === 'walkin' ? 'text-purple-600' :
                    patientStatsType === 'appointment' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                    {patientStatsType === 'walkin' ? analytics.totalWalkIn :
                      patientStatsType === 'appointment' ? analytics.totalAppointment :
                        analytics.noShowPatients}
                  </p>
                  <span className="text-gray-500 text-sm font-medium">Patients</span>
                </div>
                <div className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${patientStatsType === 'walkin' ? 'bg-purple-400' :
                    patientStatsType === 'appointment' ? 'bg-orange-400' :
                      'bg-red-400'
                    }`} />
                  {patientStatsType === 'walkin' ? `${analytics.servedWalkIn} walk-ins served so far` :
                    patientStatsType === 'appointment' ? `${analytics.servedAppointment} appointments served so far` :
                      "Total cancelled or missed appointments"}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-indigo-100 bg-indigo-50/10">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2 font-medium text-indigo-700">
                  <Clock className="w-4 h-4" />
                  Queue Time Prediction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-indigo-700">{analytics.queuePrediction.estimatedWait} mins</p>
                  <span className="text-xs text-indigo-500 font-medium">Est. Wait</span>
                </div>
                <p className="text-[11px] text-indigo-600/80 mt-2 leading-relaxed italic">
                  "{analytics.queuePrediction.description}"
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {analytics.queuePrediction.example}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2 font-medium text-blue-700">
                  <TrendingUp className="w-4 h-4" />
                  Volume Prediction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-700">{analytics.predictionData.range}</p>
                <p className="text-[11px] text-blue-600/80 mt-2 leading-relaxed">
                  The system predicts <span className="font-semibold">{analytics.predictionData.range}</span> patients for {analytics.predictionData.dayName},
                  with peak volume between <span className="font-semibold">{analytics.predictionData.peakWindow}</span>.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bar Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Symptom-to-Service Correlation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartNoAxesCombined className="w-5 h-5 text-purple-600" />
                  Symptom-to-Service Correlation
                </CardTitle>
                <CardDescription>Which symptoms lead to which services (Top 10)</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topCorrelations.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topCorrelations} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey={(entry) => `${entry.symptom} → ${entry.service}`}
                        width={150}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg">
                                <p className="font-semibold text-sm">{data.symptom}</p>
                                <p className="text-sm text-gray-600">→ {data.service}</p>
                                <p className="text-sm font-medium text-purple-600">{data.count} patients</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ChartNoAxesCombined className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No correlation data available yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Patient data with both symptoms and services will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Average Service Time per Service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Average Time per Service
                </CardTitle>
                <CardDescription>
                  How long a patient’s service takes (Top 5 slowest service)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.avgServiceTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.avgServiceTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="service"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis
                        label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'avgTime') return [`${value} mins`, 'Avg Time'];
                          if (name === 'count') return [`${value} patients`, 'Completed'];
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="avgTime"
                        fill="#f59e0b"
                        name="Avg Time (mins)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No service time data available yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Complete some patient consultations to see average service times
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Count Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div>
                <CardTitle>Patient Count Trend</CardTitle>
                <CardDescription>
                  {trendFilter === 'perHour' ? "Hourly patient volume (Today)" :
                    trendFilter === 'today' ? "Daily patient volume (This Week)" :
                      "Weekly patient volume (Last 8 Weeks)"}
                </CardDescription>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setTrendFilter('perHour')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendFilter === 'perHour' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Per Hour
                </button>
                <button
                  onClick={() => setTrendFilter('today')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendFilter === 'today' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Per Day
                </button>
                <button
                  onClick={() => setTrendFilter('thisWeek')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendFilter === 'thisWeek' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  8 Weeks
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Patients"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Symptoms & Services and Age Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Symptoms & Services Consolidated */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {topStatsType === 'symptoms' ? <Activity className="w-5 h-5 text-red-600" /> : <Stethoscope className="w-5 h-5 text-green-600" />}
                    {topStatsType === 'symptoms' ? "Most Prevalent Symptoms" : "Most Requested Services"}
                  </CardTitle>
                  <CardDescription>
                    {topStatsType === 'symptoms' ? "Top 5 reported symptoms" : "Top 5 medical services"}
                  </CardDescription>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setTopStatsType('symptoms')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${topStatsType === 'symptoms' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Symptoms
                  </button>
                  <button
                    onClick={() => setTopStatsType('services')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${topStatsType === 'services' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Services
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {topStatsType === 'symptoms' ? (
                  analytics.topSymptoms.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.topSymptoms.map(([symptom, count], idx) => (
                        <div key={symptom} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="font-medium text-gray-900">{symptom}</span>
                          </div>
                          <Badge className="bg-red-600">{count} patients</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No symptom data available</p>
                  )
                ) : (
                  analytics.topServices.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {analytics.topServices.map(([service, count], idx) => (
                        <div key={service} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="font-medium text-gray-900">{service}</span>
                          </div>
                          <Badge className="bg-green-600">{count} requests</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No service data available</p>
                  )
                )}
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Age Distribution
                </CardTitle>
                <CardDescription>Patient demographics by age group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.ageGroups).map(([group, count]) => {
                    const percentage = patients.length > 0 ? Math.round((count / patients.length) * 100) : 0;
                    const isTop = analytics.mostPrevalentAge && group === analytics.mostPrevalentAge[0];
                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={`font-medium ${isTop ? 'text-blue-600' : 'text-gray-700'}`}>
                            {group} years {isTop && '👑'}
                          </span>
                          <span className="text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${isTop ? 'bg-blue-600' : 'bg-blue-400'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;