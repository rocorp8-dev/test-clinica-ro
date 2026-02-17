# SISTEMA DE AUTENTICACIÓN: Blueprint Universal

## STACK FIJO
- Supabase Auth (email/password)
- Next.js App Router (Server Components + Server Actions)
- Proxy-based route protection

## DEPENDENCIAS REQUERIDAS
npm install @supabase/supabase-js @supabase/ssr

## ARCHIVOS A CREAR: 15 archivos con código completo

1. proxy.ts (RAÍZ del proyecto)
2. src/lib/supabase/client.ts
3. src/lib/supabase/server.ts
4. src/lib/supabase/proxy.ts
5. src/types/database.ts
6. src/actions/auth.ts
7. src/hooks/useAuth.ts
8. src/features/auth/components/LoginForm.tsx
9. src/features/auth/components/SignupForm.tsx
10. src/features/auth/components/ForgotPasswordForm.tsx
11. src/features/auth/components/UpdatePasswordForm.tsx
12. src/features/auth/components/index.ts
13-17. Páginas de Auth (/login, /signup, /check-email, etc.)

## RECORDATORIOS CRÍTICOS
- proxy.ts va en la RAÍZ del proyecto, NUNCA en src/
- La función se llama proxy(), NUNCA middleware()
- Server side siempre getUser(), NUNCA getSession()
