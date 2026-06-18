-- Crear función ejecutora de SQL (sin delimiters problemáticos)
-- Usar LANGUAGE SQL con wrapper plpgsql inline

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  result_json json;
BEGIN
  EXECUTE query;
  RETURN json_build_object(''status'', ''success'', ''message'', ''SQL ejecutado correctamente'');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(''status'', ''error'', ''message'', SQLERRM, ''detail'', SQLSTATE);
END;
';
