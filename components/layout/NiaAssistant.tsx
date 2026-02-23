'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Brain, Loader2, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function NiaAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [doctorName, setDoctorName] = useState<string>('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchDoctor = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single()
            if (profile?.full_name) {
                const cleanName = profile.full_name.replace(/^(Dr\.|Dra\.|Dr\s|Dra\s)\s*/i, '');
                setDoctorName(cleanName)
            } else {
                setDoctorName(user.email?.split('@')[0] || 'Doctor')
            }
        }
        fetchDoctor()
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/nia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Error en NIA')

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.choices[0].message.content
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            toast.error('NIA: Error de conexión', {
                description: 'No se pudo procesar el análisis clínico.'
            })
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-20 right-4 z-[60] sm:bottom-6 sm:right-6 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            height: isMinimized ? '80px' : 'min(600px, 80vh)'
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`mb-4 w-[calc(100vw-2rem)] sm:w-[400px] bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col transition-all duration-300`}
                    >
                        {/* Header Nia */}
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-tight">NIA</h3>
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Neural Interface Assistant</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 text-white/40 hover:text-white transition-colors"
                                >
                                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-white/40 hover:text-white transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Chat Area */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                                >
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10">
                                            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                                                <Sparkles className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-white font-bold">
                                                    {doctorName ? `Hola, Dr. ${doctorName}` : 'NIA lista'}
                                                </p>
                                                <p className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">
                                                    Copiloto Clínico de Élite
                                                </p>
                                                <p className="text-xs text-slate-400 max-w-[200px]">
                                                    Pregúntame sobre un paciente, historial o agenda para hoy.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] p-4 rounded-3xl text-sm ${msg.role === 'user'
                                                ? 'bg-emerald-600 text-white rounded-tr-none'
                                                : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none leading-relaxed'
                                                }`}>
                                                <div className="whitespace-pre-wrap">
                                                    {msg.content.split('\n').map((line, idx) => {
                                                        if (line.startsWith('1. 🚨') || line.startsWith('2. 📌') || line.startsWith('3. 📈') || line.startsWith('4. 💡')) {
                                                            return <p key={idx} className="font-black text-emerald-400 mt-4 mb-2 first:mt-0 uppercase tracking-wider text-[11px]">{line}</p>
                                                        }
                                                        return <p key={idx} className="mb-1">{line}</p>
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/5">
                                                <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white/5 border-t border-white/5">
                                    <div className="relative flex items-center gap-2 bg-slate-800 rounded-2xl px-4 py-2 border border-white/5 focus-within:border-emerald-500/50 transition-all">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSend()
                                                }
                                            }}
                                            placeholder="Pegar datos del paciente..."
                                            className="flex-1 bg-transparent text-white text-sm outline-none resize-none py-2 max-h-32 custom-scrollbar placeholder:text-slate-500"
                                            rows={1}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!input.trim() || isLoading}
                                            className="p-2 rounded-xl bg-emerald-500 text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NIA Bubble Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(!isOpen)
                    setIsMinimized(false)
                }}
                className={`h-14 w-14 sm:h-16 sm:w-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${isOpen
                    ? 'bg-white text-slate-900 rotate-90'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Brain className="h-7 w-7 sm:h-8 sm:w-8" />}
                {/* Glow effect */}
                {!isOpen && (
                    <div className="absolute inset-0 rounded-[1.8rem] bg-emerald-500 animate-ping opacity-20" />
                )}
            </motion.button>
        </div>
    )
}
