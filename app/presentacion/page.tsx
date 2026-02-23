'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sparkles,
    Shield,
    Users,
    TrendingUp,
    Stethoscope,
    ArrowRight,
    ChevronRight,
    Bot,
    Zap,
    Heart,
    Lock,
    Globe
} from 'lucide-react'

const slides = [
    {
        title: "MDPulso",
        subtitle: "El Sistema Operativo de la Medicina Moderna",
        description: "Transformando la gestión clínica con Inteligencia Artificial de alto rendimiento.",
        bgClass: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-emerald-900/40 to-slate-950",
        color: "from-emerald-600 to-teal-700",
        icon: Stethoscope
    },
    {
        title: "Inteligencia que Asiste",
        subtitle: "NIA: Tu Copiloto Clínico",
        description: "Análisis en tiempo real de expedientes, resúmenes automáticos y diagnósticos asistidos por IA.",
        bgClass: "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900 via-blue-900/40 to-slate-950",
        color: "from-blue-600 to-indigo-700",
        icon: Bot
    },
    {
        title: "Control Total",
        subtitle: "Gestión 360° de tu Práctica",
        description: "Citas, expedientes digitales y facturación en un solo ecosistema premium e intuitivo.",
        bgClass: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black",
        color: "from-slate-400 to-slate-200",
        icon: Zap
    }
]

export default function PresentationPage() {
    const [currentSlide, setCurrentSlide] = useState(0)

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)

    return (
        <div className="min-h-screen bg-white overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <Stethoscope className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-950 font-display italic">MDPulso</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
                    <a href="#features" className="hover:text-emerald-600 transition-colors">Características</a>
                    <a href="#security" className="hover:text-emerald-600 transition-colors">Seguridad</a>
                    <a href="#contact" className="hover:text-emerald-600 transition-colors">Contacto</a>
                    <a href="https://wa.me/529511454158" target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">
                        Agendar Demo
                    </a>
                </div>
            </nav>

            {/* Hero Slider Section */}
            <section className="relative h-screen flex items-center justify-center pt-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className={`absolute inset-0 z-0 ${slides[currentSlide].bgClass}`}
                    >
                        <div className="absolute inset-0 bg-slate-950/20 z-10" />
                        {/* Abstract pattern overlay */}
                        <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    </motion.div>
                </AnimatePresence>

                <div className="relative z-20 max-w-7xl mx-auto px-6 w-full text-white">
                    <div className="max-w-3xl space-y-8">
                        <motion.div
                            key={`content-${currentSlide}`}
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-widest mb-6">
                                <Sparkles className="h-3 w-3 text-emerald-400" />
                                Nueva Era Médica
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-4 font-display">
                                {slides[currentSlide].title}
                            </h1>
                            <h2 className={`text-2xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${slides[currentSlide].color} brightness-150 mb-6 italic`}>
                                {slides[currentSlide].subtitle}
                            </h2>
                            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 max-w-2xl">
                                {slides[currentSlide].description}
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a href="/login" className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                    Explorar MDPulso
                                    <ArrowRight className="h-5 w-5" />
                                </a>
                                <button
                                    onClick={nextSlide}
                                    className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-2"
                                >
                                    Siguiente
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="absolute bottom-10 left-6 z-30 flex gap-2">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-12 bg-emerald-500' : 'w-4 bg-white/30'}`}
                        />
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.3em]">Características de Élite</h2>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 font-display">Diseñado para la Excelencia</h3>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            MDPulso no es solo un software, es un sistema nervioso digital que potencia todas las áreas de su práctica médica.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: Users, title: "Historial Inteligente", desc: "Expedientes electrónicos que aprenden de sus patrones de consulta." },
                            { icon: Shield, title: "Cifrado Militar", desc: "Protección AES-256 para datos sensibles de pacientes y doctores." },
                            { icon: TrendingUp, title: "Analítica de Ingresos", desc: "Dashboards financieros en tiempo real con proyecciones inteligentes." },
                            { icon: Heart, title: "Enfoque en el Paciente", desc: "Recordatorios automáticos y portal de seguimiento post-consulta." },
                            { icon: Lock, title: "Privacidad Total", desc: "Cumplimiento garantizado con normativas internacionales de salud." },
                            { icon: Globe, title: "Acceso Remoto", desc: "Controle su clínica desde cualquier lugar con sincronización en la nube." }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <feature.icon className="h-7 w-7" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section id="security" className="py-32 px-6 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-600 mb-6">
                                <Shield className="h-4 w-4 text-emerald-600" />
                                Infraestructura Clínica
                            </div>
                            <h3 className="text-4xl md:text-5xl font-black text-slate-950 font-display mb-6 leading-tight">
                                Seguridad de <span className="text-emerald-600">Grado Militar</span>
                            </h3>
                            <p className="text-slate-500 text-lg leading-relaxed mb-8">
                                Entendemos que la información clínica es el activo más crítico. MDPulso está construido sobre una arquitectura ultra segura, garantizando privacidad total y cumplimiento normativo.
                            </p>

                            <div className="space-y-6">
                                {[
                                    { title: "Cifrado AES-256 en Reposo", desc: "Toda la base de datos de pacientes e historial está encriptada al más alto estándar de la industria." },
                                    { title: "Autenticación Biométrica y 2FA", desc: "Acceso restringido únicamente a personal médico autorizado mediante múltiples capas de seguridad." },
                                    { title: "Respaldos Geodistribuidos en la Nube", desc: "Backups continuos en múltiples servidores de grado militar para alta disponibilidad." }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className="mt-1 bg-emerald-100 p-2.5 rounded-xl border border-emerald-200">
                                            <Lock className="h-5 w-5 text-emerald-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">{item.title}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security Visual */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-[3rem] blur-3xl transform -rotate-6" />
                            <div className="relative bg-slate-950 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col gap-6">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                                    <div className="flex gap-3">
                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-800"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-800"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-800"></div>
                                    </div>
                                    <div className="text-[10px] font-black tracking-widest text-emerald-500 flex items-center gap-2 uppercase">
                                        <Lock className="w-3.5 h-3.5" /> Encriptación Activa
                                    </div>
                                </div>
                                <div className="space-y-4 font-mono text-sm">
                                    <div className="flex justify-between items-center text-slate-400">
                                        <span>Status Firewall:</span>
                                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400">
                                        <span>Cifrado End-to-End:</span>
                                        <span className="text-emerald-400">AES-256</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400">
                                        <span>Monitoreo 24/7:</span>
                                        <span className="text-emerald-400 flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            ACTIVO
                                        </span>
                                    </div>
                                    <div className="h-px w-full bg-slate-800 my-6" />
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4 text-emerald-400">
                                        <Shield className="w-8 h-8 flex-shrink-0" />
                                        <p className="text-xs leading-relaxed font-sans font-medium">Sus datos clínicos están protegidos bajo protocolos internacionales. Cumplimiento estricto de normativas de privacidad de pacientes.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Experience Section */}
            <section className="py-32 px-6 overflow-hidden bg-slate-950 text-white relative">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest text-emerald-400">
                            <Bot className="h-4 w-4" />
                            MDPulso AI Core
                        </div>
                        <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-none font-display">
                            NIA: Su nueva <span className="text-emerald-500 italic">Asistente Neural</span>
                        </h3>
                        <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
                            NIA procesa lenguaje natural para asistirle en tareas complejas. Imagine buscar en miles de registros en segundos o dictar notas clínicas que se estructuran solas.
                        </p>
                        <div className="space-y-4">
                            {[
                                "Búsqueda semántica de pacientes",
                                "Resúmenes de historial clínico en segundos",
                                "Detección proactiva de interacciones médicas",
                                "Asistente de diagnóstico sugerido"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-slate-300 font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                        <a href="/login" className="inline-flex bg-emerald-600 px-8 py-4 rounded-2xl font-bold items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 w-max">
                            Probar NIA
                            <ArrowRight className="h-5 w-5" />
                        </a>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-20 bg-emerald-500/20 blur-[100px] rounded-full" />
                        <div className="relative z-10 bg-slate-900 border border-slate-800 rounded-[3rem] p-4 shadow-2xl">
                            <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden aspect-video flex items-center justify-center p-12 text-center">
                                <div className="space-y-4">
                                    <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto animate-pulse">
                                        <Sparkles className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Interface Neural Activa</p>
                                    <p className="text-slate-500 text-sm max-w-xs italic italic">
                                        "NIA, muestra un resumen del paciente Juan Pérez incluyendo sus alergias detectadas en 2023."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer / CTA */}
            <footer id="contact" className="py-40 px-6 text-center bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-4xl md:text-7xl font-black text-slate-950 font-display">
                        ¿Listo para dar el <span className="text-emerald-600 underline decoration-emerald-100 underline-offset-8">gran salto</span>?
                    </h2>
                    <p className="text-slate-500 text-xl md:text-2xl max-w-2xl mx-auto">
                        Únete a la élite médica que ya está optimizando su tiempo y mejorando la atención al paciente con MDPulso.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <a href="/login" className="w-full sm:w-auto bg-slate-950 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-all shadow-2xl active:scale-95 text-center">
                            Comenzar ahora
                        </a>
                        <a href="https://wa.me/529511454158" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-white text-slate-950 border-2 border-slate-200 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-slate-50 transition-all active:scale-95 text-center flex items-center justify-center">
                            Contactar Ventas
                        </a>
                    </div>
                    <div className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                                <Stethoscope className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-950 font-display">MDPulso v2.5</span>
                        </div>
                        <div className="text-slate-500 text-sm text-center md:text-left">
                            <p className="italic mb-1">© 2026 MDPulso Cloud Systems. Todos los derechos reservados.</p>
                            <p>
                                Desarrollado por <a href="https://despacho9.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Despacho9</a> |
                                <a href="mailto:despacho9@gmail.com" className="ml-1 hover:text-emerald-600 transition-colors">despacho9@gmail.com</a>
                            </p>
                        </div>
                        <div className="flex gap-4 text-slate-400">
                            <a href="#" className="hover:text-emerald-600 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-emerald-600 transition-colors">Términos</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
