-- ═══════════════════════════════════════════════════════════════════
-- Migración 03: Tabla billing + trial en profiles
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tabla billing ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users NOT NULL,
  appointment_id   uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id       uuid REFERENCES patients(id) ON DELETE SET NULL,
  amount           numeric(10,2) NOT NULL,
  service_type     text NOT NULL DEFAULT 'Consulta General',
  payment_method   text NOT NULL DEFAULT 'efectivo'
                   CHECK (payment_method IN ('efectivo','tarjeta','transferencia','otro')),
  payment_status   text NOT NULL DEFAULT 'pagado',
  notes            text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own billing"
ON billing FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_billing_user ON billing(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_created ON billing(created_at DESC);

-- ── 2. Trial en profiles ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT true;

-- Actualizar el trigger para incluir trial_ends_at en nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, trial_ends_at, is_trial)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
