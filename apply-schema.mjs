import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'xcthxudqelqjfbsupxwo'

if (!token) {
    console.error('Missing SUPABASE_ACCESS_TOKEN')
    process.exit(1)
}

const sql = `
-- 1. Profiles (Ensure existence)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Patients (Update/Create)
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE NOT NULL,
  telefono text,
  genero text,
  nacimiento date,
  alergias text,
  created_at timestamptz DEFAULT now()
);

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='genero') THEN
    ALTER TABLE public.patients ADD COLUMN genero text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='nacimiento') THEN
    ALTER TABLE public.patients ADD COLUMN nacimiento date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='alergias') THEN
    ALTER TABLE public.patients ADD COLUMN alergias text;
  END IF;
END $$;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own patients" ON public.patients;
CREATE POLICY "Users can see their own patients" ON public.patients FOR ALL USING (auth.uid() = user_id);

-- 3. Services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  precio decimal(10,2) NOT NULL,
  duracion integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own services" ON public.services;
CREATE POLICY "Users can see their own services" ON public.services FOR ALL USING (auth.uid() = user_id);

-- 4. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  fecha timestamptz NOT NULL,
  motivo text,
  estado text DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own appointments" ON public.appointments;
CREATE POLICY "Users can see their own appointments" ON public.appointments FOR ALL USING (auth.uid() = doctor_id);

-- 5. Medical Notes
CREATE TABLE IF NOT EXISTS public.medical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  diagnostico text,
  receta text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.medical_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own medical notes" ON public.medical_notes;
CREATE POLICY "Users can see their own medical notes" ON public.medical_notes FOR ALL USING (auth.uid() = doctor_id);

-- 6. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  amount decimal(10,2) NOT NULL,
  method text,
  status text DEFAULT 'paid',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own payments" ON public.payments;
CREATE POLICY "Users can see their own payments" ON public.payments FOR ALL USING (auth.uid() = doctor_id);
`

async function applySchema() {
    console.log('Applying schema via Management API...')
    const url = 'https://api.supabase.com/v1/projects/' + projectRef + '/database/query';
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: sql
        })
    })

    if (res.ok) {
        console.log('✅ Schema applied successfully.')
    } else {
        const data = await res.json()
        console.error('❌ Schema application failed:', data)
    }
}

applySchema()
