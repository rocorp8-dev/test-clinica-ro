# Lecciones Aprendidas (Lessons Learned) - Proyecto Test-Clínica

Este documento captura los aprendizajes más importantes sobre el comportamiento de modelos pequeños (especialmente `llama3.1-8b`) y la integración con la base de datos Supabase/PostgreSQL. Sirve como referencia técnica para evitar regresiones y diseñar mejores prompts o defensas en futuras iteraciones.

---

## 1. Alucinaciones de Tool Chains por "tool_choice" rígido
- **El Problema**: Originalmente, después de que el modelo ejecutara la herramienta `search_patients`, nuestro código backend forzaba `tool_choice: "none"`. Esto "esposaba" al agente y le prohibía, de manera forzosa, intentar usar una segunda herramienta (como `create_appointment`). Al verse acorralado e imposibilitado de usar herramientas, el agente se limitaba a *alucinar* una respuesta en texto diciendo "he agendado la cita".
- **La Solución**: Cambiar el loop a `tool_choice: "auto"`. Esto le permite al agente decidir por sí mismo invocar una secuencia completa de herramientas antes de detener el ciclo y devolver un resultado.
- **Lección**: Nunca asumas ciclos de vida o de interacciones de "una sola herramienta". Si el agente tiene que investigar (UUID) para luego operar (Agendar), el `tool_choice` siempre debe ser dinámico u `"auto"`.

## 2. Inyecciones de Parámetros Inexistentes (Amnesia de Props)
- **El Problema**: Los LLMs pequeños (como `llama3.1-8b`) no son consistentes con los esquemas JSON de las funciones. En lugar de mandar el parámetro `patient_id: "uuid-xxxx"`, se brincaban el paso por pereza. Al ver la orden del usuario "agenda a roberto cruz", inventaban sus propias llaves en el JSON, enviando algo como `"nombre": "roberto cruz"`, olvidando por completo el `patient_id`. Esto causaba una excepción `TypeError` ("undefined is not an object (evaluating 'replace')") rompiendo el flujo.
- **La Solución (Auto-Healing)**: Se implementó un "escudo de sanación" dentro de la herramienta `create_appointment`:
  ```javascript
  let patientParam = args.patient_id || args.nombre || args.paciente || args.query;
  ```
- **Lección**: Los parámetros requeridos siempre deben tener validadores defensivos (fallbacks lógicos). Nunca confíes ciegamente en que el LLM respetará la estructura estricta impuesta por el schema; el auto-healing tras bastidores es obligatorio para modelos de menos de 70B de parámetros.

## 3. Discrepancia del Operador LIKE en Timestamps (Postgres Error 42883)
- **El Problema**: Al consultar la base de datos para prevenir *overlaps* o conflictos de citas en intervalos de 45 minutos usando `.like('fecha', "2026-04-11%...")`, Supabase arrojaba el error fatal: `operator does not exist: timestamp with time zone ~~ unknown`. PostgREST no soporta el operador `like` de strings nativamente sobre campos temporales sin casteos complejos.
- **La Solución**: Convertir la búsqueda en un bloque de matemáticas de tiempo exactas empleando rangos `.gte` (00:00:00) y `.lte` (23:59:59).
- **Lección**: Jamás busques patrones de texto en columnas Timestamp. La IA además generalizaba este error interno y lo comunicaba al médico cínicamente como: *"Se detectó un conflicto de horario"*. 

## 4. Corrupción de Timestamps por Doble Offset
- **El Problema**: Para garantizar que la base de datos estuviera usando la zona horaria CDMX, el backend agregaba artificialmente `-06:00` usando un Regex (`/\d$/.test`). El problema surgió porque a veces el LLM sí generaba correctamente la fecha final agregando explícitamente él mismo el offset `-06:00`. El backend le agregaba otro `-06:00` al final, mutando el string a `2026-04-11T11:00:00-06:00-06:00`. Esto en JS genera un `Invalid Date`.
- **La Solución**: Antes de concatenar tiempos, validar de forma exhaustiva si el string ya contiene un carácter `+`, un caracter final `Z` o un guión de timezone más allá de la fecha central. Adicionalmente de usar un chequeo si el objecto Date es `NaN` para atraparlo explícitamente y mostrarlo al AI.
- **Lección**: Los procesos de sanitización de inputs *siempre* deben ser idempotentes (poder pasarse múltiples veces por el mismo dato sin corromperlo). 

---
**Conclusión de Sesión:**
La delegación de "Sanitización y Búsqueda" sacada del razonamiento del modelo y movida hacia el "Auto-Healing" del Backend es el factor crucial para lograr que cualquier modelo Open Source compita con la estabilidad de GPT-4o.
