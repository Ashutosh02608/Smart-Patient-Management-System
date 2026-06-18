import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Configuration for local JSON DB fallback
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Helper to hash passwords securely using Node's native crypto
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Check for Supabase environment credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// On the server, we prefer the secret Service Role Key which bypasses RLS.
// We fallback to the anon key if service role is not defined in environments.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// We check if the project has a real Supabase configuration set up (not default placeholders)
const useSupabase = !!(
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
  console.log('CarePulse Database: Running in local developer sandbox mode using data/db.json.');
}

// ----------------------------------------------------
// LOCAL FALLBACK HELPER FUNCTIONS
// ----------------------------------------------------
function readLocalDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], appointments: [], records: [], lab_reports: [], invoices: [] };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = [];
    if (!parsed.appointments) parsed.appointments = [];
    if (!parsed.records) parsed.records = [];
    if (!parsed.lab_reports) parsed.lab_reports = [];
    if (!parsed.invoices) parsed.invoices = [];
    return parsed;
  } catch (err) {
    console.error("Local database read error, returning empty dataset:", err);
    return { users: [], appointments: [], records: [], lab_reports: [], invoices: [] };
  }
}

function writeLocalDB(data) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Local database write error:", err);
  }
}

// ----------------------------------------------------
// UNIFIED CLINIC DATABASE ADAPTERS
// ----------------------------------------------------

// ==================== USER OPERATIONS ====================

export async function getUserByEmail(email) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }
}

export async function getUserById(id) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    return db.users.find(u => u.id === id) || null;
  }
}

export async function createUser(user) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    db.users.push(user);
    writeLocalDB(db);
    return user;
  }
}

export async function updateUser(id, updates) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    const currentProfile = db.users[idx].profile || {};
    const newProfile = updates.profile || {};

    const updatedUser = {
      ...db.users[idx],
      ...updates,
      profile: {
        ...currentProfile,
        ...newProfile
      }
    };

    db.users[idx] = updatedUser;
    writeLocalDB(db);
    return updatedUser;
  }
}

export async function deleteUser(id) {
  if (useSupabase) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase Error (deleteUser):', error);
      throw error;
    }
    return true;
  } else {
    const db = readLocalDB();
    const filtered = db.users.filter(u => u.id !== id);
    if (filtered.length === db.users.length) return false;
    db.users = filtered;
    writeLocalDB(db);
    return true;
  }
}

export async function getAllUsers(roleFilter = null) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    if (roleFilter) {
      return db.users.filter(u => u.role === roleFilter);
    }
    return db.users;
  }
}

// ==================== APPOINTMENT OPERATIONS ====================

export async function getAppointments(filters = {}) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    let apts = db.appointments;
    if (filters.patientId) {
      apts = apts.filter(a => a.patientId === filters.patientId);
    }
    if (filters.doctorId) {
      apts = apts.filter(a => a.doctorId === filters.doctorId);
    }
    return apts;
  }
}

export async function createAppointment(appointment) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    db.appointments.push(appointment);
    writeLocalDB(db);
    return appointment;
  }
}

export async function updateAppointment(id, updates) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    const idx = db.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const updated = {
      ...db.appointments[idx],
      ...updates
    };

    db.appointments[idx] = updated;
    writeLocalDB(db);
    return updated;
  }
}

export async function deleteAppointment(id) {
  if (useSupabase) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase Error (deleteAppointment):', error);
      throw error;
    }
    return true;
  } else {
    const db = readLocalDB();
    const filtered = db.appointments.filter(a => a.id !== id);
    if (filtered.length === db.appointments.length) return false;
    db.appointments = filtered;
    writeLocalDB(db);
    return true;
  }
}

// ==================== MEDICAL RECORDS OPERATIONS ====================

export async function getRecords(filters = {}) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    let recs = db.records;
    if (filters.patientId) {
      recs = recs.filter(r => r.patientId === filters.patientId);
    }
    return recs;
  }
}

export async function createRecord(record) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    db.records.push(record);
    writeLocalDB(db);
    return record;
  }
}

// ==================== LAB REPORTS OPERATIONS ====================

export async function getLabReports(filters = {}) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    let reports = db.lab_reports || [];
    if (filters.patientId) {
      reports = reports.filter(r => r.patientId === filters.patientId);
    }
    return reports;
  }
}

export async function createLabReport(report) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    if (!db.lab_reports) db.lab_reports = [];
    db.lab_reports.push(report);
    writeLocalDB(db);
    return report;
  }
}

export async function updateLabReport(id, updates) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    if (!db.lab_reports) db.lab_reports = [];
    const idx = db.lab_reports.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated = { ...db.lab_reports[idx], ...updates };
    db.lab_reports[idx] = updated;
    writeLocalDB(db);
    return updated;
  }
}

// ==================== BILLING OPERATIONS ====================

export async function getInvoices(filters = {}) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    let invs = db.invoices || [];
    if (filters.patientId) {
      invs = invs.filter(i => i.patientId === filters.patientId);
    }
    return invs;
  }
}

export async function createInvoice(invoice) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    if (!db.invoices) db.invoices = [];
    db.invoices.push(invoice);
    writeLocalDB(db);
    return invoice;
  }
}

export async function updateInvoice(id, updates) {
  if (useSupabase) {
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
  } else {
    const db = readLocalDB();
    if (!db.invoices) db.invoices = [];
    const idx = db.invoices.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const updated = { ...db.invoices[idx], ...updates };
    db.invoices[idx] = updated;
    writeLocalDB(db);
    return updated;
  }
}
