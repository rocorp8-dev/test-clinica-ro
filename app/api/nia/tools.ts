import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for NIA (Server Side)
const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key')
);

// Helper: rango UTC correspondiente a un día completo en CDMX (UTC-6)
// Ex: 2026-04-09 CDMX → { gte: '2026-04-09T06:00:00.000Z', lte: '2026-04-10T05:59:59.999Z' }
function cdmxDayRangeUTC(isoDateStr?: string): { start: string; end: string; localDate: string } {
    // Hora actual en CDMX
    const nowCdmx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const year = isoDateStr ? parseInt(isoDateStr.split('-')[0]) : nowCdmx.getFullYear();
    const month = isoDateStr ? parseInt(isoDateStr.split('-')[1]) - 1 : nowCdmx.getMonth();
    const day = isoDateStr ? parseInt(isoDateStr.split('-')[2]) : nowCdmx.getDate();
    // CDMX es UTC-6 (o UTC-5 en horario de verano; usamos Date para que JS lo resuelva)
    const startCdmx = new Date(year, month, day, 0, 0, 0, 0);
    const endCdmx   = new Date(year, month, day, 23, 59, 59, 999);
    // Offset CDMX en ms (normalmente -6h o -5h en verano)
    const offsetMs = new Date(startCdmx.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime() - startCdmx.getTime();
    const startUTC = new Date(startCdmx.getTime() - offsetMs);
    const endUTC   = new Date(endCdmx.getTime()   - offsetMs);
    const localDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { start: startUTC.toISOString(), end: endUTC.toISOString(), localDate };
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
            name: "get_agenda_by_date",
            description: "Retorna la agenda completa de un día específico. Por defecto usa HOY. Úsala para 'agenda de mañana', 'citas de hoy', etc.",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "Opcional. Fecha en formato YYYY-MM-DD. Si no se indica, usa la fecha de hoy." }
                }
            }
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
                // AUTO-HEALING: acepta nombre además de UUID
                let patientParam = args.patient_id || args.uuid || args.id || args.query;
                if (!patientParam) return { error: 'Falta patient_id o nombre.' };

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(patientParam));
                let patientId = patientParam;

                if (!isUuid) {
                    const cleanQuery = String(patientParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found, error: sErr } = await supabase.rpc('search_patients_nia', {
                        search_query: `%${cleanQuery}%`,
                        doctor_id: userId
                    });
                    if (sErr || !found?.length) {
                        return { error: `ERROR_PACIENTE_NO_ENCONTRADO: "${patientParam}" no está registrado en tu sistema.` };
                    }
                    patientId = found[0].id;
                    console.log(`NIA AutoHealing History: "${patientParam}" → UUID ${patientId}`);
                }

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

            case 'get_agenda_by_date': {
                // fecha es timestamptz — .like() NO funciona en PostgREST con ese tipo.
                // Usamos rango UTC que cubre el día completo en CDMX.
                const { start, end, localDate } = cdmxDayRangeUTC(args.fecha || undefined);

                const { data, error } = await supabase
                    .from('appointments')
                    .select('id, fecha, motivo, estado, patients(nombre, telefono)')
                    .eq('doctor_id', userId)
                    .gte('fecha', start)
                    .lte('fecha', end)
                    .order('fecha', { ascending: true });

                if (error) {
                    console.error('NIA get_agenda_by_date DB error:', error);
                    throw error;
                }
                return { date: localDate, total: data?.length || 0, appointments: data || [] };
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
                // AUTO-HEALING
                let patientParam = args.patient_id || args.uuid || args.id || args.nombre || args.query;
                if (!patientParam) return { error: 'Falta patient_id o nombre.' };

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(patientParam));
                let patientId = patientParam;

                if (!isUuid) {
                    const cleanQuery = String(patientParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found, error: sErr } = await supabase.rpc('search_patients_nia', {
                        search_query: `%${cleanQuery}%`,
                        doctor_id: userId
                    });
                    if (sErr || !found?.length) {
                        return { error: `ERROR_PACIENTE_NO_ENCONTRADO: No se encontró al paciente "${patientParam}".` };
                    }
                    patientId = found[0].id;
                    console.log(`NIA AutoHealing Notes: "${patientParam}" → UUID ${patientId}`);
                }

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
                        tipo_nota: 'evolucion'
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
                // fecha es timestamptz — usamos rango UTC del día para evitar error 42883
                const dayStr = dateStr.split('T')[0]; // YYYY-MM-DD del ISO normalizado
                const { start: dayStart, end: dayEnd } = cdmxDayRangeUTC(dayStr);
                const { data: existing } = await supabase
                    .from('appointments')
                    .select('id, fecha, patients(nombre)')
                    .eq('doctor_id', userId)
                    .gte('fecha', dayStart)
                    .lte('fecha', dayEnd)
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
