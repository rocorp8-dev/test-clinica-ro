'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
    { label: 'Inicio', icon: Home, href: '/' },
    { label: 'Pacientes', icon: Users, href: '/patients' },
    { label: 'Agenda', icon: Calendar, href: '/appointments' },
    { label: 'Cobros', icon: DollarSign, href: '/billing' },
]

export default function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 md:hidden px-4 pb-safe-area-inset-bottom">
            <div className="flex justify-between items-center h-16 max-w-lg mx-auto">
                {navItems.map((item, i) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-90 transition-transform"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`p-1 rounded-xl transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? 'fill-emerald-50' : ''}`} />
                            </motion.div>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                            >
                                {item.label}
                            </motion.span>
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -top-[1px] h-[3px] w-8 bg-emerald-600 rounded-full"
                                    transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
