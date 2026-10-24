'use client'

import { useState } from 'react'
import { CalendarPlus, BadgeCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AdminActionsProps {
    userId: string
    adminKey: string
}

export default function AdminActions({ userId, adminKey }: AdminActionsProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const runAction = async (action: 'extend_trial' | 'activate') => {
        setLoading(action)
        try {
            const res = await fetch('/api/admin/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                body: JSON.stringify({ action, user_id: userId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error en la acción')

            toast.success(action === 'extend_trial' ? 'Trial extendido +30 días' : 'Cuenta activada manualmente')
            // Refrescar la tabla del server component
            window.location.reload()
        } catch (err) {
            toast.error('Error', { description: err instanceof Error ? err.message : 'Intenta de nuevo' })
            setLoading(null)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => runAction('extend_trial')}
                disabled={loading !== null}
                title="Extender trial +30 días"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 hover:border-slate-600 transition-all disabled:opacity-50"
            >
                {loading === 'extend_trial' ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <CalendarPlus size={12} />
                )}
                Extender trial
            </button>
            <button
                onClick={() => runAction('activate')}
                disabled={loading !== null}
                title="Activar manualmente (pago SPEI)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
                {loading === 'activate' ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <BadgeCheck size={12} />
                )}
                Activar manualmente
            </button>
        </div>
    )
}
