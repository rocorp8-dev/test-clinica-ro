-- ============================================================
-- Migración 07: Configuración de duración de citas por doctor
-- Permite que cada doctor tenga su propia duración de cita
-- ============================================================

-- Agregar columna appointment_duration a user_profiles (en minutos)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS appointment_duration integer DEFAULT 60;

COMMENT ON COLUMN public.user_profiles.appointment_duration IS 'Duración de citas en minutos para este doctor (default: 60)';

-- Actualizar la Dra. Dora a 30 minutos
-- Buscar por email que contenga "dora" (case-insensitive)
UPDATE public.user_profiles
SET appointment_duration = 30
WHERE LOWER(email) LIKE '%dora%' OR LOWER(full_name) LIKE '%dora%';
