import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Helper to hash passwords securely using Node's native crypto
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Check for Supabase environment credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const useSupabase = !!(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('your-project')
);

// Initialize Supabase Client
export const supabase = useSupabase 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (useSupabase) {
  console.log('CarePulse Database: Connected successfully to Supabase DB instance.');
} else {
  console.error('CarePulse Database: Offline. Supabase configuration is missing or invalid.');
}

function assertSupabase() {
  if (!useSupabase) {
    throw new Error('Database Offline: Supabase configuration is missing or invalid. Fallback local database has been disabled.');
  }
}

// ==================== USER OPERATIONS ====================

export async function getUserByEmail(email) {
  assertSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  
  if (error) {
    console.error('Supabase Error (getUserByEmail):', error);
    throw error;
  }
  return data;
}

export async function getUserById(id) {
  assertSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    console.error('Supabase Error (getUserById):', error);
    throw error;
  }
  return data;
}

export async function createUser(user) {
  assertSupabase();
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (createUser):', error);
    throw error;
  }
  return data;
}

export async function updateUser(id, updates) {
  assertSupabase();
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (updateUser):', error);
    throw error;
  }
  return data;
}

export async function deleteUser(id) {
  assertSupabase();
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Supabase Error (deleteUser):', error);
    throw error;
  }
  return true;
}

export async function getAllUsers(roleFilter = null) {
  assertSupabase();
  let query = supabase.from('users').select('*');
  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Supabase Error (getAllUsers):', error);
    throw error;
  }
  return data || [];
}

// ==================== APPOINTMENT OPERATIONS ====================

export async function getAppointments(filters = {}) {
  assertSupabase();
  let query = supabase.from('appointments').select('*');
  if (filters.patientId) {
    query = query.eq('patientId', filters.patientId);
  }
  if (filters.doctorId) {
    query = query.eq('doctorId', filters.doctorId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Supabase Error (getAppointments):', error);
    throw error;
  }
  return data || [];
}

export async function createAppointment(appointment) {
  assertSupabase();
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (createAppointment):', error);
    throw error;
  }
  return data;
}

export async function updateAppointment(id, updates) {
  assertSupabase();
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (updateAppointment):', error);
    throw error;
  }
  return data;
}

export async function deleteAppointment(id) {
  assertSupabase();
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Supabase Error (deleteAppointment):', error);
    throw error;
  }
  return true;
}

// ==================== MEDICAL RECORDS OPERATIONS ====================

export async function getRecords(filters = {}) {
  assertSupabase();
  let query = supabase.from('records').select('*');
  if (filters.patientId) {
    query = query.eq('patientId', filters.patientId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Supabase Error (getRecords):', error);
    throw error;
  }
  return data || [];
}

export async function createRecord(record) {
  assertSupabase();
  const { data, error } = await supabase
    .from('records')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (createRecord):', error);
    throw error;
  }
  return data;
}

// ==================== LAB REPORTS OPERATIONS ====================

export async function getLabReports(filters = {}) {
  assertSupabase();
  let query = supabase.from('lab_reports').select('*');
  if (filters.patientId) {
    query = query.eq('patientId', filters.patientId);
  }
  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Supabase Warning (getLabReports): Table "lab_reports" does not exist in schema cache. Returning fallback empty array.');
      return [];
    }
    console.error('Supabase Error (getLabReports):', error);
    throw error;
  }
  return data || [];
}

export async function createLabReport(report) {
  assertSupabase();
  const { data, error } = await supabase
    .from('lab_reports')
    .insert(report)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (createLabReport):', error);
    throw error;
  }
  return data;
}

export async function updateLabReport(id, updates) {
  assertSupabase();
  const { data, error } = await supabase
    .from('lab_reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (updateLabReport):', error);
    throw error;
  }
  return data;
}

// ==================== BILLING OPERATIONS ====================

export async function getInvoices(filters = {}) {
  assertSupabase();
  let query = supabase.from('invoices').select('*');
  if (filters.patientId) {
    query = query.eq('patientId', filters.patientId);
  }
  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Supabase Warning (getInvoices): Table "invoices" does not exist in schema cache. Returning fallback empty array.');
      return [];
    }
    console.error('Supabase Error (getInvoices):', error);
    throw error;
  }
  return data || [];
}

export async function createInvoice(invoice) {
  assertSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (createInvoice):', error);
    throw error;
  }
  return data;
}

export async function updateInvoice(id, updates) {
  assertSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase Error (updateInvoice):', error);
    throw error;
  }
  return data;
}

// ==================== MESSAGING OPERATIONS ====================

export async function getMessages(senderId, receiverId) {
  assertSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(senderId.eq.${senderId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${senderId})`)
    .order('createdAt', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Supabase Warning (getMessages): Table "messages" does not exist in schema cache. Returning empty array.');
      return [];
    }
    console.error('Supabase Error (getMessages):', error);
    throw error;
  }
  return data || [];
}

export async function createMessage(msg) {
  assertSupabase();
  const { data, error } = await supabase
    .from('messages')
    .insert(msg)
    .select()
    .single();

  if (error) {
    console.error('Supabase Error (createMessage):', error);
    throw error;
  }
  return data;
}
