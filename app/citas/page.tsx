'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Calendar as CalendarIcon,
    Plus,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    CalendarDays
} from 'lucide-react'
import AppointmentModal from '@/components/appointments/AppointmentModal'

interface Appointment {
    id: string
    fecha: string
    motivo: string
    estado: string
    patients: {
        nombre: string
    }
}

export default function CitasPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date())

    const fetchAppointments = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('appointments')
            .select('*, patients(nombre)')
            .order('fecha', { ascending: true })

        if (error) {
            console.error('Error fetching appointments:', error)
        } else {
            setAppointments(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchAppointments()
    }, [])

    const appointmentsToday = appointments.filter(app => {
        const appDate = new Date(app.fecha)
        return appDate.toDateString() === selectedDate.toDateString()
    })

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda de Citas</h1>
                    <p className="text-slate-500">Gestiona las consultas médicas y horarios.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Cita
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Sidebar Mini */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900">
                            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {/* Simple calendar grid for visualization */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold">
                        <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {/* Logic simplified for UI */}
                        {Array.from({ length: 31 }).map((_, i) => (
                            <button
                                key={i}
                                className={`py-2 text-xs rounded-lg transition-all ${i + 1 === selectedDate.getDate() ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Appointments List for Selected Day */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 italic">
                            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {appointmentsToday.length} Citas Programadas
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-3">
                            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                            <p className="text-sm font-medium text-slate-500">Cargando agenda...</p>
                        </div>
                    ) : appointmentsToday.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center rounded-2xl border-2 border-dashed border-slate-100">
                            <CalendarDays className="h-10 w-10 text-slate-200 mb-2" />
                            <p className="text-sm text-slate-500">No hay citas agendadas para este día.</p>
                        </div>
                    ) : (
                        appointmentsToday.map((app) => (
                            <div key={app.id} className="flex gap-4 group">
                                <div className="w-16 pt-2 text-right">
                                    <span className="text-sm font-bold text-slate-900">
                                        {new Date(app.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-emerald-200 transition-all border-l-4 border-l-emerald-500 group-hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{app.patients.nombre}</h4>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {app.motivo || 'Sin motivo especificado'}
                                            </p>
                                        </div>
                                        <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                                            {app.estado}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAppointments}
            />
        </div>
    )
}
