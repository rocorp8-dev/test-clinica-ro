require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createAppointmentCheck(args, userId) {
    let dateStr = args.fecha.trim();
    const hasOffset = dateStr.includes('+') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 10) || dateStr.endsWith('Z');
    if (!hasOffset && /\d$/.test(dateStr)) {
        dateStr += '-06:00';
    }
    const requestDate = new Date(dateStr);
    const requestedMs = requestDate.getTime();
    console.log("requestDate:", requestDate);

    const dayString = args.fecha.split('T')[0];
    const startOfDay = new Date(`${dayString}T00:00:00-06:00`).toISOString();
    const endOfDay = new Date(`${dayString}T23:59:59-06:00`).toISOString();
    console.log("start/end:", startOfDay, endOfDay);

    const { data: existingAppts } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', userId)
        .gte('fecha', startOfDay)
        .lte('fecha', endOfDay)
        .neq('estado', 'cancelada');
    
    console.log("existingAppts count:", existingAppts?.length);

    if (existingAppts) {
        for (const appt of existingAppts) {
            const apptMs = new Date(appt.fecha).getTime();
            const diff = Math.abs(requestedMs - apptMs);
            console.log(`Checking DB Appt ${appt.fecha} (Ms: ${apptMs}) against Requested ${requestedMs}. Diff=${diff}ms`);
            if (diff < 45 * 60 * 1000) {
                console.log("CONFLICT TRIGGERED!");
                return;
            }
        }
    }
    console.log("No conflict. All good.");
}

createAppointmentCheck({
    fecha: "2026-04-11T11:00:00"
}, "391c2b88-975a-4f2e-84ab-1cdc088cf0a6");
