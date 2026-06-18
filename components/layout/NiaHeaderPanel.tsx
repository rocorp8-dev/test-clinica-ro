'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, Mic, MicOff, Loader2, X, CalendarDays, FileText, ClipboardPlus, UserSearch } from 'lucide-react'
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

interface NiaHeaderPanelProps {
    isOpen: boolean
    onClose: () => void
}

export default function NiaHeaderPanel({ isOpen, onClose }: NiaHeaderPanelProps) {
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [doctorName, setDoctorName] = useState('')
    const [isListening, setIsListening] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const recognitionRef = useRef<any>(null)
    const panelRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    const toggleVoice = () => {
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
        recognition.onerror = () => { setIsListening(false); toast.error('Error al escuchar') }
        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript
            setInput(prev => prev ? `${prev} ${transcript}` : transcript)
            inputRef.current?.focus()
        }

        recognitionRef.current = recognition
        recognition.start()
    }

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
            setInput(prompt)
            inputRef.current?.focus()
        } else {
            handleSend(prompt)
        }
    }

    const renderContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (/^(🚨|📌|📈|💡)/.test(line)) {
                return (
                    <p key={i} className="font-black text-emerald-400 mt-4 mb-1.5 first:mt-0 text-[11px] uppercase tracking-wider">
                        {line}
                    </p>
                )
            }
            if (line.startsWith('- ') || line.startsWith('• ')) {
                return <p key={i} className="text-slate-300 pl-3 mb-0.5 text-xs">{line}</p>
            }
            if (!line.trim()) return <br key={i} />
            return <p key={i} className="mb-1 text-sm leading-relaxed">{line}</p>
        })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-14 w-[90vw] sm:w-96 rounded-3xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50 flex flex-col"
                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 'min(600px, 80vh)' }}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.12), transparent)' }}>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Brain className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight">NIA</h3>
                                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Copiloto Clínico</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ background: '#0f172a' }}>
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-4">
                                <p className="text-white font-bold text-sm">
                                    {doctorName ? `Hola, Dr. ${doctorName}` : 'NIA lista'}
                                </p>
                                <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                                    Pregúntame por un paciente, tu agenda, o dime que agregue una nota.
                                </p>

                                {/* Quick Commands */}
                                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                                    {QUICK_COMMANDS.map(({ icon: Icon, label, prompt }) => (
                                        <button
                                            key={label}
                                            onClick={() => handleQuickCommand(prompt)}
                                            className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 px-2.5 py-2 text-[11px] text-slate-300 hover:text-emerald-300 transition-all text-left"
                                        >
                                            <Icon className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{label}</span>
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
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
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
                                <div className="px-4 py-3 rounded-2xl rounded-tl-lg flex items-center gap-2" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                                    <span className="text-xs text-slate-300">Analizando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Commands (cuando hay mensajes) */}
                    {messages.length > 0 && (
                        <div className="px-3 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: '#0f172a' }}>
                            {QUICK_COMMANDS.map(({ icon: Icon, label, prompt }) => (
                                <button
                                    key={label}
                                    onClick={() => handleQuickCommand(prompt)}
                                    className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 px-2.5 py-1.5 text-[10px] text-slate-400 hover:text-emerald-300 transition-all whitespace-nowrap flex-shrink-0"
                                >
                                    <Icon className="h-3 w-3" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/5 flex-shrink-0" style={{ background: '#0f172a' }}>
                        <div className="relative flex items-end gap-2 rounded-xl px-3 py-2 transition-all" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                placeholder="Escribe o usa el micrófono..."
                                className="flex-1 bg-transparent text-white text-sm outline-none resize-none py-2 max-h-24 placeholder:text-slate-500"
                                rows={1}
                            />
                            <div className="flex gap-1 pb-1">
                                {/* Voice Button */}
                                <button
                                    onClick={toggleVoice}
                                    className={`p-2 rounded-lg transition-all ${
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
                                    className="p-2 rounded-lg bg-emerald-500 text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
