/**
 * Email Service for Valley Care Clinic
 * Handles sending notifications to patients regarding their appointments.
 * Note: For a production environment, you would integrate this with a service like
 * Resend, EmailJS, or SendGrid via a secure backend or Supabase Edge Function.
 */

import { supabase } from './supabaseClient';

export const sendAppointmentEmail = async (patient, status, details) => {
  if (!patient || !patient.patientEmail) {
    console.warn('⚠️ Cannot send email: Patient email not found.', patient);
    return false;
  }

  const statusLabel = status === 'accepted' ? 'CONFIRMED' : 'DECLINED';
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

  const subject = `Appointment ${statusLabel} - Valley Care Clinic`;

  // Construct HTML and Plain Text versions
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
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Please arrive 15 minutes early. If you need to reschedule, please contact the clinic.</p>
    </div>
  `;

  const textContent = `
    Valley Care Clinic
    Hello ${patient.name}, your appointment has been ${statusLabel}.
    Date: ${appointmentDate}
    Time: ${appointmentTime}
    Doctor: ${details.doctor || 'Assigned Physician'}
    ${status === 'accepted' ? `Queue No: ${details.queueNo}` : ''}
    ${status === 'rejected' ? `Reason: ${details.reason || 'Not specified'}` : ''}
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

    console.log(`%c✅ Backend email sent to ${patient.patientEmail}`, 'color: #10B981; font-weight: bold;');
    return true;
  } catch (error) {
    console.error('❌ Failed to invoke Supabase Edge Function:', error.message);
    // Fallback log for local development/debugging
    console.log(`%c📧 [FALLBACK LOG] To: ${patient.patientEmail} | Status: ${statusLabel}`, 'color: #059669; font-weight: bold;');
    return false;
  }
};
