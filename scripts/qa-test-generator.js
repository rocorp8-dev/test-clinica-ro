#!/usr/bin/env node
/**
 * qa-test-generator.js — Generador de Tests para Nuevos Proyectos
 * Lee el CONFIG.md del proyecto y genera un suite de tests de Playwright
 * pre-programado y adaptado a las rutas y componentes de ese proyecto.
 *
 * Uso: node scripts/qa-test-generator.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '../CONFIG.md');
const TESTS_DIR = path.join(__dirname, '../tests');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;

function printHeader() {
    console.log('\n======================================================');
    console.log(' 🧬 RoSaas QA Test Generator — AI Scaffold');
    console.log('======================================================\n');
}

if (!CEREBRAS_KEY) {
    printHeader();
    console.error('❌ CEREBRAS_API_KEY requerida en .env.local para generar tests.');
    process.exit(1);
}

if (!fs.existsSync(CONFIG_PATH)) {
    printHeader();
    console.error(`❌ No existe CONFIG.md. Necesita contexto para generar los tests.`);
    process.exit(1);
}

const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');

const basePrompt = `
Eres la IA núcleo de "RoSaas Factory". Tu tarea es generar archivos de test de Playwright \`*.spec.ts\` basados en la estructura de este proyecto.
Aquí tienes el CONFIG.md del proyecto:
\`\`\`
${configContent}
\`\`\`
Genera el código para un archivo llamado \`happy-path-custom.spec.ts\` que pruebe la funcionalidad principal descrita en la seccion "Navegación" y "Modelo de Datos".

Reglas:
1. Usa el formato de importación estándar: import { test, expect } from '@playwright/test';
2. Asume validación básica: login con credenciales demo, y navegación a cada ruta.
3. El formato de salida debe ser solo código dentro de un bloque markdown de typescript. Omit text outside the block.
`;

async function generateSpec() {
    const url = 'https://api.cerebras.ai/v1/chat/completions';
    const payload = JSON.stringify({
        model: 'llama3.1-70b',
        messages: [{ role: 'user', content: basePrompt }],
        temperature: 0.2
    });

    const parsedUrl = new URL(url);
    const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_KEY}`
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

(async () => {
    printHeader();
    console.log('⏳ Analizando CONFIG.md y generando suite de pruebas customizada...');

    try {
        const response = await generateSpec();
        const codeMatch = response.match(/```typescript\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1] : response.replace(/```.*/g, '');

        if (!fs.existsSync(TESTS_DIR)) fs.mkdirSync(TESTS_DIR, { recursive: true });

        const outPath = path.join(TESTS_DIR, 'happy-path-custom.spec.ts');
        fs.writeFileSync(outPath, code.trim());

        console.log(`✅ ¡Éxito! Generado el test suite en: tests/happy-path-custom.spec.ts`);
        console.log('Verifica el código generado y ajusta selectores donde la app no use clases estándar.\n');

    } catch (err) {
        console.error(`❌ Fallo en la generación: ${err.message}\n`);
    }
})();
