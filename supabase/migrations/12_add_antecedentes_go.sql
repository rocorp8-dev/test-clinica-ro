-- Migración: Agregar columna antecedentes_go a medical_notes
-- Fecha: 2026-07-31
-- Propósito: Agregar campo de Antecedentes Gineco-Obstétricos para notas de primera vez
-- Solicitado por: Dra. Dora

-- Agregar columna a la tabla medical_notes
ALTER TABLE medical_notes
ADD COLUMN IF NOT EXISTS antecedentes_go text;

-- Comentario descriptivo
COMMENT ON COLUMN medical_notes.antecedentes_go IS 'Antecedentes Gineco-Obstétricos: Menarca, FUM, gestas, partos, cesáreas, abortos, menopausia, método anticonceptivo. Usado principalmente en notas de primera vez.';
