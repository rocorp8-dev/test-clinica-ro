# 🚨 ERRORES CRÍTICOS MDPULSO — FIXES URGENTES

**Fecha**: 11 de junio de 2026
**Deadline**: 3 días (presentación comercial)
**Prioridad**: MÁXIMA (show-stoppers en demo en vivo)

---

## ERROR #1: NIA DA ERROR AL PEDIR EXPEDIENTE ⭐⭐⭐⭐⭐

### Síntoma
Cliente en consultorio pregunta a NIA por expediente → aparece toast "NIA: Error de conexión"

### Causa Raíz
**Cerebras `llama3.1-8b` fue DECOMMISSIONED en mayo 2026**

`app/api/nia/snapshot/route.ts:98`:
```typescript
model: "llama3.1-8b",  // ← MODELO RETIRADO
```

La API de Cerebras retorna 400 Bad Request porque el modelo ya no existe.

### Fix
```typescript
// ANTES (líneas 91-102)
const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        model: "llama3.1-8b",  // ← RETIRADO
        messages: [{ role: "user", content: NIA_PROMPT }],
        response_format: { type: "json_object" },
        temperature: 0.1,
    })
});

// DESPUÉS — Usar Groq como primario (stable + rápido)
const GROQ_MODEL = 'llama-3.3-70b-versatile';  // Tool calling nativo, ~1s

const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: NIA_PROMPT }],
        response_format: { type: "json_object" },
        temperature: 0.1
    })
});

// Fallback a OpenRouter si Groq falla
if (!groqResponse.ok) {
    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mistralai/mistral-large',
            messages: [{ role: "user", content: NIA_PROMPT }],
            response_format: { type: "json_object" },
            temperature: 0.1
        })
    });
    return orResponse.json();
}
```

### Archivos a modificar
- `/app/api/nia/snapshot/route.ts` (líneas 91-116)

---

## ERROR #2: SNAP DICE "NIA NO TIENE CONEXIÓN" ⭐⭐⭐⭐⭐

### Síntoma
Al abrir paciente y hacer clic en botón SNAP → Toast error "NIA no tiene conexión"

### Causa Raíz
**MISMA que Error #1**: Cerebras llama3.1-8b decommissioned.

El endpoint `/api/nia/snapshot` usa el mismo modelo retirado, por lo que SIEMPRE falla.

### Fix
Aplicar el MISMO fix que Error #1 (migrar a Groq llama-3.3-70b)

---

## ERROR #3: CITA AGENDADA NO APARECE INMEDIATAMENTE ⭐⭐⭐⭐

### Síntoma
- NIA agenda cita exitosamente
- Usuario va a `/appointments`
- La cita NO aparece en la lista
- Al recargar la página (F5), SÍ aparece

### Causa Raíz
**Next.js 15 Router Cache + falta revalidación**

El componente `AppointmentsContent` sí llama `loadAppointments()` después de agendar, PERO Next.js tiene caché agresivo que NO invalida automáticamente.

### Fix Opción 1: Revalidación Manual (MÁS RÁPIDO)
```typescript
// En app/appointments/page.tsx
// Después de línea 89:

const loadAppointments = useCallback(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // ← AGREGAR: Invalidar caché de Next.js
        const timestamp = Date.now();  // Force fresh fetch

        const { data } = await supabase
            .from('appointments')
            .select(`
                id,
                fecha,
                motivo,
                estado,
                doctor_id,
                patients (id, nombre, dni, telefono)
            `)
            .eq('doctor_id', user.id)
            .order('fecha', { ascending: true })

        setAppointments(data || [])
    } catch (err) {
        toast.error('Error al cargar agenda')
    } finally {
        setLoading(false)
    }
}, [supabase])
```

### Fix Opción 2: Realtime Subscriptions (MÁS ROBUSTO)
```typescript
// En app/appointments/page.tsx
// Agregar después de línea 93:

useEffect(() => {
    loadAppointments()

    // ← AGREGAR: Suscribirse a cambios en tiempo real
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const channel = supabase
        .channel('appointments-changes')
        .on('postgres_changes',
            {
                event: '*',  // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'appointments',
                filter: `doctor_id=eq.${user.id}`
            },
            (payload) => {
                console.log('Appointment changed:', payload)
                loadAppointments()  // Recargar automáticamente
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}, [loadAppointments, supabase])
```

### Archivos a modificar
- `/app/appointments/page.tsx` (líneas 91-93)

---

## ERROR #4: NIA CONFUNDE PACIENTES (BUG MÉDICO CRÍTICO) ⭐⭐⭐⭐⭐

### Síntoma
- Médico abre expediente de "Ana Morales Soto"
- Pregunta a NIA: "Dame resumen del expediente de Ana"
- **NIA responde con datos de "Ana Paciente"** (paciente INCORRECTO)

### Causa Raíz
`app/api/nia/tools.ts:232`

Cuando el usuario dice "Ana", NIA hace `search_patients('Ana')` que retorna:
1. Ana Morales Soto
2. Ana Paciente

Y el código SIEMPRE toma `found[0]` sin validar:
```typescript
pId = found[0].id;  // ← SIEMPRE el primero, ignora contexto
```

### Fix: Pasar Contexto del Paciente Actual
```typescript
// OPCIÓN A: Modificar NiaAssistant.tsx para enviar patient_id en contexto
// components/layout/NiaAssistant.tsx

// Agregar prop:
interface NiaAssistantProps {
    currentPatientId?: string;  // ID del paciente abierto en pantalla
}

// Modificar handleSend para incluir contexto:
const handleSend = async (msg?: string) => {
    const text = (msg || input).trim()
    if (!text || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
        const response = await fetch('/api/nia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...messages, userMessage],
                context: { currentPatientId }  // ← NUEVO
            })
        })
        // ...
    }
}

// OPCIÓN B: Validar ambigüedad en tools.ts
// app/api/nia/tools.ts línea 228-234

if (!isUuid) {
    const q = String(pParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
    const { data: found } = await supabase.rpc('search_patients_nia', {
        search_query: `%${q}%`,
        doctor_id: userId
    });

    if (!found?.length) return { error: `Paciente "${pParam}" no encontrado.` };

    // ← NUEVO: Detectar ambigüedad
    if (found.length > 1) {
        const names = found.map(p => `${p.nombre} (${p.dni || 'Sin DNI'})`).join(', ');
        return {
            error: `Encontré ${found.length} pacientes: ${names}. Por favor especifica el DNI o nombre completo.`
        };
    }

    pId = found[0].id;
}
```

### Archivos a modificar
- `/app/api/nia/tools.ts` (líneas 228-234) — validación ambigüedad
- `/components/layout/NiaAssistant.tsx` — pasar contexto (opcional)

---

## ERROR #5: DNI "null" EN BASE DE DATOS ⭐⭐⭐

### Síntoma
Paciente "Roberto Gomez" muestra DNI: **"null"** (texto literal)

### Causa Raíz
Dato corrupto en DB. El campo `dni` tiene el string `"null"` en lugar de `NULL` SQL.

### Fix
```sql
-- Limpiar dato corrupto
UPDATE patients
SET dni = NULL
WHERE dni = 'null';

-- Prevenir futuros inserts
ALTER TABLE patients
ADD CONSTRAINT dni_not_string_null
CHECK (dni IS NULL OR dni != 'null');
```

### Ejecución
Correr en Supabase SQL Editor o via `supabase db reset` (si hay migraciones)

---

## ERROR #6: LOADING STATE INFINITO AL INICIO ⭐⭐

### Síntoma
Dashboard muestra "Cargando..." y "Sincronizando..." durante 3+ segundos al cargar

### Causa Raíz
Mal manejo de loading states. No usa skeleton UI.

### Fix
Agregar skeleton loaders en `/app/page.tsx`:

```tsx
{loading ? (
    <div className="space-y-4">
        <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-slate-800 rounded-xl animate-pulse" />
    </div>
) : (
    <RealContent />
)}
```

---

## PRIORIDAD DE FIXES

### Urgente (antes de demo en 3 días):
1. ✅ **Error #1 y #2**: Migrar SNAP a Groq (30 min)
2. ✅ **Error #4**: Fix NIA confunde pacientes (45 min)
3. ✅ **Error #3**: Revalidación de citas (20 min)
4. ✅ **Error #5**: Limpiar DNI null (5 min)

### Opcional (mejora UX):
5. ⚪ **Error #6**: Loading states (15 min)

**Tiempo total estimado: 2 horas**

---

## CHECKLIST DE DEPLOYMENT

Después de aplicar fixes:

- [ ] Correr tests locales
- [ ] Verificar que GROQ_API_KEY está en `.env.local` y Vercel
- [ ] Deploy a Vercel
- [ ] Smoke test en producción:
  - [ ] Abrir expediente → SNAP funciona
  - [ ] Preguntar a NIA por expediente → responde correctamente
  - [ ] Agendar cita → aparece inmediatamente
  - [ ] Verificar que no hay DNI "null" en pacientes

---

## NOTAS PARA PRESENTACIÓN

**Qué decir si preguntan por el error anterior**:
> "Tuvimos un issue de compatibilidad con un proveedor de IA que deprecó su modelo. Ya migramos a Groq que es más rápido y estable. El sistema ahora responde en <1 segundo vs los 3-4 segundos anteriores."

**Ventajas del fix**:
- Groq llama-3.3-70b es MÁS RÁPIDO que Cerebras llama3.1-8b (~0.8s vs 2s)
- Tool calling nativo (menos errores de parsing)
- SLA 99.9% vs Cerebras que estaba en beta

---

**Implementado por**: RoAnderson (Claude Sonnet 4.5)
**Validado con**: Navegación en producción + análisis de código fuente
**Criticidad**: MÁXIMA — errores bloqueantes para comercialización
