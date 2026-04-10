/**
 * Debug script: muestra las citas de hoy en DB y el rango UTC que Nia usa.
 * Ejecutar: node scripts/debug-nia-agenda.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Replica exacta del helper cdmxDayRangeUTC de tools.ts
function cdmxDayRangeUTC(isoDateStr) {
    const nowCdmx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const year  = isoDateStr ? parseInt(isoDateStr.split('-')[0]) : nowCdmx.getFullYear();
    const month = isoDateStr ? parseInt(isoDateStr.split('-')[1]) - 1 : nowCdmx.getMonth();
    const day   = isoDateStr ? parseInt(isoDateStr.split('-')[2]) : nowCdmx.getDate();
    const startCdmx = new Date(year, month, day, 0, 0, 0, 0);
    const endCdmx   = new Date(year, month, day, 23, 59, 59, 999);
    const offsetMs  = new Date(startCdmx.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime() - startCdmx.getTime();
    const startUTC  = new Date(startCdmx.getTime() - offsetMs);
    const endUTC    = new Date(endCdmx.getTime()   - offsetMs);
    const localDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { start: startUTC.toISOString(), end: endUTC.toISOString(), localDate };
}

async function main() {
    console.log('\n====== NIA AGENDA DIAGNOSIS ======');
    console.log('Hora actual (server):', new Date().toISOString());
    console.log('Hora actual CDMX:    ', new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));

    const { start, end, localDate } = cdmxDayRangeUTC();
    console.log('\n── Rango UTC que Nia calcula ──');
    console.log('localDate:', localDate);
    console.log('start UTC:', start);
    console.log('end   UTC:', end);

    // 1. Traer TODAS las citas para ver qué hay (sin filtro de fecha)
    console.log('\n── Todas las citas en appointments (sin filtro) ──');
    const { data: all, error: allErr } = await supabase
        .from('appointments')
        .select('id, doctor_id, fecha, motivo, estado')
        .order('fecha', { ascending: true })
        .limit(20);

    if (allErr) {
        console.error('ERROR al traer todas:', allErr);
    } else {
        console.log(`Total citas encontradas: ${all.length}`);
        all.forEach(a => {
            const fechaUtc = new Date(a.fecha).toISOString();
            const fechaCdmx = new Date(a.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
            console.log(`  [${a.estado}] ${a.motivo?.slice(0,30)} | DB: ${a.fecha} | UTC: ${fechaUtc} | CDMX: ${fechaCdmx}`);
        });
    }

    // 2. Query exacta que usa Nia con el rango
    console.log('\n── Query de Nia con rango UTC (sin filtro doctor_id — verifica datos) ──');
    const { data: nia, error: niaErr } = await supabase
        .from('appointments')
        .select('id, fecha, motivo, estado, doctor_id')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true });

    if (niaErr) {
        console.error('ERROR en query Nia:', niaErr);
    } else {
        console.log(`Citas que Nia ve (sin filtro doctor): ${nia.length}`);
        nia.forEach(a => console.log(`  ${a.fecha} | ${a.motivo} | ${a.estado} | doctor: ${a.doctor_id}`));
    }

    // 3. Ver profiles para saber qué doctor_id corresponde a quién
    console.log('\n── Profiles (doctors) ──');
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .limit(5);
    if (profiles) profiles.forEach(p => console.log(`  ${p.id} | ${p.full_name} | ${p.email}`));

    console.log('\n==================================\n');
}

main().catch(console.error);
