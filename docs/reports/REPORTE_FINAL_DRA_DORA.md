# 📋 REPORTE FINAL — MDPulso Dra. Dora

**Fecha**: 18 junio 2026
**Desarrollador**: RoAnderson + Claude Sonnet 4.5
**Commit**: `e2855aa`
**Estado**: 🟡 PENDIENTE PASO SQL (TÚ debes ejecutarlo)

---

## ✅ QUÉ SE ARREGLÓ (4 problemas de la demo)

### **1. Duración de citas personalizada (30 min Dra. Dora)**

**Problema**:
- Sistema tenía hardcoded 45 minutos para TODOS los doctores
- Dra. Dora necesita citas de 30 minutos

**Solución**:
- Nueva columna `user_profiles.appointment_duration`
- Cada doctor puede tener su propia duración
- Dra. Dora configurada a 30 minutos
- UI muestra "30 min" en tarjetas de citas
- NIA respeta la duración al agendar

**Archivos modificados**:
- `supabase/migrations/07_doctor_appointment_duration.sql` (nuevo)
- `components/appointments/AppointmentModal.tsx`
- `app/appointments/page.tsx`
- `app/api/nia/tools.ts`

---

### **2. Citas aparecían en día incorrecto (día 16 → día 17)**

**Problema**:
- Cita agendada para 16 de junio aparecía el 17
- Timezone shift UTC vs CDMX

**Solución**:
- Función `cdmxDayRangeUTC()` con offset `-06:00` fijo
- Comparación correcta usando rango UTC
- México abolió DST en 2023, siempre -06:00

**Archivos modificados**:
- `app/appointments/page.tsx` (líneas 56-71, 186-194)

**Antes**:
```typescript
// Cita 2026-06-16T22:00:00-06:00 → guarda como 2026-06-17T04:00:00Z
// .startsWith('2026-06-16') → NO MATCH ❌
```

**Después**:
```typescript
// Rango: 2026-06-16T00:00:00-06:00 hasta 2026-06-16T23:59:59-06:00
// Cita 2026-06-17T04:00:00Z está dentro del rango ✅
```

---

### **3. NIA no encontraba paciente Pedro**

**Problema**:
- Pedro se agregó pero NIA no lo encontraba al buscar expediente
- RPC `search_patients_nia` fallaba silenciosamente

**Solución**:
- Fallback de búsqueda directa si RPC falla
- Logging detallado en console (`[NIA Search]`)
- Mensaje de error claro si no encuentra nada

**Archivos modificados**:
- `app/api/nia/tools.ts` (líneas 199-233)

**Flujo**:
1. Intento 1: RPC `search_patients_nia` (optimizado)
2. Intento 2: Búsqueda SQL directa si RPC falla
3. Error claro: "No encontré ningún paciente con 'Pedro'. ¿Está registrado?"

---

### **4. Botón NIA tapaba los 3 puntitos + Sidebar inconsistente**

**Problema**:
- Botón NIA (🧠 verde) en esquina inferior derecha tapaba controles de citas
- Sidebar aparecía a veces sí, a veces no (dependía del ancho de pantalla)

**Solución**:
- **Botón NIA reubicado**: Esquina inferior IZQUIERDA
- **Sidebar oculto permanentemente**: Solo topbar + mobile nav
- Layout consistente en TODAS las pantallas

**Archivos modificados**:
- `components/layout/NiaAssistant.tsx` (línea 146)
- `components/layout/LayoutWrapper.tsx` (líneas 31-44)

**Antes**:
```
┌─────────────────────────┐
│ [Sidebar] │ Contenido   │
│  (a veces)│             │
│           │         🧠  │← Tapa controles
└─────────────────────────┘
```

**Después**:
```
┌─────────────────────────┐
│  Topbar                 │
├─────────────────────────┤
│  Contenido             │
│                         │
│ 🧠                      │← No interfiere
└─────────────────────────┘
```

---

## 🚨 ACCIÓN REQUERIDA (CRÍTICO)

### **PASO 1: Ejecutar SQL en Supabase**

**🔴 OBLIGATORIO antes de usar la app**

1. Ir a: https://supabase.com/dashboard/project/xcthxudqelqjfbsupxwo/sql/new
2. Copiar y pegar este SQL:

```sql
-- Agregar columna de duración de citas
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS appointment_duration integer DEFAULT 60;

COMMENT ON COLUMN public.user_profiles.appointment_duration
IS 'Duración de citas en minutos para este doctor (default: 60)';

-- Configurar Dra. Dora a 30 minutos
UPDATE public.user_profiles
SET appointment_duration = 30
WHERE LOWER(email) LIKE '%dora%' OR LOWER(full_name) LIKE '%dora%';

-- Verificar que funcionó
SELECT id, email, full_name, appointment_duration
FROM public.user_profiles
WHERE appointment_duration = 30;
```

3. Hacer clic en **"Run"**
4. Verificar que aparece **1 fila** con datos de Dra. Dora y `appointment_duration = 30`

**Si NO ejecutas este SQL**: La app funcionará PERO la Dra. Dora seguirá con citas de 60 min (default) en vez de 30 min.

---

## ✅ QUÉ YA ESTÁ LISTO

- [x] Código pusheado a GitHub (commit `e2855aa`)
- [x] Vercel detectó el push automáticamente
- [x] Build en progreso (tarda ~2-3 minutos)
- [x] URL de producción: https://medisync-ro.vercel.app

**Espera ~5 minutos** y el sitio estará actualizado con todos los fixes.

---

## 🧪 TESTING RÁPIDO (Hazlo TÚ antes de avisar a Dra. Dora)

### **Test 1: Duración 30 min**
1. Login como Dra. Dora
2. Crear cita a las 10:00 AM
3. Crear otra a las 10:20 AM → debe PERMITIR ✅
4. Crear otra a las 10:15 AM → debe BLOQUEAR ❌
5. Tarjeta muestra "30 min" ✅

### **Test 2: Día correcto**
1. Agendar cita para mañana 10:00 PM
2. Verificar que aparece en día correcto (no +1) ✅

### **Test 3: NIA encuentra Pedro**
1. Crear paciente "Pedro López"
2. Preguntar a NIA: "expediente de Pedro"
3. Debe encontrarlo ✅

### **Test 4: Botón NIA**
1. Verificar que está en esquina inferior IZQUIERDA ✅
2. Verificar que 3 puntitos son clickeables ✅

---

## 📞 MENSAJE PARA DRA. DORA

**Enviar SOLO después de**:
- ✅ Ejecutar SQL en Supabase
- ✅ Verificar que Vercel build terminó (verde)
- ✅ Hacer los 4 tests rápidos

**Mensaje sugerido**:

> Dra. Dora, buenas noticias! Ya están listos los 4 ajustes que necesitábamos de la demo del miércoles:
>
> ✅ **Citas de 30 minutos**: Ahora sus consultas son de 30 min (configurable por doctor)
> ✅ **Calendario correcto**: Las citas aparecen en el día que las agenda (fix de timezone)
> ✅ **NIA mejorado**: Encuentra pacientes nuevos sin problemas
> ✅ **Mejor UX**: Botón de NIA reubicado para que no tape los controles
>
> Puede empezar a usarlo normalmente. Si nota algo raro, me avisa de inmediato.
>
> Saludos!

---

## 🔗 LINKS IMPORTANTES

- **Producción**: https://medisync-ro.vercel.app
- **Supabase SQL**: https://supabase.com/dashboard/project/xcthxudqelqjfbsupxwo/sql/new
- **Vercel Dashboard**: https://vercel.com/rocorp8-devs-projects/medisync-ro
- **GitHub Commit**: https://github.com/rocorp8-dev/test-clinica-ro/commit/e2855aa
- **Checklist completo**: `/Users/ro/Documents/RoSaas/projects/mdpulso/DEPLOY_CHECKLIST.md`

---

## ⚠️ IMPORTANTE

**NO BORRES ESTOS ARCHIVOS**:
- `DEPLOY_CHECKLIST.md` → Instrucciones detalladas
- `REPORTE_FINAL_DRA_DORA.md` → Este archivo
- `supabase/migrations/07_doctor_appointment_duration.sql` → Migración SQL

Son documentación crítica del deploy.

---

**Siguiente paso**: Ejecuta el SQL en Supabase y verifica que todo funcione antes de avisar a la Dra. Dora. 🚀
