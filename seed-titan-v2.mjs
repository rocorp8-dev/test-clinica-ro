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

async function runSeed() {
    console.log('🚀 Iniciando Semilla TITAN v2.2...')

    try {
        // 1. Usuario Demo
        const email = 'doctor@mdpulso.com'
        const password = 'Demo1234!'

        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        let user = users.find(u => u.email === email)

        if (!user) {
            console.log('Creando usuario demo...')
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            })
            if (createError) throw createError
            user = newUser.user
        } else {
            console.log('Usuario demo ya existe.')
        }

        const userId = user.id

        // 2. Perfil
        await supabase.from('profiles').upsert({
            id: userId,
            full_name: 'Dr. Carlos Martinez',
            email: email
        }, { onConflict: 'id' })
        console.log('✅ Perfil actualizado/creado: Dr. Carlos Martinez')

        // Limpiar datos previos
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('medical_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        // 3. Servicios
        const services = [
            { nombre: 'Consulta General', precio: 50.00, duracion: 30 },
            { nombre: 'Revision Pediatrica', precio: 65.00, duracion: 45 },
            { nombre: 'Urgencia', precio: 95.00, duracion: 20 },
            { nombre: 'Limpieza Dental', precio: 40.00, duracion: 60 },
            { nombre: 'Control Prenatal', precio: 75.00, duracion: 40 }
        ]
        const { data: insertedServices, error: sErr } = await supabase.from('services').insert(services.map(s => ({ ...s, user_id: userId }))).select()
        if (sErr) throw sErr
        console.log('✅ 5 Servicios insertados')

        // 4. Pacientes
        const patients = [
            { nombre: 'Maria Garcia Lopez', genero: 'F', nacimiento: '1985-03-15', alergias: 'Penicilina' },
            { nombre: 'Juan Carlos Hernandez', genero: 'M', nacimiento: '1978-11-22', alergias: 'Ninguna' },
            { nombre: 'Ana Sofia Rodriguez', genero: 'F', nacimiento: '1992-07-08', alergias: 'Sulfonamidas' },
            { nombre: 'Pedro Martinez Ruiz', genero: 'M', nacimiento: '1965-01-30', alergias: 'Aspirina, Diabetes' },
            { nombre: 'Isabella Torres Mora', genero: 'F', nacimiento: '2018-05-12', alergias: 'Lactosa' },
            { nombre: 'Roberto Sanchez Diaz', genero: 'M', nacimiento: '1990-09-18', alergias: 'Ninguna' },
            { nombre: 'Carmen Flores Gutierrez', genero: 'F', nacimiento: '1988-12-03', alergias: 'Ninguna (embarazo 7 meses)' },
            { nombre: 'Diego Ramirez Castro', genero: 'M', nacimiento: '2015-08-25', alergias: 'Mariscos' },
            { nombre: 'Lucia Mendoza Vargas', genero: 'F', nacimiento: '1972-04-14', alergias: 'Ninguna (Hipertension controlada)' },
            { nombre: 'Fernando Castillo Rojo', genero: 'M', nacimiento: '1983-06-29', alergias: 'Ninguna' }
        ]
        // Note: DNI is UNIQUE in schema, I'll generate some
        const { data: insertedPatients, error: pErr } = await supabase.from('patients').insert(patients.map((p, i) => ({ ...p, user_id: userId, dni: `P-${2000000 + i}` }))).select()
        if (pErr) throw pErr
        console.log('✅ 10 Pacientes insertados')

        // Helper for dates
        const getShiftedDate = (days, hours, minutes = 0) => {
            const d = new Date()
            d.setDate(d.getDate() + days)
            d.setHours(hours, minutes, 0, 0)
            return d.toISOString()
        }

        // 5. Citas (15)
        const appointmentsData = [
            // Past (5)
            { patient_idx: 0, service_idx: 0, days: -5, h: 9, m: 0, estado: 'completada' },
            { patient_idx: 7, service_idx: 1, days: -4, h: 10, m: 30, estado: 'completada' },
            { patient_idx: 8, service_idx: 0, days: -3, h: 11, m: 0, estado: 'completada' },
            { patient_idx: 3, service_idx: 2, days: -2, h: 9, m: 30, estado: 'completada' },
            { patient_idx: 6, service_idx: 4, days: -1, h: 14, m: 0, estado: 'completada' },
            // Today (5)
            { patient_idx: 5, service_idx: 0, days: 0, h: 9, m: 0, estado: 'completada' },
            { patient_idx: 2, service_idx: 0, days: 0, h: 10, m: 30, estado: 'confirmada' },
            { patient_idx: 4, service_idx: 1, days: 0, h: 11, m: 30, estado: 'pendiente' },
            { patient_idx: 9, service_idx: 3, days: 0, h: 14, m: 0, estado: 'confirmada' },
            { patient_idx: 1, service_idx: 0, days: 0, h: 16, m: 0, estado: 'pendiente' },
            // Future (5)
            { patient_idx: 0, service_idx: 4, days: 1, h: 10, m: 0, estado: 'pendiente' },
            { patient_idx: 8, service_idx: 0, days: 2, h: 11, m: 0, estado: 'confirmada' },
            { patient_idx: 3, service_idx: 2, days: 3, h: 9, m: 30, estado: 'pendiente' },
            { patient_idx: 7, service_idx: 1, days: 4, h: 14, m: 0, estado: 'pendiente' },
            { patient_idx: 5, service_idx: 3, days: 5, h: 16, m: 0, estado: 'confirmada' }
        ]

        const { data: insertedApps } = await supabase.from('appointments').insert(appointmentsData.map(a => ({
            patient_id: insertedPatients[a.patient_idx].id,
            doctor_id: userId,
            fecha: getShiftedDate(a.days, a.h, a.m),
            motivo: insertedServices[a.service_idx].nombre,
            estado: a.estado
        }))).select()
        console.log('✅ 15 Citas insertadas')

        // 6. Notas Médicas (6 completadas)
        const notesData = [
            { app_idx: 0, diag: 'Infeccion respiratoria alta', rec: 'Amoxicilina 500mg c/8h x 7 dias, Paracetamol 500mg PRN' },
            { app_idx: 1, diag: 'Control pediatrico rutinario. Desarrollo normal', rec: 'Vitaminas pediatricas, Siguiente control en 3 meses' },
            { app_idx: 2, diag: 'Hipertension controlada. PA 130/85', rec: 'Continuar Losartan 50mg/dia, Dieta baja en sodio' },
            { app_idx: 3, diag: 'Dolor abdominal agudo - Gastritis', rec: 'Omeprazol 20mg c/12h x 14 dias, Dieta blanda' },
            { app_idx: 4, diag: 'Control prenatal semana 28. Normal', rec: 'Acido folico, Hierro, Siguiente eco en 2 semanas' },
            { app_idx: 5, diag: 'Cefalea tensional recurrente', rec: 'Ibuprofeno 400mg PRN, Tecnicas de relajacion' }
        ]

        await supabase.from('medical_notes').insert(notesData.map(n => ({
            appointment_id: insertedApps[n.app_idx].id,
            patient_id: insertedApps[n.app_idx].patient_id,
            doctor_id: userId,
            diagnostico: n.diag,
            receta: n.rec
        })))
        console.log('✅ 6 Notas Médicas insertadas')

        // 7. Pagos (6 completadas)
        const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia']
        await supabase.from('payments').insert(notesData.map((n, i) => ({
            appointment_id: insertedApps[n.app_idx].id,
            patient_id: insertedApps[n.app_idx].patient_id,
            doctor_id: userId,
            amount: services.find(s => s.nombre === insertedApps[n.app_idx].motivo).precio,
            method: paymentMethods[i % 3],
            status: 'paid',
            created_at: insertedApps[n.app_idx].fecha
        })))
        console.log('✅ 6 Pagos insertados')

        console.log('🧬 Semilla completada con éxito.')

    } catch (err) {
        console.error('❌ Error en semilla:', err.message)
    }
}

runSeed()
