-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 04: Nia Clinical Safety Enrichment
-- Redefine la búsqueda de pacientes para incluir alertas de seguridad críticas.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_patients_nia(
    search_query text,
    doctor_id uuid
)
RETURNS TABLE (
    id uuid,
    nombre text,
    dni text,
    alergias text,
    padecimientos text,
    tipo_sangre text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.dni,
        p.alergias,
        p.padecimientos,
        p.tipo_sangre
    FROM public.patients p
    WHERE p.user_id = doctor_id
      AND (
          p.nombre ILIKE search_query OR 
          p.dni ILIKE search_query
      )
    ORDER BY p.nombre ASC
    LIMIT 10;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.search_patients_nia(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_patients_nia(text, uuid) TO service_role;
