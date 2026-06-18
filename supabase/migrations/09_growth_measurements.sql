-- ========================================
-- Migration: 09_growth_measurements
-- Date: 2026-06-18
-- Description: Tabla de mediciones de crecimiento pediátrico (peso, talla, perímetro cefálico)
-- ========================================

-- Primero: Agregar campos demográficos a patients (si no existen)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('M', 'F'));

-- Índice para búsquedas por edad
CREATE INDEX IF NOT EXISTS idx_patients_fecha_nacimiento ON patients(fecha_nacimiento);

-- Tabla de mediciones de crecimiento
CREATE TABLE IF NOT EXISTS growth_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES auth.users NOT NULL,

  -- Fecha y edad en el momento de la medición
  fecha_medicion timestamptz NOT NULL DEFAULT now(),
  edad_meses integer NOT NULL, -- Calculada automáticamente desde fecha_nacimiento

  -- Mediciones antropométricas (todas opcionales para flexibilidad)
  peso_kg numeric(5,2), -- Peso en kilogramos (ej: 12.50)
  talla_cm numeric(5,1), -- Talla/estatura en centímetros (ej: 85.5)
  perimetro_cefalico_cm numeric(4,1), -- Perímetro cefálico (ej: 48.2)

  -- Observaciones de la doctora
  notas text,

  -- Metadatos
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_growth_patient ON growth_measurements(patient_id);
CREATE INDEX idx_growth_fecha ON growth_measurements(fecha_medicion DESC);
CREATE INDEX idx_growth_edad ON growth_measurements(edad_meses);

-- RLS (Row Level Security)
ALTER TABLE growth_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Doctores solo ven/modifican sus propias mediciones
CREATE POLICY "Doctors can manage their own growth measurements"
ON growth_measurements FOR ALL
USING (auth.uid() = doctor_id);

-- Función auxiliar: Calcular edad en meses desde fecha de nacimiento
CREATE OR REPLACE FUNCTION calculate_age_in_months(fecha_nac date, fecha_med timestamptz)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(fecha_med::date, fecha_nac)) * 12
       + EXTRACT(MONTH FROM AGE(fecha_med::date, fecha_nac));
END;
$$;

-- Trigger: Auto-calcular edad_meses antes de insertar/actualizar
CREATE OR REPLACE FUNCTION auto_calculate_age_months()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  patient_birthdate date;
BEGIN
  -- Obtener fecha de nacimiento del paciente
  SELECT fecha_nacimiento INTO patient_birthdate
  FROM patients
  WHERE id = NEW.patient_id;

  -- Si existe fecha de nacimiento, calcular edad en meses
  IF patient_birthdate IS NOT NULL THEN
    NEW.edad_meses := calculate_age_in_months(patient_birthdate, NEW.fecha_medicion);
  ELSE
    -- Si no hay fecha de nacimiento, error
    RAISE EXCEPTION 'El paciente debe tener fecha de nacimiento para registrar mediciones de crecimiento';
  END IF;

  -- Actualizar timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_calculate_age_months
BEFORE INSERT OR UPDATE ON growth_measurements
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_age_months();

-- Comentarios en la tabla para documentación
COMMENT ON TABLE growth_measurements IS 'Mediciones antropométricas para monitoreo de crecimiento pediátrico';
COMMENT ON COLUMN growth_measurements.edad_meses IS 'Edad en meses calculada automáticamente desde fecha_nacimiento del paciente';
COMMENT ON COLUMN growth_measurements.peso_kg IS 'Peso en kilogramos (rango válido: 0.5 - 100 kg)';
COMMENT ON COLUMN growth_measurements.talla_cm IS 'Talla/estatura en centímetros (rango válido: 30 - 200 cm)';
COMMENT ON COLUMN growth_measurements.perimetro_cefalico_cm IS 'Perímetro cefálico en centímetros (rango válido: 20 - 60 cm)';
