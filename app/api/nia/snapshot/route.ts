import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger, safeErrorMessage } from '@/lib/logger';
import { validateClinicalSafety } from '@/lib/clinicalSafety';

export async function POST(req: Request) {
    try {
        const { patient_id } = await req.json();
        logger.log('Generating snapshot for patient_id:', patient_id);

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
            .select('id, nombre, dni, curp, fecha_nac, sexo, telefono, email, alergias, padecimientos, antecedentes, tipo_sangre, created_at')
            .eq('id', patient_id)
            .single();

        if (pError) throw pError;

        // 2. Appointments
        const { data: appointments } = await supabaseClient
            .from('appointments')
            .select('id, fecha, motivo, estado, diagnostico, created_at')
            .eq('patient_id', patient_id)
            .order('fecha', { ascending: false });

        // 3. Notes
        const { data: notes } = await supabaseClient
            .from('medical_notes')
            .select('id, created_at, tipo_nota, subjetivo, objetivo, analisis, plan, diagnostico, codigo_cie10, tension_sistolica, tension_diastolica, frecuencia_cardiaca, frecuencia_resp, temperatura, peso_kg, talla_cm, spo2, firmada, cedula_prof, antecedentes_go')
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

        // Nivel 1 — Groq openai/gpt-oss-120b: recomendado oficialmente por Groq, excelente para JSON estructurado
        // Nivel 2 — Groq qwen/qwen3.6-27b: modelo 27B ultra-rápido de respaldo
        // Fallback final — OpenRouter mistral-large (solo texto, sin herramientas)
        const GROQ_MODEL_PRIMARY   = 'openai/gpt-oss-120b';             // Primario — JSON generation 120B
        const GROQ_MODEL_SECONDARY = 'qwen/qwen3.6-27b';                // Nivel 2 — 27B ultra-rápido
        const OPENROUTER_FALLBACK  = 'mistralai/mistral-large';         // Fallback final

        let response;
        let data;
        let usedProvider = 'groq';

        // Nivel 1: llama-3.1-70b — primario para generación de JSON clínico
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
                        model: GROQ_MODEL_PRIMARY,
                        messages: [{ role: "user", content: NIA_PROMPT }],
                        response_format: { type: "json_object" },
                        temperature: 0.1
                    })
                });
                data = await response.json();
                if (response.ok) {
                    logger.log(`SNAP: usando Groq primario (${GROQ_MODEL_PRIMARY}) ✅`);
                } else {
                    logger.warn(`SNAP: Groq primario error (${response.status}), intentando nivel 2:`, data?.error?.message);
                    usedProvider = 'groq-secondary';
                }
            } catch (e) {
                logger.warn('SNAP: Groq primario excepción, intentando nivel 2:', e);
                usedProvider = 'groq-secondary';
            }

            // Nivel 2: kimi-k2 — si llama-3.1 falla
            if (usedProvider === 'groq-secondary') {
                try {
                    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${groqKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: GROQ_MODEL_SECONDARY,
                            messages: [{ role: "user", content: NIA_PROMPT }],
                            response_format: { type: "json_object" },
                            temperature: 0.1
                        })
                    });
                    data = await response.json();
                    if (response.ok) {
                        logger.log(`SNAP: usando Groq nivel 2 (${GROQ_MODEL_SECONDARY}) ✅`);
                        usedProvider = 'groq';
                    } else {
                        logger.warn('SNAP: Groq nivel 2 error, fallback OpenRouter:', data?.error?.message);
                        usedProvider = 'openrouter';
                    }
                } catch (e) {
                    logger.warn('SNAP: Groq nivel 2 excepción, fallback OpenRouter:', e);
                    usedProvider = 'openrouter';
                }
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
            logger.log('SNAP: usando OpenRouter fallback' + (response!.ok ? ' ✅' : ' ❌'));
        }

        // Validar respuesta
        if (!response!.ok) {
            logger.error('SNAP: AI Provider Error:', data);
            let message = 'AI Snapshot Error';
            if (data?.error) {
                message = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
            } else if (data?.message) {
                message = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
            }
            logger.error('SNAP: AI Provider Error:', message);
            return NextResponse.json({ error: safeErrorMessage(new Error(message), 'Error generando snapshot clínico') }, { status: response!.status });
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
                logger.warn('NIA Snapshot 🛑: Safety Engine detected omission. Overriding notes...');
                snapshotResult.safetyAlerts.hasAlerts = true;
                snapshotResult.safetyAlerts.notes = `🚨 REVISIÓN MANDATORIA: ${safety.detectedAlerts.join(', ')}`;
            }
        } catch (e) {
            logger.error('Failed to parse NIA snapshot JSON:', e);
            return NextResponse.json({ error: 'Invalid snapshot format' }, { status: 500 });
        }
        return NextResponse.json(snapshotResult);

    } catch (error) {
        logger.error('NIA_SNAPSHOT_API_ERROR:', error);
        return NextResponse.json({ error: 'Error generating snapshot' }, { status: 500 });
    }
}
