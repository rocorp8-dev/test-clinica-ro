'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Brain, Loader2, Maximize2, Minimize2, Mic, MicOff, CalendarDays, FileText, ClipboardPlus, UserSearch } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const QUICK_COMMANDS = [
    { icon: CalendarDays, label: 'Agenda de hoy', prompt: '¿cuál es mi agenda de hoy?' },
    { icon: UserSearch,   label: 'Expediente',    prompt: 'expediente de ' },
    { icon: ClipboardPlus,label: 'Agendar cita',  prompt: 'agendar cita para ' },
    { icon: FileText,     label: 'Agregar nota',  prompt: 'agrega nota médica para ' },
]

export default function NiaAssistant() {
    const [isOpen, setIsOpen]           = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [input, setInput]             = useState('')
    const [messages, setMessages]       = useState<Message[]>([])
    const [isLoading, setIsLoading]     = useState(false)
    const [doctorName, setDoctorName]   = useState('')
    const [isListening, setIsListening] = useState(false)
    const scrollRef  = useRef<HTMLDivElement>(null)
    const inputRef   = useRef<HTMLTextAreaElement>(null)
    const recognitionRef = useRef<any>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
    )

    useEffect(() => {
        const fetchDoctor = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
            const name = profile?.full_name || user.email?.split('@')[0] || 'Doctor'
            setDoctorName(name.replace(/^(Dr\.|Dra\.|Dr\s|Dra\s)\s*/i, '').trim())
        }
        fetchDoctor()
    }, [])

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messages])

    // Voice Input — Web Speech API
    const toggleVoice = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            toast.error('Tu navegador no soporta dictado por voz')
            return
        }

        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop()
            setIsListening(false)
            return
        }

        const recognition = new SpeechRecognition()
        recognition.lang = 'es-MX'
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => setIsListening(true)
        recognition.onend   = () => setIsListening(false)
        recognition.onerror = () => { setIsListening(false); toast.error('Error al escuchar. Intenta de nuevo.') }
        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript
            setInput(prev => prev ? `${prev} ${transcript}` : transcript)
            inputRef.current?.focus()
        }

        recognitionRef.current = recognition
        recognition.start()
    }, [isListening])

    const handleSend = async (msg?: string) => {
        const text = (msg || input).trim()
        if (!text || isLoading) return

        const userMessage: Message = { role: 'user', content: text }
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

            const content = data.choices?.[0]?.message?.content
            if (content) setMessages(prev => [...prev, { role: 'assistant', content }])
        } catch (error) {
            toast.error('NIA: Error de conexión')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickCommand = (prompt: string) => {
        if (prompt.endsWith(' ')) {
            // Prompt parcial — poner en input para que el doctor complete
            setInput(prompt)
            inputRef.current?.focus()
        } else {
            handleSend(prompt)
        }
    }

    // Renderiza el contenido del mensaje con formato mejorado
    const renderContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            // Encabezados de sección con emojis
            if (/^(🚨|📌|📈|💡)/.test(line)) {
                return (
                    <p key={i} className="font-black text-emerald-400 mt-4 mb-1.5 first:mt-0 text-[11px] uppercase tracking-wider">
                        {line}
                    </p>
                )
            }
            // Líneas con bullet points
            if (line.startsWith('- ') || line.startsWith('• ')) {
                return <p key={i} className="text-slate-300 pl-3 mb-0.5 text-xs">{line}</p>
            }
            // Línea vacía
            if (!line.trim()) return <br key={i} />
            // Texto normal
            return <p key={i} className="mb-1 text-sm leading-relaxed">{line}</p>
        })
    }

    return (
        <div className="fixed bottom-24 left-6 z-[60] flex flex-col items-start md:bottom-8 md:left-8">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, height: isMinimized ? '80px' : 'min(640px, 85vh)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="mb-4 w-[calc(100vw-2rem)] sm:w-[420px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.12), transparent)' }}>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-tight">NIA</h3>
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Copiloto Clínico · MdPulso</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Chat Area */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0" style={{ background: '#0f172a' }}>
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                                            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <Sparkles className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-base">
                                                    {doctorName ? `Hola, Dr. ${doctorName}` : 'NIA lista'}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                                                    Pregúntame por un paciente, tu agenda de hoy, o dime que agregue una nota.
                                                </p>
                                            </div>

                                            {/* Quick Commands */}
                                            <div className="grid grid-cols-2 gap-2 w-full mt-2">
                                                {QUICK_COMMANDS.map(({ icon: Icon, label, prompt }) => (
                                                    <button
                                                        key={label}
                                                        onClick={() => handleQuickCommand(prompt)}
                                                        className="flex items-center gap-2 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 px-3 py-2.5 text-xs text-slate-300 hover:text-emerald-300 transition-all text-left"
                                                    >
                                                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                                        {label}
                                                    </button>
                                                ))}
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
                                            <div className={`max-w-[88%] p-4 rounded-3xl text-sm ${
                                                msg.role === 'user'
                                                    ? 'bg-emerald-600 text-white rounded-tr-lg'
                                                    : 'rounded-tl-lg text-white'
                                            }`} style={msg.role === 'assistant' ? { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' } : {}}>
                                                {msg.role === 'assistant'
                                                    ? <div className="space-y-0">{renderContent(msg.content)}</div>
                                                    : <p className="leading-relaxed">{msg.content}</p>
                                                }
                                            </div>
                                        </motion.div>
                                    ))}

                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="px-5 py-4 rounded-3xl rounded-tl-lg flex items-center gap-2" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                                                <span className="text-xs text-slate-300">Analizando...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Commands (cuando ya hay mensajes) */}
                                {messages.length > 0 && (
                                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: '#0f172a' }}>
                                        {QUICK_COMMANDS.map(({ icon: Icon, label, prompt }) => (
                                            <button
                                                key={label}
                                                onClick={() => handleQuickCommand(prompt)}
                                                className="flex items-center gap-1.5 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 px-3 py-1.5 text-[11px] text-slate-400 hover:text-emerald-300 transition-all whitespace-nowrap flex-shrink-0"
                                            >
                                                <Icon className="h-3 w-3" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Input Area */}
                                <div className="p-4 border-t border-white/5 flex-shrink-0" style={{ background: '#0f172a' }}>
                                    <div className="relative flex items-end gap-2 rounded-2xl px-4 py-2 transition-all" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                            placeholder="Escribe o usa el micrófono..."
                                            className="flex-1 bg-transparent text-white text-sm outline-none resize-none py-2 max-h-28 placeholder:text-slate-500"
                                            rows={1}
                                        />
                                        <div className="flex gap-1.5 pb-1">
                                            {/* Voice Button */}
                                            <button
                                                onClick={toggleVoice}
                                                className={`p-2 rounded-xl transition-all ${
                                                    isListening
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : 'text-slate-500 hover:text-white hover:bg-white/10'
                                                }`}
                                                title="Dictado por voz"
                                            >
                                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                            </button>
                                            {/* Send Button */}
                                            <button
                                                onClick={() => handleSend()}
                                                disabled={!input.trim() || isLoading}
                                                className="p-2 rounded-xl bg-emerald-500 text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NIA Bubble */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsOpen(!isOpen); setIsMinimized(false) }}
                className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${
                    isOpen ? 'bg-white text-slate-900 rotate-90' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Brain className="h-7 w-7 sm:h-8 sm:w-8" />}
                {!isOpen && <div className="absolute inset-0 rounded-[1.8rem] bg-emerald-500 animate-ping opacity-20" />}
            </motion.button>
        </div>
    )
}
