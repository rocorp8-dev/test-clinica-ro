import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for NIA (Server Side)
const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key')
);

export const NIA_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_patients",
            description: "Busca pacientes por nombre o DNI/Identificación.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nombre o DNI del paciente a buscar." }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_patient_complete_history",
            description: "Obtiene el historial clínico completo de un paciente. Requiere el campo 'patient_id' que es el campo 'id' retornado por search_patients.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "El 'id' exacto retornado por search_patients. SIEMPRE usa el campo 'id' del resultado de búsqueda como patient_id." }
                },
                required: ["patient_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_appointment",
            description: "Agenda una nueva cita médica para un paciente.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "El UUID del paciente." },
                    fecha: { type: "string", description: "Fecha y hora en formato ISO 8601 (ej: 2026-02-22T11:00:00)." },
                    motivo: { type: "string", description: "Breve descripción del motivo de la consulta." }
                },
                required: ["patient_id", "fecha", "motivo"]
            }
        }
    }
];

export async function executeNiaTool(name: string, args: any, userId: string) {
    console.log(`Executing NIA Tool: ${name}`, args);

    try {
        switch (name) {
            case 'search_patients': {
                // Quitar palabras en lenguaje natural que el médico incluye en el query
                const stopWords = /\b(expediente|historial|cita|paciente|del?|de|la|el|los|las|me|muestra|mu[eé]strame|dame|busca|buscar|ver|quiero|necesito|informaci[oó]n|info|completo|completa)\b/gi;
                const cleanQuery = args.query
                    .replace(stopWords, '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // normalizar acentos
                    .replace(/\s+/g, ' ').trim();

                const { data, error } = await supabase.rpc('search_patients_nia', {
                    search_query: `%${cleanQuery}%`,
                    doctor_id: userId
                });

                if (error) {
                    console.error('NIA: search_patients error:', error);
                    throw error;
                }
                console.log(`NIA: search_patients results for "${args.query}":`, data);
                return data || [];
            }

            case 'get_patient_complete_history': {
                // Acepta patient_id, uuid, o id — el modelo puede usar cualquiera de los tres
                const patientId = args.patient_id || args.uuid || args.id;
                if (!patientId) {
                    console.error('NIA: get_patient_complete_history — sin patient_id:', args);
                    return { error: 'Falta el ID del paciente. Asegúrate de pasar el campo patient_id.' };
                }
                // Basic Info
                const { data: patient, error: pError } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', patientId)
                    .single();

                if (pError) {
                    console.error('NIA: get_patient_complete_history patient error:', pError);
                    throw pError;
                }

                // Appointments
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('fecha', { ascending: false });

                // Medical Notes
                const { data: notes } = await supabase
                    .from('medical_notes')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('created_at', { ascending: false });

                console.log(`NIA: history for patient ${args.patient_id} found.`);
                return {
                    profile: patient,
                    appointments: appointments || [],
                    medical_notes: notes || []
                };
            }

            case 'create_appointment': {
                // AUTO-HEALING: Modelos pequeños (llama3.1-8b) a veces intentan pasar el Nombre en lugar de buscar el UUID.
                // Si el patient_id no es un UUID válido, intentaremos deducirlo automáticamente usando search_patients_nia.
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.patient_id);
                if (!isUuid) {
                    console.log(`NIA AutoHealing: patient_id is not a UUID ("${args.patient_id}"). Attempting to search...`);
                    const cleanQuery = args.patient_id.replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: searchResults, error: sErr } = await supabase.rpc('search_patients_nia', {
                        search_query: `%${cleanQuery}%`,
                        doctor_id: userId
                    });
                    
                    if (sErr || !searchResults || searchResults.length === 0) {
                        return { error: `ERROR_PACIENTE_NO_ENCONTRADO: Busqué a "${args.patient_id}" pero no existe en la base de datos de pacientes. Pide al médico que revise el nombre y registre al paciente.` };
                    }
                    // Auto-asignar el UUID real del primer match
                    args.patient_id = searchResults[0].id;
                    console.log(`NIA AutoHealing: resolved to UUID -> ${args.patient_id}`);
                }

                // Limpiar la fecha y asegurar que tenga timezone, evitando duplicar offsets
                let dateStr = args.fecha.trim();
                const hasOffset = dateStr.includes('+') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 10) || dateStr.endsWith('Z');
                if (!hasOffset && /\d$/.test(dateStr)) {
                    dateStr += '-06:00';
                }
                
                // BLOQUEO DE SEGURIDAD: Protocolo de Tiempo y Anticipación (Mínimo 1 hora)
                const requestDate = new Date(dateStr);
                
                if (isNaN(requestDate.getTime())) {
                    return { error: `ERROR_FORMATO_FECHA: La fecha enviada (${args.fecha}) no es válida para la base de datos temporal. Asegúrate de pasar la fecha estrictamente en formato ISO 8601 (ej: 2026-04-11T15:00:00). Propón el horario al usuario de nuevo.` };
                }

                const nowMs = Date.now();
                const oneHourMs = 60 * 60 * 1000;

                if (requestDate.getTime() < nowMs + oneHourMs) {
                    console.warn(`NIA intentó agendar muy pronto/pasado. Solicitado: ${dateStr}`);
                    return {
                        error: "ERROR_PROTOCOLO_TIEMPO: La hora solicitada está en el pasado o falta menos de 1 hora. NO SE AGENDÓ. El doctor requiere al menos 1 hora de anticipación. Pídele un nuevo horario.",
                        tiempo_actual_real: new Date(nowMs).toISOString()
                    };
                }

                // BLOQUEO DE SEGURIDAD: Verificación de Disponibilidad (Intervalos de 45 minutos)
                const dayString = args.fecha.split('T')[0];
                const startOfDay = new Date(`${dayString}T00:00:00-06:00`).toISOString();
                const endOfDay = new Date(`${dayString}T23:59:59-06:00`).toISOString();
                
                const { data: existingAppts, error: checkError } = await supabase
                    .from('appointments')
                    .select('id, fecha, patients(nombre)')
                    .eq('doctor_id', userId)
                    .gte('fecha', startOfDay)
                    .lte('fecha', endOfDay)
                    .neq('estado', 'cancelada');

                if (checkError) {
                    console.error('NIA: Error verificando disponibilidad:', checkError);
                    throw checkError;
                }

                const requestedMs = requestDate.getTime();
                const fortyFiveMinsMs = 45 * 60 * 1000;

                if (existingAppts && existingAppts.length > 0) {
                    for (const appt of existingAppts) {
                        const apptMs = new Date(appt.fecha).getTime();
                        if (isNaN(apptMs)) continue; // ignorar si la db retornó algo que JS no puede parsear

                        // Si la diferencia entre la cita existente y la nueva es menor a 45 mins = conflicto
                        if (Math.abs(requestedMs - apptMs) < fortyFiveMinsMs) {
                            console.warn(`NIA intentó doble agendar. Conflicto con: ${appt.fecha}`);
                            const ocupadoPor = (appt.patients as any)?.nombre || "otro paciente";
                            return {
                                error: `ERROR_CONFLICTO_HORARIO: El horario interfiere con otra cita programada para ${ocupadoPor} que abarca ese bloque (las citas requieren 45 minutos). NO SE AGENDÓ. Propón al usuario otro horario con al menos 45 mins de diferencia.`,
                                estado_agenda: "OCUPADO"
                            };
                        }
                    }
                }

                console.log('NIA: Inserting into "appointments" table...', {
                    patient_id: args.patient_id,
                    doctor_id: userId,
                    fecha: dateStr,
                    motivo: args.motivo
                });

                const { data, error } = await supabase
                    .from('appointments')
                    .insert([{
                        patient_id: args.patient_id,
                        doctor_id: userId,
                        fecha: dateStr,
                        motivo: args.motivo,
                        estado: 'pendiente'
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('NIA: create_appointment error:', error);
                    throw error;
                }

                console.log('NIA: Appointment created:', data);
                return { success: true, appointment: data };
            }

            default:
                return { error: "Tool not found" };
        }
    } catch (err: any) {
        console.error(`Tool Execution Error (${name}):`, err);
        return { error: err.message };
    }
}
