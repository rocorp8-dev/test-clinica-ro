-- ========================================
-- Migration: 08_create_exec_sql_function
-- Date: 2026-06-18
-- Description: Crear función RPC para ejecutar SQL desde el skill supabase-exec
-- ========================================
--
-- IMPORTANTE: Esta función permite que el skill supabase-exec ejecute SQL
-- directamente sin necesidad de copiar/pegar manualmente.
--
-- INSTRUCCIONES:
-- 1. Copia este SQL completo
-- 2. Ve a: https://supabase.com/dashboard/project/xcthxudqelqjfbsupxwo/sql/new
-- 3. Pega el SQL
-- 4. Click en "RUN"
-- 5. ¡Listo! El skill funcionará automáticamente
--
-- ========================================

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_json json;
BEGIN
  -- Ejecutar el query
  EXECUTE query;

  -- Retornar éxito
  RETURN json_build_object(
    'status', 'success',
    'message', 'SQL ejecutado correctamente'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Capturar errores y retornarlos
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.exec_sql(text) IS
'Ejecuta SQL arbitrario. Usado por el skill supabase-exec de RoAnderson.';

-- ========================================
-- VERIFICACIÓN (opcional - puedes ejecutar esto después)
-- ========================================

-- Test 1: Query simple
SELECT public.exec_sql('SELECT current_database()');

-- Test 2: Crear una tabla de prueba
SELECT public.exec_sql('
  CREATE TABLE IF NOT EXISTS test_exec_sql (
    id serial PRIMARY KEY,
    created_at timestamp DEFAULT now()
  )
');

-- Test 3: Verificar que la tabla se creó
SELECT public.exec_sql('
  SELECT count(*) FROM test_exec_sql
');

-- Test 4: Limpiar (eliminar la tabla de prueba)
SELECT public.exec_sql('DROP TABLE IF EXISTS test_exec_sql');
