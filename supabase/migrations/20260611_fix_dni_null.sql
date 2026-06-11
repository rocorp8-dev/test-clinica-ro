-- FIX ERROR #5: DNI "null" en Base de Datos
-- Descripción: Limpiar el string literal "null" que aparece en lugar de NULL SQL
-- Fecha: 2026-06-11
-- Autor: RoAnderson

-- Limpiar dato corrupto: Cambiar string "null" a NULL SQL
UPDATE patients
SET dni = NULL
WHERE dni = 'null';

-- Prevenir futuros inserts con "null" como string
ALTER TABLE patients
DROP CONSTRAINT IF EXISTS dni_not_string_null;

ALTER TABLE patients
ADD CONSTRAINT dni_not_string_null
CHECK (dni IS NULL OR dni != 'null');

-- Verificar resultado
SELECT
    id,
    nombre,
    dni,
    telefono,
    created_at
FROM patients
WHERE dni IS NULL
ORDER BY created_at DESC;
