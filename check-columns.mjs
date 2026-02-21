import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkColumns() {
    const { data, error } = await supabase.from('patients').select('*').limit(1)
    if (data && data.length > 0) {
        console.log('Patients columns:', Object.keys(data[0]))
    } else {
        console.log('Patients table empty or error:', error?.message)
    }

    const { data: data2 } = await supabase.from('appointments').select('*').limit(1)
    if (data2 && data2.length > 0) {
        console.log('Appointments columns:', Object.keys(data2[0]))
    }
}

checkColumns()
