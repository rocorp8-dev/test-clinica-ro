# CONFIG: MDPULSO

## IDENTIDAD
- **Nombre:** MDPulso
- **Tagline:** "El sistema operativo de tu práctica médica"
- **Tipo:** SaaS B2B / Dashboard Médico
- **Favicon letra:** M
- **Color primario:** emerald
- **Repo name:** mdpulso

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

## PAGOS (SPEI)
- **CLABE:** 012180015011204196
- **Banco:** BBVA
- **Titular:** Rodolfo Perez Figueroa
- **Soporte:** despacho9@gmail.com

## DATOS SEMILLA
- 1 Paciente: Juan Pérez (DNI: 12345678X)
- 1 Cita: Mañana a las 10:00 AM (Consulta general)
