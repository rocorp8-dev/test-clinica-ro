import { NextResponse } from 'next/server';
import { NIA_TOOLS, executeNiaTool } from './tools';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const getNiaSystemPrompt = (doctorName: string) => `ROL: Eres "Nia" (Neural Interface Assistant).
CONTEXTO: Copiloto clínico de élite en MdPulso con acceso total a DB.
MÉDICO ACTUAL: Dr. ${doctorName} (Dirígete a él por su nombre si te saluda o pregunta algo general).
FECHA ACTUAL: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })} (Usa esto para calcular 'hoy', 'mañana', etc.)

REGLA DE ORO: NO des respuestas intermedias como "Un momento", "Voy a buscar" o "He encontrado...".
TU RESPUESTA DEBE SER ÚNICAMENTE EL RESULTADO FINAL O EL REPORTE ESTRICTO.

REGLA DE CORTESÍA: Si el médico solo te saluda o hace una pregunta no clínica, responde brevemente y con cortesía usando su nombre (Dr. ${doctorName}), pero para CUALQUIER reporte clínico CUMPLE EL FORMATO ESTRICTO.

FLUJO OBLIGATORIO:
1. Si el médico pide algo sobre un paciente:
   - USA 'search_patients' si no tienes su UUID.
   - USA 'get_patient_complete_history' con el UUID.
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

        const doctorName = profile?.full_name || user.email?.split('@')[0] || 'Doctor';
        const systemPrompt = getNiaSystemPrompt(doctorName);

        // Initial AI Call with Tools
        console.log('NIA: Initializing AI request with tools...');
        let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY} `,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://mdpulso-ro.vercel.app",
                "X-Title": "MdPulso Clinica",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                tools: NIA_TOOLS,
                tool_choice: "auto",
                temperature: 0.1,
            })
        });

        let data = await response.json();
        if (!response.ok) {
            console.error('NIA: OpenRouter Error:', data);
            return NextResponse.json({ error: data.error || 'AI Error' }, { status: 500 });
        }

        let message = data.choices[0].message;
        console.log('NIA: AI Response Message:', message);

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
            response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY} `,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://mdpulso-ro.vercel.app",
                    "X-Title": "MdPulso Clinica",
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o-mini",
                    messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
                    tools: NIA_TOOLS,
                    tool_choice: "auto",
                    temperature: 0.1,
                })
            });

            data = await response.json();
            if (!response.ok) {
                console.error('NIA: OpenRouter Loop Error:', data);
                break;
            }

            message = data.choices[0].message;
            console.log('NIA: AI Next Step Message:', message);
            chatHistory.push(message);
        }

        console.log('NIA: Final Response Ready.');

        return NextResponse.json(data);
    } catch (error) {
        console.error('NIA_API_ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
