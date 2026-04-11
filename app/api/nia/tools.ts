import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for NIA (Server Side)
const supabase = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key')
);

function formatToCdmx(isoStr: string) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) + ' (Hora CDMX)';
}

function cdmxDayRangeUTC(dateInput?: string) {
    // Si no hay input, usar hoy en CDMX
    const now = new Date();
    const localStr = dateInput || now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    
    // Rango: desde las 00:00:00 hasta las 23:59:59 en America/Mexico_City
    const start = new Date(`${localStr}T00:00:00-06:00`);
    const end = new Date(`${localStr}T23:59:59-06:00`);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        localDate: localStr
    };
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
            description: "Obtiene el resumen clínico completo (consultas, notas médicas) de un paciente. Usa el 'id' de search_patients como patient_id.",
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
            description: "Retorna la agenda del doctor. LLAMA SIEMPRE SIN PARÁMETROS para ver la agenda de HOY. El parámetro 'fecha' es OPCIONAL y solo se usa si el médico pide un día diferente (mañana, lunes, etc.).",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "OPCIONAL. Fecha en formato YYYY-MM-DD. OMITE este parámetro si el médico pregunta por la agenda de HOY." }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "confirm_appointment",
            description: "Marca una cita como confirmada.",
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
            description: "Marca una cita como cancelada.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: { type: "string", description: "UUID de la cita a cancelar." }
                },
                required: ["appointment_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_medical_note",
            description: "Guarda un resumen de la visita médica (observaciones, plan, etc).",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID o nombre del paciente." },
                    subjetivo: { type: "string" },
                    objetivo: { type: "string" },
                    analisis: { type: "string" },
                    plan: { type: "string" },
                    cie10: { type: "string" }
                },
                required: ["patient_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_appointment",
            description: "Agenda una nueva cita médica.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID del paciente (o nombre para búsqueda)." },
                    fecha: { type: "string", description: "Fecha y hora en formato ISO 8601 (ej: 2026-04-15T10:00:00)." },
                    motivo: { type: "string", description: "Breve motivo de la consulta." }
                },
                required: ["patient_id", "fecha", "motivo"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "register_patient",
            description: "Registra a un nuevo paciente en el sistema.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string" },
                    email: { type: "string" },
                    telefono: { type: "string" },
                    dni: { type: "string" },
                    edad: { type: "number" },
                    genero: { type: "string" },
                    tipo_sangre: { type: "string" },
                    alergias: { type: "string" },
                    padecimientos: { type: "string" }
                },
                required: ["nombre"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "register_payment",
            description: "Registra un pago realizado por un paciente.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: { type: "string" },
                    amount: { type: "number" },
                    method: { type: "string", description: "efectivo, tarjeta, transferencia" },
                    notes: { type: "string" }
                },
                required: ["appointment_id", "amount"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "reschedule_appointment",
            description: "Cambia la fecha de una cita existente.",
            parameters: {
                type: "object",
                properties: {
                    appointment_id: { type: "string" },
                    nueva_fecha: { type: "string", description: "ISO 8601" }
                },
                required: ["appointment_id", "nueva_fecha"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_patient",
            description: "Actualiza los datos de un paciente existente (teléfono, alergias, etc).",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string", description: "UUID o nombre." },
                    telefono: { type: "string" },
                    email: { type: "string" },
                    alergias: { type: "string" },
                    padecimientos: { type: "string" },
                    nombre: { type: "string" }
                },
                required: ["patient_id"]
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
                const cleanQuery = (args.query || '')
                    .replace(stopWords, '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ').trim();

                const { data, error } = await supabase.rpc('search_patients_nia', {
                    search_query: `%${cleanQuery}%`,
                    doctor_id: userId
                });

                if (error) throw error;
                
                const enrichedData = await Promise.all((data || []).map(async (p: any) => {
                    const { data: pData } = await supabase.from('patients').select('alergias, padecimientos, tipo_sangre').eq('id', p.id).single();
                    return { ...p, ...pData };
                }));

                return enrichedData;
            }

            case 'get_patient_complete_history': {
                let pParam = args.patient_id || args.uuid || args.id || args.query;
                if (!pParam) return { error: 'Falta patient_id o nombre.' };

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(pParam));
                let pId = pParam;

                if (!isUuid) {
                    const q = String(pParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found } = await supabase.rpc('search_patients_nia', { search_query: `%${q}%`, doctor_id: userId });
                    if (!found?.length) return { error: `Paciente "${pParam}" no encontrado.` };
                    pId = found[0].id;
                }

                const [pRes, aRes, nRes] = await Promise.all([
                    supabase.from('patients').select('*').eq('id', pId).single(),
                    supabase.from('appointments').select('id, fecha, motivo, estado').eq('patient_id', pId).order('fecha', { ascending: false }).limit(20),
                    supabase.from('medical_notes').select('id, created_at, subjetivo, objetivo, analisis, plan, codigo_cie10').eq('patient_id', pId).order('created_at', { ascending: false }).limit(10)
                ]);

                if (pRes.error) throw pRes.error;
                return { 
                    alertas_seguridad: pRes.data.alergias || 'Sin registros',
                    profile: pRes.data, 
                    appointments: (aRes.data || []).map(a => ({ ...a, hora_local: formatToCdmx(a.fecha) })),
                    medical_notes: nRes.data || [] 
                };
            }

            case 'get_agenda_by_date': {
                const { start, end, localDate } = cdmxDayRangeUTC(args.fecha || undefined);
                const { data, error } = await supabase
                    .from('appointments')
                    .select('id, fecha, motivo, estado, patients(nombre, telefono, alergias, padecimientos)')
                    .eq('doctor_id', userId)
                    .gte('fecha', start)
                    .lte('fecha', end)
                    .order('fecha', { ascending: true });

                if (error) throw error;
                return { 
                    date: localDate, 
                    appointments: (data || []).map(a => ({
                        ...a,
                        hora_local: formatToCdmx(a.fecha)
                    }))
                };
            }

            case 'confirm_appointment': {
                const { data, error } = await supabase.from('appointments').update({ estado: 'confirmada' }).eq('id', args.appointment_id).eq('doctor_id', userId).select('id, fecha, patients(nombre)').single();
                if (error) throw error;
                return { success: true, appointment: data };
            }

            case 'cancel_appointment': {
                const { data, error } = await supabase.from('appointments').update({ estado: 'cancelada' }).eq('id', args.appointment_id).eq('doctor_id', userId).select('id, fecha, patients(nombre)').single();
                if (error) throw error;
                return { success: true, appointment: data };
            }

            case 'add_medical_note': {
                let pParam = args.patient_id || args.uuid || args.id || args.nombre || args.query;
                if (!pParam) return { error: 'Falta paciente.' };
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(pParam));
                let pId = pParam;

                if (!isUuid) {
                    const q = String(pParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found } = await supabase.rpc('search_patients_nia', { search_query: `%${q}%`, doctor_id: userId });
                    if (!found?.length) return { error: `Paciente "${pParam}" no encontrado.` };
                    pId = found[0].id;
                }

                const { data, error } = await supabase.from('medical_notes').insert([{
                    patient_id: pId,
                    doctor_id: userId,
                    subjetivo: args.subjetivo || '',
                    objetivo: args.objetivo || '',
                    analisis: args.analisis || '',
                    plan: args.plan || '',
                    codigo_cie10: args.cie10 || null,
                    tipo_nota: 'evolucion'
                }]).select('id, created_at').single();

                if (error) throw error;
                return { success: true, note_id: data.id };
            }

            case 'create_appointment': {
                let pParam = args.patient_id || args.nombre || args.paciente;
                if (!pParam) return { error: 'Falta paciente.' };
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(pParam));
                let pId = pParam;

                if (!isUuid) {
                    const q = String(pParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found } = await supabase.rpc('search_patients_nia', { search_query: `%${q}%`, doctor_id: userId });
                    if (!found?.length) return { error: `Paciente "${pParam}" no encontrado. Regístralo primero.` };
                    pId = found[0].id;
                }

                let dStr = args.fecha.trim();
                if (!dStr.includes('+') && !dStr.includes('Z')) dStr += '-06:00';
                const rDate = new Date(dStr);
                if (isNaN(rDate.getTime())) return { error: 'Fecha inválida.' };

                const day = dStr.split('T')[0];
                const { start, end } = cdmxDayRangeUTC(day);
                const { data: existing } = await supabase.from('appointments').select('id, fecha, patients(nombre)').eq('doctor_id', userId).gte('fecha', start).lte('fecha', end).neq('estado', 'cancelada');

                const rMs = rDate.getTime();
                for (const a of existing || []) {
                    const aMs = new Date(a.fecha).getTime();
                    if (Math.abs(rMs - aMs) < 45 * 60 * 1000) {
                        return { error: `AVISO: El paciente ${(a.patients as any)?.nombre || 'otro'} ya tiene esa hora ocupada. ¿Gusta que busquemos otro horario?`, conflict: true };
                    }
                }

                const { data, error } = await supabase.from('appointments').insert([{ patient_id: pId, doctor_id: userId, fecha: dStr, motivo: args.motivo, estado: 'pendiente' }]).select('id, fecha, patients(nombre)').single();
                if (error) throw error;
                return { success: true, appointment: { ...data, hora_local: formatToCdmx(data.fecha) } };
            }

            case 'register_patient': {
                const { data, error } = await supabase.from('patients').insert([{ ...args, user_id: userId }]).select().single();
                if (error) throw error;
                return { success: true, patient: data };
            }

            case 'register_payment': {
                const { data: appt } = await supabase.from('appointments').select('patient_id').eq('id', args.appointment_id).single();
                if (!appt) return { error: 'Cita no encontrada.' };
                const { error: pErr } = await supabase.from('billing').insert([{ user_id: userId, appointment_id: args.appointment_id, patient_id: appt.patient_id, amount: args.amount, payment_method: args.method || 'efectivo' }]);
                if (pErr) throw pErr;
                await supabase.from('appointments').update({ estado: 'completada' }).eq('id', args.appointment_id);
                return { success: true, amount: args.amount };
            }

            case 'reschedule_appointment': {
                let dStr = args.nueva_fecha.trim();
                if (!dStr.includes('+') && !dStr.includes('Z')) dStr += '-06:00';
                const rDate = new Date(dStr);
                const day = dStr.split('T')[0];
                const { start, end } = cdmxDayRangeUTC(day);
                const { data: existing } = await supabase.from('appointments').select('id, fecha').eq('doctor_id', userId).gte('fecha', start).lte('fecha', end).neq('id', args.appointment_id).neq('estado', 'cancelada');

                const rMs = rDate.getTime();
                for (const a of existing || []) {
                    if (Math.abs(rMs - new Date(a.fecha).getTime()) < 45 * 60 * 1000) return { error: 'Horario ocupado.' };
                }

                const { data, error } = await supabase.from('appointments').update({ fecha: dStr }).eq('id', args.appointment_id).select('id, fecha').single();
                if (error) throw error;
                return { success: true, new_date: data.fecha };
            }

            case 'update_patient': {
                let pParam = args.patient_id || args.id || args.nombre || args.query;
                if (!pParam) return { error: 'Falta paciente.' };
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(pParam));
                let pId = pParam;

                if (!isUuid) {
                    const q = String(pParam).replace(/\b(de|la|el|los|las)\b/gi, '').trim();
                    const { data: found } = await supabase.rpc('search_patients_nia', { search_query: `%${q}%`, doctor_id: userId });
                    if (!found?.length) return { error: `Paciente "${pParam}" no encontrado.` };
                    pId = found[0].id;
                }

                const upd = { ...args };
                delete upd.patient_id; delete upd.id; delete upd.uuid; delete upd.query;
                const { data, error } = await supabase.from('patients').update(upd).eq('id', pId).eq('user_id', userId).select().single();
                if (error) throw error;
                return { success: true, patient: data };
            }

            default:
                return { error: `Herramienta "${name}" no reconocida.` };
        }
    } catch (err: any) {
        console.error(`NIA Tool Error (${name}):`, err.message);
        const m = err.message || '';
        if (m.includes('uuid')) return { error: 'ID inválido. Usa un nombre o UUID real.' };
        return { error: `Error técnico: ${m}` };
    }
}
