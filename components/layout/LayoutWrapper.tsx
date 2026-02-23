'use client'

import { usePathname } from 'next/navigation'
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Toaster } from 'sonner'
import { Inter, Outfit } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

import { useState } from 'react'

import MobileNav from "@/components/layout/MobileNav";
import NiaAssistant from "@/components/layout/NiaAssistant";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

    if (isAuthPage) {
        return (
            <body className={`${inter.variable} ${outfit.variable} antialiased font-sans`}>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </body>
        )
    }

    return (
        <body className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 text-slate-900 font-sans`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="md:pl-72 flex flex-col min-h-screen">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 pb-24 md:p-8 max-w-[1600px] mx-auto w-full overflow-x-hidden">
                    {children}
                </main>
            </div>
            <MobileNav />
            <NiaAssistant />
            <Toaster position="bottom-center" richColors closeButton />
        </body>
    )
}
