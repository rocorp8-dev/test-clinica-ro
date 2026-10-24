'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Lock,
    Users,
    Calendar,
    ArrowRight,
    MessageCircle,
    Stethoscope,
    ShieldCheck
} from 'lucide-react'

const WHATSAPP_URL = 'https://wa.me/529511454158?text=Hola,%20mi%20prueba%20de%20MdPulso%20terminó%20y%20quiero%20elegir%20un%20plan'

export default function TrialExpiredPage() {
    const [patients, setPatients] = useState(0)
    const [appointments, setAppointments] = useState(0)
    const [doctorName, setDoctorName] = useState('Doctor(a)')
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    useEffect(() => {
        async function loadStats() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                const [profileRes, patientsRes, appRes] = await Promise.all([
                    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
                    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id)
                ])

                if (profileRes.data?.full_name) setDoctorName(profileRes.data.full_name)
                setPatients(patientsRes.count || 0)
                setAppointments(appRes.count || 0)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [supabase])

    return (
        <div className="min-h-screen bg-[#050a10] text-[#e8f4ff] font-outfit relative overflow-hidden">
            {/* Background Grid & Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#00c6ff 1px, transparent 1px), linear-gradient(90deg, #00c6ff 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
                <div
                    className="absolute top-[-200px] left-[-200px] w-[700px] height-[700px] rounded-full opacity-[0.12] blur-[120px]"
                    style={{ background: 'radial-gradient(circle, #0072ff 0%, transparent 70%)' }}
                />
                <div
                    className="absolute bottom-[-200px] right-[-200px] w-[600px] height-[600px] rounded-full opacity-[0.07] blur-[100px]"
                    style={{ background: 'radial-gradient(circle, #00e5a0 0%, transparent 70%)' }}
                />
            </div>

            <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl"
                >
                    {/* Icono de bloqueo */}
                    <div className="text-center mb-10">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 mb-6">
                            <Lock className="h-10 w-10 text-red-400" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Acceso pausado
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-4">
                            Tu periodo de prueba<br />
                            <span className="italic bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ha terminado</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-light leading-relaxed max-w-lg mx-auto">
                            Gracias por confiar en MdPulso, {doctorName}. Para continuar gestionando tu práctica sin interrupciones, elige el plan que mejor se adapte a ti.
                        </p>
                    </div>

                    {/* Stats del doctor — urgencia */}
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl text-center">
                            <Users className="h-6 w-6 text-cyan-400 mx-auto mb-3" />
                            {loading ? (
                                <div className="h-9 w-16 mx-auto rounded-lg bg-slate-800 animate-pulse" />
                            ) : (
                                <p className="text-3xl font-mono font-medium text-white">{patients}</p>
                            )}
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2">
                                Pacientes registrados
                            </p>
                        </div>
                        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl text-center">
                            <Calendar className="h-6 w-6 text-emerald-400 mx-auto mb-3" />
                            {loading ? (
                                <div className="h-9 w-16 mx-auto rounded-lg bg-slate-800 animate-pulse" />
                            ) : (
                                <p className="text-3xl font-mono font-medium text-white">{appointments}</p>
                            )}
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2">
                                Citas agendadas
                            </p>
                        </div>
                    </div>

                    {/* Mensaje de tranquilidad */}
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-900/40 border border-slate-800 p-5 mb-10">
                        <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-400 leading-relaxed">
                            <span className="text-slate-200 font-medium">Tus datos están seguros.</span> Tus pacientes, expedientes y cobros permanecen protegidos y cifrados. Al activar un plan recuperarás el acceso completo al instante.
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/precios"
                            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                        >
                            <Stethoscope className="h-4 w-4" />
                            Elegir Plan
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold border border-slate-700 hover:bg-slate-700 transition-all active:scale-[0.98]"
                        >
                            <MessageCircle className="h-4 w-4 text-emerald-400" />
                            Contactar por WhatsApp
                        </a>
                    </div>

                    <p className="text-center text-slate-600 text-xs font-mono uppercase tracking-widest mt-10">
                        Soporte prioritario · Activación en minutos · Sin contratos
                    </p>
                </motion.div>
            </main>
        </div>
    )
}

