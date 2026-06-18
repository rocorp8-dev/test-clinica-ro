# Guía de Configuración MCP Supabase

## 🎯 Objetivo
Permitir que Claude (RoAnderson) pueda ejecutar SQL directamente en Supabase sin necesidad de copiar/pegar comandos manualmente.

---

## 📋 Problema Actual

El MCP de Supabase está configurado con un **Publishable Key** que solo permite:
- ✅ Leer datos (consultas SELECT)
- ❌ Ejecutar SQL (CREATE TABLE, ALTER TABLE, INSERT, etc.)

### Error que aparece:
```
Error: Your account does not have the necessary privileges to access this endpoint
```

---

## ✅ Solución: Usar Personal Access Token

### Paso 1: Generar Personal Access Token

1. Ve a tu cuenta de Supabase:
   https://supabase.com/dashboard/account/tokens

2. Click en **"Generate New Token"**

3. Configuración del token:
   - **Name**: `Claude MCP Access`
   - **Scopes**: Selecciona todos (o al menos: `all`)
   - **Expiration**: Never (o el tiempo que prefieras)

4. Copia el token generado (se ve así: `sbp_xxxxxxxxxxxxx...`)
   - ⚠️ **IMPORTANTE**: Guárdalo en un lugar seguro, solo se muestra una vez

### Paso 2: Actualizar claude_desktop_config.json

1. Abre el archivo de configuración:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Busca la sección `"supabase"` y reemplázala con:
   ```json
   "supabase": {
     "command": "npx",
     "args": [
       "-y",
       "@supabase/mcp-server-supabase@latest"
     ],
     "env": {
       "SUPABASE_ACCESS_TOKEN": "sbp_TU_TOKEN_AQUI"
     }
   }
   ```

3. Reemplaza `sbp_TU_TOKEN_AQUI` con el token que copiaste en el Paso 1

4. Guarda el archivo (⌘+S)

### Paso 3: Reiniciar Claude Desktop

1. Cierra **completamente** Claude Desktop
   - Click derecho en el icono de Claude en el Dock → Quit
   - O usa ⌘+Q

2. Vuelve a abrir Claude Desktop

3. Espera unos segundos mientras se reconectan los MCPs

### Paso 4: Verificar

Abre una nueva conversación y pídele a Claude:
> "Ejecuta este SQL en mdpulso: SELECT current_database();"

Si funciona, verás el resultado del query. Si no, revisa que:
- El token sea correcto
- Claude Desktop se haya reiniciado completamente
- El proyecto de Supabase esté seleccionado

---

## 📂 Estructura de Archivos Correcta

### ANTES (Desorganizado)
```
mdpulso/
├── AUDITORIA_SEGURIDAD_DATOS.md
├── CAPACIDAD_USUARIOS_REPORTE.md
├── DEPLOY_CHECKLIST.md
├── ERRORES_DEMO_FIXES.md
├── QA_FINAL_REPORT.md
├── REPORTE_FINAL_100.md
├── REPORTE_FINAL_DRA_DORA.md
├── REPORTE_TESTING_MEDICO_REAL.md
├── TESTING_COMPLETO_FINAL.md
├── TESTING_E2E_FINAL_100.md
└── ... (muchos archivos en raíz)
```

### DESPUÉS (Organizado) ✅
```
mdpulso/
├── README.md                    # Documentación principal
├── CLAUDE.md                    # Instrucciones para Claude
├── CONFIG.md                    # Configuración del proyecto
├── LESSONS_LEARNED.md           # Lecciones aprendidas
├── PROTOCOLO.md                 # Protocolos de trabajo
│
├── docs/                        # 📁 Toda la documentación
│   ├── deployments/
│   │   └── DEPLOY_CHECKLIST.md
│   ├── reports/
│   │   ├── AUDITORIA_SEGURIDAD_DATOS.md
│   │   ├── CAPACIDAD_USUARIOS_REPORTE.md
│   │   ├── ERRORES_DEMO_FIXES.md
│   │   ├── REPORTE_FINAL_100.md
│   │   └── REPORTE_FINAL_DRA_DORA.md
│   └── testing/
│       ├── QA_FINAL_REPORT.md
│       ├── REPORTE_TESTING_MEDICO_REAL.md
│       ├── TESTING_COMPLETO_FINAL.md
│       └── TESTING_E2E_FINAL_100.md
│
├── supabase/
│   └── migrations/              # 📁 Migraciones SQL
│       ├── 01_initial_schema.sql
│       ├── 02_nom_004_024.sql
│       ├── 03_billing_table.sql
│       ├── 04_nia_safety_rpc.sql
│       ├── 05_user_profiles_notifications.sql
│       ├── 06_fix_trigger_y_demo.sql
│       ├── 07_doctor_appointment_duration.sql
│       └── 20260611_fix_dni_null.sql
│
└── screenshots/                 # 📁 Screenshots de verificación
    ├── nia-header-success.png
    ├── nia-panel-open.png
    └── appointments-page-working.png
```

---

## 🔍 Convención de Nombres para Migraciones

### Patrón Numérico (Recomendado para features)
```
01_initial_schema.sql
02_add_notifications.sql
03_billing_table.sql
```

### Patrón Timestamp (Recomendado para hotfixes)
```
20260611_fix_dni_null.sql
20260618_emergency_rls_patch.sql
```

### ❌ EVITAR:
```
migration.sql           # Sin nombre descriptivo
fix.sql                 # Muy genérico
nueva_tabla.sql         # Sin número/timestamp
```

---

## 🎯 Checklist de Verificación

Después de configurar, verifica que Claude pueda:

- [ ] Listar tablas: `list_tables`
- [ ] Ejecutar SELECT: `execute_sql`
- [ ] Crear migraciones: `apply_migration`
- [ ] Ver extensiones: `list_extensions`
- [ ] Generar TypeScript types: `generate_typescript_types`

---

## 💡 Tips

1. **Migraciones siempre en `supabase/migrations/`**
   - Claude debe guardar TODAS las migraciones SQL ahí
   - Nunca en la raíz del proyecto

2. **Documentación en `docs/`**
   - Reportes → `docs/reports/`
   - Testing → `docs/testing/`
   - Deployments → `docs/deployments/`

3. **Screenshots en `screenshots/`**
   - Capturas de verificación
   - Evidencia de bugs
   - Screenshots de UI

4. **Archivos esenciales en raíz**
   - Solo: README, CLAUDE, CONFIG, LESSONS_LEARNED, PROTOCOLO
   - Todo lo demás → carpetas organizadas

---

## 🚨 Problemas Comunes

### "Token inválido"
- Verifica que copiaste el token completo
- Asegúrate de que empieza con `sbp_`
- Regenera el token si es necesario

### "No se conecta el MCP"
- Reinicia Claude Desktop completamente
- Verifica que el JSON esté bien formado (sin comas extra)
- Revisa los logs: `~/Library/Logs/Claude/`

### "Sigue sin poder ejecutar SQL"
- Verifica que el token tenga permisos de Management API
- Confirma que el proyecto de Supabase esté activo
- Prueba crear un nuevo token con todos los scopes

---

## 📞 Soporte

Si los problemas persisten:
1. Verifica la configuración en: https://supabase.com/dashboard/account/tokens
2. Revisa los logs de Claude Desktop
3. Regenera el token con todos los permisos

---

**Última actualización**: 18 de junio de 2026
**Versión**: 1.0
**Autor**: RoAnderson (Claude Sonnet 4.5)
