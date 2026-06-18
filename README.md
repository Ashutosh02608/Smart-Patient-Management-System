# 🩺 CarePulse: Advanced Patient & EHR Management System

CarePulse is a premium, secure, and modern clinic management and Electronic Health Records (EHR) platform built with **Next.js 16/15**, **React 19**, and **Tailwind CSS**. It is designed to optimize medical consults, scheduling calendars, billing invoices, laboratory reports, and complete clinical histories.

### 🔗 Live Website
Visit the live application at: **[smart-patient-management-system-ochre.vercel.app](https://smart-patient-management-system-ochre.vercel.app/)**

---

## 🚀 Key Features

* **🔑 Role-Based Access Control (RBAC):** Custom interfaces, dashboard structures, and API route authorizations tailored for 4 roles: System Administrator, Doctor, Receptionist, and Patient.
* **⏳ Consolidated Visit Timeline:** An aggregated, chronological vertical timeline mapping the complete patient check-in journey—tracking clinic visits, medical diagnoses, active prescriptions, lab panels, and surgeries.
* **📅 Visit Scheduling Calendar:** Interactive patient booking calendars allowing receptionist scheduling, slot reservations, cancellations, and reschedules.
* **📝 Medical History Logging:** Doctor consultation panels to dynamically record diagnoses, symptoms, treatments, general clinical comments, and digital prescriptions.
* **🔬 Laboratory Panel Manager:** Clinical test orders (e.g. CBC, Lipid, PA Chest X-Ray) with result inputs and report status updates.
* **💳 Billing & Payments:** Invoicing generator for consultation fees with payment status checks (unpaid vs. paid) and printable prescription receipts.
* **🔒 Account Validation Pipeline:** Automatic approval for self-registered patient accounts; staff profiles (Doctors/Receptionists) are held in a pending confirmation queue until approved by an Admin.
* **🔌 Dual-Database Adapter:** Integrates dynamically with **Supabase PostgreSQL** when credentials are present, falling back to a local sandbox file (`data/db.json`) during offline development.

---

## 🛠️ Technology Stack

* **Frontend Framework:** Next.js (App Router, dynamic rendering on demand)
* **Library:** React 19 (handling asynchronous dynamic parameters via React `use()`)
* **Styling System:** Tailwind CSS v4 variables with rich glassmorphism aesthetics and dark mode layouts
* **Database & Hosting:** Supabase (PostgreSQL with RLS configuration)

---

## 📁 Project Structure

```
├── app/
│   ├── admin/            # Administrator panel (onboarding, approval queue)
│   ├── api/              # API endpoints (users, appointments, records, lab, billing)
│   ├── calendar/         # Scheduling layouts
│   ├── doctor/           # Doctor consult panels
│   ├── doctors/          # Physician specialty directory
│   ├── patient/          # Individual patient dashboard
│   ├── patients/         # Clinical patient registry and EHR pages
│   ├── receptionist/     # Front desk scheduler & billing dashboard
│   ├── register/         # Multi-role user sign-up page (patients, doctors, staff)
│   ├── reset-password/   # Secure credentials reset forms
│   └── layout.js         # Core layout wrapper with AuthProvider
├── components/           # Reusable UI components (Sidebar, Dropdowns, Breadcrumbs)
├── lib/
│   ├── db.js             # Database adapter (Supabase PostgreSQL & JSON Fallback)
│   └── session.js        # Cookie-based session encryption
└── data/
    └── db.json           # Local developer database fallback
```

---

## ⚙️ Configuration & Setup

### 1. Environment Variables
Create a `.env.local` file in the project root:
```env
# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-public-anon-key

# Server-side Secret API Key (Bypasses Row-Level Security)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 2. Database Schema SQL
Run the following SQL script in your **Supabase SQL Editor** to establish database relations:

```sql
-- 1. Create the Users Directory Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  profile JSONB DEFAULT '{}'::jsonb,
  approved BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "resetToken" TEXT,
  "resetTokenExpiry" TIMESTAMP WITH TIME ZONE
);

-- 2. Create the Appointments Schedule Table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  "patientId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "patientName" TEXT NOT NULL,
  "doctorId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "doctorName" TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Medical Records & Prescriptions Table
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  "patientId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "patientName" TEXT NOT NULL,
  "doctorId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "doctorName" TEXT NOT NULL,
  date TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  symptoms TEXT,
  treatment TEXT,
  prescription JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the Lab Reports Table
CREATE TABLE IF NOT EXISTS lab_reports (
  id TEXT PRIMARY KEY,
  "patientId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "patientName" TEXT NOT NULL,
  "testName" TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT,
  "referenceRange" TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create the Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "patientId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "patientName" TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row-Level Security (RLS) to run transactions via Next.js Server Actions
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
```

---

## 🏃 Local Run & Build

### Development Mode
Installs packages and runs Next.js server on local port `3000`:
```bash
npm install
npm run dev
```

### Build for Production
Validates code structures and optimizes builds:
```bash
npm run build
npm start
```
