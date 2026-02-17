# CONFIG: TEST-CLINICA

## IDENTIDAD
- **Nombre:** Test Clínica SaaS
- **Tagline:** "Gestión médica simplificada y eficiente"
- **Tipo:** SaaS B2B / Dashboard Médico
- **Favicon letra:** C
- **Color primario:** emerald
- **Repo name:** test-clinica-saas

## CREDENCIALES DEMO
- **Email:** admin@testclinica.com
- **Password:** Demo1234!
- **Nombre completo:** Administrador Clínica

## NAVEGACIÓN (Sidebar)
| Label | Icono | Ruta |
|-------|-------|------|
| Inicio | Home | / |
| Pacientes | Users | /pacientes |
| Citas | Calendar | /citas |
| Historial | FileText | /historial |

## MODELO DE DATOS
### Tabla: pacientes
CREATE TABLE pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE NOT NULL,
  telefono text,
  created_at timestamptz DEFAULT now()
);

### Tabla: citas
CREATE TABLE citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users NOT NULL,
  fecha timestamptz NOT NULL,
  motivo text,
  estado text DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now()
);

## DATOS SEMILLA
- 1 Paciente: Juan Pérez (DNI: 12345678X)
- 1 Cita: Mañana a las 10:00 AM (Consulta general)
