const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    // Get the first profile to use as a "current user" proxy for testing
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').limit(1);
    const userId = profiles[0].id;
    console.log("Checking appointments for doctor:", profiles[0].full_name, "(", userId, ")");
    
    const { data: apps } = await supabase
        .from('appointments')
        .select('id, fecha, estado, doctor_id')
        .eq('doctor_id', userId)
        .gte('fecha', '2026-02-23')
        .order('fecha', {ascending: true});
        
    console.log(JSON.stringify(apps, null, 2));
}
check();
