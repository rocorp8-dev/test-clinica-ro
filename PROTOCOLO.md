# PROTOCOLO DE DESARROLLO: TEST-CLINICA

## FASE 1: INITIAL SETUP (🏗️)
1. **Initialize Next.js**: Crear estructura base con App Router, Tailwind y TypeScript.
2. **Supabase Integration**: Configurar cliente de Supabase y variables de entorno.
3. **Database Schema**: Ejecutar las queries de `CONFIG.md` en Supabase.

## FASE 2: AUTH & LAYOUT (🔐)
1. **Sistema de Auth**: Implementar Login, Registro y Sign Out.
2. **Middleware**: Proteger rutas del dashboard.
3. **Sidebar & Layout**: Construir la navegación definida en `CONFIG.md` usando el color primario especificado.

## FASE 3: DASHBOARD & MÓDULOS (🖥️)
1. **Página de Pacientes**: Tabla con CRUD básico.
2. **Agenda de Citas**: Listado y creación de citas médicas.
3. **Estadísticas**: Dashboard con contadores de pacientes y citas.

## FASE 4: POLISHING & DEPLOY (🚀)
1. **UI/UX**: Refinar sombras, gradientes y micro-interacciones (Premium Style).
2. **Git**: Initialize repo, commit y push a GitHub.
3. **Vercel**: Deploy final y verificación de URL.

---
**REGLA:** No pasar a la siguiente fase sin validar que la anterior funciona al 100%.
