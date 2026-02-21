'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LogOut,
    Stethoscope,
    ChevronRight,
    ShieldHalf,
    DollarSign
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const menuItems = [
    { icon: LayoutDashboard, label: 'Panel Principal', href: '/' },
    { icon: Users, label: 'Pacientes', href: '/patients' },
    { icon: Calendar, label: 'Agenda Médica', href: '/appointments' },
    { icon: ShieldHalf, label: 'Expedientes', href: '/records' },
    { icon: DollarSign, label: 'Cobros', href: '/billing' },
]

interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleLogout = async () => {
        await supabase.auth.signOut()
        toast.info('Sesión cerrada correctamente')
        window.location.href = '/login'
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 z-50 h-[100dvh] w-72 border-r border-slate-200 bg-slate-900 text-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}>
                <div className="flex h-full flex-col px-4 py-8">
                    {/* Brand */}
                    <div className="mb-10 flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/20 ring-1 ring-white/10">
                                <Stethoscope className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight font-display italic">MdPulso</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-2xl p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden transition-colors border border-slate-800"
                        >
                            <ChevronRight className="h-6 w-6 rotate-180" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                        {item.label}
                                    </div>
                                    {isActive && (
                                        <motion.div layoutId="sidebar-active" className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-800 pt-6 space-y-1">
                        <Link
                            href="/settings"
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
                        >
                            <Settings className="h-5 w-5" />
                            Configuración
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
                        >
                            <LogOut className="h-5 w-5" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
