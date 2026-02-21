import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Bell, Search, User, Sparkles, Menu, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface HeaderProps {
    onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [userName, setUserName] = useState<string>('Cargando...')
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()

                setUserName(profile?.full_name || user.email?.split('@')[0] || 'Doctor')
            } else {
                setUserName('Doctor Invitado')
            }
        }
        getUserData()
    }, [])

    return (
        <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 md:px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 md:hidden"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="relative w-40 sm:w-64 lg:w-96 group hidden md:block">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                toast.info('Búsqueda global', { description: `Buscando "${(e.target as HTMLInputElement).value}" en toda la plataforma...` })
                            }
                        }}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                    />
                </div>

                <div className="flex md:hidden items-center justify-center h-10 w-10 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                    <Stethoscope className="h-6 w-6 text-white" />
                </div>

                <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100/50">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">MdPulso Pro+</span>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="flex gap-1 md:gap-2">
                    <button
                        onClick={() => toast('Notificaciones', { description: 'No tienes mensajes nuevos en este momento.' })}
                        className="relative rounded-2xl p-2 md:p-2.5 text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all active:scale-95"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-2.5 top-2.5 md:right-3 md:top-3 h-2 w-2 rounded-full bg-red-500 border-2 border-white ring-2 ring-red-500/20" />
                    </button>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-900 leading-none mb-1">{userName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Director Médico</p>
                    </div>
                    <Link
                        href="/settings"
                        className="h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-0.5 shadow-sm border border-slate-200 transition-transform active:scale-95 group"
                    >
                        <div className="flex h-full w-full items-center justify-center rounded-[0.85rem] bg-white text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <User className="h-5 w-5" />
                        </div>
                    </Link>
                </div>
            </div>
        </header>
    )
}
