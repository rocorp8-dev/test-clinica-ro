# 🚀 DEPLOY CHECKLIST — MDPulso v2.0 (Dra. Dora)

**Fecha**: 18 junio 2026
**Commit**: `e2855aa`
**Status**: ⏳ PENDIENTE EJECUCIÓN SQL

---

## ✅ COMPLETADO

- [x] **Fix timezone shift** (cita día 16 → día 17)
- [x] **NIA búsqueda fallback** (Pedro no aparecía)
- [x] **Duración dinámica de citas** (30 min Dra. Dora)
- [x] **UX: Botón NIA reubicado** (bottom-left, no tapa controles)
- [x] **UX: Sidebar oculto** (layout consistente)
- [x] **Código pusheado a GitHub** (`e2855aa`)
- [x] **Vercel auto-deploy iniciado**

---

## ⏳ PENDIENTE (CRÍTICO)

### **PASO 1: Ejecutar SQL en Supabase** 🔴 OBLIGATORIO

**Proyecto**: `xcthxudqelqjfbsupxwo`
**URL**: https://supabase.com/dashboard/project/xcthxudqelqjfbsupxwo/sql/new

**SQL a ejecutar**:

```sql
-- ============================================================
-- Migración 07: Configuración de duración de citas por doctor
-- ============================================================

-- 1. Agregar columna appointment_duration a user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS appointment_duration integer DEFAULT 60;

COMMENT ON COLUMN public.user_profiles.appointment_duration
IS 'Duración de citas en minutos para este doctor (default: 60)';

-- 2. Actualizar la Dra. Dora a 30 minutos
UPDATE public.user_profiles
SET appointment_duration = 30
WHERE LOWER(email) LIKE '%dora%' OR LOWER(full_name) LIKE '%dora%';

-- 3. Verificar que se aplicó correctamente
SELECT id, email, full_name, appointment_duration
FROM public.user_profiles
WHERE appointment_duration = 30;
```

**Resultado esperado**: Debe mostrar 1 fila con los datos de la Dra. Dora y `appointment_duration = 30`.

---

## 🧪 TESTING EN PRODUCCIÓN

### **Test 1: Duración de citas (30 min Dra. Dora)**

1. Login como Dra. Dora en https://medisync-ro.vercel.app
2. Ir a **Agenda Médica**
3. Crear cita nueva a las **10:00 AM**
4. Intentar crear otra cita a las **10:20 AM** → debe PERMITIR ✅ (30 min ya pasaron)
5. Intentar crear otra cita a las **10:15 AM** → debe BLOQUEAR ❌ (conflicto dentro de 30 min)
6. Verificar que tarjeta de cita muestra **"30 min"** (no "45 min")

### **Test 2: Timezone shift (cita día correcto)**

1. Agendar cita para **mañana 19 junio a las 10:00 PM** (22:00)
2. Ir a **Agenda Médica**
3. Seleccionar **19 junio** en el calendario
4. Verificar que la cita aparece en **19 junio** (NO en 20 junio) ✅

### **Test 3: NIA búsqueda de pacientes**

1. Crear paciente nuevo: **"Pedro López"**
2. Abrir NIA (botón verde esquina inferior izquierda)
3. Preguntar: "muéstrame el expediente de Pedro"
4. Debe encontrarlo ✅
5. Console de navegador debe mostrar: `[NIA Search] Original: "muéstrame el expediente de Pedro" → Cleaned: "Pedro"`

### **Test 4: UX - Botón NIA no tapa controles**

1. En mobile o pantalla pequeña (<768px)
2. Ir a **Agenda Médica**
3. Verificar cita con estado "pendiente"
4. Botón de 3 puntitos (⋯) debe ser **clickeable** ✅
5. Botón NIA (🧠) debe estar en **esquina inferior IZQUIERDA** ✅

### **Test 5: Layout consistente (sin sidebar)**

1. Abrir en mobile (iPhone/Android)
2. Abrir en tablet (iPad)
3. Abrir en desktop (laptop/monitor)
4. **TODAS** las pantallas deben verse **SIN sidebar** (solo topbar + mobile nav) ✅

---

## 📊 MÉTRICAS DE ÉXITO

- [ ] **0 errores** en console de navegador
- [ ] **Citas aparecen en día correcto** (no +1 día)
- [ ] **NIA encuentra pacientes nuevos** (sin delay)
- [ ] **Dra. Dora tiene citas de 30 min** (no 60 min)
- [ ] **Botón NIA no interfiere con controles**
- [ ] **Layout consistente en todas las pantallas**

---

## 🚨 ROLLBACK (Si algo falla)

Si después del SQL hay problemas:

```sql
-- Revertir cambios
ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS appointment_duration;
```

Luego hacer rollback en Vercel:
1. Dashboard → Deployments
2. Buscar deployment anterior (`f1b4fa5`)
3. Click en "..." → Promote to Production

---

## 📞 CONTACTO DRA. DORA

**SOLO avisar cuando**:
- ✅ SQL ejecutado en Supabase
- ✅ Build exitoso en Vercel (verde)
- ✅ Todos los tests pasados

**Mensaje sugerido**:

> Dra. Dora, ya están listos los 4 fixes que necesitábamos:
>
> 1. ✅ Sus citas ahora son de 30 minutos (configurable)
> 2. ✅ Citas aparecen en el día correcto (fix timezone)
> 3. ✅ NIA encuentra pacientes nuevos sin problemas
> 4. ✅ Botón NIA reubicado (no tapa controles)
>
> Puede empezar a usarlo normalmente. Cualquier cosa me avisa.

---

## 🔗 LINKS ÚTILES

- **Producción**: https://medisync-ro.vercel.app
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/xcthxudqelqjfbsupxwo/sql/new
- **Vercel Deployments**: https://vercel.com/rocorp8-devs-projects/medisync-ro/deployments
- **GitHub Commit**: https://github.com/rocorp8-dev/test-clinica-ro/commit/e2855aa
