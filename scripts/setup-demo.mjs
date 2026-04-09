
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

async function setupDemoUser() {
    console.log('--- Configurando Usuario Demo MdPulso ---');

    const email = 'doctor@mdpulso.com';
    const password = 'Demo1234!';

    // Check if user exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
        console.error('Error listing users:', listError)
        process.exit(1)
    }

    const users = usersData.users
    let user = users.find(u => u.email === email)

    if (!user) {
        console.log('Creating demo user...')
        const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })
        if (createError) {
            console.error('Error creating user:', createError)
            process.exit(1)
        }
        user = newUser
    } else {
        console.log('User already exists, updating password...')
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password
        })
        if (updateError) {
            console.error('Error updating user:', updateError)
            process.exit(1)
        }
    }

    console.log(`✅ Demo user ready: ${email}`)
}

setupDemoUser()
