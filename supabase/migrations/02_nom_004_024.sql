-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 02: NOM-004-SSA3-2012 + NOM-024-SSA3-2010
-- Expediente Clínico Electrónico
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
  ADD COLUMN IF NOT EXISTS antecedentes text,  -- antecedentes heredofamiliares
  ADD COLUMN IF NOT EXISTS padecimientos text, -- padecimientos crónicos
  -- NOM-024: auditoría
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by   uuid REFERENCES auth.users;

-- ── 2. Ampliar tabla appointments (NOM-004 nota de evolución) ────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS diagnostico       text,
  ADD COLUMN IF NOT EXISTS codigo_cie10      text,  -- ej: "J06.9"
  ADD COLUMN IF NOT EXISTS tratamiento       text,
  ADD COLUMN IF NOT EXISTS pronostico        text CHECK (pronostico IN ('bueno','reservado','malo','no_determinado')),
  ADD COLUMN IF NOT EXISTS duracion_mins     integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tipo_consulta     text DEFAULT 'primera_vez' CHECK (tipo_consulta IN ('primera_vez','subsecuente','urgencia','domiciliaria')),
  -- NOM-024: auditoría
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by        uuid REFERENCES auth.users;

-- ── 3. Tabla medical_notes — Notas clínicas NOM-004 ──────────────────────
CREATE TABLE IF NOT EXISTS medical_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id   uuid REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id        uuid REFERENCES auth.users NOT NULL,

  -- Tipo de nota (NOM-004 §8)
  tipo_nota        text NOT NULL DEFAULT 'evolucion' CHECK (tipo_nota IN (
    'primera_vez',    -- Nota de primera vez
    'evolucion',      -- Nota de evolución
    'urgencias',      -- Nota de urgencias
    'referencia',     -- Nota de referencia/traslado
    'contrarreferencia',
    'interconsulta',
    'ingreso',        -- Nota de ingreso hospitalario
    'egreso',         -- Nota de egreso
    'quirurgica',     -- Nota preoperatoria/postoperatoria
    'enfermeria'      -- Nota de enfermería
  )),

  -- SOAP (Subjetivo, Objetivo, Análisis, Plan) — estándar clínico
  subjetivo        text,  -- Síntomas referidos por el paciente
  objetivo         text,  -- Exploración física, signos vitales
  analisis         text,  -- Diagnóstico / interpretación
  plan             text,  -- Tratamiento, indicaciones, seguimiento

  -- Diagnóstico formal
  diagnostico      text,
  codigo_cie10     text,  -- Código CIE-10

  -- Signos vitales
  tension_sistolica   integer,
  tension_diastolica  integer,
  frecuencia_cardiaca integer,
  frecuencia_resp     integer,
  temperatura         numeric(4,1),
  peso_kg             numeric(5,2),
  talla_cm            numeric(5,1),
  spo2                integer,  -- saturación O2 %

  -- NOM-004: firma del médico responsable
  firmada          boolean DEFAULT false,
  fecha_firma      timestamptz,
  cedula_prof      text,  -- cédula profesional del médico

  -- NOM-024: auditoría completa
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  updated_by       uuid REFERENCES auth.users
);

ALTER TABLE medical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage their own notes"
ON medical_notes FOR ALL
USING (auth.uid() = doctor_id);

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

CREATE POLICY "Doctors manage consents"
ON consents FOR ALL
USING (auth.uid() = doctor_id);

-- ── 5. Tabla profiles — datos del médico (cédula profesional) ────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name       text,
  email           text,
  especialidad    text,
  cedula_prof     text,  -- NOM-004: cédula profesional obligatoria
  institucion     text,
  telefono        text,
  avatar_url      text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"
ON profiles FOR ALL
USING (auth.uid() = id);

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
