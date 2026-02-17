import {
    FileText,
    Search,
    Download,
    Calendar
} from 'lucide-react'

export default function HistorialPage() {
    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historiales Médicos</h1>
                    <p className="text-slate-500">Expedientes clínicos digitales y reportes.</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50">
                    <Download className="h-4 w-4" />
                    Exportar Reporte
                </button>
            </div>

            {/* Grid of Medical Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EXP-202{i}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Expediente: María García {i}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">Paciente con antecedentes de hipertensión. Última revisión muestra mejoría en niveles de glucosa.</p>

                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                <Calendar className="h-3.5 w-3.5" />
                                Actualizado hoy
                            </div>
                            <button className="text-sm font-bold text-emerald-600 hover:underline transition-all">Ver PDF</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
