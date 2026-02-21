import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkTables() {
    const tables = ['patients', 'appointments', 'services', 'medical_notes', 'payments', 'profiles']
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) {
            console.log(`❌ Table ${table} error: ${error.message}`)
        } else {
            console.log(`✅ Table ${table} exists.`)
        }
    }
}

checkTables()
