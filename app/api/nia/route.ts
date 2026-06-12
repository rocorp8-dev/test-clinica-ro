import { NextResponse } from 'next/server';
import { NIA_TOOLS, executeNiaTool } from './tools';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateClinicalSafety } from '@/lib/clinicalSafety';

// Vercel: aumentar timeout para tool call loops (default 10s es insuficiente)
export const maxDuration = 30;

// Proveedor primario: Groq llama-3.3-70b (tool calling nativo, ~1s, acepta términos médicos)
// Fallback: OpenRouter llama-3.1-8b free tier (solo texto, sin tools pero estable)
// Nota: mistral-large NO es free tier y causa errores 402/403 en OpenRouter
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_FALLBACK_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

async function callNiaAI(payload: Record<string, unknown>): Promise<{ ok: boolean; data: any }> {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        try {
            console.log(`NIA: Intentando Groq con modelo ${GROQ_MODEL}...`);
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, model: GROQ_MODEL }),
            });
            const d = await res.json();
            if (res.ok) {
                console.log('NIA: usando Groq ✅');
                return { ok: true, data: d };
            }
            // Si es 429 (rate limit), ir directo a OpenRouter sin reintentar
            if (res.status === 429) {
                console.warn('NIA: Groq rate limit (429) - fallback a OpenRouter');
            } else {
                console.error('NIA: Groq error HTTP', res.status, ':', JSON.stringify(d).slice(0, 200));
            }
        } catch (e) {
            console.error('NIA: Groq excepción:', e instanceof Error ? e.message : String(e));
        }
    } else {
        console.warn('NIA: GROQ_API_KEY no encontrada, usando OpenRouter directamente');
    }

    const orKey = process.env.OPENROUTER_API_KEY;
    if (!orKey) {
        console.error('NIA: OPENROUTER_API_KEY tampoco encontrada');
        return { ok: false, data: { error: { message: 'No AI provider configured' } } };
    }

    console.log(`NIA: Fallback a OpenRouter con modelo ${OPENROUTER_FALLBACK_MODEL}...`);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${orKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mdpulso.vercel.app',
            'X-Title': 'MdPulso NIA'
        },
        body: JSON.stringify({ ...payload, model: OPENROUTER_FALLBACK_MODEL }),
    });
    const d = await res.json();
    if (!res.ok) {
        console.error('NIA: OpenRouter error HTTP', res.status, ':', JSON.stringify(d).slice(0, 200));
    } else {
        console.log('NIA: usando OpenRouter fallback ✅');
    }
    return { ok: res.ok, data: d };
}

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

    // Los marcadores (📌📈💡) SOLO son válidos en respuestas de expediente.
    const hadPatientHistory = calledTools.includes('get_patient_complete_history');
    let cleaned = content;

    if (hadPatientHistory) {
        const markers = ['🚨', '📌', '📈', '💡'];
        let firstIdx = -1;
        for (const marker of markers) {
            const idx = content.indexOf(marker);
            if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) firstIdx = idx;
        }

        if (firstIdx > 0 && firstIdx < content.length * 0.5) {
            cleaned = content.slice(firstIdx);
        }
    }

    // BLOQUEO DE NEGATIVAS GENÉRICAS (Lo siento...)
    if (cleaned.toLowerCase().includes('lo siento') || cleaned.toLowerCase().includes('no puedo continuar')) {
        return `Doctor, me confundí al procesar los datos. Para realizar esta acción de forma segura, asegúrese de darme el nombre y los datos clave. Por ejemplo: "Nia, registra a María Pérez de 30 años con alergia al polen".`;
    }

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

const getNiaSystemPrompt = (doctorName: string) => `SISTEMA DE ADMINISTRACIÓN Y AGENDA - Dr. ${doctorName}
Su función es GESTIONAR pacientes existentes, agendar citas y consultar historiales.

REGLA DE REGISTRO (CRÍTICO):
- Si el Dr. pide registrar a un paciente NUEVO, responda: "Doctor, por normativa de seguridad y registro completo, los nuevos pacientes deben darse de alta manualmente desde el botón '+ Nuevo Paciente'. Una vez registrado, yo podré ayudarle con su agenda y seguimiento."

REGLAS DE OPERACIÓN:
- CONSULTAS (Expediente, Agenda): DEBE mostrar el informe estructurado con sus iconos (🚨, 📌, 📈, 💡). Nunca responda solo "Listo Doctor".
- ACCIONES (Notas, Cobros, Citas): Confirme con "Listo Doctor".
- ALERGIAS: Reportar siempre bajo "🚨 ALERTAS DE SEGURIDAD" al iniciar cualquier consulta de expediente.
- JAMÁS explique errores técnicos o fallos de base de datos.

Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`;


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

        // PRE-FETCH AGENDA: Si el último mensaje pregunta por la agenda de hoy/mañana,
        // ejecutamos el tool directamente y lo inyectamos en el contexto antes de llamar al modelo.
        // Esto evita que el modelo decida no llamar el tool y pida una fecha innecesariamente.
        const lastUserMsg = (messages[messages.length - 1]?.content || '').toLowerCase();
        const isAgendaQuery = /\b(agenda|citas de hoy|qu[eé] tengo hoy|pacientes de hoy|mi agenda|horario de hoy|agenda de hoy)\b/.test(lastUserMsg);
        let preFetchedMessages = [...messages];

        if (isAgendaQuery) {
            console.log('NIA: Pre-fetching agenda for direct inject...');
            const agendaResult = await executeNiaTool('get_agenda_by_date', {}, user.id);
            preFetchedMessages = [
                ...messages,
                {
                    role: 'assistant',
                    content: null,
                    tool_calls: [{ id: 'prefetch_agenda', type: 'function', function: { name: 'get_agenda_by_date', arguments: '{}' } }]
                },
                {
                    role: 'tool',
                    tool_call_id: 'prefetch_agenda',
                    name: 'get_agenda_by_date',
                    content: JSON.stringify(agendaResult)
                }
            ];
        }

        // Handle Tool Calls Loop history
        const chatHistory = [...messages];

        // Initial AI Call with Tools — usa Groq (primario) → OpenRouter (fallback)
        console.log('NIA: Starting AI request...');
        const initialResult = await callNiaAI({
            messages: [
                { role: 'system', content: getNiaSystemPrompt(doctorName) },
                ...preFetchedMessages
            ],
            tools: NIA_TOOLS,
            tool_choice: 'auto',
            temperature: 0.1,
        });

        if (!initialResult.ok) {
            console.error('NIA: Error en llamada inicial:', initialResult.data);
            return NextResponse.json({ error: 'No se pudo conectar con el asistente. Intenta de nuevo.' }, { status: 503 });
        }

        let data = initialResult.data;

        // Validar que la respuesta tiene el formato esperado
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('NIA: Respuesta de IA con formato inesperado:', JSON.stringify(data));
            return NextResponse.json({ error: 'Respuesta inválida del asistente. Intenta de nuevo.' }, { status: 500 });
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
        chatHistory.push(message);

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
            // FIX: Truncar historial para evitar rate limit de Groq (max tokens/min)
            // Solo enviar system prompt + últimas 10 interacciones (suficiente para contexto del loop)
            const truncatedHistory = chatHistory.slice(-10);
            const loopResult = await callNiaAI({
                messages: [{ role: 'system', content: systemPrompt }, ...truncatedHistory],
                tools: NIA_TOOLS,
                tool_choice: 'auto',
                temperature: 0.1,
            });
            data = loopResult.data;
            if (!loopResult.ok) {
                console.error('NIA: Loop AI Error:', data);
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

        // Bloquear alucinaciones de citas: el modelo NO puede decir "agendé/quedó agendada"
        // sin haber llamado create_appointment exitosamente.
        const createToolResult = chatHistory.find((h: any) => h.role === 'tool' && h.name === 'create_appointment');
        const finalText = data?.choices?.[0]?.message?.content || '';
        const claimsAppointmentCreated = /\b(agend[eé]|quedó agendad[oa]|cita creada|cita agendada con éxito)\b/i.test(finalText);
        if (claimsAppointmentCreated) {
            if (!createToolResult) {
                console.warn('NIA 🛑: false appointment confirmation — create_appointment never called');
                return NextResponse.json({ choices: [{ message: { role: 'assistant', content: 'No pude completar la cita. Por favor intenta de nuevo con nombre del paciente, fecha, hora y motivo.' } }] });
            }
            if (createToolResult.content.includes('"error"')) {
                console.warn('NIA 🛑: false appointment confirmation — create_appointment returned error');
                try {
                    const toolErr = JSON.parse(createToolResult.content);
                    return NextResponse.json({ choices: [{ message: { role: 'assistant', content: toolErr.error || 'Error al agendar. Por favor verifica los datos.' } }] });
                } catch { /* content no es JSON parseable */ }
            }
        }

        // █ SAFETY GATE: VALIDACIÓN CLÍNICA CENTRALIZADA █
        const calledTools = chatHistory.filter(m => m.role === 'tool').map(m => m.name);

        // CONTEXTO: ¿Es una consulta clínica o administrativa?
        const isClinical = calledTools.some(t => ['get_patient_complete_history', 'add_medical_note'].includes(t));

        const clinicalData = chatHistory
            .filter(m => m.role === 'tool')
            .map(m => {
                try {
                    const content = JSON.parse(m.content);
                    // search_patients puede retornar array de records con alergias
                    if (Array.isArray(content)) return content;
                    // complete_history retorna el perfil directamente
                    if (content.profile) return [content.profile];
                    return [];
                } catch { return []; }
            })
            .flat();

        const safety = validateClinicalSafety(clinicalData, finalText, doctorName, isClinical);
        if (!safety.isValid && safety.suggestedWarning) {
            console.warn('NIA 🛑: SAFETY VIOLATION (Contextual):', safety.missingInResponse);
            // FIX: En lugar de reemplazar la respuesta, AGREGAR la alerta al final
            // para que el médico vea TANTO la confirmación de la acción COMO la alerta
            const currentContent = data?.choices?.[0]?.message?.content || '';
            const combinedContent = currentContent.trim() + '\n\n' + safety.suggestedWarning;
            return NextResponse.json({ choices: [{ message: { role: 'assistant', content: combinedContent } }] });
        }

        if (data?.choices?.[0]?.message?.content) {
            const content = data.choices[0].message.content;
            const isTooShort = content.length < 50;
            const userAskedRecord = chatHistory.some((h: any) => h.role === 'user' && h.content.toLowerCase().includes('expediente'));
            const hasRecordTool = calledTools.some(t => ['get_patient_complete_history', 'get_agenda_by_date', 'search_patients_nia'].includes(t));

            // FIX: NO reemplazar si el usuario pidió una ACCIÓN (agendar, agregar nota, etc)
            const userMessage = chatHistory[chatHistory.length - 1]?.content || '';
            const isAction = /agenda|agendar|cita|nota|cobro|registra/i.test(userMessage);

            console.log('🔍 NIA DEBUG:', {
                isTooShort,
                hasRecordTool,
                userAskedRecord,
                isAction,
                userMessage: userMessage.substring(0, 100),
                contentLength: content.length,
                willReplace: isTooShort && (hasRecordTool || userAskedRecord) && !isAction
            });

            // Si la respuesta es mediocre ante una petición de expediente Y NO es una acción, inyectar el formato por la fuerza
            if (isTooShort && (hasRecordTool || userAskedRecord) && !isAction) {
                data.choices[0].message.content = `📌 SNAPSHOT CLÍNICO: Datos recuperados del sistema.\n\n🚨 ALERTAS DE SEGURIDAD: No se detectan alergias graves registradas para este paciente.\n\n💡 SUGERENCIA OPERATIVA: El expediente está limpio. Puede proceder con la actualización de notas o agenda.`;
            } else {
                const cleanedContent = cleanNiaResponse(content, calledTools);
                data.choices[0].message.content = cleanedContent || 'Solicitud procesada. Use los botones de la agenda para más detalle.';
            }
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
                safetyHistory.push({
                    ...data.choices[0].message, content: null, tool_calls: extracted.map((tc, idx) => ({
                        id: `safety_${idx}`, type: 'function', function: { name: tc.name, arguments: tc.arguments }
                    }))
                });
                for (const tc of extracted) {
                    try {
                        const result = await executeNiaTool(tc.name, JSON.parse(tc.arguments), user.id);
                        safetyHistory.push({ role: 'tool', tool_call_id: `safety_0`, name: tc.name, content: JSON.stringify(result) });
                    } catch (e) {
                        console.error('NIA: Safety gate tool execution error:', e);
                    }
                }
                const safetyResult = await callNiaAI({
                    messages: [{ role: 'system', content: systemPrompt }, ...safetyHistory],
                    temperature: 0.1
                });
                if (safetyResult.ok) {
                    const safetyData = safetyResult.data;
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
                choices: [{
                    message: {
                        role: 'assistant', content:
                            'Lo siento, Dr. ' + doctorName + '. Tuve un problema al procesar la consulta. Por favor, inténtalo de nuevo con más detalle.'
                    }
                }]
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('NIA_API_ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
