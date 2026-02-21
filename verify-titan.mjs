import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verify() {
    console.log('📊 Verificación TITAN...')

    const { count: p } = await supabase.from('patients').select('*', { count: 'exact', head: true })
    const { count: s } = await supabase.from('services').select('*', { count: 'exact', head: true })
    const { count: a } = await supabase.from('appointments').select('*', { count: 'exact', head: true })
    const { count: n } = await supabase.from('medical_notes').select('*', { count: 'exact', head: true })
    const { count: pay } = await supabase.from('payments').select('*', { count: 'exact', head: true })

    console.log(`Patients: ${p} (Exp: 10)`)
    console.log(`Services: ${s} (Exp: 5)`)
    console.log(`Appointments: ${a} (Exp: 15)`)
    console.log(`Notes: ${n} (Exp: 6)`)
    console.log(`Payments: ${pay} (Exp: 6)`)

    const { data: rev } = await supabase.from('payments').select('amount')
    const totalRev = rev.reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
    console.log(`Total Revenue: $${totalRev}`)

    const { data: prof } = await supabase.from('profiles').select('full_name').eq('email', 'doctor@mdpulso.com').single()
    console.log(`Profile Name: ${prof?.full_name} (Exp: Dr. Carlos Martinez)`)
}

verify()
