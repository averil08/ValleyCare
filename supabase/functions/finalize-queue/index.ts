import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim().replace(/^["']|["']$/g, '')
  const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim().replace(/^["']|["']$/g, '')
  const supabaseAnonKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim().replace(/^["']|["']$/g, '')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Determine date of today and tomorrow (YYYY-MM-DD in Manila time)
    const manilaTimeOpts = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
    const manilaTodayStr = new Intl.DateTimeFormat('en-CA', manilaTimeOpts).format(new Date()); // Returns "YYYY-MM-DD"
    
    const manilaTomorrow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    manilaTomorrow.setDate(manilaTomorrow.getDate() + 1);
    const manilaTomorrowStr = new Intl.DateTimeFormat('en-CA', manilaTimeOpts).format(manilaTomorrow);
    
    console.log(`🚀 [CRON] Server Time (UTC): ${new Date().toISOString()}`);
    console.log(`🚀 [CRON] Target Manila Date (Today): ${manilaTodayStr}`);
    console.log(`🚀 [CRON] Target Manila Date (Tomorrow): ${manilaTomorrowStr}`);

    //Calculate daily date base
    const manilaNow = new Date(manilaTodayStr); 
    const utcNow = Date.UTC(manilaNow.getFullYear(), manilaNow.getMonth(), manilaNow.getDate());
    const start = Date.UTC(2024, 0, 1);
    const dayOffset = Math.floor((utcNow - start) / (1000 * 60 * 60 * 24));
    const dailyBase = dayOffset * 20000;
    
    const rangeStart = dailyBase + 10001;
    const rangeEnd = dailyBase + 19999;

    //Fetch patients
    const { data: candidates, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_type', 'appointment')
      .eq('appointment_status', 'accepted')
      .neq('status', 'done')
      .neq('status', 'cancelled');

    if (fetchError) throw fetchError;

    console.log(`🔍 Total Accepted Appointments found in DB: ${candidates?.length || 0}`);

    //Filter today's date
    const todayAppointments = (candidates || []).filter(p => {
      if (!p.appointment_datetime) return false;
      
      // Convert the patient's appointment date to Manila YYYY-MM-DD
      const patientDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Manila', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(new Date(p.appointment_datetime));

      const isToday = patientDateStr === manilaTodayStr;
      
      // Filter for unassigned queue number
      const isUnassigned = !p.queue_no || (p.queue_no >= 900000 && p.queue_no < 1000000);

      if (isToday) {
        console.log(`📌 Checking Patient: ${p.name} | Date: ${patientDateStr} | QueueNo: ${p.queue_no} | Match: ${isToday} | NeedsAssignment: ${isUnassigned}`);
      }

      return isToday && isUnassigned;
    }).sort((a, b) => new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime());

    // Filter for tomorrow's appointments
    const tomorrowAppointments = (candidates || []).filter(p => {
      if (!p.appointment_datetime) return false;
      
      // Convert the patient's appointment date to Manila YYYY-MM-DD
      const patientDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Manila', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(new Date(p.appointment_datetime));

      const isTomorrow = patientDateStr === manilaTomorrowStr;
      
      // Check if reminder was already sent
      const notReminded = p.rejection_reason !== 'REMINDER_SENT';

      if (isTomorrow) {
        console.log(`📌 Checking Patient for Reminder: ${p.name} | Date: ${patientDateStr} | Match: ${isTomorrow} | NeedsReminder: ${notReminded}`);
      }

      return isTomorrow && notReminded;
    });

    if (todayAppointments.length === 0 && tomorrowAppointments.length === 0) {
      console.log("✅ No appointments require finalization today or reminders tomorrow.");
      return new Response(JSON.stringify({ message: "Done. 0 appointments processed, 0 reminders sent." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📈 Found ${todayAppointments.length} appointments to finalize and ${tomorrowAppointments.length} reminders to send.`);

    // Get start sequence number
    const { data: maxData } = await supabase
      .from('patients')
      .select('queue_no')
      .gte('queue_no', rangeStart)
      .lte('queue_no', rangeEnd)
      .order('queue_no', { ascending: false })
      .limit(1);

    let nextNum = (maxData?.[0]?.queue_no || (rangeStart - 1)) + 1;
    let processedCount = 0;

    // Email trigger
    for (const patient of todayAppointments) {
      const assignedNo = nextNum++;
      const displayNo = `A${String(assignedNo % 10000).padStart(3, '0')}`;

      // Update Database
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          queue_no: assignedNo,
          status: 'waiting',
          in_queue: true
        })
        .eq('id', patient.id);

      if (updateError) {
        console.error(`❌ Failed to update patient ${patient.name}:`, updateError);
        continue;
      }

      // Trigger Email via existing send-email function
      try {
        const appointmentDate = new Date(patient.appointment_datetime).toLocaleDateString("en-US", {
          timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const appointmentTime = new Date(patient.appointment_datetime).toLocaleTimeString("en-US", {
          timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'
        });

        const authHeader = req.headers.get('Authorization') || `Bearer ${supabaseServiceKey}`;

        const { data: emailData, error: emailErrObj } = await supabase.functions.invoke('send-email', {
          headers: {
            Authorization: authHeader
          },
          body: {
            to: patient.patient_email,
            subject: "Your Official Queue Number for Today - Valley Care Clinic",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #059669;">Valley Care Clinic</h2>
                <p>Hello <strong>${patient.name}</strong>,</p>
                <p>Your <strong>final queue number</strong> for today's appointment has been assigned. Please see your details below.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                  <p><strong>📅 Date:</strong> ${appointmentDate}</p>
                  <p><strong>⏰ Time:</strong> ${appointmentTime}</p>
                  <p><strong>👨‍⚕️ Doctor:</strong> ${patient.assigned_doctor_name || 'Assigned Physician'}</p>
                  <p><strong>🎫 Queue No:</strong> <span style="font-size: 1.2em; color: #059669;">#${displayNo}</span></p>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Please arrive 15 minutes before your scheduled time. No further action is needed from your side.</p>
              </div>
            `
          }
        });

        if (emailErrObj) {
          console.error(`⚠️ Email API rejected the request for ${patient.name}:`, emailErrObj);
        } else {
          console.log(`✉️ Email successfully triggered for ${patient.name}`);
        }

      } catch (emailErr) {
        console.error(`⚠️ Patient ${patient.name} updated but trigger failed:`, emailErr.message);
      }

      processedCount++;
    }

    // Process tomorrow's reminders
    let reminderCount = 0;
    for (const patient of tomorrowAppointments) {
      // Format email
      try {
        const appointmentDate = new Date(patient.appointment_datetime).toLocaleDateString("en-US", {
          timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const appointmentTime = new Date(patient.appointment_datetime).toLocaleTimeString("en-US", {
          timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'
        });
        
        const displayNo = (() => {
            const num = patient.queue_no;
            if (!num || (num >= 900000 && num < 1000000)) return '#A--';
            return `#A${String(num % 10000).padStart(3, '0')}`;
        })();

        const authHeader = req.headers.get('Authorization') || `Bearer ${supabaseServiceKey}`;

        const { data: emailData, error: emailErrObj } = await supabase.functions.invoke('send-email', {
          headers: {
            Authorization: authHeader
          },
          body: {
            to: patient.patient_email,
            subject: "Reminder: Appointment Tomorrow - Valley Care Clinic",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #059669;">Valley Care Clinic</h2>
                <p>Hello <strong>${patient.name}</strong>,</p>
                <p>This is a friendly reminder that you have an appointment tomorrow.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                  <p><strong>📅 Date:</strong> ${appointmentDate}</p>
                  <p><strong>⏰ Time:</strong> ${appointmentTime}</p>
                  <p><strong>👨‍⚕️ Doctor:</strong> ${patient.assigned_doctor_name || 'Assigned Physician'}</p>
                  <p><strong>🎫 Queue No:</strong> <span style="font-size: 1.2em; color: #059669;">${displayNo}</span></p>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Please arrive 15 minutes early. If you need to reschedule or cancel, please contact the clinic.</p>
              </div>
            `
          }
        });

        if (emailErrObj) {
          console.error(`⚠️ Reminder Email API rejected the request for ${patient.name}:`, emailErrObj);
        } else {
          console.log(`✉️ Reminder Email successfully triggered for ${patient.name}`);
          
          // Mark as reminded ONLY upon success
          const { error: updateError } = await supabase
            .from('patients')
            .update({
              rejection_reason: 'REMINDER_SENT'
            })
            .eq('id', patient.id);

          if (updateError) {
            console.error(`❌ Failed to update reminder status for patient ${patient.name}:`, updateError);
          }
        }

      } catch (emailErr) {
        console.error(`⚠️ Patient ${patient.name} reminder trigger failed:`, emailErr.message);
      }
      reminderCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully finalized ${processedCount} appointments and sent ${reminderCount} reminders.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ CRON Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
