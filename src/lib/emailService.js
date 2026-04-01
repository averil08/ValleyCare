import { supabase } from './supabaseClient';

export const sendAppointmentEmail = async (patient, status, details) => {
  if (!patient || !patient.patientEmail) {
    console.warn('⚠️ Cannot send email: Patient email not found.', patient);
    return false;
  }
  // Data formatting for status and timestamps of appointment
  let statusLabel = 'UPDATED';
  if (status === 'accepted') statusLabel = 'CONFIRMED';
  if (status === 'rejected') statusLabel = 'DECLINED';
  if (status === 'cancelled') statusLabel = 'CANCELLED';

  const appointmentDate = new Date(details.dateTime || patient.appointmentDateTime).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const appointmentTime = new Date(details.dateTime || patient.appointmentDateTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Email content
  const subject = `Appointment ${statusLabel} - Valley Care Clinic`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #059669;">Valley Care Clinic</h2>
      <p>Hello <strong>${patient.name}</strong>,</p>
      <p>Your appointment request has been <strong>${statusLabel}</strong>.</p>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
        <p><strong>📅 Date:</strong> ${appointmentDate}</p>
        <p><strong>⏰ Time:</strong> ${appointmentTime}</p>
        <p><strong>👨‍⚕️ Doctor:</strong> ${details.doctor || 'Assigned Physician'}</p>
        ${status === 'accepted' ? `<p><strong>🎫 Queue No:</strong> ${details.queueNo}</p>` : ''}
        ${status === 'rejected' ? `<p style="color: #e11d48;"><strong>❌ Reason:</strong> ${details.reason || 'Not specified'}</p>` : ''}
        ${status === 'cancelled' ? `<p style="color: #64748b;"><strong>ℹ️ Note:</strong> This appointment was cancelled by the patient.</p>` : ''}
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">${status === 'cancelled' ? 'You can always book a new appointment when you are ready.' : 'Please arrive 15 minutes early. If you need to reschedule, please contact the clinic.'}</p>
    </div>
  `;

  const textContent = `
    ValleyCare Clinic
    Hello ${patient.name}, your appointment has been ${statusLabel}.
    Date: ${appointmentDate}
    Time: ${appointmentTime}
    Doctor: ${details.doctor || 'Assigned Physician'}
    ${status === 'accepted' ? `Queue No: ${details.queueNo}` : ''}
    ${status === 'rejected' ? `Reason: ${details.reason || 'Not specified'}` : ''}
    ${status === 'cancelled' ? `Note: This appointment was cancelled by the patient.` : ''}
  `;

  // Send email request to Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: patient.patientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      }
    });

    if (error) throw error;

    console.log(`%c✅ Backend email sent to ${patient.patientEmail}`, 'color: #10B981; font-weight: bold;');
    return true;
  } catch (error) {
    console.error('❌ Failed to invoke Supabase Edge Function:', error.message);
    console.log(`%c📧 [FALLBACK LOG] To: ${patient.patientEmail} | Status: ${statusLabel}`, 'color: #059669; font-weight: bold;');
    return false;
  }
};

export const sendReminderEmail = async (patient, details) => {
  if (!patient || !patient.patientEmail) {
    console.warn('⚠️ Cannot send email: Patient email not found.', patient);
    return false;
  }
  
  const appointmentDate = new Date(details.dateTime || patient.appointmentDateTime).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const appointmentTime = new Date(details.dateTime || patient.appointmentDateTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Reminder: Appointment Tomorrow - Valley Care Clinic`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #059669;">Valley Care Clinic</h2>
      <p>Hello <strong>${patient.name}</strong>,</p>
      <p>This is a friendly reminder that you have an appointment tomorrow.</p>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
        <p><strong>📅 Date:</strong> ${appointmentDate}</p>
        <p><strong>⏰ Time:</strong> ${appointmentTime}</p>
        <p><strong>👨‍⚕️ Doctor:</strong> ${details.doctor || patient.assignedDoctor?.name || 'Assigned Physician'}</p>
        <p><strong>🎫 Queue No:</strong> ${details.queueNo || patient.queueNo}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Please arrive 15 minutes early. If you need to reschedule or cancel, please contact the clinic.</p>
    </div>
  `;

  const textContent = `
    Valley Care Clinic Reminder
    Hello ${patient.name}, this is a reminder for your appointment tomorrow.
    Date: ${appointmentDate}
    Time: ${appointmentTime}
    Doctor: ${details.doctor || patient.assignedDoctor?.name || 'Assigned Physician'}
    Queue No: ${details.queueNo || patient.queueNo}
  `;

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: patient.patientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      }
    });

    if (error) throw error;
    console.log(`%c✅ Backend reminder email sent to ${patient.patientEmail}`, 'color: #10B981; font-weight: bold;');
    return true;
  } catch (error) {
    console.error('❌ Failed to invoke Supabase Edge Function for reminder:', error.message);
    return false;
  }
};
