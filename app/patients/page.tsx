'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
    Plus,
    Search,
    User,
    Phone,
    CreditCard,
    MoreVertical,
    Filter,
    ArrowRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import PatientModal from '@/components/patients/PatientModal'
import PatientDetailModal from '@/components/patients/PatientDetailModal'

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const loadPatients = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', user.id)
                .order('nombre')

            setPatients(data || [])
        } catch (err) {
            toast.error('Error al cargar pacientes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPatients()
    }, [])

    const filteredPatients = patients.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dni.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Cargando base de datos de pacientes...</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 font-display">Directorio de Pacientes</h1>
                    <p className="text-slate-500 text-sm italic">Gestión integral de la base de datos clínica</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Registrar Nuevo Paciente
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Table Toolbar */}
                <div className="flex flex-col md:flex-row p-6 items-center gap-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => toast.info('Filtros Avanzados', { description: 'Los filtros de búsqueda se habilitarán en la próxima actualización del motor.' })}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <Filter className="h-4 w-4" />
                            Filtros
                        </button>
                    </div>
                </div>

                {/* Table Content - Desktop */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-xs font-bold uppercase tracking-widest text-slate-400">
                                <th className="px-8 py-4">Paciente</th>
                                <th className="px-6 py-4">Identificación</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Última Visita</th>
                                <th className="px-8 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPatients.map((patient, i) => (
                                <motion.tr
                                    key={patient.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group hover:bg-emerald-50/10 transition-colors"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold font-display">
                                                {patient.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{patient.nombre}</p>
                                                <p className="text-xs text-slate-500">Paciente activo</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <CreditCard className="h-4 w-4 text-slate-300" />
                                            {patient.dni}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="h-4 w-4 text-slate-300" />
                                            {patient.telefono}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm text-slate-600 italic">No disponible</p>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedPatient(patient)
                                                    setIsDetailOpen(true)
                                                }}
                                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                            >
                                                Expediente
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => toast.info('Opciones de Paciente', {
                                                    description: 'Permisos de edición restringidos por jerarquía clínica.'
                                                })}
                                                className="p-2 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Card Flow - Mobile */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredPatients.map((patient, i) => (
                        <motion.div
                            key={patient.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-5 space-y-4 active:bg-slate-50 transition-colors"
                            onClick={() => {
                                setSelectedPatient(patient)
                                setIsDetailOpen(true)
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                        {patient.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 leading-none mb-1">{patient.nombre}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{patient.dni}</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300" />
                            </div>
                            <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    {patient.telefono}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filteredPatients.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <User className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">No se encontraron pacientes.</p>
                        </div>
                    </div>
                )}
            </div>
            <PatientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadPatients}
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
