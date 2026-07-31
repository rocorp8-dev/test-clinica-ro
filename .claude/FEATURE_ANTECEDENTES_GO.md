# Feature: Antecedentes Gineco-Obstétricos (GO)

**Fecha:** 2026-07-31
**Solicitado por:** Dra. Dora
**Tipo de cambio:** Adición quirúrgica (NO rompe funcionalidad existente)
**Estado:** ✅ Implementado y deployado en producción

---

## 📋 Qué se agregó

Nueva sección **"Antecedentes Gineco-Obstétricos (GO)"** en las notas clínicas de **Primera Vez** únicamente.

---

## 🎯 Comportamiento

### Cuándo aparece:
- ✅ **Solo cuando el usuario selecciona "Primera Vez"** en el dropdown de tipo de nota
- ❌ **NO aparece** en: Evolución, Urgencias, Referencia, Interconsulta, Egreso, Enfermería

### Dónde aparece:
- Después del campo **"P — Plan"**
- Con un borde superior separador (`border-t border-white/10`)
- Identificado con icono **Heart** y color **rosa/pink**

### Qué contiene:
Campo de texto libre (textarea) para capturar:
- Menarca
- FUM (Fecha de Última Menstruación)
- Gestas, partos, cesáreas, abortos
- Menopausia
- Método anticonceptivo
- Cualquier otro dato gineco-obstétrico relevante

---

## 🛠️ Implementación Técnica

### Archivos Modificados:

1. **`components/patients/PatientDetailModal.tsx`**
   - Línea 28: Agregado `antecedentes_go: ''` al estado inicial
   - Líneas 521-536: Nueva sección condicional GO
   - Línea 134: Campo incluido en INSERT a base de datos

2. **`supabase/migrations/12_add_antecedentes_go.sql`**
   - Nueva columna `antecedentes_go text` en tabla `medical_notes`
   - Comentario descriptivo en BD

### Código Clave:

```tsx
// Estado inicial (línea 28)
const SOAP_INITIAL = {
  tipo_nota: 'evolucion',
  subjetivo: '',
  objetivo: '',
  analisis: '',
  plan: '',
  antecedentes_go: ''  // ← NUEVO
}

// Sección condicional (líneas 521-536)
{soap.tipo_nota === 'primera_vez' && (
  <div className="pt-2 border-t border-white/10">
    <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
      <Heart className="h-3 w-3" />
      GO — Antecedentes Gineco-Obstétricos
    </p>
    <textarea
      value={soap.antecedentes_go}
      onChange={e => setSoap(s => ({ ...s, antecedentes_go: e.target.value }))}
      placeholder="Menarca, FUM, gestas, partos, cesáreas, abortos, menopausia, método anticonceptivo..."
      className="w-full rounded-2xl bg-pink-500/10 border border-pink-300/30 p-4 text-sm text-white focus:bg-pink-500/15 focus:outline-none focus:ring-2 focus:ring-pink-400/40 transition-all font-medium placeholder:text-pink-200/50 resize-none"
      rows={3}
    />
  </div>
)}

// Guardado en BD (línea 134)
const { error } = await supabase.from('medical_notes').insert([{
  // ... otros campos SOAP
  antecedentes_go: soap.antecedentes_go || null,  // ← NUEVO
}])
```

### Schema de Base de Datos:

```sql
-- Ejecutado en producción: ✅ SUCCESS
ALTER TABLE medical_notes
ADD COLUMN IF NOT EXISTS antecedentes_go text;

COMMENT ON COLUMN medical_notes.antecedentes_go IS
  'Antecedentes Gineco-Obstétricos: Menarca, FUM, gestas, partos, cesáreas, abortos, menopausia, método anticonceptivo';
```

---

## 🎨 Diseño UI

### Estilo Visual:
- **Fondo:** `bg-pink-500/10` (rosa suave transparente)
- **Borde:** `border-pink-300/30` (rosa claro)
- **Texto label:** `text-pink-300` (rosa claro en fondo oscuro)
- **Focus:** `focus:ring-pink-400/40` (anillo rosa al enfocar)
- **Placeholder:** `placeholder:text-pink-200/50` (rosa muy claro)

### Diferenciación de SOAP:
| Campo SOAP | GO |
|-----------|-----|
| Fondo: `bg-white/10` | Fondo: `bg-pink-500/10` |
| Borde: `border-white/20` | Borde: `border-pink-300/30` |
| 2 filas | 3 filas |
| Sin separador superior | Con separador superior |

---

## ✅ Pruebas de Regresión

### Qué NO debe romperse (verificado):

1. ✅ **Notas de Evolución** - No muestran campo GO
2. ✅ **Notas de Urgencias** - No muestran campo GO
3. ✅ **Notas existentes en BD** - No afectadas (columna es opcional/nullable)
4. ✅ **Guardado de notas sin GO** - Funciona normal (se guarda como `null`)
5. ✅ **Build de Next.js** - Exitoso (exit code 0)
6. ✅ **TypeScript** - Sin errores de tipo

### Cómo probar:

1. Ir a **Pacientes** → Click en "Expediente" de cualquier paciente
2. Click en **"Nueva Nota SOAP"**
3. En el dropdown, seleccionar **"Primera Vez"**
4. Verificar que aparezca el campo **"GO — Antecedentes Gineco-Obstétricos"**
5. Cambiar a **"Evolución"** → Verificar que desaparezca
6. Volver a **"Primera Vez"** → Llenar campos SOAP + GO
7. Click **"Guardar Nota"**
8. Verificar en timeline que la nota se guardó correctamente

---

## 📊 Impacto en Producción

### Usuarios Afectados:
- ✅ **Dra. Dora** - Tendrá el nuevo campo disponible
- ✅ **Dr. actual en producción** - NO afectado (solo verá campo si selecciona "Primera Vez")

### Compatibilidad:
- ✅ **Notas anteriores** - Siguen funcionando igual
- ✅ **API de NIA** - Compatible (campo opcional)
- ✅ **Visualización en timeline** - Compatible (campo ignorado si es `null`)

### Rollback (si fuera necesario):
```sql
-- Para revertir cambio en BD (NO recomendado, mejor dejar columna vacía)
ALTER TABLE medical_notes DROP COLUMN IF EXISTS antecedentes_go;
```

---

## 🔐 Cumplimiento Normativo

### NOM-004-SSA3-2012:
- ✅ Datos gineco-obstétricos son **relevantes para expediente clínico completo**
- ✅ Campo auditable (tiene `created_at`, `updated_at`, `updated_by`)
- ✅ Asociado a `tipo_nota` específico (trazabilidad)

### NOM-024-SSA3-2010:
- ✅ Datos protegidos con RLS (Row Level Security)
- ✅ Solo el doctor del paciente puede ver/editar
- ✅ Cifrado en tránsito y reposo (Supabase)

---

## 📝 Commits Relacionados

- `f96ed49` - feat(mdpulso): agregar Antecedentes Gineco-Obstétricos (GO) para notas Primera Vez
- Migración ejecutada en producción: **2026-07-31**

---

## 🚀 Próximos Pasos (Opcional)

1. **Mejorar visualización en timeline** - Mostrar GO en cards de notas Primera Vez
2. **Agregar a PDF exportable** - Incluir sección GO en reportes
3. **Templates GO** - Atajos para captura rápida (ej: "G3 P2 C1 A0")
4. **Validaciones** - Alertas si FUM es muy antigua en paciente joven

---

**Implementado por:** RoAnderson
**Fecha:** 2026-07-31
**Estado:** ✅ Funcionando en producción
