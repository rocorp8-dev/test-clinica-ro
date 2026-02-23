'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    Plus,
    Calendar as CalendarIcon,
    Clock,
    User,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    CheckCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import AppointmentModal from '@/components/appointments/AppointmentModal'
import CheckoutModal from '@/components/billing/CheckoutModal'

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    // FUNCIÓN CLAVE: Normaliza cualquier fecha a formato "Solo Fecha" (YYYY-MM-DD)
    // para comparaciones seguras sin zonas horarias
    const getLocalDateString = (date: Date | string) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadAppointments = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('appointments')
                .select(`
                    id,
                    fecha,
                    motivo,
                    estado,
                    doctor_id,
                    patients (id, nombre, dni, telefono)
                `)
                .eq('doctor_id', user.id)
                .order('fecha', { ascending: true })

            setAppointments(data || [])
        } catch (err) {
            toast.error('Error al cargar agenda')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadAppointments()
    }, [loadAppointments])

    const confirmAppointment = async (id: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ estado: 'confirmada' })
                .eq('id', id)

            if (error) throw error
            toast.success('Cita confirmada')
            loadAppointments()
        } catch (err) {
            toast.error('Error al confirmar')
        }
    }

    const cancelAppointment = async (id: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ estado: 'cancelada' })
                .eq('id', id)

            if (error) throw error
            toast.success('Cita cancelada', {
                description: 'El espacio ha sido liberado.'
            })
            loadAppointments()
        } catch (err) {
            toast.error('Error al cancelar')
        }
    }

    // FILTRADO Y ORDENAMIENTO CRONOLÓGICO REAL
    const appointmentsForSelectedDate = appointments
        .filter(app => {
            // Comparamos solo la parte de la fecha (YYYY-MM-DD)
            return app.fecha.startsWith(getLocalDateString(selectedDate));
        })
        .sort((a, b) => {
            // Extraemos la hora literal para ordenar (ej: "13:30" vs "09:00")
            const timeA = a.fecha.split('T')[1]?.substring(0, 5) || '00:00';
            const timeB = b.fecha.split('T')[1]?.substring(0, 5) || '00:00';
            return timeA.localeCompare(timeB);
        });

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
            <p className="text-slate-500 font-medium italic">Sincronizando agenda MdPulso...</p>
        </div>
    )

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-display">Agenda Médica</h1>
                    <p className="text-slate-500 text-xs md:text-sm italic">Gestión de turnos y disponibilidad horaria</p>
                </div>
                <div className="flex gap-2 md:gap-4">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl md:rounded-2xl bg-white px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-95"
                    >
                        <Filter className="h-4 w-4" />
                        Hoy
                    </button>
                    <button
                        onClick={() => {
                            setSelectedAppointment(null)
                            setIsModalOpen(true)
                        }}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl md:rounded-2xl bg-slate-900 px-4 md:px-6 py-2.5 md:py-4 text-xs md:text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-95 text-nowrap"
                    >
                        <Plus className="h-5 w-5" />
                        Agendar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
                {/* Sidebar / Mini Calendar */}
                <div className="xl:col-span-1 space-y-4 md:space-y-6">
                    <div className="rounded-2xl md:rounded-3xl bg-white p-4 md:p-6 shadow-sm border border-slate-100 h-fit">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <p className="font-bold text-slate-900 leading-none text-sm md:text-base">
                                {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
                            </p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                                    className="p-1 md:p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4 text-slate-400" />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                                    className="p-1 md:p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
                            <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span><span>Do</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs font-semibold">
                            {(() => {
                                const year = currentMonth.getFullYear()
                                const month = currentMonth.getMonth()
                                const firstDay = new Date(year, month, 1).getDay()
                                const daysInMonth = new Date(year, month + 1, 0).getDate()
                                const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

                                const days = []
                                for (let i = 0; i < adjustedFirstDay; i++) {
                                    days.push(<div key={`empty-${i}`} className="py-1.5 md:py-2" />)
                                }
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const dateObj = new Date(year, month, d)
                                    const isSelected = getLocalDateString(dateObj) === getLocalDateString(selectedDate)
                                    const isToday = getLocalDateString(dateObj) === getLocalDateString(new Date())

                                    days.push(
                                        <div
                                            key={d}
                                            onClick={() => setSelectedDate(dateObj)}
                                            className={`py-1.5 md:py-2 rounded-lg md:rounded-xl cursor-pointer transition-all active:scale-90 ${isSelected
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                : isToday
                                                    ? 'border border-emerald-500 text-emerald-600'
                                                    : 'hover:bg-emerald-50 text-slate-600'
                                                }`}
                                        >
                                            {d}
                                        </div>
                                    )
                                }
                                return days
                            })()}
                        </div>
                    </div>

                    <div className="hidden md:block rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
                        <h3 className="font-bold mb-2 text-emerald-400">Disponibilidad</h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Tienes un {Math.min(100, appointmentsForSelectedDate.length * 12.5)}% de ocupación para este día.
                        </p>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${Math.min(100, appointmentsForSelectedDate.length * 12.5)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Timeline / List */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="flex items-center justify-between mb-2 md:mb-4">
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 italic">
                            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h2>
                        <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {appointmentsForSelectedDate.length} Citas
                        </span>
                    </div>

                    {appointmentsForSelectedDate.length > 0 ? appointmentsForSelectedDate.map((app, i) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex gap-3 md:gap-6 group"
                        >
                            <div className="flex flex-col items-center gap-2 pt-2 min-w-[50px] md:min-w-[60px]">
                                <span className={`text-[11px] md:text-sm font-bold ${app.estado === 'cancelada' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                                    {(() => {
                                        // Extracción segura y manual de la hora para evitar Timezone Shifts
                                        const timeStr = app.fecha.split('T')[1];
                                        if (!timeStr) return '--:--';
                                        const [h, m] = timeStr.split(':');
                                        let hours = parseInt(h);
                                        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
                                        hours = hours % 12 || 12;
                                        return `${hours}:${m} ${ampm}`;
                                    })()}
                                </span>
                                <div className="w-px flex-1 bg-slate-200 group-last:bg-transparent" />
                            </div>

                            <div className={`flex-1 rounded-[1.4rem] md:rounded-[1.8rem] p-4 md:p-6 border transition-all ${app.estado === 'confirmada'
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-200'
                                : app.estado === 'completada'
                                    ? 'bg-slate-50 border-emerald-100'
                                    : app.estado === 'cancelada'
                                        ? 'bg-slate-50 border-slate-200 text-slate-300 opacity-60'
                                        : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-lg'
                                }`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 md:gap-4 min-w-0">
                                        <div className={`rounded-lg md:rounded-xl p-2 md:p-3 flex-shrink-0 ${app.estado === 'confirmada' ? 'bg-white/10'
                                                : app.estado === 'completada' ? 'bg-emerald-50'
                                                    : 'bg-slate-50'
                                            }`}>
                                            {app.estado === 'completada'
                                                ? <CheckCheck className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                                                : <User className={`h-4 w-4 md:h-5 md:w-5 ${app.estado === 'confirmada' ? 'text-white' : 'text-slate-400'}`} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-bold text-base md:text-lg leading-tight truncate ${app.estado === 'cancelada' ? 'line-through' : ''} ${app.estado === 'completada' ? 'text-slate-500' : ''}`}>{app.patients?.nombre}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 opacity-80 text-[10px] md:text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    45 min
                                                </span>
                                                <span className="hidden sm:block h-1 w-1 rounded-full bg-current" />
                                                <span className="truncate">{app.motivo}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                        <span className={`rounded-full px-2 md:px-3 py-1 text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${app.estado === 'confirmada' ? 'bg-white/20'
                                                : app.estado === 'cancelada' ? 'bg-slate-200 text-slate-400'
                                                    : app.estado === 'completada' ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {app.estado}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {app.estado === 'pendiente' && (
                                                <button
                                                    onClick={() => confirmAppointment(app.id)}
                                                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter"
                                                >
                                                    OK
                                                </button>
                                            )}
                                            {app.estado === 'confirmada' && (
                                                <button
                                                    onClick={() => {
                                                        setCheckoutAppointment(app)
                                                        setIsCheckoutOpen(true)
                                                    }}
                                                    className="rounded-lg bg-white/20 px-2 py-1 text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter hover:bg-white/30 transition-all flex items-center gap-1"
                                                >
                                                    <CheckCheck className="h-3 w-3" />
                                                    Cobrar
                                                </button>
                                            )}
                                            {app.estado !== 'cancelada' && app.estado !== 'completada' && (
                                                <button
                                                    onClick={() => toast('Opciones de Cita', {
                                                        description: `Gestión para ${app.patients?.nombre}`,
                                                        action: {
                                                            label: 'Reagendar',
                                                            onClick: () => {
                                                                setSelectedAppointment(app)
                                                                setIsModalOpen(true)
                                                            }
                                                        },
                                                        cancel: {
                                                            label: 'Cancelar Cita',
                                                            onClick: () => cancelAppointment(app.id)
                                                        }
                                                    } as any)}
                                                    className={`p-1.5 md:p-2 rounded-lg transition-colors ${app.estado === 'confirmada' ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="flex flex-col items-center justify-center p-10 md:p-20 text-center rounded-[2rem] border-2 border-dashed border-slate-100">
                            <CalendarIcon className="h-10 w-10 md:h-12 md:w-12 text-slate-200 mb-4" />
                            <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight">No hay citas registradas para este día.</p>
                            <button onClick={() => {
                                setSelectedAppointment(null);
                                setIsModalOpen(true);
                            }} className="mt-4 text-xs md:text-sm font-bold text-emerald-600 hover:underline">Programar nueva cita</button>
                        </div>
                    )}
                </div>
            </div>
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedAppointment(null)
                }}
                onSuccess={loadAppointments}
                appointment={selectedAppointment}
            />
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => {
                    setIsCheckoutOpen(false)
                    setCheckoutAppointment(null)
                }}
                onSuccess={loadAppointments}
                appointment={checkoutAppointment}
            />
        </div>
    )
}
