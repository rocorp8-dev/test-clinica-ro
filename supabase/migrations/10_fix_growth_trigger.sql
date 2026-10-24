-- Migration #10: Fix growth measurements trigger - correct field name
-- Issue: Trigger was using 'fecha_nacimiento' but field is 'fecha_nac'
-- Date: 2026-06-18

CREATE OR REPLACE FUNCTION auto_calculate_age_months()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  patient_birthdate date;
BEGIN
  -- Obtener fecha de nacimiento del paciente (FIXED: fecha_nac not fecha_nacimiento)
  SELECT fecha_nac INTO patient_birthdate
  FROM patients
  WHERE id = NEW.patient_id;

  -- Si existe fecha de nacimiento, calcular edad en meses
  IF patient_birthdate IS NOT NULL THEN
    NEW.edad_meses := calculate_age_in_months(patient_birthdate, NEW.fecha_medicion);
  ELSE
    RAISE EXCEPTION 'El paciente debe tener fecha de nacimiento registrada';
  END IF;

  -- Actualizar timestamp
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
