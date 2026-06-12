import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Users, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react'

const ADMIN_KEY = 'rocorp2026'

type Profile = {
  id: string
  email: string
  full_name: string
  created_at: string
  trial_ends_at: string
  notified_at: string | null
  patients_count: number
  appointments_count: number
}

function trialStatus(trialEndsAt: string) {
  const end = new Date(trialEndsAt)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Expirado', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (diffDays <= 3) return { label: `${diffDays}d restantes`, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' }
  return { label: `${diffDays}d restantes`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const params = await searchParams
  if (params.key !== ADMIN_KEY) {
    redirect('/login')
  }

  // Consultar con service_role para ver todos los perfiles
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Contar pacientes y citas por doctor
  const enriched: Profile[] = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const [{ count: pCount }, { count: aCount }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', p.id),
      ])
      return { ...p, patients_count: pCount ?? 0, appointments_count: aCount ?? 0 }
    })
  )

  const totalDoctors = enriched.length
  const activeTrials = enriched.filter(p => new Date(p.trial_ends_at) > new Date()).length
  const expiredTrials = totalDoctors - activeTrials
  const withActivity = enriched.filter(p => p.patients_count > 0 || p.appointments_count > 0).length

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Panel Admin — MDPulso</h1>
          <p className="text-slate-400 text-sm mt-1">Doctores registrados y estado de trial</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total registrados', value: totalDoctors, icon: Users, color: 'text-blue-400' },
            { label: 'Trials activos', value: activeTrials, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Trials expirados', value: expiredTrials, icon: AlertCircle, color: 'text-red-400' },
            { label: 'Con actividad', value: withActivity, icon: Activity, color: 'text-violet-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <Icon size={18} className={color} />
              <p className="text-2xl font-bold text-white mt-2">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabla desktop */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Doctor</th>
                  <th className="text-left px-5 py-3">Registrado</th>
                  <th className="text-left px-5 py-3">Trial</th>
                  <th className="text-center px-5 py-3">Pacientes</th>
                  <th className="text-center px-5 py-3">Citas</th>
                  <th className="text-left px-5 py-3">Notificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {enriched.map((p) => {
                  const trial = trialStatus(p.trial_ends_at)
                  const isActive = p.patients_count > 0 || p.appointments_count > 0
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <div>
                            <p className="font-medium text-white">{p.full_name}</p>
                            <p className="text-xs text-slate-500">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">{formatDate(p.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${trial.color}`}>
                          {trial.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-white font-semibold">{p.patients_count}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-white font-semibold">{p.appointments_count}</span>
                      </td>
                      <td className="px-5 py-4">
                        {p.notified_at ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={12} /> Notificado
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Clock size={12} /> Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden divide-y divide-slate-800">
            {enriched.map((p) => {
              const trial = trialStatus(p.trial_ends_at)
              const isActive = p.patients_count > 0 || p.appointments_count > 0
              return (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <div>
                        <p className="font-medium text-white text-sm">{p.full_name}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${trial.color}`}>
                      {trial.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pl-4 text-xs text-slate-400">
                    <span>{p.patients_count} pacientes</span>
                    <span>{p.appointments_count} citas</span>
                    <span>{formatDate(p.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {enriched.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Users size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Aun no hay doctores registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
