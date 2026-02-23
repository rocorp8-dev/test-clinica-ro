const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
    const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const doctorId = '5f3f228e-851a-4604-9774-192e2798c13d';

    console.log("Cleaning up old appointments and setting realistic ones for this week...");

    // 1. Delete very old appointments (pre-2026) for this doctor
    const { error: delError } = await supabase
        .from('appointments')
        .delete()
        .eq('doctor_id', doctorId)
        .lt('fecha', '2026-01-01');

    if (delError) console.error("Error deleting old apps:", delError);

    // 2. Fetch current appointments for today and future
    const { data: apps } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .limit(10);

    const now = new Date('2026-02-23T05:31:04-08:00');

    const realisticTimes = [
        { hour: 9, min: 0, label: 'Consulta de Seguimiento' },
        { hour: 10, min: 30, label: 'Revisión General' },
        { hour: 12, min: 0, label: 'Control de Rutina' },
        { hour: 15, min: 30, label: 'Consulta Especializada' },
        { hour: 17, min: 0, label: 'Urgencia' }
    ];

    if (apps) {
        for (let i = 0; i < apps.length; i++) {
            const time = realisticTimes[i % realisticTimes.length];
            const appDate = new Date(now);
            appDate.setDate(now.getDate() + Math.floor(i / realisticTimes.length));
            appDate.setHours(time.hour, time.min, 0, 0);

            await supabase.from('appointments').update({
                fecha: appDate.toISOString(),
                motivo: time.label,
                estado: i === 0 ? 'pendiente' : (i < 3 ? 'confirmada' : 'completada')
            }).eq('id', apps[i].id);

            console.log(`Set app ${apps[i].id} to ${appDate.toLocaleString()} (${time.label})`);
        }
    }
}
main();
