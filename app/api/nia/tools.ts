import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for NIA (Server Side)
const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key')
);

// Helper: fecha local CDMX como YYYY-MM-DD
function localDateStr(): string {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const NIA_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_patients",
            description: "Busca pacientes del doctor por nombre o DNI. Retorna lista con id, nombre, dni, telefono.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Solo el nombre o DNI del paciente. Sin palabras como expediente, historial, cita." }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_patient_complete_history",
            description: "Obtiene historial clínico completo (consultas, notas médicas) de un paciente. Usa el 'id' de search_patients como patient_id.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID del paciente — el campo 'id' del resultado de search_patients." }
                },
                required: ["patient_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_today_agenda",
            description: "Retorna la agenda completa de HOY: todas las citas del doctor con nombre del paciente, hora y estado.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "create_appointment",
            description: "Agenda una nueva cita. Requiere nombre/id del paciente, fecha ISO 8601 y motivo.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID o nombre del paciente." },
                    fecha: { type: "string", description: "Fecha y hora ISO 8601 con timezone CDMX (ej: 2026-04-15T10:00:00-06:00)." },
                    motivo: { type: "string", description: "Motivo de la consulta." }
                },
                required: ["patient_id", "fecha", "motivo"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "confirm_appointment",
            description: "Confirma una cita existente. Primero usa get_today_agenda para obtener el appointment_id.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: { type: "string", description: "UUID de la cita a confirmar." }
                },
                required: ["appointment_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cancel_appointment",
            description: "Cancela una cita existente. Primero usa get_today_agenda para obtener el appointment_id.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: { type: "string", description: "UUID de la cita a cancelar." },
                    motivo_cancelacion: { type: "string", description: "Razón opcional de la cancelación." }
                },
                required: ["appointment_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_medical_note",
            description: "Agrega una nota médica SOAP al expediente de un paciente. Usa el id del paciente.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID del paciente." },
                    subjetivo: { type: "string", description: "Síntomas y queja principal del paciente." },
                    objetivo: { type: "string", description: "Hallazgos físicos, signos vitales, exploración." },
                    analisis: { type: "string", description: "Diagnóstico o impresión clínica." },
                    plan: { type: "string", description: "Tratamiento, indicaciones, medicamentos, seguimiento." },
                    cie10: { type: "string", description: "Código CIE-10 del diagnóstico (opcional)." }
                },
                required: ["patient_id", "subjetivo", "analisis", "plan"]
            }
        }
    }
];

export async function executeNiaTool(name: string, args: any, userId: string) {
    console.log(`NIA Tool: ${name}`, JSON.stringify(args).slice(0, 200));

    try {
        switch (name) {

            case 'search_patients': {
                const stopWords = /\b(expediente|historial|cita|paciente|del?|de|la|el|los|las|me|muestra|mu[eé]strame|dame|busca|buscar|ver|quiero|necesito|informaci[oó]n|info|completo|completa|actividad)\b/gi;
                const cleanQuery = args.query
                    .replace(stopWords, '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ').trim();

                const { data, error } = await supabase.rpc('search_patients_nia', {
                    search_query: `%${cleanQuery}%`,
                    doctor_id: userId
                });

                if (error) throw error;
                console.log(`NIA: search_patients "${args.query}" → ${data?.length} resultados`);
                return data || [];
            }

            case 'get_patient_complete_history': {
                const patientId = args.patient_id || args.uuid || args.id;
                if (!patientId) return { error: 'Falta patient_id. Usa el campo id de search_patients.' };

                const [patientRes, appointmentsRes, notesRes] = await Promise.all([
                    supabase.from('patients').select('*').eq('id', patientId).single(),
                    supabase.from('appointments').select('id, fecha, motivo, estado').eq('patient_id', patientId).order('fecha', { ascending: false }).limit(20),
                    supabase.from('medical_notes').select('id, created_at, subjetivo, objetivo, analisis, plan, cie10').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10)
                ]);

                if (patientRes.error) throw patientRes.error;
                return {
                    profile: patientRes.data,
                    appointments: appointmentsRes.data || [],
                    medical_notes: notesRes.data || []
                };
            }

            case 'get_today_agenda': {
                const today = localDateStr();
                const dayStart = `${today}T00:00:00-06:00`;
                const dayEnd = `${today}T23:59:59-06:00`;

                const { data, error } = await supabase
                    .from('appointments')
                    .select('id, fecha, motivo, estado, patients(nombre, telefono)')
                    .eq('doctor_id', userId)
                    .gte('fecha', dayStart)
                    .lte('fecha', dayEnd)
                    .order('fecha', { ascending: true });

                if (error) throw error;
                return { date: today, total: data?.length || 0, appointments: data || [] };
            }

            case 'confirm_appointment': {
                const { data, error } = await supabase
                    .from('appointments')
                    .update({ estado: 'confirmada' })
                    .eq('id', args.appointment_id)
                    .eq('doctor_id', userId)
                    .select('id, fecha, motivo, patients(nombre)')
                    .single();

                if (error) throw error;
                return { success: true, appointment: data };
            }

            case 'cancel_appointment': {
                const { data, error } = await supabase
                    .from('appointments')
                    .update({ estado: 'cancelada' })
                    .eq('id', args.appointment_id)
                    .eq('doctor_id', userId)
                    .select('id, fecha, motivo, patients(nombre)')
                    .single();

                if (error) throw error;
                return { success: true, appointment: data };
            }

            case 'add_medical_note': {
                const patientId = args.patient_id || args.uuid || args.id;
                if (!patientId) return { error: 'Falta patient_id.' };

                const { data, error } = await supabase
                    .from('medical_notes')
                    .insert([{
                        patient_id: patientId,
                        doctor_id: userId,
                        subjetivo: args.subjetivo || '',
                        objetivo: args.objetivo || '',
                        analisis: args.analisis || '',
                        plan: args.plan || '',
                        cie10: args.cie10 || null,
                    }])
                    .select('id, created_at')
                    .single();

                if (error) throw error;
                return { success: true, note_id: data.id, created_at: data.created_at };
            }

            case 'create_appointment': {
                // AUTO-HEALING: acepta nombre además de UUID
                let patientParam = args.patient_id || args.nombre || args.paciente || args.query;
                if (!patientParam) return { error: 'Falta patient_id o nombre del paciente.' };

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(patientParam));
                if (!isUuid) {
                    const cleanQuery = String(patientParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found, error: sErr } = await supabase.rpc('search_patients_nia', {
                        search_query: `%${cleanQuery}%`,
                        doctor_id: userId
                    });
                    if (sErr || !found?.length) {
                        return { error: `ERROR_PACIENTE_NO_ENCONTRADO: "${patientParam}" no está registrado. Pide al médico que registre al paciente primero.` };
                    }
                    args.patient_id = found[0].id;
                    console.log(`NIA AutoHealing create_appointment: "${patientParam}" → UUID ${args.patient_id}`);
                } else {
                    args.patient_id = patientParam;
                }

                // Normalizar timezone
                let dateStr = args.fecha.trim();
                const hasOffset = dateStr.includes('+') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 10) || dateStr.endsWith('Z');
                if (!hasOffset && /\d$/.test(dateStr)) dateStr += '-06:00';

                const requestDate = new Date(dateStr);
                if (isNaN(requestDate.getTime())) {
                    return { error: `ERROR_FORMATO_FECHA: "${args.fecha}" no es una fecha válida. Usa ISO 8601: 2026-04-15T10:00:00-06:00` };
                }

                // Mínimo 1 hora de anticipación
                if (requestDate.getTime() < Date.now() + 60 * 60 * 1000) {
                    return {
                        error: 'ERROR_PROTOCOLO_TIEMPO: La cita debe agendarse con mínimo 1 hora de anticipación. NO SE AGENDÓ.',
                        tiempo_actual: new Date().toISOString()
                    };
                }

                // Verificar disponibilidad (bloques de 45 min)
                const dayStr = dateStr.split('T')[0];
                const { data: existing } = await supabase
                    .from('appointments')
                    .select('id, fecha, patients(nombre)')
                    .eq('doctor_id', userId)
                    .gte('fecha', `${dayStr}T00:00:00-06:00`)
                    .lte('fecha', `${dayStr}T23:59:59-06:00`)
                    .neq('estado', 'cancelada');

                const requestedMs = requestDate.getTime();
                for (const appt of existing || []) {
                    const apptMs = new Date(appt.fecha).getTime();
                    if (!isNaN(apptMs) && Math.abs(requestedMs - apptMs) < 45 * 60 * 1000) {
                        const ocupado = (appt.patients as any)?.nombre || 'otro paciente';
                        return {
                            error: `ERROR_CONFLICTO_HORARIO: Ese horario interfiere con la cita de ${ocupado}. Las citas son de 45 min. NO SE AGENDÓ. Propón otro horario.`,
                            estado_agenda: 'OCUPADO'
                        };
                    }
                }

                const { data, error } = await supabase
                    .from('appointments')
                    .insert([{ patient_id: args.patient_id, doctor_id: userId, fecha: dateStr, motivo: args.motivo, estado: 'pendiente' }])
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, appointment: data };
            }

            default:
                return { error: `Tool desconocida: ${name}` };
        }
    } catch (err: any) {
        console.error(`NIA Tool Error (${name}):`, err.message);
        return { error: err.message };
    }
}
