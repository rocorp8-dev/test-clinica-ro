import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { Bell, Search, User, Sparkles, Menu, Calendar, Clock, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
    id: string
    type: 'cita_hoy' | 'cita_pendiente' | 'sistema'
    title: string
    description: string
    time: string
    read: boolean
    link?: string
}

interface HeaderProps {
    onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [userName, setUserName] = useState<string>('Cargando...')
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showPanel, setShowPanel] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    const unread = notifications.filter(n => !n.read).length

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowPanel(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()
                setUserName(profile?.full_name || user.email?.split('@')[0] || 'Doctor')

                // Cargar notificaciones reales
                await loadNotifications(user.id)
            } else {
                setUserName('Doctor Invitado')
            }
        }
        getUserData()
    }, [])

    const loadNotifications = async (userId: string) => {
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

        // Citas de hoy
        const { data: citasHoy } = await supabase
            .from('appointments')
            .select('id, fecha, motivo, estado, patients(nombre)')
            .eq('doctor_id', userId)
            .gte('fecha', startOfDay)
            .lte('fecha', endOfDay)
            .order('fecha', { ascending: true })

        // Citas pendientes de confirmar
        const { data: citasPendientes } = await supabase
            .from('appointments')
            .select('id, fecha, motivo, patients(nombre)')
            .eq('doctor_id', userId)
            .eq('estado', 'pendiente')
            .gte('fecha', new Date().toISOString())
            .order('fecha', { ascending: true })
            .limit(5)

        const notifs: Notification[] = []

        // Extrae hora convirtiendo al timezone local del navegador (igual que la agenda)
        const extractTime = (fechaStr: string) => {
            if (!fechaStr) return '--:--'
            return new Date(fechaStr).toLocaleTimeString('es-MX', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        }

        const extractDate = (fechaStr: string) => fechaStr?.split('T')[0] || ''

        citasHoy?.forEach(c => {
            const hora = extractTime(c.fecha)
            const dateStr = extractDate(c.fecha)
            notifs.push({
                id: c.id,
                type: 'cita_hoy',
                title: `Consulta hoy a las ${hora}`,
                description: `${(c.patients as any)?.nombre} — ${c.motivo || 'Sin motivo'}`,
                time: hora,
                read: false,
                link: `/appointments?date=${dateStr}&highlight=${c.id}`
            })
        })

        citasPendientes?.filter(c => !citasHoy?.find(h => h.id === c.id)).forEach(c => {
            const horaLabel = extractTime(c.fecha)
            const dateStr = extractDate(c.fecha)
            notifs.push({
                id: c.id + '_pend',
                type: 'cita_pendiente',
                title: 'Cita sin confirmar',
                description: `${(c.patients as any)?.nombre} — ${horaLabel}`,
                time: horaLabel,
                read: false,
                link: `/appointments?date=${dateStr}&highlight=${c.id}`
            })
        })

        if (notifs.length === 0) {
            notifs.push({
                id: 'sistema_ok',
                type: 'sistema',
                title: 'Sin eventos pendientes',
                description: 'No tienes citas para hoy ni citas sin confirmar.',
                time: 'ahora',
                read: true,
            })
        }

        setNotifications(notifs)
    }

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    return (
        <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 md:px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 md:hidden"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="relative w-40 sm:w-64 lg:w-96 group hidden md:block">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                toast.info('Búsqueda global', { description: `Buscando "${(e.target as HTMLInputElement).value}" en toda la plataforma...` })
                            }
                        }}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                    />
                </div>

                <div className="flex md:hidden h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 flex-shrink-0">
                    <Image src="/logo-mdpulso.png" alt="MdPulso" width={40} height={40} className="h-full w-full object-cover" />
                </div>

                <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100/50">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">MdPulso Pro+</span>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="relative flex gap-1 md:gap-2" ref={panelRef}>
                    <button
                        data-testid="bell-btn"
                        onClick={() => setShowPanel(v => !v)}
                        className="relative rounded-2xl p-2 md:p-2.5 text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all active:scale-95 group"
                        title={unread > 0 ? `${unread} notificación${unread > 1 ? 'es' : ''} pendiente${unread > 1 ? 's' : ''}` : 'Sin notificaciones pendientes'}
                        aria-label={`Notificaciones (${unread} sin leer)`}
                    >
                        <Bell className="h-5 w-5" />
                        {unread > 0 && (
                            <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showPanel && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-14 w-80 rounded-3xl bg-white border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden z-50"
                            >
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-slate-600" />
                                        <p className="text-sm font-black text-slate-900">Notificaciones</p>
                                        {unread > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[9px] font-black text-white">{unread}</span>
                                        )}
                                    </div>
                                    {unread > 0 && (
                                        <button onClick={markAllRead} className="text-[10px] font-bold text-emerald-600 hover:underline">
                                            Marcar leídas
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                if (n.link) {
                                                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                                                    setShowPanel(false)
                                                    router.push(n.link)
                                                }
                                            }}
                                            className={`flex items-start gap-3 px-5 py-4 transition-colors ${n.link ? 'cursor-pointer hover:bg-slate-50' : ''} ${!n.read ? 'bg-emerald-50/40' : 'bg-white'}`}
                                        >
                                            <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                n.type === 'cita_hoy' ? 'bg-emerald-100 text-emerald-600' :
                                                n.type === 'cita_pendiente' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                {n.type === 'cita_hoy' ? <Clock className="h-4 w-4" /> :
                                                 n.type === 'cita_pendiente' ? <Calendar className="h-4 w-4" /> :
                                                 <CheckCircle className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.description}</p>
                                            </div>
                                            {!n.read && <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />}
                                        </div>
                                    ))}
                                </div>

                                <div className="px-5 py-3 border-t border-slate-50">
                                    <Link href="/appointments" onClick={() => setShowPanel(false)} className="block text-center text-xs font-bold text-emerald-600 hover:underline">
                                        Ver agenda completa
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-900 leading-none mb-1">{userName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Director Médico</p>
                    </div>
                    <Link
                        href="/settings"
                        className="h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-0.5 shadow-sm border border-slate-200 transition-transform active:scale-95 group"
                    >
                        <div className="flex h-full w-full items-center justify-center rounded-[0.85rem] bg-white text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <User className="h-5 w-5" />
                        </div>
                    </Link>
                </div>
            </div>
        </header>
    )
}
