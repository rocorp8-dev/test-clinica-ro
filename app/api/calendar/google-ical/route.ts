import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Tipos para eventos de Google Calendar
interface GoogleCalendarEvent {
  id: string
  summary: string
  description: string | null
  start: string
  end: string
  isAllDay: boolean
  matchedPatient: {
    id: string
    nombre: string
    telefono: string | null
  } | null
}

interface ParsedIcalEvent {
  uid: string
  summary: string
  description: string
  dtstart: string
  dtend: string
  isAllDay: boolean
}

// Parser iCal simple (sin dependencias externas)
function parseIcsText(icsText: string): ParsedIcalEvent[] {
  const events: ParsedIcalEvent[] = []
  const lines = icsText.replace(/\r\n /g, '').split(/\r?\n/)

  let currentEvent: Partial<ParsedIcalEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { isAllDay: false }
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart) {
        events.push(currentEvent as ParsedIcalEvent)
      }
      currentEvent = null
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const keyPart = line.substring(0, colonIndex)
      const value = line.substring(colonIndex + 1)

      // Extraer el nombre del campo (sin parámetros como TZID)
      const key = keyPart.split(';')[0]

      switch (key) {
        case 'UID':
          currentEvent.uid = value
          break
        case 'SUMMARY':
          currentEvent.summary = value.replace(/\\,/g, ',').replace(/\\n/g, '\n')
          break
        case 'DESCRIPTION':
          currentEvent.description = value.replace(/\\,/g, ',').replace(/\\n/g, '\n')
          break
        case 'DTSTART':
          currentEvent.dtstart = parseIcalDate(value, keyPart)
          // Si es fecha sin hora (8 dígitos), es todo el día
          if (value.length === 8) {
            currentEvent.isAllDay = true
          }
          break
        case 'DTEND':
          currentEvent.dtend = parseIcalDate(value, keyPart)
          break
      }
    }
  }

  return events
}

// Convertir fecha iCal a ISO string
function parseIcalDate(value: string, keyPart: string): string {
  // Formato: 20260815T140000Z o 20260815T140000 o 20260815
  try {
    // Limpiar el valor
    const cleanValue = value.trim()

    // Solo fecha (all-day event): 20260815
    if (cleanValue.length === 8) {
      const year = cleanValue.substring(0, 4)
      const month = cleanValue.substring(4, 6)
      const day = cleanValue.substring(6, 8)
      return `${year}-${month}-${day}T00:00:00.000Z`
    }

    // Fecha con hora: 20260815T140000 o 20260815T140000Z
    if (cleanValue.length >= 15) {
      const year = cleanValue.substring(0, 4)
      const month = cleanValue.substring(4, 6)
      const day = cleanValue.substring(6, 8)
      const hour = cleanValue.substring(9, 11)
      const minute = cleanValue.substring(11, 13)
      const second = cleanValue.substring(13, 15)

      const isUTC = cleanValue.endsWith('Z')

      if (isUTC) {
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
      }

      // Si tiene TZID, necesitamos convertir
      // Por simplicidad, asumimos CDMX (-06:00)
      if (keyPart.includes('TZID')) {
        // Crear fecha local y convertir a UTC
        const localDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
        return localDate.toISOString()
      }

      return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
    }

    return new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// FAIL-SAFE: Esta función NUNCA lanza excepciones
async function fetchAndParseIcal(url: string): Promise<ParsedIcalEvent[]> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MDPulso/1.0' },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.warn('[Google iCal] HTTP Error:', response.status)
      return []
    }

    const icsText = await response.text()
    return parseIcsText(icsText)
  } catch (error) {
    console.warn('[Google iCal] Fetch/Parse error:', error)
    return []
  }
}

// Buscar paciente por nombre o teléfono en el título del evento
async function findMatchingPatient(
  supabase: any,
  doctorId: string,
  eventTitle: string
): Promise<{ id: string; nombre: string; telefono: string | null } | null> {
  try {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, nombre, telefono')
      .eq('user_id', doctorId)
      .limit(100)

    if (!patients || patients.length === 0) return null

    const titleLower = eventTitle.toLowerCase()

    // Buscar por nombre (coincidencia parcial)
    const byName = patients.find((p: any) =>
      titleLower.includes(p.nombre.toLowerCase()) ||
      p.nombre.toLowerCase().includes(titleLower.split(' ')[0])
    )
    if (byName) return byName

    // Buscar por teléfono en el título
    const byPhone = patients.find((p: any) =>
      p.telefono && titleLower.includes(p.telefono.replace(/\D/g, ''))
    )
    if (byPhone) return byPhone

    return null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: true, events: [], message: 'No autenticado' },
        { status: 200 }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('google_calendar_ical_url')
      .eq('id', user.id)
      .single()

    const icalUrl = profile?.google_calendar_ical_url

    // FAIL-SAFE: Si no hay URL configurada, retornar vacío
    if (!icalUrl || icalUrl.trim() === '') {
      return NextResponse.json({
        success: true,
        events: [],
        message: 'URL de Google Calendar no configurada'
      })
    }

    const rawEvents = await fetchAndParseIcal(icalUrl)

    // Filtrar: últimos 30 días y próximos 60 días
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAhead = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    const events: GoogleCalendarEvent[] = []

    for (const event of rawEvents) {
      try {
        const startDate = new Date(event.dtstart)

        if (startDate < thirtyDaysAgo || startDate > sixtyDaysAhead) {
          continue
        }

        const endDate = event.dtend ? new Date(event.dtend) : startDate

        const matchedPatient = await findMatchingPatient(
          supabase,
          user.id,
          event.summary || ''
        )

        events.push({
          id: event.uid || `gcal-${Date.now()}-${Math.random()}`,
          summary: event.summary || 'Sin título',
          description: event.description || null,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          isAllDay: event.isAllDay,
          matchedPatient
        })
      } catch {
        continue
      }
    }

    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return NextResponse.json({
      success: true,
      events,
      count: events.length
    })

  } catch (error) {
    console.error('[Google iCal] Unexpected error:', error)
    return NextResponse.json({
      success: true,
      events: [],
      message: 'Error interno, agenda nativa funcionando normalmente'
    })
  }
}
