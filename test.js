require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    let dayString = "2026-04-11";
    const startOfDay = new Date(`${dayString}T00:00:00-06:00`).toISOString();
    const endOfDay = new Date(`${dayString}T23:59:59-06:00`).toISOString();
    const { data: existingAppts, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .gte('fecha', startOfDay)
        .lte('fecha', endOfDay)
        .neq('estado', 'cancelada');
    console.log("Error:", checkError);
    console.log("Data:", existingAppts);

    let dateStr = "2026-04-11 11:00am"; // What 8b might hallucinate
    if (/\d$/.test(dateStr)) {
        dateStr += '-06:00';
    }
    console.log(new Date(dateStr));
}
run();
