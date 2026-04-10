# 🧠 ARCHIVO KL (Knowledge & Lessons): Lecciones Aprendidas de Proyectos Anteriores

Este archivo documenta los errores críticos superados en versiones previas de la Ro SaaS Factory. Sirve como base de conocimiento arquitectónico. **CADA NUEVO PROYECTO CREADO POR LA FÁBRICA DEBE ESTAR BLINDADO CONTRA ESTOS FALLOS DESDE EL MINUTO CERO.**

---

## 🛑 1. CRASH DE BUILD EN VERCEL POR VARIABLES DE ENTORNO
**Fallo:** Next.js pre-renderiza páginas estáticas durante el Build (antes de runtime). Si páginas/componentes cliente usan `process.env.NEXT_PUBLIC_SUPABASE_URL!` u otros métodos estrictos de llamada a entorno, el servidor CI de Vercel (que carece de contexto `.env.local`) rompe la compilación al encontrar `undefined` y frena el Deploy.
**Solución Inyectada a Fábrica:**
Toda invocación a Supabase u otra variable de entorno DEBE encapsularse con strings de fallback dinámicos en archivos cliente o server components de Next.js:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
```

## 🛑 2. EL RETORNO MALÉFICO: `[object Object]` EN APIs DE TERCEROS
**Fallo:** Al construir integraciones con Inteligencia Artificial (OpenRouter) o procesadores de pago (Stripe), a veces sus servidores devuelven errores anidados en JSON. Un bloque `catch (err)` en promesas trataba estos errores y el Frontend intentaba renderizarlos en un Toast, resultando en un ilegible mensaje "*No se pudo completar la acción: [object Object]*".
**Solución Inyectada a Fábrica:**
Extracción profunda de mensajes de error como nuevo estándar de manejo en bloques Try-Catch de Frontend para endpoints a terceros:
```typescript
} catch (err) {
  let errorMsg = 'Error inesperado';
  if (typeof err === 'object' && err !== null) {
      errorMsg = err.error?.message || err.message || err.error || JSON.stringify(err);
      if(typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg)
  } else {
      errorMsg = String(err);
  }
  toast.error(`Aviso: ${errorMsg}`);
}
```

## 🛑 3. METADATA DE NEXT.JS 15/16 Y EL RECHAZO DE VIEWPORT
**Fallo:** Al migrar a las últimas versiones de Turbopack/Next.js (15+), la etiqueta *viewport* (ancho, initial-scale, theme-color) fue deprecada y expulsada del objeto global `metadata`. Mantenerlos juntos causaba advertencias en consola y bloqueos intermitentes de Build Phase.
**Solución Inyectada a Fábrica:**
Absoluta separación obligatoria en `layout.tsx` (App Router):
```typescript
export const metadata: Metadata = {
  title: 'Mi SaaS',
  description: 'Descripción de la APP',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10b981',
}
```

## 🛑 4. CAOS CRONOLÓGICO Y TIMESPACE (UTC VS LOCAL)
**Fallo:** Modales de citas que pasaban formatos `ISOString()` completos a Supabase. Como JS y Postgres procesan Timezones distintos, una cita elegida en "Martes a las 10:00" en México se guardaba como "Lunes a las 23:00" en UTC, destruyendo el ordenamiento de calendarios frontend y volviendo loca la tabla de horarios.
**Solución Inyectada a Fábrica:**
1. Separación forzada en el esquema relacional (`fecha` tipo DATE "2024-03-24" sin formato hora) y (`rango_hora` tipo VARCHAR "10:00 - 10:45") para sistemas de calendario agnósticos a geolocalización.
2. Si se emplea `timestamptz`, solo deben ordenarse mediante query SQL: `.order('fecha', { ascending: true })`.
3. Constraint en Supabase como capa adicional: `ADD CONSTRAINT no_past_dates CHECK (fecha >= NOW() - INTERVAL '5 minutes')`.

## 🛑 5. MUTACIÓN INESPERADA DE DATOS (SPREAD OPERATOR EN CRUD)
**Fallo:** Al enviar un formulario a la Base de Datos (ej. usando Supabase), el uso del Spread Operator `{ ...formData }` pasaba todo el estado crudo. Si el estado del front tenía propiedades incidentales (ej: `expanded: true`, `editingMode: false`) que no existían en las columnas de la tabla SQL, el comando "Insert" o "Update" detonaba un Error 500 y fallaba silenciosamente, cortando el Happy Path.
**Solución Inyectada a Fábrica:**
Prohibición absoluta de Spread Operators desnudos en llamadas a bases de datos. Todo Payload debe declararse mapeando explícitamente los campos:
```typescript
// ❌ MAL (Explosivo)
await updateProject(id, { ...formData })

// ✅ BIEN (Estándar de la Factoría)
await updateProject(id, {
    title: formData.title,
    description: formData.description,
    status: formData.status
})
```

## 🛑 6. BOTONES ADMINISTRADOS FLOTANTES DESTRUYENDO UI MÓVIL
**Fallo:** Los paneles de administración incluían "botones flotantes" o engranajes fijados en la esquina (ej: `fixed bottom-4 right-4`). En dispositivos móviles (iPhone), esto destruía la Inmersión del Landing Page o chocaba con el área de contacto del teclado/Botones de acción inferiores (Bottom Nav).
**Solución Inyectada a Fábrica:**
La funcionalidad de "Panel de Control" (Admin Access) para Landing Pages **siempre** debe ocultarse de la vista base móvil (`hidden md:block`) o integrarse a través de un "Enlace de Acción Discreta" (ejemplo, doble toque en el logo, o enrutamiento forzado `/admin`) para no ensuciar la visualización del usuario final. Además se prohíbe el uso de z-index conflictivos sobre el "bottom safe-area" de iOS.

## 🛑 7. WEBHOOK MAKE.COM — CAMPO `media_type` OBLIGATORIO PARA CARRUSELES
**Fallo:** Al enviar carruseles de imágenes a Make.com desde arq-medios, el payload omitía el campo `media_type` en cada ítem del array `images`. Make.com rechazaba silenciosamente los carruseles o los publicaba como posts de imagen única, ignorando el resto del array.
**Proyecto:** arq-medios / D9_Marketin_2.0
**Solución Inyectada a Fábrica:**
Cada objeto en el array de imágenes del webhook DEBE incluir `media_type: "IMAGE"` explícitamente:
```typescript
const imagesArray = imageUrls.map((url: string) => ({
  url: url,
  media_type: "IMAGE"  // ← OBLIGATORIO para Make.com carousel
}))

const payload = {
  page_id: fbPageId,
  images: imagesArray,
  title: content.title,
  caption: caption,
  type: content.type,
}
```

## 🛑 8. RLS DE SUPABASE — ENABLE ANTES DE CREAR POLICIES
**Fallo:** Se creaban políticas RLS en tablas de Supabase sin ejecutar primero `ALTER TABLE nombre ENABLE ROW LEVEL SECURITY`. El resultado: las policies existían en el schema pero no se aplicaban, dejando datos completamente expuestos sin error visible. Solo se detectó al auditar con usuario no autenticado.
**Proyecto:** test-clinica, academia-ia-jovenes
**Solución Inyectada a Fábrica:**
Orden obligatorio en cada migration SQL:
```sql
CREATE TABLE mi_tabla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users NOT NULL,
  -- campos --
  created_at timestamptz DEFAULT now()
);

-- ← SIEMPRE antes de las policies
ALTER TABLE mi_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access" ON mi_tabla
  FOR ALL USING (auth.uid() = owner_id);
```

## 🛑 9. HYDRATION MISMATCH — `new Date()` EN SERVER VS CLIENT
**Fallo:** Componentes que usaban `new Date()` directamente en el render (ej: mostrar hora actual, calcular "hace X tiempo") producían errores de hidratación en Next.js App Router. El servidor generaba un timestamp y el cliente generaba otro diferente al montar, rompiendo la sincronización del DOM.
**Proyecto:** test-clinica, academia-ia-jovenes, arq-medios
**Solución Inyectada a Fábrica:**
```typescript
// ❌ MAL — Hydration mismatch garantizado
export default function Card() {
  return <p>Hoy: {new Date().toLocaleDateString()}</p>
}

// ✅ BIEN — Mover a useEffect o agregar suppressHydrationWarning
export default function Card() {
  const [fecha, setFecha] = useState('')
  useEffect(() => {
    setFecha(new Date().toLocaleDateString())
  }, [])
  return <p suppressHydrationWarning>Hoy: {fecha}</p>
}
```

## 🛑 10. TABLAS SIN `updated_at` TRIGGER — DATOS DESINCRONIZADOS
**Fallo:** Tablas en Supabase creadas sin trigger de `updated_at` automático. Al editar registros, el campo `updated_at` permanecía igual al `created_at` original, rompiendo lógica de "último modificado", ordenamientos por fecha de edición y auditorías.
**Proyecto:** test-clinica (pacientes), arq-medios (contenido)
**Solución Inyectada a Fábrica:**
Función global + trigger en CADA tabla con campo `updated_at`:
```sql
-- Función global (crear una sola vez por proyecto)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger por tabla
CREATE TRIGGER set_updated_at_pacientes
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## 🛑 11. DOBLE CITA EN EL MISMO HORARIO (CLINICA)
**Fallo:** El sistema de citas de test-clinica permitía agendar dos pacientes diferentes con el mismo doctor en el mismo horario. No había constraint en Supabase ni validación en frontend. Se detectó al hacer pruebas de estrés con carga masiva de datos semilla.
**Proyecto:** test-clinica
**Solución Inyectada a Fábrica:**
Constraint UNIQUE compuesto en la tabla + validación previa en frontend:
```sql
-- Constraint en DB (capa definitiva)
ALTER TABLE citas
  ADD CONSTRAINT no_double_booking
  UNIQUE (doctor_id, fecha, rango_hora);

-- Validación antes de insertar (capa UX)
const { data: conflict } = await supabase
  .from('citas')
  .select('id')
  .eq('doctor_id', doctorId)
  .eq('fecha', fecha)
  .eq('rango_hora', rangoHora)
  .maybeSingle()

if (conflict) {
  toast.error('Ya existe una cita en ese horario')
  return
}
```

## 🛑 12. AGENTE TELEGRAM (IROBOT) — MEMORIA SQLITE SIN ÍNDICES
**Fallo:** El bot de Telegram iRobot usaba SQLite para persistir memoria de conversaciones. Al crecer la base de datos con cientos de entradas, las consultas de "recuperar contexto reciente del usuario" empezaban a tardar 2-3 segundos, haciendo al bot perceptiblemente lento en chats activos.
**Proyecto:** irobot
**Solución Inyectada a Fábrica:**
Índices obligatorios en tablas de memoria de agentes:
```sql
-- Índice por user_id para recuperar contexto rápido
CREATE INDEX idx_memory_user_id ON memory(user_id);
CREATE INDEX idx_memory_created_at ON memory(user_id, created_at DESC);

-- Limitar contexto a últimas N entradas en consulta
SELECT * FROM memory
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20
```

## 🛑 13. FAL.AI VIDEO — RESPUESTA ASÍNCRONA IGNORADA (QUEUE PATTERN)
**Fallo:** Al integrar fal.ai para generación de video en arq-medios, se hacía una llamada `await fetch()` esperando respuesta inmediata. fal.ai usa un modelo de cola asíncrona: responde con `request_id` inmediatamente y el video está listo minutos después. El frontend mostraba error de timeout porque esperaba el video completo en la respuesta inicial.
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Arquitectura de cola en dos fases con webhook de callback:
```typescript
// FASE 1: Enviar a la cola (respuesta instantánea)
const response = await fetch(`https://queue.fal.run/${model}`, {
  method: 'POST',
  headers: { 'Authorization': `Key ${FAL_KEY}` },
  body: JSON.stringify({
    prompt,
    webhook_url: `${NEXT_PUBLIC_APP_URL}/api/generate/video/webhook`,
    user_id: userId
  })
})
const { request_id } = await response.json()
// Guardar request_id en DB con status 'processing'

// FASE 2: Recbir cuando esté listo (webhook callback)
// app/api/generate/video/webhook/route.ts
export async function POST(req: Request) {
  const { request_id, video } = await req.json()
  // Actualizar DB con URL del video
  await supabase.from('videos')
    .update({ url: video.url, status: 'ready' })
    .eq('fal_request_id', request_id)
}
```

## 🛑 14. OPENROUTER — MODELO INCORRECTO CAUSA SILENCIO TOTAL
**Fallo:** En D9_Marketin_2.0 y arq-medios se especificaba el modelo de OpenRouter con formato incorrecto (ej: `"gemini-2.0-flash"` en lugar de `"google/gemini-2.0-flash-exp"`). La API de OpenRouter no lanzaba un error explícito — simplemente retornaba respuesta vacía o `null`, haciendo que el agente pareciera "congelado".
**Proyecto:** D9_Marketin_2.0, arq-medios
**Solución Inyectada a Fábrica:**
Siempre usar el identificador completo de OpenRouter y validar la respuesta:
```typescript
const OPENROUTER_MODEL = "google/gemini-2.0-flash-exp" // ← formato: proveedor/modelo

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
  body: JSON.stringify({ model: OPENROUTER_MODEL, messages })
})

const data = await response.json()

// Validar antes de usar
if (!data.choices?.[0]?.message?.content) {
  throw new Error(`OpenRouter sin respuesta. Modelo: ${OPENROUTER_MODEL}`)
}
```

## 🛑 15. AUTH CALLBACK — RUTA `/auth/callback` OLVIDADA EN DEPLOY
**Fallo:** En academia-ia-jovenes, el registro de estudiantes enviaba email de verificación. En local funcionaba bien. En Vercel, el link del email apuntaba a `localhost:3000/auth/callback` porque no se configuró `NEXT_PUBLIC_SITE_URL` en las variables de entorno de Vercel. El usuario hacía clic en el link y llegaba a una página rota.
**Proyecto:** academia-ia-jovenes
**Solución Inyectada a Fábrica:**
1. Variable `NEXT_PUBLIC_SITE_URL` obligatoria en Vercel con la URL del dominio real.
2. En Supabase Dashboard → Authentication → URL Configuration → agregar la URL de producción.
3. Ruta `app/auth/callback/route.ts` siempre debe existir:
```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

## 🛑 16. VALIDACIÓN DE EDAD — CÁLCULO INCORRECTO CON `getFullYear()`
**Fallo:** En academia-ia-jovenes, la validación de edad para estudiantes (13-25 años) usaba solo `getFullYear()` sin considerar mes/día. Un estudiante nacido el 31 de diciembre de 2011 aparecía como "14 años" en enero 2026 cuando en realidad tenía 13 años y aún no cumplía 14. Esto permitía registros inválidos.
**Proyecto:** academia-ia-jovenes
**Solución Inyectada a Fábrica:**
```typescript
export const calcularEdad = (fechaNacimiento: string): number => {
  const today = new Date()
  const birth = new Date(fechaNacimiento)
  let age = today.getFullYear() - birth.getFullYear()

  // Ajuste por mes/día
  const mesActual = today.getMonth()
  const mesBirth = birth.getMonth()
  if (mesActual < mesBirth ||
      (mesActual === mesBirth && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Validación completa
const validarEdadEstudiante = (fechaNacimiento: string) => {
  const edad = calcularEdad(fechaNacimiento)
  if (edad < 13) return { valid: false, msg: 'Debes tener al menos 13 años' }
  if (edad > 25) return { valid: false, msg: 'Este programa es para menores de 25 años' }
  return { valid: true, msg: '' }
}
```

## 🛑 17. SUPABASE KEEPALIVE — PLANES GRATUITOS SE DUERMEN
**Fallo:** Los proyectos en Supabase Free Tier (supabase-keepalive, keepalive-service) entraban en modo "sleep" después de 7 días de inactividad, haciendo que la primera request tardara 10-15 segundos en "despertar" el proyecto. Esto rompía la experiencia de usuario al inicio de sesiones.
**Proyecto:** supabase-keepalive, keepalive-service
**Solución Inyectada a Fábrica:**
Script de keepalive que hace ping periódico a Supabase:
```typescript
// Ejecutar con cron cada 5 días
const SUPABASE_URLS = [
  process.env.PROJECT_1_URL,
  process.env.PROJECT_2_URL,
]

async function keepAlive() {
  for (const url of SUPABASE_URLS) {
    await fetch(`${url}/rest/v1/`, {
      headers: { 'apikey': process.env.ANON_KEY }
    })
    console.log(`✅ Ping a ${url}`)
  }
}
```

## 🛑 18. DICTADO HANDSFREE — PERMISOS DE MICRÓFONO EN MACOS VENTURA+
**Fallo:** dictado-handsfree funcionaba en macOS Monterey pero al ejecutarse en Ventura+, la app Python no tenía permisos de acceso al micrófono. El script corría silenciosamente sin grabar nada y retornaba transcripción vacía sin lanzar excepción.
**Proyecto:** dictado-handsfree
**Solución Inyectada a Fábrica:**
1. El usuario debe otorgar permisos en: **System Settings → Privacy & Security → Microphone → Terminal** (o la app desde donde se corra Python).
2. Agregar validación explícita en el script:
```python
import subprocess
result = subprocess.run(['python3', '-c', 'import sounddevice; sounddevice.query_devices()'],
                       capture_output=True, text=True)
if result.returncode != 0:
    print("⚠️  Sin acceso al micrófono. Ve a System Settings → Privacy → Microphone")
    exit(1)
```

## 🛑 19. GROQ — RATE LIMIT EN GENERACIÓN MASIVA DE CONTENIDO
**Fallo:** arq-medios generaba múltiples piezas de contenido en paralelo usando `Promise.all()` con llamadas a Groq. Con más de 3 llamadas simultáneas, Groq retornaba error 429 (rate limit) para el plan free. El frontend mostraba errores parciales sin indicar cuál contenido había fallado.
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Procesamiento secuencial con delay o uso de batches:
```typescript
// ❌ MAL — Dispara todo a la vez
const results = await Promise.all(items.map(item => generateWithGroq(item)))

// ✅ BIEN — Secuencial con pausa entre llamadas
const results = []
for (const item of items) {
  const result = await generateWithGroq(item)
  results.push(result)
  await new Promise(r => setTimeout(r, 500)) // 500ms entre llamadas
}

// O con límite de concurrencia (máx 2 paralelas)
import pLimit from 'p-limit'
const limit = pLimit(2)
const results = await Promise.all(items.map(item => limit(() => generateWithGroq(item))))
```

## 🛑 20. VARIABLE `config` UNDEFINED EN WEBHOOK ROUTE
**Fallo:** En arq-medios webhook route, se referenciaba una variable `config` antes de declararla dentro de un bloque condicional. En runtime con ciertos payloads, el condicional no se ejecutaba y `config` quedaba `undefined`, causando error `Cannot read properties of undefined` que rompía todos los webhooks entrantes de Make.com.
**Proyecto:** arq-medios (commit: fix: resolve undefined config variable in webhook route)
**Solución Inyectada a Fábrica:**
Inicializar siempre con valor por defecto antes de condicionales:
```typescript
// ❌ MAL
let config
if (condition) {
  config = { ... }
}
const result = config.value // 💥 undefined si condition es false

// ✅ BIEN
let config = { value: 'default', ... } // valor por defecto
if (condition) {
  config = { ... }
}
const result = config.value // siempre seguro
```

## 🛑 21. GEMINI EN CUENTAS GOOGLE WORKSPACE — `limit: 0` SIN EXPLICACIÓN
**Fallo:** Al usar Gemini API (directamente o vía OpenRouter con `google/gemini-*`) desde cuentas Google Workspace empresariales, la API retorna `rate_limit: 0` o `quota_exceeded` desde el primer request, sin mensaje de error claro. Las cuentas Workspace tienen acceso a Gemini bloqueado por defecto hasta que el admin del dominio habilite el acceso en Google Admin Console.
**Proyecto:** arq-medios, D9_Marketin_2.0
**Solución Inyectada a Fábrica:**
1. Para cuentas Workspace: ir a **Google Admin Console → Apps → Google Workspace → Gemini → configurar acceso**.
2. Alternativa inmediata sin esperar al admin: usar OpenRouter con modelo `google/gemini-2.0-flash-exp` con una cuenta personal (no Workspace) para el API Key.
3. Fallback recomendado si Gemini no está disponible: cambiar a `cerebras/qwen-3-235b` (gratis, sin restricciones Workspace).

## 🛑 22. CEREBRAS COMO PROVEEDOR IA PRIMARIO GRATUITO
**Contexto:** En proyectos donde se requiere IA de texto sin costo (especialmente agentes), Cerebras ofrece el mejor balance velocidad/calidad/precio del mercado free tier (marzo 2026).
**Proyecto:** irobot (primario), cualquier proyecto con agentes IA
**Tabla comparativa de proveedores gratuitos:**
| Proveedor | Modelo | Tokens/min | Límite diario | Velocidad |
|---|---|---|---|---|
| Cerebras | Qwen 3 235B | 30,000 | Sin límite estricto | ~2,100 tok/s |
| Groq | Llama 3.3 70B | 6,000 | 500k tokens | ~900 tok/s |
| OpenRouter (free) | Varios | Variable | Variable | Variable |
| Gemini Free | Flash 2.0 | 1,000,000/día | 1,500 req/día | Medio |

**Solución Inyectada a Fábrica:**
```typescript
// Proveedor primario: Cerebras (Qwen 3 235B)
const CEREBRAS_MODEL = "qwen-3-235b" // modelo actual en Cerebras
const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: CEREBRAS_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048
  })
})
// Fallback: Groq → OpenRouter
```

## 🛑 23. GROQ — RATE LIMIT CON MENSAJES LARGOS (TOKENS, NO REQUESTS)
**Fallo:** En irobot y arq-medios, el rate limit de Groq se activaba incluso con pocas requests por minuto. El problema no era la cantidad de llamadas sino el **tamaño del contexto**: mensajes con historial largo consumían miles de tokens por request, agotando el límite de tokens/minuto (6,000 TPM en free) con solo 2-3 llamadas.
**Proyecto:** irobot, arq-medios
**Soluciones implementadas:**
```typescript
// 1. Truncar historial al enviar contexto
const MAX_CONTEXT_TOKENS = 1500
function truncateHistory(messages: Message[], maxTokens: number) {
  // Estimar ~4 chars por token
  let totalChars = 0
  const result = []
  for (const msg of [...messages].reverse()) {
    totalChars += msg.content.length
    if (totalChars > maxTokens * 4) break
    result.unshift(msg)
  }
  return result
}

// 2. Detectar 429 y esperar antes de reintentar (solo 1 vez)
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get('retry-after') || '10')
  await new Promise(r => setTimeout(r, retryAfter * 1000))
  // Reintentar con contexto reducido a la mitad
}

// 3. Si Groq falla → cambiar a Cerebras automáticamente
```

## 🛑 24. ARQUITECTURA ORQUESTADOR vs EJECUTOR (PATRÓN IROBOT)
**Contexto:** En sistemas de agentes IA, la arquitectura "todo en un modelo" genera costos altos, rate limits rápidos y respuestas lentas. El patrón correcto separa responsabilidades.
**Proyecto:** irobot
**Arquitectura correcta (implementada en irobot):**
```
Claude Code (Orquestador)
  ├── Decide QUÉ hacer (razonamiento complejo, multi-step)
  ├── Maneja memoria y contexto largo
  ├── Coordina herramientas y subagentes
  └── Delega ejecución a → Cerebras/Qwen 235B (Ejecutor)
                            ├── Genera texto/respuestas
                            ├── Procesa requests individuales
                            └── Velocidad: ~2,100 tok/s
```
**Regla de la Fábrica:**
- **Orquestador** (Claude/GPT-4): para planning, razonamiento, decisiones críticas, manejo de errores
- **Ejecutor** (Cerebras/Groq): para generación de contenido repetitivo, respuestas directas, alto volumen
- Nunca usar el mismo modelo para ambos roles — desperdicia tokens caros en tareas simples

## 🛑 25. PATRÓN `onProgress` — FEEDBACK INMEDIATO EN TAREAS LARGAS
**Fallo:** Operaciones largas (generación de video, procesamiento batch, scraping) dejaban al usuario con pantalla congelada sin indicación de progreso. Los usuarios pensaban que la app había fallado y recargaban la página, cancelando la operación.
**Proyecto:** arq-medios, irobot
**Solución Inyectada a Fábrica:**
```typescript
// Backend: Server-Sent Events para progreso en tiempo real
export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendProgress = async (step: string, percent: number) => {
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ step, percent })}\n\n`
    ))
  }

  processLongTask({
    onProgress: sendProgress,
    onComplete: async (result) => {
      await sendProgress('Completado', 100)
      await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, result })}\n\n`))
      await writer.close()
    }
  })

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}

// Frontend: consumir el stream
const source = new EventSource('/api/process')
source.onmessage = (e) => {
  const { step, percent, done } = JSON.parse(e.data)
  setProgress({ step, percent })
  if (done) source.close()
}
```

## 🛑 26. KEEPALIVE SUPABASE — `/rest/v1/` NO CUENTA COMO ACTIVIDAD DE DB
**Fallo:** El servicio activa-supabase hacía `GET /rest/v1/` para "despertar" los proyectos Supabase. Este endpoint devuelve el schema OpenAPI sin ejecutar ninguna query SQL real. Supabase no lo contaba como actividad de base de datos y seguía enviando avisos de suspensión por inactividad.
**Proyecto:** activa-supabase
**Solución Inyectada a Fábrica:**
Usar `auth.admin.listUsers()` con la clave `service_role` — ejecuta una query real en `auth.users` que Supabase sí registra como actividad:
```typescript
const supabase = createClient(db.url, db.serviceRoleKey);
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
// Retorna total_count — prueba verificable de que la query se ejecutó
```
El campo `total_count` en la respuesta sirve como prueba de que realmente se accedió a la DB.

## 🛑 27. SERVICIOS DE BACKGROUND — NUNCA CORRER EN MAC LOCAL
**Fallo:** activa-supabase corría como proceso Node.js en la Mac del usuario. Al apagarse o reiniciarse la Mac, el proceso moría silenciosamente. Sin restart automático, el cron dejaba de ejecutarse y los proyectos se suspendían. Los logs mostraron 9 días sin actividad (14 al 23 de marzo 2026).
**Proyecto:** activa-supabase, keepalive-service
**Solución Inyectada a Fábrica:**
Todo servicio de background/cron DEBE desplegarse en un servidor remoto con restart automático. Render Free Tier es la opción recomendada:
```yaml
# render.yaml
services:
  - type: web
    name: mi-servicio
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    plan: free
```
- Render reinicia el servicio automáticamente si cae
- Auto-deploy en cada push a `main`
- El script `start` en `package.json` debe apuntar al JS compilado: `node dist/index.js` (no `ts-node`)

## 🛑 28. DICTADO HANDSFREE — PASTE FALLIDO POR BLOQUE TRY MONOLÍTICO
**Fallo:** El flujo completo de paste (pbcopy → activate app → sleep → keystroke) estaba dentro de un solo `try`. Si `osascript activate` fallaba para apps sandboxed, lanzaba excepción y mostraba error visual — aunque el texto SÍ se había transcrito y copiado correctamente. Error engañoso.
**Proyecto:** dictado-handsfree
**Solución Inyectada a Fábrica:**
Separar en capas independientes. El texto siempre va al portapapeles PRIMERO. Cada capa tiene su propio try/except y fallo silencioso. Solo si todo falla → notificación amigable "Texto copiado — pega con Cmd+V", nunca error alarmista.
- Capa 1: `pbcopy` — siempre, nunca falla
- Capa 2: `osascript activate` — fallo silencioso, sleep 0.6s (no 0.4)
- Capa 3: `osascript keystroke` — intento principal
- Capa 4: `pynput Cmd+V` — fallback si osascript falló

## 🛑 29. CEREBRAS — USAR `llama3.1-8b` PARA CHATBOTS EN VERCEL (NO `qwen-3-235b`)
**Fallo:** En despacho9, el chatbot usaba `qwen-3-235b` de Cerebras. El modelo es excelente pero tiene ~10s de latencia para respuestas cortas. Vercel tiene un timeout de 10s por defecto para serverless functions, causando timeout en ~60% de las requests después del 2do mensaje (cuando el historial crece).
**Proyecto:** despacho9
**Solución Inyectada a Fábrica:**
Para chatbots en Vercel → `llama3.1-8b` (respuesta en <1s). Para agentes con razonamiento complejo no limitados por timeout → `qwen-3-235b`.
```javascript
// ✅ BIEN para chatbots serverless (respuesta <1s)
const CEREBRAS_MODEL = 'llama3.1-8b';
export const maxDuration = 30; // Siempre declarar en serverless handlers

// ❌ MAL para chatbots en Vercel (10s timeout, modelo muy grande)
// const CEREBRAS_MODEL = 'qwen-3-235b';
```
Regla: `maxDuration = 30` siempre al top del archivo de API route en Vercel.

## 🛑 30. LEAD EXTRACTION — SIEMPRE INFERIR `proyecto` DEL CONTEXTO
**Fallo:** El prompt de extracción de leads de despacho9 solo capturaba información explícita. Si el cliente decía "quiero una app para mi negocio" sin especificar tipo, `proyecto` quedaba vacío. Esto hacía inútil la notificación de Telegram para calificar el lead.
**Proyecto:** despacho9
**Solución Inyectada a Fábrica:**
El prompt de extracción DEBE instruir al modelo a SIEMPRE derivar `proyecto` del contexto, aunque el cliente no lo haya dicho explícitamente:
```
"proyecto": SIEMPRE llena este campo. Resume en 1 línea qué quiere el cliente
aunque no lo haya dicho explícitamente. Ej: "App móvil para distribución de agua",
"Sitio web para escuela en línea con pagos". Si no hay contexto suficiente: "Consulta general".
```

## 🛑 31. DEDUPLICACIÓN DE LEADS — TELEGRAM FLOOD POR MÚLTIPLES MENSAJES
**Fallo:** En despacho9, cada mensaje del usuario disparaba una extracción de lead + notificación Telegram. Una conversación de 7 mensajes generaba 7 notificaciones idénticas en Telegram para el mismo lead. El cliente recibía spam en su propio sistema.
**Proyecto:** despacho9
**Solución Inyectada a Fábrica:**
Antes de `saveLead()` y `notifyTelegram()`, verificar si el lead ya existe en Supabase por `telefono` o `email`:
```javascript
async function leadYaExiste(lead, serviceRoleKey) {
  const filters = [];
  if (lead.telefono) filters.push(`telefono=eq.${encodeURIComponent(lead.telefono)}`);
  else if (lead.email) filters.push(`email=eq.${encodeURIComponent(lead.email)}`);
  else return false; // sin identificador, no deduplicar

  const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?${filters.join('&')}&limit=1`, {
    headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
  });
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

// Solo notificar si es nuevo:
if (!await leadYaExiste(lead, serviceRoleKey)) {
  await saveLead(lead, serviceRoleKey);
  await notifyTelegram(lead, telegramToken, telegramChatId);
}
```

## 🛑 32. LAYOUT SHIFT MOBILE — TEXTO ANIMADO DE LONGITUD VARIABLE
**Fallo:** En despacho9 HeroSection, `RotatingWord` ciclaba entre palabras de distinto largo ('software' 8 chars vs 'automatización' 14 chars). Sin altura mínima, el h1 cambiaba de altura durante la animación, empujando todo el contenido debajo en mobile.
**Proyecto:** despacho9
**Solución Inyectada a Fábrica:**
Calcular la altura máxima que puede ocupar el texto animado en cada breakpoint y declarar `min-h` fijo en el contenedor del texto:
```jsx
// ✅ min-h calibrado por breakpoint para el peor caso (palabra más larga + salto de línea)
<h1 className="min-h-[7.5rem] sm:min-h-[6.5rem] md:min-h-[8rem] lg:min-h-0 ...">
  Tu negocio necesita <RotatingWord />
</h1>
// lg:min-h-0 porque en desktop el texto es en línea, no causa salto
```

## 🛑 33. SUPABASE AUTH — SITE URL APUNTA A LOCALHOST EN PRODUCCIÓN
**Fallo:** En rosummary, el magic link enviado por Supabase redirigía a `localhost:3000` en vez de la URL de producción. Supabase ignora el `emailRedirectTo` del código si la URL no está en la whitelist del proyecto. El error visible es `ERR_CONNECTION_REFUSED` al abrir el email.
**Proyecto:** rosummary
**Solución Inyectada a Fábrica:**
Dos pasos obligatorios antes del primer deploy:
1. En Supabase Dashboard → Authentication → URL Configuration:
   - **Site URL**: `https://[tu-proyecto].vercel.app`
   - **Redirect URLs**: `https://[tu-proyecto].vercel.app/**`
2. En Vercel → agregar variable: `NEXT_PUBLIC_SITE_URL=https://[tu-proyecto].vercel.app`
El código en la página de login debe usarla:
```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${siteUrl}/auth/callback` }
})
```

## 🛑 34. VERCEL — VARIABLES DE ENTORNO NO SE CONFIGURAN AUTOMÁTICAMENTE
**Fallo:** En rosummary, el primer deploy funcionó a nivel de build pero el runtime crasheaba con `MIDDLEWARE_INVOCATION_FAILED` porque ninguna variable de entorno estaba seteada en Vercel. El `.env.local` solo existe localmente — Vercel nunca lo lee.
**Proyecto:** rosummary
**Solución Inyectada a Fábrica:**
Inmediatamente después de crear el proyecto en Vercel, agregar TODAS las vars via CLI antes del primer deploy real:
```bash
echo "valor" | vercel env add NOMBRE_VAR production --force
# Repetir para cada variable: SUPABASE_URL, ANON_KEY, SERVICE_ROLE, API_KEYS...
```
O verificar con `vercel env ls` para confirmar que están antes de deployar.

## 🛑 35. RLS PARA BOTS — ENABLE SIN POLICIES (SERVICE_ROLE)
**Fallo:** Habilitar RLS en tablas de bots pero intentar crear políticas complejas para el bot. Si el bot usa `service_role`, se salta el RLS por diseño. Intentar añadir políticas de `role = 'service_role'` es redundante y puede causar confusión. 
**Proyecto:** irobot
**Solución Inyectada a Fábrica:**
Simplemente ejecutar `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;` sin crear ninguna política adicionales. Esto bloquea automáticamente todo acceso público y de usuarios autenticados, mientras deja que el bot (vía `service_role`) siga operando con total libertad y seguridad.

## 🛑 36. BASE64 EN TABLAS — EL ASESINO DEL PLAN GRATUITO
**Fallo:** Guardar imágenes o archivos pesados como strings **Base64** dentro de columnas `text` o `jsonb`. Esto consume la cuota de base de datos (500MB en Free Tier) y ancho de banda (Egress) de forma masiva con muy pocos registros. 38 filas de contenido llegaron a pesar **139 MB**.
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Prohibición absoluta de Base64 en base de datos para producción. Todo archivo debe subirse al bucket de **Supabase Storage** y guardar únicamente la URL resultante en la tabla SQL.

## 🛑 37. DASHBOARD DE SUPABASE — EL LATIDO ES LENTO (METRICS CACHING)
**Fallo:** Tras limpiar 200MB de base de datos con `TRUNCATE`, el dashboard de Supabase seguía mostrando aviso rojo de "Exceeding Limits". Esto causa pánico innecesario en el desarrollador.
**Proyecto:** arq-medios
**Lección:** Las métricas de uso del dashboard de Supabase se calculan asíncronamente y pueden tardar **12-24 horas** en actualizarse tras una limpieza masiva. La fuente de verdad SIEMPRE es el SQL Editor con `pg_total_relation_size`.

## 🛑 38. SECURITY DEFINER — SEARCH_PATH HIJACKING
**Fallo:** Crear funciones en Supabase con `SECURITY DEFINER` (que corren con privilegios de creador) pero sin especificar un `search_path`. Esto permite que un atacante cree objetos maliciosos en otros esquemas y "engañe" a la función para ejecutarlos. Warning: "Function Search Path Mutable".
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Toda función `SECURITY DEFINER` debe incluir `SET search_path = ''` y usar nombres de esquema completos (`public.mi_tabla`):
```sql
CREATE OR REPLACE FUNCTION mi_func() RETURNS trigger 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' 
AS $$ ... $$;
```

## 🛑 39. LEAKED PASSWORD PROTECTION — LIMITACIÓN DE PLAN FREE
**Fallo:** Intentar "arreglar" via código o SQL la advertencia de "Leaked Password Protection Disabled".
**Lección:** Esa función es una característica exclusiva del **Plan Pro** de Supabase. En el Plan Free aparecerá siempre como advertencia y no puede activarse. No es un error del código, sino una limitación de la plataforma que se debe comunicar al cliente.

## 🛑 40. GOOGLE IMAGEN 3 (FLOW) AUTO-TRADUCE TEXTOS AL INGLÉS
**Fallo:** Al pedirle a Imagen 3 de Google Labs (mediante Nano Banana) que dibuje un letrero en español pasando el prompt `"Fotografía... con el texto exacto 'DESCUBRE MÁS'"`, el modelo interceptaba la orden, traducía el texto internamente a su idioma base, y dibujaba `"DISCOVER MORE"` en la imagen final limitando el contenido hispano.
**Proyecto:** arq-medios (Conexión Nano Banana)
**Solución Inyectada a Fábrica (Anti-Translation Shielding):**
Envolver la orden para el modelo en un regaño estricto puramente en inglés que obligue a la literalidad de los caracteres:
```typescript
const prompt = `[ENGLISH ONLY] Write the image prompt EXACTLY following this photorealistic template: 'Hyper-detailed photorealistic 8k RAW photo: [describe subject], [describe background]. VERY IMPORTANT: There MUST be a large, bold typography organically integrated into the scene that literally reads the exact Spanish words: "[TEXTO EN ESPAÑOL]" (DO NOT translate this text to English, write the exact Spanish characters). Cinematic lighting.'`
```

## 🛑 41. BATCHING CONCURRENTE HACIA EXTENSIONES DE CHROME
**Fallo:** En arq-medios, al generar una Campaña de 7 días, un `for loop` lanzaba de forma automática e inmediata el evento `chrome.runtime.sendMessage({ action: 'RUN_BATCH' })` al finalizar cada día. Esto provocaba que la extensión colapsara con un error "Ya hay un lote en ejecución" o que sus colas internas se sobrescribieran mutuamente al ser asíncronas con la UI de Google Flow.
**Proyecto:** arq-medios 
**Solución Inyectada a Fábrica:**
1. Separar drásticamente la generación de texto de la automatización del navegador.
2. Construir **Sparse Arrays** (Arrays con huecos vacíos/nulos) para mantener de forma estricta los índices de sincronización BD ↔ UI. 
3. Engatillar la extensión exclusivamente detrás de interacción humana (Bottom up) en vez de automatizada desde el loop maestro.
```typescript
// ✅ Construir array disperso para conservar índices
const prompts = slides.map(s => s.image_url ? '' : (s.image_prompt || ''))

if (!prompts.every(p => p === '')) {
  chrome.runtime.sendMessage(EXT_ID, { action: 'RUN_BATCH', prompts })
}
```

## 🛑 42. LINTER REVIERTE CAMBIOS DE TTS ENTRE DEPLOYS
**Fallo:** Después de corregir `replyWithVoice` → `replyWithAudio` y desplegar, el linter del proyecto revertió automáticamente los archivos paso1.ts, paso2.ts, paso3.ts al estado anterior (`replyWithVoice`). La corrección sobrevivió solo en evaluation/index.ts porque no fue tocada por el linter.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
Al cambiar métodos de Telegram Bot API, verificar DESPUÉS del deploy que el linter no revirtió. Patrón de verificación rápida:
```bash
grep -r "replyWithVoice\|replyWithAudio" src/features/activities/
```
Si hay `replyWithVoice` con un archivo MP3, está mal. Usar `replace_all: true` en el Edit para reemplazar todas las instancias de una vez.

## 🛑 43. BLOQUEO DE ACTIVIDAD POR DÍA — NO APLICA A CUENTAS ACTIVAS
**Fallo:** El bot tenía un check `countActividadesHoy >= 1` que mostraba "Ya completaste tu actividad de hoy, vuelve mañana" a TODOS los alumnos, incluyendo los que tenían estado `activo` o `piloto` con acceso completo. Alumnos piloto quedaban bloqueados después de la primera actividad.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
El límite de 1 actividad/día solo aplica a alumnos en prueba gratis:
```typescript
// Solo bloquear si NO tiene acceso completo
const tieneAccesoCompleto = ['activo', 'piloto'].includes(hijo.estado)
if (!tieneAccesoCompleto) {
  const actividadesHoy = await countActividadesHoy(hijo.id)
  if (actividadesHoy >= 1) {
    await ctx.reply('Ya completaste tu actividad de hoy...')
    return
  }
}
```

## 🛑 44. VARIABLES DE ENTORNO VERCEL — CLI `env add` PUEDE COLGAR
**Fallo:** `npx vercel env add VARIABLE production` se queda colgado indefinidamente en proyectos con muchas variables o conexión lenta. No da error, simplemente no responde.
**Proyecto:** ia-teen-academy (ADMIN_TELEGRAM_ID)
**Solución Inyectada a Fábrica:**
Usar la API REST de Vercel directamente para operaciones de env vars:
```bash
# Leer token de auth
TOKEN=$(cat ~/Library/Application\ Support/com.vercel.cli/auth.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

# Obtener ID del proyecto
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/NOMBRE_PROYECTO" \
  -H "Authorization: Bearer $TOKEN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

# Crear variable
curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"key":"MI_VAR","value":"mi_valor","type":"plain","target":["production"]}'
```

## 🛑 45. RENDER FREE TIER — CRON INTERNO MUERE CON EL PROCESO (USA GITHUB ACTIONS)
**Fallo:** activa-supabase usaba `node-cron` interno para ejecutar keepalive cada 48h en Express deployado en Render free tier. Render duerme el servicio después de 15 minutos de inactividad, matando el proceso Node y con él el cron. Las 7 bases de datos de Supabase recibían alertas de suspensión aunque el servicio "estuviera deployado".
**Proyecto:** activa-supabase
**Regla:** Nunca confíes en crons internos de un proceso que puede dormir. El cron vive y muere con el proceso.
**Solución Inyectada a Fábrica:**
GitHub Actions como scheduler externo. Corre en servidores de GitHub (nunca duermen), llama el endpoint HTTP del servicio y despierta Render de paso:
```yaml
# .github/workflows/keepalive.yml
name: Supabase Keepalive
on:
  schedule:
    - cron: '0 8 */3 * *'  # cada 3 días — Supabase pausa a los 7 días sin actividad
  workflow_dispatch:         # ejecución manual desde GitHub UI

jobs:
  keepalive:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Ejecutar keepalive
        run: |
          curl -s -X POST --max-time 120 --retry 2 --retry-delay 30 \
            "https://tu-servicio.onrender.com/keepalive"
```
**Por qué funciona:**
- GitHub Actions es gratis (2,000 min/mes free), controlado en el mismo repo
- `--max-time 120` + `--retry 2` manejan el wake-up de Render (~30s de cold start)
- Aplica para cualquier servicio en Render/Railway/Fly.io free tier con tareas programadas
- El endpoint `/keepalive` hace el trabajo real — Render solo necesita estar despierto para recibirlo

## 🛑 46. TELEGRAM TTS — `replyWithVoice` REQUIERE OGG OPUS, NO MP3
**Fallo:** Al cambiar el proveedor TTS de ElevenLabs (que entrega OGG) a Google Translate TTS (que entrega MP3), el bot seguía usando `ctx.replyWithVoice(new InputFile(buffer, 'audio.ogg'))`. Telegram rechaza silenciosamente el audio y muestra un ícono de campana/error en vez del reproductor.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
Distinguir siempre el método de envío según el formato del audio:
- `replyWithVoice` → solo para OGG OPUS (ElevenLabs, grabaciones nativas)
- `replyWithAudio` → para MP3 (Google Translate TTS, cualquier MP3)
```typescript
// ❌ MAL — MP3 enviado como voice = campana rota
await ctx.replyWithVoice(new InputFile(audioBuffer, 'audio.ogg'))

// ✅ BIEN — MP3 enviado como audio = reproductor nativo de Telegram
await ctx.replyWithAudio(new InputFile(audioBuffer, 'audio.mp3'))
```
Verificar el formato antes de elegir el método. Si el proveedor TTS cambia, actualizar TODOS los archivos (paso1, paso2, paso3, evaluation/index.ts).

## 🛑 47. BOTS TELEGRAM SERVERLESS — ESTADO EN MEMORIA SE PIERDE ENTRE REQUESTS
**Fallo:** En Vercel (serverless), cualquier `Map`, variable global o singleton que almacene estado de conversación se destruye entre invocaciones. Un alumno que manda dos mensajes rápido puede llegar a dos instancias diferentes con estado vacío, causando que el bot procese la misma acción dos veces o pierda el contexto.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
TODO el estado de conversación debe vivir en la DB (Supabase). Nunca en memoria:
- Estado actual → columna `estado_conversacion` en tabla `hijos`
- Historial → tabla `conversaciones`
- Instrucciones ya enviadas → verificar en `conversaciones` si ya hay mensajes `rol='assistant'` para esa actividad (no agregar columna `instruccion_enviada` — el historial ya es la fuente de verdad)

---
> *Última actualización: 6 Abril 2026 — Sesión Factory v4.0: skills library (taste, soft, minimalist, brutalist, output, redesign, dream-consolidation) + auto-activación + prompt engineering | Ro SaaS Factory v5.5*

## 🛑 48. DASHBOARD — `toISOString()` DEVUELVE FECHA DE MAÑANA DESPUÉS DE LAS 6PM (CDMX)
**Fallo:** En test-clinica (MdPulso), el dashboard filtraba las citas del día con `new Date().toISOString().split('T')[0]`. Después de las 6pm en México (UTC-6), `toISOString()` devuelve el día siguiente en UTC, haciendo que el dashboard mostrara las citas de mañana como "agenda de hoy".
**Proyecto:** test-clinica (MdPulso)
**Solución Inyectada a Fábrica:**
Nunca usar `toISOString()` para obtener la fecha local. Usar componentes nativos del objeto Date:
```typescript
// ❌ MAL — devuelve fecha UTC (puede ser mañana después de las 6pm en México)
const today = new Date().toISOString().split('T')[0]

// ✅ BIEN — fecha local del entorno (cliente o servidor)
const getLocalDateStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ✅ MEJOR en servidor Node — timezone explícito CDMX
const getLocalDateStrCDMX = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
```

## 🛑 49. SUPABASE — TIMESTAMPS NAIVE vs `timestamptz` EN QUERIES DE RANGO
**Fallo:** En test-clinica (MdPulso), las citas se guardaban sin timezone (`2026-04-09T11:00`) en una columna `timestamptz`, pero el query de NIA usaba `.gte('fecha', '2026-04-09T00:00:00-06:00')`. PostgREST no hacía match: la comparación fallaba silenciosamente y devolvía cero resultados aunque hubiera citas en la agenda.
**Proyecto:** test-clinica (MdPulso)
**Solución Inyectada a Fábrica:**
Para columnas `timestamptz`, calcular el rango UTC que cubre el día completo en la zona horaria local:
```typescript
function cdmxDayRangeUTC(isoDateStr?: string): { start: string; end: string } {
  const nowCdmx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  const year  = isoDateStr ? parseInt(isoDateStr.split('-')[0]) : nowCdmx.getFullYear()
  const month = isoDateStr ? parseInt(isoDateStr.split('-')[1]) - 1 : nowCdmx.getMonth()
  const day   = isoDateStr ? parseInt(isoDateStr.split('-')[2]) : nowCdmx.getDate()
  const startLocal = new Date(year, month, day, 0, 0, 0, 0)
  const endLocal   = new Date(year, month, day, 23, 59, 59, 999)
  const offsetMs   = new Date(startLocal.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime() - startLocal.getTime()
  return {
    start: new Date(startLocal.getTime() - offsetMs).toISOString(),
    end:   new Date(endLocal.getTime()   - offsetMs).toISOString()
  }
}
// Uso:
const { start, end } = cdmxDayRangeUTC()
await supabase.from('appointments').select('*').gte('fecha', start).lte('fecha', end)
```
**Regla crítica:** NUNCA uses `.like('fecha', '2026-04-09%')` en columnas `timestamptz` — LIKE no funciona sobre timestamps en PostgREST y lanzará error 42883. Solo funciona en columnas `text`/`varchar`.

## 🛑 50. AGENTES IA — MODELOS PEQUEÑOS EMBEBEN TOOL CALLS COMO TEXTO PLANO
**Fallo:** En test-clinica (MdPulso), Cerebras `llama3.1-8b` devolvía los tool calls como JSON dentro del campo `content` en vez de usar el array `tool_calls` de la API OpenAI. El resultado llegaba al médico como texto crudo: `{"type": "function", "name": "get_today_agenda", ...}`.
**Proyecto:** test-clinica (MdPulso), cualquier agente con modelos pequeños
**Solución Inyectada a Fábrica:**
Implementar un fallback parser que detecte y ejecute tool calls embebidos en `content`:
```typescript
function extractToolCallsFromContent(content: string | null) {
  if (!content) return null
  const trimmed = content.trim()
  // Patrón XML: <tool_call>{...}</tool_call>
  const xmlMatch = trimmed.match(/<tool_call>([\s\S]*?)<\/tool_call>/)
  if (xmlMatch) {
    try {
      const p = JSON.parse(xmlMatch[1])
      if (p.name) return [{ name: p.name, arguments: JSON.stringify(p.arguments || {}) }]
    } catch {}
  }
  // Patrón JSON directo
  try {
    const p = JSON.parse(trimmed)
    if (p.name && p.arguments !== undefined) return [{ name: p.name, arguments: JSON.stringify(p.arguments) }]
  } catch {}
  return null
}
// Aplicar después de cada respuesta del modelo:
if (!message.tool_calls && message.content) {
  const extracted = extractToolCallsFromContent(message.content)
  if (extracted) {
    message.tool_calls = extracted.map((tc, i) => ({ id: `fallback_${i}`, type: 'function', function: { name: tc.name, arguments: tc.arguments } }))
    message.content = null
  }
}
```
**Regla:** Para tool calling preciso, usa **Groq llama-3.3-70b-versatile** como primario. Cerebras `llama3.1-8b` como fallback con este parser.

## 🛑 51. AGENTES IA — `tool_choice: "required"` CAUSA ALUCINACIONES DE ACCIONES COMPLETADAS
**Fallo:** En test-clinica (MdPulso), NIA usaba `tool_choice: "required"`. Cuando el médico pedía agendar sin dar fecha/hora, el modelo inventaba argumentos para cumplir el requisito, ejecutaba `create_appointment` con datos falsos, y le decía al médico "¡Cita agendada con éxito!" para una cita inexistente.
**Proyecto:** test-clinica (MdPulso)
**Solución Inyectada a Fábrica:**
Siempre `tool_choice: "auto"`. Agregar un safety gate que bloquee confirmaciones falsas:
```typescript
// ✅ BIEN — el modelo puede pedir datos faltantes antes de llamar la tool
tool_choice: 'auto'

// Safety gate post-respuesta:
const createResult = chatHistory.find(h => h.role === 'tool' && h.name === 'create_appointment')
const claimsCreated = /\b(agend[eé]|quedó agendad[oa]|cita creada|cita agendada)\b/i.test(finalText)

if (claimsCreated && !createResult) {
  // Modelo mintió — nunca llamó la tool
  return fallback('No pude completar la cita. Proporciona: nombre del paciente, fecha, hora y motivo.')
}
if (claimsCreated && createResult?.content.includes('"error"')) {
  // Tool retornó error pero el modelo lo ignoró
  const toolErr = JSON.parse(createResult.content)
  return fallback(toolErr.error || 'Error al agendar. Verifica los datos.')
}
```

## 🛑 52. TAILWIND — `backdrop-blur` + GRADIENTES INTENSOS = TEXTO ILEGIBLE
**Fallo:** En test-clinica (MdPulso), el modal de NIA usaba `bg-slate-900/98 backdrop-blur-2xl`. La página detrás tenía un gradiente verde esmeralda intenso. El blur mezclaba el verde con el slate oscuro, haciendo el fondo del modal blanco-verdoso y el texto blanco completamente invisible.
**Proyecto:** test-clinica (MdPulso)
**Solución Inyectada a Fábrica:**
Para modales que deben ser completamente opacos, usar `background` sólido via `style` inline:
```tsx
// ❌ MAL — color bleeding del fondo a través del blur
<div className="bg-slate-900/98 backdrop-blur-2xl">

// ✅ BIEN — completamente sólido, cero bleeding
<div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
```
**Regla:** `backdrop-blur` solo úsalo cuando quieras efecto frosted glass (fondo visible). Si el modal DEBE ser oscuro e independiente del fondo, usa color sólido via `style`.

---
> *Última actualización: 10 Abril 2026 — Sesión MdPulso (test-clinica): audit NIA + timezone bugs + LLM tool calling + safety gates | Ro SaaS Factory v5.5*

## 🛑 53. RLS BOTS — ENABLE SIN POLICIES CUANDO SE USA SERVICE_ROLE
**Fallo:** Se creaban políticas RLS complejas para bots que usan `service_role`. El service_role se salta el RLS por diseño — las policies eran redundantes y causaban confusión en auditorías.
**Proyecto:** irobot
**Solución Inyectada a Fábrica:**
Si el bot usa `service_role`, basta con habilitar RLS sin policies. Eso bloquea acceso público y de usuarios autenticados mientras el bot opera con libertad total:
```sql
ALTER TABLE mi_tabla_bot ENABLE ROW LEVEL SECURITY;
-- No crear ninguna policy adicional — service_role las bypasea todas
```

## 🛑 54. BASE64 EN TABLAS — ASESINO DEL PLAN GRATUITO SUPABASE
**Fallo:** arq-medios guardaba imágenes como strings Base64 dentro de columnas `text`/`jsonb`. 38 filas de contenido llegaron a pesar 139 MB, agotando la cuota de 500MB del Free Tier.
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Prohibición absoluta de Base64 en DB. Todo archivo va a **Supabase Storage**, solo la URL en SQL:
```typescript
// ❌ MAL — destruye el plan gratuito rápidamente
await supabase.from('content').insert({ image: base64String }) // ~200KB por fila

// ✅ BIEN — solo la URL (pocos bytes)
const { data } = await supabase.storage.from('images').upload(path, file)
await supabase.from('content').insert({ image_url: data.publicUrl })
```

## 🛑 55. SUPABASE DASHBOARD — MÉTRICAS DE USO SON ASÍNCRONAS (12-24h DE LAG)
**Fallo:** Tras limpiar 200MB con `TRUNCATE`, el dashboard de Supabase seguía mostrando aviso rojo de "Exceeding Limits" horas después, causando pánico innecesario.
**Proyecto:** arq-medios
**Lección:** Las métricas del dashboard se calculan asíncronamente. La fuente de verdad inmediata siempre es el SQL Editor:
```sql
SELECT pg_size_pretty(pg_total_relation_size('mi_tabla')) AS size;
-- O para toda la DB:
SELECT pg_size_pretty(sum(pg_total_relation_size(tablename::text))::bigint) FROM pg_tables WHERE schemaname = 'public';
```

## 🛑 56. SECURITY DEFINER — SEARCH_PATH HIJACKING EN SUPABASE
**Fallo:** Funciones `SECURITY DEFINER` sin `search_path` explícito generan warning "Function Search Path Mutable". Un atacante puede crear objetos maliciosos en otros esquemas y engañar a la función para ejecutarlos.
**Proyecto:** arq-medios
**Solución Inyectada a Fábrica:**
Toda función `SECURITY DEFINER` debe incluir `SET search_path = ''` y nombres de esquema completos:
```sql
CREATE OR REPLACE FUNCTION public.mi_func()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Usar siempre public.mi_tabla, no solo mi_tabla
  UPDATE public.mi_tabla SET updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
```

## 🛑 57. LEAKED PASSWORD PROTECTION — ES EXCLUSIVO DEL PLAN PRO (NO FIXEABLE)
**Fallo:** Se intentó "arreglar" via código o SQL la advertencia de "Leaked Password Protection Disabled" en Supabase.
**Lección:** Esa función es exclusiva del Plan Pro. En Free siempre aparecerá como advertencia. No es un bug del código — es una limitación de plataforma. Comunicarlo al cliente como "funcionalidad disponible al escalar".

## 🛑 58. GOOGLE IMAGEN 3 — AUTO-TRADUCE TEXTOS EN ESPAÑOL A INGLÉS
**Fallo:** Al pedir a Imagen 3 (Google Labs/Flow) que dibujara un letrero con texto en español, el modelo traducía internamente el texto. `"DESCUBRE MÁS"` aparecía como `"DISCOVER MORE"` en la imagen final.
**Proyecto:** arq-medios (Nano Banana)
**Solución Inyectada a Fábrica (Anti-Translation Shielding):**
Escribir el prompt en inglés con instrucción explícita de no traducir:
```typescript
const prompt = `[ENGLISH ONLY] Hyper-detailed photorealistic 8k photo: [describe scene].
CRITICAL: There MUST be large bold typography that literally reads the EXACT Spanish words: "${textoEspañol}"
DO NOT translate this text to English. Write the exact Spanish characters as shown.
Cinematic lighting, 8k quality.`
```

## 🛑 59. CHROME EXTENSIONS — BATCHING CONCURRENTE COLAPSA LA EXTENSIÓN
**Fallo:** En arq-medios, un for loop lanzaba `chrome.runtime.sendMessage({ action: 'RUN_BATCH' })` inmediatamente al terminar cada día de campaña. La extensión colapsaba con "Ya hay un lote en ejecución" porque las colas internas se sobrescribían mutuamente.
**Proyecto:** arq-medios (Nano Banana)
**Solución Inyectada a Fábrica:**
1. Separar generación de texto de la automatización del navegador.
2. Construir Sparse Arrays para mantener índices BD ↔ UI sincronizados.
3. Disparar la extensión solo tras interacción humana, nunca desde el loop maestro:
```typescript
// ✅ Array disperso para conservar índices
const prompts = slides.map(s => s.image_url ? '' : (s.image_prompt || ''))
if (!prompts.every(p => p === '')) {
  chrome.runtime.sendMessage(EXT_ID, { action: 'RUN_BATCH', prompts })
}
// El botón en UI dispara esto, nunca el loop automático
```

## 🛑 60. LINTER AUTO-REVIERTE CAMBIOS ENTRE DEPLOYS — VERIFICAR POST-DEPLOY
**Fallo:** En ia-teen-academy, se corrigió `replyWithVoice` → `replyWithAudio` en 3 archivos. El linter del proyecto revirtió automáticamente 2 de los 3 archivos al hacer push. La corrección sobrevivió solo en el archivo que el linter no tocó.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
Después de deploy que involucre cambios en métodos específicos, verificar con grep antes de dar por cerrado:
```bash
grep -r "replyWithVoice\|replyWithAudio" src/features/
# Si hay replyWithVoice con MP3 → está mal, el linter revirtió
```
Usar `replace_all: true` en Edit para reemplazar todas las instancias de una vez y evitar que el linter encuentre "inconsistencias" que lo lleven a revertir.

## 🛑 61. LÍMITE DE ACTIVIDAD DIARIA — NO APLICA A CUENTAS ACTIVAS/PILOTO
**Fallo:** ia-teen-academy bloqueaba con "Ya completaste tu actividad de hoy" a TODOS los alumnos, incluyendo los con estado `activo` o `piloto`. Alumnos piloto quedaban bloqueados después de la primera actividad.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
El límite diario solo aplica a prueba gratuita:
```typescript
const tieneAccesoCompleto = ['activo', 'piloto'].includes(hijo.estado)
if (!tieneAccesoCompleto) {
  const actividadesHoy = await countActividadesHoy(hijo.id)
  if (actividadesHoy >= 1) {
    await ctx.reply('Ya completaste tu actividad de hoy...')
    return
  }
}
// usuarios activos/piloto continúan sin restricción
```

## 🛑 62. VERCEL CLI — `vercel env add` PUEDE COLGAR INDEFINIDAMENTE
**Fallo:** `npx vercel env add VARIABLE production` se queda colgado sin dar error ni respuesta en proyectos con muchas variables o conexión lenta.
**Proyecto:** ia-teen-academy
**Solución Inyectada a Fábrica:**
Usar la API REST de Vercel directamente para env vars críticas:
```bash
TOKEN=$(cat ~/Library/Application\ Support/com.vercel.cli/auth.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/NOMBRE_PROYECTO" -H "Authorization: Bearer $TOKEN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"key":"MI_VAR","value":"mi_valor","type":"plain","target":["production"]}'
```

## 🛑 63. SUPABASE KEEPALIVE — CRON `*/3` CREA GAPS DE 8+ DÍAS CERCA DE FIN DE MES
**Fallo:** GitHub Actions con `cron: '0 8 */3 * *'` ejecuta en días 1, 4, 7, 10... del mes. Cerca de fin de mes crea gaps irregulares de 8+ días, superando el umbral de 7 días de Supabase para pausar proyectos. El keepalive reportaba ✅ en Telegram pero las bases igual se suspendían.
**Proyecto:** activa-supabase
**Solución Inyectada a Fábrica:**
```yaml
# ❌ MAL — crea gaps de 8+ días cerca de fin de mes
- cron: '0 8 */3 * *'

# ✅ BIEN — diario 8AM UTC, nunca supera los 7 días de Supabase
- cron: '0 8 * * *'
```

## 🛑 64. JWT DECODE — VERIFICAR EL TIPO DE KEY ANTES DE CAMBIAR LÓGICA
**Fallo:** En activa-supabase, variables `SUPABASE_ANON_KEY_X` contenían `service_role` keys (naming legacy). Al querer agregar "nuevas" service_role keys, se crearon variables que Render no tenía, dejando `config.databases` vacío. El keepalive no ejecutaba nada sin errores visibles.
**Proyecto:** activa-supabase
**Solución Inyectada a Fábrica:**
Siempre decodificar el JWT para confirmar el tipo antes de cambiar lógica:
```bash
echo "PAYLOAD_BASE64" | base64 -d  # muestra {"role":"service_role",...} o {"role":"anon",...}
```
En código, usar fallback para backward compatibility:
```typescript
// Funciona sin importar cómo se llamó la variable en el pasado
const serviceRoleKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${i}`] 
                    || process.env[`SUPABASE_ANON_KEY_${i}`]
```

## 🛑 65. AGENTES IA — AUTO-HEALING PARA PARÁMETROS UUID EN TOOLS
**Fallo:** En test-clinica (NIA), modelos <70B ignoraban el schema de tool calling y mandaban el nombre del paciente crudo (`"rodolfo perez"`) en lugar del UUID a tools que esperaban un UUID. PostgreSQL lanzaba error `22P02` (invalid UUID) silencioso.
**Proyecto:** test-clinica (MdPulso)
**Solución Inyectada a Fábrica:**
El backend debe "sanar" las omisiones del modelo antes de ejecutar la query. Nunca confiar en que el LLM pasará el tipo correcto:
```typescript
// En executeNiaTool() — Auto-Healing universal para patient_id
const patientParam = args.patient_id || args.uuid || args.id || args.nombre || args.query
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(patientParam))

if (!isUuid) {
  // Backend busca el UUID aunque el modelo no lo haya pedido
  const { data } = await supabase.rpc('search_patients_nia', { search_query: `%${patientParam}%`, doctor_id: userId })
  if (!data?.length) return { error: `Paciente "${patientParam}" no encontrado.` }
  args.patient_id = data[0].id
}
// Ahora sí ejecutar con UUID verificado
```
**Regla de Oro:** En arquitecturas Agentic, el backend debe *sanar* las omisiones del modelo, no solo *sanitizar* la entrada.

---
> *Última actualización: 10 Abril 2026 — Merge template/LESSONS_LEARNED.md (#35-51) + Sesión MdPulso (test-clinica) — timezone, tool calling, safety gates | Ro SaaS Factory v5.5*
