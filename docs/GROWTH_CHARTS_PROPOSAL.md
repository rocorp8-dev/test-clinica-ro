# Propuesta: Gráficas de Crecimiento Pediátrico en MDPulso

## Contexto
La Dra. Dora (pediatra, usuaria de MDPulso) necesita monitorear el crecimiento de sus pacientes pediátricos registrando:
- **Peso** (kg)
- **Talla/Estatura** (cm)
- **Perímetro Cefálico** (cm, medida de la cabeza)

Estos datos deben graficarse en curvas de percentiles (P3, P10, P25, P50, P75, P90, P97) para comparar el desarrollo del niño vs. estándares de la OMS.

---

## Arquitectura Propuesta (SIN romper nada existente)

### 1. Nueva Tabla en Base de Datos

**Tabla: `growth_measurements` (mediciones de crecimiento)**

```sql
CREATE TABLE IF NOT EXISTS growth_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES auth.users NOT NULL,

  -- Datos básicos del paciente en el momento de la medición
  fecha_medicion timestamptz NOT NULL DEFAULT now(),
  edad_meses integer NOT NULL, -- Calculada automáticamente desde fecha_nacimiento
  sexo text NOT NULL CHECK (sexo IN ('M', 'F')), -- Masculino/Femenino

  -- Mediciones antropométricas
  peso_kg numeric(5,2), -- Peso en kilogramos (ej: 12.50)
  talla_cm numeric(5,1), -- Talla/estatura en centímetros (ej: 85.5)
  perimetro_cefalico_cm numeric(4,1), -- Perímetro cefálico (ej: 48.2)

  -- Metadatos
  notas text, -- Observaciones de la doctora
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_growth_patient ON growth_measurements(patient_id);
CREATE INDEX idx_growth_fecha ON growth_measurements(fecha_medicion DESC);

-- RLS (Row Level Security)
ALTER TABLE growth_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their own growth measurements"
ON growth_measurements FOR ALL
USING (auth.uid() = doctor_id);
```

**Extensión necesaria en tabla `patients`**:
```sql
-- Agregar campos demográficos faltantes
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('M', 'F'));
```

---

### 2. Integración en el Expediente (UI)

**Ubicación**: Dentro del **PatientDetailModal** (expediente del paciente)

**Nueva pestaña/sección**: "Crecimiento" (Growth) con icono `TrendingUp`

**Flujo UX**:
```
┌─────────────────────────────────────────────────────┐
│ [Expediente de María García - 3 años]              │
├─────────────────────────────────────────────────────┤
│ Tabs: [Info] [Historia] [Citas] [🆕 CRECIMIENTO]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 GRÁFICAS DE CRECIMIENTO                         │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ + Nueva Medición                      │          │
│  │   Peso: [____] kg                     │          │
│  │   Talla: [____] cm                    │          │
│  │   P. Cefálico: [____] cm              │          │
│  │   Notas: [_______________]            │          │
│  │   [Guardar Medición]                  │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  📈 Historial de Mediciones (últimas 12 meses)     │
│  ┌──────────────────────────────────────┐          │
│  │ Fecha       Edad   Peso  Talla  P.C. │          │
│  │ 18/06/26   36m    15kg   95cm  49cm  │          │
│  │ 18/03/26   33m    14kg   92cm  48cm  │          │
│  │ 18/12/25   30m    13kg   88cm  48cm  │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  📊 Curvas de Crecimiento (OMS)                     │
│  ┌──────────────────────────────────────┐          │
│  │ [Peso/Edad] [Talla/Edad] [P.C./Edad] │          │
│  │                                       │          │
│  │     ┌─────────────────────┐          │          │
│  │  kg │      📈 P97          │          │          │
│  │  16 │     ╱ P75            │          │          │
│  │  14 │    ╱  P50  ⬤ (hoy)   │          │          │
│  │  12 │   ╱   P25            │          │          │
│  │  10 │  ╱    P3             │          │          │
│  │   8 │ ╱                    │          │          │
│  │     └─────────────────────┘          │          │
│  │      0  6  12  18  24  30 meses      │          │
│  └──────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 3. Componentes React Nuevos

**Estructura de archivos** (sin tocar los existentes):

```
components/
  └── growth/                           ← NUEVA CARPETA
      ├── GrowthTab.tsx                 ← Tab principal en PatientDetail
      ├── GrowthMeasurementForm.tsx     ← Formulario para ingresar mediciones
      ├── GrowthTable.tsx               ← Tabla de historial
      ├── GrowthChart.tsx               ← Gráfica interactiva con Chart.js
      └── percentiles.ts                ← Datos de percentiles OMS (tablas estáticas)
```

**Modificación mínima en archivos existentes**:
- `components/patients/PatientDetailModal.tsx`:
  - Agregar import de `<GrowthTab />`
  - Agregar tab condicional: "Si el paciente tiene `fecha_nacimiento` y `sexo` → mostrar tab Crecimiento"

---

### 4. API Endpoints Nuevos

**Endpoints** (sin tocar los existentes):

```typescript
// app/api/growth/route.ts
// GET  /api/growth?patient_id=xxx  → Obtener mediciones de un paciente
// POST /api/growth                 → Crear nueva medición
// PUT  /api/growth/[id]            → Editar medición
// DELETE /api/growth/[id]          → Eliminar medición
```

**Lógica de negocio**:
1. Al crear medición → calcular `edad_meses` automáticamente desde `fecha_nacimiento`
2. Validar que `peso`, `talla`, `perimetro_cefalico` estén en rangos razonables
3. Retornar percentiles calculados (P3-P97) basados en tablas OMS

---

### 5. Datos de Percentiles (OMS)

**Fuente**: Tablas oficiales de la OMS (2006-2007)
- https://www.who.int/tools/child-growth-standards/standards

**Implementación**:
```typescript
// components/growth/percentiles.ts
export const WHO_PERCENTILES_WEIGHT_FOR_AGE_MALE = {
  0: { P3: 2.5, P10: 2.8, P25: 3.0, P50: 3.3, P75: 3.7, P90: 4.0, P97: 4.4 },
  1: { P3: 3.4, P10: 3.8, P25: 4.2, P50: 4.5, P75: 4.9, P90: 5.3, P97: 5.8 },
  // ... hasta 60 meses (5 años)
}

export const WHO_PERCENTILES_WEIGHT_FOR_AGE_FEMALE = { /* ... */ }
export const WHO_PERCENTILES_HEIGHT_FOR_AGE_MALE = { /* ... */ }
export const WHO_PERCENTILES_HEIGHT_FOR_AGE_FEMALE = { /* ... */ }
export const WHO_PERCENTILES_HEAD_CIRCUMFERENCE_FOR_AGE_MALE = { /* ... */ }
export const WHO_PERCENTILES_HEAD_CIRCUMFERENCE_FOR_AGE_FEMALE = { /* ... */ }
```

**Nota**: Estos datos son **estáticos** (no van en DB), son arrays de JSON embebidos en el código.

---

### 6. Librería para Gráficas

**Recomendación**: **Chart.js** + **react-chartjs-2**

```bash
npm install chart.js react-chartjs-2
```

**Ventajas**:
- Ligero (~200KB)
- Soporta líneas de percentiles fácilmente
- Responsive
- Interactivo (tooltips, zoom)

**Alternativa**: Recharts (más pesado pero más customizable)

---

### 7. Validaciones y Reglas de Negocio

**Validaciones automáticas**:
1. **Edad**: Solo mostrar tab "Crecimiento" si el paciente tiene < 18 años
2. **Sexo requerido**: Si falta `sexo` en `patients` → mostrar modal para capturarlo antes de primera medición
3. **Rangos válidos**:
   - Peso: 0.5 kg - 100 kg
   - Talla: 30 cm - 200 cm
   - Perímetro cefálico: 20 cm - 60 cm

**Alertas clínicas automáticas**:
- Si medición cae **debajo de P3** o **arriba de P97** → Ícono de alerta roja ⚠️
- Si hay **caída brusca** entre mediciones (ej: de P75 a P25 en 3 meses) → Alerta amarilla

---

### 8. Integración con NIA (AI Assistant)

**Feature opcional** (fase 2):
- NIA puede **interpretar las curvas** y sugerir:
  - "El peso está en P50 (normal para su edad)"
  - "Perímetro cefálico creció +2cm en 2 meses (dentro de lo esperado)"
  - "Talla está en P10, considerar evaluación de crecimiento"

**Endpoint**:
```typescript
// app/api/nia/growth-analysis/route.ts
POST /api/nia/growth-analysis
{ patient_id: "uuid", measurement_id: "uuid" }
→ Retorna análisis textual de NIA sobre la medición
```

---

## Plan de Implementación (SIN romper nada)

### Fase 1: Schema DB (1 migration)
- ✅ Crear tabla `growth_measurements`
- ✅ Agregar `fecha_nacimiento` y `sexo` a `patients`

### Fase 2: UI Básico (2-3 componentes)
- ✅ Crear `GrowthTab.tsx` con formulario simple
- ✅ Crear tabla de historial
- ✅ Integrar en `PatientDetailModal` como nueva tab

### Fase 3: API + Validaciones
- ✅ Endpoints CRUD para mediciones
- ✅ Cálculo automático de edad en meses
- ✅ Validaciones de rangos

### Fase 4: Gráficas Interactivas
- ✅ Implementar Chart.js con curvas de percentiles
- ✅ Mostrar punto actual del paciente en la curva
- ✅ Toggle entre Peso/Talla/P.C.

### Fase 5 (Opcional): Análisis con NIA
- ✅ Integrar endpoint de análisis
- ✅ Mostrar interpretación de NIA en la sección

---

## Ventajas de Esta Arquitectura

✅ **Zero Breaking Changes**: No toca código existente de citas, notas, billing
✅ **Modular**: Todo en carpeta `components/growth/` y tabla separada
✅ **Extensible**: Fácil agregar más métricas (IMC, relación peso/talla)
✅ **Estándares OMS**: Tablas oficiales de la Organización Mundial de la Salud
✅ **RLS Security**: Cada doctora solo ve mediciones de sus pacientes
✅ **Mobile-friendly**: Funciona en tablet (principal device de la Dra. Dora)

---

## Consideraciones Técnicas

### ¿Por qué no integrar en la tabla `appointments`?
- Las mediciones de crecimiento son **independientes** de las citas
- Una cita puede no tener medición (ej: consulta por resfriado)
- Una medición puede hacerse sin cita (ej: control mensual rápido)
- Separar permite historial limpio de solo mediciones

### ¿Por qué calcular `edad_meses` automáticamente?
- Evita errores humanos
- Facilita búsquedas (ej: "mediciones entre 12-24 meses")
- Los percentiles OMS se indexan por **edad exacta en meses**

### ¿Por qué tablas estáticas de percentiles y no DB?
- Los percentiles OMS **no cambian** (datos de 2006)
- Más rápido cargar desde JSON que query a DB
- Reduce complejidad de schema

---

## Mockup Visual de la Gráfica

```
  Peso para Edad - Niñas (0-5 años)
  ─────────────────────────────────────
  20kg ┤                          P97
  18kg ┤                      ╱── P90
  16kg ┤                  ╱──── P75
  14kg ┤              ╱────── P50  ⬤ María (hoy)
  12kg ┤          ╱──────── P25
  10kg ┤      ╱──────── P10
   8kg ┤  ╱──────── P3
   6kg ┼─────────────────────────────
       0  6  12  18  24  30  36 meses

  ⬤ = Última medición de María (14.5kg a 36 meses)
  ── = Curvas de percentiles OMS
```

---

## Próximos Pasos (si apruebas el plan)

1. ✅ Revisar y aprobar esta propuesta
2. ✅ Decidir si quieres Fase 1-4 completo o solo Fase 1-3 (sin gráficas aún)
3. ✅ Confirmar si la Dra. Dora necesita **imprimir** las gráficas (PDF export)
4. ✅ Implementar migration y UI
5. ✅ Testear con 2-3 pacientes de la Dra. Dora

---

## Preguntas para Ro

1. **¿La Dra. Dora necesita imprimir las gráficas?** (ej: para entregar a padres)
2. **¿Quieres empezar con formulario básico + tabla, y luego agregar gráficas?** (iterativo)
3. **¿Hay otros datos que la Dra. Dora registra?** (ej: IMC, presión arterial pediátrica)
4. **¿Cuántos pacientes pediátricos tiene aprox?** (para estimar volumen de datos)

---

**Resumen**: Arquitectura modular, sin romper nada, lista para crecer. La Dra. Dora tendrá sus gráficas de crecimiento integradas en el expediente de cada niño, con percentiles OMS y alertas automáticas 🚀👶📊
