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

// FASE 2: Recibir cuando esté listo (webhook callback)
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

  // Ejecutar tarea con callbacks de progreso
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

---
> *Última actualización: Sesión marzo 2026 — Proyectos: irobot, D9_Marketin_2.0, arq-medios, test-clinica, academia-ia-jovenes, dictado-handsfree, supabase-keepalive, activa-supabase, despacho9 | Ro SaaS Factory v4.0*

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

---

## 🛑 40. CEREBRAS — `llama3.1-8b` NO SOPORTA TOOL CALLS (RETORNA JSON RAW COMO TEXTO)
**Fallo:** En test-clinica, NIA usaba `llama3.1-8b` para el agente con tools. El modelo retornaba los tool calls como texto plano en `message.content` en lugar de como objetos en `message.tool_calls`. El usuario veía el JSON raw de la tool call en el chat en vez de la respuesta final ejecutada.
**Proyecto:** test-clinica (NIA assistant)
**Causa raíz:** `llama3.1-8b` es demasiado pequeño (8B params) para procesar correctamente la API de function calling de OpenAI. Modelos pequeños ignoran el formato estructurado y escriben el tool call como si fuera texto libre.
**Solución Inyectada a Fábrica:**
Usar `gpt-oss-120b` (120B params) para cualquier agente con tools en Cerebras:
```typescript
// ✅ BIEN — modelo con soporte nativo de tool calling
const NIA_TOOL_MODEL = 'gpt-oss-120b';

// ❌ MAL — llama3.1-8b retorna tool calls como texto plano
// const NIA_TOOL_MODEL = 'llama3.1-8b';
```
**Regla de la Fábrica:**
| Uso | Modelo Cerebras | Razón |
|-----|----------------|-------|
| Chatbot simple (sin tools) | `llama3.1-8b` | Velocidad <1s, gratis |
| Agente con tool calls | `gpt-oss-120b` | Soporta function calling |
| Razonamiento complejo sin Vercel | `qwen-3-235b` | Máxima calidad |

**Fallback defensivo** (agregar siempre como seguro en agentes con tools):
```typescript
// Parser que detecta si el modelo retornó el tool call como texto plano
if (!message.tool_calls && message.content) {
    const xmlMatch = message.content.match(/<tool_call>(.*?)<\/tool_call>/s);
    if (xmlMatch) {
        const parsed = JSON.parse(xmlMatch[1].trim());
        message.tool_calls = [{ id: 'fallback_0', type: 'function',
            function: { name: parsed.name, arguments: JSON.stringify(parsed.arguments) }
        }];
        message.content = null;
    }
}
```

---
> *Última actualización: Abril 2026 — Fix NIA Agent tool calls | test-clinica | Ro SaaS Factory v5.5*
