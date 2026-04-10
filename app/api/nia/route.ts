import { NextResponse } from 'next/server';
import { NIA_TOOLS, executeNiaTool } from './tools';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateClinicalSafety } from '@/lib/clinicalSafety';

// Vercel: aumentar timeout para tool call loops (default 10s es insuficiente)
export const maxDuration = 30;

// Proveedor primario: Groq llama-3.3-70b (tool calling nativo, ~1s)
// Fallback: Cerebras llama3.1-8b (rápido pero tool calling débil — tenemos fallback parser)
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CEREBRAS_MODEL = 'llama3.1-8b';

async function callNiaAI(payload: Record<string, unknown>): Promise<{ ok: boolean; data: any }> {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, model: GROQ_MODEL }),
            });
            const d = await res.json();
            if (res.ok) { console.log('NIA: usando Groq ✅'); return { ok: true, data: d }; }
            console.warn('NIA: Groq error, fallback Cerebras:', d?.error?.message);
        } catch (e) { console.warn('NIA: Groq excepción, fallback:', e); }
    }
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, model: CEREBRAS_MODEL }),
    });
    const d = await res.json();
    console.log('NIA: usando Cerebras' + (res.ok ? ' ✅' : ' ❌'));
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

    // Los marcadores clínicos (🚨📌📈💡) SOLO son válidos en respuestas de expediente.
    // Si el modelo los usa en agenda/notas, el cleaner los ignorará para no cortar contenido válido.
    const hadPatientHistory = calledTools.includes('get_patient_complete_history');
    let cleaned = content;

    if (hadPatientHistory) {
        const markers = ['🚨', '📌', '📈', '💡'];
        let firstIdx = -1;
        for (const marker of markers) {
            const idx = content.indexOf(marker);
            if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) firstIdx = idx;
        }
        
        // Solo cortar preámbulo si el primer marcador está dentro del primer 50%
        // y NO es el inicio absoluto (si es 0, no hay nada que cortar).
        if (firstIdx > 0 && firstIdx < content.length * 0.5) {
            cleaned = content.slice(firstIdx);
        }
    }

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

const getNiaSystemPrompt = (doctorName: string) => `ROL: Eres "Nia" — Neural Interface Assistant. Eres un sistema de inteligencia clínica de élite, sofisticado y eficiente. Tu tono es profesional, analítico y tecnológico.

MÉDICO ACTUAL: Dr. ${doctorName}
FECHA/HORA CDMX: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

━━━ REGLAS DE CONDUCTA ━━━
• Eres un copiloto, NO un chatbot genérico. Evita muletillas como "Entiendo", "Claro", "Aquí tienes".
• Ve directo al grano. El tiempo del médico es oro.
• Si el médico te pide un expediente, SIEMPRE utiliza la estructura de iconos establecida. Es MANDATORIO.
• NUNCA inventes datos. Si no hay alergias registradas, pon "Ninguna registrada".

━━━ TOOLS DISPONIBLES Y CUÁNDO USARLAS ━━━
1. search_patients(query) — Búsqueda de identidad.
2. get_patient_complete_history(id) — Acceso total al historial médico.
3. get_agenda_by_date() — Visualización de flujo de trabajo.
4. create_appointment(...) — Gestión de slots (45 min).
5. confirm_appointment(id) / cancel_appointment(id) — Control de estado.
6. add_medical_note(...) — Registro normativo SOAP.

━━━ PROTOCOLO DE SEGURIDAD CRÍTICA ━━━
• 🚨 ANTES de declarar que un paciente "No tiene alergias", debes buscar el campo "alergias" en el perfil o historial.
• Si el campo dice "Ninguna" o está vacío, repórtalo como "Sin registros en sistema".
• Si detectas CUALQUIER alergia (polen, penicilina, etc.), DEBES ponerla en la sección 🚨 ALERTAS DE SEGURIDAD. No la omitas nunca por brevedad.
• La seguridad del paciente es tu prioridad #1. Un error aquí es inaceptable.

━━━ FORMATO MANDATORIO PARA EXPEDIENTES ━━━
Cuando uses 'get_patient_complete_history' o identifiques a un paciente, tu respuesta DEBE tener este formato exacto:

🚨 ALERTAS DE SEGURIDAD — [Enlista alergias críticas, riesgos o "Sin registro detectado"]
📌 SNAPSHOT CLÍNICO — [Nombre, edad, diagnósticos activos, medicación, resumen de flujo]
📈 TENDENCIA — [Patrones detectados en el historial]
💡 SUGERENCIA OPERATIVA — [Acción clínica inmediata]

━━━ OTROS FORMATOS ━━━
Para agenda, citas y notas: Texto natural, ejecutivo, sin iconos, enfocado en confirmar la acción realizada.`;

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

        // Initial AI Call with Tools
        console.log('NIA: Starting AI request...');
        let { ok: firstOk, data } = await callNiaAI({
            messages: [{ role: 'system', content: systemPrompt }, ...preFetchedMessages],
            tools: NIA_TOOLS,
            tool_choice: 'auto',
            temperature: 0.1,
        });

        if (!firstOk) {
            console.error('NIA: AI Error:', data);
            return NextResponse.json({ error: data?.error || 'AI Error' }, { status: 500 });
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
            const loopResult = await callNiaAI({
                messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
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
                return NextResponse.json({ choices: [{ message: { role: 'assistant', content: 'No pude completar la cita. Por favor intenta de nuevo con nombre del paciente, fecha, hora y motivo.' }}]});
            }
            if (createToolResult.content.includes('"error"')) {
                console.warn('NIA 🛑: false appointment confirmation — create_appointment returned error');
                try {
                    const toolErr = JSON.parse(createToolResult.content);
                    return NextResponse.json({ choices: [{ message: { role: 'assistant', content: toolErr.error || 'Error al agendar. Por favor verifica los datos.' }}]});
                } catch { /* content no es JSON parseable */ }
            }
        }

        // █ SAFETY GATE: VALIDACIÓN CLÍNICA CENTRALIZADA █
        const calledTools = chatHistory.filter(m => m.role === 'tool').map(m => m.name);
        const clinicalData = chatHistory
            .filter(m => m.role === 'tool')
            .map(m => {
                try {
                    const content = JSON.parse(m.content);
                    if (Array.isArray(content)) return content; // search_patients
                    if (content.profile) return [content.profile]; // complete_history
                    return [];
                } catch { return []; }
            })
            .flat();

        const safety = validateClinicalSafety(clinicalData, finalText, doctorName);
        if (!safety.isValid && safety.suggestedWarning) {
            console.warn('NIA 🛑: SAFETY VIOLATION detected by engine:', safety.missingInResponse);
            return NextResponse.json({ choices: [{ message: { role: 'assistant', content: safety.suggestedWarning }}]});
        }

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
