const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
    const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check doctor@mdpulso.com
    const doctorId = '5f3f228e-851a-4604-9774-192e2798c13d';
    const { data: apps } = await supabase
        .from('appointments')
        .select('id, fecha, estado, doctor_id')
        .eq('doctor_id', doctorId)
        .order('fecha', { ascending: true });

    console.log("Apps for doctor@mdpulso.com:", apps);
}
main();
