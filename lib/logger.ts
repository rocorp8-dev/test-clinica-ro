/**
 * Logger seguro para MDPulso.
 * - En desarrollo: todos los logs visibles (útil para debug)
 * - En producción: solo errores críticos, SIN datos de pacientes
 *
 * Uso: import { logger } from '@/lib/logger'
 *       logger.log('Mensaje de debug')     ← solo en dev
 *       logger.error('Contexto', error)    ← contexto siempre, detalles solo en dev
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
    /** Solo visible en desarrollo local */
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args)
    },

    /** Solo visible en desarrollo local */
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args)
    },

    /**
     * Errores siempre se registran en Vercel logs,
     * pero los datos del error solo en desarrollo (acepta args extra como console.error).
     */
    error: (context: string, ...rest: unknown[]) => {
        if (isDev) {
            console.error(`[MDPulso] ${context}`, ...rest)
        } else {
            // En prod: solo el contexto, sin stack trace ni datos de pacientes
            console.error(`[MDPulso] ${context}`)
        }
    },
}

/**
 * Mensaje de error seguro para responses de API:
 * en dev muestra el detalle, en prod solo un mensaje genérico
 * (nunca exponer datos internos ni de pacientes).
 */
export function safeErrorMessage(err: unknown, fallback = 'Error interno del servidor'): string {
    return isDev && err instanceof Error ? err.message : fallback
}

