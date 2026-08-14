'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    Settings,
    User,
    Bell,
    Globe,
    Database,
    CreditCard,
    ChevronRight,
    ShieldCheck,
    Calendar,
    Loader2,
    CheckCircle2,
    XCircle,
    ExternalLink
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function SettingsPage() {
    // Estado para Google Calendar
    const [googleCalendarUrl, setGoogleCalendarUrl] = useState('')
    const [isTestingUrl, setIsTestingUrl] = useState(false)
    const [isSavingUrl, setIsSavingUrl] = useState(false)
    const [urlStatus, setUrlStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
    const [showGoogleCalendarSection, setShowGoogleCalendarSection] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    // Cargar URL guardada al montar
    useEffect(() => {
        const loadSavedUrl = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('google_calendar_ical_url')
                .eq('id', user.id)
                .single()

            if (profile?.google_calendar_ical_url) {
                setGoogleCalendarUrl(profile.google_calendar_ical_url)
                setUrlStatus('valid')
            }
        }
        loadSavedUrl()
    }, [supabase])

    // Probar URL de Google Calendar
    const testGoogleCalendarUrl = async () => {
        if (!googleCalendarUrl.trim()) {
            toast.error('Ingresa una URL')
            return
        }

        // Validar formato básico
        if (!googleCalendarUrl.includes('calendar.google.com') || !googleCalendarUrl.includes('.ics')) {
            toast.error('URL inválida', { description: 'Debe ser una URL de Google Calendar terminada en .ics' })
            setUrlStatus('invalid')
            return
        }

        setIsTestingUrl(true)
        setUrlStatus('idle')

        try {
            // Intentar fetch para verificar que responde
            const response = await fetch('/api/calendar/google-ical')
            const data = await response.json()

            if (data.success) {
                setUrlStatus('valid')
                toast.success('Conexión exitosa', {
                    description: `Se encontraron ${data.count || 0} eventos en tu calendario`
                })
            } else {
                setUrlStatus('invalid')
                toast.error('No se pudo conectar', { description: 'Verifica que la URL sea correcta' })
            }
        } catch {
            setUrlStatus('invalid')
            toast.error('Error de conexión')
        } finally {
            setIsTestingUrl(false)
        }
    }

    // Guardar URL en Supabase
    const saveGoogleCalendarUrl = async () => {
        setIsSavingUrl(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                toast.error('No autenticado')
                return
            }

            const { error } = await supabase
                .from('user_profiles')
                .update({ google_calendar_ical_url: googleCalendarUrl.trim() || null })
                .eq('id', user.id)

            if (error) throw error

            toast.success('Configuración guardada')
            setUrlStatus('valid')
        } catch (err) {
            toast.error('Error al guardar')
        } finally {
            setIsSavingUrl(false)
        }
    }

    const sections = [
        { title: 'Perfil Profesional', desc: 'Gestiona tu información de contacto y especialidad.', icon: User },
        { title: 'Notificaciones', desc: 'Configura alertas de citas y mensajes de pacientes.', icon: Bell },
        { title: 'Clínica & Sucursales', desc: 'Administra los datos fiscales y sedes de tu consulta.', icon: Globe },
        { title: 'Seguridad & Datos', desc: 'Cambiar contraseña y copias de seguridad de Supabase.', icon: Database },
        { title: 'Suscripción MdPulso', desc: 'Ver plan actual y métodos de pago.', icon: CreditCard },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 font-display">Configuración</h1>
                <p className="text-slate-500 text-sm italic">Personaliza tu experiencia en MdPulso Pro+</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {sections.map((section, i) => (
                        <motion.div
                            key={section.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => toast.info(section.title, { description: `Accediendo a la configuración de ${section.title.toLowerCase()}...` })}
                            className="group flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer transition-all active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                                    <section.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{section.title}</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">{section.desc}</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </motion.div>
                    ))}

                    {/* Módulo Google Calendar - Integración iCal */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-6 bg-white rounded-3xl border border-blue-100 shadow-sm"
                    >
                        <div
                            onClick={() => setShowGoogleCalendarSection(!showGoogleCalendarSection)}
                            className="flex items-center justify-between cursor-pointer group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">Google Calendar</h3>
                                        {urlStatus === 'valid' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="h-3 w-3" /> Conectado
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-0.5">Sincroniza citas de recepción automáticamente</p>
                                </div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-slate-300 transition-transform ${showGoogleCalendarSection ? 'rotate-90' : ''}`} />
                        </div>

                        {showGoogleCalendarSection && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-6 pt-6 border-t border-slate-100 space-y-4"
                            >
                                {/* Instrucciones */}
                                <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-800">
                                    <p className="font-bold mb-2">Cómo obtener la URL secreta:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        <li>Abre Google Calendar → Configuración ⚙️</li>
                                        <li>Selecciona tu calendario → "Integrar calendario"</li>
                                        <li>Copia la "Dirección secreta en formato iCal"</li>
                                    </ol>
                                    <a
                                        href="https://calendar.google.com/calendar/u/0/r/settings"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-3 text-blue-600 font-bold hover:underline"
                                    >
                                        Abrir Google Calendar <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>

                                {/* Input URL */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        URL Secreta iCal
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="url"
                                                value={googleCalendarUrl}
                                                onChange={(e) => {
                                                    setGoogleCalendarUrl(e.target.value)
                                                    setUrlStatus('idle')
                                                }}
                                                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                                className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                                                    urlStatus === 'valid'
                                                        ? 'border-emerald-300 focus:ring-emerald-500/30 bg-emerald-50/50'
                                                        : urlStatus === 'invalid'
                                                        ? 'border-red-300 focus:ring-red-500/30 bg-red-50/50'
                                                        : 'border-slate-200 focus:ring-blue-500/30'
                                                }`}
                                            />
                                            {urlStatus === 'valid' && (
                                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                            )}
                                            {urlStatus === 'invalid' && (
                                                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={testGoogleCalendarUrl}
                                        disabled={isTestingUrl || !googleCalendarUrl.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isTestingUrl ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Probar Conexión'
                                        )}
                                    </button>
                                    <button
                                        onClick={saveGoogleCalendarUrl}
                                        disabled={isSavingUrl}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
                                    >
                                        {isSavingUrl ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Guardar'
                                        )}
                                    </button>
                                </div>

                                <p className="text-[10px] text-slate-400 text-center">
                                    Solo lectura. Las citas de Google aparecerán en tu agenda sin afectar tus citas nativas.
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Protección de Datos Activa</span>
                        </div>
                        <h3 className="text-xl font-bold mb-4 font-display">Tus datos están protegidos</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Utilizamos infraestructura de seguridad de nivel empresarial. Todos los datos viajan cifrados y el acceso está controlado por roles de usuario.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Certificado SSL válido — conexión HTTPS cifrada</span>
                            </div>
                            <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Autenticación segura — sesiones con tokens firmados</span>
                            </div>
                            <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Control de acceso por roles — cada médico solo ve sus pacientes</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] bg-emerald-50 p-8 border border-emerald-100 text-center">
                        <p className="text-sm text-emerald-800 font-bold mb-4">¿Necesitas ayuda técnica?</p>
                        <button
                            onClick={() => window.location.href = 'mailto:despacho9@gmail.com?subject=Soporte%20MdPulso'}
                            className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            Contactar Soporte 24/7
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
