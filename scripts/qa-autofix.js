#!/usr/bin/env node
/**
 * qa-autofix.js — RoSaas AI Autofix Engine
 * Analiza el results.json, extrae los fallos, busca el stack trace,
 * junta contexto (código fuente + LESSONS_LEARNED.md) y envía a Groq/Cerebras
 * para generar un parche sugerido automático.
 * 
 * Uso: node scripts/qa-autofix.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuración de rutas
const RESULTS_PATH = path.join(__dirname, '../qa-reports/results.json');
const LESSONS_PATH = path.join(__dirname, '../LESSONS_LEARNED.md');
const SRC_DIR = path.join(__dirname, '../app'); // Cambiar a 'src' si la estructura es diferente

// Keys IA
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// ── Utils ─────────────────────────────────────────────────────────────────

function printHeader() {
    console.log('\n======================================================');
    console.log(' 🤖 RoSaas Auto-Fix Engine — AI Diagnosis');
    console.log('======================================================\n');
}

if (!CEREBRAS_KEY && !GROQ_KEY) {
    printHeader();
    console.error('❌ No se encontró CEREBRAS_API_KEY ni GROQ_API_KEY en .env.local');
    process.exit(1);
}

if (!fs.existsSync(RESULTS_PATH)) {
    printHeader();
    console.error(`❌ No existe ${RESULTS_PATH}. Corre el QA Engine primero.`);
    process.exit(1);
}

// ── Procesar Resultados ───────────────────────────────────────────────────

const raw = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
const failedTests = [];

function extractFailures(suites) {
    for (const suite of suites || []) {
        for (const test of suite.specs || []) {
            const result = test.tests?.[0]?.results?.[0];
            if (result?.status === 'failed' || result?.status === 'unexpected') {
                failedTests.push({
                    title: `${suite.title} › ${test.title}`,
                    file: test.file,
                    error: result.errors?.[0]?.message || 'Error desconocido',
                    snippet: result.errors?.[0]?.snippet || '',
                    trace: result.errors?.[0]?.location || {}
                });
            }
        }
        if (suite.suites) extractFailures(suite.suites);
    }
}

extractFailures(raw.suites);

if (failedTests.length === 0) {
    printHeader();
    console.log('🎉 No se encontraron fallos. QA Limpio. Auto-fix no es necesario.\n');
    process.exit(0);
}

// ── Leer Contexto ─────────────────────────────────────────────────────────

let lessonsLearned = '';
if (fs.existsSync(LESSONS_PATH)) {
    // Leer solo los últimos 3000 caracteres para no saturar contextos
    const fullLessons = fs.readFileSync(LESSONS_PATH, 'utf-8');
    lessonsLearned = fullLessons.slice(-3000); 
}

// Emular grep para intentar adivinar qué componente falló basado en el trace del error
function guessComponentContent(errorTrace) {
    // Esto es muy básico, la versión ideal mapea sourcemaps
    // Retornamos un mensaje genérico por ahora
    return "Nota: El stack trace del error será la principal fuente para el diagnóstico.";
}

// ── Llamada a IA ──────────────────────────────────────────────────────────

async function askAI(prompt) {
    const isCerebras = !!CEREBRAS_KEY;
    const url = isCerebras 
        ? 'https://api.cerebras.ai/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';
    
    const key = isCerebras ? CEREBRAS_KEY : GROQ_KEY;
    const model = isCerebras ? 'llama3.1-70b' : 'llama3-70b-8192'; // O usar gpt-oss equivalentes

    const payload = JSON.stringify({
        model: model,
        messages: [
            {
                role: 'system',
                content: 'Eres un ingeniero senior de React/Next.js y Node.js. Analiza el error del test E2E provisto en el prompt. Tu respuesta debe diagnosticar la causa raíz y proveer el código corregido exacto en formato diff o el fragmento listo para reemplazar. Sé directo y técnico.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.1
    });

    const parsedUrl = new URL(url);
    const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.choices[0].message.content);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`API falló: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Ejecución Principal ───────────────────────────────────────────────────

printHeader();
console.log(`🔍 Se encontraron ${failedTests.length} fallos. Sintetizando diagnóstico AI...\n`);

(async () => {
    for (const test of failedTests) {
        console.log(`❌ Analizando: ${test.title}`);
        console.log(`   Procesando error...`);

        const prompt = `
Ha fallado el siguiente test E2E (Playwright):
**Test**: ${test.title}
**Archivo**: ${test.file}

**Error:**
\`\`\`
${test.error}
\`\`\`

**Snippet de código del test:**
\`\`\`
${test.snippet}
\`\`\`

**Reglas Históricas Relevantes (LESSONS LEARNED):**
\`\`\`
${lessonsLearned}
\`\`\`

**Instrucción:**
1. ¿Por qué crees que falló basado en el mensaje de error o timeout?
2. Da el snippet de código O configuración sugerida para arreglarlo. Usa markdown.
`;

        try {
            const diagnosis = await askAI(prompt);
            console.log('\n--- 🤖 Diagnóstico e Intervención sugerida ---');
            console.log(diagnosis);
            console.log('----------------------------------------------\n');
        } catch (err) {
            console.error(`⚠️ Falló el auto - fix para este test: ${err.message}\n`);
        }
    }
})();
