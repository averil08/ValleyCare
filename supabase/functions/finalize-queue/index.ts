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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. DETERMINE MANILA "TODAY"
    // We use a robust way to get ONLY the YYYY-MM-DD in Manila time
    const manilaTodayStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Manila', 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(new Date()); // Returns "YYYY-MM-DD"
    
    console.log(`🚀 [CRON] Server Time (UTC): ${new Date().toISOString()}`);
    console.log(`🚀 [CRON] Target Manila Date: ${manilaTodayStr}`);

    // 2. CALCULATE DAILY BASE (Matching patientService.js logic)
    // We parse the Manila date back to a Date object to get the UTC block
    const manilaNow = new Date(manilaTodayStr); 
    const utcNow = Date.UTC(manilaNow.getFullYear(), manilaNow.getMonth(), manilaNow.getDate());
    const start = Date.UTC(2024, 0, 1);
    const dayOffset = Math.floor((utcNow - start) / (1000 * 60 * 60 * 24));
    const dailyBase = dayOffset * 20000;
    
    const rangeStart = dailyBase + 10001;
    const rangeEnd = dailyBase + 19999;

    // 3. FETCH CANDIDATES
    const { data: candidates, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_type', 'appointment')
      .eq('appointment_status', 'accepted')
      .neq('status', 'done')
      .neq('status', 'cancelled');

    if (fetchError) throw fetchError;

    console.log(`🔍 Total Accepted Appointments found in DB: ${candidates?.length || 0}`);

    // 4. FILTER FOR TODAY'S DATE
    const todayAppointments = (candidates || []).filter(p => {
      if (!p.appointment_datetime) return false;
      
      // Convert the patient's appointment date to Manila YYYY-MM-DD
      const patientDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Manila', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(new Date(p.appointment_datetime));

      const isToday = patientDateStr === manilaTodayStr;
      
      // Filter for unassigned (either null or in the 900k range)
      const isUnassigned = !p.queue_no || (p.queue_no >= 900000 && p.queue_no < 1000000);

      if (isToday) {
        console.log(`📌 Checking Patient: ${p.name} | Date: ${patientDateStr} | QueueNo: ${p.queue_no} | Match: ${isToday} | NeedsAssignment: ${isUnassigned}`);
      }

      return isToday && isUnassigned;
    }).sort((a, b) => new Date(a.appointment_datetime).getTime() - new Date(b.appointment_datetime).getTime());

    if (todayAppointments.length === 0) {
      console.log("✅ No appointments require finalization today.");
      return new Response(JSON.stringify({ message: "Done. 0 appointments processed." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📈 Found ${todayAppointments.length} appointments to finalize.`);

    // 4. GET STARTING SEQUENCE NUMBER
    const { data: maxData } = await supabase
      .from('patients')
      .select('queue_no')
      .gte('queue_no', rangeStart)
      .lte('queue_no', rangeEnd)
      .order('queue_no', { ascending: false })
      .limit(1);

    let nextNum = (maxData?.[0]?.queue_no || (rangeStart - 1)) + 1;
    let processedCount = 0;

    // 5. SEQUENTIAL UPDATE & EMAIL TRIGGER
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
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const appointmentTime = new Date(patient.appointment_datetime).toLocaleTimeString("en-US", {
          hour: '2-digit', minute: '2-digit'
        });

        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
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
          })
        });
      } catch (emailErr) {
        console.error(`⚠️ Patient ${patient.name} updated but email failed:`, emailErr.message);
      }

      processedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully finalized ${processedCount} appointments.` 
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
