const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
    const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const doctorId = '5f3f228e-851a-4604-9774-192e2798c13d';

    // Set 5 apps for later TODAY (Feb 23)
    const times = [
        '2026-02-23T14:00:00Z', // 06:00 AM Local
        '2026-02-23T16:00:00Z', // 08:00 AM Local 
        '2026-02-23T18:30:00Z', // 10:30 AM Local
        '2026-02-24T15:00:00Z', // Tomorrow
        '2026-02-24T17:00:00Z'  // Tomorrow
    ];

    const { data: apps } = await supabase.from('appointments').select('id').eq('doctor_id', doctorId).limit(5);

    if (apps) {
        for (let i = 0; i < apps.length; i++) {
            await supabase.from('appointments').update({
                fecha: times[i],
                estado: i < 2 ? 'pendiente' : 'confirmada'
            }).eq('id', apps[i].id);
            console.log(`Updated ${apps[i].id} to ${times[i]}`);
        }
    }
}
main();
