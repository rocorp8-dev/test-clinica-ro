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
                // BLOQUEO DE SEGURIDAD: Protocolo de Tiempo
                const requestDate = new Date(args.fecha);
                if (requestDate.getTime() < Date.now()) {
                    console.warn(`NIA intentó agendar en el pasado. Solicitado: ${args.fecha}, Actual: ${new Date().toISOString()}`);
                    return {
                        error: "ERROR_PROTOCOLO_TIEMPO: La hora o fecha solicitada está en el pasado. NO SE AGENDÓ. Informa esto al usuario y pídele un nuevo horario.",
                        tiempo_actual_real: new Date().toISOString()
                    };
                }

                // BLOQUEO DE SEGURIDAD: Verificación de Disponibilidad (Conflictos de Horario)
                const { data: existingAppts, error: checkError } = await supabase
                    .from('appointments')
                    .select('id, patients(nombre)')
                    .eq('doctor_id', userId)
                    .eq('fecha', args.fecha)
                    .neq('estado', 'cancelada');

                if (checkError) {
                    console.error('NIA: Error verificando disponibilidad:', checkError);
                    throw checkError;
                }

                if (existingAppts && existingAppts.length > 0) {
                    console.warn(`NIA intentó doble agendar. Fecha: ${args.fecha}`);
                    const ocupadoPor = (existingAppts[0]?.patients as any)?.nombre || "otro paciente";
                    return {
                        error: `ERROR_CONFLICTO_HORARIO: El horario ${requestDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ya está ocupado por ${ocupadoPor}. NO SE AGENDÓ. Informa esto al usuario y pídele que sugiera otra hora.`,
                        estado_agenda: "OCUPADO"
                    };
                }

                console.log('NIA: Inserting into "appointments" table...', {
                    patient_id: args.patient_id,
                    doctor_id: userId,
                    fecha: args.fecha,
                    motivo: args.motivo
                });

                const { data, error } = await supabase
                    .from('appointments')
                    .insert([{
                        patient_id: args.patient_id,
                        doctor_id: userId,
                        fecha: args.fecha,
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
