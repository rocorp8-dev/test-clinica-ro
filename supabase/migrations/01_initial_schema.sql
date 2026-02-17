-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE NOT NULL,
  telefono text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policies for patients
CREATE POLICY "Users can manage their own patients"
ON patients FOR ALL
USING (auth.uid() = user_id);

-- Create appointments (citas) table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  fecha timestamptz NOT NULL,
  motivo text,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies for appointments
CREATE POLICY "Doctors can manage their own appointments"
ON appointments FOR ALL
USING (auth.uid() = doctor_id);
