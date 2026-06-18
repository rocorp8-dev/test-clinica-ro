# Índice de Migraciones - MDPulso

## Estado Actual en Supabase SQL Editor

En el SQL Editor de Supabase hay **9 "Untitled query"** que corresponden a las migraciones ejecutadas manualmente.

No es posible renombrarlas después de ejecutadas, pero este índice documenta qué migration corresponde a cada una.

## Orden Cronológico de Migraciones

| # | Archivo | Fecha | Descripción | Estado |
|---|---|---|---|---|
| 01 | `01_initial_schema.sql` | 2026-02-17 | Schema inicial (patients, appointments, doctors, etc.) | ✅ Ejecutada |
| 02 | `02_nom_004_024.sql` | 2026-04-10 | Campos NOM-004 y NOM-024 para cumplimiento regulatorio | ✅ Ejecutada |
| 03 | `03_billing_table.sql` | 2026-04-08 | Tabla de facturación y pagos | ✅ Ejecutada |
| 04 | `04_nia_safety_rpc.sql` | 2026-04-10 | RPC functions para NIA (AI assistant) con safety checks | ✅ Ejecutada |
| 05 | `05_user_profiles_notifications.sql` | 2026-05-24 | Perfiles de usuario y sistema de notificaciones | ✅ Ejecutada |
| 06 | `06_fix_trigger_y_demo.sql` | 2026-05-25 | Fix triggers + datos demo para testing | ✅ Ejecutada |
| 07 | `07_doctor_appointment_duration.sql` | 2026-06-18 | Campo duration_minutes en appointments | ✅ Ejecutada |
| 08 | `08_create_exec_sql_function.sql` | 2026-06-18 | RPC function exec_sql() para supabase-exec skill | ✅ Ejecutada |
| 09 | `20260611_fix_dni_null.sql` | 2026-06-11 | Fix DNI null validation | ✅ Ejecutada |

## Notas Importantes

### Migration #09 (fix_dni_null)
- Esta migración está **fuera de orden** en el nombre del archivo (usa fecha 20260611)
- Fue ejecutada después de la #07 pero tiene timestamp más viejo
- En el futuro, usar formato: `NN_descripcion.sql` (sin timestamp)

### Migration #08 (exec_sql_function)
- Esta es la función RPC crítica para el skill `supabase-exec`
- Permite ejecutar SQL desde la terminal sin copy/paste
- **NO borrar** esta función - es parte de la infraestructura de la factoría

## Limpieza Recomendada

Las "Untitled query" en Supabase SQL Editor se pueden **eliminar sin riesgo**:
1. El SQL ya está ejecutado en la DB
2. El código fuente está versionado en `supabase/migrations/`
3. Eliminar las queries solo limpia el UI, no afecta la DB

**Cómo limpiar**:
1. Ve a SQL Editor en Supabase
2. Click derecho en cada "Untitled query"
3. Delete
4. Repetir para las 9 queries

## Próximas Migraciones

**SIEMPRE usar el formato**:
```sql
-- ========================================
-- Migration: [número]_[nombre_descriptivo]
-- Date: [YYYY-MM-DD]
-- Description: [Qué hace esta migración]
-- ========================================

[SQL aquí]
```

Esto asegura que aparezcan con nombre en Supabase, NO como "Untitled Query".
