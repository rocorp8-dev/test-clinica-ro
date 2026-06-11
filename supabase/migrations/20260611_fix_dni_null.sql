-- FIX ERROR #5: DNI "null" en Base de Datos
-- Descripción: Limpiar el string literal "null" que aparece en lugar de un DNI válido
-- Fecha: 2026-06-11
-- Autor: RoAnderson

-- IMPORTANTE: La columna dni tiene constraint NOT NULL
-- No podemos usar NULL, generamos DNI temporal único

-- Limpiar dato corrupto: Cambiar string "null" a DNI temporal
UPDATE patients
SET dni = 'TEMP-' || SUBSTRING(id::text, 1, 8)
WHERE dni = 'null';

-- Prevenir futuros inserts con "null" como string
ALTER TABLE patients
DROP CONSTRAINT IF EXISTS dni_not_string_null;

ALTER TABLE patients
ADD CONSTRAINT dni_not_string_null
CHECK (dni != 'null');

-- Verificar resultado
SELECT
    id,
    nombre,
    dni,
    telefono,
    created_at
FROM patients
WHERE dni LIKE 'TEMP-%'
ORDER BY created_at DESC;
