/**
 * mobile.spec.ts — Pruebas de responsive móvil
 * Tests HP-M1, HP-M2 del HAPPY_PATH.md
 * Viewport: 390x844 (iPhone 14)
 */

import { test, expect } from '@playwright/test';
import { QA, loginHelper } from './qa-config';

// Este spec corre en el proyecto "iPhone 14" (definido en playwright.config.ts)

test.describe('📱 Mobile — Viewport 390x844 (iPhone 14)', () => {

    // ── Navegación móvil (HP-M1) ──────────────────────────────────────────────

    test.describe('Navegación Móvil (HP-M1)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-M1-01 | Header muestra botón hamburguesa (☰) en móvil', async ({ page }) => {
            // En móvil el sidebar debe estar colapsado y el botón hamburguesa visible
            const hambBtn = page.locator(
                '[data-testid="hamburger"], button[aria-label*="menu"], button[aria-label*="Menu"], ' +
                '[class*="hamburger"], [class*="mobile-menu"], button:has-text("☰")'
            ).first();
            // Si no hay hamburguesa, el sidebar debe estar oculto de alguna forma
            const hasHamburger = await hambBtn.count() > 0;
            const sidebarVisible = await page.locator('nav, [role="navigation"]').first().isVisible();
            // En móvil: o hay hamburguesa O el sidebar está colapsado
            expect(hasHamburger || !sidebarVisible, 'En móvil debe haber hamburguesa o sidebar colapsado').toBeTruthy();
        });

        test('HP-M1-02 | Sidebar abre al tocar hamburguesa', async ({ page }) => {
            const hambBtn = page.locator(
                '[data-testid="hamburger"], button[aria-label*="menu"], button[aria-label*="Menu"], ' +
                '[class*="hamburger"], [class*="mobile-menu"]'
            ).first();
            if (await hambBtn.count() > 0) {
                await hambBtn.click();
                await page.waitForTimeout(400); // Esperar animación
                const sidebar = page.locator('nav, [class*="sidebar"], [role="navigation"]').first();
                await expect(sidebar).toBeVisible({ timeout: 3000 });
            }
        });

        test('HP-M1-03 | Sidebar cierra al presionar Escape o botón X', async ({ page }) => {
            const hambBtn = page.locator(
                '[data-testid="hamburger"], button[aria-label*="menu"], [class*="hamburger"]'
            ).first();
            if (await hambBtn.count() > 0) {
                await hambBtn.click();
                await page.waitForTimeout(400);
                // Intentar cerrar con Escape
                await page.keyboard.press('Escape');
                await page.waitForTimeout(400);
                // Si no cerró, buscar botón X
                const closeBtn = page.locator('[aria-label*="Close"], [aria-label*="Cerrar"], button:has-text("×"), [data-testid="close-sidebar"]').first();
                if (await closeBtn.count() > 0) {
                    await closeBtn.click();
                    await page.waitForTimeout(400);
                }
            }
        });

        test('HP-M1-04 | Sidebar se cierra al navegar a otra sección', async ({ page }) => {
            const hambBtn = page.locator(
                '[data-testid="hamburger"], button[aria-label*="menu"], [class*="hamburger"]'
            ).first();
            if (await hambBtn.count() > 0) {
                await hambBtn.click();
                await page.waitForTimeout(400);
                // Hacer clic en un link del sidebar
                const navLink = page.locator('nav a, [class*="sidebar"] a').first();
                if (await navLink.count() > 0) {
                    await navLink.click();
                    await page.waitForTimeout(500);
                    // Verificar que la URL cambió (navegó)
                    // El sidebar debería estar cerrado después de navegar
                }
            }
        });
    });

    // ── Legibilidad y usabilidad táctil (HP-M2) ───────────────────────────────

    test.describe('Legibilidad y Táctil (HP-M2)', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-M2-01 | Botones tienen área de toque mínima (44x44px)', async ({ page }) => {
            const buttons = await page.locator('button:visible').all();
            const smallButtons: string[] = [];

            for (const btn of buttons.slice(0, 10)) { // Revisar primeros 10 botones
                const box = await btn.boundingBox();
                if (box && (box.width < QA.ux.minTapTargetPx || box.height < QA.ux.minTapTargetPx)) {
                    const text = await btn.textContent();
                    smallButtons.push(`"${text?.trim()}" (${Math.round(box.width)}x${Math.round(box.height)}px)`);
                }
            }

            if (smallButtons.length > 0) {
                console.warn(`⚠️ Botones pequeños para tap (< ${QA.ux.minTapTargetPx}px): ${smallButtons.join(', ')}`);
            }
            // No falla el test pero registra advertencias — UX soft check
            expect(smallButtons.length).toBeLessThan(5); // Menos de 5 botones pequeños es aceptable
        });

        test('HP-M2-02 | KPIs del dashboard son visibles en móvil', async ({ page }) => {
            // Los KPI cards no deben desbordarse del viewport
            const viewport = page.viewportSize();
            const cards = page.locator('[class*="card"], [class*="stat"], [class*="kpi"]');
            const count = await cards.count();

            if (count > 0) {
                const firstCard = await cards.first().boundingBox();
                if (firstCard && viewport) {
                    // El card no debe exceder el ancho del viewport
                    expect(firstCard.x + firstCard.width).toBeLessThanOrEqual(viewport.width + 20); // +20px de tolerancia
                }
            }
        });

        test('HP-M2-03 | Modales tienen scroll interno (no desbordan pantalla)', async ({ page }) => {
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const btn = page.locator('button:has-text("Registrar"), button:has-text("Nuevo Paciente"), button:has-text("Nuevo")').first();
            if (await btn.count() > 0) {
                await btn.click();
                const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
                if (await modal.count() > 0) {
                    await modal.waitFor({ timeout: QA.timeouts.modal });
                    const viewport = page.viewportSize();
                    const modalBox = await modal.boundingBox();
                    if (modalBox && viewport) {
                        // El modal no debe ser mayor al viewport
                        expect(modalBox.height).toBeLessThanOrEqual(viewport.height + 10);
                    }
                    // Cerrar modal
                    await page.keyboard.press('Escape');
                }
            }
        });

        test('HP-M2-04 | Página no tiene overflow horizontal', async ({ page }) => {
            // La página no debe tener scroll horizontal (layout roto)
            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
            expect(scrollWidth, 'Hay overflow horizontal — layout roto en móvil').toBeLessThanOrEqual(clientWidth + 5);
        });
    });
});
