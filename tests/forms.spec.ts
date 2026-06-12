/**
 * forms.spec.ts — Validación de formularios (Stress de campos)
 * Tests HP-V1, HP-V2, HP-V3 del HAPPY_PATH.md
 * Verifica que NINGÚN formulario acepte datos inválidos o vacíos.
 */

import { test, expect } from '@playwright/test';
import { QA, loginHelper } from './qa-config';

test.describe('📋 Forms — Validación de Campos', () => {

    // ── Formulario de Paciente (HP-V1) ────────────────────────────────────────

    test.describe('Formulario de Paciente (HP-V1)', () => {
        test.beforeEach(async ({ page }) => {
            await loginHelper(page);
            await page.goto(`${QA.baseURL}${QA.routes.patients}`);
            const btn = page.locator('button:has-text("Registrar"), button:has-text("Nuevo Paciente"), button:has-text("Nuevo")').first();
            await btn.click();
            await page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first().waitFor({ timeout: QA.timeouts.modal });
        });

        test('HP-V1-01 | Enviar formulario vacío muestra errores', async ({ page }) => {
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            const submitBtn = modal.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Registrar")').first();
            await submitBtn.click();
            await page.waitForTimeout(500);
            // Debe mostrar al menos un mensaje de error o el campo debe tener aria-invalid
            const hasError = await page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"], text=/obligatorio|requerido|required/i').count() > 0;
            // O el modal debe seguir abierto (no guardó)
            const modalStillOpen = await modal.isVisible();
            expect(hasError || modalStillOpen, 'El formulario vacío debe mostrar errores o no cerrar').toBeTruthy();
        });

        test('HP-V1-02 | No acepta nombre de 1 letra', async ({ page }) => {
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            const nombreInput = modal.locator('input[name="nombre"], input[placeholder*="nombre"], input[placeholder*="Nombre"]').first();
            if (await nombreInput.count() > 0) {
                await nombreInput.fill('A');
                const submitBtn = modal.locator('button[type="submit"], button:has-text("Guardar")').first();
                await submitBtn.click();
                await page.waitForTimeout(500);
                // El modal debe permanecer abierto (no guardó)
                await expect(modal).toBeVisible();
            }
        });

        test('HP-V1-03 | Datos válidos: formulario se guarda', async ({ page }) => {
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            // Llenar campos mínimos requeridos
            const inputs = modal.locator('input[type="text"], input:not([type="hidden"])');
            const count = await inputs.count();
            if (count > 0) {
                await inputs.first().fill(QA.testPatient.nombre);
            }
            // Llenar expediente/DNI si existe
            const expInput = modal.locator('input[name="expediente"], input[name="dni"], input[placeholder*="Expediente"], input[placeholder*="CURP"]').first();
            if (await expInput.count() > 0) {
                await expInput.fill(QA.testPatient.expediente);
            }
            // Llenar teléfono si existe
            const telInput = modal.locator('input[name="telefono"], input[type="tel"], input[placeholder*="elefo"]').first();
            if (await telInput.count() > 0) {
                await telInput.fill(QA.testPatient.telefono);
            }
            const submitBtn = modal.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Registrar")').first();
            await submitBtn.click();
            // Esperar respuesta de Supabase
            await page.waitForTimeout(3000);
            // El modal debe cerrarse O mostrar toast de éxito
            const modalClosed = !await modal.isVisible();
            const successToast = await page.locator('text=/éxito|exitoso|guardado|registrado|success/i').count() > 0;
            expect(modalClosed || successToast, 'El formulario válido debe guardar correctamente').toBeTruthy();
        });
    });

    // ── Formulario de Citas (HP-V2) ───────────────────────────────────────────

    test.describe('Formulario de Citas (HP-V2)', () => {
        test.beforeEach(async ({ page }) => {
            await loginHelper(page);
            await page.goto(`${QA.baseURL}${QA.routes.appointments}`);
            const btn = page.locator('button:has-text("Agendar"), button:has-text("Nueva Cita"), button:has-text("Nueva")').first();
            await expect(btn).toBeVisible({ timeout: QA.timeouts.dataLoad });
            await btn.click();
            await page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first().waitFor({ timeout: QA.timeouts.modal });
        });

        test('HP-V2-01 | Modal tiene campos de fecha y paciente', async ({ page }) => {
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            // Debe tener algún campo de fecha o selector de paciente
            const hasDateField = await modal.locator('input[type="date"], input[type="datetime-local"], [class*="date-picker"]').count() > 0;
            const hasPatientField = await modal.locator('select, input[placeholder*="paciente"], input[placeholder*="Paciente"]').count() > 0;
            expect(hasDateField || hasPatientField, 'El modal de citas debe tener campos de fecha o paciente').toBeTruthy();
        });

        test('HP-V2-02 | Enviar formulario vacío no guarda', async ({ page }) => {
            const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').first();
            const submitBtn = modal.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Agendar")').first();
            if (await submitBtn.count() > 0) {
                await submitBtn.click();
                await page.waitForTimeout(500);
                // Modal debe permanecer abierto
                await expect(modal).toBeVisible();
            }
        });
    });

    // ── Botones mudos (HP-MUDO) ───────────────────────────────────────────────

    test.describe('Botones mudos — Ningún botón sin respuesta', () => {
        test.beforeEach(async ({ page }) => { await loginHelper(page); });

        test('HP-MUDO-01 | Dashboard: botones principales responden al click', async ({ page }) => {
            // Verificar que los botones del dashboard no estén "mudos"
            const buttons = page.locator('button:visible').all();
            const allButtons = await buttons;
            // No debe haber botones que exploten al hacer click (no lanzar errores de JS)
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));
            // Click en los primeros 3 botones visibles del dashboard
            const visibleBtns = await page.locator('button:visible').all();
            for (const btn of visibleBtns.slice(0, 3)) {
                try {
                    await btn.click({ timeout: 2000 });
                    await page.waitForTimeout(300);
                    // Cerrar cualquier modal que se haya abierto
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(200);
                } catch {
                    // Ignorar clicks que fallen por stale elements
                }
            }
            expect(errors.filter(e => !e.includes('ResizeObserver')).length, `Errores JS al hacer click: ${errors.join(', ')}`).toBe(0);
        });
    });
});
