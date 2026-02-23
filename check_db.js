const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// get from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching appointments...");
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            fecha,
            motivo,
            estado,
            doctor_id,
            patients (id, nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));
}

main();
