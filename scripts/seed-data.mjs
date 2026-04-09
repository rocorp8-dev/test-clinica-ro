
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const patientsData = [
    { nombre: 'Sofía Rodríguez', dni: 'P-48596031A', telefono: '+34 612 345 678' },
    { nombre: 'Alejandro Martínez', dni: 'P-29384756B', telefono: '+34 623 456 789' },
    { nombre: 'Lucía Fernández', dni: 'P-10293847C', telefono: '+34 634 567 890' },
    { nombre: 'Mateo Sánchez', dni: 'P-56473829D', telefono: '+34 645 678 901' },
    { nombre: 'Valentina Gómez', dni: 'P-84736251E', telefono: '+34 656 789 012' },
    { nombre: 'Diego López', dni: 'P-37485920F', telefono: '+34 667 890 123' },
    { nombre: 'Isabella Ruiz', dni: 'P-91827364G', telefono: '+34 678 901 234' },
    { nombre: 'Javier Castro', dni: 'P-50617283H', telefono: '+34 689 012 345' },
    { nombre: 'Daniela Morales', dni: 'P-22334455J', telefono: '+34 690 123 456' },
    { nombre: 'Nicolás Herrera', dni: 'P-66778899K', telefono: '+34 601 234 567' }
]

async function seed() {
    console.log('--- Seeding MediSync Demo Data (Namespaced DNIs) ---')

    try {
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
        if (userError) throw userError

        const adminUser = users.find(u => u.email === 'doctor@mdpulso.com')
        if (!adminUser) {
            console.log('User doctor@mdpulso.com not found.')
            return
        }
        const userId = adminUser.id

        console.log('Cleaning user old data...')
        await supabase.from('appointments').delete().eq('doctor_id', userId)
        await supabase.from('patients').delete().eq('user_id', userId)

        console.log('Inserting patients...')
        const { data: insertedPatients, error: pError } = await supabase
            .from('patients')
            .insert(patientsData.map(p => ({ ...p, user_id: userId })))
            .select()

        if (pError) throw pError
        console.log(`✅ ${insertedPatients.length} patients created.`)

        const today = new Date()
        const appointments = [
            { motivo: 'Chequeo General', offset: 0, hora: '09:00' },
            { motivo: 'Consulta Pediatría', offset: 0, hora: '10:30' },
            { motivo: 'Revisión Resultados', offset: 1, hora: '11:00' },
            { motivo: 'Urgencia Menor', offset: 1, hora: '15:00' },
            { motivo: 'Seguimiento Mensual', offset: 2, hora: '08:30' }
        ]

        const appToInsert = appointments.map((a, i) => {
            const d = new Date(today)
            d.setDate(today.getDate() + a.offset)
            return {
                patient_id: insertedPatients[i % insertedPatients.length].id,
                doctor_id: userId,
                fecha: `${d.toISOString().split('T')[0]}T${a.hora}:00`,
                motivo: a.motivo,
                estado: 'pendiente'
            }
        })

        const { error: aError } = await supabase.from('appointments').insert(appToInsert)
        if (aError) throw aError
        console.log('✅ 5 appointments scheduled.')

    } catch (err) {
        console.error('Seed error:', err.message)
    }
}

seed()
