'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, Search, User } from 'lucide-react'

export default function Header() {
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUserEmail(user?.email || 'Doctor Invitado')
        }
        getUser()
    }, [])

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
            <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar pacientes o citas..."
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                />
            </div>

            <div className="flex items-center gap-4">
                <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
                </button>

                <div className="h-8 w-px bg-slate-200 mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-900 leading-tight">Dr. {userEmail?.split('@')[0]}</p>
                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Médico General</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <User className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </header>
    )
}
