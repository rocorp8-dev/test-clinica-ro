'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Mail, Lock, Loader2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            toast.success('¡Bienvenido a MdPulso!', {
                description: 'Acceso autorizado. Cargando tu panel de control...'
            })

            router.push('/')
            router.refresh()
        } catch (err: any) {
            toast.error('Error de acceso', {
                description: err.message || 'Credenciales incorrectas'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
        >
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-200">
                        <Stethoscope className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">MdPulso</h1>
                <p className="text-slate-500 text-sm">Plataforma Profesional de Gestión Médica</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex gap-3 items-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-800">
                    <p className="font-bold">Acceso de Demostración</p>
                    <p>Email: <span className="font-mono">doctor@mdpulso.com</span></p>
                    <p>Pass: <span className="font-mono">Demo1234!</span></p>
                </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Email Profesional</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="nombre@clinica.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                        <Link href="#" className="text-xs text-emerald-600 hover:underline">¿La olvidaste?</Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verificando acceso...
                        </>
                    ) : (
                        <>
                            Entrar al Panel
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="flex flex-col gap-4">
                <Link
                    href="/presentacion"
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-200 active:scale-[0.98]"
                >
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Ver Presentación del Producto
                </Link>

                <div className="text-center">
                    <p className="text-xs text-slate-400">
                        ¿No tienes una cuenta? {' '}
                        <Link href="/register" className="font-bold text-slate-900 hover:text-emerald-600 underline-offset-4 hover:underline transition-colors">
                            Registra tu clínica
                        </Link>
                    </p>
                </div>
            </div>
        </motion.div>
    )
}
