import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables')
    if (error) {
        // Fallback: query pg_catalog
        const { data: data2, error: error2 } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public')
        if (error2) {
            // Second fallback: just try to select 1 from hypothesized tables
            const common = ['patients', 'pacientes', 'appointments', 'citas', 'services', 'servicios', 'medical_notes', 'notas_medicas', 'payments', 'pagos']
            for (const t of common) {
                const { error: e } = await supabase.from(t).select('count')
                console.log(`Table ${t}: ${e ? '❌ ' + e.message : '✅'}`)
            }
        } else {
            console.log('Tables:', data2.map(t => t.tablename))
        }
    } else {
        console.log('Tables:', data)
    }
}

listTables()
