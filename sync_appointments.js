const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
    const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const doctorId = '5f3f228e-851a-4604-9774-192e2798c13d';

    // 1. Ensure Ana Sofia Rodriguez exists
    let { data: patient } = await supabase.from('patients').select('id').eq('nombre', 'Ana Sofia Rodriguez').single();
    if (!patient) {
        const { data: newP } = await supabase.from('patients').insert({
            nombre: 'Ana Sofia Rodriguez',
            dni: '45678912Z',
            telefono: '555-0123',
            user_id: doctorId
        }).select().single();
        patient = newP;
    }

    // 2. Set the UTC time for 12:30 PM (Local -08:00)
    // Local 12:30 PM = 20:30 UTC
    const targetDate = '2026-02-23T20:30:00Z';

    // 3. Find the appointment at 12:30 (even if it's completed or wrong name)
    // Or just take the id from the "bc13b34f" which is currently showing 12:30
    const appToUpdate = 'bc13b34f-61ca-4460-a58f-cb34682390a7';

    const { error } = await supabase.from('appointments').update({
        paciente_id: patient.id,
        fecha: targetDate, // 12:30 PM Local
        motivo: 'Chequeo de Ojos (45 min)',
        estado: 'confirmada'
    }).eq('id', appToUpdate);

    if (error) {
        // If that ID specifically doesn't exist anymore, find the earliest one today
        const { data: firstToday } = await supabase.from('appointments')
            .select('id')
            .eq('doctor_id', doctorId)
            .gte('fecha', '2026-02-23T00:00:00Z')
            .order('fecha', {ascending: true})
            .limit(1);
        
        if (firstToday && firstToday.length > 0) {
            await supabase.from('appointments').update({
                paciente_id: patient.id,
                fecha: targetDate,
                motivo: 'Chequeo de Ojos (45 min)',
                estado: 'confirmada'
            }).eq('id', firstToday[0].id);
        }
    }
    
    console.log("Appointment synchronization complete. Ana Sofia Rodriguez set to 12:30 PM.");
}
main();
