-- ========================================
-- Migration: 15_subscriptions
-- Date: 2026-10-24
-- Description: Tabla subscriptions + campos en profiles + trial unificado 30 días
--              ⚠️ NO borra ni renombra tablas existentes. Solo ADD/CREATE.
-- ========================================

-- ── 1. Tabla subscriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan                    text NOT NULL CHECK (plan IN ('basico', 'pro', 'clinica')),
  status                  text NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  billing_cycle           text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  payment_method          text DEFAULT 'pending'
                          CHECK (payment_method IN ('stripe', 'spei', 'manual', 'pending')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  canceled_at             timestamptz,
  cancel_reason           text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access subscriptions"
  ON public.subscriptions FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- ── 2. Campos en profiles para cache rápido del middleware ─────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS current_plan text;

-- ── 3. Unificar trial_ends_at default a 30 días en user_profiles ───────────
-- (la migración 05 tenía interval '14 days'; profiles ya usaba 30 días)
ALTER TABLE public.user_profiles
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

-- ── 4. Trigger handle_new_user() extendido ─────────────────────────────────
-- ⚠️ Extensión NO destructiva: conserva inserts a profiles y user_profiles
--    (migración 06) y AGREGA la creación de la suscripción en estado trialing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- profiles (trial, dashboard)
  INSERT INTO public.profiles (id, full_name, email, trial_ends_at, is_trial, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    now() + interval '30 days',
    true,
    'trialing'
  )
  ON CONFLICT (id) DO NOTHING;

  -- user_profiles (admin panel)
  INSERT INTO public.user_profiles (id, email, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now() + interval '30 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Crear suscripción en estado trialing
  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'basico',
    'trialing',
    'pending',
    now(),
    now() + interval '30 days'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Reconstruir trigger. El trigger on_auth_user_created YA existe (migración 06)
-- y apunta a esta función: reemplazar el body es suficiente. El bloque DO hace
-- el DROP+CREATE de forma segura — si no hay permisos sobre auth.users, se omite.
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Trigger on_auth_user_created ya existente (migración 06) — se conserva tal cual';
END $$;

-- ── 5. ⚠️ PROTEGER USUARIO EXISTENTE ──────────────────────────────────────
-- La pediatra que ya pagó 1 año completo (Dra. Dora Alicia Ramos Arce).
-- Su cuenta queda: is_trial = false, subscription_status = 'active'.
-- NO debe verse afectada por el bloqueo de trial.
UPDATE public.profiles
SET is_trial = false,
    subscription_status = 'active',
    current_plan = 'pro'
WHERE LOWER(email) = 'dora_aliciaramos@hotmail.com';

INSERT INTO public.subscriptions
  (user_id, plan, status, payment_method, billing_cycle, current_period_start, current_period_end)
SELECT u.id, 'pro', 'active', 'manual', 'annual', now(), now() + interval '1 year'
FROM auth.users u
WHERE LOWER(u.email) = 'dora_aliciaramos@hotmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id);

-- ── 6. Backfill: suscripción trialing para usuarios existentes sin registro ─
INSERT INTO public.subscriptions
  (user_id, plan, status, payment_method, current_period_start, current_period_end)
SELECT p.id, 'basico', 'trialing', 'pending', now(), COALESCE(p.trial_ends_at, now() + interval '30 days')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id);
