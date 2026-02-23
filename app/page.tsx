'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Users,
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
  MoreHorizontal,
  Stethoscope,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'
import AppointmentModal from '@/components/appointments/AppointmentModal'
import PatientModal from '@/components/patients/PatientModal'
import PatientDetailModal from '@/components/patients/PatientDetailModal'

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, appointments: 0, today: 0, balance: 0 })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAppModalOpen, setIsAppModalOpen] = useState(false)
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Stats
        const [patientsRes, appRes, todayRes, billingRes] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id),
          supabase.from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', user.id)
            .gte('fecha', new Date().toISOString().split('T')[0])
            .lte('fecha', new Date().toISOString().split('T')[0] + 'T23:59:59'),
          supabase.from('billing')
            .select('amount')
            .eq('user_id', user.id)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ])

        const balanceTotal = billingRes.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        setStats({
          patients: patientsRes.count || 0,
          appointments: appRes.count || 0,
          today: todayRes.count || 0,
          balance: balanceTotal
        })

        // Recent Appointments
        const now = new Date();
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            id,
            fecha,
            motivo,
            estado,
            patients (id, nombre, dni, telefono)
          `)
          .eq('doctor_id', user.id)
          .gte('fecha', now.toISOString())
          .neq('estado', 'completada')
          .neq('estado', 'cancelada')
          .order('fecha', { ascending: true })
          .limit(5)

        setRecentAppointments(appointments || [])
      } catch (err) {
        toast.error('Error al cargar dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const confirmAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ estado: 'confirmada' })
        .eq('id', id)

      if (error) throw error
      toast.success('Cita confirmada correctamente')
      reloadData()
    } catch (err) {
      toast.error('Error al confirmar cita')
    }
  }

  const reloadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [patientsRes, appRes, todayRes, billingRes] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id),
      supabase.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .gte('fecha', new Date().toISOString().split('T')[0])
        .lte('fecha', new Date().toISOString().split('T')[0] + 'T23:59:59'),
      supabase.from('billing')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ])

    const balanceTotal = billingRes.data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    setStats({
      patients: patientsRes.count || 0,
      appointments: appRes.count || 0,
      today: todayRes.count || 0,
      balance: balanceTotal
    })

    const now = new Date();
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha,
        motivo,
        estado,
        patients (id, nombre, dni, telefono)
      `)
      .eq('doctor_id', user.id)
      .gte('fecha', now.toISOString())
      .neq('estado', 'completada')
      .neq('estado', 'cancelada')
      .order('fecha', { ascending: true })
      .limit(5)

    setRecentAppointments(appointments || [])
    setLoading(false)
  }

  const statCards = [
    { label: 'Pacientes Totales', value: stats.patients, icon: Users, color: 'emerald' },
    { label: 'Citas Programadas', value: stats.appointments, icon: Calendar, color: 'blue' },
    { label: 'Consultas para Hoy', value: stats.today, icon: Clock, color: 'amber' },
    { label: 'Balance del Mes', value: `$${stats.balance.toFixed(2)}`, icon: TrendingUp, color: 'emerald' },
  ]

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 italic">Sincronizando con MdPulso Cloud...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-slate-900 p-6 md:p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
              Estado del Sistema: Óptimo
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl font-display">
              Bienvenido a <span className="text-emerald-500 italic">MdPulso</span>
            </h1>
            <p className="max-w-md text-slate-400 text-base md:text-lg leading-relaxed">
              Gestiona tu práctica médica con precisión quirúrgica y una interfaz diseñada para el alto rendimiento.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4">
            <button
              onClick={() => setIsAppModalOpen(true)}
              className="flex-1 sm:flex-none rounded-xl md:rounded-2xl bg-white px-5 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-950 transition-all hover:scale-105 active:scale-90 shadow-xl shadow-white/5"
            >
              Nueva Consulta
            </button>
            <Link
              href="/appointments"
              className="flex-1 sm:flex-none rounded-xl md:rounded-2xl bg-slate-800 px-5 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95 border border-slate-700 shadow-xl text-center"
            >
              Ver Agenda
            </Link>
          </div>
        </div>
        {/* Background Decor */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]" />
        <Stethoscope className="absolute right-4 bottom-4 md:right-10 md:bottom-10 h-24 w-24 md:h-32 md:w-32 text-white/5 -rotate-12" />
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl bg-white p-5 md:p-6 shadow-sm border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={`rounded-xl md:rounded-2xl p-2.5 md:p-3 ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                }`}>
                <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500 hidden md:block" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-slate-500 truncate">{stat.label}</p>
              <h3 className="text-xl md:text-3xl font-bold text-slate-900 mt-0.5 md:mt-1 font-display">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Activity */}
        <section className="lg:col-span-2 rounded-[2rem] bg-white p-5 md:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 font-display">Próximas Citas</h2>
            <Link href="/appointments" className="text-xs md:text-sm font-bold text-emerald-600 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-4">
            {recentAppointments.length > 0 ? recentAppointments.map((app: any) => (
              <div key={app.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 rounded-3xl bg-slate-50/50 hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 gap-4 active:scale-[0.98] cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-white shadow-sm font-bold text-slate-900 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter leading-none mb-1">
                      {new Date(app.fecha).toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className="text-sm leading-none">
                      {new Date(app.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedPatient({
                        id: app.patients.id,
                        nombre: app.patients.nombre,
                        dni: app.patients.dni || 'No disponible',
                        telefono: app.patients.telefono || 'No disponible'
                      })
                      setIsDetailOpen(true)
                    }}
                    className="cursor-pointer min-w-0"
                  >
                    <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate text-base">{app.patients?.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] md:text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                        {app.motivo}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${app.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700'
                    : app.estado === 'completada' ? 'bg-emerald-500 text-white'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                    {app.estado}
                  </span>
                  <div className="flex items-center gap-2">
                    {app.estado === 'pendiente' && (
                      <button
                        onClick={() => confirmAppointment(app.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black text-white uppercase tracking-tighter shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        OK
                      </button>
                    )}
                    <button
                      onClick={() => toast.info('Opciones de Cita', { description: 'Pospón o edita los detalles de esta cita en el panel administrativo.' })}
                      className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-slate-400">
                No hay citas programadas para hoy.
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions / Integration */}
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-emerald-600 p-6 md:p-8 text-white shadow-xl shadow-emerald-200">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              MdPulso AI
            </h3>
            <p className="text-emerald-100 text-xs md:text-sm mb-6 leading-relaxed">
              Analiza expedientes y genera resúmenes automáticos con nuestra IA clínica entrenada.
            </p>
            <button
              onClick={() => toast.success('MdPulso AI activado', { description: 'Analizando base de datos de pacientes en tiempo real...' })}
              className="w-full rounded-xl md:rounded-2xl bg-white/10 py-3 text-xs md:text-sm font-bold border border-white/20 hover:bg-white/20 transition-all"
            >
              Activar Copiloto
            </button>
          </section>

          <section className="rounded-[2rem] bg-white p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Novedades</h3>
            </div>
            <div className="space-y-4">
              <div className="group cursor-pointer">
                <p className="text-xs md:text-sm font-bold group-hover:text-emerald-600 transition-colors">v2.4 Lanzada oficialmente</p>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1">Nuevas recetas digitales integradas.</p>
              </div>
              <div className="group cursor-pointer">
                <p className="text-xs md:text-sm font-bold group-hover:text-emerald-600 transition-colors">Integración con Farmacias</p>
                <p className="text-[10px] md:text-xs text-slate-400 mt-1">Ya puedes enviar pedidos directos.</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AppointmentModal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        onSuccess={reloadData}
      />
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSuccess={reloadData}
      />
      <PatientDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedPatient(null)
        }}
        patient={selectedPatient}
      />
    </div>
  )
}
