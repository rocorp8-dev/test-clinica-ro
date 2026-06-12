/**
 * qa-config.ts — Configuración central del QA Engine
 * Lee CONFIG.md del proyecto y expone variables para todos los tests.
 */

export const QA = {
    // ── Identidad del proyecto ───────────────────────────────────────────────
    projectName: 'test-clinica',
    appName: 'MdPulso',
    baseURL: process.env.QA_BASE_URL || 'http://localhost:3009',

    // ── Credenciales demo ────────────────────────────────────────────────────
    auth: {
        email: process.env.QA_EMAIL || 'admin@testclinica.com',
        password: process.env.QA_PASSWORD || 'Demo1234!',
        displayName: 'Administrador Clínica',
    },

    // ── Rutas del proyecto ───────────────────────────────────────────────────
    routes: {
        login: '/login',
        dashboard: '/',
        patients: '/patients',
        appointments: '/appointments',
        records: '/records',
        billing: '/billing',
        settings: '/settings',
    },

    // ── Datos de prueba ──────────────────────────────────────────────────────
    testPatient: {
        nombre: `Test QA ${Date.now()}`,
        expediente: `EXP-${Date.now().toString().slice(-6)}`,
        telefono: '5512345678',
    },

    // ── Timeouts ─────────────────────────────────────────────────────────────
    timeouts: {
        navigation: 15000,
        modal: 5000,
        dataLoad: 8000,
        toast: 4000,
    },

    // ── UX thresholds ────────────────────────────────────────────────────────
    ux: {
        minTapTargetPx: 44,
        maxLCP: 4000,         // Largest Contentful Paint (ms)
        maxCLS: 0.1,          // Cumulative Layout Shift
        minContrastRatio: 4.5,
    },
};

/**
 * Helper: login reutilizable en todos los specs
 */
export async function loginHelper(page: any) {
    await page.goto(`${QA.baseURL}${QA.routes.login}`);
    await page.fill('input[type="email"]', QA.auth.email);
    await page.fill('input[type="password"]', QA.auth.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${QA.baseURL}${QA.routes.dashboard}`, {
        timeout: QA.timeouts.navigation,
    });
}
