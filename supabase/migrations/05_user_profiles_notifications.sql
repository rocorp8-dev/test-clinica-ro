-- ============================================================
-- Migración 05: user_profiles + trigger para notificaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla pública que espeja auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text,
  full_name      text,
  trial_ends_at  timestamptz DEFAULT (now() + interval '14 days'),
  notified_at    timestamptz,  -- cuándo se envió el Telegram
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- El propio doctor puede leer su perfil
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Service role puede leer todo (para admin page y webhook)
CREATE POLICY "Service role full access"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true);

-- Función que se dispara al crear un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Poblar perfiles de usuarios ya existentes (retroactivo)
INSERT INTO public.user_profiles (id, email, full_name, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
