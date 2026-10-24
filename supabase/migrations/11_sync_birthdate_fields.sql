-- Migration #11: Sync birthdate data between fecha_nac and fecha_nacimiento
-- Issue: Migration #02 created fecha_nac, Migration #09 created fecha_nacimiento
-- Result: Patients have data in fecha_nac but trigger looks for fecha_nacimiento
-- Solution: Copy data from fecha_nac to fecha_nacimiento
-- Date: 2026-06-18

-- Step 1: Copy existing birthdates from fecha_nac to fecha_nacimiento
UPDATE patients
SET fecha_nacimiento = fecha_nac
WHERE fecha_nac IS NOT NULL
  AND (fecha_nacimiento IS NULL OR fecha_nacimiento != fecha_nac);

-- Step 2: Create trigger to keep both fields in sync going forward
CREATE OR REPLACE FUNCTION sync_birthdate_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If fecha_nac is set, copy to fecha_nacimiento
  IF NEW.fecha_nac IS NOT NULL THEN
    NEW.fecha_nacimiento := NEW.fecha_nac;
  END IF;

  -- If fecha_nacimiento is set but fecha_nac is not, copy to fecha_nac
  IF NEW.fecha_nacimiento IS NOT NULL AND NEW.fecha_nac IS NULL THEN
    NEW.fecha_nac := NEW.fecha_nacimiento;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS sync_birthdate_trigger ON patients;
CREATE TRIGGER sync_birthdate_trigger
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION sync_birthdate_fields();
