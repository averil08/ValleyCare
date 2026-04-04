import { supabase } from './supabaseClient';

// Profile creation
export const savePatientProfile = async (patientData) => {
  try {
    const profileData = {
      name: patientData.name,
      age: patientData.age,
      phone_num: patientData.phoneNum,
      physician: patientData.assignedDoctor?.name || null,
      symptoms: patientData.symptoms || [],
      services: patientData.services || [],
      days_since_onset: patientData.days_since_onset || null,
      patient_type: patientData.type === 'Appointment' ? 'appointment' : 'walk-in',
      status: patientData.status || 'waiting',
      appointment_status: patientData.appointmentStatus || null,
      rejection_reason: patientData.rejectionReason || null,
      in_queue: patientData.inQueue || false,
      is_returning_patient: patientData.isReturningPatient || false,
      notes: patientData.notes || null
    };

    const { data, error } = await supabase
      .from('patients')
      .insert([profileData])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };

  } catch (error) {
    console.error('Error saving patient:', error);
    return { success: false, error: error.message };
  }
};

// Patient profile retrieval and search
export const getAllPatientProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*, appointments(notes)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const searchPatient = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*, appointments(notes)')
      .or(`name.ilike.%${searchTerm}%,phone_num.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching patients:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getMaxQueueNumber = async (type = 'walk-in', date = null) => {
  try {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const isAppointment = (type === 'appointment' || type === 'Appointment');
    const rangeStart = isAppointment ? 10001 : 1;
    const rangeEnd = isAppointment ? 19999 : 9999;
    const dateColumn = isAppointment ? 'appointment_datetime' : 'registered_at';

    const { data, error } = await supabase
      .from('patients')
      .select('queue_no')
      .gte('queue_no', rangeStart)
      .lte('queue_no', rangeEnd)
      .gte(dateColumn, targetDate.toISOString()) 
      .lt(dateColumn, nextDay.toISOString())
      .order('queue_no', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching max queue number:', error);
      return { success: false, error: error.message, maxQueueNo: rangeStart - 1 };
    }

    // Return the max number found, or the base (e.g., 10000 for appointments) if none found
    const maxVal = data?.[0]?.queue_no || (rangeStart - 1);
    return { success: true, maxQueueNo: maxVal };
  } catch (error) {
    const fallbackBase = (type === 'appointment' || type === 'Appointment') ? 10000 : 0;
    console.error('Error fetching max queue number:', error);
    return { success: false, error: error.message, maxQueueNo: fallbackBase };
  }
};

// Updating patient records
export const syncPatientToDatabase = async (patientData) => {
  try {
    const profileData = {
      phone_num: patientData.phoneNum,
      patient_email: patientData.patientEmail,
      name: patientData.name,
      age: patientData.age ? parseInt(patientData.age) : 0,
      patient_type: (patientData.type || '').toLowerCase() === 'appointment' ? 'appointment' : 'walk-in',
      status: patientData.status,
      appointment_status: patientData.appointmentStatus,
      in_queue: patientData.inQueue,
      queue_no: patientData.queueNo,
      assigned_doctor_name: patientData.assignedDoctor?.name || null,
      physician: patientData.preferredDoctor?.name || null,
      symptoms: patientData.symptoms || [],
      services: patientData.services || [],
      is_returning_patient: patientData.isReturningPatient || false,
      is_inactive: patientData.isInactive || false,
      is_priority: patientData.isPriority || false,
      priority_type: patientData.priorityType || null,
      rejection_reason: patientData.rejectionReason || null,
      rejected_at: patientData.rejectedAt || null,

      called_at: patientData.calledAt || null,
      queue_exit_time: patientData.queueExitTime || null,
      completed_at: patientData.completedAt || null,
      registered_at: patientData.registeredAt || new Date().toISOString(),
      appointment_datetime: patientData.appointmentDateTime || null,
      notes: patientData.notes || null
    };

    // Database update or insert operation
    if (patientData.id) {
      const { data, error } = await supabase
        .from('patients')
        .upsert({ id: patientData.id, ...profileData }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } else {
      const { data, error } = await supabase
        .from('patients')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    console.error('Database Sync Error:', error.message);
    return { success: false, error: error.message };
  }
};