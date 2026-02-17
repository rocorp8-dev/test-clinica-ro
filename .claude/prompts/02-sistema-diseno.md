# SISTEMA DE DISEÑO: Tokens Universales

## FUENTE TIPOGRÁFICA
Usar Inter de Google Fonts via next/font en el root layout

## LAYOUT PRINCIPAL (AppLayout)

### Sidebar Desktop (>= 768px)
- Posición: fixed left-0 top-0
- Ancho: w-64
- Altura: h-full (100vh)
- Fondo: bg-white
- Borde: border-r border-slate-200

### Sidebar Mobile (< 768px)
- Componente 'use client' con useState para open/closed
- Al abrir: overlay fixed inset-0 bg-black/50

## COMPONENTES BASE
- Card: bg-white rounded-xl shadow-sm border border-slate-200 p-6
- Botón Primario: bg-{primary}-600 text-white rounded-lg px-4 py-2.5
- Inputs: w-full border border-slate-300 rounded-lg px-3 py-2.5
- Badges: inline-flex items-center rounded-full text-xs font-medium
