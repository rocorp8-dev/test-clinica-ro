# 🔒 Auditoría de Seguridad — MDPulso
**Fecha:** 2026-10-24 | **Estado:** Correcciones FASE 6 aplicadas ✅

---

## Resumen Ejecutivo

| Área | Estado | Riesgo |
|---|---|---|
| Autenticación y sesiones | ✅ Bien | Bajo |
| RLS (Row Level Security) en DB | ✅ Bien | Bajo |
| Secretos y API keys en código | ✅ Corregido | Bajo |
| Panel admin expuesto | ✅ Corregido | Bajo |
| Console.log con datos de pacientes | ✅ Corregido | Bajo |
| Sobre-fetching de datos (SELECT *) | ✅ Corregido | Bajo |
| Encriptación de datos en tránsito | ✅ Bien (HTTPS/TLS) | Bajo |
| Service Role Key en cliente | ✅ Bien (solo server) | Bajo |

---

## ✅ CRÍTICO #1 — Clave Admin Hardcodeada — CORREGIDO

- `rocorp2026` eliminado del código fuente (grep limpio en todo el repo)
- `app/admin/page.tsx` y `app/api/admin/manage/route.ts` leen `process.env.ADMIN_SECRET_KEY`
- **Hardening extra**: si la variable falta, NADIE entra (`!ADMIN_KEY ||` en ambas validaciones) — nunca se acepta clave vacía
- Nueva clave generada aleatoriamente (48 chars) en `.env.local`
- ⚠️ Pendiente del dueño: agregar `ADMIN_SECRET_KEY` en Vercel antes del deploy

## ✅ CRÍTICO #2 — Service Role Key en NIA — VERIFICADO BIEN

- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en rutas de servidor (nunca se expone al cliente)
- `userId` siempre proviene de `supabase.auth.getUser()` — nunca del body
- Todas las queries de `tools.ts` filtran por `user_id` / `doctor_id`

## ✅ PROBLEMA #3 — Console.log con datos clínicos — CORREGIDO

`lib/logger.ts` creado: log/warn solo en dev; error muestra solo contexto en prod (~56 llamadas migradas):

| Archivo | Cambio |
|---|---|
| `app/api/nia/route.ts` | 34 `console.*` → `logger.*` |
| `app/api/nia/tools.ts` | 4 → `logger.*` |
| `app/api/nia/snapshot/route.ts` | 12 → `logger.*` |
| `app/api/growth/route.ts` | 3 → `logger.error` |
| `app/billing/page.tsx` | 1 `console.log` eliminado |
| `app/appointments/page.tsx` | 1 (payload real-time) → `logger.log` |
| `components/patients/PatientDetailModal.tsx` | 1 → `logger.error` |

## ✅ PROBLEMA #4 — SELECT * — CORREGIDO

Campos explícitos verificados contra el schema real y todos los componentes consumidores (PatientModal, PatientDetailModal, GrowthTab, records, NIA):

| Archivo | Queries |
|---|---|
| `app/records/page.tsx` | patients, medical_notes, appointments |
| `app/patients/page.tsx` | patients |
| `app/api/nia/tools.ts` | patients (perfil para IA) |
| `app/api/nia/snapshot/route.ts` | patients, appointments, medical_notes |

## ✅ PROBLEMA #5 — Admin sin rate limiting — PARCIAL

- Clave ahora es aleatoria de 48 chars (fuerza bruta inviable)
- Pendiente (prioridad 3): rate limiting + migrar auth admin a cookie HTTP-only

## ✅ BONUS — Security Headers (FASE 6.4)

`next.config.js`: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, X-XSS-Protection, Permissions-Policy.

## ✅ BONUS — Errores sanitizados (FASE 6.5)

`safeErrorMessage()` en `lib/logger.ts`: en dev muestra el detalle, en prod solo mensaje genérico. Aplicado en `growth/route.ts` (3x), `checkout/create-session`, `nia/snapshot`.

---

## Lo que ya estaba bien implementado

- **RLS completo** en todas las tablas (cada doctor solo ve sus datos)
- **HTTPS/TLS** forzado por Vercel; cifrado en reposo AES-256 de Supabase
- **`getUser()` no `getSession()`** en todas las rutas protegidas
- **Cookie de trial firmada HMAC-SHA256** en middleware (httpOnly, secure, sameSite lax)
- **Fail-open en middleware** — nunca bloquea por error técnico
- **Webhook Stripe** verifica firma antes de procesar
- **Datos de la pediatra** protegidos por RLS + cuenta marcada `active`

## Pendiente (prioridad 2-3)

1. `STRIPE_WEBHOOK_SECRET` + variables Stripe en Vercel (bloquea el flujo de pagos en prod)
2. Rate limiting en `/admin` y auth por cookie HTTP-only
3. Content Security Policy (CSP) estricta
4. Encriptación a nivel de campo (`pgcrypto`) si aplica regulación futura
