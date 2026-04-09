import { NextResponse } from 'next/server';
import { NIA_TOOLS, executeNiaTool } from './tools';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Vercel: aumentar timeout para tool call loops (default 10s es insuficiente)
export const maxDuration = 30;

// Modelos disponibles en Cerebras (verificado 2026-04):
// - llama3.1-8b: rápido (~1-2s), tool calls débiles, pero ya tenemos el fallback perfecto. (ACTIVO)
// - qwen-3-235b: tool calls perfectos pero lento (8-12s → propicio a timeout en serverless)
// - gpt-oss-120b: NO disponible en el plan/key actual (arroja error 500).
const NIA_TOOL_MODEL = 'llama3.1-8b';

/**
 * Fallback parser: detecta si el modelo retornó el tool call como texto
 * plano dentro de content en lugar de como objeto en tool_calls.
 * Esto ocurre con modelos pequeños que no soportan la API de tools.
 */
function extractToolCallsFromContent(content: string | null): { name: string; arguments: string }[] | null {
    if (!content) return null;
    const trimmed = content.trim();

    // Patrón 1: XML wrapper — <tool_call>{...}</tool_call>
    const xmlMatch = trimmed.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
    if (xmlMatch) {
        try {
            const parsed = JSON.parse(xmlMatch[1].trim());
            if (parsed.name) {
                return [{ name: parsed.name, arguments: JSON.stringify(parsed.arguments || parsed.parameters || {}) }];
            }
        } catch { /* no es JSON válido */ }
    }

    // Patrón 2: JSON raw — {"type": "function", "name": "...", "arguments": {...}}
    // ESTE es el patrón exacto que produce llama3.1-8b (visto en producción)
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'function' && parsed.name && parsed.arguments !== undefined) {
            return [{ name: parsed.name, arguments: JSON.stringify(parsed.arguments) }];
        }
        // Variante sin "type": {"name": "...", "arguments": {...}}
        if (parsed.name && parsed.arguments !== undefined) {
            return [{ name: parsed.name, arguments: JSON.stringify(parsed.arguments) }];
        }
    } catch { /* no es JSON válido */ }

    // Patrón 3: JSON con regex — captura "name" y "arguments" aunque haya ruido alrededor
    const jsonMatch = trimmed.match(/\{[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"arguments"\s*:\s*(\{[\s\S]*?\})[\s\S]*?\}/);
    if (jsonMatch) {
        try {
            JSON.parse(jsonMatch[2]); // validar que arguments es JSON válido
            return [{ name: jsonMatch[1], arguments: jsonMatch[2] }];
        } catch { /* no es JSON válido */ }
    }

    return null;
}

/**
 * Limpia el contenido final de NIA:
 * Elimina cualquier texto antes del primer marcador de sección (🚨, 📌, 📈, 💡).
 * También elimina líneas que sean solo JSON de tool call o dicts de Python.
 */
function cleanNiaResponse(content: string | null, calledTools: string[] = []): string | null {
    if (!content) return content;

    const trimmed = content.trim();

    // Si el contenido completo es JSON puro (array o tool call), es un leak — no enviarlo
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            JSON.parse(trimmed);
            // Es JSON válido → nunca debe llegar al médico
            return null;
        } catch { /* no es JSON puro, continuar */ }
    }

    // Detectar alucinaciones donde el modelo confirma haber agendado una cita SIN haber llamado a la herramienta
    const fakeConfirmationPatterns = [
        /agendad[oa]\s+con\s+éxito/i,
        /cread[oa]\s+(con\s+éxito|exitosamente)/i,
        /he\s+agendado/i,
        /he\s+creado\s+(la|tu|su)?\s*cita/i,
        /he\s+programado/i,
        /la\s+cita\s+ha\s+sido/i,
        /ya\s+está\s+agendada/i,
        /ya\s+quedó\s+agendada/i,
        /cita\s+confirmada\s+para/i,
        /listo.*agendad[oa]/i
    ];

    const isFakeConfirmation = fakeConfirmationPatterns.some(regex => regex.test(trimmed)) 
                              && !calledTools.includes('create_appointment');
    
    if (isFakeConfirmation) return null;

    // Encontrar el primer marcador del reporte estructurado
    const markers = ['🚨', '📌', '📈', '💡'];
    let firstIdx = content.length;
    for (const marker of markers) {
        const idx = content.indexOf(marker);
        if (idx !== -1 && idx < firstIdx) firstIdx = idx;
    }

    // Si hay contenido antes del primer marcador, descartarlo
    const cleaned = firstIdx < content.length ? content.slice(firstIdx) : content;

    // Eliminar líneas que sean JSON crudo de tool call o Python dicts
    return cleaned
        .split('\n')
        .filter(line => {
            const t = line.trim();
            if (!t) return true;
            // Línea que es JSON de tool call o array JSON
            if ((t.startsWith('{') || t.startsWith('[')) &&
                (t.includes('"name"') || t.includes('"arguments"') || t.includes('"id"'))) return false;
            // Línea que es Python dict (single-quote keys: 'id', 'uuid', 'nombre', etc.)
            if (t.startsWith('{') && /'\w+':\s/.test(t)) return false;
            return true;
        })
        .join('\n');
}

/** Detecta si un string es JSON de tool call que jamás debe verse por el doctor */
function isRawToolCallJson(content: string | null): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
        const parsed = JSON.parse(trimmed);
        return !!((parsed.type === 'function' || parsed.name) && parsed.arguments !== undefined);
    } catch {
        return false;
    }
}

const getNiaSystemPrompt = (doctorName: string) => `ROL: Eres "Nia" (Neural Interface Assistant).
CONTEXTO: Copiloto clínico de élite en MdPulso con acceso total a DB.
MÉDICO ACTUAL: Dr. ${doctorName} (Dirígete a él por su nombre si te saluda o pregunta algo general).
FECHA ACTUAL: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })} (Usa esto para calcular 'hoy', 'mañana', etc.)

REGLA DE ORO: NO des respuestas intermedias como "Un momento", "Voy a buscar" o "He encontrado...".
TU RESPUESTA DEBE SER ÚNICAMENTE EL RESULTADO FINAL O EL REPORTE ESTRICTO.
PROHIBIDO ABSOLUTO: NUNCA incluyas en tu respuesta texto JSON, llamadas a herramientas, ni datos crudos como {"name":...} o {'uuid':...}. Tu respuesta al médico empieza SIEMPRE directamente con 🚨 si es un reporte clínico.

REGLA DE CORTESÍA: Si el médico solo te saluda o hace una pregunta no clínica, responde brevemente y con cortesía usando su nombre (Dr. ${doctorName}), pero para CUALQUIER reporte clínico CUMPLE EL FORMATO ESTRICTO.

FLUJO OBLIGATORIO:
1. Si el médico pide expediente/historial/actividad de un paciente:
   - USA 'search_patients' con SOLO EL NOMBRE O DNI del paciente. NUNCA incluyas palabras como "expediente", "historial", "cita" en el query — solo el nombre propio (ej: query="Laura Jimenez", NO query="Laura Jimenez expediente").
   - USA 'get_patient_complete_history' con patient_id=<el campo 'id' exacto del resultado de search_patients>. SIEMPRE usa el parámetro 'patient_id', NUNCA 'uuid' ni 'id'.
   - Genera el REPORTE FINAL en el formato estricto.
2. Si el médico pide AGENDAR una cita:
   - PRIMERO verifica que el médico dio: nombre del paciente, fecha, hora y motivo.
   - Si FALTA alguno de esos datos, NO llames ninguna tool — pregunta directamente: "¿Para qué fecha y hora? ¿Cuál es el motivo?"
   - Si tienes todos los datos: USA 'search_patients' para obtener el UUID, luego USA 'create_appointment'.
   - ⏳ PROTOCOLO DE TIEMPO Y COLISIONES: Las citas duran 45 minutos. El doctor exige un mínimo de 1 hora de anticipación respecto a tu FECHA ACTUAL ("hoy" a este minuto). No puedes agendar en el pasado ni inmediatamente.
   - Si recibes el error ERROR_CONFLICTO_HORARIO de la herramienta (choque con reserva previa), PROPÓN directamente un horario alternativo con al menos 45 minutos libres.
   - Asegúrate de que la 'fecha' esté en formato ISO 8601 completo incluyendo la zona horaria CDMX explícita (ej: 2026-02-22T13:00:00-06:00).
   - Responde confirmando que la cita fue agendada con éxito CUMPLIENDO el formato estricto de reportes. NUNCA inventes ni confirmes una cita que no hayas creado realmente con la tool.

MANTÉN EL TONO PROFESIONAL Y ELITISTA.
FORMATO ESTRICTO DE RESPUESTA FINAL (PARA REPORTES):
1. 🚨 ALERTAS DE SEGURIDAD
2. 📌 SNAPSHOT CLÍNICO
3. 📈 TENDENCIA Y PATRONES
4. 💡 SUGERENCIA OPERATIVA`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Get authenticating user
        const cookieStore = await cookies();
        const supabaseClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key',
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
                },
            }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Fetch Doctor Name for personalization
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const rawName = profile?.full_name || user.email?.split('@')[0] || 'Doctor';
        const doctorName = rawName.replace(/^(Dr\.|Dra\.|Dr |Dra )\s*/i, '').trim();
        const systemPrompt = getNiaSystemPrompt(doctorName);

        // Initial AI Call with Tools
        console.log(`NIA: Initializing AI request with model=${NIA_TOOL_MODEL}...`);
        let response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: NIA_TOOL_MODEL,
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                tools: NIA_TOOLS,
                tool_choice: "auto", // auto: permite al modelo pedir info faltante sin forzar tool call
                temperature: 0.1,
            })
        });

        let data = await response.json();
        if (!response.ok) {
            console.error('NIA: Cerebras Error:', data);
            return NextResponse.json({ error: data.error || 'AI Error' }, { status: 500 });
        }

        let message = data.choices[0].message;
        console.log('NIA: AI Response Message:', JSON.stringify(message).slice(0, 300));

        // Fallback: si el modelo embebió el tool call como texto plano en content
        // (comportamiento de modelos pequeños que no soportan la API de tools)
        if (!message.tool_calls && message.content) {
            const extracted = extractToolCallsFromContent(message.content);
            if (extracted) {
                console.warn('NIA: ⚠️ Tool call detectado como texto plano — aplicando fallback parser');
                message.tool_calls = extracted.map((tc, idx) => ({
                    id: `fallback_${idx}`,
                    type: 'function',
                    function: { name: tc.name, arguments: tc.arguments }
                }));
                message.content = null; // limpiar para que el loop lo procese
            }
        }

        // Handle Tool Calls Loop
        let iterations = 0;
        const chatHistory = [...messages, message];

        while (message.tool_calls && iterations < 5) {
            console.log(`NIA: Processing ${message.tool_calls.length} tool calls(Iteration ${iterations + 1})`);
            iterations++;

            for (const toolCall of message.tool_calls) {
                const result = await executeNiaTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments),
                    user.id
                );

                chatHistory.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: JSON.stringify(result)
                });
            }

            console.log('NIA: Sending tool results back to AI...');
            // Call AI again with tool results
            response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: NIA_TOOL_MODEL,
                    messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
                    tools: NIA_TOOLS,
                    tool_choice: "auto", // Permitir que el modelo decida si ocupar otra tool (ej. create_appointment tras search_patients)
                    temperature: 0.1,
                })
            });

            data = await response.json();
            if (!response.ok) {
                console.error('NIA: Cerebras Loop Error:', data);
                break;
            }

            message = data.choices[0].message;
            console.log('NIA: AI Next Step Message:', JSON.stringify(message).slice(0, 300));

            // Fallback también en el loop
            if (!message.tool_calls && message.content) {
                const extracted = extractToolCallsFromContent(message.content);
                if (extracted) {
                    console.warn('NIA: ⚠️ Tool call fallback en iteración', iterations);
                    message.tool_calls = extracted.map((tc, idx) => ({
                        id: `fallback_loop_${iterations}_${idx}`,
                        type: 'function',
                        function: { name: tc.name, arguments: tc.arguments }
                    }));
                    message.content = null;
                }
            }

            chatHistory.push(message);
        }

        console.log('NIA: Final Response Ready.');

        // Limpiar contenido final — eliminar leakage de tool calls, datos crudos o falsas confirmaciones
        const calledTools = chatHistory.filter(m => m.role === 'tool').map(m => m.name);

        if (data?.choices?.[0]?.message?.content) {
            const cleanedContent = cleanNiaResponse(data.choices[0].message.content, calledTools);
            if (!cleanedContent) {
                // El cleaner detectó respuesta inválida — dar fallback humano
                return NextResponse.json({
                    choices: [{ message: { role: 'assistant', content:
                        'Necesito más información. ¿Cuál es el nombre del paciente, para cuándo sería la cita y cuál es el motivo?'
                    }}]
                });
            }
            data.choices[0].message.content = cleanedContent;
        }

        // █ SAFETY GATE FINAL █
        // NUNCA retornar JSON raw de tool call al doctor.
        // Si el contenido final es JSON de tool call, intenta ejecutarlo una vez más.
        const finalContent = data?.choices?.[0]?.message?.content;
        if (isRawToolCallJson(finalContent)) {
            console.error('NIA: 🚨 SAFETY GATE activado — content final contiene JSON de tool call. Ejecutando manualmente...');
            const extracted = extractToolCallsFromContent(finalContent);
            if (extracted) {
                // Ejecutar las tools manualmente y llamar al modelo una vez más
                const safetyHistory = [...chatHistory];
                safetyHistory.push({ ...data.choices[0].message, content: null, tool_calls: extracted.map((tc, idx) => ({
                    id: `safety_${idx}`, type: 'function', function: { name: tc.name, arguments: tc.arguments }
                })) });
                for (const tc of extracted) {
                    try {
                        const result = await executeNiaTool(tc.name, JSON.parse(tc.arguments), user.id);
                        safetyHistory.push({ role: 'tool', tool_call_id: `safety_0`, name: tc.name, content: JSON.stringify(result) });
                    } catch (e) {
                        console.error('NIA: Safety gate tool execution error:', e);
                    }
                }
                const safetyResponse = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: NIA_TOOL_MODEL, messages: [{ role: 'system', content: systemPrompt }, ...safetyHistory], temperature: 0.1 })
                });
                if (safetyResponse.ok) {
                    const safetyData = await safetyResponse.json();
                    const safeContent = safetyData?.choices?.[0]?.message?.content;
                    if (safeContent && !isRawToolCallJson(safeContent)) {
                        const allCalledTools = [...calledTools, ...extracted.map(t => t.name)];
                        safetyData.choices[0].message.content = cleanNiaResponse(safeContent, allCalledTools);
                        return NextResponse.json(safetyData);
                    }
                }
            }
            // Si todo falla, retornar mensaje humano de error (nunca JSON)
            return NextResponse.json({
                choices: [{ message: { role: 'assistant', content:
                    'Lo siento, Dr. ' + doctorName + '. Tuve un problema al procesar la consulta. Por favor, inténtalo de nuevo con más detalle.'
                }}]
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('NIA_API_ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
