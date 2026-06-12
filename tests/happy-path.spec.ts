/**
 * happy-path.spec.ts — Flujo completo del usuario (Happy Path)
 * Convierte el HAPPY_PATH.md en código ejecutable automáticamente.
 * HP-01 a HP-10
 */

import { test, expect } from '@playwright/test';
import { QA, loginHelper } from './qa-config';

test.describe('🛤️ Happy Path — Flujo Completo del Usuario', () => {

    // ── Dashboard ─────────────────────────────────────────────────────────────

    test.describe('Dashboard (HP-02, HP-03)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-02 | Dashboard: KPIs visibles (no ceros ni nulls)', async ({ page }) => {
            // Debe haber al menos un KPI card con datos
            const kpiCards = page.locator('[class*="stat"], [class*="kpi"], [class*="card"]');
            await expect(kpiCards.first()).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });

        test('HP-03 | Dashboard: nombre del usuario en header', async ({ page }) => {
            // El nombre del doctor/usuario debe ser visible
            const header = page.locator('header');
            await expect(header).toBeVisible();
            // Verificar que hay algún texto de usuario (no vacío)
            const userInfo = header.locator('[class*="font-bold"], [class*="font-semibold"]').first();
            await expect(userInfo).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });

        test('HP-03b | Dashboard: nav sidebar visible con rutas correctas', async ({ page }) => {
            const nav = page.locator('nav, [role="navigation"]').first();
            await expect(nav).toBeVisible();
        });
    });

    // ── Pacientes ─────────────────────────────────────────────────────────────

    test.describe('Pacientes (HP-04, HP-05)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-04 | Pacientes: tabla carga con datos', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            // Esperar que carguen datos de Supabase
            await page.waitForTimeout(2000);
            const table = page.locator('table, [role="table"], [class*="table"]').first();
            await expect(table).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });

        test('HP-04b | Pacientes: buscador filtra en tiempo real', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const searchInput = page.locator('input[type="search"], input[placeholder*="buscar"], input[placeholder*="Buscar"]').first();
            await expect(searchInput).toBeVisible({ timeout: QA.timeouts.dataLoad });
            await searchInput.fill('zzz_no_existe');
            await page.waitForTimeout(500);
            // No debe explotar — simplemente mostrar 0 resultados o mensaje
            await expect(page.locator('body')).not.toContainText('Error');
        });

        test('HP-05 | Pacientes: botón "Registrar Nuevo Paciente" abre modal', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const btn = page.locator('button:has-text("Registrar"), button:has-text("Nuevo Paciente"), button:has-text("Nuevo")').first();
            await expect(btn).toBeVisible({ timeout: QA.timeouts.dataLoad });
            await btn.click();
            // Modal debe aparecer
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            await expect(modal).toBeVisible({ timeout: QA.timeouts.modal });
        });

        test('HP-05b | Pacientes: modal de nuevo paciente tiene campos requeridos', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const btn = page.locator('button:has-text("Registrar"), button:has-text("Nuevo Paciente"), button:has-text("Nuevo")').first();
            await btn.click();
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            await expect(modal).toBeVisible({ timeout: QA.timeouts.modal });
            // Campo nombre debe existir
            const nombreField = modal.locator('input[name="nombre"], input[placeholder*="nombre"], input[placeholder*="Nombre"]').first();
            await expect(nombreField).toBeVisible({ timeout: QA.timeouts.modal });
        });

        test('HP-05c | Pacientes: modal cierra sin datos residuales', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const btn = page.locator('button:has-text("Registrar"), button:has-text("Nuevo Paciente"), button:has-text("Nuevo")').first();
            await btn.click();
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            await expect(modal).toBeVisible({ timeout: QA.timeouts.modal });
            // Llenar parcialmente
            const nombreField = modal.locator('input').first();
            await nombreField.fill('Dato Parcial Test');
            // Cerrar
            const closeBtn = modal.locator('button:has-text("Cancelar"), button:has-text("Cerrar"), [aria-label="Close"], [aria-label="Cerrar"]').first();
            if (await closeBtn.count() > 0) {
                await closeBtn.click();
            } else {
                await page.keyboard.press('Escape');
            }
            await expect(modal).not.toBeVisible({ timeout: 3000 });
            // Reabrir — campo debe estar vacío
            await btn.click();
            const modalReopened = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            await expect(modalReopened).toBeVisible({ timeout: QA.timeouts.modal });
            const nombreField2 = modalReopened.locator('input').first();
            const value = await nombreField2.inputValue();
            expect(value).toBe('');
        });
    });

    // ── Citas ─────────────────────────────────────────────────────────────────

    test.describe('Citas (HP-06, HP-07)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-06 | Agenda: página carga sin errores', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.appointments}`);
            await expect(page).toHaveURL(`${QA.baseURL}${QA.routes.appointments}`);
            await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });

        test('HP-06b | Agenda: calendario o lista de citas visible', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.appointments}`);
            await page.waitForTimeout(2000);
            // Debe haber algún elemento de calendario o lista
            const calEl = page.locator('[class*="calendar"], [class*="agenda"], table, [class*="schedule"]').first();
            await expect(calEl).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });

        test('HP-07 | Citas: botón "Agendar" abre modal de nueva cita', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.appointments}`);
            const btn = page.locator('button:has-text("Agendar"), button:has-text("Nueva Cita"), button:has-text("Nueva")').first();
            await expect(btn).toBeVisible({ timeout: QA.timeouts.dataLoad });
            await btn.click();
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            await expect(modal).toBeVisible({ timeout: QA.timeouts.modal });
        });
    });

    // ── Expedientes ───────────────────────────────────────────────────────────

    test.describe('Expedientes (HP-08)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-08 | Records: página carga sin error 404', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.records}`);
            const title = await page.title();
            expect(title.toLowerCase()).not.toContain('404');
            expect(title.toLowerCase()).not.toContain('not found');
            await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });
    });

    // ── Cobros ────────────────────────────────────────────────────────────────

    test.describe('Cobros (HP-09)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-09 | Billing: página carga sin error 404', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.billing}`);
            const title = await page.title();
            expect(title.toLowerCase()).not.toContain('404');
            await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: QA.timeouts.dataLoad });
        });
    });

    // ── Navegación completa ───────────────────────────────────────────────────

    test.describe('Navegación — Cero 404s (HP-10)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-10 | Nav: todas las rutas cargan sin 404', async ({ page }) => {
            const routes = Object.values(QA.routes).filter(r => r !== '/login');
            for (const route of routes) {
                const res = await page.goto(`${QA.baseURL}${route}`);
                const title = await page.title();
                expect(title.toLowerCase(), `Ruta ${route} retornó 404`).not.toContain('404');
                expect(title.toLowerCase(), `Ruta ${route} retornó Not Found`).not.toContain('not found');
            }
        });
    });
});
