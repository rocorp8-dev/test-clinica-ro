import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        // Validate OpenRouter API key
        if (!process.env.OPENROUTER_API_KEY) {
            console.error('OpenRouter API key not configured');
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
        }
        const { patient_id } = await req.json();
        console.log('Generating snapshot for patient_id:', patient_id);

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

        if (!patient_id) {
            return NextResponse.json({ error: 'Patient ID missing' }, { status: 400 });
        }

        // Fetch patient history directly
        // 1. Profile
        const { data: patient, error: pError } = await supabaseClient
            .from('patients')
            .select('*')
            .eq('id', patient_id)
            .single();

        if (pError) throw pError;

        // 2. Appointments
        const { data: appointments } = await supabaseClient
            .from('appointments')
            .select('*')
            .eq('patient_id', patient_id)
            .order('fecha', { ascending: false });

        // 3. Notes
        const { data: notes } = await supabaseClient
            .from('medical_notes')
            .select('*')
            .eq('patient_id', patient_id)
            .order('created_at', { ascending: false });

        const medicalData = {
            profile: patient,
            appointments: appointments || [],
            medical_notes: notes || []
        };

        const NIA_PROMPT = `
Eres NIA, el Copiloto Clínico de Élite.
Genera un "Snapshot Clínico Estructurado" en formato JSON puro.
La fecha actual es: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}.

ANALIZA la siguiente data bruta del paciente y extrae los 4 componentes requeridos, SIN NADA de texto antes o después del JSON. Solo devuelve el JSON válido con esta estructura:

{
  "safetyAlerts": {
    "hasAlerts": boolean (true si hay alergias graves o condiciones crónicas que requieran atención urgente, falso en caso contrario),
    "notes": "Si es true, describe brevemente la alerta en rojo. Si es false, responde 'Apto: Sin alertas registradas'"
  },
  "snapshot": {
    "reason": "Razón de la última visita",
    "diagnosis": "Diagnóstico activo",
    "status": "Estado General (Estable, En recuperación, Critico)"
  },
  "trends": "Párrafo breve con comportamientos frecuentes o patrones encontrados en las visitas pasadas (ej: 3 visitas por tos recurrente).",
  "suggestion": "El próximo paso lógico o recomendación operativa brillante para el médico."
}

DATA BRUTA:
${JSON.stringify(medicalData)}
`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://mdpulso-ro.vercel.app",
                "X-Title": "MdPulso Clinica",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: NIA_PROMPT }],
                response_format: { type: "json_object" },
                temperature: 0.1,
            })
        });

        const data = await response.json();
        // If the API returned an error, surface it immediately
        if (!response.ok) {
            console.error('NIA Snapshot Error:', data);
            let message = 'AI Snapshot Error';
            if (data?.error) {
                message = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
            } else if (data?.message) {
                message = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
            }
            return NextResponse.json({ error: message }, { status: response.status });
        }
        // The OpenRouter response may already be a parsed object when using json_object format
        let snapshotResult;
        try {
            const content = data?.choices?.[0]?.message?.content;
            snapshotResult = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
            console.error('Failed to parse NIA snapshot JSON:', e);
            return NextResponse.json({ error: 'Invalid snapshot format' }, { status: 500 });
        }
        return NextResponse.json(snapshotResult);

    } catch (error) {
        console.error('NIA_SNAPSHOT_API_ERROR:', error);
        return NextResponse.json({ error: 'Error generating snapshot' }, { status: 500 });
    }
}
