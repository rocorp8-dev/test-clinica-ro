#!/usr/bin/env node
/**
 * qa-report.js — Generador del Dashboard de Reporte QA
 * Toma el results.json de Playwright y genera un HTML visual rico.
 *
 * Uso: node scripts/qa-report.js <ruta-al-results.json> [project-name]
 */

const fs = require('fs');
const path = require('path');

const resultsPath = process.argv[2] || 'qa-reports/results.json';
const projectName = process.argv[3] || 'test-clinica';

if (!fs.existsSync(resultsPath)) {
    console.error(`❌ No se encontró ${resultsPath}`);
    console.error('   Corre primero: npx playwright test --reporter=json');
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// ── Parsear resultados ────────────────────────────────────────────────────────
const allTests = [];
let totalPass = 0, totalFail = 0, totalSkip = 0;

function parseResults(suites) {
    for (const suite of suites || []) {
        for (const test of suite.specs || []) {
            const result = test.tests?.[0]?.results?.[0];
            const status = result?.status || 'skipped';
            const duration = result?.duration || 0;
            const errors = result?.errors || [];

            allTests.push({
                title: test.title,
                fullTitle: `${suite.title} › ${test.title}`,
                status,
                duration,
                error: errors[0]?.message?.split('\n')[0] || null,
                file: suite.file || '',
            });

            if (status === 'passed') totalPass++;
            else if (status === 'failed') totalFail++;
            else totalSkip++;
        }
        if (suite.suites) parseResults(suite.suites);
    }
}

parseResults(raw.suites);

const total = totalPass + totalFail + totalSkip;
const score = total > 0 ? Math.round((totalPass / total) * 100) : 0;
const dateStr = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
const durationTotal = (raw.stats?.duration || 0 / 1000).toFixed(1);

// ── Categorizar por tipo ──────────────────────────────────────────────────────
function getCategory(test) {
    const f = test.file.toLowerCase();
    if (f.includes('auth')) return { icon: '🔐', label: 'Auth' };
    if (f.includes('happy-path')) return { icon: '🛤️', label: 'Happy Path' };
    if (f.includes('forms')) return { icon: '📋', label: 'Forms' };
    if (f.includes('temporal')) return { icon: '⏱️', label: 'Temporal' };
    if (f.includes('mobile')) return { icon: '📱', label: 'Mobile' };
    if (f.includes('ux-audit')) return { icon: '♿', label: 'UX Audit' };
    return { icon: '🧪', label: 'General' };
}

function statusBadge(status) {
    if (status === 'passed') return `<span class="badge pass">✅ PASÓ</span>`;
    if (status === 'failed') return `<span class="badge fail">❌ FALLÓ</span>`;
    return `<span class="badge skip">⏭️ SKIP</span>`;
}

function scoreColor(s) {
    if (s >= 90) return '#10b981'; // green
    if (s >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
}

function scoreLabel(s) {
    if (s >= 90) return '🎉 APROBADO';
    if (s >= 70) return '⚠️ ADVERTENCIA';
    return '❌ RECHAZADO';
}

// ── Generar HTML ──────────────────────────────────────────────────────────────
const failedTests = allTests.filter(t => t.status === 'failed');

const testRows = allTests.map(t => {
    const cat = getCategory(t);
    const errorHtml = t.error
        ? `<div class="error-msg">💬 ${t.error.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
        : '';
    return `
    <tr class="test-row ${t.status}">
        <td><span class="cat-badge">${cat.icon} ${cat.label}</span></td>
        <td class="test-title">${t.fullTitle}</td>
        <td>${statusBadge(t.status)}</td>
        <td class="duration">${(t.duration / 1000).toFixed(1)}s</td>
        <td>${errorHtml}</td>
    </tr>`;
}).join('');

const failSummaryHtml = failedTests.length > 0
    ? failedTests.map(t => `
    <div class="fail-card">
        <div class="fail-title">❌ ${t.fullTitle}</div>
        ${t.error ? `<div class="fail-error">${t.error.replace(/</g, '&lt;')}</div>` : ''}
        <div class="fail-hint">💡 Revisar: <code>${t.file}</code></div>
    </div>`).join('')
    : '<div class="no-fails">🎉 ¡Sin fallos! Todos los tests pasaron.</div>';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA Report — ${projectName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #1a1a24;
    --border: #2a2a3a;
    --text: #e2e8f0;
    --muted: #64748b;
    --green: #10b981;
    --red: #ef4444;
    --yellow: #f59e0b;
    --blue: #6366f1;
    --radius: 12px;
  }
  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  /* Header */
  .header {
    background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 50%, #0a1a0d 100%);
    border-bottom: 1px solid var(--border);
    padding: 32px 40px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .header-left h1 { font-size: 1.75rem; font-weight: 700; color: var(--text); }
  .header-left h1 span { color: var(--green); }
  .header-left p { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
  .header-right { text-align: right; }
  .report-date { color: var(--muted); font-size: 0.8rem; }

  /* Score */
  .score-ring {
    width: 90px; height: 90px;
    border-radius: 50%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: 4px solid var(--scoreColor, var(--green));
    background: rgba(16,185,129,0.08);
    font-weight: 700;
  }
  .score-num { font-size: 1.6rem; line-height: 1; }
  .score-label { font-size: 0.55rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

  /* Main */
  .main { max-width: 1200px; margin: 0 auto; padding: 32px 40px; }

  /* Stats cards */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px; text-align: center;
  }
  .stat-card .num { font-size: 2rem; font-weight: 700; }
  .stat-card .lbl { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .num.green { color: var(--green); }
  .num.red { color: var(--red); }
  .num.yellow { color: var(--yellow); }
  .num.blue { color: var(--blue); }

  /* Verdict */
  .verdict {
    border-radius: var(--radius); padding: 20px 24px; margin-bottom: 32px;
    border: 1px solid; display: flex; align-items: center; gap: 16px;
    font-size: 1.1rem; font-weight: 600;
  }
  .verdict.pass { background: rgba(16,185,129,0.08); border-color: var(--green); color: var(--green); }
  .verdict.warn { background: rgba(245,158,11,0.08); border-color: var(--yellow); color: var(--yellow); }
  .verdict.fail { background: rgba(239,68,68,0.08); border-color: var(--red); color: var(--red); }

  /* Fail summary */
  .section-title { font-size: 1rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 14px; }
  .fail-card {
    background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.3);
    border-radius: var(--radius); padding: 16px; margin-bottom: 12px;
  }
  .fail-title { font-weight: 600; color: #fca5a5; margin-bottom: 8px; }
  .fail-error { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; }
  .fail-hint { font-size: 0.8rem; color: var(--muted); }
  .fail-hint code { color: var(--blue); background: rgba(99,102,241,0.1); padding: 2px 6px; border-radius: 4px; }
  .no-fails { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: var(--radius); padding: 20px; text-align: center; color: var(--green); }

  /* Table */
  .table-wrap { overflow-x: auto; border-radius: var(--radius); border: 1px solid var(--border); }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: var(--surface2); padding: 12px 16px; text-align: left; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--border); }
  .test-row td { padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 0.875rem; vertical-align: middle; }
  .test-row:last-child td { border-bottom: none; }
  .test-row.passed { background: rgba(16,185,129,0.03); }
  .test-row.failed { background: rgba(239,68,68,0.05); }
  .test-row:hover td { background: rgba(255,255,255,0.02); }
  .test-title { color: var(--text); max-width: 420px; }
  .duration { color: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .error-msg { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #fca5a5; max-width: 240px; word-break: break-word; }

  /* Badges */
  .badge { padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge.pass { background: rgba(16,185,129,0.15); color: var(--green); }
  .badge.fail { background: rgba(239,68,68,0.15); color: var(--red); }
  .badge.skip { background: rgba(100,116,139,0.15); color: var(--muted); }
  .cat-badge { background: var(--surface2); border: 1px solid var(--border); padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; }

  /* Footer */
  .footer { text-align: center; padding: 32px; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--border); margin-top: 48px; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>🧪 QA Report — <span>${projectName}</span></h1>
    <p>${dateStr} · ${total} tests · ${durationTotal}s total</p>
  </div>
  <div class="header-right">
    <div class="score-ring" style="--scoreColor: ${scoreColor(score)}">
      <span class="score-num" style="color:${scoreColor(score)}">${score}%</span>
      <span class="score-label">Score</span>
    </div>
  </div>
</div>

<div class="main">

  <div class="stats-grid">
    <div class="stat-card"><div class="num green">${totalPass}</div><div class="lbl">✅ Pasaron</div></div>
    <div class="stat-card"><div class="num red">${totalFail}</div><div class="lbl">❌ Fallaron</div></div>
    <div class="stat-card"><div class="num yellow">${totalSkip}</div><div class="lbl">⏭️ Saltados</div></div>
    <div class="stat-card"><div class="num blue">${total}</div><div class="lbl">Total Tests</div></div>
  </div>

  <div class="verdict ${score >= 90 ? 'pass' : score >= 70 ? 'warn' : 'fail'}">
    <span style="font-size:1.5rem">${score >= 90 ? '🎉' : score >= 70 ? '⚠️' : '❌'}</span>
    <div>
      <strong>${scoreLabel(score)}</strong>
      <div style="font-size:0.85rem;opacity:0.8;font-weight:400;margin-top:2px">
        ${totalPass} de ${total} tests pasaron · Score: ${score}%
        ${score < 90 && totalFail > 0 ? ` · ${totalFail} error(es) requieren corrección antes de deploy` : ''}
      </div>
    </div>
  </div>

  <div class="section-title">🔴 Fallos Detectados</div>
  ${failSummaryHtml}

  <div class="section-title">📊 Detalle de Todos los Tests</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Test</th>
          <th>Estado</th>
          <th>Tiempo</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${testRows}
      </tbody>
    </table>
  </div>

</div>

<div class="footer">
  RoSaas QA Engine v1.0 · Generado automáticamente por Playwright + @axe-core/playwright
</div>

</body>
</html>`;

// ── Guardar reporte ───────────────────────────────────────────────────────────
const outDir = path.join(path.dirname(resultsPath));
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'dashboard.html');
fs.writeFileSync(outPath, html);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  🧪 QA Report — ${projectName}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ✅ Pasaron:  ${totalPass}`);
console.log(`  ❌ Fallaron: ${totalFail}`);
console.log(`  ⏭️  Saltados: ${totalSkip}`);
console.log(`  📊 Score:    ${score}% — ${scoreLabel(score)}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  📁 Dashboard: ${outPath}`);
console.log('');

if (failedTests.length > 0) {
    console.log('  🔴 Tests fallados:');
    failedTests.forEach(t => {
        console.log(`     ❌ ${t.fullTitle}`);
        if (t.error) console.log(`        → ${t.error.split('\n')[0]}`);
    });
    console.log('');
}

// Exit code para CI
process.exit(totalFail > 0 ? 1 : 0);
