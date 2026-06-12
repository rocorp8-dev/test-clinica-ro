"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X, Info, Copy, CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showSPEI, setShowSPEI] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Básico",
      tag: "Solo médico",
      desc: "Para médicos independientes que quieren digitalizarse sin complicaciones.",
      monthly: 449,
      annual: 359,
      features: [
        { label: "1 médico / cuenta", active: true, highlighted: false },
        { label: "Expediente NOM-004 completo", active: true, highlighted: false },
        { label: "Agenda médica visual", active: true, highlighted: false },
        { label: "Notificaciones en tiempo real", active: true, highlighted: false },
        { label: "Facturación y balance mensual", active: true, highlighted: false },
        { label: "Soporte por WhatsApp", active: true, highlighted: false },
        { label: "NIA copiloto IA", active: false, highlighted: false },
        { label: "Exportación PDF firmada", active: false, highlighted: false },
        { label: "Multi-doctor", active: false, highlighted: false },
      ],
      btnText: "Empezar con Básico",
      color: "border-slate-800",
    },
    {
      name: "Pro+",
      tag: "Recomendado",
      desc: "El sistema completo con IA clínica. Para médicos que quieren lo mejor.",
      monthly: 849,
      annual: 679,
      popular: true,
      features: [
        { label: "NIA copiloto IA clínica", active: true, highlighted: true },
        { label: "Búsqueda semántica de pacientes", active: true, highlighted: true },
        { label: "Alertas de seguridad (alergias)", active: true, highlighted: true },
        { label: "Agenda inteligente (NLP)", active: true, highlighted: true },
        { label: "Exportación PDF del expediente", active: true },
        { label: "Resumen clínico automático", active: true },
        { label: "Auditoría NOM-024 completa", active: true },
        { label: "Multi-doctor", active: false },
      ],
      btnText: "Comenzar con Pro+",
      color: "border-cyan-500/30",
    },
    {
      name: "Clínica",
      tag: "Equipo médico",
      desc: "Para consultorios y clínicas con varios médicos. Gestión centralizada.",
      monthly: 2100,
      annual: 1680,
      features: [
        { label: "Hasta 5 médicos simultáneos", active: true, highlighted: false },
        { label: "Panel administrativo central", active: true, highlighted: false },
        { label: "RLS por médico (datos aislados)", active: true, highlighted: false },
        { label: "Estadísticas de clínica completas", active: true, highlighted: false },
        { label: "Onboarding prioritario", active: true, highlighted: false },
        { label: "Soporte telefónico", active: true, highlighted: false },
      ],
      btnText: "Contactar para Clínica",
      color: "border-slate-800",
    }
  ];

  const speiDetails = {
    clabe: "012180015011204196",
    banco: "BBVA",
    nombre: "Rodolfo Perez Figueroa",
    email: "despacho9@gmail.com"
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Podríamos añadir un toast aquí
  };

  const handlePlanSelection = (planName: string) => {
    setSelectedPlan(planName);
    setShowSPEI(true);
  };

  return (
    <div className="min-h-screen bg-[#050a10] text-[#e8f4ff] font-outfit relative overflow-hidden">
      {/* Background Grid & Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#00c6ff 1px, transparent 1px), linear-gradient(90deg, #00c6ff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute top-[-200px] left-[-200px] w-[700px] height-[700px] rounded-full opacity-[0.12] blur-[120px]" 
             style={{ background: 'radial-gradient(circle, #0072ff 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-200px] right-[-200px] w-[600px] height-[600px] rounded-full opacity-[0.07] blur-[100px]" 
             style={{ background: 'radial-gradient(circle, #00e5a0 0%, transparent 70%)' }} />
      </div>

      <main className="relative z-10 pt-20 pb-20 px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Planes y precios 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-6">
            Invierta en su práctica.<br />
            <span className="italic bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Nosotros hacemos el resto.</span>
          </h1>
          <p className="text-slate-400 text-lg font-light leading-relaxed mb-10">
            Sin contratos a largo plazo. Sin sorpresas. Todos los planes incluyen soporte por WhatsApp y cumplimiento NOM-004/024 garantizado.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${!isAnnual ? 'text-white font-medium' : 'text-slate-500'}`}>Mensual</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-slate-700 p-1 transition-all"
            >
              <div className={`w-5 h-5 rounded-full transition-all duration-300 ${isAnnual ? 'bg-cyan-500 translate-x-7' : 'bg-slate-500 translate-x-0'}`} />
            </button>
            <span className={`text-sm flex items-center gap-2 ${isAnnual ? 'text-white font-medium' : 'text-slate-500'}`}>
              Anual 
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">AHORRA 20%</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-3xl bg-slate-900/40 border ${plan.popular ? 'border-cyan-500/40 shadow-[0_0_40px_-15px_rgba(6,182,212,0.2)]' : 'border-slate-800'} backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-slate-700 group`}
            >
              {plan.popular && (
                <div className="absolute -top-px right-10 px-4 py-1.5 rounded-b-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold tracking-widest uppercase">
                  ⚡ Más popular
                </div>
              )}
              
              <div className="mb-6">
                <span className={`text-[10px] font-mono tracking-widest uppercase mb-2 block ${plan.popular ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {plan.tag}
                </span>
                <h3 className="text-2xl font-serif mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm font-light h-10">{plan.desc}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-slate-400 text-xl font-mono">$</span>
                  <span className="text-4xl font-mono font-medium">
                    {(isAnnual ? plan.annual : plan.monthly).toLocaleString('es-MX')}
                  </span>
                  <span className="text-slate-500 text-sm">/mes</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 font-mono uppercase">
                  {isAnnual ? 'Facturado anualmente' : 'Facturado mensualmente'}
                </div>
              </div>

              <div className="h-px bg-slate-800/50 mb-8" />

              <div className="flex-1 mb-8">
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-4">Incluye</div>
                <ul className="space-y-3">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className={`flex items-start gap-3 text-sm ${feat.active ? 'text-slate-300' : 'text-slate-600'}`}>
                      {feat.active ? (
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feat.highlighted ? 'text-cyan-400' : 'text-emerald-500'}`} />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 shrink-0 text-slate-700" />
                      )}
                      <span className={feat.highlighted ? 'text-cyan-100 font-medium' : ''}>{feat.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => handlePlanSelection(plan.name)}
                className={`w-full py-4 rounded-xl text-sm font-semibold transition-all ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02]' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {plan.btnText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ - Quick */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif mb-12">Preguntas frecuentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h4 className="text-cyan-400 text-sm font-medium mb-2">¿Cómo activo mi plan?</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Tras realizar la transferencia SPEI, envíe su comprobante por WhatsApp o correo. Su cuenta se activará en menos de 30 minutos.</p>
            </div>
            <div>
              <h4 className="text-cyan-400 text-sm font-medium mb-2">¿Cumple con la NOM?</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Absolutamente. MdPulso genera expedientes y auditorías automáticas conforme a NOM-004-SSA3-2012 y NOM-024-SSA3-2010.</p>
            </div>
          </div>
        </div>
      </main>

      {/* SPEI MODAL */}
      {showSPEI && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[#050a10]/80 backdrop-blur-sm" onClick={() => setShowSPEI(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowSPEI(false)}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-serif">Plan {selectedPlan} seleccionado</h3>
              <p className="text-slate-400 text-sm mt-2">Complete su activación mediante transferencia SPEI</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Banco</div>
                <div className="text-white font-medium flex justify-between items-center">
                  {speiDetails.banco}
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 relative group">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">CLABE Interbancaria</div>
                <div className="text-xl font-mono text-cyan-400 flex justify-between items-center">
                  {speiDetails.clabe}
                  <button onClick={() => copyToClipboard(speiDetails.clabe)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Titular</div>
                <div className="text-white font-medium">{speiDetails.nombre}</div>
              </div>
            </div>

            <div className="space-y-4">
              <a 
                href={`https://wa.me/529511454158?text=Hola,%20acabo%20de%20realizar%20la%20transferencia%20para%20el%20plan%20${selectedPlan}`}
                target="_blank"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                Enviar comprobante por WhatsApp
              </a>
              <div className="text-center">
                <span className="text-slate-500 text-[10px] uppercase font-mono tracking-widest">O vía correo:</span>
                <div className="text-slate-300 text-xs mt-1">{speiDetails.email}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-10 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">
          Desarrollado por <Link href="https://despacho9.vercel.app" className="text-slate-500 hover:text-cyan-400">Despacho9</Link> · 2026
        </p>
      </footer>
    </div>
  );
}
