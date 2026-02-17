'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    Filter,
    Loader2
} from 'lucide-react'
import PatientModal from '@/components/patients/PatientModal'

interface Patient {
    id: string
    nombre: string
    dni: string
    telefono: string
    created_at: string
}

export default function PacientesPage() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchPatients = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching patients:', error)
        } else {
            setPatients(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPatients()
    }, [])

    const filteredPatients = patients.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.telefono?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Pacientes</h1>
                    <p className="text-slate-500">Administra el historial y datos de tus pacientes.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Paciente
                </button>
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Table Filters */}
                <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
                    <div className="relative w-full max-sm mb-4 sm:mb-0">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, DNI o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <Filter className="h-4 w-4" />
                        Filtros
                    </button>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-3">
                            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                            <p className="text-sm font-medium text-slate-500">Cargando pacientes...</p>
                        </div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No se encontraron pacientes</h3>
                            <p className="text-sm text-slate-500 max-w-[280px] mt-1">
                                {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Empieza por registrar a tu primer paciente.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">DNI</th>
                                    <th className="px-6 py-4">Teléfono</th>
                                    <th className="px-6 py-4">F. Registro</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                                    {patient.nombre.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{patient.nombre}</p>
                                                    <p className="text-xs text-slate-500">Paciente Digital</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600 font-mono">{patient.dni}</td>
                                        <td className="px-6 py-4 text-slate-600">{patient.telefono || '—'}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(patient.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm transition-all">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Info */}
                {!loading && filteredPatients.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 p-4">
                        <p className="text-xs text-slate-500">Mostrando {filteredPatients.length} pacientes</p>
                    </div>
                )}
            </div>

            <PatientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPatients}
            />
        </div>
    )
}
