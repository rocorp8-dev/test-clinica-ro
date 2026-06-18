import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/growth?patient_id=xxx - Obtener mediciones de un paciente
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options}) => cookieStore.set(name, value, options))
        }
      }
    )
    const { searchParams } = new URL(request.url)
    const patient_id = searchParams.get('patient_id')

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id requerido' }, { status: 400 })
    }

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener mediciones ordenadas por fecha (más reciente primero)
    const { data: measurements, error } = await supabase
      .from('growth_measurements')
      .select('*')
      .eq('patient_id', patient_id)
      .eq('doctor_id', user.id)
      .order('fecha_medicion', { ascending: false })

    if (error) throw error

    return NextResponse.json({ measurements })
  } catch (error: any) {
    console.error('Error fetching growth measurements:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/growth - Crear nueva medición
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options}) => cookieStore.set(name, value, options))
        }
      }
    )
    const body = await request.json()

    const {
      patient_id,
      peso_kg,
      talla_cm,
      perimetro_cefalico_cm,
      notas,
      fecha_medicion
    } = body

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id requerido' }, { status: 400 })
    }

    // Validar que al menos una medición esté presente
    if (!peso_kg && !talla_cm && !perimetro_cefalico_cm) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una medición (peso, talla o perímetro cefálico)' },
        { status: 400 }
      )
    }

    // Validar rangos
    if (peso_kg && (peso_kg < 0.5 || peso_kg > 100)) {
      return NextResponse.json({ error: 'Peso debe estar entre 0.5 y 100 kg' }, { status: 400 })
    }
    if (talla_cm && (talla_cm < 30 || talla_cm > 200)) {
      return NextResponse.json({ error: 'Talla debe estar entre 30 y 200 cm' }, { status: 400 })
    }
    if (perimetro_cefalico_cm && (perimetro_cefalico_cm < 20 || perimetro_cefalico_cm > 60)) {
      return NextResponse.json({ error: 'Perímetro cefálico debe estar entre 20 y 60 cm' }, { status: 400 })
    }

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el paciente tenga fecha de nacimiento
    const { data: patient } = await supabase
      .from('patients')
      .select('fecha_nacimiento, sexo')
      .eq('id', patient_id)
      .eq('user_id', user.id)
      .single()

    if (!patient?.fecha_nacimiento) {
      return NextResponse.json(
        { error: 'El paciente debe tener fecha de nacimiento registrada' },
        { status: 400 }
      )
    }

    // Crear medición (edad_meses se calcula automáticamente con el trigger)
    const { data: measurement, error } = await supabase
      .from('growth_measurements')
      .insert({
        patient_id,
        doctor_id: user.id,
        fecha_medicion: fecha_medicion || new Date().toISOString(),
        peso_kg: peso_kg || null,
        talla_cm: talla_cm || null,
        perimetro_cefalico_cm: perimetro_cefalico_cm || null,
        notas: notas || null,
        edad_meses: 0 // Se sobrescribirá por el trigger
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ measurement }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating growth measurement:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/growth - Eliminar medición
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options}) => cookieStore.set(name, value, options))
        }
      }
    )
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Eliminar medición (RLS asegura que solo se elimine si es del doctor)
    const { error } = await supabase
      .from('growth_measurements')
      .delete()
      .eq('id', id)
      .eq('doctor_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting growth measurement:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
