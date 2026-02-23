const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
        const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

        console.log("Connecting to:", SUPABASE_URL);
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
        if (pError) console.error("Profile error:", pError);
        console.log("Profiles count:", profiles ? profiles.length : 0);
        console.log("Profiles:", profiles);

        if (profiles && profiles.length > 0) {
            const firstId = profiles[0].id;
            const { data: apps, error: aError } = await supabase
                .from('appointments')
                .select('id, fecha, estado, doctor_id')
                .eq('doctor_id', firstId)
                .order('fecha', { ascending: true });

            if (aError) console.error("App error:", aError);
            console.log("Apps for first profile:", apps);
        }
    } catch (e) {
        console.error("Shell error:", e);
    }
}
main();
