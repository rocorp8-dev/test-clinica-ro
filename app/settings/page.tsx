'use client'

import {
    Settings,
    User,
    Bell,
    Globe,
    Database,
    CreditCard,
    ChevronRight,
    ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function SettingsPage() {
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
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Protección de Datos Activa</span>
                        </div>
                        <h3 className="text-xl font-bold mb-4 font-display">Tus datos están seguros</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Cumplimos con las normativas <span className="text-white font-bold">HIPAA</span> y <span className="text-white font-bold">RGPD</span> para garantizar la privacidad de tus pacientes.
                        </p>
                        <div className="flex items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            <span className="text-xs font-medium">Certificado SSL Válido</span>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] bg-emerald-50 p-8 border border-emerald-100 text-center">
                        <p className="text-sm text-emerald-800 font-bold mb-4">¿Necesitas ayuda técnica?</p>
                        <button
                            onClick={() => toast.success('Soporte MdPulso', { description: 'Un agente se pondrá en contacto contigo en breve.' })}
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
