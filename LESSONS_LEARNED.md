# Lecciones Aprendidas — mdpulso

> Archivo generado selectivamente por `scripts/compile-lessons.sh`
> Dominios activos: supabase llm-agents
> Solo incluye lecciones relevantes para este proyecto.
> Índice completo en: template/.claude/prompts/lessons-learned.md

---


# Lecciones Supabase — RoSaas Factory

Cargar este skill cuando trabajes con Supabase (DB, RLS, auth, migraciones, storage, keepalive).

## RLS y Seguridad

**#8 — ENABLE antes de POLICIES**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` ANTES de crear policies. Sin esto, las policies existen pero no se aplican.

**#35 — Bots con service_role**: Si el bot usa `service_role`, solo hacer `ENABLE RLS` sin policies. El service_role bypasea RLS por diseno. No crear policies redundantes.

**#38 — SECURITY DEFINER search_path**: Toda funcion `SECURITY DEFINER` debe incluir `SET search_path = ''` y usar nombres completos (`public.mi_tabla`). Sin esto: warning "Function Search Path Mutable" y riesgo de hijacking.

**#39 — Leaked Password Protection**: Es exclusivo del Plan Pro. En Free siempre aparece como warning. No es un bug, no intentes arreglarlo.

**#66 — SERVICE_ROLE_KEY faltante = cero resultados sin error**: Si el agente IA dice "no hay datos" pero la UI si muestra datos, verificar que `SUPABASE_SERVICE_ROLE_KEY` este en Vercel. Sin ella, cae al anon key + sin sesion = RLS bloquea todo silenciosamente.

## Timestamps y Zonas Horarias

**#4 — UTC vs Local**: Separar `fecha` (DATE) y `rango_hora` (VARCHAR) para calendarios. Si usas `timestamptz`, ordenar solo via SQL.

**#10 — Trigger updated_at**: Toda tabla con `updated_at` necesita trigger. Sin el, `updated_at` queda igual al `created_at` original.
```sql
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON mi_tabla FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**#11 — Doble cita**: Constraint `UNIQUE (doctor_id, fecha, rango_hora)` + validacion previa en frontend.

**#48 — toISOString() despues de 6pm CDMX**: Devuelve fecha de manana en UTC. Usar offset fijo `-06:00` para Mexico (sin DST desde 2023):
```typescript
const getLocalDateCDMX = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
```

**#49 — timestamptz en queries de rango**: Calcular rango UTC que cubre el dia completo en zona local. NUNCA `.like()` en timestamptz (error 42883):
```typescript
function cdmxDayRangeUTC(dateStr?: string) {
  const localStr = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  return {
    start: new Date(`${localStr}T00:00:00-06:00`).toISOString(),
    end: new Date(`${localStr}T23:59:59-06:00`).toISOString()
  }
}
```

**#67 — CDMX offset fijo**: Mexico abolio DST en 2023. Usar `-06:00` directamente: `new Date('${localStr}T00:00:00-06:00')`. Formato `en-CA` da YYYY-MM-DD nativo.

## Storage y Datos

**#36 — Base64 en tablas**: PROHIBIDO. 38 filas = 139 MB. Todo archivo va a Supabase Storage, solo la URL en SQL.

**#37 — Dashboard metricas asincronas**: Despues de TRUNCATE, el dashboard tarda 12-24h en actualizarse. Fuente de verdad: `pg_total_relation_size()` en SQL Editor.

## Keepalive

**#17 — Free Tier se duerme**: Planes Free se suspenden tras 7 dias de inactividad. Usar keepalive con `auth.admin.listUsers()` (query real, no solo `/rest/v1/`).

**#26 — /rest/v1/ no cuenta como actividad**: Endpoint OpenAPI no ejecuta query SQL. Usar `auth.admin.listUsers({ page: 1, perPage: 1 })` con service_role.

**#63 — Cron */3 crea gaps de 8+ dias**: Cerca de fin de mes, `*/3` crea gaps que superan los 7 dias de Supabase. Usar cron diario.

**#64 — JWT decode antes de cambiar keys**: Decodificar JWT para confirmar tipo (anon vs service_role) antes de modificar logica. Usar fallback: `process.env[SERVICE_ROLE_KEY_${i}] || process.env[ANON_KEY_${i}]`.

## Auth

**#33 — Site URL apunta a localhost**: En Supabase Dashboard > Auth > URL Configuration, poner la URL de produccion. En Vercel, agregar `NEXT_PUBLIC_SITE_URL`.

**#91 — Supabase webhook → Telegram (notify-on-register)**: Trigger en auth.users → inserta en `user_profiles` → Supabase Database Webhook (INSERT) → `/api/webhooks/new-user` → Telegram. Config: tabla `user_profiles`, evento INSERT, header `x-webhook-secret`. Retroactivo: `INSERT INTO user_profiles SELECT id, email... FROM auth.users ON CONFLICT DO NOTHING`.

**#90 — Admin page por URL secret (?key=) sin login**: Server Component valida `searchParams.key !== ADMIN_KEY → redirect('/login')`. Middleware: `/admin` debe estar en `isPublic` pero NO en `isAuthPage` para que no redirija a `/` cuando hay sesión activa de otro usuario.

**#89 — Next.js middleware isPublic vs isAuthPage**: Separar dos listas. `isPublic` = no requiere login. `isAuthPage` = redirige al dashboard si ya estás logueado. Sin esta separación, rutas públicas con lógica propia (admin, webhooks) se rompen con sesión activa.

## Migraciones y Schema

**#95 — Schema drift entre migración y código**: Si el código lee columnas que no existen en la DB, falla silenciosamente. Síntomas: (1) API endpoint devuelve 500 sin mensaje claro, (2) UI no puede guardar config, (3) LLM recibe system prompt incompleto. Solución: ALTER TABLE para agregar columnas faltantes. Prevención: validar que toda columna leída en código exista en el schema antes de deploy. Usar TypeScript types generados desde DB (`supabase gen types`) para detectar drift en compile time.
```sql
-- Ejemplo: agregar columnas de config que el código espera
ALTER TABLE config_negocio
ADD COLUMN IF NOT EXISTS nombre_agente TEXT DEFAULT 'Asistente',
ADD COLUMN IF NOT EXISTS personalidad TEXT DEFAULT 'Asistente profesional',
ADD COLUMN IF NOT EXISTS restricciones TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS instrucciones_extra TEXT DEFAULT '';
```

## Ver tambien

- ENV vars en Vercel (#1, #3, #15, #34, #44) -> `skills/lessons-vercel-deploy/SKILL.md`
- Agentes IA que usan Supabase (#65, #66, #68) -> `skills/lessons-llm-agents/SKILL.md`
- Estado de bots en Supabase (#47) -> `skills/lessons-telegram-bots/SKILL.md`

---


# Lecciones LLM y Agentes IA — RoSaas Factory

Cargar este skill cuando trabajes con IA, agentes, LLMs, tool calling, o integraciones de Cerebras/Groq/OpenRouter.

## Proveedores y Modelos

**#74 — Cerebras free tier MUERTO (mayo 2026)**: Todos los modelos utiles retirados o requieren PayGo. Groq es el primario gratuito ahora.
- Primario: Groq `moonshotai/kimi-k2-instruct` (estable, tool calling confiable)
- Alternativa: Groq `llama-3.3-70b-versatile`
- Fallback: OpenRouter `meta-llama/llama-3.1-8b-instruct:free` (solo texto, sin tools)
- Si un proveedor falla consistentemente, eliminarlo del cascade. El delay del fallback degrada mas que no tenerlo.

**#14 — OpenRouter modelo incorrecto = silencio total**: Siempre usar formato completo `proveedor/modelo`. Validar que `data.choices?.[0]?.message?.content` exista.

**#72 — OpenRouter free tier cambia sin aviso**: Modelos free se agregan/eliminan sin previo aviso. Verificar en `openrouter.ai/models?q=:free`.

**#22 — Cerebras vs Groq para chatbots en Vercel**: Modelos grandes (235B) causan timeout en Vercel (10s default). Para chatbots serverless: modelos rapidos (<1s). Siempre declarar `export const maxDuration = 30`.

## Tool Calling y XML

**#70 — Groq tool_use_failed XML**: Groq genera `<function=nombre>{args}</function>` en vez de JSON. Fix: parser XML que recupera las tool calls del `error.failed_generation`.

**#75 — XML leak en content (3 formatos)**: Groq mete XML en `content` en vez de `tool_calls`. Parser multi-formato:
```typescript
function parseXmlToolCalls(text: string) {
  const results = []
  // Formato 1+3: <function=name>{args}</function> o <function=name>{args}<function>
  for (const m of text.matchAll(/<function=(\w+)>(\{[\s\S]*?\})(?:<\/function>|<function>)/g))
    results.push({ name: m[1], args: JSON.parse(m[2]) })
  // Formato 2: <function>name {args}</function>
  for (const m of text.matchAll(/<function>(\w+)\s+(\{[\s\S]*?\})<\/function>/g))
    results.push({ name: m[1], args: JSON.parse(m[2]) })
  return results.length ? results : null
}
// CRITICO: interceptar en respuestas 200, no solo 400. Sanitizar content antes de enviar al usuario.
```

**#50 — Modelos pequenos embeben tool calls como texto plano**: `llama3.1-8b` devuelve JSON/XML en `content`. Implementar fallback parser que detecte `<tool_call>`, JSON directo, etc.

**#51 — tool_choice "required" causa alucinaciones**: Usar `tool_choice: "auto"` + safety gate:
```typescript
const claimsCreated = /\b(agend[eé]|cita creada)\b/i.test(finalText)
const toolResult = history.find(h => h.role === 'tool' && h.name === 'create_appointment')
if (claimsCreated && !toolResult) return fallback('No pude completar. Proporciona los datos.')
```

**#65 — Auto-healing para UUID en tools**: Modelos <70B mandan nombre crudo en vez de UUID. El backend resuelve:
```typescript
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(param))
if (!isUuid) {
  const { data } = await supabase.rpc('search_patients', { search_query: `%${param}%` })
  if (!data?.length) return { error: `"${param}" no encontrado.` }
  args.patient_id = data[0].id
}
```

## Arquitectura de Agentes

**#24 — Orquestador vs Ejecutor**: Separar responsabilidades. Orquestador (Claude/GPT-4) para planning y decisiones criticas. Ejecutor (Groq/Cerebras) para generacion de contenido y respuestas directas.

**#73 — Memoria estrecha rompe continuidad**: Con `getHistory(3)` y `searchMemory(3)`, el agente olvida contexto de horas previas. Subir a `getHistory(8)` + `searchMemory(6)` para bots personales.

**#68 — Pre-fetch de tools deterministas**: Si la query es predecible (agenda de hoy, perfil), pre-ejecutar la tool e inyectar resultado antes de llamar al modelo. El modelo solo formatea.

**#77 — Motor autonomo sin datos = motor vacio**: Un sistema autonomo sin datos iniciales es codigo muerto. El seed data es tan importante como el codigo. Fechas de milestones: relativas (`daysFromNow(n)`), nunca absolutas.

## Web Scraping e Investigacion

**#76 — stripHtml generico devuelve basura**: Usar `smartExtract()` con jerarquia `article > main > p > body` para extraer contenido principal antes de strip.

**#23 — Groq rate limit por tokens, no requests**: El limite es TPM (tokens/min), no RPM. Historial largo consume miles de tokens. Truncar historial a ~1500 tokens estimados.

## Patrones de Integracion

**#12 — SQLite sin indices = bot lento**: Indices obligatorios en tablas de memoria: `CREATE INDEX idx_memory_user_id ON memory(user_id, created_at DESC)`.

**#13 — fal.ai video es asincrono (queue pattern)**: Responde con `request_id` inmediatamente. Video listo minutos despues via webhook callback.

**#19 — Groq rate limit en generacion masiva**: No usar `Promise.all()` con +3 llamadas a Groq. Secuencial con 500ms delay, o `p-limit(2)`.

**#21 — Gemini en Google Workspace**: `rate_limit: 0` desde el primer request. El admin del dominio debe habilitar acceso en Google Admin Console.

**#69 — Tools clinicos completos (patron MdPulso)**: Un agente medico necesita set completo de tools (search, history, agenda, create, confirm, cancel, reschedule, note, payment, update). Cada tool hace UNA cosa con auto-healing de UUID.

**#84 — Groq Llama 3 deprecado/decommissioned (mayo 2026)**: El modelo antiguo `llama3-8b-8192` fue retirado oficialmente de los servidores de Groq y devuelve un error HTTP 400. Solución: migrar inmediatamente a `llama-3.1-8b-instant` en todos los proyectos de producción y desarrollo activos para mantener latencias ultra-bajas (~0.3s) y compatibilidad.

**#87 — Groq llama-3.2 vision DECOMMISSIONED (mayo 2026)**: `llama-3.2-11b-vision-preview` y `llama-3.2-90b-vision-preview` retirados con HTTP 400. Para vision en Groq usar:
- Primario: `meta-llama/llama-4-scout-17b-16e-instruct` (rapido, multimodal)
- Alternativa: `meta-llama/llama-4-maverick-17b-128e-instruct` (mas potente)
- Formato de imagen identico a OpenAI: `{ type: 'image_url', image_url: { url: dataUrl } }`
- Base64 data URLs funciona directamente (no requiere URL publica)

**#88 — Brand Style DNA pattern**: Extraer ADN visual de imagenes de referencia via vision API → guardar como perfil JSON en `brand_styles` → inyectar `prompt_prefix` al inicio de cada `imagePrompt`.
```typescript
// Schema minimo
{ primary_elements: string[], color_palette: { primary, secondary, accent },
  layout_pattern: string, recurring_motifs: string[],
  composition_style: string, prompt_prefix: string /* 50-80 words en ingles */ }
// Inyeccion en campanas/carruseles
${brandPromptPrefix ? `ADN DE MARCA (OBLIGATORIO): "${brandPromptPrefix}"` : ''}
```
Guardar en tabla `brand_styles` con RLS (owner access). El `prompt_prefix` es el campo critico — ser muy especifico con posiciones, colores hex, elementos recurrentes.

**#89 — Truncado de transcripción mata el análisis en reuniones largas**: Truncar transcripciones con límites restrictivos (ej. `substring(0, 4000)`) para "ahorrar contexto" o "seguridad" causa que la IA ignore hasta el 95% de la conversación en reuniones largas (>15 minutos). Con ventanas de contexto modernas (128k tokens en Groq `llama-3.1-8b-instant`), es seguro y sumamente rápido pasar hasta 120,000 caracteres (~30,000 palabras) para obtener resúmenes completos y chats de precisión quirúrgica de sesiones de más de 2 horas.

**#94 — System prompt hardcodeado mata la reusabilidad del bot**: Si el system prompt tiene el nombre del negocio, servicios o descripción hardcodeados, el bot solo funciona para ese cliente específico. Siempre leer de tabla de config (`config_negocio`). El único hardcode permitido: el esquema de la tabla y los defaults de fallback. Todo lo demás debe ser dinámico.
```ts
// MAL — hardcodeado
"En Despacho9 | Digital Lab nos enfocamos en 3 áreas..."
// BIEN — dinámico
"Cuando te pregunten servicios, usa la info de servicios y sobre_nosotros de arriba"
```

**#90 — Error handler consumía request duplicados en Serverless**: No intentes clonar o volver a leer el body de un `NextRequest` en el bloque `catch` para extraer IDs en caso de fallos. El buffer de streaming puede ya no estar disponible y fallar silenciosamente. Lee y almacena variables clave (como `meetingId`) al inicio absoluto de la API, fuera del try-catch, para poder usarlas de forma segura en las llamadas de recuperación en base de datos.

## Ver tambien

- Supabase SERVICE_ROLE_KEY faltante (#66), RLS para bots (#35) -> `skills/lessons-supabase/SKILL.md`
- Deploy de agentes en Vercel (#1, #22, #34) -> `skills/lessons-vercel-deploy/SKILL.md`
- Bots Telegram con tool calling (#71, #73) -> `skills/lessons-telegram-bots/SKILL.md`
- Whitespace formatting y botones retry en frontend (#89, #90) -> `skills/lessons-frontend-ui/SKILL.md`


---

> **Nota**: Este archivo contiene 48 lecciones filtradas para mdpulso.
> Para el índice completo de todas las lecciones de la factoría:
> `template/.claude/prompts/lessons-learned.md` (88 lecciones en 6 dominios)
