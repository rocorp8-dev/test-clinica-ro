-- =============================================
-- TABLA: billing (Cobros Médicos)
-- Corre esto en el SQL Editor de Supabase Dashboard
-- =============================================

CREATE TABLE billing (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  amount        NUMERIC(10, 2) NOT NULL,
  service_type  TEXT NOT NULL DEFAULT 'Consulta General',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  payment_status TEXT NOT NULL DEFAULT 'pagado',
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their own billing"
  ON billing FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_billing_user_id ON billing(user_id);
CREATE INDEX idx_billing_created_at ON billing(created_at DESC);
