import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateClinicalSafety } from '@/lib/clinicalSafety';

export async function POST(req: Request) {
    try {
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
    "notes": "Si es true, describe brevemente el riesgo crítico detectado de forma clara. Si es false, responde 'Apto: Sin alertas registradas'"
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

        // Proveedor primario: Groq llama-3.3-70b (tool calling nativo, ~0.8s, estable)
        // Fallback: OpenRouter mistral-large (Cerebras llama3.1-8b DECOMMISSIONED mayo 2026)
        const GROQ_MODEL = 'llama-3.3-70b-versatile';
        const OPENROUTER_FALLBACK = 'mistralai/mistral-large';

        let response;
        let data;
        let usedProvider = 'groq';

        // Intentar Groq primero
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            try {
                response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: GROQ_MODEL,
                        messages: [{ role: "user", content: NIA_PROMPT }],
                        response_format: { type: "json_object" },
                        temperature: 0.1
                    })
                });
                data = await response.json();
                if (response.ok) {
                    console.log('SNAP: usando Groq ✅');
                } else {
                    console.warn('SNAP: Groq error, fallback OpenRouter:', data?.error?.message);
                    usedProvider = 'openrouter';
                }
            } catch (e) {
                console.warn('SNAP: Groq excepción, fallback OpenRouter:', e);
                usedProvider = 'openrouter';
            }
        } else {
            usedProvider = 'openrouter';
        }

        // Fallback a OpenRouter si Groq falla o no está configurado
        if (usedProvider === 'openrouter') {
            const orKey = process.env.OPENROUTER_API_KEY;
            if (!orKey) {
                return NextResponse.json({ error: 'No AI provider configured (GROQ_API_KEY or OPENROUTER_API_KEY required)' }, { status: 500 });
            }
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${orKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: OPENROUTER_FALLBACK,
                    messages: [{ role: "user", content: NIA_PROMPT }],
                    response_format: { type: "json_object" },
                    temperature: 0.1
                })
            });
            data = await response.json();
            console.log('SNAP: usando OpenRouter fallback' + (response!.ok ? ' ✅' : ' ❌'));
        }

        // Validar respuesta
        if (!response!.ok) {
            console.error('SNAP: AI Provider Error:', data);
            let message = 'AI Snapshot Error';
            if (data?.error) {
                message = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
            } else if (data?.message) {
                message = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
            }
            return NextResponse.json({ error: message }, { status: response!.status });
        }
        // The OpenRouter response may already be a parsed object when using json_object format
        let snapshotResult;
        try {
            const content = data?.choices?.[0]?.message?.content;
            snapshotResult = typeof content === 'string' ? JSON.parse(content) : content;

            // █ SAFETY CROSS-CHECK █
            // Validamos que el JSON generado no ignore riesgos reales
            const safety = validateClinicalSafety([patient], JSON.stringify(snapshotResult), user.user_metadata?.full_name || 'Colega');
            if (!safety.isValid && safety.suggestedWarning) {
                console.warn('NIA Snapshot 🛑: Safety Engine detected omission. Overriding notes...');
                snapshotResult.safetyAlerts.hasAlerts = true;
                snapshotResult.safetyAlerts.notes = `🚨 REVISIÓN MANDATORIA: ${safety.detectedAlerts.join(', ')}`;
            }
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
