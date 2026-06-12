-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 06: Fix trigger handle_new_user + seed demo
-- CORRIGE: migración 05 sobreescribió el trigger — ahora inserta en AMBAS tablas
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Reparar función para que inserte en profiles Y user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insertar en profiles (trial, NIA, dashboard)
  INSERT INTO public.profiles (id, full_name, email, trial_ends_at, is_trial)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insertar en user_profiles (admin panel de Ro)
  INSERT INTO public.user_profiles (id, email, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now() + interval '30 days'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Reconstruir trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: crear profiles para usuarios que ya existen pero no tienen perfil
INSERT INTO public.profiles (id, full_name, email, trial_ends_at, is_trial, created_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  now() + interval '30 days',
  true,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Backfill: asegurar que user_profiles también tiene todos los usuarios
INSERT INTO public.user_profiles (id, email, full_name, trial_ends_at, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  now() + interval '30 days',
  u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Activar trial en cuenta demo admin@testclinica.com
UPDATE public.profiles
SET
  trial_ends_at = now() + interval '30 days',
  is_trial = true,
  full_name = COALESCE(full_name, 'Dr. Demo MDPulso')
WHERE email = 'admin@testclinica.com';

