require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const dayString = "2026-04-11";
    const startOfDay = new Date(`${dayString}T00:00:00-06:00`).toISOString();
    const endOfDay = new Date(`${dayString}T23:59:59-06:00`).toISOString();
    const { data } = await supabase.from('appointments').select('*, patients(nombre)').gte('fecha', startOfDay).lte('fecha', endOfDay);
    console.log(JSON.stringify(data, null, 2));
}
run();
