// patientService.js - Simplified version that works with your EXISTING database
// This ONLY uses the columns you already have + the new ones we just added

import { supabase } from './supabaseClient';

/**
 * Save patient to database
 * Works with your existing database structure
 */
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
      is_returning_patient: patientData.isReturningPatient || false
    };

    // Always INSERT new visit (each visit is a new record)
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

/**
 * Get all patients from database
 */
export const getAllPatientProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Search patients by name or phone
 */
export const searchPatient = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,phone_num.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching patients:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Sync patient to database
 */
export const syncPatientToDatabase = async (patientData) => {
  try {
    const profileData = {
      // Identity
      phone_num: patientData.phoneNum,
      patient_email: patientData.patientEmail, // ✅ FIX: Sync email to DB

      // Fields
      name: patientData.name,
      age: patientData.age ? parseInt(patientData.age) : 0,
      patient_type: (patientData.type || '').toLowerCase() === 'appointment' ? 'appointment' : 'walk-in',
      status: patientData.status,
      appointment_status: patientData.appointmentStatus,
      in_queue: patientData.inQueue,
      queue_no: patientData.queueNo,
      assigned_doctor_name: patientData.assignedDoctor?.name || null,
      symptoms: patientData.symptoms || [],
      services: patientData.services || [],
      is_returning_patient: patientData.isReturningPatient || false,
      is_inactive: patientData.isInactive || false,

      // Timestamps
      called_at: patientData.calledAt || null,
      queue_exit_time: patientData.queueExitTime || null,
      completed_at: patientData.completedAt || null,
      registered_at: patientData.registeredAt || new Date().toISOString()
    };

    // ✅ FIX: Check if we are updating an existing row or creating a new one
    if (patientData.id) {
      // UPDATE existing patient
      const { data, error } = await supabase
        .from('patients')
        .upsert({ id: patientData.id, ...profileData }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } else {
      // INSERT new patient (initial registration)
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