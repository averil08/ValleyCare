import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Patient registration functions
export const registerWalkInPatient = async (patientData) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { data: maxQData } = await supabase
        .from('patients')
        .select('queue_no')
        .lt('queue_no', 900000)
        .order('queue_no', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextQueueNo = (maxQData?.queue_no || 0) + 1;

      const { data, error } = await supabase
        .from('patients')
        .insert([
          {
            name: patientData.name,
            age: parseInt(patientData.age),
            phone_num: patientData.phoneNum,
            physician: patientData.physician || null,
            assigned_doctor_name: patientData.assignedDoctorName || patientData.physician || null,
            symptoms: patientData.symptoms || [],
            services: patientData.services || [],
            days_since_onset: patientData.daysSinceOnSet ? parseInt(patientData.daysSinceOnSet) : null,
            patient_type: 'walk-in',
            queue_no: nextQueueNo,
            is_priority: patientData.isPriority || false,
            priority_type: patientData.priorityType || null,
            patient_email: patientData.patientEmail || null
          }
        ])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      if (
        (error.code === '23505' || error.message?.includes('unique_queue_no')) &&
        attempts < maxAttempts - 1
      ) {
        console.warn(`Queue number conflict detected. Retrying... (Attempt ${attempts + 1}/${maxAttempts})`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      console.error('Error registering walk-in patient:', error);
      return { success: false, error: error.message };
    }
  }
};

export const registerAppointmentPatient = async (formData, appointmentDateTime) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Unified Queue Logic: Appointments now share the same sequence as walk-ins
      const { data: maxQData } = await supabase
        .from('patients')
        .select('queue_no')
        .lt('queue_no', 900000)
        .order('queue_no', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextQueueNo = (maxQData?.queue_no || 0) + 1;

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([
          {
            name: formData.name || "Guest Patient",
            age: formData.age ? parseInt(formData.age) : 0,
            phone_num: formData.phoneNum,
            patient_type: "appointment",
            physician: formData.physician || null,
            assigned_doctor_name: formData.assignedDoctorName || formData.physician || null,
            symptoms: formData.symptoms || [],
            services: formData.services || [],
            status: 'waiting',
            appointment_status: 'pending',
            queue_no: nextQueueNo,
            is_priority: formData.isPriority || false,
            priority_type: formData.priorityType || null,
            patient_email: formData.patientEmail || localStorage.getItem('currentPatientEmail') || null,
            appointment_datetime: appointmentDateTime,
            days_since_onset: formData.daysSinceOnSet ? parseInt(formData.daysSinceOnSet) : null
          }
        ])
        .select()
        .single();

      if (patientError) {
        if (
          (patientError.code === '23505' || patientError.message?.includes('unique_queue_no')) &&
          attempts < maxAttempts - 1
        ) {
          console.warn(`Queue number conflict detected. Retrying... (Attempt ${attempts + 1}/${maxAttempts})`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        console.error("Step 1 (Patient) failed:", patientError);
        throw patientError;
      }

      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: patientData.id,
            appointment_datetime: appointmentDateTime,
            status: 'scheduled',
            notes: formData.notes || null
          }
        ]);

      if (apptError) {
        console.error("Step 2 (Appointment) failed:", apptError);
        throw apptError;
      }

      return { success: true, data: apptData, patient: patientData };
    } catch (error) {
      if ((error.code === '23505' || error.message?.includes('unique_queue_no')) && attempts < maxAttempts - 1) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      console.error("Detailed Error Object:", error);
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  }
};

// Validation functions
export const checkPhoneExists = async (phoneNum) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('phone_num')
      .eq('phone_num', phoneNum)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking phone:', error);
    return false;
  }
};

export const checkAppointmentAvailable = async (appointmentDateTime) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_datetime', appointmentDateTime)
      .eq('status', 'scheduled')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !data;
  } catch (error) {
    console.error('Error checking appointment availability:', error);
    return false;
  }
};

// Query functions (for dashboards)
export const getAllPatients = async () => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: error.message };
  }
};

export const getWalkInPatients = async () => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_type', 'walk-in')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching walk-in patients:', error);
    return { success: false, error: error.message };
  }
};

export const getTodaysWalkIns = async () => {
  try {
    const { data, error } = await supabase
      .from('todays_walkins')
      .select('*');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching today\'s walk-ins:', error);
    return { success: false, error: error.message };
  }
};

export const getAllAppointments = async () => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (
          name,
          age,
          phone_num,
          physician,
          symptoms,
          services,
          days_since_onset
        )
      `)
      .order('appointment_datetime', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: error.message };
  }
};

export const getUpcomingAppointments = async () => {
  try {
    const { data, error } = await supabase
      .from('upcoming_appointments')
      .select('*');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    return { success: false, error: error.message };
  }
};

export const getAppointmentsByDate = async (date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (
          name,
          age,
          phone_num,
          symptoms,
          services
        )
      `)
      .gte('appointment_datetime', startOfDay.toISOString())
      .lte('appointment_datetime', endOfDay.toISOString())
      .order('appointment_datetime', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching appointments by date:', error);
    return { success: false, error: error.message };
  }
};

export const searchPatients = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,phone_num.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error searching patients:', error);
    return { success: false, error: error.message };
  }
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { success: false, error: error.message };
  }
};

export const getPatientStats = async () => {
  try {
    const { count: totalPatients, error: totalError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    const { count: walkInCount, error: walkInError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('patient_type', 'walk-in');

    if (walkInError) throw walkInError;

    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('patient_type', 'appointment');

    if (appointmentError) throw appointmentError;

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount, error: todayError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (todayError) throw todayError;

    return {
      success: true,
      data: {
        totalPatients: totalPatients || 0,
        walkInPatients: walkInCount || 0,
        appointmentPatients: appointmentCount || 0,
        todayPatients: todayCount || 0
      }
    };
  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    return { success: false, error: error.message };
  }
};

// Patient login or signup functions
export const registerUser = async (email, password, fullName, phoneNumber, age, role = "patient") => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        age: age,
        role: role,
      },
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const loginUser = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    console.error("Auth Error:", error.message);
    return { success: false, error: error.message };
  }

  const user = data.user;

  const { data: staffProfile, error: staffError } = await supabase
    .from('clinic_staff')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (staffError && staffError.code !== 'PGRST116') {
    console.log("Staff check error (this is normal for patients):", staffError.message);
  }

  if (staffProfile) {
    const finalRole = (staffProfile.staff_role || user.user_metadata?.role || 'staff').toLowerCase();
    return { success: true, user, role: finalRole };
  }

  const { data: patientProfile, error: pError } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (pError) console.log("Patient Table Error:", pError.message);

  return {
    success: true,
    user,
    role: patientProfile ? 'patient' : 'unknown'
  };
};

export const updateUserPassword = async (email, currentPassword, newPassword) => {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, data: updateData };
};

export const forgotPassword = async (email, redirectTo) => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};

export const getProfileMetadata = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  return {
    fullName: user.user_metadata?.full_name || "",
    phoneNumber: user.user_metadata?.phone_number || "",
    age: user.user_metadata?.age || "",
    email: user.email || ""
  };
};

export const updateProfileMetadata = async (metadata) => {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: metadata.fullName,
      phone_number: metadata.phoneNumber,
      age: metadata.age
    }
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const resetPassword = async (newPassword) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Auth session missing! Please ensure you used a valid reset link." };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
};