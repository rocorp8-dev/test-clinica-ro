'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sparkles, Shield, Users, TrendingUp, ArrowRight,
    Bot, Zap, Lock, Bell, FileText, Calendar, ClipboardList,
    CheckCircle, Brain, Activity, ChevronDown, Star
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const stagger = {
    show: { transition: { staggerChildren: 0.12 } }
}

function NiaChat() {
    const messages = [
        { role: 'user', text: 'NIA, muéstrame el historial de Rodolfo Pérez' },
        { role: 'nia', text: '🔎 Buscando en base de datos...' },
        { role: 'nia', text: '📋 Rodolfo Pérez — Última consulta: hoy 5:00 p.m.\n🩺 Diagnóstico: Contusión de rodilla\n💊 Plan: Reposo + Ibuprofeno 400mg\n🚨 Sin alergias registradas' },
    ]
    const [visible, setVisible] = useState(0)

    useEffect(() => {
        if (visible < messages.length) {
            const t = setTimeout(() => setVisible(v => v + 1), visible === 0 ? 600 : 1200)
            return () => clearTimeout(t)
        } else {
            const t = setTimeout(() => setVisible(0), 3000)
            return () => clearTimeout(t)
        }
    }, [visible])

    return (
        <div className="bg-slate-950 rounded-[2rem] border border-slate-800 p-6 space-y-3 font-mono text-sm shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">NIA — Interface Neural Activa</span>
            </div>
            <div className="space-y-3 min-h-[140px]">
                {messages.slice(0, visible).map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                            m.role === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-md'
                                : 'bg-slate-800 text-slate-200 rounded-bl-md'
                        }`}>
                            {m.text}
                        </div>
                    </motion.div>
                ))}
                {visible < messages.length && visible > 0 && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5 items-center">
                            {[0,1,2].map(i => (
                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function NotifPreview() {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-600" />
                    <p className="text-sm font-black text-slate-900">Notificaciones</p>
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[9px] font-black text-white">2</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Marcar leídas</span>
            </div>
            <div className="divide-y divide-slate-50">
                {[
                    { icon: <Activity className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-600', title: 'Consulta hoy a las 5:00 p.m.', desc: 'Rodolfo Pérez — Golpe en la rodilla', dot: true },
                    { icon: <Calendar className="h-4 w-4" />, color: 'bg-amber-100 text-amber-600', title: 'Cita sin confirmar', desc: 'María García — 4:30 p.m.', dot: true },
                    { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-slate-100 text-slate-400', title: 'Sistema operando con normalidad', desc: 'NOM-004 · NOM-024 activos', dot: false },
                ].map((n, i) => (
                    <div key={i} className={`flex items-start gap-3 px-5 py-3.5 ${n.dot ? 'bg-emerald-50/40' : 'bg-white'}`}>
                        <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.color}`}>{n.icon}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{n.desc}</p>
                        </div>
                        {n.dot && <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />}
                    </div>
                ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-50 text-center text-xs font-bold text-emerald-600">Ver agenda completa →</div>
        </div>
    )
}

function ExpedientePreview() {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden text-sm">
            <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg">R</div>
                <div>
                    <p className="font-black text-white text-sm">Rodolfo Pérez</p>
                    <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold">Activo</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md font-bold">O+</span>
                    </div>
                </div>
            </div>
            <div className="p-5 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota SOAP — Evolución</p>
                <div className="space-y-2 text-xs">
                    <p><span className="font-black text-slate-500">S:</span> <span className="text-slate-700">Dolor en rodilla derecha tras caída deportiva</span></p>
                    <p><span className="font-black text-slate-500">O:</span> <span className="text-slate-700">Edema leve, rango de movimiento reducido</span></p>
                    <p><span className="font-black text-slate-700 font-bold">A:</span> <span className="font-bold text-slate-900">Contusión grado II — M79.36</span></p>
                    <p><span className="font-black text-slate-500">P:</span> <span className="text-slate-700">Reposo relativo, AINES, control en 7 días</span></p>
                </div>
                <div className="flex gap-2 pt-1">
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-mono">M79.36</span>
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">Firmada ✓</span>
                    <span className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md">NOM-004 ✓</span>
                </div>
            </div>
        </div>
    )
}

const FEATURES = [
    {
        icon: FileText,
        color: 'from-emerald-500 to-teal-600',
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        title: 'Expediente Clínico NOM-004',
        desc: 'Expedientes electrónicos 100% conformes con NOM-004-SSA3-2012. CURP, CIE-10, SOAP, firma digital y auditoría NOM-024 integrados.',
        badge: 'NOM-004 ✓'
    },
    {
        icon: Brain,
        color: 'from-blue-500 to-indigo-600',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        title: 'NIA — Copiloto con IA',
        desc: 'Asistente clínico que accede a tu base de datos en tiempo real. Busca pacientes, genera resúmenes y detecta alertas de seguridad.',
        badge: 'AI Clínico'
    },
    {
        icon: Bell,
        color: 'from-amber-500 to-orange-600',
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        title: 'Notificaciones Inteligentes',
        desc: 'Alertas en tiempo real de citas del día y pendientes. Click directo a la cita en la agenda con scroll automático.',
        badge: 'Tiempo Real'
    },
    {
        icon: Calendar,
        color: 'from-violet-500 to-purple-600',
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        title: 'Agenda Médica Visual',
        desc: 'Calendario mensual con timeline diario. Confirmación, facturación y gestión de citas en un solo flujo.',
        badge: 'Flujo completo'
    },
    {
        icon: Shield,
        color: 'from-slate-600 to-slate-900',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        title: 'Seguridad & Normativa',
        desc: 'RLS por médico, auditoría completa NOM-024, cifrado en tránsito y reposo. Sus datos clínicos siempre protegidos.',
        badge: 'NOM-024 ✓'
    },
    {
        icon: TrendingUp,
        color: 'from-rose-500 to-pink-600',
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        title: 'Facturación & Balance',
        desc: 'Dashboard financiero con balance mensual, historial de pagos y checkout directo desde la cita.',
        badge: 'Integrado'
    }
]

const TESTIMONIALS = [
    { name: 'Dr. Carlos Méndez', role: 'Médico General · Oaxaca', text: 'Por fin un sistema que cumple con la normativa y no me roba horas. Las notas SOAP se llenan en minutos.', stars: 5 },
    { name: 'Dra. Laura Vásquez', role: 'Pediatra · CDMX', text: 'NIA me ahorra 20 minutos por paciente. El historial queda perfecto y puedo exportar el expediente al instante.', stars: 5 },
    { name: 'Dr. Ramón Torres', role: 'Traumatólogo · Guadalajara', text: 'Las notificaciones con click directo a la cita son increíbles. Cero tiempo perdido buscando en la agenda.', stars: 5 },
]

export default function PresentationPage() {
    const [activeFeature, setActiveFeature] = useState(0)

    return (
        <div className="min-h-screen bg-white overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">

            {/* NAV */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl overflow-hidden shadow-lg shadow-emerald-200 flex-shrink-0">
                        <Image src="/logo-mdpulso.png" alt="MdPulso" width={36} height={36} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-lg font-black tracking-tight text-slate-950 font-display italic">MdPulso</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
                    <a href="#features" className="hover:text-emerald-600 transition-colors">Funciones</a>
                    <a href="#normativa" className="hover:text-emerald-600 transition-colors">Normativa</a>
                    <a href="#testimonios" className="hover:text-emerald-600 transition-colors">Testimonios</a>
                    <Link href="/login" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 font-bold">
                        Ingresar al sistema
                    </Link>
                </div>
                <Link href="/login" className="md:hidden bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
                    Ingresar
                </Link>
            </nav>

            {/* HERO */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-950">
                {/* Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-950 to-slate-950" />
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute bottom-1/4 -left-40 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px]" />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            animate="show"
                            className="space-y-8"
                        >
                            <motion.div variants={fadeUp}>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-widest text-emerald-400 mb-6">
                                    <Sparkles className="h-3 w-3" />
                                    Sistema Médico Certificado · NOM-004 · NOM-024
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-white font-display">
                                    La clínica del<br/>
                                    <span className="text-emerald-400 italic">futuro,</span><br/>
                                    <span className="text-slate-400">hoy.</span>
                                </h1>
                            </motion.div>

                            <motion.p variants={fadeUp} className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-lg">
                                MdPulso es el sistema operativo de su práctica médica. Expedientes NOM-004, IA clínica, agenda inteligente y notificaciones en tiempo real — todo en un solo lugar.
                            </motion.p>

                            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                                <Link href="/login" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20">
                                    Acceder al sistema
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                                <a href="#features" className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-white/10 transition-all flex items-center gap-2">
                                    Ver funciones
                                    <ChevronDown className="h-5 w-5" />
                                </a>
                            </motion.div>

                            <motion.div variants={fadeUp} className="flex items-center gap-6 pt-2">
                                {[
                                    { label: 'NOM-004 ✓', color: 'text-emerald-400' },
                                    { label: 'NOM-024 ✓', color: 'text-emerald-400' },
                                    { label: 'IA Integrada', color: 'text-blue-400' },
                                    { label: 'CIE-10', color: 'text-slate-400' },
                                ].map(b => (
                                    <span key={b.label} className={`text-xs font-black uppercase tracking-wider ${b.color}`}>{b.label}</span>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Hero visual — NIA Chat */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.7 }}
                            className="space-y-4"
                        >
                            <NiaChat />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-white">100%</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">Cumplimiento NOM</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-emerald-400">‹2s</p>
                                    <p className="text-xs text-slate-400 font-bold mt-1">Respuesta IA clínica</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="py-28 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <p className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em] mb-3">Funcionalidades</p>
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 font-display mb-4">Todo lo que necesita,<br/>nada de lo que no.</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">Diseñado con médicos para médicos. Cada función resuelve un problema real de la consulta diaria.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{ y: -6 }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group cursor-default"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`h-12 w-12 rounded-2xl ${f.bg} ${f.text} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <f.icon className="h-6 w-6" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${f.bg} ${f.text}`}>{f.badge}</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* NORMATIVA SECTION */}
            <section id="normativa" className="py-28 px-6 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-black uppercase tracking-widest text-emerald-700 mb-6">
                                <Shield className="h-3.5 w-3.5" />
                                Cumplimiento Normativo Mexicano
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-display mb-6 leading-tight">
                                El único sistema con <span className="text-emerald-600">NOM-004</span> y <span className="text-emerald-600">NOM-024</span> integradas
                            </h2>
                            <p className="text-slate-500 text-lg leading-relaxed mb-10">
                                No más hojas de papel ni expedientes incompletos. MdPulso genera automáticamente el expediente clínico conforme a la Norma Oficial Mexicana, con todos los campos requeridos y auditoría completa.
                            </p>
                            <div className="space-y-5">
                                {[
                                    { norm: 'NOM-004-SSA3-2012', title: 'Expediente Clínico Completo', items: ['Identificación con CURP', 'Notas SOAP firmadas', 'Diagnóstico CIE-10', 'Consentimiento informado'] },
                                    { norm: 'NOM-024-SSA3-2010', title: 'Sistemas de Información', items: ['Auditoría updated_at / updated_by', 'RLS por médico responsable', 'Trazabilidad completa'] },
                                ].map((n, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide">{n.norm}</span>
                                            <span className="text-sm font-bold text-slate-900">{n.title}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {n.items.map(item => (
                                                <span key={item} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <ExpedientePreview />
                            <NotifPreview />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* NIA AI SECTION */}
            <section className="py-28 px-6 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-black uppercase tracking-widest text-emerald-400">
                                <Bot className="h-3.5 w-3.5" />
                                MdPulso AI Core
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black leading-tight font-display">
                                NIA: Su nueva<br/><span className="text-emerald-400 italic">asistente neural</span>
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                No es un chatbot genérico. NIA tiene acceso directo a su base de datos clínica y ejecuta acciones reales: busca pacientes, analiza historiales y agenda citas con lenguaje natural.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: '🔎', title: 'Búsqueda semántica', desc: 'Encuentra pacientes por nombre, síntoma o diagnóstico' },
                                    { icon: '📋', title: 'Resumen clínico', desc: 'Genera snapshot del expediente en segundos' },
                                    { icon: '🚨', title: 'Alertas de seguridad', desc: 'Detecta alergias, interacciones y riesgos' },
                                    { icon: '📅', title: 'Agenda inteligente', desc: 'Crea citas desde lenguaje natural' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <p className="text-2xl mb-2">{item.icon}</p>
                                        <p className="text-sm font-bold text-white">{item.title}</p>
                                        <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <Link href="/login" className="inline-flex bg-emerald-600 px-8 py-4 rounded-2xl font-black items-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-500/20">
                                Probar NIA ahora
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="lg:pl-8"
                        >
                            <NiaChat />
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                <p className="text-xs font-bold text-emerald-400">NIA responde en tiempo real con datos reales de su DB</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIOS */}
            <section id="testimonios" className="py-28 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <p className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em] mb-3">Testimonios</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-display">Lo que dicen los médicos</h2>
                    </motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm"
                            >
                                <div className="flex gap-1 mb-4">
                                    {Array(t.stars).fill(0).map((_, s) => (
                                        <Star key={s} className="h-4 w-4 text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <p className="text-slate-700 leading-relaxed mb-6 italic">"{t.text}"</p>
                                <div>
                                    <p className="font-black text-slate-900 text-sm">{t.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="py-40 px-6 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950 to-slate-950" />
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <p className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em] mb-6">Únase a la élite médica</p>
                        <h2 className="text-5xl md:text-7xl font-black font-display leading-tight mb-6">
                            Su práctica merece<br/><span className="text-emerald-400 italic">el mejor sistema.</span>
                        </h2>
                        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
                            Configure su cuenta en minutos. Expedientes, agenda, IA y normativa listos desde el primer día.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link href="/login" className="w-full sm:w-auto bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 text-center flex items-center justify-center gap-2">
                            Comenzar ahora
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <a href="https://wa.me/529511454158" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-white/5 border border-white/20 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-white/10 transition-all active:scale-95 text-center">
                            Agendar demo por WhatsApp
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 px-6 bg-slate-950 border-t border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src="/logo-mdpulso.png" alt="MdPulso" width={28} height={28} className="h-full w-full object-cover" />
                        </div>
                        <span className="font-black text-white font-display italic">MdPulso</span>
                        <span className="text-slate-600 text-xs font-bold">v3.0</span>
                    </div>
                    <p className="text-slate-600 text-sm text-center">
                        © 2026 MdPulso · Desarrollado por{' '}
                        <a href="https://despacho9.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors">Despacho9</a>
                    </p>
                    <div className="flex gap-4 text-slate-600 text-sm">
                        <a href="#" className="hover:text-slate-400 transition-colors">Privacidad</a>
                        <a href="#" className="hover:text-slate-400 transition-colors">Términos</a>
                        <a href="mailto:despacho9@gmail.com" className="hover:text-slate-400 transition-colors">Contacto</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
