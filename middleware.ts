import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Cache de suscripción en cookie firmada (HMAC-SHA256) ────────────────────
// Evita consultar profiles en cada request: solo se consulta cuando la cookie
// no existe o expiró su TTL.
const CACHE_COOKIE = 'mdpulso_sub_cache'
const CACHE_TTL_MS = 60 * 1000 // 1 minuto

type SubCache = {
    uid: string
    sub: string | null   // subscription_status
    trial: boolean       // is_trial
    ends: string | null  // trial_ends_at
    exp: number          // expiración del cache (epoch ms)
}

function getCacheSecret(): string {
    return process.env.TRIAL_CACHE_SECRET ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''
}

function b64urlEncode(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): string {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacSign(data: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function encodeCache(cache: SubCache, secret: string): Promise<string> {
    const payload = b64urlEncode(JSON.stringify(cache))
    return `${payload}.${await hmacSign(payload, secret)}`
}

async function decodeCache(value: string, secret: string): Promise<SubCache | null> {
    const [payload, sig] = value.split('.')
    if (!payload || !sig) return null
    const expected = await hmacSign(payload, secret)
    if (expected.length !== sig.length) return null
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
    if (diff !== 0) return null
    try {
        return JSON.parse(b64urlDecode(payload)) as SubCache
    } catch {
        return null
    }
}

// Bloquea solo cuando: trial expirado sin pago, o suscripción marcada expirada.
// Falla ABIERTA: si falta información, se permite el acceso (nunca bloquear por error).
function isAccessBlocked(sub: string | null, isTrial: boolean, endsAt: string | null): boolean {
    if (sub === 'active') return false
    if (sub === 'expired') return true
    if (!isTrial) return false
    if (endsAt && new Date(endsAt).getTime() < Date.now()) return true
    return false
}

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Rutas que no requieren login (incluye /api/ completo y /trial-expired)
    const isPublic = pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/presentacion') ||
        pathname.startsWith('/precios') ||
        pathname.startsWith('/trial-expired') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/admin')

    // Rutas de auth que redirigen al dashboard si ya estás logueado
    const isAuthPage = pathname.startsWith('/login') ||
        pathname.startsWith('/register')

    if (!user && !isPublic) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // ─── Bloqueo por trial expirado / suscripción ────────────────────────────
    // Excepción: regreso desde Stripe Checkout (?session_id=...) para que un
    // usuario que acaba de pagar no sea redirigido antes de procesar el webhook.
    if (user && !isPublic) {
        const isPostCheckout = request.nextUrl.searchParams.has('session_id')

        if (!isPostCheckout) {
            const secret = getCacheSecret()
            let cached: SubCache | null = null

            if (secret) {
                const raw = request.cookies.get(CACHE_COOKIE)?.value
                if (raw) cached = await decodeCache(raw, secret)
            }

            // Cache fresco y del mismo usuario → decidir sin consultar la DB
            if (cached && cached.uid === user.id && cached.exp > Date.now()) {
                if (isAccessBlocked(cached.sub, cached.trial, cached.ends)) {
                    return NextResponse.redirect(new URL('/trial-expired', request.url))
                }
                return response
            }

            // Consulta EFICIENTE: solo 3 columnas, una vez por TTL
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_trial, trial_ends_at, subscription_status')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profile) {
                    const nextCache: SubCache = {
                        uid: user.id,
                        sub: (profile.subscription_status as string) ?? null,
                        trial: Boolean(profile.is_trial),
                        ends: (profile.trial_ends_at as string) ?? null,
                        exp: Date.now() + CACHE_TTL_MS,
                    }

                    if (secret) {
                        response.cookies.set(CACHE_COOKIE, await encodeCache(nextCache, secret), {
                            httpOnly: true,
                            sameSite: 'lax',
                            secure: true,
                            path: '/',
                            maxAge: Math.floor(CACHE_TTL_MS / 1000),
                        })
                    }

                    if (isAccessBlocked(nextCache.sub, nextCache.trial, nextCache.ends)) {
                        return NextResponse.redirect(new URL('/trial-expired', request.url))
                    }
                }
            } catch {
                // Fail-open: si la DB no responde, NUNCA bloquear al usuario
            }
        }
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
