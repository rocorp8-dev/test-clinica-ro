'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Users,
    Calendar,
    FileText,
    LogOut,
    Stethoscope,
    ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
    { label: 'Inicio', icon: Home, href: '/' },
    { label: 'Pacientes', icon: Users, href: '/pacientes' },
    { label: 'Citas', icon: Calendar, href: '/citas' },
    { label: 'Historial', icon: FileText, href: '/historial' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // No mostrar sidebar en login o registro
    if (pathname === '/login' || pathname === '/register') return null

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
            <div className="flex h-full flex-col px-4 py-6">
                {/* Logo */}
                <div className="mb-10 flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                        <Stethoscope className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                        Test<span className="text-emerald-600">Clínica</span>
                    </span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-colors",
                                        isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                                    )} />
                                    {item.label}
                                </div>
                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* User / SignOut */}
                <div className="mt-auto border-t border-slate-100 pt-6">
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-700"
                    >
                        <LogOut className="h-5 w-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </aside>
    )
}
