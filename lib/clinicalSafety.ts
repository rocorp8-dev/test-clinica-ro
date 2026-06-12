/**
 * NIA Clinical Safety Engine
 * Proporciona utilidades para validar que las respuestas de la IA
 * no omitan riesgos críticos presentes en los datos reales.
 */

export interface ClinicalSafetyData {
    alergias?: string | null;
    padecimientos?: string | null;
    tipo_sangre?: string | null;
    otros_riesgos?: string | null;
}

export interface ValidationResult {
    isValid: boolean;
    detectedAlerts: string[];
    missingInResponse: string[];
    suggestedWarning: string | null;
}

/**
 * Valida una respuesta de texto de la IA contra los datos clínicos reales detectados.
 * @param data Datos clínicos reales.
 * @param aiResponse Respuesta de la IA.
 * @param doctorName Nombre del médico (personalización).
 * @param isClinical Si es TRUE, se fuerza el bloque de alerta siempre que falte info clínica.
 *                   Si es FALSE (Admin), solo alerta si la IA "alucina" que no hay riesgos cuando sí los hay.
 */
export function validateClinicalSafety(
    data: ClinicalSafetyData[], 
    aiResponse: string,
    doctorName: string = "Colega",
    isClinical: boolean = true
): ValidationResult {
    const alertsToVerify: string[] = [];
    
    // Consolidar alertas únicas
    data.forEach(d => {
        if (d.alergias && d.alergias.toLowerCase() !== 'ninguna' && d.alergias.trim() !== '') {
            alertsToVerify.push(`ALERGIA: ${d.alergias}`);
        }
        if (d.padecimientos && d.padecimientos.toLowerCase() !== 'ninguno' && d.padecimientos.trim() !== '') {
            alertsToVerify.push(`PADECIMIENTO: ${d.padecimientos}`);
        }
    });

    if (alertsToVerify.length === 0) {
        return { isValid: true, detectedAlerts: [], missingInResponse: [], suggestedWarning: null };
    }

    const responseLower = aiResponse.toLowerCase();
    
    // Patrones que indican que el modelo "cree" que no hay nada (Hallucinación / False Affirmation)
    const claimEmptyPatterns = [
        /\b(ninguna registrada|sin alergias|no tiene alergias|no se encontraron alergias|no se registran alergias|apto: sin alertas|sin registros en sistema)\b/i,
        /\balergias:\s*(ninguna|no)\b/i
    ];

    const hasClaimOfEmpty = claimEmptyPatterns.some(regex => regex.test(aiResponse));
    const missingAlerts = alertsToVerify.filter(alert => {
        const value = alert.split(': ')[1].toLowerCase();
        return !responseLower.includes(value);
    });

    // REGLA DE VALIDACIÓN CONTEXTUAL (ACTUALIZADA):
    // 1. Si el modelo MIENTE (dice que no hay nada pero sí hay) -> SIEMPRE WARN
    // 2. Si hay ALERGIAS registradas -> SIEMPRE WARN (crítico de seguridad)
    // 3. Si el modelo OMITE padecimientos -> Solo WARN si context es clínico

    let shouldWarn = false;
    let isValid = true;

    const hasAlergias = alertsToVerify.some(a => a.startsWith('ALERGIA:'));
    const missingAlergias = missingAlerts.filter(a => a.startsWith('ALERGIA:'));

    if (hasClaimOfEmpty && alertsToVerify.length > 0) {
        // Alucinación de "sin riesgos" -> Error crítico de integridad.
        shouldWarn = true;
        isValid = false;
    } else if (hasAlergias && missingAlergias.length > 0) {
        // Alergias SIEMPRE se deben mostrar (seguridad crítica), sin importar contexto.
        shouldWarn = true;
        isValid = false;
    } else if (isClinical && missingAlerts.length > 0) {
        // Omisión de padecimientos en contexto clínico -> Precaución necesaria.
        shouldWarn = true;
        isValid = false;
    }

    let suggestedWarning = null;
    if (shouldWarn) {
        suggestedWarning = `🚨 ALERTA DE SEGURIDAD CRÍTICA: Se han detectado riesgos clínicos que NO figuran en el resumen anterior:\n${alertsToVerify.map(a => `• ${a}`).join('\n')}\n\nDr. ${doctorName}, por favor tome las precauciones necesarias de inmediato.`;
    }

    return {
        isValid: !shouldWarn,
        detectedAlerts: alertsToVerify,
        missingInResponse: missingAlerts,
        suggestedWarning
    };
}
