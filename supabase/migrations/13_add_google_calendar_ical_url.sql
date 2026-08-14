-- ============================================================
-- Migración 13: Agregar columna para URL iCal de Google Calendar
-- Ejecutar en Supabase SQL Editor
--
-- SEGURIDAD: Columna nullable, no afecta datos existentes
-- ============================================================

-- Agregar columna para URL secreta de Google Calendar (iCal)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS google_calendar_ical_url TEXT;

-- Comentario para documentación
COMMENT ON COLUMN public.user_profiles.google_calendar_ical_url IS
  'URL secreta iCal de Google Calendar (.ics) - Solo lectura, opcional';

-- Policy: El doctor puede actualizar su propio perfil (incluyendo esta columna)
-- Nota: Ya existe policy "Users can read own profile" para SELECT
-- Agregamos UPDATE si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
