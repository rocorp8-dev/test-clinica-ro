import { NextResponse } from 'next/server';
import { NIA_TOOLS, executeNiaTool } from './tools';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Vercel: aumentar timeout para tool call loops (default 10s es insuficiente)
export const maxDuration = 30;

// Modelos disponibles en Cerebras (verificado 2026-04):
// - llama3.1-8b: rápido (~1-2s), tool calls con "required" ✅ ← ACTIVO
// - qwen-3-235b-a22b-instruct-2507: tool calls perfectos pero lento (8-12s → timeout en Vercel)
// - gpt-oss-120b: NO disponible en este plan/key
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

REGLA DE CORTESÍA: Si el médico solo te saluda o hace una pregunta no clínica, responde brevemente y con cortesía usando su nombre (Dr. ${doctorName}), pero para CUALQUIER reporte clínico CUMPLE EL FORMATO ESTRICTO.

FLUJO OBLIGATORIO:
1. Si el médico pide algo sobre un paciente:
   - USA 'search_patients' con SOLO EL NOMBRE O DNI del paciente. NUNCA incluyas palabras como "expediente", "historial", "cita" en el query — solo el nombre propio (ej: query="Laura Jimenez", NO query="Laura Jimenez expediente").
   - USA 'get_patient_complete_history' con el UUID retornado.
   - Genera el REPORTE FINAL en el formato estricto.
2. Si el médico pide agendar:
   - USA 'create_appointment'.
   - ⏳ PROTOCOLO DE TIEMPO: Verifica que la hora y día solicitados NO estén en el pasado respecto a tu FECHA ACTUAL. Si la hora / día ya pasó, rechaza la solicitud pidiendo una hora nueva.
   - Asegúrate de que la 'fecha' esté en formato ISO 8601 completo con timezone (ej: 2026-02-22T13:00:00).
   - Responde confirmando que la cita fue agendada con éxito.

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
                tool_choice: "required", // FORZAR uso de tools — evita que el modelo responda en texto
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
                    tool_choice: "none", // FORZAR respuesta de texto — el modelo ya ejecutó las tools
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
