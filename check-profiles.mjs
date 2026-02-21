import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkProfiles() {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const dr = users.find(u => u.email === 'doctor@mdpulso.com')
    if (dr) {
        console.log('Doctor User ID:', dr.id)
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', dr.id)
        console.log('Profile record:', prof)
    }
}

checkProfiles()
