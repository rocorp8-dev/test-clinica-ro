require('dotenv').config({path: '.env.local'});
const https = require('https');

const systemPrompt = `ROL: Eres "Nia" (Neural Interface Assistant).
CONTEXTO: Copiloto clínico en MdPulso.
FECHA ACTUAL: 2026-04-09T01:00:00`;

const messages = [
  { role: "system", content: systemPrompt },
  { role: "user", content: "cita seria el dia 11 de abril a las 11am, roberto cruz, motivo chequeo de glucosa" },
  { role: "assistant", content: "¿Para qué fecha y hora? ¿Cuál es el motivo?" },
  { role: "user", content: "roberto cruz, motivo chequeo de glucosa 11 de abriel 26 a las 11am" }
];

const tools = [ { type: "function", function: { name: "create_appointment", parameters: { type: "object", properties: { fecha: { type: "string" } } } } } ];

const req = https.request('https://api.cerebras.ai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data).choices[0].message, null, 2)));
});

req.write(JSON.stringify({ model: "llama3.1-8b", messages, tools, tool_choice: "auto", temperature: 0.1 }));
req.end();
