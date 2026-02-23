const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching appointments to update...");
    const { data: apps, error } = await supabase.from('appointments').select('id').limit(10);

    if (error) {
        console.error("Error fetching appointments:", error);
        return;
    }

    if (!apps || apps.length === 0) {
        console.log("No appointments found to update.");
        return;
    }

    // Reference time: Feb 23, 2026, 05:31:04-08:00 (from metadata)
    // We'll set them for later today and tomorrow.
    const now = new Date('2026-02-23T05:31:04-08:00');

    const newDates = [
        new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
        new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
        new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), // +6 hours
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0).toISOString(), // Tomorrow 9 AM
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 30, 0).toISOString(), // Tomorrow 11:30 AM
    ];

    for (let i = 0; i < Math.min(apps.length, newDates.length); i++) {
        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                fecha: newDates[i],
                estado: i % 2 === 0 ? 'pendiente' : 'confirmada'
            })
            .eq('id', apps[i].id);

        if (updateError) {
            console.error(`Error updating appointment ${apps[i].id}:`, updateError);
        } else {
            console.log(`Updated appointment ${apps[i].id} to ${newDates[i]}`);
        }
    }
}

main();
