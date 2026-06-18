'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { TrendingUp, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GrowthTabProps {
  patient: any
}

interface Measurement {
  id: string
  fecha_medicion: string
  edad_meses: number
  peso_kg: number | null
  talla_cm: number | null
  perimetro_cefalico_cm: number | null
  notas: string | null
}

export default function GrowthTab({ patient }: GrowthTabProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newMeasurement, setNewMeasurement] = useState({
    peso_kg: '',
    talla_cm: '',
    perimetro_cefalico_cm: '',
    notas: ''
  })

  const loadMeasurements = async () => {
    try {
      const res = await fetch(`/api/growth?patient_id=${patient.id}`)
      const data = await res.json()
      if (res.ok) {
        setMeasurements(data.measurements || [])
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar mediciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMeasurements()
  }, [patient.id])

  const handleAddMeasurement = async () => {
    // Validar que al menos un campo tenga valor
    if (!newMeasurement.peso_kg && !newMeasurement.talla_cm && !newMeasurement.perimetro_cefalico_cm) {
      toast.error('Ingresa al menos una medición')
      return
    }

    try {
      setIsAdding(true)
      const res = await fetch('/api/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.id,
          peso_kg: newMeasurement.peso_kg ? parseFloat(newMeasurement.peso_kg) : null,
          talla_cm: newMeasurement.talla_cm ? parseFloat(newMeasurement.talla_cm) : null,
          perimetro_cefalico_cm: newMeasurement.perimetro_cefalico_cm ? parseFloat(newMeasurement.perimetro_cefalico_cm) : null,
          notas: newMeasurement.notas || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Medición registrada')
        setNewMeasurement({ peso_kg: '', talla_cm: '', perimetro_cefalico_cm: '', notas: '' })
        loadMeasurements()
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar medición')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('¿Eliminar esta medición?')) return

    try {
      const res = await fetch(`/api/growth?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Medición eliminada')
        loadMeasurements()
      } else {
        const data = await res.json()
        toast.error(data.error)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar medición')
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatEdad = (meses: number) => {
    const años = Math.floor(meses / 12)
    const mesesRestantes = meses % 12
    if (años === 0) return `${meses}m`
    if (mesesRestantes === 0) return `${años}a`
    return `${años}a ${mesesRestantes}m`
  }

  // Verificar si el paciente tiene fecha de nacimiento
  if (!patient.fecha_nac) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          Falta Fecha de Nacimiento
        </h3>
        <p className="text-sm text-slate-600 max-w-md">
          Para registrar mediciones de crecimiento, primero debes agregar la fecha de nacimiento del paciente.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">Gráfica de Crecimiento</h3>
          <p className="text-xs text-slate-500">
            Monitoreo antropométrico pediátrico
          </p>
        </div>
      </div>

      {/* Formulario Nueva Medición */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-6"
      >
        <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Medición
        </h4>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="100"
              placeholder="12.5"
              value={newMeasurement.peso_kg}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, peso_kg: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Talla (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="30"
              max="200"
              placeholder="85.5"
              value={newMeasurement.talla_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, talla_cm: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              P. Cefálico (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="60"
              placeholder="48.2"
              value={newMeasurement.perimetro_cefalico_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, perimetro_cefalico_cm: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Observaciones..."
            value={newMeasurement.notas}
            onChange={(e) => setNewMeasurement({ ...newMeasurement, notas: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm resize-none"
          />
        </div>

        <button
          onClick={handleAddMeasurement}
          disabled={isAdding}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Guardar Medición
            </>
          )}
        </button>
      </motion.div>

      {/* Tabla de Mediciones */}
      {measurements.length === 0 ? (
        <div className="text-center py-12 px-6">
          <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-500">
            No hay mediciones registradas. Agrega la primera medición arriba.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">
                    Edad
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                    Peso (kg)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                    Talla (cm)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                    P.C. (cm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">
                    Notas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {measurements.map((m) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatFecha(m.fecha_medicion)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">
                        {formatEdad(m.edad_meses)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-700">
                        {m.peso_kg ? `${m.peso_kg} kg` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-700">
                        {m.talla_cm ? `${m.talla_cm} cm` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-700">
                        {m.perimetro_cefalico_cm ? `${m.perimetro_cefalico_cm} cm` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {m.notas || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteMeasurement(m.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Eliminar medición"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
