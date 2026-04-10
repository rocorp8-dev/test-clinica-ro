-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 02: NOM-004-SSA3-2012 + NOM-024-SSA3-2010
-- Expediente Clínico Electrónico (VERSIÓN IDEMPOTENTE CORREGIDA)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Ampliar tabla patients (NOM-004 campos de identificación) ──────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS curp         text,
  ADD COLUMN IF NOT EXISTS fecha_nac    date,
  ADD COLUMN IF NOT EXISTS sexo         text CHECK (sexo IN ('M', 'F', 'otro')),
  ADD COLUMN IF NOT EXISTS estado_civil text CHECK (estado_civil IN ('soltero','casado','divorciado','viudo','union_libre','otro')),
  ADD COLUMN IF NOT EXISTS ocupacion    text,
  ADD COLUMN IF NOT EXISTS domicilio    text,
  ADD COLUMN IF NOT EXISTS ciudad       text,
  ADD COLUMN IF NOT EXISTS estado       text,
  ADD COLUMN IF NOT EXISTS cp           text,
  ADD COLUMN IF NOT EXISTS email        text,
  ADD COLUMN IF NOT EXISTS alergias     text,
  ADD COLUMN IF NOT EXISTS tipo_sangre  text CHECK (tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','desconocido')),
  ADD COLUMN IF NOT EXISTS antecedentes text,
  ADD COLUMN IF NOT EXISTS padecimientos text,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by   uuid REFERENCES auth.users;

-- ── 2. Ampliar tabla appointments (NOM-004 nota de evolución) ────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS diagnostico       text,
  ADD COLUMN IF NOT EXISTS codigo_cie10      text,
  ADD COLUMN IF NOT EXISTS tratamiento       text,
  ADD COLUMN IF NOT EXISTS pronostico        text CHECK (pronostico IN ('bueno','reservado','malo','no_determinado')),
  ADD COLUMN IF NOT EXISTS duracion_mins     integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tipo_consulta     text DEFAULT 'primera_vez' CHECK (tipo_consulta IN ('primera_vez','subsecuente','urgencia','domiciliaria')),
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by        uuid REFERENCES auth.users;

-- ── 3. Ampliar / Crear Tabla medical_notes ──────────────────────────────
CREATE TABLE IF NOT EXISTS medical_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id   uuid REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id        uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE medical_notes
  ADD COLUMN IF NOT EXISTS tipo_nota        text DEFAULT 'evolucion' CHECK (tipo_nota IN ('primera_vez','evolucion','urgencias','referencia','contrarreferencia','interconsulta','ingreso','egreso','quirurgica','enfermeria')),
  ADD COLUMN IF NOT EXISTS subjetivo        text,
  ADD COLUMN IF NOT EXISTS objetivo         text,
  ADD COLUMN IF NOT EXISTS analisis         text,
  ADD COLUMN IF NOT EXISTS plan             text,
  ADD COLUMN IF NOT EXISTS diagnostico      text,
  ADD COLUMN IF NOT EXISTS codigo_cie10     text,
  ADD COLUMN IF NOT EXISTS tension_sistolica   integer,
  ADD COLUMN IF NOT EXISTS tension_diastolica  integer,
  ADD COLUMN IF NOT EXISTS frecuencia_cardiaca integer,
  ADD COLUMN IF NOT EXISTS frecuencia_resp     integer,
  ADD COLUMN IF NOT EXISTS temperatura         numeric(4,1),
  ADD COLUMN IF NOT EXISTS peso_kg             numeric(5,2),
  ADD COLUMN IF NOT EXISTS talla_cm            numeric(5,1),
  ADD COLUMN IF NOT EXISTS spo2                integer,
  ADD COLUMN IF NOT EXISTS firmada          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_firma      timestamptz,
  ADD COLUMN IF NOT EXISTS cedula_prof      text,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by       uuid REFERENCES auth.users;

ALTER TABLE medical_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors manage their own notes" ON medical_notes;
CREATE POLICY "Doctors manage their own notes" ON medical_notes FOR ALL USING (auth.uid() = doctor_id);

-- ── 4. Tabla consents — Consentimiento informado NOM-004 §10 ─────────────
CREATE TABLE IF NOT EXISTS consents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id    uuid REFERENCES auth.users NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('general','procedimiento','anestesia','investigacion','fotografia')),
  descripcion  text,
  aceptado     boolean DEFAULT false,
  fecha_firma  timestamptz,
  ip_firma     text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors manage consents" ON consents;
CREATE POLICY "Doctors manage consents" ON consents FOR ALL USING (auth.uid() = doctor_id);

-- ── 5. Ampliar Tabla profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name       text,
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS especialidad    text,
  ADD COLUMN IF NOT EXISTS cedula_prof     text,
  ADD COLUMN IF NOT EXISTS institucion     text,
  ADD COLUMN IF NOT EXISTS telefono        text,
  ADD COLUMN IF NOT EXISTS avatar_url      text,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 6. Índices para performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_medical_notes_patient ON medical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_notes_appointment ON medical_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_notes_doctor ON medical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consents_patient ON consents(patient_id);
