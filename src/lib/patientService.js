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
export const syncPatientToDatabase = async (patient) => {
  try {
    const result = await savePatientProfile(patient);
    return result;
  } catch (error) {
    console.error('Error syncing patient:', error);
    return { success: false, error: error.message };
  }
};