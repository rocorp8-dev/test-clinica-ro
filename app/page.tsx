'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Calendar,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import AppointmentModal from '@/components/appointments/AppointmentModal'

export default function Dashboard() {
  const [stats, setStats] = useState([
    { label: 'Pacientes Totales', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Citas Hoy', value: '0', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pendientes', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])

  const fetchStats = async () => {
    setLoading(true)

    // Total Patients
    const { count: patientCount } = await supabase.from('patients').select('*', { count: 'exact', head: true })

    // Appointments Today
    const today = new Date().toISOString().split('T')[0]
    const { count: appointmentsToday } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', today + 'T00:00:00')
      .lte('fecha', today + 'T23:59:59')

    // Pending Appointments
    const { count: pendingCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    // Recent Appointments
    const { data: recent } = await supabase
      .from('appointments')
      .select('*, patients(nombre)')
      .order('created_at', { ascending: false })
      .limit(3)

    setStats([
      { label: 'Pacientes Totales', value: String(patientCount || 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Citas Hoy', value: String(appointmentsToday || 0), icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Pendientes', value: String(pendingCount || 0), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    ])
    setRecentAppointments(recent || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500">Gestión en tiempo real de tu clínica médica.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nueva Cita
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 gap-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Actualizando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {stats.map((stat, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className={stat.bg + " p-2.5 rounded-xl " + stat.color}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Proximas Citas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Actividad Reciente</h3>
                <Link href="/citas" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  Ver agenda <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-4">
                {recentAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">No hay actividad reciente.</p>
                ) : (
                  recentAppointments.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {app.patients.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{app.patients.nombre}</p>
                          <p className="text-xs text-slate-500">{app.motivo}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {new Date(app.fecha).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/pacientes" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group">
                  <Users className="h-8 w-8 text-slate-400 group-hover:text-emerald-600 mb-2" />
                  <span className="text-sm font-bold text-slate-700">Pacientes</span>
                </Link>
                <Link href="/citas" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group">
                  <Calendar className="h-8 w-8 text-slate-400 group-hover:text-emerald-600 mb-2" />
                  <span className="text-sm font-bold text-slate-700">Agenda</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchStats}
      />
    </div>
  )
}
