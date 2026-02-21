'use client'

import {
    FileText,
    Search,
    Clock,
    Filter,
    ArrowUpRight,
    Database,
    Lock
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'

export default function RecordsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 font-display">Expedientes Electrónicos</h1>
                    <p className="text-slate-500 text-sm italic">Archivo histórico y clínico centralizado</p>
                </div>
            </div>

            <div className="flex h-[60vh] flex-col items-center justify-center rounded-[3rem] bg-white border border-slate-100 shadow-sm p-12 text-center">
                <div className="relative mb-8">
                    <div className="h-24 w-24 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Database className="h-12 w-12" />
                    </div>
                    <div className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-2 border-4 border-white">
                        <Lock className="h-4 w-4 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">Módulo de Cifrado Activo</h2>
                <p className="max-w-md text-slate-500 text-sm mb-8 leading-relaxed">
                    Los expedientes médicos están protegidos con cifrado de grado militar <span className="font-bold text-slate-900">AES-256</span>. Selecciona un paciente del directorio para visualizar su expediente completo.
                </p>
                <div className="flex gap-4">
                    <Link
                        href="/patients"
                        className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        Ver Directorio
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={() => toast.info('Configuración de Seguridad', { description: 'Los parámetros de cifrado están gestionados por el administrador del sistema.' })}
                        className="px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl text-sm border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                        Configurar Acceso
                    </button>
                </div>
            </div>
        </div>
    )
}
