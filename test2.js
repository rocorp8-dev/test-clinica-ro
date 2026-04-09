const https = require('https');
require('dotenv').config({path: '.env.local'});
const systemPrompt = `ROL: Eres "Nia" (Neural Interface Assistant).
CONTEXTO: Copiloto clínico de élite en MdPulso con acceso total a DB.
MÉDICO ACTUAL: Dr. Roberto.
FECHA ACTUAL: 2026-04-09T02:00:00.

REGLA DE ORO: NO des respuestas intermedias.
TU RESPUESTA DEBE SER ÚNICAMENTE EL RESULTADO FINAL O EL REPORTE ESTRICTO.
PROHIBIDO ABSOLUTO: NUNCA incluyas en tu respuesta texto JSON...

FLUJO OBLIGATORIO:
1. Si el médico pide expediente/historial/actividad de un paciente:
   - USA 'search_patients' con SOLO EL NOMBRE O DNI del paciente.
2. Si el médico pide AGENDAR una cita:
   - PRIMERO verifica que el médico dio: nombre del paciente, fecha, hora y motivo.
   - Si FALTA alguno de esos datos, NO llames ninguna tool — pregunta directamente.
   - Si tienes todos los datos: USA 'search_patients' para obtener el UUID, luego USA 'create_appointment'.

FORMATO ESTRICTO:
1. 🚨 ALERTAS...`;

const messages = [
  { role: "system", content: systemPrompt },
  { role: "user", content: "cita roberto cruz" },
  { role: "assistant", content: "¿Para qué fecha y hora? ¿Cuál es el motivo?" },
  { role: "user", content: "fecha 12 abril 2026 a las 11am, chequeo de rutina" }
];

const tools = [
    {
        type: "function",
        function: {
            name: "search_patients",
            description: "Busca pacientes por nombre.",
            parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
        }
    },
    {
        type: "function",
        function: {
            name: "create_appointment",
            description: "Agenda cita.",
            parameters: {
                type: "object",
                properties: {
                    patient_id: { type: "string" },
                    fecha: { type: "string" },
                    motivo: { type: "string" }
                },
                required: ["patient_id", "fecha", "motivo"]
            }
        }
    }
];

const req = https.request('https://api.cerebras.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data).choices[0].message, null, 2));
  });
});

req.write(JSON.stringify({
  model: "llama3.1-8b",
  messages: messages,
  tools: tools,
  tool_choice: "auto",
  temperature: 0.1
}));
req.end();
