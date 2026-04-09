# CLAUDE.md — test-clinica

> Contexto ligero generado por HAM (Hierarchical Agent Memory).
> Archivo canónico completo en: /Users/ro/Documents/RoSaas/template/.claude/

## Identidad del Proyecto

# CONFIG: TEST-CLINICA

## IDENTIDAD
- **Nombre:** Test Clínica SaaS
- **Tagline:** "Gestión médica simplificada y eficiente"
- **Tipo:** SaaS B2B / Dashboard Médico
- **Favicon letra:** C
- **Color primario:** emerald
- **Repo name:** test-clinica-saas

## CREDENCIALES DEMO
- **Email:** admin@testclinica.com
- **Password:** Demo1234!
- **Nombre completo:** Administrador Clínica

## NAVEGACIÓN (Sidebar)
| Label | Icono | Ruta |
|-------|-------|------|
| Inicio | Home | / |
| Pacientes | Users | /pacientes |
| Citas | Calendar | /citas |
| Historial | FileText | /historial |

## MODELO DE DATOS
### Tabla: pacientes
CREATE TABLE pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE NOT NULL,
  telefono text,
  created_at timestamptz DEFAULT now()
);

### Tabla: citas
CREATE TABLE citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  fecha timestamptz NOT NULL,

## Estado Actual



## Stack
- Next.js 15+ App Router, TypeScript, Tailwind CSS v4
- Supabase (Auth + RLS), Zustand, Vercel
- IA: Cerebras (primario) → Groq → OpenRouter

## Reglas de Ejecución
- CERO preguntas — decisiones ejecutivas
- CERO placeholders — código 100% funcional
- Arquitectura Feature-First: src/features/[feature]/
- getUser() NUNCA getSession()
- Env vars SIEMPRE con fallback string
- No .claude/ ni secrets al repo

## Blueprints activos para este proyecto

- .claude/blueprints/schema-patterns.md (DB patterns)
- .claude/blueprints/auth-blueprint.md (Auth Supabase)
- .claude/blueprints/ai-provider.md (Cerebras→Groq→OpenRouter)

## Base de conocimiento
Antes de empezar, lee:
- /Users/ro/Documents/RoSaas/template/.claude/prompts/lessons-learned.md
- /Users/ro/Documents/RoSaas/template/.claude/prompts/squad-dispatcher.md

Lecciones críticas para este proyecto: #1 (env vars), #3 (RLS), #4 (timestamps), #8 (updated_at trigger), #9 (hydration)

## Squad
Declara tu rol antes de cada tarea (ver squad-dispatcher.md).
