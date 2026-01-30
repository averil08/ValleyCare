import React, { useState, useContext } from 'react';
import Sidebar from "@/components/Sidebar";
import { Calendar, Clock, Phone, User, Activity, Stethoscope, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
//automatic added dialog in components/ui (run npx shadcn@latest add dialog to install + make dialog.jsx)
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
//automatic added textarea in components/ui (run npx shadcn@latest add textarea to install + make textarea.jsx)
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { PatientContext } from "./PatientContext";

//THIS IS THE PATIENT PROFILE IN CLINIC UI
const Appointment = () => {
  const [nav, setNav] = useState(false);
  const handleNav = () => setNav(!nav);
  
  const { patients, acceptAppointment, rejectAppointment } = useContext(PatientContext);
  
  // Filter appointments (patients with type "Appointment")
  const appointments = (patients || []).filter(p => 
  p.type === "Appointment" && 
  p.status !== "done" && 
  p.status !== "cancelled"
  );
  
  // Service labels mapping
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

  const handleAccept = (appointment) => {
    acceptAppointment(appointment.queueNo);
  };

  //replaced the direct reject handler
  const handleRejectClick = (appointment) => {
    setRejectionDialog({
      open: true,
      appointment: appointment,
      reason: ""
    });
  };

  //added rejection dialogue state to manage modal
  const [rejectionDialog, setRejectionDialog] = useState({
    open: false,
    appointment: null,
    reason: ""
  });

  //Added the confirmation handler that saves the reason"
  const handleRejectConfirm = () => {
    if (!rejectionDialog.reason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    rejectAppointment(rejectionDialog.appointment.queueNo, rejectionDialog.reason);
    setRejectionDialog({ open: false, appointment: null, reason: "" });
  };

const formatDateTime = (dateTimeString) => {
 
  if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
   if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

  return (
    <div className="flex w-full min-h-screen">
       <Sidebar nav={nav} handleNav={handleNav} />

      {/* MAIN CONTENT */}
      <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-52 transition-all duration-300">
        {/* Header */}
        <div className="bg-white shadow-sm pt-12 lg:pt-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-green-600" />
              <div>
                <h1 className="text-xl max-sm:text-base  font-bold text-gray-900 ">Appointment Management</h1>
                <p className="text-sm text-gray-600">Review and manage patient appointments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Accepted</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {appointments.filter(a => a.appointmentStatus === 'accepted').length}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">
                  {appointments.filter(a => !a.appointmentStatus || a.appointmentStatus === 'pending').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No appointments scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <Card key={appointment.queueNo} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-lg sm:text-xl text-green-700">
                        {appointment.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-white">
                          Queue #{String(appointment.queueNo).padStart(3, '0')}
                        </Badge>
                        {appointment.appointmentStatus === 'accepted' ? (
                          <Badge className="bg-green-600">Accepted</Badge>
                        ) : appointment.appointmentStatus === 'rejected' ? (
                          <Badge variant="destructive" className="bg-red-600 text-white">
                            Not Accepted
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column - Patient Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Appointment Time</p>
                            <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                              {formatDateTime(appointment.appointmentDateTime || appointment.appointment_datetime)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Age</p>
                            <p className="font-semibold text-gray-900">{appointment.age} years old</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                            <p className="font-semibold text-gray-900 break-all">
                              {appointment.phoneNum || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Column - Medical Info */}
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <p className="text-xs font-semibold text-blue-900">Symptoms</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {appointment.symptoms && appointment.symptoms.length > 0 ? (
                              appointment.symptoms.map((symptom, idx) => (
                                <Badge key={idx} variant="outline" 
                                       className="text-xs bg-white text-blue-700 border-blue-200">
                                  {symptom}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None reported</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Stethoscope className="w-5 h-5 text-green-600" />
                            <p className="text-xs font-semibold text-green-900">Requested Services</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {appointment.services && appointment.services.length > 0 ? (
                              appointment.services.map((serviceId, idx) => (
                                <Badge key={idx} variant="outline" 
                                       className="text-xs bg-white text-green-700 border-green-200">
                                  {getServiceLabel(serviceId)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None selected</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Added Rejection Reason Display */}
                    {appointment.appointmentStatus === 'rejected' && appointment.rejectionReason && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-900 mb-1">Reason for Appointment Refusal</p>
                            <p className="text-sm text-red-800">{appointment.rejectionReason}</p>
                            {appointment.rejectedAt && (
                              <p className="text-xs text-red-600 mt-1">
                                Not Accepted on {formatDateTime(appointment.rejectedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {(!appointment.appointmentStatus || appointment.appointmentStatus === 'pending') && (
                      <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-200">
                        <Button 
                          onClick={() => handleAccept(appointment)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept Appointment
                        </Button>
                        <Button 
                          onClick={() => handleRejectClick(appointment)}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline Appointment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Added Rejection Reason Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => setRejectionDialog({...rejectionDialog, open})}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Decline Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for not accepting {rejectionDialog.appointment?.name} appointment.
              This will be shared with the patient.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for Appointment Refusal *
              </label>
              <Textarea
                placeholder="e.g., No available time slots, Requires specialist referral, etc."
                value={rejectionDialog.reason}
                onChange={(e) => setRejectionDialog({...rejectionDialog, reason: e.target.value})}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {rejectionDialog.reason.length}/500 characters
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRejectionDialog({ open: false, appointment: null, reason: "" })}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRejectConfirm}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectionDialog.reason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Send Notice to Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointment;