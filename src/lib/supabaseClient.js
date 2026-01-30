import { createClient } from '@supabase/supabase-js';

// Read the variables defined in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; 

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PATIENT REGISTRATION FUNCTIONS
// ============================================

// Register a walk-in patient
export const registerWalkInPatient = async (patientData) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([
        {
          name: patientData.name,
          age: parseInt(patientData.age),
          phone_num: patientData.phoneNum,
          physician: patientData.physician || null,
          symptoms: patientData.symptoms || [],
          services: patientData.services || [],
          days_since_onset: patientData.daysSinceOnSet ? parseInt(patientData.daysSinceOnSet) : null,
          patient_type: 'walk-in'
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error registering walk-in patient:', error);
    return { success: false, error: error.message };
  }
};

// Register an appointment patient
export const registerAppointmentPatient = async (formData, appointmentDateTime) => {
  try {
    // STEP 1: Create the Patient record
    // We use snake_case keys (phone_num, patient_type) to match your SQL schema
    // STEP 1: Update or Create the Patient record
const { data: patientData, error: patientError } = await supabase
  .from('patients')
  .upsert(
    { 
      name: formData.name || "Guest Patient",
      age: formData.age ? parseInt(formData.age) : 0,
      phone_num: formData.phoneNum, // This is the "unique" key Supabase uses to match
      patient_type: "appointment",
      physician: formData.physician || null,
      symptoms: formData.symptoms || [],
      services: formData.services || [],
      status: 'waiting',
      appointment_status: 'pending',
      is_priority: formData.isPriority || false,
      priority_type: formData.priorityType || null 
    }, 
    { onConflict: 'phone_num' } // This tells Postgres to look at the phone_num column for matches
  )
  .select()
  .single();

    if (patientError) {
      console.error("Step 1 (Patient) failed:", patientError);
      throw patientError;
    }

    // STEP 2: Create the Appointment record linked via patient_id
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

    return { success: true, data: apptData };
  } catch (error) {
    console.error("Detailed Error Object:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};


// ============================================
// VALIDATION FUNCTIONS
// ============================================

// Check if phone number already exists
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

// Check if appointment slot is available
export const checkAppointmentAvailable = async (appointmentDateTime) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_datetime', appointmentDateTime)
      .eq('status', 'scheduled')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    // Return true if slot is available (no data found)
    return !data;
  } catch (error) {
    console.error('Error checking appointment availability:', error);
    return false;
  }
};

// ============================================
// QUERY FUNCTIONS (for dashboards)
// ============================================

// Get all patients
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

// Get walk-in patients
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

// Get today's walk-in patients (using the view we created)
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

// Get all appointments
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

// Get upcoming appointments (using the view we created)
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

// Get appointments for a specific date
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

// Search patients by name or phone
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

// Update appointment status
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

// Get patient statistics (for analytics)
export const getPatientStats = async () => {
  try {
    // Total patients
    const { count: totalPatients, error: totalError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Walk-in patients
    const { count: walkInCount, error: walkInError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('patient_type', 'walk-in');

    if (walkInError) throw walkInError;

    // Appointment patients
    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('patient_type', 'appointment');

    if (appointmentError) throw appointmentError;

    // Today's patients
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

// ============================================
// PATIENT LOGIN OR SIGNUP FUNCTIONS
// ============================================

export const registerUser = async (email, password, fullName, phoneNumber, role = "patient") => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber,
        role: role, // 'patient' or 'staff'
      },
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
};



// lib/supabaseClient.js
export const loginUser = async (email, password) => {
  // 1. Clean the email input
  const cleanEmail = email.trim().toLowerCase();

  // 2. Authenticate with Supabase Auth FIRST
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  // If Auth fails (wrong password/email), stop here
  if (error) {
    console.error("Auth Error:", error.message);
    return { success: false, error: error.message };
  }

  const user = data.user;

  // 3. CHECK STAFF TABLE
  const { data: staffProfile } = await supabase
    .from('clinic_staff')
    .select('*')
    .eq('email', cleanEmail)
    .single();

  if (staffProfile) {
    console.log("Role Found: Staff");
    return { success: true, user, role: 'staff' };
  }

  // 4. CHECK PATIENT TABLE
  const { data: patientProfile, error: pError } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('email', cleanEmail) 
    .single();

  // Debugging logs to help you see what's happening
  console.log("Searching for Patient:", cleanEmail);
  console.log("Patient Data found:", patientProfile);
  if (pError) console.log("Patient Table Error:", pError.message);

  return { 
    success: true, 
    user, 
    role: patientProfile ? 'patient' : 'unknown' 
  };
};