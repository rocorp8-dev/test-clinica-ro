/**
 * auth.spec.ts — Tests de autenticación y middleware
 * HP-01: Login, logout, protección de rutas
 */

import { test, expect } from '@playwright/test';
import { QA, loginHelper } from './qa-config';

test.describe('🔐 Auth — Autenticación y Middleware', () => {

    test('HP-AUTH-01 | Middleware: redirige a /login si no autenticado', async ({ page }) => {
        await page.goto(`${QA.baseURL}${QA.routes.dashboard}`);
        await expect(page).toHaveURL(/login/, { timeout: QA.timeouts.navigation });
    });

    test('HP-AUTH-02 | Middleware: /patients redirige a /login sin sesión', async ({ page }) => {
        await page.goto(`${QA.baseURL}${QA.routes.patients}`);
        await expect(page).toHaveURL(/login/, { timeout: QA.timeouts.navigation });
    });

    test('HP-AUTH-03 | Login: formulario visible en /login', async ({ page }) => {
        await page.goto(`${QA.baseURL}${QA.routes.login}`);
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('HP-AUTH-04 | Login: credenciales demo funcionan', async ({ page }) => {
        await loginHelper(page);
        await expect(page).toHaveURL(`${QA.baseURL}${QA.routes.dashboard}`);
    });

    test('HP-AUTH-05 | Login: error con credenciales incorrectas', async ({ page }) => {
        await page.goto(`${QA.baseURL}${QA.routes.login}`);
        await page.fill('input[type="email"]', 'noexiste@hack.com');
        await page.fill('input[type="password"]', 'WrongPass999!');
        await page.click('button[type="submit"]');
        // Debe permanecer en login — no redirigir al dashboard
        await page.waitForTimeout(3000);
        await expect(page).toHaveURL(/login/);
    });

    test('HP-AUTH-06 | Logout: cierra sesión y redirige a /login', async ({ page }) => {
        await loginHelper(page);
        // Buscar botón de logout (puede ser en sidebar o header)
        const logoutBtn = page.locator('button:has-text("Cerrar Sesión"), button:has-text("Salir"), [data-testid="logout-btn"]').first();
        await expect(logoutBtn).toBeVisible({ timeout: QA.timeouts.modal });
        await logoutBtn.click();
        await expect(page).toHaveURL(/login/, { timeout: QA.timeouts.navigation });
    });

    test('HP-AUTH-07 | Post-logout: / redirige a /login (middleware activo)', async ({ page }) => {
        await loginHelper(page);
        const logoutBtn = page.locator('button:has-text("Cerrar Sesión"), button:has-text("Salir"), [data-testid="logout-btn"]').first();
        if (await logoutBtn.count() > 0) {
            await logoutBtn.click();
            await page.waitForURL(/login/, { timeout: QA.timeouts.navigation });
        }
        await page.goto(`${QA.baseURL}${QA.routes.dashboard}`);
        await expect(page).toHaveURL(/login/, { timeout: QA.timeouts.navigation });
    });
});
