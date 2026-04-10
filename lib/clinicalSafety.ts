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
 */
export function validateClinicalSafety(
    data: ClinicalSafetyData[], 
    aiResponse: string,
    doctorName: string = "Colega"
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
    
    // Patrones que indican que el modelo "cree" que no hay nada
    const claimEmptyPatterns = [
        /\b(ninguna registrada|sin alergias|no tiene alergias|no se encontraron alergias|no se registran alergias|apto: sin alertas)\b/i,
        /\balergias:\s*(ninguna|no)\b/i
    ];

    const hasClaimOfEmpty = claimEmptyPatterns.some(regex => regex.test(aiResponse));
    const missingAlerts = alertsToVerify.filter(alert => {
        const value = alert.split(': ')[1].toLowerCase();
        return !responseLower.includes(value);
    });

    // Si el modelo dice que no hay nada PERO sí hay, o si falta una alerta crítica en la respuesta
    const shouldWarn = (hasClaimOfEmpty && alertsToVerify.length > 0) || (missingAlerts.length > 0 && alertsToVerify.length > 0);

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
