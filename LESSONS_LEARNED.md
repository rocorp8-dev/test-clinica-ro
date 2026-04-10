# Lessons Learned: Nia Clinical Assistant 🧠 (Versión Completa)

Este documento centraliza el conocimiento técnico y estratégico adquirido en el despliegue del SaaS clínico. Es la base para replicar este éxito en futuros proyectos.

## 🛠️ Infraestructura y DevOps

### 1. Migraciones SQL Idempotentes y Robustas
- **El problema:** Las migraciones iniciales fallaban al intentar recrear tablas o políticas ya existentes (Error 42710).
- **Lección:** Usa siempre bloques lógicos de "Auto-reparación":
  - `ALTER TABLE ADD COLUMN IF NOT EXISTS ...`
  - `DROP POLICY IF EXISTS ...`
  - Este enfoque permite ejecutar el mismo script 100 veces sin romper nada.

### 2. Gestión Remota vía Supabase Management API
- **Herramienta:** El token `sbp_...` permite configurar la base de datos sin entrar a la consola web.
- **Uso:** Sirve para apagar confirmaciones de correo (`mailer_autoconfirm`) o actualizar URLs de redirección (`site_url`) programáticamente. Es la clave para un despliegue "Hands-off" para el usuario.

### 3. Autenticación y Redirecciones en Vercel
- **Site URL:** Debe ser la URL de producción (`mdpulso.vercel.app`).
- **Callback URLs:** Usa comodines (`*.vercel.app/**`) para que las ramas de desarrollo y previsualización no se rompan.
- **localhost:** Si el correo de confirmación manda a localhost, es porque el `Site URL` en Supabase no se actualizó al de producción.

---

## 🤖 IA Crítica y Asistencial (Nia)

### 4. Inteligencia de Resolución de Datos ("Auto-Healing")
- **Concepto:** Nia debe ser capaz de "traducir" lo que dice el doctor (lenguaje humano) a lo que entiende la BD (UUIDs).
- **Técnica:** Si el objeto de la herramienta recibe un Nombre, el código debe buscar automáticamente el ID en la tabla `patients`. Si no lo encuentra, debe pedir aclaración pero nunca intentar una inserción fallida.

### 5. Prevención de Salidas "Crudas" (JSON Leak)
- **Escenario:** A veces la IA devuelve el JSON de la herramienta en lugar del reporte clínico.
- **Solución:** Implementar validaciones en el servidor que verifiquen si la respuesta de la IA contiene bloques de código JSON no procesados y, en su caso, forzar una re-sentencia o un formateo humanizado.

---

## ⚖️ Cumplimiento Médico (NOM-004-SSA3-2012)

### 6. Estructura de Datos Segregada
- No guardes todo en una columna de "notas". La norma exige campos específicos:
  - `subjetivo`, `objetivo`, `analisis`, `plan` (Formato SOAP).
  - `cie10` (Código internacional de enfermedades).
  - `vitals` (Tensión, Temperatura, Peso, Talla).
- **Lección:** Segregar los datos desde el día 1 facilita auditorias y la generación de expedientes legales automáticos.

---

## 📈 Producto y Experiencia de Usuario (UX)

### 7. Manejo de Fechas y Agenda
- **Never trust a string:** No uses `.split('T')` para mostrar horas en la UI.
- **Usa el objeto Date:** `new Date(string).toLocaleTimeString()` es la única forma de garantizar que el médico en CDMX y el de Tijuana vean la misma hora en su contexto local.

### 8. El Modal de Edición (Cierre de Cobros)
- Un error de $25 vs $250 es crítico. 
- **Lección:** La facilidad para editar registros financieros pasados (con privilegios de doctor) aumenta la confianza del usuario en el sistema.

---

## 💡 Lecciones de Gestión de Proyecto con Antigravity

### 9. Uso de MCP para Configuración Directa
- **Aprendizaje:** Si el usuario no encuentra un menú en el Dashboard (ej. Auth de Supabase), Antigravity puede usar herramientas MCP (curl/API) para hacer el cambio directamente por él, eliminando la frustración técnica.

### 10. Documentación Viva (Walkthroughs)
- **Aprendizaje:** Actualizar el archivo de "Lessons Learned" al final de cada tarea importante asegura que el conocimiento no se pierda y permite que la IA y el usuario estén siempre en la misma página de "Mejores Prácticas".

---

> [!TIP]
> **Checklist de Calidad para nuevos módulos:**
> - [ ] ¿Manejo local de Timezones verificado?
> - [ ] ¿Logs de errores de IA capturados en Supabase?
> - [ ] ¿Campos obligatorios de la NOM-004 mapeados?
> - [ ] ¿Confirmación de correo automática o manual (y Site URL actualizado)?

¡Nia Clinical Assistant es ahora el estándar de oro para tus próximos proyectos SaaS! 🚀✨
